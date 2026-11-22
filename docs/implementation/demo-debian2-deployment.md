# Deploy demo PBL6 trên `debian2`

Website công khai là [demo.congnguyen.me](https://demo.congnguyen.me). Cloudflare Tunnel `pbl6-demo-debian2` nối domain với Caddy trong Compose. Máy deploy dùng OpenSSH qua Tailscale để vào Debian 13. Runtime nằm ở `~/pbl6-demo` và Compose project là `pbl6-demo`.

| Phạm vi thay đổi | Quy trình |
| --- | --- |
| Frontend | Build trên Windows rồi chạy `scripts/deploy-demo-web.ps1`. Script thay riêng `web`. |
| Backend hoặc schema | Build image ứng viên, sao lưu DB, migrate và cập nhật service liên quan. Nếu có Web, deploy Web sau khi backend sẵn sàng. |
| Mất máy chủ hoặc đổi máy | Dựng runtime riêng, khôi phục và kiểm tra dữ liệu, rồi chuyển Cloudflare DNS. |

Các script `deploy-demo-all.ps1`, `deploy-demo-ai.ps1`, `deploy-demo-catalog.ps1`, `deploy-demo-edge.ps1` còn cấu hình mặc định cho máy cũ. Runbook `deploy_candidate.py` dùng Compose project `pbl6` trên Windows.

## 1. Kết nối SSH

Cho Windows và server vào cùng tailnet. Cấp quyền truy cập TCP 22 cho máy deploy trong chính sách tailnet. Trên Debian bật OpenSSH, cài public key cho user deploy có quyền dùng Docker. Private key giữ ở máy deploy. [Cài Tailscale trên Linux](https://tailscale.com/docs/install/linux) · [OpenSSH qua Tailscale](https://tailscale.com/docs/reference/ssh-over-tailscale).

Thêm vào `%USERPROFILE%\.ssh\config`. Điền IP Tailscale hoặc tên MagicDNS từ trang quản trị tailnet. Xác minh fingerprint SSH của máy mới qua console trước khi lưu host key.

```sshconfig
Host pbl6-demo
    HostName <TAILSCALE_IP_OR_MAGICDNS>
    User user
    Port 22
    IdentitiesOnly yes
    IdentityFile ~/.ssh/id_ed25519
```

```powershell
tailscale status
tailscale ping debian2
ssh -o BatchMode=yes pbl6-demo 'hostname; docker compose version'
```

Sau khi vào Debian, định nghĩa hàm dưới đây trong phiên Bash để dùng cho các bước trên server.

```bash
cd "$HOME/pbl6-demo"
compose() {
  docker compose -p pbl6-demo --env-file infrastructure/.env \
    -f infrastructure/compose.yaml -f infrastructure/secrets/tunnel.compose.yaml "$@"
}
compose config --quiet
compose ps
```

## 2. Deploy Web từ Windows

Chạy trong thư mục gốc repo. Script đóng gói frontend hiện có trong working tree, gồm thay đổi chưa commit và tệp mới được Git cho phép. Rà lại `git status --short -- frontend` trước khi chạy.

```powershell
npm --prefix frontend run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-web.ps1
if ($LASTEXITCODE -ne 0) { throw 'Demo frontend deployment failed' }
```

`Deploy-Demo-Web.cmd` mở cùng script. Thêm `-PackageOnly` khi cần kiểm tra gói tại chỗ. Script giữ tag `pbl6-demo-web:rollback`, xác minh image đang chạy và kiểm tra HTTP công khai tại `/customer/returns`. Nó tự khôi phục image trước nếu bước kích hoạt hoặc kiểm tra HTTP thất bại. Lần chạy thành công có `DEPLOY_OK` từ server.

Build lấy cờ đăng nhập nhanh từ M3 đang chạy. Khi đổi `DEMO_LOGIN_ENABLED`, cập nhật M3 trước rồi build lại Web. Chỉ bật cờ trên bộ dữ liệu demo được phép công khai. Đăng nhập nhanh cấp cả vai trò Quản trị viên.

## 3. Deploy backend có migration M2

Ví dụ dưới đây dùng cho luồng hủy đơn. Migration `029_order_cancellation_actor.sql` bổ sung bên hủy và cần chạy trước ứng dụng mới. Migration `028_customer_wallet.sql` là một phần của chuỗi M2 nếu DB còn thiếu. Kiểm tra backend và migration trên DB thử nghiệm trước khi thực hiện. Khi thay nhiều service, lập danh sách DB, service và worker theo diff của cùng bản phát hành vì M1/M2/M3 và Delivery dùng chung tag `pbl6-node:local`.

### Đóng gói bản đã review

Từ checkout sạch trên Windows, chạy bước quét secret ở cuối tài liệu, rồi đóng gói đúng commit. `git archive` lấy nội dung đã commit.

```powershell
$release = (git rev-parse --short=12 HEAD).Trim()
$archive = Join-Path ([IO.Path]::GetTempPath()) "pbl6-backend-$release.tgz"
git archive --format=tar.gz --output=$archive HEAD .dockerignore backend docs/contracts
if ($LASTEXITCODE -ne 0) { throw 'Backend packaging failed' }
scp $archive "pbl6-demo:pbl6-backend-$release.tgz"
if ($LASTEXITCODE -ne 0) { throw 'Backend upload failed' }
$release
```

### Build, sao lưu, migrate và kích hoạt

Chạy trên Debian sau khi định nghĩa `compose` ở mục 1. Thay `REVIEWED_COMMIT` bằng mã ở bước trên. Mỗi lần chỉ một người thực hiện deploy. Xác nhận migration tương thích với ứng dụng đang chạy trước khi dùng quy trình này.

```bash
set -e
revision=REVIEWED_COMMIT
release="$revision-$(date -u +%Y%m%dT%H%M%SZ)"
stage="$HOME/pbl6-demo/artifacts/backend-$release"
umask 077
mkdir -p "$HOME/pbl6-demo/artifacts"
mkdir "$stage"
mkdir "$stage/source"
tar -xzf "$HOME/pbl6-backend-$revision.tgz" -C "$stage/source"
candidate="pbl6-node:deploy-$release"
docker build -f "$stage/source/backend/Dockerfile" -t "$candidate" "$stage/source"

compose exec -T postgres pg_dump -U postgres -d m2 -Fc --no-owner --no-acl \
  > "$stage/m2-before.dump.tmp"
compose exec -T postgres pg_restore --list < "$stage/m2-before.dump.tmp" > /dev/null
mv "$stage/m2-before.dump.tmp" "$stage/m2-before.dump"
(cd "$stage" && sha256sum m2-before.dump > m2-before.dump.sha256)

# Ghi lại image theo từng container để dùng nếu cần rollback.
for service in m2 worker-m2 worker-refund; do
  running=$(compose ps -q "$service")
  previous=$(docker inspect --format '{{.Image}}' "$running")
  docker tag "$previous" "pbl6-node:rollback-$release-$service"
done

local_before=$(docker image inspect --format '{{.Id}}' pbl6-node:local)
docker tag "$candidate" pbl6-node:local
if ! compose run --rm -T --no-deps --pull never -e MIGRATE_SERVICES=M2 tools; then
  docker tag "$local_before" pbl6-node:local
  exit 1
fi
compose exec -T postgres psql -U postgres -d m2 -Atc \
  "SELECT version FROM schema_migration WHERE version IN ('028_customer_wallet.sql','029_order_cancellation_actor.sql') ORDER BY version"
# Đối chiếu kết quả migration rồi chạy bước này.
compose up -d --no-deps --no-build --pull never m2 worker-m2 worker-refund
compose ps m2 worker-m2 worker-refund
compose exec -T m2 node -e \
  "fetch('http://127.0.0.1:3102/health/ready',{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
```

Danh sách `pg_restore` và checksum kiểm tra khả năng đọc dump. Trước migration có khả năng mất dữ liệu, diễn tập restore vào DB riêng và có kế hoạch dừng ghi. Nếu deploy M2 hỏng và ba image cũ giống nhau, retag `pbl6-node:rollback-$release-m2` thành `pbl6-node:local` rồi chạy lại lệnh `compose up` cho đúng ba service. Nếu chúng khác nhau, dùng Compose override chọn đúng tag rollback cho từng service. Giữ schema bổ sung tương thích và giao dịch đã phát sinh. Với lỗi schema, đánh giá và khôi phục vào DB riêng trước khi chuyển DB đang chạy.

Sau khi backend sẵn sàng, chạy mục 2 nếu release có frontend. Với luồng hủy đơn, mở chi tiết một đơn demo khách hủy và một đơn demo shop hủy. Kiểm tra bên hủy, lý do, thời điểm và nhật ký tương ứng. Thử thao tác hủy mới trên bộ dữ liệu kiểm thử dành riêng.

## 4. Dựng lại trên máy chủ khác

1. Cài Docker Engine và Compose plugin trên Debian, nối Tailscale, cấp SSH key và xác minh như mục 1. Dùng alias riêng `pbl6-demo-next` trong lúc dựng máy đích. Cập nhật alias `pbl6-demo` sau khi kiểm tra public thành công trên máy mới. [Docker Engine trên Debian](https://docs.docker.com/engine/install/debian/).
2. Đặt source của commit đã review trong `~/pbl6-demo` bằng `git archive` hoặc clone nội bộ. Dùng bản `.env` và JWT đã sao lưu trong kho bảo mật. Nếu khởi tạo dữ liệu mới, tạo secret riêng dựa trên `infrastructure/.env.example`. Cấu hình `LOCAL_UID` và `LOCAL_GID` theo `id -u` và `id -g` của chủ tệp. Kiểm tra các biến provider ở chế độ đã được duyệt cho demo trước khi mở public.
3. Tạo thư mục bằng `install -d -m 700 infrastructure/secrets artifacts`. Dùng `umask 077` trước khi ghi `.env`, JWT private key, JSON connector và cấu hình tunnel. Đặt các tệp đó ở `600` và `jwt-public.pem` ở `644`. M3 và tunnel đọc tệp theo UID/GID đã cấu hình. Đặt `infrastructure/init-databases.sh` ở `644` để Postgres có thể đọc khi tạo volume mới. Kiểm tra port loopback và subnet Docker còn trống.
4. Chạy `compose config --quiet`, `compose build`, rồi `compose up -d --wait postgres redis rabbitmq delivery-postgres`. Nếu chuyển dữ liệu, chốt thời điểm dừng ghi trên máy cũ, lấy backup cuối của M1–M4 và Delivery rồi khôi phục vào DB vừa khởi tạo. Kiểm checksum, restore thử, quyền sở hữu và số lượng bản ghi trước khi phục vụ. Kiểm riêng các volume Redis, RabbitMQ và dữ liệu try-on nếu cần bảo toàn trạng thái của chúng. Khi thay từ snapshot cũ vì máy nguồn hỏng, ghi rõ mốc dữ liệu cuối có thể khôi phục.
5. Chạy `compose run --rm -T --no-deps --pull never tools` để áp dụng migration M3 → M1 → M2 → M4. Khởi động ứng dụng với `compose up -d --no-build --scale tunnel=0`. Nếu bật đăng nhập nhanh, build lại image `web` với `compose build --build-arg VITE_DEMO_LOGIN_ENABLED=1 web` rồi chạy `compose up -d --no-deps --no-build web`. Kiểm tra gateway trước khi mở tunnel.
6. Trên máy quản trị Cloudflare, dùng `cloudflared tunnel create <NEW_TUNNEL_NAME>` để tạo tunnel dành riêng cho máy đích. Chuyển riêng JSON của tunnel tới `infrastructure/secrets/pbl6-demo.json`. Giữ chứng chỉ quản trị `cert.pem` trên máy có quyền quản trị Cloudflare. Chạy `compose up -d --no-deps --scale tunnel=1 tunnel` và kiểm tra `cloudflared tunnel info <NEW_TUNNEL_NAME>` trên máy quản trị. Khi chỉ connector máy đích đã đăng ký, chuyển DNS với `cloudflared tunnel route dns --overwrite-dns <NEW_TUNNEL_NAME> demo.congnguyen.me`. [Cloudflare Tunnel quản lý cục bộ](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/create-local-tunnel/).

### Chuyển dữ liệu sang máy mới

Chạy trên server nguồn sau khi dừng luồng ghi, với hàm `compose` trỏ vào đúng runtime nguồn. Lưu dump định dạng custom và giữ thông tin chủ bảng của M1–M4.

```bash
set -e
umask 077
backup=$(mktemp -d "$HOME/pbl6-demo/artifacts/cutover-XXXXXXXX")
for db in m1 m2 m3 m4; do
  compose exec -T postgres pg_dump -U postgres -d "$db" -Fc > "$backup/$db.dump"
done
compose exec -T delivery-postgres pg_dump -U delivery -d delivery -Fc > "$backup/delivery.dump"
(cd "$backup" && sha256sum -- *.dump > SHA256SUMS)
printf '%s\n' "$backup"
```

Chuyển thư mục backup riêng qua SSH. Trên máy đích, chỉ chạy trên các DB mới dựng ở bước 4. `init-databases.sh` đã tạo các role `m1`–`m4`, database và extension tương ứng. Thay đường dẫn theo bản backup thực tế.

```bash
set -e
backup="$HOME/pbl6-demo/artifacts/cutover-XXXXXXXX"
(cd "$backup" && sha256sum -c SHA256SUMS)
for db in m1 m2 m3 m4; do
  compose exec -T postgres pg_restore -U postgres -d "$db" --single-transaction \
    < "$backup/$db.dump"
done
compose exec -T delivery-postgres pg_restore -U delivery -d delivery --single-transaction \
  < "$backup/delivery.dump"
```

Với dump lịch sử thiếu thông tin quyền sở hữu, xác minh lại role và quyền truy cập bằng tài khoản ứng dụng trên môi trường restore thử. Nếu một DB restore lỗi, hoàn tất đối soát từng DB trước khi mở dịch vụ.

### Cấu hình ingress hiện hành

Các giá trị dưới đây dành cho `infrastructure/.env`. Giữ các biến ứng dụng và secret trong bản cấu hình riêng.

```dotenv
WEB_ORIGIN=https://demo.congnguyen.me
SITE_ADDRESS=:80
COOKIE_SECURE=true
GATEWAY_HTTP_BIND=127.0.0.1:18080
GATEWAY_HTTPS_BIND=127.0.0.1:18443
EDGE_TRUSTED_PROXY_CIDRS=172.29.231.6/32
```

`infrastructure/secrets/cloudflared.yml` chứa hostname đích và định danh tunnel riêng.

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/pbl6-demo.json
ingress:
  - hostname: demo.congnguyen.me
    service: http://gateway:80
  - service: http_status:404
```

Mẫu `infrastructure/secrets/tunnel.compose.yaml`. Các đường dẫn mount tính từ `infrastructure/`, nơi đặt Compose file chính. Nếu đổi subnet, đổi cùng IP connector và `EDGE_TRUSTED_PROXY_CIDRS`.

```yaml
services:
  gateway:
    networks: [default, demo-ingress]
  tunnel:
    image: cloudflare/cloudflared@sha256:a15a3b50b8dabd57ac2090e9484c0247dba9dfa1f0df4d298d4317f9d69eb2d5
    user: '${LOCAL_UID:-1000}:${LOCAL_GID:-1000}'
    command: tunnel --no-autoupdate --config /etc/cloudflared/config.yml run
    volumes:
      - ./secrets/cloudflared.yml:/etc/cloudflared/config.yml:ro
      - ./secrets/pbl6-demo.json:/etc/cloudflared/pbl6-demo.json:ro
    restart: unless-stopped
    networks:
      demo-ingress:
        ipv4_address: 172.29.231.6
networks:
  demo-ingress:
    ipam:
      config:
        - subnet: 172.29.231.0/29
```

### Kiểm tra sau khi chuyển DNS

Trên Debian, kiểm tra origin với `curl -fsS -o /dev/null -H 'Host: demo.congnguyen.me' http://127.0.0.1:18080/` và `compose ps`. Từ máy bên ngoài, kiểm tra public URL.

```powershell
curl.exe -fsS -o NUL https://demo.congnguyen.me/customer/returns
curl.exe -fsSI https://demo.congnguyen.me/
curl.exe -fsS -o NUL 'https://demo.congnguyen.me/api/v1/products?size=1'
curl.exe -sSI https://demo.congnguyen.me/assets/web/missing-smoke.js
```

HTML trả `Cache-Control: no-store`. Mở trang và kiểm tra bundle `/assets/web/` có MIME JavaScript. Asset vắng trả `404` và `no-store`. Nếu nhận HTML từ URL JavaScript, xác minh DNS và connector đang hoạt động trước khi purge URL bị cache. Nếu cần chuyển DNS về máy cũ, xác nhận origin cũ hoạt động và đã có phương án giữ dữ liệu phát sinh sau cutover. [Purge theo URL](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/).

## 5. Kiểm tra secret trước khi commit hoặc gửi gói deploy

- Giữ `.env`, private key, Cloudflare JSON, backup và cấu hình riêng trong đúng thư mục đã ignore. Dùng mẫu `.env.example` với giá trị giả. Giữ secret ngoài build args và biến `VITE_*` vì dữ liệu frontend có thể xuất hiện trong bundle.
- Dùng `compose config --quiet` để xác thực. Chia sẻ tên biến, trạng thái và mã lỗi. Giữ bản cấu hình đã resolve, dump và log chứa dữ liệu demo trong kho riêng.
- `.gitignore` bảo vệ file chưa theo dõi. `.dockerignore` loại các file tương ứng khỏi build context. Script deploy Web dừng khi phát hiện file frontend đã được track mà match ignore. Docker/Git có ngoại lệ cho đúng cặp fixture TLS của unit test SMTP.

```powershell
git check-ignore -v infrastructure/.env infrastructure/secrets/pbl6-demo.json artifacts/db/m2.dump
git ls-files -ci --exclude-standard
python scripts/scan_git_candidate.py --staged --report artifacts/secret-scan-staged.json
```

`git ls-files -ci --exclude-standard` phải rỗng. Bỏ `--staged` khi rà checkout trước khi đóng gói. Bản quét toàn checkout báo `private_key_material` cho fixture `backend/tests/unit/fixtures/smtp-test-key.pem`; đối chiếu đúng file với bản đã review. Xử lý mọi phát hiện khác trước khi upload hoặc push. Nếu secret đã từng vào Git, thu hồi hoặc xoay secret tương ứng và xử lý lịch sử repo riêng.

Nếu chạy trong worktree không có `.env`, truyền `--secret-env C:/PBL6/infrastructure/.env` để scanner đối chiếu giá trị local trong bộ nhớ; báo cáo không chứa giá trị secret.

## 6. Trạng thái sau rollout bug.docx ngày 22/11/2026

UI/voucher/chat/CMS đã chuyển sang Debian2. M3 có migration 015 media và 016 storefront; M4 có 010–012 cho budget dùng chung, media và thứ tự tin. Chat Store/AI media đã nghiệm thu public. Giữ ngân sách 1 USD/ngày, 10 USD/tháng; hai call nghiệm thu chỉ phân tích pixels/frame, không gen ảnh.

Release riêng `C:/PBL6/artifacts/debian2-chat-release-20261122` giữ nền wallet/nhãn hủy đơn hiện hành. Script web vẫn build trước rồi chỉ thay `web`, chờ `DEPLOY_OK`. Backend dùng `deploy-demo-storefront.ps1 -Scope vouchers|chat|storefront` hoặc `deploy-demo-ai-chat-media.ps1` với ReleaseRoot đã review; không dùng quy trình web cho DB/BE.

Các helper chuyển máy kiểm source hash so với đúng baseline đã giữ trong artifacts, kiểm normalized Compose/env/mounts và chỉ rollout nhóm service được chọn. Đây là quy trình cho các baseline cụ thể của đợt chuyển máy; lần thay đổi BE tiếp theo phải review lại baseline/manifest và chạy preflight, không bỏ kiểm tra hash để ép triển khai. `prepare-debian2-vouchers.py` chuẩn bị bản ghép riêng, dừng khi còn conflict; vẫn phải sinh lại contract, build và chạy kiểm thử trước rollout. Không đóng gói `.env`, private key hoặc snapshot runtime.

[Báo cáo rollout](bug-debian2-reconciliation-2026-11-22.md) và [nghiệm thu B01–B33](bug-docx-final-acceptance-2026-11-22.md) ghi kết quả public, cleanup và giới hạn kiểm thử.

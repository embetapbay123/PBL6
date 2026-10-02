# Log, giám sát, backup và triển khai

Khung log JSON service/route template/status/duration/correlation, không body/token/password. Node có Prometheus HTTP counter/histogram và default process metrics tại `/metrics`. M4 có log cùng format cơ bản, chưa có Prometheus exporter. `/health/live`, `/health/ready`, `/metrics` và `/internal/*` không route qua gateway.

Ready kiểm database/migration; chưa là kiểm chứng mọi dependency/consumer. Liveness không query DB. Member bổ sung signal broker/limiter/index/provider theo tình huống, tránh làm health restart-loop khi dependency tạm lỗi.

| Tín hiệu cần quan sát | Hành động | Người xử lý |
| --- | --- | --- |
| 5xx/timeout/latency tăng | Correlation → service/DB/dependency; đối chiếu deploy | Owner service, Công hỗ trợ |
| Outbox pending lâu/attempts tăng | Kiểm broker/binding/consumer; không xóa message | Công + owner producer |
| Dead-letter | Kiểm schema/input; sửa consumer, replay có audit | Owner consumer |
| Payment/Refund pending lâu | Reconcile reference/provider, không retry bằng key mới | Công |
| Inventory reservation mồ côi | Đối chiếu Order/operation ID, release đúng quy tắc | Hoa + Thịnh |
| Session/quyền bị từ chối | Kiểm User/membership/revoked session | Trí |
| AI fallback/index/model cũ | Kiểm index/event/consent/evaluation, giữ mock/fallback nhãn | Công |

Khung chưa có alert/dashboard/retention tự động. Đề xuất demo RPO24h/RTO60 phút; nhóm xác nhận sau restore drill có đo thời gian. Không coi file backup tồn tại là đã đạt RTO.

## Backup và restore drill an toàn

```powershell
python scripts/database_backup.py backup
python scripts/database_backup.py restore-drill --file artifacts/backups/RUN/m1.dump --target restore_drill_m1_RUN
```

RUN trong target chỉ dùng chữ thường/số/gạch dưới. Script dump4 database bằng pg_dump custom format, lưu artifacts/backups UTC. Restore chỉ tạo database **mới** với prefix restore_drill_; nếu tồn tại thì dừng. Không drop/clean/ghi đè DB m1–m4. Kiểm schema_migration, counts, constraints và truy vấn giả sau restore. Bảo vệ/encrypt/retention backup trước khi có PII thật.

Mỗi DB backup không bảo đảm snapshot cùng thời điểm xuyên SOA. Restore cả hệ cần đối soát outbox/inbox/Order/Payment/provider và pause worker phù hợp. Bảo vệ khóa/cấu hình để khôi phục riêng; không đưa secret vào báo cáo. Lưu ngày/run, version, dump sizes, restore time và query kiểm chứng.

## Local và HTTPS demo

Local mặc định localhost:8080 HTTP, COOKIE_SECURE=false. Để dùng domain demo: chỉnh SITE_ADDRESS thành domain, WEB_ORIGIN=https://domain, COOKIE_SECURE=true, bind HTTP80 của host; DNS/firewall cho80/443 để Caddy cấp TLS. Gateway có volume cert/config. Không expose DB/service/broker. Private key/secret demo khác local, seed phát triển không dùng ở demo có người thật. Cấu hình này chưa được triển khai trên host/domain thật.

Trước deploy: migrate trên bản backup có kiểm tra, build/test, xác nhận secret/origin/provider Test Mode và chạy smoke qua HTTPS. Rollback code không rollback migration destructive; ưu tiên migration tương thích, kế hoạch restore/đối soát riêng. `npm run infra:down` dừng nhưng giữ volume; không xóa volume có dữ liệu cần giữ.

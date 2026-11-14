# B01 — Gợi ý voucher và tổng tiền

Ngày 15/11/2026. Nhánh `codex/bug-docx-follow-through`, worktree an toàn `C:/PBL6/artifacts/bug-docx-plan`.

## Kết quả

- Có operation CUSTOMER `POST /checkout/voucher-suggestions`, nhận CART/BUY_NOW. Đọc giá/tồn và quyền sở hữu hiện tại; không giữ hoặc trừ lượt voucher.
- AUTO tìm tổng tiền hàng sau giảm thấp nhất, gồm phương án không dùng mã. Ngưỡng mã sàn xét sau mã gian hàng. Phí giao hàng độc lập với voucher theo luật hiện hành nên tối ưu tiền hàng cũng tối ưu tổng thanh toán khi cùng địa chỉ/phương thức.
- Phần làm tròn phần trăm, cap kể cả 0 và giới hạn giảm bằng tiền hàng được dùng chung với quote/xác nhận đơn. Phân bổ phần giảm sàn vẫn dùng largest remainder hiện có.
- Giới hạn 500 ứng viên, 10.000 trạng thái, 200.000 chuyển trạng thái, 1.000.000 phép xét mã sàn. Khi bị giới hạn trả LIMITED và UI ghi “Gợi ý ưu đãi”; không công bố “tốt nhất”.
- MANUAL tìm mã ở server, xác định đúng sàn/gian hàng, kiểm tra toàn bộ tổ hợp. Không phụ thuộc trang danh sách và không giả định mã chưa tải là mã sàn.
- Mở hộp chọn lần đầu tự gợi ý khi chưa có lựa chọn; lựa chọn thủ công được giữ. Đổi nguồn món/địa chỉ làm kiểm tra lại, hủy response cũ. Có bỏ mã, tính lại, lỗi/thử lại; mã lỗi giữ ô nhập và lựa chọn cũ.
- Giỏ chỉ gửi các dòng đang chọn, hiển thị tiền hàng chưa phí. Checkout nhận quote chuẩn có shipping, dùng lại quote được kiểm tra lúc bấm Áp dụng; không gửi một quote thừa từ effect. Xác nhận đơn vẫn qua transaction/reservation hiện có.
- Bố cục 320/390/1366 px đã kiểm tra ảnh; ô nhập mã không còn bị co nhỏ, footer xuống dòng, điều kiện phụ trong details.

## Kiểm tra

- Backend build, frontend production build, OpenAPI validation và generated drift: qua (198 public + 15 internal operations).
- Node unit: **59 suite / 447 test qua**. Có solver so với vét cạn 80 bộ 3 Store, cap 0, phần trăm/làm tròn, thời gian mili giây, giữ ngưỡng sàn, quota đổi, scope, CART sở hữu, BUY_NOW, stock, quote/hash và LIMITED.
- PostgreSQL thật trên candidate image, **28 integration test qua**: suite voucher lifecycle hiện có và 3 ca mới. Mỗi suite dùng schema UUID riêng, tự xóa; gồm đếm reservation/redemption đúng, lượt theo khách, bỏ hold hết hạn/released và hai khách tranh một lượt chỉ có một thành công. Không flush Redis hoặc chạy worker trong test container.
- Playwright trên production preview: **22 ca qua**, gồm 10 ca UI đợt 1, 6 ca giỏ hồi quy và 6 ca voucher mới. Bộ giỏ cũ được sửa selector/chữ theo UI hiện tại, thêm bước mở editor trước chọn; vẫn kiểm tra tiền, focus, mất ACK, chỉ GET khi đọc lại và ẩn SKU Customer.
- Benchmark local Node 50 Store/500 ứng viên: 46,35 ms, trả LIMITED đúng. Đây là đo ngân sách thuật toán trên máy local, không phải chứng nhận chịu tải API public.

## Triển khai và nghiệm thu public

- M2: `scripts/deploy-demo-vouchers.ps1` / `.sh`, chỉ patch controller/repository/service order, helper pricing và shared contracts cần thiết. Backup DB M2 bằng pg_dump và kiểm tra pg_restore list trước rollout. Không migration dữ liệu nghiệp vụ; giữ nguyên toàn bộ env đang chạy và image rollback.
- Chốt baseline đã dừng lượt đầu khi thấy source M2 lệch. Đối chiếu xác nhận revision cũ chỉ khác hai truthy cap guards và ba dòng trống cuối file. Script chỉ chấp nhận thêm đúng SHA-256 đã xem xét, không nới thành cho phép source tùy ý. Lượt sau qua integration và kết thúc **VOUCHERS_DEPLOY_OK**.
- FE build thành công rồi chạy script bắt buộc `deploy-demo-web.ps1`; public smoke kết thúc **DEPLOY_OK**. M1/M3/M4/edge guard/worker try-on không bị thay dịch vụ hoặc cấu hình ngân sách.
- Public UI/API không intercept, dùng danh tính/gian hàng/hàng hóa/voucher fixture riêng. 27 ứng viên hợp lệ, so với vét cạn một Store: tiền hàng thấp nhất **150.000đ**; shipping **15.000đ**; quote và đơn COD đều **165.000đ**, giảm **50.000đ**.
- Mã Store ngoài trang đầu được nhập từ UI mobile và xác định đúng scope. Khách khác đọc lựa chọn giỏ trả 404. Checkout áp dụng từ picker không phát sinh request quote thừa. Không page error hay HTTP error trong UI.
- Hủy đơn fixture, tồn giữ trở về 0, thu hồi cart/voucher/catalog/store/phiên đăng nhập và khóa hai danh tính fixture; kiểm tra không còn schema integration. Giữ audit/redemption của nghiệp vụ. Không nhận tiền COD, không gọi ngân hàng/carrier hoặc model trả phí; bằng chứng này không thay nghiệm thu các luồng thu tiền/hoàn tiền riêng.
- Harness public có một lượt đầu lỗi cú pháp script setup trước khi có ghi DB; đã sửa và chạy đầy đủ qua. Giữ log lần đó riêng, không tính vào kết quả sản phẩm.

Evidence local: `C:/PBL6/outputs/bug-voucher-phase2-2026-11-15/results.json`, `solver-budget.json`, ảnh mobile cart/checkout; UI fixtures ở `C:/PBL6/outputs/bug-voucher-phase2-2026-11-14/final-ui-cases/`. Không đưa token, mật khẩu hoặc evidence private lên Git.

Đợt này đóng B01 ở phạm vi đề xuất/áp mã và tiền quote/đơn. Không đóng phần tìm kiếm/media chat hoặc CMS gian hàng; các đợt 3–5 còn phải làm riêng.

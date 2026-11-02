# Đợt49 — báo cáo tiền nhất quán, kỳ UTC+7 và đối chiếu nguồn

## Kết luận và phạm vi

**CR-014 và OP-05 được xác minh; F15 hoàn tất trong phạm vi đã chốt.** Ngày mặc định theo giờ Việt Nam, thu/hoàn theo sự kiện tiền, dữ liệu lịch sử chưa rõ ngày nằm riêng và Owner/Admin có đường đối chiếu đúng Store/đơn. Không gọi doanh số là lợi nhuận, payout hoặc tiền đã hoàn khi refund mới UNKNOWN.

Sửa thêm **CF-049-01, P2, CONFIRMED → FIXED/VERIFIED**: tổng và chuỗi ngày trong cùng response có thể lệch nhau khi giao dịch commit giữa các truy vấn. Số tiền trong payment/ledger không bị thay đổi bởi lỗi này. Finding bổ sung không cộng vào52finding gốc.

Tổng gốc: **33/52 VERIFIED,19còn mở**. Các chuỗi cuối trên baseline chung, rollback snapshot writer và các finding khác tiếp tục được giữ trong phạm vi; chưa nghiệm thu toàn marketplace.

Người dùng đã điều chỉnh mục tiêu: **không cần kiểm thử mobile**. Sau chỉ dẫn này chỉ tiếp tục desktop/API/database; bằng chứng viewport cũ giữ nguyên lịch sử, không chạy thêm hoặc dùng mobile làm gate chặn hoàn thành.

## Baseline và bằng chứng lỗi

Baseline trước sửa `Node47/AI47/frontend48-resilient`; HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree. Không sửa manifest hoặc kết quả review cũ.

`financial-snapshot-baseline48-complete.json` có2FAIL bằng PostgreSQL/schema cách ly: Owner và Admin đều tổng thu0đ nhưng cash_series120000đ trong cùng response khi một giao dịch COD thật commit sau query tổng tiền và trước query chuỗi ngày. Test không sửa số trong ledger hoặc mock kết quả SQL; chỉ bố trí thời điểm giao dịch bằng manager quan sát query. Lượt `financial-snapshot-baseline48.json` còn thiếu access token fixture cho nhánh low-stock Owner; giữ làm lịch sử, không dùng nhánh đó để kết luận lỗi. Bản complete tái hiện cả hai vai trò.

`financial-refresh-baseline48.json`: gửi lại cùng bộ lọc không GET báo cáo mới; số cũ vẫn hiện dù nguồn đã thay đổi. Ca biên tháng/năm UTC+7 trong cùng lượt đã PASS, xác nhận sửa ngày cũ vẫn đúng. Không gộp lỗi snapshot thành lỗi tiền của provider hoặc nâng P1 chỉ vì báo cáo liên quan tiền.

## Thay đổi

- `backend/commerce-service/src/report/report.service.ts`: Owner/Admin đọc tổng đơn, tiền, khoản chưa rõ ngày và chuỗi ngày/tháng trong cùng transaction `REPEATABLE READ`. Khoản thu/hoàn commit giữa query thuộc lần đọc sau, không xuất hiện ở một phần response rồi vắng ở phần còn lại. Không giữ transaction khi gọi service kho; phần low-stock vẫn được ghi là kho hiện hành.
- `frontend/src/features/reports/FinancialReport.tsx`: có nút đọc lại báo cáo; gửi bộ lọc không đổi cũng GET mới. Đọc lại cả tổng hợp và các danh sách đang mở; chặn lặp khi đang đọc, không mutation hoặc retry tiền. Công bố thời điểm UI đọc tổng hợp, phân biệt với occurred_at/recorded_at của journal. Lỗi đọc vẫn là lỗi, không giả0 hoặc danh sách trống.
- Giữ nguyên định nghĩa kỳ `[from,to)`, timezone `Asia/Ho_Chi_Minh`, quyền Owner Store hiện hành/Admin `platform.admin`, trường nguồn thời gian và ledger bất biến. Không sửa migration đã áp, không thêm contract/DDL, không backdate đơn hoặc sự kiện để làm test qua.

Snapshot bảo đảm tính nhất quán trong **một response tổng hợp**. Các endpoint danh sách/pagination được đọc riêng theo thời điểm GET, không tuyên bố chúng cùng một snapshot xuyên nhiều HTTP request. Khi có giao dịch mới, UI có đường đọc lại và timestamp cho người đối chiếu; không phát minh khóa chặn giao dịch hoặc chứng nhận bank timestamp.

## Kiểm chứng mới

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Unit image49 |374PASS/51suite|`backend-unit-report49.json`|
| SQL cách ly |39PASS/6suite: report snapshot, migration/backfill, kỳ/gaps, CODrefund, callback và recovery|`financial-sql49.json`|
| Edge report |9PASS: scope, nguồn, lỗi, gaps/pager, refresh và timezone|`financial-ui49-trial.json`|
| Desktop UI/API/worker cuối |PASS mua cùng nhóm hai Store, COD + online callback muộn/UNKNOWN → đối soát → nguồn đúng đơn → back giữ scope|`financial-runtime49-desktop-accepted.json`|
| SQL/ledger cuối |PASS2Store/2đơn, thu300000/hoàn180000,3journal,1refund effect; kiểm luôn cleanup12Store của các lượt|`financial-final-state49-final.json`|
| Source/image |391backend/43AI/287frontend-contract-test-config,10container khớp|`deployed-source-manifest-49.json`, `frontend-source-financial49-final.json`, `runtime-image-financial49-final.json`|

Backend mới `pbl6-node:core-fix-20261102-49`; AI reader giữ47, provider simulator giữ37. Không migration mới hoặc contract mới nên không triển khai reader khác. Chỉ áp vào stack riêng `pbl6-fe-verify`, chưa commit hoặc deploy production. Manifest đầu49 và manifest cuối có parent riêng, giữ lịch sử sửa harness.

### Lịch sử và biên thời gian

`financial-backfill.test.ts` tạo schema tạm, chạy migration001–013, thêm **dữ liệu legacy test**, rồi áp migration014 thật và các migration sau. Đây là kiểm thử migration với dữ liệu dựng trong schema cách ly, không phải các giao dịch provider thật hoặc thao tác trên database demo.

Bốn khoản thu được backfill đúng: COD đủ tiền có collected_at và online có attempt thành công khớp tiền cùng SUCCESS event; cả trạng thái đã hoàn vẫn giữ nguồn thu. Online giữ timestamp tiếp nhận đầu tiên và nhãn `SYSTEM_RECEIVED`, không gọi là thời điểm ngân hàng xác minh. Duplicate SUCCESS event không tạo thêm collection. Đơn tạo2020 không làm đổi ngày tiền2026.

Thiếu collected_at, COD thu chưa đủ, online thiếu event, attempt UNKNOWN hoặc lệch tiền không được tự journal.32khoản thiếu căn cứ (gồm25khoản vượt trang đầu và hai khoản refund chưa có ngày đáng tin) phân trang đúng, không có occurred_at giả; Store khác không lọt phạm vi. Báo cáo kỳ có thu480000/hoàn0, tiền thu chưa rõ ngày3580000/hoàn chưa rõ ngày240000. Payment counters giữ nguyên; UPDATE/DELETE money_movement bị chặn.

`financial-report.test.ts` kiểm hai biên ngày UTC+7 (bao gồm đầu, loại đúng cuối), bucket tháng/ngày, đơn cũ có thu/hoàn trong kỳ và Store scope. Edge dùng clock cố định với timezone trình duyệt khác Việt Nam, gồm biên đầu tháng và đầu năm; input và request vẫn là ngày Việt Nam đúng.

### Mẫu runtime xuyên cùng đối tượng

Một Customer đặt CART với hai Store, tổng300000: A/COD120000, B/online180000 gồm phí giao tương ứng20000/30000. Báo cáo mở từ menu Owner/Admin khi chưa thu đều0. A được xử lý/giao/thu/hoàn tất qua HTTP thật; Owner gửi lại cùng bộ lọc và thấy120000, mở chi tiết nguồn.

B tạo mã thanh toán, Customer hủy trước thanh toán, callback thành công đến muộn. Provider kiểm thử được đặt rule riêng theo correlation trả UNKNOWN cho đúng refund; báo cáo Admin lọc B hiển thị thu180000/hoàn0. Sau simulator xác nhận một hiệu ứng hoàn và worker lookup, nút đọc lại hiển thị hoàn180000 và hai journal của đúng B. Callback cùng event gửi lặp trước/sau refund không tạo thêm receipt, collection hoặc refund; provider refund_calls1/effects1.

API chọn đầu kỳ thật **sau khi đơn đã tạo, trước khi thu**: Owner/Admin cho A và B đều order_count/order_value0, nhưng tiền đúng120000/180000/180000 theo event. Không sửa created_at. SQL đọc lại xác nhận điều này bằng thời gian gốc, cùng purchase_group/customer, payment/refund/job/followup, money IDs/nguồn/số tiền và stock ledger.

Từ mỗi khoản tiền, Owner mở đúng đơn COD và Admin mở đúng đơn online; thấy snapshot món, tổng tiền và Store phù hợp quyền. Back giữ báo cáo/scope. Trang Admin dùng nút có accessible name “Chi tiết đơn …”; lỗi locator dùng “Xem đơn” của Seller đã được sửa trong harness, không đổi app/tiền để cho qua.

Hậu điều kiện cuối: A COMPLETED/payment SUCCEEDED, B CANCELLED/payment REFUNDED, refund/job/followup đều kết thúc;3journal, thu300000/hoàn180000; quantity A9/B10, reserved0, ledger khớp. Sản phẩm/type/category dừng và Store khóa sau test; giữ toàn bộ audit, order và movement.

## Giới hạn, lịch sử trial và tiếp tục

- Những lượt desktop/mobile trước yêu cầu bỏ mobile được giữ nguyên, gồm hai lượt đúng nhưng chưa mở link nguồn. Gate cuối dùng desktop đầy đủ, không bắt chạy lại mobile. Các ảnh chụp viewport cũ không thay thiết bị vật lý, screen reader hoặc nghiên cứu người thật.
- Lượt trial đầu sai assertion mã kỹ thuật thay vì nhãn thời gian tiếng Việt; trial2 đòi duplicate flag nội bộ không nằm trong ACK công khai. Không sửa contract/response để khớp test. Bằng chứng chống trùng là payment_callback_receipt/journal/refund/provider thực tế, không chỉ HTTP200.
- Trial2 dừng trước lúc harness giữ operation refund nên cleanup chưa đối soát xong UNKNOWN. `financial-trial-recovery49.json` chỉ đối soát execution đúng tag với simulator, chờ worker lịch bình thường; không sửa SQL tiền/tồn/đơn, không reset backoff hoặc chạm các ca pending cũ37/39. Cuối đợt kiểm mọi12Store/12product của49, không còn đơn hoặc refund chưa kết thúc trong tập này.
- Dữ liệu legacy dùng schema tạm, không đưa32khoản giả vào production/test runtime ledger. Không tuyên bố đã tái backfill migration014 trên database đang chạy hoặc sửa lịch sử đã áp.
- Các điểm UI1440 và dữ liệu thật là walkthrough chuyên gia. Không tỷ lệ thành công người dùng; `USER_VALIDATION_PENDING` giữ nguyên. Mobile không còn là yêu cầu kiểm thử của mục tiêu cập nhật.
-9ca Edge mới chạy trước chỉ dẫn bỏ mobile có một ca chụp nhiều viewport; các viewport không tăng số nhiệm vụ. Từ chỉ dẫn đó trở đi không chạy thêm mobile.374unit/39SQL là lượt mới, AI43source không đổi; không báo đã chạy lại Python ở49.
- F11 voucher, F14 quản trị, F13/F16/F17 và các finding chưa đóng vẫn tiếp tục. Sáu chuỗi nghiệm thu cuối cùng baseline và rollback snapshot writer ở F18 không được thay bằng mẫu báo cáo hai Store này.

Gate tổng hợp và quét secret cuối nằm ở `financial-acceptance49.json`/`artifact-secret-scan49.json`. Mục tiêu vẫn toàn bộ finding; không chuyển trạng thái goal sang complete.

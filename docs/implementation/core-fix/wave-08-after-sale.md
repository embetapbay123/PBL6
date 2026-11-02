# F10 — hoàn COD, cập nhật kết quả và đơn không cần thu tiền

01/11/2026. Stack riêng `pbl6-fe-verify`, gateway18080/frontend3109. Backend **manifest34**, frontend/contract/test **frontend-source-after-sale34-accepted.json**, AI giữ29. Không migration, enum hoặc contract mới. Giữ nguyên baseline review và các kết quả thất bại.

## Kết quả và phạm vi nghiệm thu

**CR-006 và CR-007 FIXED/VERIFIED34**. Tổng **17/52 finding gốc đã xác minh,35 còn mở**. F10 vẫn IN_PROGRESS cho ma trận provider/restart cuối; hai finding cụ thể này không còn chặn. Sáu chuỗi cuối chưa được chạy lại cùng baseline34: CH01–05 gần nhất21, CH06 gần nhất29.

- **CR-006:** Owner đúng Store xác nhận hoàn COD120000, gồm phí giao20000, bằng biên nhận/người nhận/thời điểm/xác nhận đủ tiền. UI nói rõ xác nhận thủ công; không giả ngân hàng đã kiểm chứng. Mất ACK sau commit → retry giữ nguyên body/operation → một refund, một receipt và một ledger hoàn. Hoàn tất yêu cầu qua UI; yêu cầu cũ đủ điều kiện vẫn dùng được đường xác nhận hiện hành.
- **CR-007:** Customer mở trang trước khi Owner hoàn, trang nhận SUCCEEDED qua GET polling mà không reload/đổi URL. Fixture online kiểm REQUESTED→SUCCEEDED, dừng polling sau60giây, làm mới lỗi503 rồi thử lại; không gửi mutation khi GET lỗi.
- Runtime kiểm SELLER/Admin/Customer403, Owner Store khác404, thiếu chứng từ/thời điểm sai422, version cũ409. Nhân viên đang mở trang bị thu quyền → token cũ GET403; không có form Owner. Quyền được kiểm ở API, không dựa vào ẩn nút.

Đây là phạm vi ca đã chạy, không phải khẳng định mọi nhánh quyền/cạnh tranh hoặc mọi provider đã nghiệm thu. Nghiên cứu với người thật vẫn USER_VALIDATION_PENDING.

## P1 bổ sung: đơn 0đ bị kẹt

**CF-033-01**, riêng ngoài52 finding gốc. Baseline29/frontend31: COD0đ hoàn tới RECEIVED/APPLIED rồi409 REFUND_NOT_CONFIRMED; online0đ còn AWAITING_PAYMENT, tạo thanh toán409 PAYMENT_AMOUNT_INVALID. COD0đ còn ghi một COLLECTION0 trong lịch sử cũ. Tái hiện bằng API/database/worker thật tại `zero-due-baseline31.json`.

Sửa tại `payment/zero-due.ts`, `payment.service.ts`, `payment.api.service.ts`, `payment.followup.port.ts`, `order.service.ts`, `order-inventory.runner.ts`, `returns.service.ts`, `delivery-return.service.ts` và `delivery-return.runner.ts`:

- Đơn0đ có nghĩa vụ tiền đã đáp ứng, đi tiếp luồng giữ/trừ hàng và xử lý đơn. Không QR/provider attempt, không biên nhận thu/hoàn, không ledger tiền0 mới. API từ chối thao tác thu/tạo thanh toán không cần thiết.
- Hoàn sau mua vẫn cần kiểm hàng, kho và quyết định phí. Giá0 không bỏ qua version/ownership hoặc các ràng buộc này.
- Hoàn về giao thất bại đóng Order và nghĩa vụ Payment cùng transaction. Không gọi hủy thường để cộng kho lần hai.
- Legacy online0 chỉ tự phục hồi nếu không có external attempt; trạng thái UNKNOWN không bị xóa. Ledger cũ bất biến được giữ nguyên.

UI Customer/Seller/Admin, PaymentPanel, checkout và màn đổi/trả nói rõ **không cần thu/hoàn tiền**; không gọi0đ là tiền ngân hàng đã nhận. Payment SUCCEEDED0 biểu diễn nghĩa vụ đã đáp ứng, không phải bằng chứng có tiền thu. Đơn hủy/hoàn về đã đóng có Payment CANCELLED0.

Kiểm thêm sản phẩm100000 được voucher giảm đủ100000: giao/hoàn tất/nhận trả/đóng yêu cầu bình thường; lượt voucher đã dùng giữ1 sau hoàn. Không tự phục hồi ưu đãi.

## Gate và hậu điều kiện thật

Artifact dưới `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Backend unit34 |365PASS/51suite|`backend-unit-zero34.json`|
| M1/M2 SQL isolated34 |35PASS/5suite|`zero-after-sale-integration34-final.json`|
| UI fixture33, app hash giữ nguyên34 |72PASS|`after-sale-fixtures33-final.json`|
| Edge1440, API/DB/worker thật34 |4PASS|`after-sale-runtime34-desktop.json`|
| Edge390, đơn0đ34 |1PASS|`after-sale-runtime34-mobile.json`|
| Edge390, hoàn COD/quyền/poll34 |1PASS|`cod-refund-access34-mobile.json`|
| Dương tiền: checkout nhiều Store và race33 |2PASS, không gọi là chạy lại34|`cart-regression-zero33.json`|
| SQL đọc cuối M1/M2/M3 |PASS|`after-sale-final-state34.json`|
| Source/image đang chạy |264backend/214frontend-contract-test,9image khớp|`runtime-image-after-sale34.json`|

SQL cuối chọn đúng6lineage34, không trộn lượt lỗi hoặc các giao dịch cũ:

- 9Order:7đơn0đ (4COMPLETED/PaymentSUCCEEDED0,3CANCELLED/PaymentCANCELLED0);2đơn COD120000 đã hoàn đủ.
- 7đơn0đ có0money movement,0refund,0payment attempt. Hai đơn có tiền có đúng4movement thu/hoàn,2refund,2receipt; M3 xác minh đúng Owner/Store, M2 có2audit xác nhận thủ công.
- 6yêu cầu đổi/trả COMPLETED/APPLIED,2hồ sơ hoàn về CLOSED/APPLIED;6variant quantity10/reserved0. Một redemption100000 giữ lượt1, voucherSTOPPED.
- Product/taxonomy có tag đã thu hồi ACTIVE; giữ giao dịch, audit và ledger để đối chiếu. Script đọc cuối chỉ SELECT, không sửa hậu điều kiện.

SQL integration chạy schema riêng, vận chuyển service/RPC fake được ghi rõ; không thay bằng chứng HTTP/worker thật. Hai fixture SQL mới được bind read-only vào container test sau khi sửa dữ liệu dựng sẵn; image runtime34 không bị sửa file. Hash fixture cuối nằm trong manifest214file accepted; manifest trước giữ lịch sử.

Frontend build, contract check/drift và docs check được ghi tại `after-sale-acceptance34.json`. Docker build backend34 đã qua. AI29 không thay mã nên không tuyên bố chạy lại Python trong đợt này.

## Lượt lỗi và giới hạn

- Source32 lỗi đọc UPDATE RETURNING của TypeORM được SQL phát hiện trước deploy; sửa dùng returnedRow ở33. Báo cáo lỗi32 giữ nguyên.
- Sau UI33 qua, SQL vẫn bắt được PaymentSUCCEEDED0 khi Order hoàn về đã CANCELLED: `after-sale-readback33-mismatch.json`. Sửa đóng nghĩa vụ trong transaction34; không nới kỳ vọng SQL để chấp nhận trạng thái lệch.
- Fixture SQL34 ban đầu thiếu reservation ID và frozen inventory command, vi phạm CHECK; sửa dữ liệu fixture, không bỏ constraint. Một lần chạy service m2 thiếu URL M1 làm14ca skip; không dùng làm nghiệm thu. Báo cáo cuối35/35 mới được chấp nhận.
- Lượt login429, identity chưa verified và helper đổi tài khoản sai điểm bắt đầu giữ lịch sử; fixture sửa tiền điều kiện và chạy tuần tự, không tắt/xóa rate limiter.
- `legacy-zero-return-recovery33.json` chỉ là phục hồi đúng yêu cầu cũ qua domain service, không phải nghiệm thu auth. Ledger COLLECTION0 cũ được giữ, không xóa lịch sử.
- Xem ảnh Owner/Customer390 để kiểm nội dung; viewport Edge không chứng minh bàn phím ảo, native zoom, screen reader hoặc thiết bị thật. Lịch sử UI hoàn về đầy đủ và ma trận quyền/cạnh tranh F09 vẫn còn mở; đợt này chưa bổ sung timeline UI.

Tiếp theo: lịch sử hoàn về/đổi trả và quyền khi thao tác đang mở, các nhánh provider lỗi/restart còn thiếu, rồi nghiệm thu các finding còn lại và sáu chuỗi cùng source cuối. Chưa kết luận sẵn sàng vận hành.

Đính chính viewport ở lượt35: ca hoàn COD34 đặt390 cho Owner, Customer/nhân viên dùng context mặc định1280; không coi hai context đó đã qua390. Lượt35 đã đặt đúng390 cho cả ba và chạy qua; xem wave09. Ca UI đơn0đ34 đã đặt viewport riêng đúng từ trước.

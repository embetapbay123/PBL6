# F09 — xem lại diễn biến đổi trả và hoàn về

01/11/2026. Tiếp nối wave08, đây là **PROGRESS** của mục tiêu đầy đủ52 finding/F00–F18/sáu chuỗi; không đổi phạm vi thành riêng lịch sử. Backend **manifest35**, frontend/contract/test **frontend-source-history35-final.json**, AI giữ29. Không migration hoặc thay writer tiền/tồn. Chưa đóng thêm finding gốc: **17 VERIFIED,35 còn chưa nghiệm thu đầy đủ**.

## Thay đổi

Trước đợt này, hệ thống lưu các lần quyết định/kiểm hàng/đối soát nhưng UI chủ yếu chỉ hiện kết quả cuối. Đã thêm đường **Lịch sử đổi trả và hoàn về** tại yêu cầu Customer, trang Seller/Admin và hồ sơ giao thất bại; mở bằng chuột hoặc bàn phím, có tải/lỗi/thử lại/làm mới và xem cũ hơn. Lịch sử đang mở đọc lại khi version hoặc trạng thái tiền của hồ sơ thay đổi.

Ba API GET mới theo đơn: `me/orders/{id}/after-sale-history`, `store/orders/{id}/after-sale-history`, `admin/orders/{id}/after-sale-history`. Reader kiểm ownership, Store hiện hành/quyền xử lý đơn và quyền Admin trước khi đọc. Không mở trang nhật ký Store cho SELLER. Contract bổ sung3operation, tổng155public/14internal; giữ các request/response cũ.

Reader đối chiếu trực tiếp status/operation history, delivery history, các action refund được cho phép và ledger khoản hoàn. Có quyết định phí, các bản kiểm hàng cũ, đồng ý/từ chối chuyển loại, xác nhận kho, đang xử lý/UNKNOWN/tra soát/đã hoàn. **REQUESTED/PROCESSING/UNKNOWN không được gọi là đã hoàn tiền.** Không dựng lịch sử từ trạng thái hiện tại hoặc dữ liệu sản phẩm mới.

Phân trang cursor mặc định20/tối đa50; khóa sắp xếp gồm thời điểm hệ thống ghi nhận đủ microsecond, nguồn và UUID. Sự kiện mới không làm trùng/mất các trang cũ đang đọc. Khoản hoàn có thời điểm phát sinh và ghi nhận riêng, hiển thị giờ Việt Nam UTC+7; thời điểm Owner xác nhận được ghi rõ chưa phải ngân hàng kiểm chứng.

Customer và SELLER chỉ nhận nhóm actor, không nhận ID tài khoản. Owner đúng Store/Admin có thể tra nhãn tài khoản trong scope bằng API hiện có. Role tại thời điểm thao tác cũ chưa được lưu nên dùng **Người xử lý**, không suy Owner/Seller/Admin từ quyền hiện tại. Worker refund từng ghi customer ID được nhận diện từ các action cố định của worker và hiển thị Hệ thống; không suy từ ghi chú tự do.

Không trả raw audit/command JSON, địa chỉ, nội dung đối chiếu riêng, mã provider, người nhận hoặc mã biên nhận COD. Chỉ chiếu các field nghiệp vụ công khai đã cho phép. Mất quyền401/403/404 thì ẩn lịch sử cache; GET lỗi không tạo giao dịch hoàn mới.

Mã: `backend/commerce-service/src/returns/after-sale-history.service.ts`, `returns.controller.ts`; `frontend/src/features/returns/AfterSaleHistory.tsx` và các view liên quan. OpenAPI/generated types/runtime registry đã cập nhật cùng source.

## Bằng chứng

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Backend unit, image35 cuối |365PASS/51suite|`backend-unit-history35-final.json`|
| SQL isolated M1/M2 |39PASS/6suite|`after-sale-history-integration35.json`|
| Hồi quy UI9suite |75PASS|`after-sale-fixtures35-final.json`|
| Lịch sử mở nhận Customer consent |1PASS, riêng ngoài75|`history-ui-update35.json`|
| Runtime1440 |1PASS, nhiều checkpoint UI/HTTP/worker|`after-sale-history-runtime35-desktop-final.json`|
| Runtime390, cả ba browser context |1PASS, cùng luồng|`after-sale-history-runtime35-mobile.json`|
| Hậu điều kiện SQL thật |PASS|`after-sale-history-final-state35.json`|
| Source và image |265backend/218frontend-contract-test;9image khớp|`image-source-match-35.json`, `runtime-image-history35.json`|

SQL mới kiểm12event từ mọi nguồn, giữ biên bản cũ và bỏ field PRIVATE trong audit/inspection/receipt; actor redaction theo vai trò. Có75event với cùng timestamp và chênh1microsecond: đọc size3 qua hết, thêm sự kiện mới giữa lúc phân trang vẫn không trùng/mất75event cũ. Kiểm sai Customer/Store404, mất quyền/khóa membership/Admin thiếu quyền403, cursor sai và size vượt50 bị422. Đây là fixture PostgreSQL/schema riêng, không giả provider hoặc UI thật.

Runtime dùng Store/khách có tag mới. Sau đăng nhập đi menu tài khoản → Store Portal → Đổi trả; Customer đi đơn hàng → tìm mã → chi tiết → theo dõi yêu cầu. Nhân viên mở lịch sử rồi bị thu quyền; lịch sử ngừng truy cập. Owner hoàn COD120000 gồm phí giao20000, mất ACK/retry cùng body, hoàn tất yêu cầu. Customer/Owner đọc cùng event; Admin đọc qua API cùng nội dung, Store khác/Customer khác404. **Không tuyên bố đã walkthrough Admin UI từ các GET này.**

Cùng fixture có đơn COD chưa thu giao thất bại. HTTP ghi25bản kiểm hàng nối tiếp rồi worker đối chiếu/đóng; Owner đi menu Giao thất bại/hoàn về → mở lịch sử → xem cũ hơn, nhận đủ29event. Đây là bằng chứng UI đọc/phân trang;25lần nhập biên bản được tạo qua API, không báo là đã nhập từng bản bằng UI.

Đối chiếu cuối đúng2lineage nghiệm thu:4Order (2COMPLETED/REFUNDED120000,2CANCELLED/CANCELLED chưa thu),2Return COMPLETED/APPLIED,2Delivery CLOSED/APPLIED,50bản kiểm. Chỉ4movement thu/hoàn ở hai đơn đã thu; các đơn hoàn về chưa thu không có hoàn giả. Hai variant quantity10/reserved0. Chứng từ được đối chiếu với Owner trong M3; Product/taxonomy test không còn ACTIVE. Giữ toàn bộ giao dịch/lịch sử.

## Lượt lỗi, giới hạn và phần tiếp theo

- `after-sale-fixtures35.json` có72PASS/3FAIL: selector nhãn actor có ID con, StrictMode tạo thêm GET đầu, fixture403 thiếu `/me/context` làm session bị thu hồi. Chỉnh fixture/selector; vẫn kiểm đúng cursor retry và cache bị ẩn. Không nới quyền hoặc đổi kỳ vọng tiền/tồn. Lượt75 cuối mới được nghiệm thu.
- Unit đầu364PASS/1FAIL vì số operation cố định166/152 chưa tính3API mới. Cập nhật169/155 và docs-check155 cho3API đã thêm; giữ toàn bộ validation schema/fixtures. Build thứ hai chỉ đổi test này;265file business/contract khớp image đầu đã chạy39SQL.
- Runtime1440 đầu dừng ở input `datetime-local` khi giây00 bị browser chuẩn hóa. Sửa dữ liệu thời gian của harness, không sửa validation COD. Lượt lỗi giữ một yêu cầu trả hàng pending và lịch sử riêng; không ép hoàn tiền/đánh dấu hoàn tất để làm sạch. Sản phẩm test vẫn STOPPED; hồ sơ này không nằm trong hai lineage nghiệm thu cuối.
- Wave08: Owner COD chạy390 nhưng Customer/nhân viên của test COD dùng context mặc định1280. Wave35 đã đặt390 cho cả ba. Không sửa lịch sử báo cáo34 thành PASS390 cho các context chưa chạy đúng; luồng đơn0đ wave34 đã đặt viewport riêng đúng từ trước.
- 768/1024 được kiểm ở fixture lịch sử, bàn phím mở details và UTC+7 được kiểm bằng Edge. Chưa kiểm native zoom, screen reader, bàn phím ảo, thiết bị thật hoặc nghiên cứu người dùng. USER_VALIDATION_PENDING.
- F09 vẫn cần các biên quyền/cạnh tranh và hành trình exchange/conversion cuối. F10 còn provider FAILED/restart, CH01–05 gần nhất21/CH06 gần nhất29 phải chạy cùng baseline cuối. Chưa kết luận toàn ứng dụng sẵn sàng vận hành.

Build frontend/backend, contract check/drift và docs check ghi tại `after-sale-history-acceptance35.json`. Các manifest/report trước được giữ nguyên; không sửa baseline cũ để che thay đổi source.

# F08 — bước tiếp, thu COD và diễn biến đơn

02/11/2026. **UX-06 và OP-03 VERIFIED**, tổng **23/52 finding gốc VERIFIED,29 còn mở**. **UX-12 giữ PARTIAL**: phần xử lý đơn hằng ngày đã mở rộng, nhưng các chỉ dẫn duyệt Store/thiết lập/quyền trong phạm vi finding còn cần nghiệm thu theo F05/F12. Không thu hẹp52finding hoặc thay sáu chuỗi cuối bằng các ca dưới đây.

Baseline **Node41/AI41/frontend42**, HEAD không đổi, working tree được ghi hash riêng. Backend387file và AI43file không đổi41;10container giữ đúng image41, simulator tiền37 có chủ đích. Frontend/contract/test/config259file,9file đổi/thêm so41. Không migration, enum, contract, worker hoặc provider mới.

## Phát hiện tiếp và sửa

Lịch sử/chi tiết từng mời “Thanh toán ngay” hoặc “Mở thanh toán” chỉ theo trạng thái đơn AWAITING_PAYMENT, dù tiền UNKNOWN. PaymentPanel cũng gọi createPaymentAttempt sau GET cho đơn này; server có guard và từ chối409, chưa chứng minh có khoản thu sai. Đây là phần hướng dẫn thiếu của UX-06/UX-12, không thêm ID bug trùng.

Hàm `canStartOrderPayment` dùng chung cho lịch sử, chi tiết và trang thanh toán. Khi đã biết UNKNOWN/SUCCEEDED/REFUNDED/CANCELLED thì không tạo mã; giữ tương thích DTO cũ thiếu payment_status bằng guard server. UNKNOWN có hướng đối soát, không gợi ý chuyển/thu lại. Mở trang UNKNOWN và nút đọc lại chỉ GET. Nếu đọc lại chuyển về PENDING, UI yêu cầu **một hành động riêng** để tạo mã; không tự POST sau GET. Không sửa quy tắc hoặc coi server409 là thanh toán thành công.

`OrderNextStep` dùng cùng một nguồn nhãn ở lịch sử, chi tiết, hàng đợi Seller và dialog. PREPARING/RECOVERING chờ hệ thống; PENDING chờ Store; CONFIRMED/PROCESSING giải thích lấy/kiểm hàng và giới hạn hủy–đặt lại; SHIPPED phân biệt kết quả giao với tiền; terminal phân biệt khoản hoàn đang xử lý với đã xác nhận. Hướng dẫn tác vụ không thay guard/version phía server. Nhân viên thiếu quyền thu COD vẫn biết phải nhờ Owner hoặc người có quyền, không chỉ thấy nút bị khóa.

## Bằng chứng và hồi quy

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Trước sửa |2FAIL: thiếu hướng dẫn UNKNOWN/đường GET-only khi mở trang|`order-guidance-baseline41.json`|
| Fixture source cuối |56PASS/6file:17guidance,12payment,6operations,10orders,8search,3identity|`order-guidance42-source-final.json`|
| Runtime1440 cuối |PASS, Customer/2SELLER/OwnerAPI/AdminUI|`fulfillment-runtime42-desktop-final.json`|
| Runtime390 cuối |PASS, cùng nhiệm vụ/dữ liệu độc lập|`fulfillment-runtime42-mobile-final.json`|
| SQL hậu điều kiện |4đơn/6variant/4nhân viên;2thu240000,0hoàn; timeline và actor khớp|`fulfillment-final-state42.json`|
| Source/image |387backend/43AI không đổi;259frontend-contract-test-config;10image khớp|`frontend-source-fulfillment42.json`, `runtime-image-fulfillment42.json`|
| Thu hồi fixture |8product/type/category STOPPED,5Store LOCKED;3đơn exploratory SHIPPED chưa thu giữ nguyên|`fulfillment-visibility42.json`|
| Build/contract/docs/hash/whitespace/secret |PASS;171docs,259hash frontend,10file đổi/mới không trailing whitespace,1420text artifact không khớp secret runtime|`fulfillment-acceptance42.json`, `artifact-secret-scan42.json`|

Không cộng số viewport thành nhiệm vụ mới. UNKNOWN mở trang/readback/chuyển lại PENDING được kiểm bằng **HTTP fixture**; không gọi là sự cố ngân hàng thật đã tái hiện. Luồng COD dưới đây có HTTP/DB/worker thật, tiền là xác nhận thủ công trong môi trường riêng.

## Hành trình cuối1440/390

Mỗi lượt tạo hai đơn COD cùng120000đ, cùng sản phẩm/Store, khác sizeM vàL. Đây là dữ liệu có tag; identity chuẩn bị bằng seed riêng có kiểm soát, không thay nghiệm thu đăng ký/email. Lượt cuối Customer nhận ra đúng đơn từ size trong lịch sử rồi mở chi tiết, không dùng UUID/DB để chọn. Bằng chứng nhiều Store/tên giống nhau/snapshot sau sửa giữ ở40; các bộ lọc/pagination/Back/Forward có hồi quy56fixture trên nguồn42.

SELLER chỉ quyền đơn mở từ menu Store Portal→Đơn hàng Store→hàng đợi→dialog. Owner đã xác nhận bằng API trong lúc dialog cũ còn mở; gửi cùng version bị409, UI khóa ghi tới khi đọc lại. Nhân viên sau đó chuẩn bị/bàn giao bằng UI, thấy COD chưa thu và biết ai cần ghi nhận, không thể tự xác nhận tiền khi thiếu quyền.

Nhân viên thứ hai có quyền COD mở dialog và xác nhận đủ số tiền. Owner thu hồi quyền khi form mở; POST bị403, payment vẫnPENDING. Session context cập nhật làm dialog cũ đóng, bảo vệ khỏi dùng context cũ. Sau cấp lại, tải lại/mở đơn theo UI, xác nhận tiền cũ không được giữ thành một lần chấp thuận mới.

Lần thu tiếp theo tới server và commit, harness thay **phản hồi** bằng503 để tái hiện mất ACK. UI khóa ghi và chỉ đọc lại; đọc thấySUCCEEDED thì nút thu biến mất. Chỉ1POST thu sau cấp lại,1collection/1money_movement, không thu lần hai. Nhân viên chỉ quyền đơn đọc lại rồi hoàn tất sau khi giao thành công và đủ tiền. Không đồng nghĩa có hàng/tiền mặt vật lý được kiểm chứng.

ĐơnL chạy hủyCustomer cạnh tranh xác nhậnSELLER cùng version: đúng1response200/1response409. Nếu xác nhận thắng, nhân viên hủy bằng UI ở giai đoạn còn cho phép; nếu hủy thắng thì đọc trạng thái đã hủy. Không sửa món/lượng sau đặt. Cuối mỗi lượt M quantity9/reserved0, L3/reserved0, XL2/reserved0; mọi quantity/reserved khớp movement.

Customer/Store/Admin API trả timeline giống nhau. Customer/SELLER và Admin đều xem qua UI; Admin từ menu→Quản lý đơn hàng→tìm mã vụ việc→dialog. SQL có đúng PREPARING→PENDING→CONFIRMED→PROCESSING→SHIPPED→COMPLETED, thời gian khớp từng event API. PENDING do worker được gắn Hệ thống; bước chuẩn bị/giao/hoàn tất ghi đúng userSELLER trong DB. COD audit ghi đúng cashier. API không lộ actor_user_id; nhật ký Owner là OP-04 riêng.

## Lịch sử kiểm thử và giới hạn

Giữ report trước sửa và các lần lỗi harness. Report39ca đầu có1failure do đếm tổng GET là2, trong khi ReactStrictMode chạy thêm initialGET; đã kiểm **delta một GET sau thao tác** và giữ assertion0POST. Report52ca qua, rồi56ca qua sau bổ sung hàng đợi và4độ rộng.

Exploratory runtime: selector menu tiếng Việt không khớp Store Portal/Đơn hàng Store; thay quyền làm dialog cũ đóng; bộ lọc không đổi dùng cache nên không có GET mới; DOM có cả bảng và cardẩn nên locator cha cần chọn hàng hiển thị. Đây là lỗi harness, không thêm bug sản phẩm hoặc bỏ kiểm version/permission/tiền. Các lượt cũ vẫn còn report. SQL verifier đầu dùng cột completed_at không tồn tại (DTO suy từ history) và cast audit target sai varchar; sửa query theo schema, không thay dữ liệu.

8Storefixture đã dừng toàn bộ sản phẩm/type/category.5Store terminal được khóa quaAdminAPI;3Store ở exploratoryrun2/3/4 có đơn SHIPPED chưa thu được giữ quyền xử lý, không bịa giao thành công/thuCOD/nhận hoàn để dọn dữ liệu. Các pending trước42 giữ nguyên.

Đã kiểm1440/1024/768/390: hướng dẫn/điều kiện COD, keyboard đọc lại, hit-test nút và không tràn ngang; đã đọc ảnh390. Chưa nativezoom/bàn phímảo/screenreader/thiếtbịthật/người tham gia; `USER_VALIDATION_PENDING`. Backend không đổi nên không chạy lại366unit/73SQL/30Python41 chỉ để tăng số, giữ bằng chứng cũ và đọc SQL runtime mới.

UX-06 đóng cho nhận diện đơn/nhãn công việc/UNKNOWN tránh trả lại; OP-03 đóng cho timeline trạng thái/thời gian/nhómactor phù hợp quyền, nối legacy-worker proof21/SQL41 và readback42. UX-12 chưa đóng toàn bộ do các tác vụ onboarding/quyền liên quan vẫn chưa nghiệm thu đủ. Sáu chuỗi cùng nguồn cuối và rollback snapshot writer37 vẫn mở; chưa kết luận sẵn sàng vận hành.

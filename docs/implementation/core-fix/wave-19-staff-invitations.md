# F12 — lời mời, phân trang và quyền nhân viên hiện hành

02/11/2026. **CR-012 VERIFIED**, tổng **29/52 finding gốc VERIFIED,23 còn mở**. **OP-04 và F12 vẫn chưa đóng toàn bộ**: còn nghiệm thu đủ loại sự kiện nhật ký, nhãn lịch sử và projection trước/sau. Sáu chuỗi chung baseline cuối vẫn ở F18.

Baseline **Node41/AI41/frontend45**, HEAD không đổi.267 hash frontend/contract/test/config;387 file backend và43 file AI triển khai không đổi,10 container đúng image cũ. Thêm test backend `staff.lifecycle.test.ts` chạy bằng bind chỉ đọc trong schema tạm, không đổi ứng dụng/backend runtime, migration hoặc contract. Không thay manifest44 để gán bằng chứng mới.

## Lỗi tái hiện và thay đổi

Ba ca trên frontend44 đều FAIL (`staff-baseline44.json`): form mời cho sửa email/quyền trong lúc POST đang chờ; chấp nhận đã commit nhưng mất ACK vẫn hiện nút chấp nhận khả dụng; thu hồi gặp hết hạn không đọc lại trạng thái nên còn thao tác trên bản PENDING cũ.

`StaffPage` khóa email, nhóm quyền, thao tác và phân trang khi đang gửi/đọc lại, có flight guard đồng bộ. Các lỗi command chỉ dẫn GET readback, không tự phát lại POST/PATCH. GET lỗi ẩn dữ liệu cũ và chặn ghi cho tới khi đọc thành công; không xóa lỗi command bằng việc refresh danh sách. Nhân viên và lời mời có pager độc lập; về trang hợp lệ khi total giảm. Lời mời mới hiển thị ở trang đầu, giữ trang nhân viên hiện tại.

Customer giữ kết quả chấp nhận để kiểm tra trước khi cập nhật quyền. Mất ACK khóa nút chấp nhận và có **Đọc lại lời mời**, chỉ GET; ACCEPTED không còn nút gửi lần hai. **Cập nhật quyền và vào Store** đọc context hiện hành, kiểm đúng user/Store/membership ACTIVE trước điều hướng. Lời mời lịch sử sang Store khác không dẫn nhầm. Trang lời mời giữ page trong URL. Trạng thái/quyền có nhãn tiếng Việt, thời gian UTC+7; hết hạn khi đang mở trang cũng bỏ thao tác. Đồng hồ trình duyệt chỉ hỗ trợ UI, backend vẫn quyết định hết hạn.

SELLER là nhân viên; quyền theo membership Store, không cấp Owner hoặc `platform.admin`. Mỗi user hiện chỉ có một membership ACTIVE, không tự chuyển Store khi chấp nhận lời mời khác. Role SELLER được AuthService suy từ membership hiện hành; không cần gán role toàn sàn để test qua.

## Bằng chứng

Artifact: `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Baseline44 |3FAIL, chưa sửa app|`staff-baseline44.json`|
| Edge hồi quy |33PASS:8recovery,13merchant,7audit,5settings/dialog keyboard|`staff-fixtures45-accepted.json`|
| SQL lifecycle cách ly |10PASS: normalize/duplicate/email/quyền; expiry; sai user/Store; double accept; hai Store; accept–revoke; stale receiver; delivery lỗi/muộn; rollback audit|`staff-lifecycle-sql45-final.json`|
| SQL nhật ký cách ly |11PASS trên M1/M2/M3, backfill liên kết chắc chắn, atomic audit, scope/paging/date và actor cũ|`staff-audit-sql45.json`|
| Runtime1440/390 |Mỗi lượt dùng hai Store,101 staff/102 invitations; đọc và thu hồi cuối trang6, pager độc lập; mất ACK sau commit, quyền/lock/version/race thật|`staff-runtime45-desktop-final.json`, `staff-runtime45-mobile-final.json`|
| SQL cuối |4Store/4variant; mỗi nhân viên chính chỉ1membership,4event version0→3 và3audit thay quyền/khóa/mở; tồn11/10 đúng ledger,0đơn/0tiền; email capture2lời mời/user|`staff-final-state45.json`|
| Thu hồi hiển thị |18Store của mọi lượt thử45 LOCKED;18product/type/category STOPPED, không có đơn/case chưa kết thúc; lịch sử giữ lại|`staff-visibility45.json`|
| Source/image |267hash,387backend/43AI không đổi,10image đúng|`frontend-source-staff45.json`, `runtime-image-staff45.json`|

Nhân viên chính dùng UI điều chỉnh kho +1. Product/order/Owner-audit trả403. Owner thu quyền khi dialog kho đang mở: lệnh sau đó bị chặn, tồn không tăng lần hai; version cũ409. Khóa rồi mở lại không tự cấp lại quyền vừa thu. Mất ACK chấp nhận dùng `route.fetch()` thực sự commit200 rồi thay riêng phản hồi browser bằng503; GET đọc ACCEPTED, chỉ1POST/1membership/1acceptance audit/1event cấp membership đầu.

Hai HTTP chấp nhận từ hai Store chạy đồng thời chỉ một200, một409 và một membership ACTIVE. Accept–revoke đồng thời cũng chỉ một terminal winner; SQL cách ly bổ sung revoke trước rồi stale accept/thu hồi lặp không tạo quyền/audit trùng. Expiry runtime đổi riêng timestamp của lời mời có tag để kiểm server/client; không tuyên bố đã chờ7ngày. Lỗi email được thực thi qua StaffService thật với adapter ném lỗi có kiểm soát trong schema cách ly, không giả thành lỗi SMTP runtime. Lỗi email đến sau khi người dùng đã chủ động chấp nhận không đảo ngược membership hợp lệ.

## Lượt chưa qua và giới hạn

- Giữ nguyên các report thử: hai lượt runtime đầu sai locator đường menu; lượt3 dùng `uncheck` với checkbox controlled chờ server, đổi thành click rồi kiểm ACK200/readback. Không sửa kỳ vọng nghiệp vụ.
- `staff-fixtures45.json` có lỗi locator status khớp cả notice và Loading; sửa locator chỉ notice. `staff-fixtures45-expanded.json` có một lần màn trắng ở test catalog khi chạy Edge đồng thời. Lượt tuần tự cuối33/33 qua, nguyên nhân màn trắng chưa được chứng minh; không quy thành bug catalog đã sửa. Hai lượt cuối thu pageerror ở mọi trang Owner/Customer trong hành trình đều0; không thay cho thu thập mọi console trên mọi thiết bị. Ảnh cuối đưa scroll về0 trước chụp để header sticky không đứng giữa ảnh full-page theo vị trí cuộn trước đó.
-100staff và101pendinginvitation mỗi Store chính là SQL fixture có tag để kiểm phân trang, không phải100hành trình nhận lời mời từ UI. Không thao tác tài khoản demo chung.
- Audit runtime45 chứng minh thay quyền/khóa/mở và inventory actor trong phạm vi đọc, chưa thay toàn bộ N08: đổi giá, trạng thái đơn, actor sau rời Store, đầy đủ projection/version mọi loại event. Cần kiểm thêm normalization UPDATE RETURNING ở nhánh lỗi gửi lời mời. OP-04 giữ mở.
- UX-12 còn onboarding/phê duyệt/thiết lập Store ở F05/F12; không đóng bằng luồng nhân viên này. Email capture không phải inbox SMTP thật. Không thiết bị vật lý, bàn phím ảo, screen reader hoặc nghiên cứu người thật; giữ `USER_VALIDATION_PENDING`.
- Sáu chuỗi common-source cuối và rollback snapshot writer vẫn mở; không kết luận marketplace đã sẵn sàng vận hành.

Build/contract/drift/docs/hash/whitespace đều PASS;174docs. Secret scan dùng secret runtime và mã email capture chỉ trong bộ nhớ, không lưu giá trị; kết quả trong `artifact-secret-scan45.json`. Gate tổng hợp: `staff-acceptance45.json`. Warning bundle chính >500kB hiện hữu chưa xử lý ở gói này.

# F05 — hồ sơ, sổ địa chỉ và quay lại checkout

02/11/2026. **CR-010, CR-011, UX-05 và UX-19 VERIFIED**, tổng **27/52 finding gốc VERIFIED,25 còn mở**. **UX-04 vẫn PARTIAL**: Guest→login đã có bằng chứng25 và hồi quy43, nhưng chưa nghiệm thu đủ xác minh/reset nhiều tab trong hành trình mua. Không lấy bốn finding địa chỉ/hồ sơ thay toàn gói F05 hoặc F18.

Baseline cuối **Node41/AI41/frontend43**, source đóng băng ở `frontend-source-account-address43-accepted.json`. Backend387file/AI43file và10image không đổi41; frontend/contract/test/config262file,8file đổi/thêm so42. HEAD không đổi. Không migration/contract/provider/worker mới. Giữ manifest43trước và tất cả report/SQL trung gian làm lịch sử.

## Những khoảng trống được sửa

- Địa chỉ đã có form sửa nhưng input vẫn cho đổi trong lúc request đang chạy, thao tác mặc định/xóa cũng chưa khóa theo cùng một trạng thái. Nay form và các mutation khác khóa trong lúc ghi; ref chặn hai lần gửi trước khi React render. Sửa giữ cùngID, không ghi lại default từ form cũ. Validation từ chối giữ dữ liệu để sửa, không báo thành công.
- Khi mất ACK, UI cũ mở nút lưu lại ngay; POST tạo địa chỉ có thể ghi trùng. Nay kết quả chưa rõ đóng băng mutation và chỉ cho GET đọc sổ địa chỉ. Nếu server đã xác nhận ghi nhưng GET sau đó lỗi, UI phân biệt rõ tình huống này. Người dùng đối chiếu danh sách rồi chọn kết thúc thao tác; app không tự coi một địa chỉ giống nhau là bằng chứng lệnh cũ đã thành công và không gửi lại mutation.
- Quay lại checkout sau thêm địa chỉ khác mặc định trước đây vẫn chọn địa chỉ cũ trong draft. Mỗi địa chỉ nay có **Giao đến địa chỉ này** trong hành trình checkout. Route mang ID được gắn user/TTL30phút; chỉ nhận khi đúng phiên, đúng định dạng và còn trong sổ địa chỉ đã đọc. Quote mới vẫn do server kiểm. Địa chỉ route không được thay payload của attempt đã gửi chưa rõ kết quả.
- Dùng chung `readAddressBook` cho quản lý và checkout, đọc đủ các trang thay vì âm thầm dừng ở100. Tối đa100trang×100; thiếu trang/thiếuID trả lỗi rõ, không trình bày danh sách chưa đủ như đã hoàn tất. Đây là reader có kiểm tra, không thêm endpoint hoặc đổi giới hạn backend. Tái kiểm khi quote/confirm vẫn là thẩm quyền server.
- Hồ sơ dùng response PATCH để cập nhật cache đúng user ngay, rồi invalidate/readback; form khóa khi lưu. Tên chỉ khoảng trắng bị từ chối trước PATCH, maxlength200 theo contract. Profile và địa chỉ có guard thay đổi chưa lưu cho SPA/Back và đăng ký beforeunload; không lưu bản nháp PII vào sessionStorage. Đóng/hủy sửa là quyết định bỏ nội dung local, không sửa/xóa địa chỉ đã lưu.

Trạng thái chưa rõ của địa chỉ được đối chiếu thủ công vì endpoint hiện tại không có operationID/idempotency. Không bịa bảo đảm replay của server. Khi reload/đóng có thay đổi, trình duyệt có thể hỏi xác nhận theo chính sách native; nếu người dùng chủ động bỏ, bản nhập local không được khôi phục tự động. Không tự tạo cơ chế đồng bộ/xóa bản ghi giống nhau.

## Gate và bằng chứng

Artifact ở `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Trước sửa |3FAIL: ghi trong lúc nhập tiếp, chưa rõ kết quả có thể gửi lại, thiếu lựa chọn địa chỉ mới khi quay lại|`address-baseline42.json`|
| Hồi quy nguồn cuối |51PASS/4file:15address recovery,20purchase intent,7auth forms,9availability|`address-regression43-accepted.json`|
| Runtime1440 cuối |PASS, UI→API→worker thật, returning/newCustomer|`account-address-runtime43-desktop-accepted.json`|
| Runtime390 cuối |PASS, cùng nhiệm vụ/dữ liệu độc lập|`account-address-runtime43-mobile-accepted.json`|
| SQL cuối |2profile/4Customer/6address/2order/2inventory;0thu0hoàn, audit đúng số lần|`account-address-final-state43-accepted.json`|
| Source/image |262frontend-contract-test-config;387backend/43AI không đổi,10image khớp|`frontend-source-account-address43-accepted.json`, `runtime-image-account-address43-accepted.json`|
| Thu hồi hiển thị |6product/type/category STOPPED,6Store LOCKED, không có đơn đang mở trong tập43|`account-address-visibility43-accepted.json`|
| Build/contract/docs/hash/whitespace/secret |PASS;172docs,262hash khớp,gitdiff không có lỗi khoảng trắng mới/4file mới sạch;1472text artifact không khớp secret runtime|`account-address-acceptance43.json`, `artifact-secret-scan43.json`|

51ca gồm fixture HTTP và một kiểm thuần hàm intent; không gọi tất cả là giao dịch API thật hoặc51nhiệm vụ người dùng. 101địa chỉ/GET thiếuID/validation/không đổi attempt/dirty guard là bằng chứng fixture. Runtime dưới đây có API/database/worker thật. Không dùng các assertions xanh làm chứng cứ đã kiểm người dùng thật.

## Hai lượt nghiệm thu thực tế

Mỗi lượt dùng identity có tag được chuẩn bị riêng trong M3; không thay nghiệm thu đăng ký/email. Customer mở tổng quan để có cache, đi qua sidebar vào hồ sơ, đổi tên/phone và lưu. Quay Tổng quan trong SPA thấy ngay tên mới, không hard reload; API/SQL giữ đúng tên/phone.

Customer từ search/catalog→chi tiết chọn lượng2→Mua ngay→checkout, chọn SANDBOX và nhập voucher chưa áp dụng. Đi Quản lý địa chỉ, thêm đích giao dài khác mặc định. Sửa phone của địa chỉ đó; harness cho PATCH thật commit rồi thay response bằng503. Form khóa, GET đối chiếu thấy phone mới; chỉ1PATCH trong lần thử, không replay. Kết thúc đối chiếu rồi chọn Giao đến địa chỉ này.

Checkout hiện đúng đích mới/phone0901234570 và toàn bộ phần cuối địa chỉ, giữ SANDBOX và voucher nhập dở. Sau đó Customer chủ động đổi COD, xác nhận đơn mới theo quote. ĐơnPENDING có snapshotID/phone/địa chỉ mới, lượng2. Customer quay sổ địa chỉ, sửa phone thành0901234571; snapshot đơn vẫn4570. Hủy thật ở giai đoạn cho phép và worker trả quantity10/reserved0, không có khoản thu/hoàn giả.

Một Customer mới độc lập từ sản phẩm→Mua ngay gặp thiếu địa chỉ, đi link quản lý và thêm địa chỉ đầu tiên. Địa chỉ này là mặc định, chọn quay checkout có quote hợp lệ; dừng trước confirm, không bịa đã tạo đơn. Tài khoản này PATCH/DELETE địa chỉ của Customer trước bị404, không đổi dữ liệu.

SQL hai lượt cuối:6địa chỉ của4Customer, mỗiCustomer đúng1default, địa chỉ chọn mới của khách quay lại vẫn nondefault;2đơnCANCELLED/RESTOCKED,2inventoryquantity10/reserved0 và ledger khớp.6ADDRESS_CREATED/4ADDRESS_UPDATED/2PROFILE_UPDATED; mỗi địa chỉ mới chỉ1create,2update ứng với hai sửa phone chủ động khác nhau, không có lần ghi lặp do mất ACK.0money_movement.

## Lịch sử và giới hạn

Giữ report3FAIL trước sửa, các report24/48/49/50 và các lượt runtime trung gian. Một test dirty guard ban đầu gắn hai `once(dialog)` trước khi prompt đầu đã xử lý, dẫn tới hai handler nhận cùng dialog; đã dùng một handler và chờ số prompt trước bước tiếp, giữ nguyên việc dismiss phải bảo toàn giá trị. Không đổi app để bỏ cảnh báo.

Build phát hiện contract Address cho phép thiếuID; đã bổ sung kiểm tra runtime và kiểuid bắt buộc **sau khi kiểm**, không ép kiểu hoặc bỏ guard. Fixture thiếuID/thiếu trang nay là lỗi, không chọn một địa chỉundefined. Source cuối và readback accepted tách khỏi các manifest/readback trước; không đổi hash cũ để giả cùng nguồn.

Đã kiểm1440/1024/768/390 cho địa chỉ dài và hành động chọn, keyboardfocus/hit-test, không tràn ngang; đã đọc ảnh mobile. Ảnh full-page có thể chụp dải sticky ở giữa trang, không chứng minh mọi vùng cùng lúc hiện trên một viewport. Địa chỉ đầy đủ được kiểm riêng bằng DOM và hành trình UI, gồm phần cuối. Chưa nativezoom/screenreader/bànphímảo/thiếtbịthật hoặc nghiên cứu người thật: `USER_VALIDATION_PENDING`.

Backend/AI không đổi nên giữ366unit/73SQLintegration/30Python41, không chạy lại chỉ để cộng số; SQL43 là đọc hậu điều kiện thật mới. UX-04 và các luồng auth nhiều tab còn mở, dù7fixture auth qua. Sáu chuỗi chung baseline cuối, rollback snapshot writer37 và25finding còn lại vẫn chưa hoàn tất. Chưa nghiệm thu vận hành toàn hệ thống.

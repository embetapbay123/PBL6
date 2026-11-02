# F05 — tiếp tục mua sau xác thực nhiều tab

02/11/2026. **UX-04 VERIFIED**, tổng **28/52 finding gốc VERIFIED,24 còn mở**. Năm finding của F05 đã được xác minh theo phạm vi43/44. Sáu chuỗi chung nguồn cuối, các finding khác và giới hạn thiết bị/người dùng thật vẫn ở F18; chưa nghiệm thu vận hành toàn marketplace.

Baseline **Node41/AI41/frontend44**, HEAD giữ nguyên. `frontend-source-auth-journey44.json` chốt264file frontend/contract/test/config,11file đổi/thêm so43. Backend387file/AI43file và10image không đổi41; không migration/contract/provider/worker mới. Không thay hash/source baseline43 để gán cho kết quả mới.

## Tái hiện và thay đổi

Baseline43: Guest chọn sizeL×2, đăng ký qua UI, mở email capture ở tab khác, xác minh200 và đăng nhập thành công. Tab đăng ký cũ vẫn dừng ở form, thiếu đường tiếp tục; runtimeFAIL đúng điểm này. AuthPage trước đó chỉ lấy auth-return khi pathname là `/login`.

Nay tab đăng ký/quên mật khẩu có nút **Tiếp tục lựa chọn mua** sau khi nhận phiên từ tab khác. Nút đọc lại intent đã kiểm hợp lệ, quay chi tiết để tải giá/tồn hiện tại và giữ đúng phân loại/lượng; không phát lệnh thêm giỏ hoặc đặt hàng. Đường login cùng tab vẫn tự quay lại trang mua như25/43. Khi đã đăng nhập, trang đăng ký hướng dẫn quản lý đăng nhập nếu muốn tạo tài khoản khác, không hiện lại form đăng ký trống gây hiểu nhầm.

Auth-return chỉ nhận các đường nội bộ đã cho phép, bỏ URL ngoài origin/URL dạng`//` hoặc query không được phép. TTL30phút được kiểm cả khi mở trang và khi nhấn tiếp tục. Hết hạn có thông báo và đường mở lại sản phẩm/trang mua, không khôi phục lượng cũ. Chỉ lưu ý định sản phẩm công khai, không lưu mật khẩu, mã email hoặc dữ liệu riêng của giỏ trong auth-return.

Guest mua từ catalog trước đây cũng tới login mà thiếu return path; nay quay lại đúng chi tiết để xem/chọn hàng, không tự thêm defaultvariant. Guest mở giỏ đăng nhập xong đọc giỏ của tài khoản hiện tại, không mang IDgiỏ của người khác. Các đường ngoài allowlist không trở thành return URL. Trường đăng ký/login/quên mật khẩu/xác minh/reset được khóa trong lúc gửi để identity/body đang chờ không bị thay trên UI. Verify/reset nói rõ mã chỉ giữ trong tab; reload cần mở lại email hoặc nhập mã, không persist mã vào storage.

## Gate và bằng chứng

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Baseline thật43 |FAIL: login ở tab email đã thành công, tab đăng ký thiếu nút tiếp tục|`auth-journey-baseline43.json`|
| Hồi quy Edge |41PASS/3file:14continuation,7auth forms,20purchase intent|`auth-continuation44-expanded.json`|
| Runtime1440 cuối |PASS, đăng ký/xác minh/reset thật với email capture và hai tab; catalog/giỏ|`auth-journey-runtime44-desktop-accepted.json`|
| Runtime390 cuối |PASS, dữ liệu độc lập, cùng mục tiêu|`auth-journey-runtime44-mobile-accepted.json`|
| SQL |2userACTIVE/đã xác minh,4token đã dùng;0cartitem/order/attempt/money,6variant khớp ledger|`auth-journey-final-state44.json`|
| Source/image |264frontend-contract-test-config khớp;387backend/43AI không đổi,10image khớp|`frontend-source-auth-journey44.json`, `runtime-image-auth-journey44.json`|
| Thu hồi hiển thị |5product/type/category STOPPED,5Store LOCKED, không có đơn pending trong tập lượt44/baseline43|`auth-journey-visibility44.json`|
| Build/contract/docs/hash/whitespace/secret |PASS;173docs,264hash khớp,gitdiff không lỗi khoảng trắng mới/3file mới sạch;1505text artifact và8token capture so trong bộ nhớ,0khớp secret|`auth-journey-acceptance44.json`, `artifact-secret-scan44.json`|

41fixture không thay hai lượt đăng ký/email thực tế, và không phải41nhiệm vụ người dùng mới. Adapter capture chạy trong stack riêng; không gọi đây là SMTP/hộp thư email thật hoặc ngân hàng thật.

## Hành trình thật1440/390

Owner/product setup dùng dữ liệu tag riêng. **Journey buyer được đăng ký và xác minh từ UI**, khác với identity seed của các lượt trước. Guest search→chi tiết→L×2→login→register. Trước xác minh, login bằng HTTP bị401. Link email capture được mở ở tab mới, mã tự điền nhưng chỉ gửi khi người dùng bấm; querytoken được gỡ khỏi URL. Xác minh200, login tại tab email; tab đăng ký nhận phiên, bấm tiếp tục về đúngL×2 và tồn vừa đọc3. Chưa có giỏ/đơn tự sinh.

Sau đăng xuất, Guest chọn lạiL×2 và đi Quên mật khẩu. Reset email mở ở tab kia; confirm mật khẩu không khớp bị chặn trước HTTP. Sau sửa, reset thành công; access token trước reset và mật khẩu cũ bị401, mã verify/reset đã dùng bị từ chối khi thử lại. Login bằng mật khẩu mới và bấm tiếp tục tại tab quên mật khẩu về đúngL×2, không tự mua.

Kiểm thêm hai entrypoint: Guest bấm thêm giỏ ở catalog→login→đúng chi tiết với lượng mặc định1 để xem/chọn; Guest vào giỏ→login→giỏ trống của tài khoản đó. Không tự thêm hàng/đặt đơn ở cả hai đường. Cookie/session giữa tab dùng cơ chế F01 hiện có; không truyền token trong tín hiệu tab.

SQL chỉ đọc cho hai buyer cuối: mỗi user1EMAIL_VERIFICATION và1PASSWORD_RESET, đều consumed trong hạn; tài khoảnACTIVE, email_verified_at có thật, version đã tăng. Các phiên trước reset không còn active; HTTP401 chứng minh token cũ bị từ chối. Schema refresh_session không cócreated_at: phép đối chiếu mốc trước reset dùng **expires_at−7ngày theo AuthService41 không đổi, riêng cho các session mới tạo trong fixture này**. Không dùng phép suy này cho dữ liệu lịch sử cóTTL không rõ. Mỗi user còn1phiên mới ở cuối hành trình.

M2 có0cart_item/0order/0checkout_attempt/0money_movement của hai buyer; M1 cóM10/L3/XL2 trên mỗi Store, reserved0 và ledger khớp. Việc quay lại chỉ đọc lại lựa chọn, không giữ hàng hay ghi giao dịch tiền.

## Lịch sử kiểm tra và giới hạn

Giữ report lỗi ban đầu44 và report run2. Một lỗi harness nhập Email trước khi route Quên mật khẩu render xong: ô Email cũ của Login nhận giá trị, form mới trống nên native validation không gửi. Đã chờ đúng heading và response reset200; không đổi app để giả email đã gửi. Build/contract/drift qua; backend/AI không đổi nên tham chiếu366unit/73SQLintegration/30Python41, không chạy lại để tăng số.

Đã kiểm1440/1024/768/390 bằng fixture: panel không tràn ngang, CTA hit-test/focus và Enter về đúng lựa chọn; đã đọc ảnh390. Chưa thiết bị vật lý/bàn phímảo/nativezoom/screenreader/người tham gia: `USER_VALIDATION_PENDING`. TTL auth-return và URL không tin cậy là fixture, không giả đã chờ30phút hoặc thử email hết hạn trên provider thật.

Token email/password/bearer không ghi vào checkpoint; nhập/mở link lỗi được che giá trị, passwordfield được xóa trước ảnh lỗi. Quét artifact so khớp secret runtime và cả token của email capture **qua stdin trong bộ nhớ**, chỉ ghi số lượng/kết quả/đường dẫn; không xuất token hoặc hash token trong SQL artifact. Hồ sơ source43 và review cũ giữ nguyên.24finding còn lại và six-chain acceptance vẫn mở.

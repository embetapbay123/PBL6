# Đợt48 — hướng dẫn mở Store, thiết lập và quyền công việc

## Phạm vi và kết luận

**UX-12 được xác minh trong phạm vi đã chốt.** Đợt này hoàn tất S01–S06/S40 về hồ sơ, thiết lập và quyền. Kết hợp bằng chứng đợt42 cho bước tiếp của đơn hàng/COD/timeline và đợt45 về quản lý nhân viên. Không dùng một ca đơn hàng để đóng toàn bộ vấn đề onboarding.

Tổng finding gốc: **31/52 VERIFIED,21chưa đóng**. F08 đủ bốn finding UX-03/UX-06/UX-12/OP-03. Các chuỗi cuối trên cùng baseline, rollback snapshot writer và finding khác vẫn mở; chưa nghiệm thu vận hành marketplace.

## Bằng chứng trước sửa và lỗi phát sinh khi xác minh

Baseline `Node47/AI47/frontend47`, giữ manifest47 và lịch sử review nguyên vẹn.

- `onboarding-baseline47.json`: ba ca HTTP fixture đều FAIL. Trang hồ sơ không có cách đọc lại quyết định khi đang mở hoặc bước cập nhật quyền để tiếp tục; tổng quan không chỉ ra thiếu địa chỉ nhận trả; nhân viên không được giải thích công việc bị ẩn và ai có thể cấp quyền. Đây là kiểm tra chuyên gia, không phải tỷ lệ khó hiểu của người dùng thật.
- `onboarding-runtime48-desktop-trial.json`: luồng thật phát hiện tổng quan tiếp tục báo thiếu địa chỉ sau khi Store đã lưu cấu hình thành công. Query settings dùng `['own-store',round]`, trong khi tổng quan vẫn giữ `['own-store']` còn mới trong cache. Không sửa test thành chờ cache hết hạn hoặc reload; đã sửa cập nhật/invalidate cache theo Store ID sau ACK.
- Kiểm tra mã menu phát hiện sản phẩm luôn hiện với SELLER, dù guide nói công việc thiếu quyền bị ẩn. Đã thêm điều kiện `product.store.read_write` cho mục sản phẩm và kiểm tra thực tế khi thu hồi quyền.

Các biểu hiện này được xử lý trong UX-12 và hồi quy F12; không tăng số finding bằng một ID mới. Lượt expanded đầu có một lỗi locator `form` khớp cả tìm kiếm/chat; đã thu hẹp đúng form, giữ nguyên kỳ vọng một POST và body bị khóa.

## Thay đổi

### Hồ sơ mở Store

`frontend/src/features/customer/StoreApplicationPage.tsx` có đường đi gửi → chờ Admin → đọc quyết định → cập nhật quyền → thiết lập Store. Nút đọc trạng thái chỉ GET; không yêu cầu đăng xuất. Sau duyệt, bước vào Store đọc context hiện hành và kiểm đúng user, OWNER, membership ACTIVE và role STORE_OWNER. Lịch sử APPROVED không tự cấp lại quyền.

Pending giải thích ai đang xử lý và ngăn gửi thêm. Hồ sơ bị từ chối giữ nguyên; nút bổ sung điền thông tin vào một hồ sơ mới, focus tên để sửa và vẫn yêu cầu người dùng xác nhận gửi. Khi POST chậm hoặc chưa rõ kết quả, khóa body và gửi mới; chỉ mở lại sau GET thành công. GET lỗi hiển thị lỗi, không giả lịch sử rỗng hoặc tự POST. Count PENDING toàn lịch sử vẫn có hiệu lực khi ở trang khác. Query/page có scope user, dùng cùng cache theo toàn bộ phiên sẵn có.

### Thiết lập và quyền

`StoreWorkGuide.tsx` tách hai việc:

- Cấu hình: thiếu địa chỉ nhận trả chặn **đơn mới**, không chặn xử lý đơn đang mở; chủ Store có đường tới settings, nhân viên được chỉ rõ cần nhờ chủ Store. Phí0 là miễn phí giao hàng, không gán thành thiếu cấu hình. Có địa chỉ chưa đồng nghĩa toàn catalog đã mua được; còn kiểm sản phẩm/phân loại/giá/trạng thái và tồn khả dụng.
- Quyền: nêu quyền từng việc và chỉ hiện đường mở việc đã được cấp; quyền COD riêng, còn cần quyền đơn để dùng danh sách. Nhân viên biết chủ Store cấp quyền; không được gán quyền Owner hoặc hoàn COD. Có nút đọc quyền hiện hành. Menu sản phẩm được lọc cùng quyền, server vẫn quyết định quyền khi gọi API.

`SellerWorkspace.tsx` cập nhật các cache own-Store có cùng ID bằng response đã xác nhận rồi invalidate khi lưu settings. Trạng thái command được giữ ở StoreSettings để ACK không mất khi form remount theo version; GET tải lại không phát lại PATCH. Settings và tổng quan dùng chung key own-Store; retry sau409/UNKNOWN chỉ refetch GET, không tăng round trước khi đọc được dữ liệu mới. Toàn bộ ô và nút lưu khóa khi gửi, khi đang đọc hoặc chưa rõ kết quả. Cache và command vẫn thuộc scope phiên, không chia sẻ sang Store/user khác.

Không thay backend, contract, migration, worker hoặc chính sách. Backend/AI giữ Node47/AI47; simulator tiền giữ Node37. Chỉ áp dụng trong stack test riêng, không deploy production hoặc commit.

## Kiểm chứng cuối

Runtime cuối: **Node47/AI47/frontend48-resilient**. Source manifest283path, parent `frontend-source-onboarding48-final.json`; bản parent và các trial được giữ lại.389file backend,43AI và10image được xác minh không đổi so với47. Không viết lại manifest cũ để làm như code chưa đổi.

| Gate | Kết quả/bằng chứng |
| --- | --- |
| Fixture trước sửa |3FAIL, `onboarding-baseline47.json`|
| Hồi quy cuối |37PASS:18onboarding/layout,8staff,6Store-context,5session; `onboarding48-resilient-regression.json`|
| Runtime1440 |PASS, `onboarding-runtime48-desktop-resilient.json`|
| Runtime390 |PASS, `onboarding-runtime48-mobile-resilient.json`|
| SQL cuối |PASS, `onboarding-final-state48-resilient.json`|
| Build |PASS; warning bundle chính >500kB còn hiện hữu|
| OpenAPI/drift |159public+14internal,7events PASS; không thay contract|
| Source/image |`frontend-source-onboarding48-resilient.json`, `runtime-image-onboarding48-resilient.json`|

Hai lượt cuối đi từ UI tài khoản → mở Store → gửi pending → đọc lý do từ chối → bổ sung → mất ACK **sau khi server thật tạo hồ sơ** → GET đối chiếu → Admin duyệt → cập nhật quyền và vào Store, không reload/đăng xuất. Mỗi lượt chỉ có hai hồ sơ (một rejected, một approved), một Store và một lần gửi lại chủ động; không có POST lặp do mất ACK.

Sau đó tạo dữ liệu sản phẩm/stock/buyer bằng HTTP test, quote bị409 `STORE_RETURN_ADDRESS_REQUIRED`. Owner đi theo đường UI để lưu địa chỉ nhận trả; quay về tổng quan thấy cấu hình mới ngay. Quote sau đó đúng100000đ, phí giao0; không confirm đơn. Trên mobile, response PATCH cấu hình bị503 sau commit thật: UI khóa gửi, thử lại chỉ GET, dữ liệu mới tới tổng quan mà không PATCH lần hai. Desktop dùng ACK thành công; fixture kiểm thêm PATCH chậm và GET phục hồi lỗi. Nhân viên ở browser context độc lập thấy quyền sản phẩm, được thu hồi hết → cấp riêng kho → khóa membership. Người này đọc lại quyền từ UI, menu/action đúng; quyền kho đọc được metadata sản phẩm, cuối cùng không còn portal sau khi bị khóa. Admin quyết định và Owner thay quyền trong hành trình này dùng HTTP thật; không tuyên bố đã test lại toàn màn Admin bằng UI.

SQL xác nhận hai Store cuối LOCKED/version2, hai lần cấu hình version0→1 có audit đúng Owner; bốn hồ sơ version1 và decided_at, hai rejected/two approved. Mỗi membership nhân viên LOCKED/version3, quyền kho được giữ trong lịch sử nhưng không cấp quyền hiện hành sau khóa. Hai sản phẩm STOPPED, mỗi variant quantity2/reserved0 khớp ledger.0đơn/0money movement. Cả bảy Store của trial và final đều LOCKED, bảy product/type/category được dừng trong cleanup có tag; không xóa hoặc sửa lại đơn, audit, movement.

## Thiết bị, bằng chứng và giới hạn

- Form có tên/contact/lý do dài được kiểm1440/1024/768/390: không tràn ngang, nút gửi hit-test được, Tab từ contact tới nút gửi; ảnh `application-*.png` nằm trong report cuối. Đây là một ca layout chạy nhiều viewport, không phải bốn nhiệm vụ mới.
- Đã xem ảnh form390 và tổng quan/quyền390/1440. Ảnh full-page có thể chứa header/dock sticky tại vị trí cuộn lúc chụp; kiểm hit-test nút dùng viewport thật của Edge.
- Mobile là viewport Edge. Không thiết bị thật, bàn phím ảo, native zoom, screen reader hoặc nghiên cứu người dùng; **USER_VALIDATION_PENDING**. Không bịa tỷ lệ thành công hoặc số click/thời gian nhiệm vụ.
- Identity được provision có tag và verified trong DB; không dùng lượt này thay nghiệm thu đăng ký/email thật của đợt44. Mất ACK là lỗi phản hồi chủ động sau commit thật, không sửa response fixture để giả đã tạo dữ liệu.
- 374unit và9Python contract của47 là bằng chứng kế thừa trên backend/AI không đổi, không báo đã chạy mới ở48. Hồi quy browser37ca và SQL đọc lại là bằng chứng mới.
- Bằng chứng đơn/COD/timeline của42 và UI quản lý nhân viên45 giữ nguyên baseline riêng. Nghiệm thu sáu chuỗi trên baseline chung thuộc F18, chưa được thay bằng hai hành trình onboarding không tạo đơn này.

Gate tổng hợp ở `onboarding-acceptance48.json`. Tiếp theo ưu tiên phạm vi báo cáo tiền/lịch sử và voucher còn mở, rồi các gói còn lại; không thu hẹp mục tiêu52finding/F00–F18/sáu chuỗi.

# Seller UI/UX: trạng thái thực hiện

Đối chiếu báo cáo Seller trong yêu cầu với mã tại baseline `69ef8ae` và thay đổi hiện tại. Đây là bản làm việc, không phải xác nhận đã triển khai lên server.

| Nhóm | Đã xử lý | Còn lại / giới hạn |
|---|---|---|
| Đơn hàng | Tab trạng thái; ảnh catalog hiện tại có nhãn; thông tin và thao tác chia hai cột; phần hủy tách riêng. | Ảnh chỉ có khi catalog công khai trả ảnh, không phải ảnh snapshot lịch sử. Tab không giả số đếm. |
| Chat | Tìm tên/email trong Store trước phân trang; số chưa đọc theo mốc tin; lưu trữ/mở lại, tin mới tự đưa về hộp hoạt động; huy hiệu nav. | Chưa có widget thu/mở Seller toàn cục và tên sản phẩm trong preview danh sách. Migration 014 cần áp dụng trước backend mới. Tin cũ được xem là đã đọc vì trước đây không có dữ liệu đọc. |
| Đổi trả | Lọc trạng thái phía server; tổng chờ xét duyệt; làm mới trên đầu; ảnh hiện tại nếu có; yêu cầu từ chối không hiển thị như còn bước xử lý; ẩn lỗi kỹ thuật với Seller. | Chưa có thống kê hạn xử lý hôm nay vì chưa có hạn đó trong nghiệp vụ. |
| Giao thất bại | Ảnh hiện tại nếu có; làm mới ở đầu; nhãn trạng thái và giao diện mục chi tiết. | Chưa bổ sung tổng hồ sơ theo trạng thái trên toàn Store; chưa tổ chức lại toàn bộ form kiểm hàng. |
| Voucher | Nhãn trạng thái màu; vùng thử giảm nổi bật. Form hiện đã có grid và preview trước thay đổi. | Chưa làm lại toàn bộ bảng, card voucher và từng thông báo lỗi. |
| Store | Sửa riêng tên, phí, địa chỉ; nhãn trạng thái; cảnh báo thiếu địa chỉ. | Chưa thêm avatar/banner vì cần dữ liệu và upload phù hợp. |
| Nhân viên | Avatar chữ, chip quyền, trạng thái và thẻ lời mời, mô tả nhóm quyền. | Chưa đổi bố cục form mời và empty state. Khóa thao tác khi mutation chưa rõ được giữ để tránh đổi ngữ cảnh trong lúc ghi. |
| Tổng quan | Số đơn và đổi trả chờ từ API; hướng dẫn thu gọn, cảnh báo địa chỉ vẫn hiển thị. | Không vẽ sparkline khi không có chuỗi dữ liệu tương ứng. |
| Báo cáo | Đã có tiêu đề và breadcrumb trong giao diện hiện tại. | Không thêm tiêu đề trùng. |
| Kho | Tab active, ảnh catalog hiện tại nếu có, cảnh báo dưới 5, giải thích số tồn; sắp xếp tên/số khả dụng phía server trước phân trang. | Ảnh sản phẩm chưa công khai có thể không hiện; chưa làm lại trình bày cột lịch sử. |

Không chạy kiểm tra mobile theo yêu cầu. Thay đổi chat phụ thuộc migration; không reset database và chưa triển khai lên demo trong lượt này. Kết quả fixture browser không thay cho kiểm thử toàn stack; kiểm thử transaction chat với PostgreSQL QA riêng đã rollback dữ liệu sau kiểm tra.

## Kiểm tra gần nhất

- OpenAPI check và contract drift: đạt. Backend build đạt; frontend build được chạy lại sau các sửa cuối.
- Browser fixture desktop: 47/49 đạt trong lượt `artifacts/seller-review/final-desktop`. Hai ca Customer/Seller quay lại trang đơn sau khi danh sách thay đổi thất bại do còn tổng cũ; ca Customer chạy lại với khoảng chờ sau điều hướng đạt. Chưa xác định triệt để cạnh tranh điều hướng/tải dữ liệu, chưa coi là đã sửa.
- Hộp thư: hai ca fixture desktop lưu trữ/mở lại và phục hồi khi mất phản hồi đạt trong `artifacts/seller-review/inbox-fixed`. Transaction PostgreSQL QA kiểm tra phạm vi Store, mốc đã đọc, tin mới, archive, retry và rollback đạt trong `artifacts/seller-review/qa-chat-transaction.json`. Đây không phải kiểm thử gateway/provider thật.
- Migration chat chỉ áp dụng trên database QA riêng. Runtime demo chưa được cập nhật hoặc kiểm tra sau migration; không reset dữ liệu demo.
- Chạy riêng nhóm phân trang sau đó: cả ba vai trò có thể gặp cùng triệu chứng khi điều hướng rất nhanh (`artifacts/seller-review/orders-recheck`). Cần tiếp tục xử lý và chạy lại trước khi triển khai.
- Frontend và backend build cuối đều đạt; Vite cảnh báo một bundle vượt 500 kB.

## Cập nhật tiếp theo

- Hộp thư Seller đã có launcher thu nhỏ tại các trang Seller khác; có thể tiếp tục bản nháp sau khi mở lại. Ba ca browser `seller-inbox` đạt, bao gồm bảo toàn bản nháp.
- Tổng hồ sơ hoàn về chưa đóng và chờ kiểm được tính ở backend trước phân trang và theo Store. Đối chiếu bằng service code hiện tại với PostgreSQL QA: hai hồ sơ tạm, trang chỉ một dòng, lọc đơn và Store khác đều đạt; transaction được rollback (`artifacts/seller-review/qa-delivery-summary.json`). Không phải bằng chứng gateway thật.
- Tóm tắt đổi trả có bước tiếp theo theo trạng thái; form kiểm hàng gom các số lượng theo dòng; Seller không thấy mã lỗi kỹ thuật. Voucher có thẻ xem trước và cột điều kiện ngắn hơn; nhân viên có empty state và mô tả preset; lịch sử kho tách số tồn và số giữ. Tên Store có thể sửa riêng; test xác nhận PATCH chỉ chứa tên và version.
- 30 ca browser Seller đạt ở `continuation-desktop`, 17 ca đổi trả/chat đạt ở `returns-compact`; 21 unit backend đạt. Ba ca phân trang đạt khi test đợi xác nhận điều hướng sang trang chủ trước khi Back (`orders-stable`); lỗi cũ có nguyên nhân cạnh tranh thao tác của test, không khẳng định đã sửa mã phân trang.
- Chưa hoàn thành toàn bộ: ảnh Store/banner và tên sản phẩm trong preview chat chưa có dữ liệu phù hợp; cần tiếp tục đối chiếu UI Seller theo từng case và xác minh đầy đủ trên runtime thật. Không bịa số liệu theo ngày hay đồ thị khi không có dữ liệu.

## Cập nhật nhận diện Store và ngữ cảnh chat

- API Store trả `logo_url` đã có trong database nếu được cấu hình; giao diện dùng logo hoặc chữ cái đại diện khi chưa có. Chưa có tải ảnh/banner trong UI.
- Sidebar hội thoại hiện hiển thị mã đơn gần nhất được gắn trực tiếp vào tin nhắn. Tin nhắn hiện chưa lưu sản phẩm khách đang hỏi, nên không tự suy tên sản phẩm. Thời gian và nội dung cuối đã được hiển thị.
- Build frontend/backend, OpenAPI và drift đạt sau thay đổi contract. Năm ca desktop cho hộp thư, sửa Store và logo đạt (`artifacts/seller-review/identity-context`). Transaction chat QA được chạy lại và rollback. Không kiểm tra mobile hoặc triển khai server demo.

## Cập nhật chỉnh ảnh đại diện

Owner có thể cập nhật hoặc gỡ ảnh đại diện bằng URL HTTP(S), theo cùng phương thức nhập URL ảnh sản phẩm đang có. Backend kiểm URL, version, quyền Owner và ghi nhận việc thay đổi; PATCH chỉ gửi trường ảnh khi sửa riêng. Browser fixture desktop kiểm tra hiển thị ảnh và cập nhật độc lập; unit test kiểm tra URL, quyền/phiên bản qua luồng hiện có và cách gỡ ảnh. Chưa có tải file hoặc banner. Build và contract check/drift đạt; chưa triển khai server demo.

## Cập nhật ngữ cảnh sản phẩm trong chat

- Từ chi tiết sản phẩm, khách nhận bản nháp có tên và đường dẫn sản phẩm; khách có thể sửa và phải tự gửi. Nếu đã có bản nháp hoặc lệnh gửi đang chờ, hệ thống giữ nguyên và thông báo. Sidebar Seller hiển thị tên sản phẩm được khách gửi gần nhất với nhãn “Khách nhắc sản phẩm”; đây là nội dung khách nhập, không phải xác nhận catalog.
- Hai ca browser bản nháp mới/cũ đạt (`artifacts/seller-review/product-draft-final`); bộ chat trước đó 12 ca đạt (`product-context-desktop`). PostgreSQL QA đã kiểm tra trích tên sản phẩm cùng phạm vi, unread và archive trong transaction rollback (`qa-chat-transaction.json`). Contract check/drift và backend build đạt. Chưa có bằng chứng gateway/runtime demo cho bản thay đổi.

## Kiểm tra gateway QA mới

Ngày 03/11/2026, image `pbl6-node:seller-review-qa` chạy trên m1/m2/m3 của stack riêng `pbl6-fe-verify`; worker/provider giữ cấu hình trước. Frontend source hiện tại chạy cổng 3109, gateway 18080. Migration 014 đã áp dụng trước trên QA; không áp vào demo.

Test `frontend/tests/seller-review-runtime.spec.ts` tạo user và Store có tag riêng, kiểm qua gateway: Owner cập nhật/đọc logo, Customer không được sửa Store, đọc endpoint kho sắp xếp/đổi trả/hoàn về, gửi tin có tên sản phẩm, tìm khách, unread, đánh dấu đọc và lưu trữ; UI Seller mở danh sách lưu trữ và hiển thị sản phẩm khách nhắc. Store thử được khóa trong `finally`. Test đạt tại `artifacts/seller-review/runtime-gateway-final` và `runtime-screen`. Các endpoint kho/đổi trả/hoàn về được kiểm với tập rỗng, không chứng minh lọc hoặc tổng hợp nhiều trang. Ảnh desktop 1440 của hộp thư đã được xem; không kiểm tra mobile.

Lượt đầu dùng cổng 3112 bị backend từ chối Origin; ảnh và error-context chứa thông tin đăng nhập QA tạm đã được xóa. Lượt cuối dùng 3109 và đạt. Không suy rộng kết quả này thành toàn bộ UI/API hoặc nghiệm thu production.

## Sửa nhanh theo bản review gửi lại 03/11/2026

Bản gửi lại cùng nội dung với báo cáo Seller trước. Bổ sung: form mời nhân viên mở theo nút, tự focus email và có thể thu gọn; phân trang nhân viên/lời mời dùng nav và trạng thái disabled trực tiếp thay fieldset; nút làm mới đổi trả/hoàn về sticky khi cuộn. Làm mới yêu cầu đồng thời đọc lại số chờ duyệt, tránh giữ tổng cũ. Build frontend đạt. Không kiểm mobile theo yêu cầu; không có thay đổi backend/migration trong lượt sửa nhanh này.
Kiểm tra lượt sửa nhanh: 14 ca đổi trả/hoàn về đạt; 8 ca staff-recovery đạt sau cập nhật test mở form bằng nút mới (`artifacts/seller-review/quick-staff-final`). Lượt đầu có một test chưa mở form thu gọn nên không tìm thấy email; không thay kỳ vọng khóa dữ liệu, chỉ thêm đúng bước mở form. Tổng 22 ca liên quan đã đạt, frontend build đạt.

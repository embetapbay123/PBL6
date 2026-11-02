# UI/UX vòng 3 — sửa cho bản demo desktop

Ngày: 2026-11-03. Baseline: `fdb7c0c`. Nguồn: attachment `de6c1b1c-c0ec-4a9d-891c-b9f287337c1d`, “UI/UX Review — Round 3”. Theo yêu cầu mới, **không kiểm tra mobile**. Quy trình nhanh: chỉ build/triển khai web và kiểm tra các hành vi desktop bị ảnh hưởng; không reset DB, backup/restore thử, build backend/worker hoặc chạy toàn bộ suite.

## 26 ưu tiên trong review

| # | Đối chiếu / xử lý |
| --- | --- |
| 1 | Profile và cấu hình Store mặc định là bản đọc có nhãn; Chỉnh sửa mở form, Lưu/Hủy rõ ràng. Email hiện dưới dạng thông tin, không dùng ô nhập disabled để giả khả năng sửa. Địa chỉ mặc định chỉ hiện danh sách, mở form khi Thêm/Sửa. Voucher đã dùng drawer từ lượt trước. |
| 2 | Store audit vốn chỉ gọi và hiển thị một source mỗi lần. Đổi chọn nguồn thành nhóm nút hiển thị rõ; không coi số dòng source là độ dài trang. |
| 3 | ReviewModeration dùng StarRating thật. Sửa cả quyết định kiểm duyệt sang modal có lý do, version và đọc lại khi xung đột. |
| 4 | `App.tsx` được main.tsx tải qua `LegacyDemo` chỉ khi DEV + `?mode=mock`; production chạy LiveApp. Không thay alert/mock mailbox bên trong demo cũ rồi nhận là đã sửa luồng production. Ghi phạm vi riêng, không khôi phục UI cũ. |
| 5 | Các biến thể thu gọn bằng details/summary có màu/cỡ, SKU, giá và trạng thái. Trường chỉnh chỉ hiện khi mở dòng; bản nháp vẫn giữ khi chuyển phần. Gửi đủ danh sách như contract hiện hành. Lỗi HTML validation tự mở dòng cần sửa. |
| 6 | ProductModeration mặc định chỉ hiển thị ngữ cảnh; Ẩn/Bỏ ẩn mở dialog lý do. Không tự mở bán khi bỏ ẩn; giữ expected_version, khóa khi chưa rõ kết quả. |
| 7 | Chọn taxonomy chỉ xem dữ liệu. Tạo/Sửa thuộc tính là thao tác tường minh trong modal; hỗ trợ bỏ nháp. Danh sách allowed_values có Thêm/Xóa từng mục, tối đa 100; mã cũ chỉ đọc và có giải thích. |
| 8 | Bell đọc unread từ API thông báo, chia cache/invalidation với trang thông báo; không dựng số. |
| 9 | PasswordField dùng chung cho đăng nhập/đăng ký, có Hiện/Ẩn giữ nguyên giá trị và disabled khi đang gửi. |
| 10 | Format các source admin/auth/variant/returns/ProductEdit được nêu, không đổi framework hoặc thêm thư viện. |
| 11 | Quận/huyện **đã có** ở AddressPage và StoreSettings bên cạnh AddressSuggestions. Không thêm lại hoặc di trú schema địa chỉ trong lượt UI này. Gợi ý tỉnh/phường không tự ghi đè địa chỉ lịch sử. |
| 12 | Admin audit chia bộ lọc thường/nâng cao, tra người bằng tên/email và Store bằng tên trên endpoint quản trị hiện có. Cho phép nhập UUID chính xác; target_id có hướng dẫn lấy từ tài nguyên gốc. Xóa tất cả filter và đổi nguồn giữ tab audit, xóa field/page liên quan. |
| 13 | Directory mã người/Owner thu vào details, nhãn đối chiếu ngắn; UUID đầy đủ vẫn đọc được khi cần. Empty state phân biệt chưa có dữ liệu và không khớp filter. |
| 14 | Contract review không trả reviewer_user_id/name/avatar. Giữ không bịa danh tính hay lấy từ order_item_id; bổ sung danh tính reviewer cần contract riêng và lựa chọn quyền/riêng tư. Chưa thêm trong lượt frontend. |
| 15 | Đóng bản nháp từ chối Store dùng useConfirm + Modal, giữ lại nội dung nếu chọn Quay lại. Không cho đóng trong khi quyết định đang gửi hoặc chưa rõ kết quả. |
| 16 | Đăng ký thành công dẫn sang xác thực, có thông báo kiểm tra email; xác thực xong dẫn sang đăng nhập với kết quả rõ ràng. Không thay thông báo thành đăng ký thành công khi server báo lỗi. |
| 17 | Hồ sơ hoàn về thu gọn theo đơn, mở để kiểm/đối chiếu. Có tổng thực nhận/tổng đặt, bán lại, hỏng, chờ xử lý từ chính các dòng nhập; không tự coi hàng về bán lại được. Tiến trình bốn bước phản ánh trạng thái server. |
| 18 | Menu tài khoản gọn còn các công việc thường dùng và Đăng xuất; lời mời/cài đặt/đổi mật khẩu đi qua trung tâm tài khoản/sidebar. |
| 19 | Mock mailbox chỉ thuộc legacy DEV như mục 4, không phải footer production. |
| 20 | VoucherPicker có nút đóng ở header sticky, luôn có lối thoát dù danh sách dài. |
| 21 | CatalogCard hiển thị review_summary khi count > 0, dùng số liệu server và StarRating chung. Không tạo sao/số đánh giá cho sản phẩm chưa có. |
| 22 | Admin/Store audit dùng nhóm nút chọn nguồn, aria-pressed theo nguồn hiện tại. Dùng navigation, không gắn role tablist khi chưa xây đủ tab/panel keyboard semantics. |
| 23 | Ảnh kiểm duyệt giới hạn 96×96, object-fit contain; không giãn ảnh theo kích thước gốc. |
| 24 | Form đăng ký: Email → Mật khẩu → tên hiển thị; autocomplete và nhãn truy cập rõ. Gợi ý độ dài ghi đúng giới hạn, không gọi thước độ dài là chứng nhận mật khẩu mạnh. |
| 25 | Hạn voucher rút gọn HH:mm + DD/MM/YYYY, không hiện giây. |
| 26 | Cập nhật polling hoàn về thành “Tạm dừng cập nhật tự động. Bấm Làm mới hồ sơ để xem tiến trình mới nhất.”; vẫn giữ GET hữu hạn, không tự gửi lại command. |

## Các chỉnh sửa cấu trúc kèm theo

- ProductEdit chia bốn phần (thông tin, thuộc tính, biến thể/giá, ảnh) và link kho đúng sản phẩm. Các editor được giữ mounted/ẩn để bảo toàn draft; không tháo component khi đổi phần. Link trong hướng dẫn mở đúng phần đang ẩn. Hướng dẫn sẵn sàng bán được thu gọn để không đẩy form xuống dưới màn.
- Staff đã có hai vùng nhân viên/lời mời và sửa quyền trong modal. Kho đã có bốn khu vực URL từ vòng trước; không xây thêm accordion theo sản phẩm vào bảng kho variant đang phân trang.
- StarRating đã có trong ProductReviews; ToastProvider đã mount trong LiveApp. Các nhận xét cần verify này được xác nhận bằng source, không đếm là bug mới.
- Tìm kiếm/đăng nhập/checkout và form tạo mới không cần trạng thái “xem trước” giả; không chuyển toàn bộ input thành edit-toggle. Không tự thêm avatar/provider hoặc quy tắc kinh doanh.

## Kiểm tra

Bằng chứng nằm ở `artifacts/ui-round3/`. Chỉ Edge desktop 1440×900; không chạy viewport mobile, thiết bị thật hay screen reader. Ca UI dùng HTTP fixture để kiểm payload, bản nháp, version, khóa gửi và đồng bộ trạng thái; không coi fixture là API/DB/provider thật. Domain demo được kiểm riêng sau khi thay web.

Kiểm tập trung: Profile xem/sửa/hủy/lưu; Store xem/sửa/hủy/version; địa chỉ mở/hủy; giữ SKU qua phần editor; kiểm duyệt sản phẩm/review bằng dialog; xung đột version; taxonomy xem/sửa/list lựa chọn; audit lookup/reset/source; tổng kiểm hàng; badge thật từ API; password visibility/đăng ký/xác thực; giữ lý do duyệt Store khi lỗi hoặc bỏ đóng.

Kết quả trước triển khai: **20/20 ca desktop PASS** (`final-desktop/.last-run.json`), gồm 17 ca vòng 3 và 3 ca hồi quy duyệt Store. Build TypeScript/Vite thành công; không tuyên bố toàn bộ suite cũ hoặc provider thật đã được kiểm lại. Không có thay đổi contract/backend/migration.

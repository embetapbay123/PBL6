# Seller workspace: bố cục gọn và bảng có điều khiển

Ngày 03/11/2026. Thực hiện theo yêu cầu mới về độ dài trang và thao tác bảng; chỉ kiểm desktop.

- Tổng quan: ô công việc nhấn được toàn bộ, thông tin vận hành một hàng, hướng dẫn trong hai mục đóng/mở.
- Bảng Seller: vùng cuộn tối đa 460px/52vh, đầu cột cố định, phân trang ngoài vùng cuộn, hàng gọn và highlight khi rê chuột. CSS chỉ áp dụng trong Seller shell.
- Catalog: tab tất cả/đang bán/nháp/dừng; cột tên và giá có nút sắp xếp toàn Store trước phân trang. Nút xem ở ngay mỗi dòng; chi tiết có bảng phân loại/SKU/giá/trạng thái. Editor có tiêu đề rõ và các mục điều hướng cố định.
- Kho: tab còn hàng/sắp hết 1–4/hết; sắp xếp tên và lượng khả dụng từ tiêu đề cột. Có liên kết tới sản phẩm, chỉnh sửa theo quyền, biến động và tồn hiện tại. Lịch sử có lọc ngày; đối chiếu và hàng đã trừ dùng cùng vùng bảng gọn.
- Đơn: khối lọc chia search và điều kiện, sửa tab trạng thái bị lặp. Cột nhận diện sắp xếp ngày tạo, cột phải trả sắp xếp số tiền; giữ bộ lọc và trở về trang 1 khi đổi sort.
- Báo cáo: bảng tổng hợp, bảng thu/hoàn theo kỳ và giao dịch; chia Tổng hợp/Thu hoàn/Giao dịch/Khoản chưa rõ ngày để không xếp dọc toàn bộ nội dung. Có đường đối chiếu và CSV, định nghĩa tiền không thay đổi.

Backend dùng danh sách sort cho phép; không ghép trực tiếp sort tùy ý vào SQL. Giá catalog dùng mức giá thấp nhất của các phân loại trong bản quản lý; đơn dùng payable_vnd. Các sort có khóa ID phụ để ổn định giữa các trang.

Kiểm tra: build frontend/backend và contract check/drift đạt. 27 ca hồi quy ban đầu đạt; sau chia báo cáo, 10 ca báo cáo đã cập nhật thao tác chuyển mục và đạt. Ba ca giao diện density và ca sắp xếp đơn đạt. Ba unit backend về phạm vi/sort/phân trang đạt. PostgreSQL QA kiểm 5 sản phẩm, trang 2/size 2, giá và tên đúng thứ tự; rollback dữ liệu thử. Ảnh ở artifacts/seller-density, không phải thử thiết bị thật. Không kiểm mobile theo yêu cầu.

Bộ lọc ngày lịch sử kho đã được kiểm với kỳ 01–02/11/2026, API nhận từ 31/10 17:00Z đến trước 02/11 17:00Z; lọc có thể bỏ và giới hạn kỳ tối đa 366 ngày. Lượt báo cáo chia mục cuối 10/10 đạt; ca sort đơn và 3 ca visual cuối đạt.

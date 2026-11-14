# Tiến độ thực hiện plan bug.docx

Cập nhật ngày 15/11/2026. Worktree thực hiện: `C:/PBL6/artifacts/bug-docx-plan`, nhánh `codex/bug-docx-follow-through`. Tách từ `6c364af` để giữ nguyên WIP ví của workspace chính.

| Đợt | Trạng thái | Kết quả |
|---|---|---|
| 0. Baseline và đối chiếu | Đã khởi tạo | Dùng bảng B01–B33 của plan; chụp bản public trước sửa. Chưa tuyên bố nghiệm thu lại mọi nhóm trong tài liệu gốc. |
| 1. Hoàn thiện UI/copy | Đã triển khai, có bằng chứng UI | Chi tiết bên dưới. |
| 2. Voucher tốt nhất | Đang thực hiện | Bộ tối ưu và phép tính VND dùng chung có test; chưa có API/FE và chưa deploy BE cho phần này. |
| 3. Tìm hội thoại | Đang thực hiện | Đối chiếu query/phân quyền M3/M4 và FE; chưa triển khai. |
| 4. Media chat | Chưa thực hiện | Upload, quyền truy cập, lưu trữ, adapter AI. |
| 5. Nội dung gian hàng | Chưa thực hiện | CMS banner/campaign và nguồn nhóm sản phẩm. |
| 6. Nghiệm thu toàn bộ | Chưa hoàn tất | Có kiểm tra và triển khai riêng từng đợt; không tính là đã đóng cả 33 nhóm. |

## Đợt 1

- **B03:** tên phân loại nằm dưới tên sản phẩm, bấm để đổi ngay tại dòng. Mở bằng bàn phím, focus vào select, Escape/Hủy trả focus. Giữ số lượng khi đổi; lỗi hợp lệ giữ lựa chọn để thử lại. Khi chưa xác nhận xóa dòng cũ thì giữ cảnh báo và chặn thao tác tiếp để đọc lại giỏ.
- **B14:** bỏ milestone vận chuyển lặp với trạng thái card; giữ số lượng cạnh giá và tổng quantity trong tổng thanh toán. Đổi “Xem Shop” thành “Xem gian hàng”. Không đổi số tiền/snapshot đơn.
- **B15:** các tác vụ mua hàng chính ở nhóm đầu; Tin nhắn/Thông báo/Đổi trả/lời mời/mở gian hàng ở nhóm mở rộng trong trung tâm tài khoản và sidebar. Sidebar có thao tác Escape, không mất đường truy cập. Component thanh tài khoản cũ đang bị layout ẩn không được tính là bằng chứng menu mới đã hoạt động.
- **B16:** địa chỉ dài xuống dòng đúng; nhóm hành động có badge mặc định bên phải; Xóa nền đỏ/chữ trắng. Giữ nguyên xác nhận xóa và hành vi BE.
- **B18:** bỏ tiêu đề “Tài khoản của bạn” lặp trong dropdown đã đăng nhập; bỏ link ví chưa có route trong bản release an toàn.
- **B24/B26/B27:** bỏ link Giỏ hàng thừa cuối trang sản phẩm; bỏ số đếm lớn trên trang khám phá, giữ số kết quả nhỏ khi lọc; sort tên có nhãn “Mặc định”, không giả là thuật toán liên quan.
- **B32:** bỏ lời nhắc thông thường đã trùng trạng thái/timeline; giữ thông báo chờ thanh toán, đang tạo/đối soát/chưa rõ tiền. Địa chỉ nhận hàng không lặp hai heading.
- **B09/B29:** áp dụng phương án đề xuất trong plan khi bắt đầu triển khai: thanh phụ mặc định chỉ ở Home, không lặp Tin nhắn ở thanh đó. Header/dock vẫn có chat; mobile vẫn mở menu khi người dùng chủ động bấm hamburger. Đây là lựa chọn triển khai theo đề xuất, không ghi thành một câu trả lời xác nhận riêng của người dùng.
- Hồi quy **B02/B11/B17/B19/B20/B21/B22/B25/B30/B33** qua các ca có sẵn; các mục không sửa giữ bằng chứng baseline, không tự nâng thành chứng nhận mọi nghiệp vụ BE.

## Kiểm tra và mức bằng chứng

- Build `npm --prefix frontend run build`: qua. Cảnh báo chunk lớn đã có từ baseline.
- 10 ca mới về đổi phân loại, lỗi/chưa rõ kết quả, menu, số kết quả, chi tiết đơn và layout 320/390/768/1366 px: qua trên production preview. Có ảnh địa chỉ và editor.
- Bộ 53 ca gồm 43 hồi quy và 10 ca mới: lượt đầu 52 qua; một assertion sort bắt DOM cũ trước request mới. Sửa thành `expect.poll` chờ query sort; ba ca sort/gợi ý chạy hai lần liên tiếp đều qua. Không quy race của bộ kiểm thử thành lỗi ứng dụng.
- Sau tinh chỉnh chiều cao menu và placeholder hẹp, năm ca menu/layout chạy lại qua.
- Public: chụp trước/sau, đăng nhập Customer A qua demo login, chỉ đọc Home/tìm kiếm/tài khoản/địa chỉ/đơn/giỏ. Không sửa giỏ, địa chỉ hoặc đơn sẵn có. Có thu hồi session kiểm thử.
- Lượt public đầu sau deploy có `net::ERR_NETWORK_CHANGED` tại lần mở Home; ba nhóm sau qua, không page error hay 429/5xx. Chạy lại riêng Home qua. Không xóa dấu vết lượt lỗi mạng; không coi đó là bốn nhóm qua trong cùng một lượt chạy.
- Mười ca UI dùng API fixtures để kiểm tra tương tác và trạng thái lỗi. Lượt public không intercept API. Luồng đổi phân loại mới chưa tạo thao tác ghi trên demo trong đợt này; không coi UI fixture là nghiệm thu transaction BE.
- Deploy bằng script bắt buộc từ worktree an toàn, chỉ thay `web`; public smoke kết thúc **DEPLOY_OK**. Không rollout M2, không migration và không gọi AI trả phí.

Chứng cứ đặt tại `C:/PBL6/outputs/bug-ui-phase1-2026-11-14/`: `before/results.json`, `after/results.json`, `after-home-recheck/results.json`, `local-ui-results.json`, `final-layout-results.json` và ảnh. Các file này là evidence local, không chứa token đăng nhập trong kết quả và không đưa lên Git.

## Bước đang làm

Đợt 2 đã hoàn tất; xem [báo cáo voucher](bug-docx-vouchers-2026-11-15.md). Đang thực hiện đợt 3: tìm hội thoại Customer và phiên AI trên dữ liệu sở hữu, trước phân trang, không gọi model để tìm kiếm. Media chat và nội dung gian hàng vẫn chưa triển khai.

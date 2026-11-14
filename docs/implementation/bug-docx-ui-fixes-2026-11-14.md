# Kết quả sửa lỗi UI UX từ bug.docx

Ngày: 14/11/2026. Đã triển khai frontend và M4 lên https://demo.congnguyen.me, sau đó chạy kiểm tra bản public.

Cập nhật nghiệm thu E2E: đã kiểm tra thêm bằng UI/API/DB demo thật. Năm nhóm nghiệp vụ đạt, F10 tái hiện và phát hiện F11 về request/rate limit; xem [biên bản nghiệm thu bổ sung](bug-docx-acceptance-2026-11-14.md). Không coi kết quả test mô phỏng dưới đây là nghiệm thu toàn bộ.

Đối chiếu với [báo cáo trước khi sửa](bug-docx-ui-ux-audit-2026-11-14.md). Đợt này xử lý chín lỗi đã tái hiện/kiểm chứng F01–F09 cùng các vấn đề trình bày liên quan. Không đồng nghĩa với hoàn tất cả 33 nhóm góp ý trong tài liệu gốc.

## Các thay đổi

| Mã | Kết quả sau sửa | Kiểm chứng |
| --- | --- | --- |
| F01 | Thanh tổng giỏ có layout riêng trên mobile, giá không tách dòng, CTA nằm trong viewport. Ẩn nút chat nổi trùng với dock tại luồng mua trên mobile. | Hit-test tâm nút Thanh toán tại 320/390/768/1366 px; bấm tới checkout. 390 px kiểm tra lại trên public. |
| F02 | Xóa nhiều dòng tuần tự với một khóa chung; không bỏ qua các dòng sau. Lỗi một phần dừng đúng chỗ; mất xác nhận yêu cầu đọc lại trước khi tiếp tục. | Xóa ba dòng, nhấn hai lần, mất ACK ở dòng thứ hai rồi đọc lại và chỉ xóa dòng còn lại. Public kiểm tra ba dòng. |
| F03 | Bỏ lời hứa miễn phí cố định. Hiển thị Tạm tính theo số sản phẩm, giữ lưu ý phí/ưu đãi xác nhận ở checkout. Thiếu giá hoặc dữ liệu sản phẩm thì chặn thanh toán. | Kiểm tra text, tổng số lượng và trạng thái thiếu metadata. |
| F04 | Bỏ composer ảnh/video đang nhét base64 vào content. Chat chỉ gửi văn bản tối đa 2.000 ký tự; thông báo khả năng này ở composer. | Kiểm tra không có nút/file input gửi ảnh và gửi câu hỏi hợp lệ. Không thay đổi tính năng thử đồ AI. |
| F05 | Xóa phiên/toàn bộ lịch sử AI thật ở server, có xác nhận. Xóa toàn bộ áp dụng cho mọi trang; lỗi giữ nguyên dữ liệu đang hiển thị. | UI fixture 25 phiên, tab mới, xóa riêng, lỗi xóa. Backend PostgreSQL kiểm tra ownership, phân quyền, dữ liệu con, quota và chống tái xuất hiện khi lưu muộn. |
| F06 | Khóa cộng tại tồn khả dụng; chặn nhập số lẻ/vượt tồn; đơn đã vượt tồn không được checkout. Hiển thị Chỉ còn N sản phẩm khi tồn từ 1 đến 3. HTTP 409 tải lại tồn. | Kiểm thử tồn 2, số đang chọn 3, giảm về 2, nhập 5/1.5 và không gửi request sai. |
| F07 | Đổi mật khẩu dùng chung điều hướng tài khoản. | Kiểm tra sidebar trên route đổi mật khẩu. |
| F08 | Bỏ SKU khỏi giỏ, sản phẩm và trình bày đơn của Customer; giữ tên phân loại. Seller/Admin vẫn có SKU. | Kiểm tra SKU nội bộ không xuất hiện ở các màn Customer đã sửa. |
| F09 | Nút mở và thẻ voucher dùng native button, trạng thái chọn có aria-pressed, đóng dialog trả focus về nút mở. | Chọn và áp dụng chỉ bằng bàn phím, chạy lại trên public. |

Các chỉnh sửa liên quan: bỏ badge Yêu thích hardcode trong giỏ/đơn; đổi Shopee Voucher thành Mã giảm giá; tổng đơn đếm số đơn vị sản phẩm; số lượng nằm cùng vùng giá; tab Đổi trả cùng kiểu điều hướng trạng thái, mobile cuộn ngang; thông báo mobile đưa CTA xuống dưới để nội dung đủ rộng.

## Backend xóa lịch sử

- `DELETE /api/v1/me/chat/sessions/{id}`: xóa phiên thuộc người đang đăng nhập; ID không tồn tại/không thuộc sở hữu trả 404.
- `DELETE /api/v1/me/chat/sessions`: xóa toàn bộ phiên của người đang đăng nhập, trả `deleted_count`.
- Chỉ CUSTOMER được gọi; không đăng nhập trả 401, sai vai trò trả 403, UUID sai trả 422.
- Xóa message và session trong một transaction với khóa hàng session; luồng lưu phản hồi muộn bị 409, không khôi phục phiên đã xóa. Không xóa sổ quota, không gọi provider. Không cần migration mới.
- Contract OpenAPI, registry, DTO và types của các client đã được tái sinh.

## Kiểm tra và triển khai

- `npm --prefix frontend run build`: qua. Có cảnh báo kích thước chunk hiện hữu.
- `npm run build:backend`, `npm run contracts:check`, `npm run contracts:drift`: qua.
- Bộ test M4: **217 qua**, gồm ba test mới về xóa lịch sử bằng PostgreSQL và HTTP auth.
- Playwright local: **20 qua** (16 test lỗi được báo + 4 test chat workspace). Bộ hồi quy thử đồ AI: **14 qua**.
- Playwright trên bundle public: **5 qua**: cart 390 px, bulk delete, bàn phím voucher, xóa phiên rồi mở tab mới, thông báo mobile.
- Backend M4 public đã đối chiếu SHA-256 của chat runtime với nguồn local; hai operation xóa có trong registry; readiness 200. Hai DELETE public chưa đăng nhập đều trả 401.
- Frontend deploy script kết thúc `DEPLOY_OK`. Sau rollout M4 đã bật lại cấu hình gen ảnh riêng: password mode bật, ngân sách 1 USD/ngày và 10 USD/tháng, operator báo configured=true, paused=false, readiness đạt. Không ghi key/hash vào báo cáo.
- Không gọi gen ảnh trả phí hoặc tạo giao dịch demo thật trong đợt kiểm tra. Các thao tác UI dùng API fixtures; kiểm tra nghiệp vụ xóa thật chạy trên schema PostgreSQL cô lập. Không coi fixture UI là bằng chứng thao tác ghi production.

Bằng chứng nằm tại `outputs/bug-ui-fixes-2026-11-14/`, log rollout frontend tại `outputs/bug-ui-fixes-web-deploy.log`, log kích hoạt AI tại `outputs/bug-ui-fixes-ai-activation.log`, log public UI tại `outputs/bug-ui-fixes-public-tests.log`.

## Phạm vi còn lại

- Upload ảnh/video trong chat cần thiết kế endpoint media, giới hạn file, quyền truy cập và hợp đồng attachment; hiện đã bỏ khả năng gửi chưa được hỗ trợ.
- F10 về sort Store là phát hiện từ code, chưa được mô phỏng đối chứng Store hơn 20 sản phẩm trong báo cáo ban đầu; chưa sửa ở đợt F01–F09 này. Sort toàn gian hàng cần query backend có phân trang ổn định.
- Campaign/banner/nhóm sản phẩm Store là tính năng mới. Các góp ý thiết kế hoặc điều hướng mâu thuẫn B09/B29 chưa được coi là lỗi đã đóng.

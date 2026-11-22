# Tiến độ thực hiện plan bug.docx

Cập nhật ngày 22/11/2026. Worktree thực hiện: `C:/PBL6/artifacts/bug-docx-plan`, nhánh `codex/bug-docx-follow-through`. Tách từ `6c364af` để giữ nguyên WIP ví của workspace chính.

**Debian2:** đã chuyển và nghiệm thu các đợt 1–5 trên nền wallet/nhãn hủy đơn hiện hành. M3 có migration 015, M4 có 010–012; chat Store/AI media đã bật và qua public thật. Đợt 6 đã qua hồi quy UI, sort 25 sản phẩm và tranh tồn cuối; B33 đã qua public cuối sau CSS, web `DEPLOY_OK`. [Báo cáo chuyển máy](bug-debian2-reconciliation-2026-11-22.md). [Bảng 33 nhóm](bug-docx-final-acceptance-2026-11-22.md).

| Đợt | Trạng thái | Kết quả |
|---|---|---|
| 0. Baseline và đối chiếu | Hoàn tất | Đã đối chiếu B01–B33 và ghi bằng chứng mới trên Debian2; xem báo cáo nghiệm thu cuối để phân biệt UI fixture, public và giới hạn CI. |
| 1. Hoàn thiện UI/copy | Đã triển khai, có bằng chứng UI | Chi tiết bên dưới. |
| 2. Voucher tốt nhất | Đã triển khai và nghiệm thu | B01: 447 unit, 28 PostgreSQL integration, 22 UI và public quote/đơn COD qua. [Chi tiết](bug-docx-vouchers-2026-11-15.md). |
| 3. Tìm hội thoại | Đã triển khai và nghiệm thu | M3/M4 + FE, public 25 hội thoại/25 phiên và xóa theo sở hữu qua. [Chi tiết](bug-docx-chat-search-2026-11-15.md). |
| 4. Media chat | Đã triển khai và nghiệm thu Store + AI | [Chat gian hàng](bug-docx-store-chat-media-2026-11-15.md); [AI đọc ảnh/frame thật, budget chung và public playback](bug-docx-ai-chat-media-2026-11-15.md). |
| 5. Nội dung gian hàng | Đã triển khai và nghiệm thu trên máy mới | B28: 455 unit, 11 PostgreSQL/FFmpeg, 9 UI, 4 nhóm public và 8 ca layout/link trên hai shop demo qua. [Chi tiết CMS](bug-docx-storefront-2026-11-21.md). |
| 6. Nghiệm thu toàn bộ | Hoàn tất trong phạm vi B01–B33 | 42 UI + 12 UI sau sửa tab + tám nhóm biên qua. Public cuối bốn nhóm: sort 25 sản phẩm, đổi tồn, race COD và tab/điều hướng 320/390/1366 px; cleanup qua. Bảng đủ B01–B33 ghi rõ mức bằng chứng và giới hạn. |

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

Các đợt 1–5 hiện đã triển khai và nghiệm thu lại trên Debian2. Giữ cấu hình model gen ảnh và hạn mức chung 1 USD/ngày, 10 USD/tháng; không gọi gen ảnh trong nghiệm thu này. Hai call OpenAI phân tích ảnh/frame có tổng debit bảo thủ 0,000838 USD. Web cuối sau sửa tab đã DEPLOY_OK; public đo tab/điều hướng và cleanup đều qua, đợt 6 đã hoàn tất trong phạm vi 33 nhóm. Xem bảng 33 nhóm để phân biệt UI fixture với giao dịch BE thật; không coi đây là nghiệm thu lại WIP ví/QR.

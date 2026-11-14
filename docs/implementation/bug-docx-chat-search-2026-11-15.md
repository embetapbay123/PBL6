# B10/B11 — Tìm hội thoại và lịch sử AI

Ngày 15/11/2026. Đợt 3, nhánh `codex/bug-docx-follow-through`.

## Đã thực hiện

- CUSTOMER M3 tìm theo tên gian hàng hoặc nội dung bất kỳ trong các hội thoại thuộc chính khách. STORE tìm tên/email khách hoặc nội dung thuộc Store hiện hành, giữ quyền membership và tách đang hoạt động/đã lưu trữ. Áp điều kiện trước count/phân trang; dùng chuẩn hóa tiếng Việt hiện có, escape `%`, `_`, `\` như ký tự thường.
- M4 tìm nội dung tin đã lưu trong các phiên còn hạn lưu của chính khách. Trả tiêu đề từ tin USER đầu, đã rút và che dữ liệu theo quy tắc hiện có. Không gọi model để tìm kiếm hoặc tạo tiêu đề. Chọn một session_id để đọc lịch sử độc lập với bộ lọc danh sách, vẫn kiểm tra sở hữu.
- FE có nhãn, debounce 300ms, hủy request cũ, reset trang, xóa lọc, rỗng/lỗi/thử lại. Hội thoại trang đầy đủ giữ q/page trên URL; widget giữ bộ lọc riêng. Từ khóa phiên AI lưu trong sessionStorage theo user; đổi tài khoản remount panel để không giữ lịch sử tài khoản trước.
- Tìm lịch sử AI dùng được trên mobile qua nút Lịch sử; chọn phiên chuyển về nội dung, có nút quay lại và focus. Xóa một phiên/xóa toàn bộ vẫn là xóa thật; nút toàn bộ nói rõ phạm vi tài khoản, kể cả đang lọc.
- Rà hồi quy sửa thêm: nút Thử gửi sau mất ACK được phép gửi lại đúng payload/client_message_id đã đóng băng, còn textarea bị khóa. Compact Chat của đơn có tên truy cập Nhắn tin và hiện lỗi đối chiếu ngữ cảnh. Cookie test không còn gắn cứng một port khác.
- Header tìm sản phẩm chỉ lấy q từ route catalog, không hiển thị nhầm từ khóa hội thoại. Ô tìm trong sidebar có đủ chiều rộng.
- Khi xóa lịch sử bị từ chối/lỗi, thông báo hiện ngay trong danh sách mobile. Đọc lại lịch sử chỉ GET; không tự gửi thêm lệnh xóa.

## Kiểm tra

- Build FE/BE, OpenAPI và drift qua; không thêm operation (198 public, 15 internal).
- 21 test Node mục messaging/contracts qua. Python local 163 qua/61 bỏ qua do thiếu PostgreSQL/Redis; không tính phần bỏ qua là đã nghiệm thu.
- Candidate M3: 2 integration test PostgreSQL thật trong schema riêng qua; có 25 hội thoại, tên/nội dung có dấu/không dấu, ký tự LIKE, quyền khách/Store, lịch sử cũ hơn trang đầu và archive.
- Candidate M4: 7 test qua, gồm 6 ca chuẩn hóa/contract và 1 PostgreSQL thật với 25 phiên, nội dung từ tin sau, quyền sở hữu, xóa rồi tìm không xuất hiện lại; không thêm request/trace model hay reset budget. Các schema được xóa sau test.
- Production preview: 25 ca chat/launcher/order chat qua; sau chỉnh bố cục/header, 35 ca gồm 10 hồi quy UI đợt 1 qua. Sau sửa hiển thị lỗi xóa, 5 ca tìm/xóa chạy lại trên production preview qua, có ca DELETE429 nhưng GET đọc lại không gửi DELETE thứ hai.
- Có ảnh desktop/mobile và kiểm tra input AI đủ rộng. Những lần đầu phát hiện test cookie sai port, lỗi khóa retry và nhãn compact; đã sửa và chạy lại bộ 25 qua. Không bỏ các ca thất bại để lấy tỷ lệ đẹp.

## Triển khai và public

- `deploy-demo-chat-search.ps1`/`.sh`: so hash source M3/M4 đang chạy với baseline đã review; pg_dump hai DB đang dùng và xác minh pg_restore list; test candidate trước thay dịch vụ; có rollback ảnh; giữ toàn bộ env/API key/budget đang chạy. Không migration public và không flush Redis. Kết thúc **CHAT_SEARCH_DEPLOY_OK**.
- Mỗi bản FE hoàn chỉnh đều build trước rồi chạy `deploy-demo-web.ps1`. Bản cuối public smoke **DEPLOY_OK**, ngày 15/11/2026 lúc 01:58 +07.
- Nghiệm thu public không intercept: 3 danh tính fixture riêng, 25 Store/hội thoại của khách và 25 phiên AI, có dữ liệu của khách khác để kiểm tra cách ly. Tìm trước phân trang bằng dấu/không dấu và `%`/`_`; đọc chéo 404; STORE thấy đúng nội dung của chính shop.
- UI desktop 1366/mobile390: tìm từ trang2 về trang1, reload giữ từ khóa, mở lịch sử mobile, xóa kết quả đang lọc, xóa toàn bộ 24 phiên còn lại, phiên của khách khác vẫn còn. **0 page error, 0 HTTP error, 0 đường POST gọi model** trong lượt nghiệm thu cuối.
- Lượt trước đã quan sát 429 vì harness dồn bulk API + UI quá nhanh. Giữ nguyên rate limit; tách cửa sổ dựng fixture/đọc API với thao tác UI, thêm nghỉ 11 giây. Không tự retry lệnh xóa. Ca này dẫn tới sửa lỗi hiển thị lỗi mobile nói trên. Một lượt setup khác lỗi SSH; cleanup theo UUID/tag qua; không coi đó là lỗi ứng dụng.
- Lượt đầu thu hồi phiên khi browser vẫn polling gây401 trong cleanup; harness đã đóng browser trước thu hồi, lượt cuối không còn401. Giữ các log đầu trong evidence.
- Đã xóa rows chat fixture, khóa Store/danh tính và thu hồi refresh sessions. Xác nhận schema test không còn. Không gửi tin đến người dùng khác; nội dung mẫu được dựng riêng trong những danh tính do đợt kiểm thử kiểm soát.

Evidence local: `C:/PBL6/outputs/bug-chat-search-phase3-2026-11-15/`: `results.json`, ảnh public; `final-layout-cases/`, `final-delete-error-cases/` và các lượt đầu lưu riêng. Không đưa evidence private hoặc credential lên Git.

Đã hoàn thiện phần tìm kiếm/xóa của B10 và giữ các thao tác B11. **Media chat của B10 còn ở đợt4**, không gộp thành đã hoàn tất toàn bộ B10.

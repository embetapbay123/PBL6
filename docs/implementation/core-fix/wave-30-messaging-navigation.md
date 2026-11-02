# Đợt 56 — Chat theo đơn, thông báo, ảnh và điều hướng

**F16 đã VERIFIED trong phạm vi sửa và hành vi desktop đã chốt: CR-005/009, UX-07/18/20. Tổng 45/52 finding gốc VERIFIED, 7 còn mở.** Tác động định hướng của UX-20 đối với người dùng thật vẫn `USER_VALIDATION_PENDING`; không chuyển nghiên cứu chưa làm thành PASS. Mobile được người dùng miễn. F00/F18, sáu chuỗi cuối và rollback snapshot writer vẫn mở.

Runtime riêng `Node56/AI56/frontend56`, gateway18080/frontend3109. HEAD giữ `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree; manifest54/55 và hồ sơ review cũ không bị ghi đè. Không commit hoặc triển khai production.

## Ba lỗi bổ sung đã sửa

### CF-056-01 · P2 · CONFIRMED → FIXED/VERIFIED — Widget giữ trang của hội thoại khác

Khi đang xem trang tin thứ hai của Store A, đóng chat rồi đi bằng menu/đơn hàng tới Store B và mở liên hệ, widget dùng page2 cho hội thoại B chỉ có một tin. UI báo chưa có tin dù lịch sử tồn tại. Không phát hiện gửi sang sai participant.

Baseline `messaging-widget-baseline55.json` tái hiện đường SPA này. Lượt đầu `messaging-baseline55.json` dùng page.goto giữa hai Store nên remount và không tái hiện nhánh widget; giữ bằng chứng, không gọi PASS đó là phủ được SPA. `MessagesPage` đã có key theo ID từ trước, vì vậy lỗi không được suy rộng thành mọi chuyển trang đầy đủ.

Sửa `frontend/src/chat/ConversationWorkspace.tsx`: trang tin gắn scope+conversation ID. Mở hội thoại mới dùng trang1; quay lại có trạng thái riêng, không phát GET nhầm page. Trang lịch sử cũ không polling/focus-refetch để tránh tự dịch offset lúc đọc; người dùng chủ động về trang mới nhất bằng phân trang. Danh sách hội thoại vẫn polling theo cơ chế visibility của query client. Regression có hai Store, GET page thực nhận và lịch sử đang đọc.

### CF-056-02 · P2 · CONFIRMED → FIXED/VERIFIED — Mất mã đối chiếu sau retry gặp Store khóa

Tin đã commit nhưng phản hồi mất; Store bị khóa trước retry. Service cũ kiểm ACTIVE trước lookup message key, trả409. UI sau đó bỏ pending/body/key dù chưa biết lần đầu đã ghi chưa, cho phép một lần gửi mới thay cho đối chiếu cũ.

`messaging-sql-baseline55.json` chạy hai test mới trên image54 cũ, với schema M2/M3 tạm: lookup nhãn thiếu và replay sau khóa FAIL. `messaging-baseline55.json` chứng minh UI mở lại textarea sau409 ở retry chưa rõ kết quả.

Sửa `backend/identity-store-service/src/messaging/messaging.service.ts`: vẫn khóa hội thoại và kiểm quyền participant hiện hành trước lookup. Key đã ghi với đúng sender/content/order trả đúng message cũ; không cập nhật last activity hoặc INSERT. Key mới vào Store khóa vẫn409; key cũ khác nội dung409; Customer/Store khác404; nhân viên thiếu quyền403. Order reference vẫn phải qua M2 đúng quyền hiện hành. Sửa `frontend/src/chat/ChatProvider.tsx`: lần gửi đã UNKNOWN giữ pending/body/key qua lỗi retry; lần gửi mới bị từ chối chắc chắn vẫn cho sửa nội dung.

Runtime thật giữ hai POST cùng body/client_message_id, một message ID; Store đang khóa vẫn đọc lại được message của Customer đã tham gia, nhưng không nhận tin mới. Không mở lại quyền Owner/nhân viên đã bị khóa hoặc thu hồi.

### CF-056-03 · P2 · CONFIRMED → FIXED/VERIFIED — Vùng tin bị ép khi có tham chiếu đơn

Lượt runtime đầu qua kiểm tra DOM nhưng ảnh `messaging-operations-runtime56-trial/.../order-chat-desktop.png` cho thấy vùng lịch sử gần như bị ép hết bởi tham chiếu đơn/form. Có đường mở trang Tin nhắn đầy đủ để vòng tránh; không chấm lỗi tiền hoặc vượt quyền từ ảnh này.

Sửa `frontend/src/live/commerce.css` và `ConversationWorkspace.tsx`: vùng lịch sử không bị co dưới160px, bubble không bị flex-shrink; phần bao có thể cuộn khi thông tin dài. Log có điểm focus bàn phím. Tin mới tự theo cuối khi đang đọc cuối; nếu người dùng đã cuộn lên thì giữ vị trí và draft, có nút tới tin mới, không cướp focus. Với tin dài hơn cửa sổ chat, người dùng vẫn cuộn để đọc; có đường mở workspace đầy đủ.

Lượt `messaging-operations-runtime56-final.json` bổ sung clientHeight160 và **tin trả lời thực sự nằm trong viewport**. Không dùng chỉ toContainText làm bằng chứng hiển thị. Ảnh cuối đã xem; SQL trước sửa layout giữ ở `messaging-final-state56-prelayout.json`.

## Contract và danh tính của cuộc trao đổi

Lịch sử có optional `conversation`, cùng schema nhãn Store/customer đã có ở danh sách; do query đúng hội thoại được authorize trả về. Mở link sâu ngoài20 hội thoại đầu vẫn nhận diện được đối tượng, không dò hoặc tải toàn bộ danh sách. Chỉ thêm nhãn hiện tại, ID, thời gian; không thêm email, số điện thoại, địa chỉ, raw actor hoặc quyền Admin đọc chat.

Client kiểm conversation_id và ID metadata phải khớp ID đã yêu cầu; response lệch thành lỗi và không cho gửi. Dữ liệu cũ không có field mới dùng nhãn từ danh sách hoặc ngữ cảnh đã mở. Contract optional tương thích reader; không thêm endpoint, migration hoặc enum. AI reader56 được bật và kiểm trước Node writer56. Public typings frontend/backend khớp; internal typings mới sinh bằng nội dung hiện hành, không sửa quyền file khi Windows từ chối lần ghi dư thừa.

## Bằng chứng cuối

Các artifact thuộc `artifacts/core-fix/fix-20261030T100153Z/`:

| Lớp kiểm chứng | Kết quả |
|---|---|
| `backend-unit-messaging56.json` | 374 PASS / 51 suite |
| `messaging-sql56.json` | 10 PASS trên schema M2/M3 tạm; transport identity được kiểm soát, SQL thực |
| `ai-contracts56.xml` | 9 PASS trên AI56 đã bật |
| `messaging-ui56-final.json` | 32 PASS desktop, 2 SKIPPED mobile theo cờ yêu cầu; không tính32 assertion/screenshot thành nhiệm vụ review |
| `messaging-operations-runtime56-final.json` | PASS hành trình thật hai Store, Customer–Owner–SELLER và quyền hiện hành |
| `messaging-final-state56.json` | SQL độc lập PASS, hậu kiểm cả hai lượt runtime |
| `image-source-match-56.json`, `ai-image-source-match56.json`, `frontend-source-messaging56.json`, `runtime-image-messaging56.json` | 395 backend /43 AI /314 frontend-contract-test-config /10 image khớp |

Frontend/backend build PASS; frontend2075 module, cảnh báo main chunk lớn có trước vẫn giữ. OpenAPI139 public path/14 internal path; generator/drift159 public+14 internal DTO,7 event. Không migration; reader cần được giữ tương thích khi tắt writer/UI mới, không có DDL rollback ở đợt này. Simulator tiền vẫn image37, không nhận đó là đã kiểm lại provider hoặc sáu chuỗi cuối.

### Walkthrough thật

Customer có hai đơn PENDING ở hai Store. Từ lịch sử mở Hủy đơn ở hash #cancel, reason nhận focus/ở viewport nhưng chưa hủy. Từ đơn A mở chat A có22 tin API thật, sang trang2 và nhập draft. Đóng → chọn đơn B qua UI → mở B: trang1 đúng một tin B, không có draft A. Nhập draft B rồi quay A: giữ riêng draft và order reference A.

Gửi tin A bằng double activation: chỉ một POST đang chạy. Tool mất ACK sau commit và khóa Store; thu nhỏ/mở lại → retry cùng ID/body → trả đúng message đã ghi. Customer khác/Store khác không đọc được. Owner của Store khóa bị403, không được lấy replay làm cách vượt quyền. Sau mở Store, Owner đi qua Kênh người bán → Tin nhắn → trang2 → hội thoại A. Workspace quay danh sách về trang1 nhưng heading vẫn đúng khách nhờ metadata hội thoại độc lập; trả lời gắn đúng đơn A. Customer nhận bằng polling, đọc được tin trong vùng log thực.

SELLER chỉ có quyền đơn mở cùng hội thoại. Owner thu quyền khi textarea đang mở; gửi nhận403, context cập nhật, không tự replay hoặc ghi tin của nhân viên. Customer quay B vẫn có draft B chưa gửi.

Từ header Thông báo, Customer đọc đúng sự kiện đơn A; API đánh dấu lại cùng ID200, Customer B404. Unread giảm đúng1. Link mở đúng đơn A. Mở sản phẩm từ đơn: nguồn ảnh lỗi được báo rõ, ảnh2 HTTP thực giải mã được, retry ảnh1 vẫn báo lỗi; CTA mua không bị chat che. Không giả cả hai đơn đã thanh toán.

Để kiểm danh sách vượt trang đầu, mỗi lượt có **21 identity không đăng nhập và21 conversation đọc mẫu**, được seed riêng có tag; không sinh message từ SQL và không gọi đó là21 cuộc trao đổi vận hành thật.25 message còn lại đều qua handler thật, gồm23 tin chuẩn bị,1 tin Customer mất ACK và1 tin Owner trả lời.

### Hậu điều kiện và cleanup

Lượt cuối:25 message, chỉ một row cho client_message_id mất ACK; mọi order_id khớp Store và Customer của thread. Không có tin của Customer B hoặc nhân viên sau thu quyền. Notification read đúng một row ở đúng Customer/đơn, retry không nhân đôi.

Cả hai lượt:4 Store LOCKED,4 product/type/category STOPPED;4 đơn CANCELLED, từng đơn một consume1/restock1,4 variant quantity10/reserved0 và ledger10/0.50 message API được giữ,42 conversation reader fixture không có message; không money journal/refund, không thu hoặc hoàn tiền giả. Giữ lịch sử; không chỉnh tiền/tồn để làm test qua.

## Mapping các finding gốc và giới hạn

| Finding | Phần xác minh |
|---|---|
| CR-005 | Bằng chứng mobile cũ31 giữ lịch sử; mobile mới được miễn. Desktop launcher/CTA hit-test thật56 qua. Không ghi mobile hiện tại đã PASS. |
| CR-009 | Desktop fixture đợi dữ liệu cho #cancel/#returns/#order-items/#reviews, Back/Forward; runtime thật #cancel từ lịch sử qua UI. Không nhận runtime này đã mua/hoàn tất/đánh giá toàn chuỗi. |
| UX-07 | Đơn→đúng Store/thread/reference, Customer–Owner reply, paging, draft, quyền bị thu hồi, UNKNOWN; không tự gửi khi mở. |
| UX-18 | Ảnh1 lỗi/ảnh2 tốt, mọi ảnh lỗi, retry và đổi sản phẩm khi URL cũ chậm qua fixture; nguồn lỗi/tốt HTTP thật qua runtime. Không tự yêu cầu zoom ảnh mới. |
| UX-20 | Heading/focus sau route, skip link, hash, Back/Forward, không cướp focus khi nhập/polling qua desktop. Tác động với người tham gia và screen reader giữ USER_VALIDATION_PENDING. |

Hidden-document fixture dùng visibility event + đồng hồ kiểm thử để xác nhận polling dừng/đọc lại, không phải bằng chứng thiết bị vật lý/tab nền của mọi trình duyệt. Hai phiên thực dùng Edge automation độc lập. Không báo screen reader, bàn phím ảo, zoom native hoặc nghiên cứu với người thật đã PASS.

Giữ các báo cáo lỗi harness: route mock chưa khớp query/path con, visibility event không bubble tới Window, SQL verifier đọc permissions sai cột thay vì membership_permission. Sửa harness đúng cơ chế hiện hành, không nới quyền hoặc thay kỳ vọng hành vi sai thành đúng. Giữ32PASS/2mobileSKIPPED là kết quả cuối, không cộng các lượt chạy lặp.

F07/UX-09, F13/CR-003/004/015/019 và F17/CR-021/UX-10 còn mở. F18 chưa đạt; không kết luận sẵn sàng vận hành từ việc đóng F16.

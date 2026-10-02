# Đặc tả yêu cầu phần mềm PBL6 — 2.1 Draft

**Hệ thống:** marketplace nhiều Store có chatbot tư vấn và gợi ý sản phẩm. **Trạng thái:** thiết kế để nhóm rà soát, chưa nghiệm thu. Bản nguồn ở [legacy](legacy/srs.md); quyết định hiện hành ở [scope](scope.md) và [decision log](decisions.md). Mã chi tiết của 98 FR và 28 NFR được quản lý trong [danh mục yêu cầu](functional-requirements.md), không lặp toàn văn ở đây.

## 1. Mục đích và bối cảnh

SRS mô tả hệ thống phải làm gì, ai sử dụng và cách đánh giá kết quả. Người đọc bắt đầu tại đây, sau đó xem [Use Case](use-cases.md) để biết luồng tương tác, [Business Rules](business-rules.md) để biết điều kiện, [ERD](data-dictionary.md) cho dữ liệu và [API](api-spec.md) cho contract. Thuật ngữ và ngoài phạm vi ở [scope](scope.md).

Một Customer có thể mua hàng của nhiều Store trong cùng giỏ. Khi xác nhận, hệ thống tạo **một Order cho mỗi Store**. Mỗi Order có phương thức SANDBOX hoặc COD, Payment và trạng thái riêng; Customer trả các Order sandbox ở thời điểm tùy chọn trong hạn. Các Order cùng lần mua chỉ chia sẻ `purchase_group_id` để nhóm trên giao diện. Checkout là **quy trình**, không có bảng Purchase/CheckoutSession lưu lịch sử; lịch sử nằm ở Order và OrderItem.

## 2. Người dùng và ranh giới

| Actor | Mục tiêu | Giao diện |
| --- | --- | --- |
| Guest | Xem hàng, chat cơ bản, đăng ký/đăng nhập | Web/Mobile |
| Customer | Giỏ, đặt hàng, trả từng Order, theo dõi/hủy, đánh giá, đăng ký Store | Web/Mobile; mở Store trên Web |
| Seller | Quản lý sản phẩm, kho và xử lý đơn theo quyền Store | Portal |
| Store Owner | Quyền Seller, thêm quản lý Store, nhân viên, voucher, báo cáo | Portal |
| Administrator | Duyệt Store, quản trị và kiểm duyệt toàn sàn | Portal |

Một User có thể vừa mua hàng vừa là Seller/Owner của tối đa một Store đang hoạt động. Actor trên hình Use Case là ngữ cảnh tương tác, không phải một `role` cố định trong JWT. Backend xác minh User, membership và quyền hiện hành ở mỗi request; xem [RBAC](rbac.md). Gateway sandbox và LLM là hệ thống ngoài; giao hàng/COD là mô phỏng trong MVP.

## 3. Phạm vi chức năng

| Nhóm | Kết quả hệ thống phải cung cấp | Tham chiếu |
| --- | --- | --- |
| Tài khoản | Đăng ký/xác minh email, đăng nhập/đăng xuất, đặt lại/đổi mật khẩu, hồ sơ/địa chỉ; khóa User chặn request mới. | FR-AUTH-*, FR-PROFILE-*, FR-ADDR-*; UC-AUTH-* |
| Khám phá | Duyệt Category/Store, tìm/lọc theo thuộc tính động, xem Product/Variant và giá hiện hành. | FR-CAT-*, FR-SEARCH-*, FR-PROD-*; UC Discovery |
| Giỏ/đặt hàng | Chọn CartItem nhiều Store, một địa chỉ, phương thức theo Store, voucher Store/toàn sàn; xem quote rồi tạo nguyên tập Order. | FR-CART-*, FR-CHECKOUT-*; UC-CHECKOUT-* |
| Thanh toán/sau mua | Trả sandbox theo Order hoặc COD; xem Order/Payment/Refund tách biệt; hủy từng Order khi còn cho phép. | FR-PAY-*, FR-ORDER-*; UC-PAY-*, UC-ORDER-* |
| Store/vận hành | Customer nộp đơn Store, Admin duyệt/từ chối; Owner mời Seller, cấp quyền, voucher, báo cáo; Seller xử lý hàng/kho/đơn. | FR-STORE-*, FR-MPROD-*, FR-INV-*, FR-SORDER-* |
| Đánh giá | Customer đánh giá OrderItem của Order Completed; một Review/item; Admin ẩn/hiện lại có lý do. | FR-REV-*; UC-REV-* |
| AI | Chat RAG dựa Product còn hiệu lực; cá nhân hóa khi có consent; recommendation có baseline, model offline và fallback. | FR-AI-*, FR-REC-*; UC-CHAT-*, UC-REC-* |

Các màn cụ thể nằm ở [UI flow](ui-flows.md); luồng chính, ngoại lệ và hậu điều kiện nằm trong [đặc tả Use Case](use-cases.md).

## 4. Quy tắc quyết định hành vi

1. Khi xác nhận giỏ, hệ thống tính lại giá Variant, trạng thái Store/Product, tồn, voucher và phí. Có thay đổi thì trả quote mới để Customer xem lại; không tạo Order một phần (BR-01/02/18/21).
2. Mỗi Order chụp Product, SKU, thuộc tính, địa chỉ, giá, phí và giảm giá. Voucher Store áp trước voucher sàn; giảm sàn phân bổ cố định xuống Order. Hủy/hết hạn một Order không tính lại Order khác (BR-27–31).
3. Tồn khả dụng = tồn vật lý − tồn đã giữ. Reserve/consume/release/hoàn kho có operation ID; retry tạo Order cùng key/payload trả kết quả cũ, khác payload bị từ chối (BR-10/19/41).
4. COD tạo Order trước khi thu tiền. Sandbox thanh toán riêng Order; Payment Success nhưng consume lỗi đưa chính Order đó vào RECOVERING, không thu thêm. Callback Success sau EXPIRED/release tạo Refund riêng, không mở lại Order (BR-17/21–23/40).
5. Customer hoặc Seller/Owner hủy Order khi trạng thái cho phép; Seller/Owner ghi lý do. Đơn đã trả online tạo Refund bằng số tiền Order thực trả. Trạng thái Order và Refund độc lập (BR-24–26/39).
6. Store bị khóa ngăn bán mới/công khai nhưng Order cũ vẫn xử lý theo quyền. AI phải kiểm tra Product/Store và giá hiện hành, không trả thông tin cũ từ embedding (BR-13/34/38).

Điều kiện đầy đủ và các chuyển trạng thái ở [Business Rules](business-rules.md) và [State Transitions](state-transitions.md).

## 5. Giao diện ngoài và dữ liệu

- **Client:** Web/Mobile/Portal dùng cùng quy tắc. Mobile MVP chỉ có luồng Customer. Danh sách có phân trang, trạng thái chờ/rỗng/lỗi; ẩn nút vượt quyền trên UI không thay việc backend kiểm tra.
- **API:** REST/JSON qua Gateway, JWT, UUID, UTC và tiền nguyên VND. [OpenAPI](contracts/openapi.json) là contract thiết kế; mã lỗi và callback ở [API spec](api-spec.md).
- **Tích hợp:** gateway sandbox gửi callback xác thực/chống lặp; LLM chỉ nhận ngữ cảnh Product cần thiết. Demo dùng mock mailbox; không có payment, email hoặc shipping production.
- **Dữ liệu:** M1 sở hữu catalog/kho/review; M2 giỏ/Order/Payment/voucher; M3 identity/Store/RBAC; M4 chat/hành vi/model. Không có FK vật lý xuyên database. Order giữ snapshot; quote/idempotency là dữ liệu kỹ thuật có TTL. Xem [kiến trúc](architecture.md) và [từ điển dữ liệu](data-dictionary.md).

## 6. Yêu cầu phi chức năng và đánh giá

| Mục tiêu | Điều kiện | Bằng chứng cần có |
| --- | --- | --- |
| Hiệu năng | API thông thường mục tiêu <2 giây; với ≥100 người dùng đồng thời, ≥95% request <2 giây; chat RAG mục tiêu <4 giây theo điều kiện test MVP. | NFR-PERF-01/02/03; báo cáo tải ghi dữ liệu, môi trường và percentile |
| Bảo mật/quyền | BCrypt, JWT có hạn/revoke, HTTPS, validate/rate limit; User và Store được kiểm tra hiện hành, không lộ dữ liệu chéo. | NFR-SEC-01–10, NFR-ISO-01; test quyền/khóa/token |
| Riêng tư | Không ghi secret/PII không cần thiết vào log/prompt; chỉ cá nhân hóa khi có consent. | NFR-PRIV-01/02; test prompt/log/consent |
| Nhất quán | Không tạo trùng Order/Payment hay bán vượt tồn; command, callback và Refund retry không tác động lặp. | NFR-REL-01/02/04, NFR-MONEY-01; test cạnh tranh/đối soát |
| Kiến trúc | M1–M4 không đọc DB của nhau; danh sách phân trang, chỉ mục cho truy vấn; API có OpenAPI. | NFR-ARCH-01, NFR-DATA-01, NFR-API-01, NFR-PERF-04/05 |
| AI | RAG grounded; recommendation so model với baseline trên cùng split và metric Top-K; fallback được báo rõ. | NFR-AI-01/02; [kế hoạch đánh giá](ai-evaluation.md) |

Đây là **mục tiêu thiết kế**, chưa phải kết quả đo. Điều kiện test chi tiết ở [Test Plan](test-plan.md) và [tiêu chí từng FR/NFR](requirements-acceptance.md).

## 7. Nghiệm thu MVP và ngoài phạm vi

Demo phải chứng minh: mua hai Store tạo đúng hai Order; COD của A xử lý độc lập khi sandbox B còn chờ; callback lặp/muộn và phục hồi lỗi; voucher/tiền từng Order khớp; hủy A không đổi B; quyền Store/Customer không truy cập chéo; AI không hiển thị Product ẩn hoặc giá cũ; recommendation có model, baseline, fallback và báo cáo trung thực. Kịch bản và mã TC ở [Test Plan](test-plan.md), quan hệ FR–UC–API–TC ở [traceability](traceability.md).

MVP không có settlement, payout, wallet, đổi trả sau Processing, hãng vận chuyển/cổng thanh toán production, huấn luyện LLM, ảnh/video Review hoặc Mobile quản trị. Danh sách đầy đủ ở [scope](scope.md). Mọi thay đổi phạm vi phải ghi ADR và cập nhật FR/BR/UC/ERD/API/TC chịu ảnh hưởng. Tài liệu giữ trạng thái Draft cho đến khi có review và kiểm chứng.

# Quy tắc nghiệp vụ — 2.1 Draft

Các mã BR-01–41 được giữ để truy vết; nội dung thanh toán/đơn được cập nhật theo quyết định trả tiền riêng từng Order. Checkout là bước xác nhận giỏ, không phải entity nghiệp vụ. [Test Plan](test-plan.md) ghi kịch bản kiểm tra.

| Mã | Quy tắc | Test |
| --- | --- | --- |
| BR-01 | Giỏ chứa nhiều Store; một lần xác nhận chọn item của một hoặc nhiều Store. | TC-CHK-01 |
| BR-02 | Mỗi Order thuộc đúng một Store; unique (purchase_group_id, store_id). purchase_group_id là UUID liên kết, không có bảng Purchase. | TC-CHK-01 |
| BR-03 | Mỗi User có tối đa một StoreMembership hoạt động; mỗi Store có đúng một Owner hoạt động. | TC-ACC-02 |
| BR-04 | Seller/Owner chỉ thao tác Store của membership hiệu lực; backend kiểm tra quyền. | TC-SEC-01 |
| BR-05 | Customer chỉ truy cập địa chỉ, giỏ, Order, Payment, chat và đánh giá của chính mình. | TC-SEC-02 |
| BR-06 | Owner có quyền Seller và quyền quản lý Store, nhân viên, voucher, báo cáo Store. | TC-SEC-01 |
| BR-07 | Seller xem tiền Order để xử lý nhưng không xem báo cáo tổng, voucher hoặc phân quyền. | TC-SEC-01 |
| BR-08 | Product thuộc một ProductType; thuộc tính khớp kiểu và điều kiện bắt buộc. | TC-CAT-01 |
| BR-09 | Product bán được có Variant/SKU, kể cả mặc định; DRAFT/STOPPED → ACTIVE cần Store/SKU/giá hợp lệ và moderation VISIBLE. | TC-CAT-02 |
| BR-10 | available = quantity − reserved_quantity; 0 ≤ reserved_quantity ≤ quantity; mọi command kho có operation ID chống lặp. | TC-INV-01 |
| BR-11 | Gợi ý liên quan xét Category, ProductType, gần giá, cùng Store; chỉ Product còn hiển thị. | TC-AI-02 |
| BR-12 | Cold-start dùng baseline Content/Behavioral hoặc mới nhất/bán chạy. | TC-AI-03 |
| BR-13 | Chatbot chỉ giới thiệu Product đã kiểm tra lại trạng thái và giá hiện hành. | TC-AI-01 |
| BR-14 | Không đưa secret/dữ liệu cá nhân không cần thiết vào prompt hoặc log. | TC-SEC-03 |
| BR-15 | Payment và shipping là sandbox/mock; không settlement thật. | TC-PAY-01 |
| BR-16 | Các Order từ một lần xác nhận giỏ có chung purchase_group_id, nhưng Payment và vòng đời độc lập. | TC-CHK-01 |
| BR-17 | Chọn SANDBOX hoặc COD theo từng Store; mỗi Order có đúng một Payment riêng. Có thể trả tiền các Order sandbox ở các thời điểm khác nhau. | TC-COD-01 |
| BR-18 | Giá/tồn/Store/voucher không hợp lệ ở xác nhận thì không tạo Order nào; giá thay đổi yêu cầu xác nhận quote mới. | TC-CHK-02 |
| BR-19 | Idempotency theo (customer_user_id, key) cho thao tác tạo nhóm Order: cùng payload trả cùng nhóm và danh sách Order, khác payload trả 409; bản ghi kỹ thuật giữ ít nhất 24 giờ. | TC-CHK-04 |
| BR-20 | MVP có baseline Content/Behavioral và model CF/MF huấn luyện offline, đánh giá Top-K. | TC-AI-03 |
| BR-21 | Một địa chỉ được snapshot trên từng Order; M2 tạo toàn bộ Order/Payment của nhóm trong một transaction. Sandbox bắt đầu AWAITING_PAYMENT; COD bắt đầu PREPARING rồi PENDING sau consume tồn. | TC-COD-01 |
| BR-22 | Payment sandbox thành công nhưng consume tồn lỗi: chỉ Order đó RECOVERING; retry cùng operation ID, không thu thêm tiền. | TC-CHK-05 |
| BR-23 | Order AWAITING_PAYMENT hết hạn chỉ EXPIRED/release tồn sau khi đối soát Attempt chưa Success. Success đến muộn sau release tạo Refund cho Order đó, không mở lại Order. | TC-CHK-06 |
| BR-24 | Customer hủy Order AWAITING_PAYMENT/PENDING/CONFIRMED; Seller/Owner cũng được hủy và phải ghi lý do. PROCESSING trở đi từ chối. | TC-ORD-01 |
| BR-25 | Order sandbox đã trả tiền bị hủy tạo Refund đúng payable snapshot gồm phí; Order chưa trả hoặc COD hủy không tạo Refund. | TC-ORD-02 |
| BR-26 | Order, Payment và Refund có trạng thái riêng; Order hủy không đồng nghĩa tiền đã hoàn. | TC-ORD-02 |
| BR-27 | Mỗi Order tối đa một voucher Store; mỗi purchase_group_id tối đa một voucher sàn. Owner quản lý voucher Store, Admin quản lý voucher sàn. Voucher `ACTIVE` chỉ áp dụng trong khoảng hiệu lực và khi còn lượt; `STOPPED` là ngừng thủ công, không đổi Redemption đã chốt. | TC-VCH-01 |
| BR-28 | Voucher chỉ giảm tiền hàng; áp Store trước, sàn sau; phí giao không giảm. Minimum Store xét trước giảm Store, minimum sàn xét sau giảm Store. | TC-VCH-01 |
| BR-29 | Giảm sàn phân bổ theo tiền hàng sau giảm Store, làm tròn VND theo phần dư lớn nhất; hòa thì store_id tăng dần. | TC-VCH-02 |
| BR-30 | Giữ lượt voucher khi reserve/tạo Order, chốt khi toàn bộ Order được tạo; lỗi trước transaction Order thì release. Hủy/hết hạn một Order sau đó không khôi phục lượt hoặc tính lại Order khác; voucher sàn đếm một lượt theo purchase_group_id. | TC-VCH-03 |
| BR-31 | payable của mỗi Order = hàng − giảm Store − giảm sàn phân bổ + phí Store; Payment của Order phải bằng payable đó. Tổng Order bằng tổng quote đã xác nhận. | TC-VCH-02 |
| BR-32 | Doanh thu Store là tiền hàng sau giảm của Order COMPLETED; tiền đã thu/hoàn và phí giao là metric riêng. | TC-REP-01 |
| BR-33 | Customer nộp đơn Store; Admin duyệt/từ chối có lý do; đơn từ chối có thể gửi lại bằng đơn mới. | TC-ACC-01 |
| BR-34 | Store bị khóa ngăn bán mới/công khai, Order đã tạo vẫn xử lý; khóa User chặn request mới. | TC-ACC-03 |
| BR-35 | Owner mời bằng email; người nhận xác minh email mới xem/nhận lời mời. Lời mời PENDING có hạn, có thể thu hồi; chỉ quyền Seller của Store. | TC-ACC-05 |
| BR-36 | SKU duy nhất trong Store, tổ hợp Variant duy nhất trong Product; giá lấy từ Variant, OrderItem giữ snapshot. | TC-CAT-02 |
| BR-37 | Chỉ Customer sở hữu OrderItem của Order COMPLETED được đánh giá; một Review/OrderItem, điểm 1–5; Admin ẩn/hiện lại có lý do/audit. | TC-REV-01 |
| BR-38 | Rating tổng hợp chỉ tính Review VISIBLE và được tính khi đọc hoặc cache suy ra; không có cột rating nguồn trên Product. Product chỉ công khai khi sale ACTIVE, moderation VISIBLE, Store ACTIVE. | TC-REV-02 |
| BR-39 | Mọi cập nhật Order theo version hiện hành; thao tác trễ/trùng không ghi đè hủy hoặc chuyển trạng thái. | TC-ORD-03 |
| BR-40 | Một Payment sandbox/Order có nhiều Attempt nhưng tối đa một Success; Payment.payable_vnd = Order.payable_vnd; không có PaymentAllocation. | TC-PAY-02 |
| BR-41 | M1 reserve đủ SKU mọi Store trước khi M2 tạo nguyên tập Order. Transaction M2 lỗi: release toàn bộ reservation/lượt voucher. COD consume sau tạo; lỗi command giữ Order PREPARING và worker retry, chưa cho Seller xử lý. | TC-COD-02 |

## Bảng trạng thái

| Đối tượng | Chuyển trạng thái | Actor, tác động và lặp |
| --- | --- | --- |
| Order sandbox | PREPARING → AWAITING_PAYMENT → PENDING → CONFIRMED → PROCESSING → SHIPPED → COMPLETED; AWAITING_PAYMENT → EXPIRED/CANCELLED; PENDING/CONFIRMED → CANCELLED; AWAITING_PAYMENT → RECOVERING → PENDING hoặc EXPIRED | M2 tạo Order trước thanh toán; Customer trả Payment riêng Order. RECOVERING chỉ khi Payment Success mà consume lỗi; khi không thể phục hồi, Order EXPIRED và Refund xử lý độc lập. Không chuyển EXPIRED trước khi đối soát Attempt. |
| Order COD | PREPARING → PENDING → CONFIRMED → PROCESSING → SHIPPED → COMPLETED; PENDING/CONFIRMED → CANCELLED | M1 consume tại PREPARING; Seller/Owner chỉ xử lý sau PENDING. SHIPPED → COMPLETED đòi thu đủ COD của Order. |
| Payment sandbox | PENDING → SUCCEEDED/FAILED/CANCELLED; FAILED → PENDING khi thử lại còn hạn; CANCELLED → SUCCEEDED nếu provider xác nhận Success muộn; SUCCEEDED → REFUND_PENDING → REFUNDED/REFUND_FAILED | Callback đã xác minh, dedup theo provider_event_id; Success muộn của Order EXPIRED phải hoàn tiền, không mở lại Order. Refund không đổi trạng thái Order. |
| Payment COD | PENDING → SUCCEEDED hoặc CANCELLED | SUCCEEDED khi CODCollection của chính Order thu đủ; hủy trước thu thành CANCELLED. Không có PARTIALLY_COLLECTED của nhóm. |
| PaymentAttempt | CREATED → PENDING → SUCCEEDED/FAILED/EXPIRED; EXPIRED → SUCCEEDED nếu provider xác nhận muộn | Tối đa một Attempt Success/Payment; callback trùng không ghi hai lần. |
| Reservation | ACTIVE → CONSUMED/RELEASED/EXPIRED | M1 theo order_id; chỉ consume sau Payment Success của sandbox hoặc Order COD tạo thành công. |
| Refund | REQUESTED → PROCESSING → SUCCEEDED/FAILED; FAILED → PROCESSING | M2/mock gateway; cùng operation ID không hoàn hai lần. |

## Ví dụ và đối soát

Store A: hàng 100.000, giảm Store 10.000, phần giảm sàn 9.310, phí 15.000 → Order A 95.690 VND. Store B: hàng 200.000, phần giảm sàn 20.690, phí 15.000 → Order B 194.310 VND. Quote tham khảo tổng 290.000 VND; đây **không phải một Payment**. A có thể trả sandbox hôm nay, B trả sandbox sau hoặc chọn COD. Hết hạn/hủy B không đổi 95.690 của A, không tính lại voucher đã chốt.

M2 lưu Order, Payment, VoucherRedemption, IdempotencyRecord và outbox trong transaction tạo nhóm. M1 reserve theo ID Order được M2 cấp trước; các command consume/release/restock có operation ID. Worker đối soát Payment Success nhưng Order RECOVERING, Order AWAITING_PAYMENT quá hạn, callback muộn và Refund FAILED. Lịch sử mua hàng nằm ở Order; IdempotencyRecord có TTL và chỉ phục vụ retry.

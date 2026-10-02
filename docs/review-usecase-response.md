# Đối chiếu hai vòng review Use Case — 2.0 Draft

Nguồn: báo cáo review Use Case vòng 1 và bản đánh giá lại vòng 2 do người dùng cung cấp. Nhận xét trong báo cáo được kiểm chứng với tài liệu hiện hành trước khi áp dụng; các bản nguồn được giữ nguyên.

**Cập nhật 29/09/2026:** Quyết định [ADR-23](decisions.md) thay thế các kết luận cũ về một phương thức/thanh toán cho toàn checkout. Các dòng dưới đây ghi lại lịch sử review; quy tắc hiện hành là tạo Order theo Store trước và mỗi Order chọn, thanh toán riêng.

## Kết quả vòng 1

| Mã review | Kết quả | Tài liệu xử lý |
| --- | --- | --- |
| C1 | Không còn UC thanh toán trùng ở nhóm 03/04. | [Sơ đồ 03](diagrams/use-case/03-cart-checkout.puml), [04](diagrams/use-case/04-payment-customer-order.puml) |
| C2 | Reset và đổi mật khẩu tách riêng; Authenticated mô tả hành vi chung. | [Use Case](use-cases.md), [RBAC](rbac.md) |
| C3 | Đã thay thế: mỗi Store chọn một phương thức khi tạo Order; sandbox/COD được guard theo từng Order. | [Use Case](use-cases.md), [sequence](state-transitions.md), [ADR-23](decisions.md) |
| C4 | Bước UI, reserve tồn và ghi lịch sử ở flow/sequence, không biến thành include giả. | [Use Case](use-cases.md) |
| C5 | Gateway sandbox và LLM là actor hỗ trợ ngoài hệ thống. | [Sơ đồ 03](diagrams/use-case/03-cart-checkout.puml), [12](diagrams/use-case/12-ai.puml) |
| C6 | Hoàn tất sandbox khác ghi thu COD từng Order. | [Use Case](use-cases.md), [state](state-transitions.md) |
| C7 | Owner xem, cấp/thu hồi quyền và khóa/mở Seller; quyền Seller vẫn phải kiểm tra hiệu lực. | [RBAC](rbac.md), [sơ đồ 07](diagrams/use-case/07-store-staff.puml) |
| Review M1–M4 | Danh mục, actor và tổng quan được chuẩn hóa; 10 mục tiêu OV ánh xạ tới 64 UC duy nhất. | [Tổng quan](diagrams/use-case/00-overview.puml), [bảng ánh xạ](use-cases.md) |
| Review M5 | Danh sách Product Store, lời mời và phục hồi trạng thái được thêm nơi có FR rõ. | [Use Case](use-cases.md), [API](contracts/openapi.json) |
| Review M6–M7 | Giữ mã cũ để truy vết; reserve/callback/audit/worker nằm trong sequence/event. | [Truy vết](traceability.md), [integration contract](integration-contract.md) |

## Kiểm chứng bản đánh giá lại vòng 2

Bên review cho biết họ chỉ nhận 13 tệp `.puml` và bản response. Các tệp [use-cases.md](use-cases.md), [rbac.md](rbac.md), [state-transitions.md](state-transitions.md) và [test-plan.md](test-plan.md) **có trong `docs/`**; nhận xét “chưa có” phản ánh bộ tệp được chuyển cho reviewer, không phải tình trạng workspace. Khi gửi review tiếp, gửi cả [mục lục docs](README.md) và các tài liệu liên kết.

| Vấn đề | Kết quả sau kiểm chứng |
| --- | --- |
| 1. Ẩn không có đường quay lại | Đúng. `UC-ADMIN-PRODUCT` và `UC-REV-MODERATE` nay có thao tác khôi phục, lý do, audit và API tương ứng. Product tách trạng thái bán khỏi kiểm duyệt nên bỏ ẩn không tự bật bán Product DRAFT/STOPPED. |
| 2. Reset thiếu kênh nhận mã | Đúng. M3 dùng mock mailbox cục bộ cho demo; token không trả qua API/log. Tài liệu triển khai ghi rõ cấu hình và ranh giới demo. |
| 3. Người nhận lời mời không thấy/thu hồi/hết hạn | Đúng. Thêm `UC-STAFF-INBOX`, API danh sách của chính User, Owner thu hồi PENDING, kiểm tra `expires_at` tại chấp nhận và worker đánh dấu EXPIRED. |
| 4. Đăng bán và bật lại chưa rõ | Đúng. Đổi tên `UC-SPROD-EDIT`, quy định DRAFT/STOPPED → ACTIVE, điều kiện Store/SKU/giá/kiểm duyệt và test. |
| 5. STATUS/COD chồng nghĩa | Đúng ở tên cũ. Đổi tên và ghi rõ STATUS xử lý vòng đời, COD thu đủ ở bước hoàn tất của Order COD. Không thêm `extend`: thu COD là bắt buộc khi đã chọn COD, nên mũi tên mở rộng tùy chọn dễ gây hiểu sai. |
| 6. PAY-SANDBOX/COD trôi | Hai UC nối Customer; guard nay theo phương thức của từng Order sau khi nhóm Order được tạo. Sandbox thanh toán sau, COD được chọn lúc xác nhận giỏ; thu COD nằm ở `UC-SORDER-COD`. |
| 7. Seller nối UC vô điều kiện | Đúng. Thêm note nhóm quyền `product.store.*`, `inventory.store.*`, `order.store.*`, `cod.store.collect` ở hình 08–10. RBAC phân biệt Admin định nghĩa Role/Permission và Owner gán tập quyền Seller trong Store. |
| 8. Visitor/context | Tổng quan dùng Visitor cho mục tiêu công khai; note trên 00/01 nói một User có thể mang nhiều context. Public catalog cho cả Seller/Admin, còn thao tác mua dùng Customer context. |
| 9. Seller kiểm soát mốc Completed | Rủi ro thiết kế được chấp nhận cho MVP mô phỏng giao hàng. Ghi ở ADR/test; Customer confirm/khiếu nại và vận chuyển thật chưa có trong phạm vi. |
| 10. Đường dẫn cá nhân/mã trùng | Bỏ đường dẫn cá nhân; tiền tố “Review” cho mã góp ý M1–M7, “service” khi chỉ M1–M4 hệ thống. |

Tất cả thay đổi vẫn là **thiết kế Draft**. Test Case ghi “chưa thực thi” cho tới khi có backend và bằng chứng chạy thực tế.

# Hoàn thiện TMĐT — nhật ký kiểm chứng

## Lát cắt Order/Shipment — 27/10

Contract **2.4.1**, vẫn **111 public + 11 internal** operation. Đã bổ sung [bộ lọc đơn và giao nhận thủ công](order-fulfillment.md): Customer/Store/Admin lọc trên server, giữ bộ lọc qua phân trang; Shipment có actor/thời gian/reference; hoàn tất cần cả thu đủ tiền và xác nhận giao nhận. Response transition đọc lại trong transaction; giao thất bại và nhận lại hàng cập nhật Shipment qua Return hiện có. Admin bỏ qua response cũ khi đã đổi bộ lọc.

Local: **267 unit tests / 32 suites**, **16 PostgreSQL controls** gồm fulfillment mới và regression kho/Return hiện có, **21 browser controls** với API intercept, backend/frontend build và contract/docs/drift đã đạt. CI/domain sẽ ghi tại PR; không coi local source là đã deploy. Giữ task nghiệp vụ và owner; chưa kết luận toàn D5, Cart hay Return từng dòng đã hoàn thành.

Theo yêu cầu chủ dự án, tạm dừng bước test SePay trên Dashboard. Token/account lookup local đã có; Refund runtime vẫn `disabled`, chưa có bằng chứng hoàn tiền Sandbox trọn luồng. Adapter đang ở nhánh riêng, không gộp vào bản Order/Shipment này. SMTP TLS/AUTH đạt nhưng chưa tự chứng minh đã nhận mail đăng ký/reset.

## Mốc Product/Review trước đó

Candidate đầu tiên tích hợp source PR #129–133 và bổ sung Product/Review. Các PR thành viên được giữ lịch sử tác giả trong nhánh tích hợp; owner và nghiệm thu issue không đổi. Bản này chưa tự chứng minh các gói Order/Shipment/partial return/Notification/report đã hoàn thành.

| Phần | Source / bằng chứng hiện có | Còn phải làm |
| --- | --- | --- |
| Product lifecycle | Read quản lý theo Store không giới hạn trang đầu; form chọn taxonomy/canonical code, tạo nháp kèm Variant trong cùng transaction; create/Variant/ảnh replay cùng key; publication kiểm phân loại; availability chỉ trả tồn bán được công khai. | Full CI và nghiệm thu trên runtime matching; upload file theo task ảnh; mở rộng chỉnh phân loại/thuộc tính còn lại nếu cần. |
| Review | M2 resolve Product của OrderItem sở hữu; tạo lặp không trùng; edit và audit cùng manager, concurrent edit version đúng; read summary chỉ tính bài VISIBLE. | Full HTTP M1→M2 và Customer/Admin/device acceptance sau deploy. |
| Taxonomy/moderation | Source thành viên tích hợp, cộng lock quyết định category tree và uniqueness attribute code. Product moderation giữ outbox và projected response. | Full CI/HTTP và kiểm thêm race/schema governance theo task gốc. |
| Android | Source redesign từ #129 đã tích hợp local. | Flutter CI/build/install/device; chưa tuyên bố APK đủ toàn flow. |
| Gói tiếp theo | Theo [plan](ecommerce-completion-plan.md): filters/Shipment/Cart, policy toàn đơn/report, rồi N1–N7. | Chưa được đánh dấu hoàn thành chỉ từ Candidate Product/Review. |
| Provider | Không đổi provider khi sửa Product/Review. | Refund online vẫn thiếu provider hỗ trợ; email runtime cần receipt thật; AI quality/device cần bằng chứng riêng. |

Kiểm local: **267 unit tests / 32 suites**, backend/frontend production build, docs/OpenAPI/drift đạt; **6 PostgreSQL controls** dùng container/schema tạm; **4 browser controls** intercept toàn bộ API. SMTP socket test đạt ngoài sandbox; không gửi email ngoài máy. PostgreSQL và browser trước đó chưa chạy do approval timeout/hạn mức; các con số ở đây là lượt đã chạy lại và đạt sau khi tiếp tục.

Các control mới kiểm lost ACK/reload/cùng payload/key, Store scope, publication rollback, Review creation/edit concurrency và audit rollback. Không tạo Product/Order hoặc chuyển tiền trên demo để tạo bằng chứng này. CI, deployed revision và public/provider/device results sẽ được ghi trong PR; không coi local source là đã có trên domain.

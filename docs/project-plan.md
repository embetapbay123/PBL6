# Kế hoạch deliverable 2.1 Draft

**Cập nhật 01/10/2026:** Phân công trong bảng dưới là bản lịch sử 2.1. Phân công làm việc mới nằm ở [service ownership](implementation/service-ownership.md): Công nhận AI/recommendation, Hoa nhận Cart/Order và Mobile, Hatsaphone tập trung User Web. Dùng bảng mới khi giao task; đã chốt 4 service và có [backlog từng member](implementation/member-backlog.md), [khung triển khai](implementation/README.md).

Đây là phân công tài liệu/điểm kiểm tra dựa trên [bảng nguồn](legacy/phan-cong.md), không thay đổi phân công nhân sự chính thức. Chưa gán deadline vì chưa có lịch nộp. Mỗi đầu ra được một người khác người làm rà lại.

| Đầu ra | Owner đề xuất | Reviewer | Phụ thuộc | Điều kiện hoàn thành |
| --- | --- | --- | --- | --- |
| Scope, Business Rules, state machine, kiến trúc và integration | Công | Thịnh | Quyết định MVP | Mâu thuẫn checkout/COD/hủy được giải quyết, M1–M4 ownership rõ |
| FR/NFR, traceability, Test Plan và API | Công | Hoa/Trí | Scope + BR | Có mã FR→UC/API/TC, OpenAPI parse được |
| Use Case Customer Web và UI flow | Hatsaphone | Hoa | FR/BR/RBAC | Luồng nhiều Store, voucher, COD, lỗi/RECOVERING có acceptance criteria |
| Use Case và UI Mobile | Hoa | Hatsaphone | Cùng API Customer | Mobile có luồng Customer tương ứng, không có Seller/Admin |
| Store/Owner/Seller Portal, voucher và kho | Thịnh | Công | RBAC + M1/M2 | Quyền Store, snapshot, kho và cập nhật đơn nhất quán |
| Admin Portal, duyệt Store, taxonomy, kiểm duyệt | Trí | Công | M3 + RBAC | Các màn quản trị có lý do/audit, không cấp quyền vượt phạm vi |
| AI design, evaluation và recommendation | Hatsaphone | Công | Event M1/M2/M3 | Dataset/version/model/metric và fallback có bằng chứng riêng |
| ERD/từ điển dữ liệu, sơ đồ sequence | Công | Thịnh/Trí | BR/state/API | Cardinality, unique, FK nội bộ/REF xuyên service đúng |
| Security/Privacy và audit | Trí | Công | RBAC + ERD + API | Token, consent, dữ liệu nhạy cảm và audit có test tương ứng |
| AI evaluation độc lập | Hatsaphone | Công | AI design + dataset | Baseline/model cùng split, metric và trạng thái chưa thực thi trung thực |
| Deployment và demo script | Công | Cả nhóm | Service contract + Test Plan | Seed, env, health và demo hai Store tái lập được |

Thứ tự: (1) quyết định và yêu cầu → (2) Use Case/RBAC → (3) ERD/contract/sequence → (4) Test Plan/UI/AI/deployment → (5) review chéo, ghi issue và freeze bản Approved. Mọi thay đổi phạm vi sau freeze cần quyết định có mã trong [decision log](decisions.md) và cập nhật FR, UC, ERD, API, TC chịu ảnh hưởng.

**Điểm duyệt 2.1 Draft:** owner rà nội dung, reviewer kiểm chéo sơ đồ–đặc tả–API–test; ghi phát hiện vào issue/review note trước khi sửa. Các tên trong bảng là phân công **đề xuất** theo tài liệu nguồn, chưa là xác nhận nhân sự. Không gán deadline khi chưa có lịch nộp. Chỉ chuyển tài liệu sang Approved sau khi nhóm xác nhận nội dung và có bằng chứng kiểm tra tương ứng; viết xong file không đồng nghĩa chức năng đã triển khai.

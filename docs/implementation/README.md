# Bàn giao khung triển khai 2.2

**Nền để bắt đầu code:** [contract, DTO runtime, adapter/fixture và mẫu chạy được](foundation-handoff.md).

**Schema đã chốt để code:** [database baseline 2.2](database-schema.md). Dùng migration 001→002→003 và DTO OpenAPI; không phải chờ chốt database thêm.

Chốt **4 service M1–M4**. Khung có code, migration, môi trường và luồng mẫu; thành viên viết phần nghiệp vụ theo hợp đồng. Không tách Cart/Order/Payment thành service riêng ở mốc này.

| Đọc để làm gì | Tài liệu |
| --- | --- |
| Chạy hệ thống | [README gốc](../../README.md), [development guide](development-guide.md) |
| Nhận việc hiện tại | [Week 2: kho/Payment/checkout và task từng người](week2.md) |
| Kế hoạch tuần 1 | [Week 1: link issue, việc cụ thể, thứ tự và tiêu chí demo từng người](week1.md) |
| Biết ai làm gì | [ownership](service-ownership.md), [backlog](member-backlog.md), [bảng giao task](task-assignment.md) |
| Nhận toàn bộ task và theo dõi tiến độ | [Kanban tổng theo member](https://github.com/users/embetapbay123/projects/1/views/3), [phân công đầy đủ](task-assignment.md), [cách dùng](kanban-guide.md) |
| Biết API đã chạy tới đâu | [endpoint status](endpoint-status.md), [OpenAPI](../contracts/openapi.json) |
| Hiểu quyết định kiến trúc | [ADR khung](scaffold-decisions.md), [architecture baseline](../architecture.md) |
| Code quyền và phiên | [security](security.md), [RBAC](../rbac.md) |
| Code lỗi/giao dịch liên service | [resilience](error-handling-and-resilience.md), [integration contract](../integration-contract.md) |
| Đo tải và vận hành | [capacity](performance-and-capacity.md), [observability/recovery](observability-and-recovery.md) |
| Nghiệm thu phần member làm | [verification plan](verification-plan.md), [validation record](validation-record.md) |

Thiết kế 2.1 giữ nghiệp vụ nhiều Store, một Order và một Payment mỗi Store, `purchase_group_id` để nhóm lần mua. Bản khung 2.2 bổ sung 3 operation (consent GET/PATCH, SePay callback), tổng **99 API**. Metadata `x-implementation-status` thể hiện trạng thái code; OpenAPI không phải bằng chứng đã hoàn thành nghiệp vụ.

Code mẫu thực hiện auth/catalog và một mutation Product nhỏ. M4 chỉ trả kết quả mô phỏng có nhãn; phần 501 không ghi dữ liệu, không giả lập thanh toán thành công. Chuẩn bảo mật/tải vẫn cần được chứng minh khi thành viên hoàn thiện từng module.

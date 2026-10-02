# Kế hoạch triển khai và bàn giao nhóm — 2.2

Cập nhật 02/10/2026. Đây là phân công làm việc hiện hành theo [ownership](implementation/service-ownership.md), thay bảng đề xuất 2.1. Đã chốt bốn service M1–M4; mỗi service có DB riêng. Khung đã có code mẫu; member hoàn thiện nghiệp vụ theo [bảng giao task](implementation/task-assignment.md). Chưa đặt deadline vì chưa có lịch nộp.

| Thành viên | Backend / tích hợp | Frontend | Đầu ra bàn giao |
| --- | --- | --- | --- |
| Công | Shared/gateway/CI; Payment/Refund/COD/reconciliation ở M2; toàn M4 AI; điều phối contract/tích hợp | Khung/client/component mẫu dùng chung | Interface giao dịch; SePay Test; RAG/recommendation/consent/evaluation; bằng chứng recovery/tải |
| Hoa | M2 Cart/quote/checkout/Order/Voucher/report; phối hợp transaction với Công | Customer Android | API Commerce; Mobile; test giỏ/quote/đặt/hủy/report, kiểm thiết bị |
| Trí | Toàn M3: auth/profile/address/Store/staff/RBAC/admin User/Store | Admin Web; gọi API moderation M1, voucher/report M2, metric M4 | API Identity/Store; Admin; test scope/quyền hiện hành và audit |
| Thịnh | Toàn M1: taxonomy/product/variant/image/inventory/review/moderation | Seller Web; gọi Order/Voucher M2 và Store/staff M3 | API Catalog/kho; Seller; test cạnh tranh/replay/version và hai Store |
| Hatsaphone | Không sở hữu BE/AI; tích hợp API theo mẫu bàn giao | Customer Web | Từng màn Customer với loading/empty/error, phân trang và số liệu từ API |

## Thứ tự mở việc

1. Giao task đầu tiên có scope/đầu ra/tiêu chí trong [bảng task](implementation/task-assignment.md): CORE-01, CAT-01, CART-01, ID-01, WEB-01.
2. Catalog/Cart/address/Store và quyền: ưu tiên API mở chặn người khác; Web/Mobile chuyển từng màn sang API đã kiểm chứng.
3. Checkout/Order/Payment/kho: Công chốt FLOW-01; Hoa/Công/Thịnh review chung local transaction M2, command M1, idempotency và recovery.
4. Review/voucher/report/AI và các màn còn lại; chạy [verification plan](implementation/verification-plan.md), lưu kết quả FR/NFR và [AI evaluation](ai-evaluation.md) theo run thật.
5. Hoàn thiện checklist demo/triển khai, ghi rủi ro/chưa chạy; nghiệm thu theo [requirements acceptance](requirements-acceptance.md), không theo số file đã có.

## Trách nhiệm tài liệu và review

Owner cập nhật code, migration, DTO/contract, README module, status và test của phần mình. Công review shared/infrastructure/contract và ảnh hưởng tích hợp; Trí phối hợp kiểm quyền; chủ service cung cấp ví dụ cho owner Web/Mobile. Task giao dịch nhiều service được review bởi các owner liên quan.

Mỗi task có một branch/PR và một owner; reviewer ghi rõ ở issue. Chỉ đánh dấu Done khi demo/test đạt và PR được merge. Hoàn thành task nhỏ không đồng nghĩa endpoint đủ phạm vi hoặc toàn bộ service đã nghiệm thu. Các mốc ngày được bổ sung sau khi nhóm có lịch nộp và ước lượng task.

## Phạm vi và nguồn

Quy tắc đích theo SRS/FR/BR/UC/RBAC; lựa chọn khung/provider/session theo [ADR 2.2](implementation/scaffold-decisions.md). Đổi nghiệp vụ phải cập nhật [decision log](decisions.md), yêu cầu, API/dữ liệu/state và test chịu ảnh hưởng. [Phân công nguồn cũ](legacy/phan-cong.md) là lịch sử; AI/recommendation hiện do Công phụ trách.

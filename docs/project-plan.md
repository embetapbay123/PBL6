# Kế hoạch triển khai và bàn giao nhóm — 2.2

Cập nhật 06/10/2026. Đây là phân công làm việc hiện hành theo [ownership](implementation/service-ownership.md), thay bảng đề xuất 2.1. Đã chốt bốn service M1–M4; mỗi service có DB riêng. Khung và một số scope đã merge; member hoàn thiện theo [bảng giao task](implementation/task-assignment.md). [Roadmap Week 1–8](implementation/roadmap.md) bao phủ đủ 71 issue: mục tiêu cuối Week 6 đủ chức năng, cuối Week 8 nghiệm thu/bàn giao, Week 9 dự phòng. Đây là ước lượng có điều kiện, chưa là deadline nộp.

| Thành viên | Backend / tích hợp | Frontend | Đầu ra bàn giao |
| --- | --- | --- | --- |
| Công | Shared/gateway/CI; Payment/Refund/COD/reconciliation ở M2; toàn M4 AI; điều phối contract/tích hợp | Khung/client/component mẫu dùng chung | Interface giao dịch; SePay Test; RAG/recommendation/consent/evaluation; bằng chứng recovery/tải |
| Hoa | M2 Cart/quote/checkout/Order/Voucher/report; phối hợp transaction với Công | Customer Android | API Commerce; Mobile; test giỏ/quote/đặt/hủy/report, kiểm thiết bị |
| Trí | Toàn M3: auth/profile/address/Store/staff/RBAC/admin User/Store | Admin Web; gọi API moderation M1, voucher/report M2, metric M4 | API Identity/Store; Admin; test scope/quyền hiện hành và audit |
| Thịnh | Toàn M1: taxonomy/product/variant/image/inventory/review/moderation | Seller Web; gọi Order/Voucher M2 và Store/staff M3 | API Catalog/kho; Seller; test cạnh tranh/replay/version và hai Store |
| Hatsaphone | Không sở hữu BE/AI; tích hợp API theo mẫu bàn giao | Customer Web | Từng màn Customer với loading/empty/error, phân trang và số liệu từ API |

## Mốc triển khai, toàn bộ task đã giao trước

1. Week 1: baseline/nền và QuoteVariants/Cart/Address/lookup đã merge; task rộng còn thiếu giữ mở.
2. [Week 2](implementation/week2.md): reserve/consume/release, Payment/COD và checkout nhiều Store; Auth và UI song song.
3. [Week 3](implementation/week3.md): callback/Refund/cancel/recovery, Product/Variant và client mua hàng.
4. [Week 4](implementation/week4.md)–[Week 5](implementation/week5.md): staff/Review/report/recommendation, RAG/moderation và UI còn lại.
5. [Week 6](implementation/week6.md): AI metrics/evaluation, report đầy đủ, APK RC và feature complete.
6. [Week 7](implementation/week7.md)–[Week 8](implementation/week8.md): security/tải/recovery/device, fix/retest, bằng chứng FR/NFR và bàn giao. Week 9 dành cho phần trễ, không feature mới.

## Trách nhiệm tài liệu và review

Owner cập nhật code, migration, DTO/contract, README module, status và test của phần mình. Công review shared/infrastructure/contract và ảnh hưởng tích hợp; Trí phối hợp kiểm quyền; chủ service cung cấp ví dụ cho owner Web/Mobile. Task giao dịch nhiều service được review bởi các owner liên quan.

Mỗi task có một branch/PR và một owner; reviewer ghi rõ ở issue. Chỉ đánh dấu Done khi demo/test đạt và PR được merge. Hoàn thành task nhỏ không đồng nghĩa endpoint đủ phạm vi hoặc toàn bộ service đã nghiệm thu. Roadmap giả định khoảng 20–25 giờ tập trung/người/tuần và handoff/review kịp thời; cuối mỗi tuần dùng kết quả thực tế để điều chỉnh, không tự cắt yêu cầu hoặc tự Done theo lịch.

## Phạm vi và nguồn

Quy tắc đích theo SRS/FR/BR/UC/RBAC; lựa chọn khung/provider/session theo [ADR 2.2](implementation/scaffold-decisions.md). Đổi nghiệp vụ phải cập nhật [decision log](decisions.md), yêu cầu, API/dữ liệu/state và test chịu ảnh hưởng. [Phân công nguồn cũ](legacy/phan-cong.md) là lịch sử; AI/recommendation hiện do Công phụ trách.

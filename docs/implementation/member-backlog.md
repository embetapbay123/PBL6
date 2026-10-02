# Backlog để chia member

Đây là việc **còn phải code**. Khung đã có migration/model, operation/DTO type, stub và mẫu; file tồn tại chưa có nghĩa nghiệp vụ hoàn thành. Giao từng nhóm nhỏ, hoàn thành contract và test rồi mở nhóm tiếp theo.

| Member | Nhóm 1: độc lập | Nhóm 2: tích hợp | Bằng chứng bàn giao |
| --- | --- | --- | --- |
| Thịnh | Taxonomy/Product/Variant/Image CRUD; Seller list/form; kho adjustment/movement; validation attribute/SKU | Reserve/consume/release theo operation ID; Review hậu mua; moderation; Seller gọi Order/Voucher/Store | Scope hai Store; version conflict; SKU unique; cạnh tranh SKU cuối; replay kho; upload sai; UI loading/error |
| Hoa | Cart CRUD/version; Mobile auth/profile/catalog rồi Cart/address; voucher CRUD/validate; report | Quote/checkout nhiều Store; snapshot, phân bổ voucher; Order state/cancel; payment/COD; Mobile order/review | Quote đổi giá; hết hàng giữa quote/confirm; một group/key; không Order một phần; report khớp; thiết bị Android |
| Trí | Register/verify/reset/change password; Profile/Address CRUD; StoreApplication/review/Store; Admin User/Store | Invitation/staff/permission; khóa User/Store/thu hồi quyền tức thời; Admin moderation/voucher/report/metric | IDOR User/address/Store; replay token/reset; email flow; JWT cũ mất quyền; audit/version; Admin UI |
| Công | Shared/gateway/CI; SePay Test adapter, Payment/Refund state; M4 consent/tracking | Event dedup/amount/reference; COD/refund/reconciliation; RAG retrieval/card; ALS/train/fallback/evaluation; restart/compensation | Chữ ký/event lặp/callback muộn/sai tiền; timeout UNKNOWN; không thu/hoàn kép; crash; consent; AI dataset version |
| Hatsaphone | Customer catalog/detail/search; component mẫu/API client; login/profile/address UI | Cart/checkout/order/history/payment/review; chat/recommendation khi API sẵn sàng | API là nguồn dữ liệu nghiệp vụ; loading/empty/error; phân trang; expired session; số tiền theo API |

## Handoff sớm

- Thịnh → Hoa: snapshot/quote và reserve/consume/release, error code, version, operation ID; không dùng giá do Mobile tính.
- Trí → các member: context hiện hành, Store/membership/address lookup và trạng thái khóa; email flow thật chưa có.
- Hoa ↔ Công: Order/Payment/Refund cùng M2; dùng EntityManager chung khi transaction cần nguyên tử, thống nhất state/event trước khi viết.
- Thịnh/Hoa → Công: ProductChanged/OrderCompleted có schema version/outbox; AI consumer kiểm consent.
- Backend → Hatsaphone: bàn giao từng API có test/ví dụ; thứ tự màn theo API sẵn sàng.

## Thứ tự tích hợp

A: auth/profile/Store/catalog CRUD, client API, quyền/validation. B: Cart/address/kho/voucher/quote. C: checkout/Order/COD/SePay test/refund/recovery. D: review/report/AI, kiểm tải/demo. UI làm song song bằng fixture có nhãn mock; chuyển từng luồng sang API thật khi backend bàn giao.

Operation hoàn thành khi phạm vi OpenAPI được hỗ trợ đủ, test đạt, quyền/error/recovery được kiểm và README bỏ cảnh báo stub. IMPLEMENTED_SAMPLE giữ nhãn mẫu đến khi hoàn thiện nghiệp vụ đích.

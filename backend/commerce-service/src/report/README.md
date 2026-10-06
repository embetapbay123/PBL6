# M2 / report

Owner: Hoa

- `GET /admin/orders` — listAllOrders: **IMPLEMENTED**
- `GET /admin/dashboard` — getPlatformDashboard: **NOT_IMPLEMENTED**
- `GET /store/reports` — getStoreReport: **NOT_IMPLEMENTED**

Đọc [bàn giao nhánh tổng](../../../../docs/implementation/hoa-consolidated-handoff.md) để biết code, test, migration và dependency. `IMPLEMENTED` là handler có nghiệp vụ trong nhánh này; issue chỉ Done sau review/merge/nghiệm thu. `NOT_IMPLEMENTED` có thể đã có một lát cắt nhưng chưa đủ luồng.

Doanh thu trừ giảm Store/platform. Dashboard lấy số User/Store từ M3, Store report lấy low-stock M1; endpoint tương ứng chưa xong thì truyền 501, không trả số liệu giả.

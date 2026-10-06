# M2 / cart

Owner: Hoa

- `GET /cart/items` — listCartItems: **IMPLEMENTED**
- `POST /cart/items` — addCartItem: **IMPLEMENTED**
- `PATCH /cart/items/{id}` — updateCartItem: **IMPLEMENTED**
- `DELETE /cart/items/{id}` — removeCartItem: **IMPLEMENTED**

Đọc [bàn giao nhánh tổng](../../../../docs/implementation/hoa-consolidated-handoff.md) để biết code, test, migration và dependency. `IMPLEMENTED` là handler có nghiệp vụ trong nhánh này; issue chỉ Done sau review/merge/nghiệm thu. `NOT_IMPLEMENTED` có thể đã có một lát cắt nhưng chưa đủ luồng.

Add nhận product_id + variant_id + quantity; lấy Product/Store từ M1 rồi QuoteVariants. Chạy migration 004 trước khi chạy M2. Item legacy thiếu product_id cần xóa/thêm lại để quote. CartRepository khóa Cart trước Item; không giữ transaction trong lúc gọi M1.

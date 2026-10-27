# REV-01 — Review sau mua và danh sách đánh giá Product

**Issue:** [#16](https://github.com/embetapbay123/PBL6/issues/16) · **Nhánh:** `feat/rev-01` · `listProductReviews` + `updateReview` → **IMPLEMENTED**, `createReview` **bị chặn bởi contract**

## File đã code

| File | Việc |
| --- | --- |
| [review.repository.ts](../../backend/catalog-service/src/review/review.repository.ts) | `pageVisible`, `lockOwnedReview`, `updateReview`, `audit` |
| [review.service.ts](../../backend/catalog-service/src/review/review.service.ts) | `listProductReviews`, `updateReview`, `reviewResponse` |
| [review.controller.ts](../../backend/catalog-service/src/review/review.controller.ts) *(mới)* | 2 route đã chạy thật |
| [review.skeleton.controller.ts](../../backend/catalog-service/src/review/review.skeleton.controller.ts) | Chỉ còn `createReview` (kèm lý do chặn) |
| [main.ts](../../backend/catalog-service/src/main.ts) | Đăng ký controller mới |
| [integration test](../../backend/tests/integration/review.service.test.ts) | 5 test |

## Đã làm được gì

- **`listProductReviews`** (public): chỉ trả review `VISIBLE`, mới nhất trước, phân trang, không lộ `customer_user_id`; Product không tồn tại trả trang rỗng thay vì lỗi.
- **`updateReview`**: tác giả sửa `rating`/`body`, kiểm `expected_version`, ghi audit `REVIEW_UPDATED`, và **không** đổi `status` nên review đang bị ẩn vẫn ẩn.

## Cách làm — 3 điểm chính

1. **Ownership nằm trong câu truy vấn** (`WHERE id=$1 AND customer_user_id=$2`): review của người khác trả **404**, nên id không bị xác nhận là tồn tại.
2. **`status` không bị đụng tới** khi tác giả sửa, để moderation không bị vô hiệu hoá từ phía người dùng.
3. **`body` phân biệt "không gửi" với "gửi rỗng"** bằng `Object.hasOwn`, nên xoá nội dung là hành động rõ ràng.

## Kiểm chứng

```powershell
npm run build:backend && npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Kết quả: build đạt · `review.service` **5/5** (integration, không dùng login).

Case đã phủ: chỉ review `VISIBLE` được trả, đúng thứ tự mới nhất trước · phân trang 3 → 2 + 1 · Product lạ → trang rỗng · tác giả sửa + `version` tăng + audit + list thấy nội dung mới · review người khác → 404 · version cũ → 409 và row không đổi · không gửi field → 422 · review đang ẩn vẫn ẩn sau khi tác giả sửa · gửi `body: ''` xoá nội dung, bỏ trống thì giữ nguyên.

## Bị chặn — `createReview`

`ReviewCreate` chỉ có `order_item_id`, `rating`, `body`; **không có `product_id`**. Nhưng `POST /internal/reviews/eligibility` (M2) bắt buộc `order_item_id` **và** `customer_user_id` **và** `product_id`, và trả `eligible:false` nếu Product không khớp mục đơn hàng. Không có operation nội bộ nào tra `order_item_id` → `product_id` (đã rà toàn bộ 11 op nội bộ).

Vì vậy M1 **không thể** gọi eligibility một cách hợp lệ. Cần một trong hai, do owner hợp đồng (FLOW-01) quyết:
- thêm `product_id` (hoặc `variant_id`) vào `ReviewCreate`, hoặc
- thêm một operation nội bộ trả mục đơn hàng kèm `product_id`.

Tôi giữ route `createReview` là `501` rõ ràng kèm ghi chú, thay vì đoán Product — đoán sẽ tạo review gắn sai sản phẩm.

## Còn lại

`hideReview` / `restoreReview` thuộc MOD-01 (#17) — đã làm ở nhánh `feat/mod-01`.

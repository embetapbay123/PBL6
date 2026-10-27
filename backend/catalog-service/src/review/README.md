# M1 / review

Owner: Thịnh

- `GET /products/{id}/reviews` — listProductReviews: **IMPLEMENTED**
- `POST /me/reviews` — createReview: **NOT_IMPLEMENTED**
- `PATCH /me/reviews/{id}` — updateReview: **IMPLEMENTED**
- `POST /admin/reviews/{id}/hide` — hideReview: **IMPLEMENTED**
- `POST /admin/reviews/{id}/restore` — restoreReview: **IMPLEMENTED**

## Bàn giao MOD-01

Ẩn/khôi phục Review ở [bàn giao MOD-01](../../../../docs/implementation/mod-01-handoff.md): đổi `status` giữa `VISIBLE`/`HIDDEN`, ghi `hidden_reason` khi ẩn và xoá khi khôi phục, tăng `version`, audit `REVIEW_HIDDEN`/`REVIEW_RESTORED`, từ chối `409 VERSION_CONFLICT`/`NO_STATE_CHANGE`.

Thao tác tạo Review vẫn chờ bổ sung hợp đồng; đọc/sửa và moderation đã được tích hợp từ cả hai PR.

## Bàn giao REV-01

Đọc và sửa đánh giá ở [bàn giao REV-01](../../../../docs/implementation/rev-01-handoff.md). `listProductReviews` chỉ trả review `VISIBLE`, mới nhất trước, có phân trang và không lộ `customer_user_id`. `updateReview` giới hạn theo tác giả (review của người khác trả `404` chứ không `403`, nên id không bị xác nhận), tôn trọng `expected_version`, và **không** đổi `status` nên review đang bị ẩn vẫn ẩn sau khi tác giả sửa.

`createReview` **chưa làm được** vì lý do hợp đồng: `ReviewCreate` chỉ có `order_item_id`, trong khi `VerifyReviewEligibility` của M2 bắt buộc cả `product_id`, và không có operation nội bộ nào tra `order_item_id` ra Product. Cần bổ sung field đó (hoặc một lookup) qua FLOW-01 trước khi triển khai; route giữ `501` rõ ràng thay vì đoán Product.

`hideReview`/`restoreReview` thuộc MOD-01 (#17).

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.

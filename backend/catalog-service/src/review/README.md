# M1 / review

Owner: Thịnh

- `GET /products/{id}/reviews` — listProductReviews: **NOT_IMPLEMENTED**
- `POST /me/reviews` — createReview: **NOT_IMPLEMENTED**
- `PATCH /me/reviews/{id}` — updateReview: **NOT_IMPLEMENTED**
- `POST /admin/reviews/{id}/hide` — hideReview: **IMPLEMENTED**
- `POST /admin/reviews/{id}/restore` — restoreReview: **IMPLEMENTED**

## Bàn giao MOD-01

Ẩn/khôi phục Review ở [bàn giao MOD-01](../../../../docs/implementation/mod-01-handoff.md): đổi `status` giữa `VISIBLE`/`HIDDEN`, ghi `hidden_reason` khi ẩn và xoá khi khôi phục, tăng `version`, audit `REVIEW_HIDDEN`/`REVIEW_RESTORED`, từ chối `409 VERSION_CONFLICT`/`NO_STATE_CHANGE`.

Ba operation phía Customer (`createReview`, `updateReview`, `listProductReviews`) thuộc REV-01 (#16) và còn là stub.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.

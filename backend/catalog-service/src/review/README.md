# M1 / review

Owner: Thịnh

- `GET /products/{id}/reviews` — listProductReviews: **IMPLEMENTED**
- `POST /me/reviews` — createReview: **IMPLEMENTED**
- `PATCH /me/reviews/{id}` — updateReview: **IMPLEMENTED**
- `POST /admin/reviews/{id}/hide` — hideReview: **IMPLEMENTED**
- `POST /admin/reviews/{id}/restore` — restoreReview: **IMPLEMENTED**

## Bàn giao MOD-01

Ẩn/khôi phục Review ở [bàn giao MOD-01](../../../../docs/implementation/mod-01-handoff.md): đổi `status` giữa `VISIBLE`/`HIDDEN`, ghi `hidden_reason` khi ẩn và xoá khi khôi phục, tăng `version`, audit `REVIEW_HIDDEN`/`REVIEW_RESTORED`, từ chối `409 VERSION_CONFLICT`/`NO_STATE_CHANGE`.

Đọc/sửa và moderation được tích hợp từ hai PR của Thịnh. Phần tích hợp bổ sung transaction/audit chung, tạo Review và contract lookup M2; owner và nghiệm thu toàn task vẫn giữ nguyên.

## Bàn giao REV-01

Đọc và sửa đánh giá ở [bàn giao REV-01](../../../../docs/implementation/rev-01-handoff.md). `listProductReviews` chỉ trả review `VISIBLE`, mới nhất trước, có phân trang và không lộ `customer_user_id`. `updateReview` giới hạn theo tác giả (review của người khác trả `404` chứ không `403`, nên id không bị xác nhận), tôn trọng `expected_version`, và **không** đổi `status` nên review đang bị ẩn vẫn ẩn sau khi tác giả sửa.

`createReview` dùng `VerifyReviewEligibility` với OrderItem và Customer từ phiên đã xác thực; M2 trả Product thực khi input không chứa `product_id`. Request cũ có Product vẫn được kiểm khớp và giữ response cũ. M1 không đọc DB M2 hoặc tin Product/Customer do FE tự khai. Create lặp cùng nội dung trả Review đã có; nội dung khác trên cùng OrderItem trả 409. Create/edit, `m1_audit` và `review_audit` dùng chung transaction; concurrent edit chỉ nhận một version hiện hành.

Sáu kiểm thử PostgreSQL ở `ecommerce-completion.test.ts` kiểm scope, idempotency, concurrency và rollback; public Review aggregate bỏ bài ẩn. Full provider/device/Customer acceptance được ghi riêng sau CI và deploy, không tự đóng #16/#69.

`hideReview`/`restoreReview` thuộc MOD-01 (#17).

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.

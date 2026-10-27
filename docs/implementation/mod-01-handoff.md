# MOD-01 — Ẩn/khôi phục Product và Review

**Issue:** [#17](https://github.com/embetapbay123/PBL6/issues/17) · **Nhánh:** `feat/mod-01` · 4 operation → **IMPLEMENTED**

## File đã code

| File | Việc |
| --- | --- |
| [moderation.repository.ts](../../backend/catalog-service/src/moderation/moderation.repository.ts) | `storeOfProduct`, `setProductModeration` (full projection + `ProductChanged`), `setReviewModeration` |
| [moderation.service.ts](../../backend/catalog-service/src/moderation/moderation.service.ts) | Chiếu `Product` đầy đủ, chặn khôi phục khi Store bị khoá, 2 method review |
| [moderation.controller.ts](../../backend/catalog-service/src/moderation/moderation.controller.ts) | 2 route review mới |
| [review.skeleton.controller.ts](../../backend/catalog-service/src/review/review.skeleton.controller.ts) | Bỏ 2 route admin đã chuyển sang moderation |
| [integration test](../../backend/tests/integration/moderation.service.test.ts) | 5 test |

## Đã làm được gì

- **`hideProduct`/`restoreProduct`** trả đúng **projection `Product`** (có `variants`, `images`) và phát `ProductChanged` — trước đây chúng trả object rút gọn, sai contract.
- **`hideReview`/`restoreReview`** đổi `status`, ghi/xoá `hidden_reason`, tăng `version`, ghi audit.

## Cách làm — 3 điểm chính

1. **Khôi phục không vượt trạng thái bán hay Store khoá**: chỉ `moderation_status` đổi, `status` giữ nguyên nên Product `STOPPED`/`DRAFT` vẫn ngoài catalogue; Store bị khoá → `409 STORE_UNAVAILABLE` và không ghi gì.
2. **`ProductChanged` sau mỗi lần ẩn/khôi phục** với `version` mới, để cache/AI không còn phục vụ Product đã ẩn.
3. **Audit trong cùng transaction**, kèm lý do; `NO_STATE_CHANGE` (409) khi ẩn/khôi phục lại đúng trạng thái hiện tại.

## Kiểm chứng

```powershell
npm run build:backend && npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Kết quả: build đạt · unit **264 test** · `moderation.service` **5/5** (integration, không dùng login).

Case đã phủ: ẩn Product → projection đầy đủ + audit + `ProductChanged` + `publicProduct` trả `undefined` · version cũ 409 · thiếu nội dung 422 · id lạ 404 · ẩn hai lần → `NO_STATE_CHANGE` · khôi phục giữ `STOPPED` nên vẫn ngoài kệ · Store khoá → 409 và row không đổi · ẩn/khôi phục Review + `hidden_reason` + audit hai chiều + 409/404.

## Còn lại

`createReview` / `updateReview` / `listProductReviews` là REV-01 (#16) và vẫn là stub.

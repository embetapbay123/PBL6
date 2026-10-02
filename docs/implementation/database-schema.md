# Schema database đã chốt — baseline 2.2

Ngày chốt: **02/10/2026**. Thành viên triển khai theo schema này, không cần chờ một buổi chốt thiết kế khác. Đây là baseline cho toàn bộ 54 entity nghiệp vụ và các bảng kỹ thuật của 4 service. Việc nghiệp vụ chưa được code không làm thay đổi quyền sở hữu dữ liệu.

## Nguồn để code

1. SQL `001_initial.sql` → `002_correlation_text.sql` → `003_schema_baseline.sql` của từng service là nguồn schema runtime, áp dụng theo thứ tự.
2. Entity TypeORM / model SQLAlchemy ánh xạ cột; **synchronize=false**. Index, FK và CHECK do migration quản lý, không tự sinh schema từ ORM.
3. [OpenAPI](../contracts/openapi.json) và [internal API](../contracts/internal-api.json) là nguồn request/response; DTO tách khỏi entity. BIGINT trong Node giữ string nội bộ; mapper kiểm tra số nguyên an toàn khi trả số tiền theo contract API. Không trả trực tiếp entity, token hash hoặc password hash.
4. [Từ điển dữ liệu](../data-dictionary.md), [ERD](../diagrams/erd/README.md), [state transitions](../state-transitions.md) giải thích nghiệp vụ. Khi sơ đồ khác SQL, SQL cộng tài liệu này là schema đã chốt; không chạy generator cũ để ghi đè.

## Quyền sở hữu

| DB | Service | Owner | Phạm vi |
| --- | --- | --- | --- |
| m1 | Catalog | Thịnh | Catalog, Inventory, Review, Moderation |
| m2 | Commerce | Hoa + Công | Hoa: Cart/Order/Voucher/report; Công: Payment/Refund/COD tiền |
| m3 | Identity & Store | Trí | Auth/Profile/Address/Store/Staff/RBAC |
| m4 | AI | Công | Chat/consent/tracking/recommendation/model evaluation |

Hatsaphone dùng DTO/fixture và API; không sở hữu DB. Cùng PostgreSQL instance nhưng database/user riêng. Không query, join, FK hoặc transaction xuyên database. ID của service khác là UUID tham chiếu logic; xác minh qua API nội bộ. Cart/Order/Payment cùng M2 có FK và transaction chung.

## Quyết định dùng ngay

- UUID là khóa nghiệp vụ; thời gian UTC `timestamptz`; tiền là BIGINT VND nguyên, không dùng float. Dữ liệu JSON phải được kiểm tra bằng DTO/schema tại boundary.
- Một Cart/User, một CartItem/Variant trong giỏ. Thêm cùng variant là tăng số lượng bằng upsert/lock, không tạo dòng trùng. `store_id` và `variant_id` lấy từ quote M1, không tin dữ liệu giá của client.
- Một Order/Store trong purchase_group, một Payment/Order, một Shipment/Order, một CODCollection/Order. Không có bảng Checkout/Purchase hoặc Payment chung cho purchase_group.
- OrderItem và address_snapshot giữ bản chụp bất biến. `line_total_vnd = unit_price_vnd * quantity`; `payable_vnd = goods_vnd - store_discount_vnd - platform_discount_vnd + shipping_vnd`. Giảm giá không vượt tiền hàng.
- Payment và Refund cùng order_id được bảo vệ bằng composite FK. Payment.payable_vnd bằng Order.payable_vnd do service kiểm trong transaction. Callback có thể thu thừa: lưu số thu thực, đối soát/hoàn phần dư, không cắt số thu về payable.
- SKU duy nhất trong Store; variant_signature duy nhất trong Product; tối đa một variant mặc định/Product. Variant phải cùng Store với Product; Inventory phải cùng Store với Variant. Ảnh variant phải thuộc Product của ảnh: service kiểm trong transaction.
- Một Inventory/Variant; `0 <= reserved_quantity <= quantity`. Một reservation/Order và một item/Inventory trong reservation. StockMovement có thể có nhiều dòng cùng operation_id vì một command tác động nhiều SKU; chống lặp command bằng operation_result, không unique operation_id toàn bảng movement.
- Một địa chỉ ACTIVE mặc định/User; khi đổi mặc định hoặc xóa địa chỉ mặc định, khóa User để serialize, bỏ mặc định cũ rồi đặt mới trong cùng transaction. Địa chỉ ngừng dùng phải is_default=false. Không bắt buộc User luôn có địa chỉ mặc định.
- Một membership ACTIVE/User và một OWNER ACTIVE/Store theo baseline đã thống nhất. Store.slug duy nhất; một Store/Application. Service bảo đảm Store hoạt động có Owner, không dựa riêng vào unique index để bảo đảm tồn tại.
- Voucher.code chuẩn hóa uppercase/trim trước ghi, duy nhất toàn sàn. STORE voucher có store_id, PLATFORM voucher không có store_id theo DTO; service kiểm scope. Một reservation/Voucher/purchase_group; một redemption/Voucher/Order. Voucher sàn đếm lượt DISTINCT purchase_group_id. usage_limit/per_customer_limit là số dương hữu hạn.
- Guest chat dùng anonymous_key ngẫu nhiên, Customer chat dùng user_id; chính xác một trong hai có giá trị. Không đưa Guest history vào lịch sử Customer. Interaction.event_id duy nhất toàn ingress; producer đưa namespace vào ID để tránh va chạm. Consent/Profile/Embedding là một bản ghi hiện tại/User hoặc Product; không tạo nhiều bản embedding cho một Product trong MVP. model_version giữ lịch sử riêng.
- Không hard-delete dữ liệu lịch sử Product/Variant/Address/Store/Voucher. CartItem có thể xóa sau mua. Các FK mặc định NO ACTION; không tự thêm cascade xóa lịch sử.
- Trạng thái và enum API giữ theo OpenAPI và state transitions; dùng VARCHAR ở DB để migration không phụ thuộc PostgreSQL enum. Service kiểm enum/cạnh chuyển trạng thái và optimistic version; DB không thể tự kiểm actor/quyền hoặc chuyển trạng thái cũ→mới.

## Transaction và kiểm tra nghiệp vụ

M1 thay tồn, movement, operation_result và outbox trong một transaction; khóa Inventory theo UUID có thứ tự để tránh deadlock. M2 tạo toàn bộ Order/OrderItem/Payment/redemption/idempotency result/outbox trong một transaction, Hoa và Công truyền cùng EntityManager. Reserve M1 xảy ra trước transaction M2; lỗi thì release bằng command idempotent, có worker phục hồi. Không giữ transaction DB trong khi gọi mạng.

M3 đổi quyền/phiên/store và audit trong transaction. M4 nhận sự kiện: inbox và cập nhật dữ liệu trong transaction, kiểm consent trước lưu hành vi cá nhân. Check DB không thay thế kiểm quyền, stock concurrency, tổng refund, usage voucher hoặc recovery; owner phải code và kiểm tra các phần đó.

## Áp dụng và thay đổi

Chạy từ thư mục gốc, sau khi build image tools theo [development guide](development-guide.md):

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build tools
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
```

Không sửa 001/002/003 khi đã áp dụng. Nếu cần thay đổi trong quá trình code: thêm migration số tiếp theo, cập nhật entity/DTO/tài liệu liên quan trong cùng PR; Hoa và Công phối hợp số migration M2. Không cần mở lại toàn bộ thiết kế cho thay đổi cục bộ, nhưng thay contract chung phải được các bên dùng contract review.

## Danh mục cột đã chốt

Bảng dưới lấy từ migration 001; M3 RefreshSession có thêm family_id UUID NOT NULL trong cùng migration. Migration 002 đổi outbox.correlation_id sang TEXT. Migration 003 bổ sung constraint/index, không đổi cột nghiệp vụ. Technical tables outbox/inbox/operation_result/bootstrap_effect/schema_migration thuộc từng DB, không là shared database.

### M1 — catalog-service

Migration: [001](../../backend/catalog-service/migrations/001_initial.sql), [002](../../backend/catalog-service/migrations/002_correlation_text.sql), [003](../../backend/catalog-service/migrations/003_schema_baseline.sql).

#### category

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| parent_id | `uuid` |
| name | `varchar NOT NULL` |
| slug | `varchar NOT NULL` |
| status | `varchar NOT NULL` |

#### product_type

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| category_id | `uuid NOT NULL` |
| name | `varchar NOT NULL` |
| status | `varchar NOT NULL` |

#### attribute_definition

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| product_type_id | `uuid NOT NULL` |
| code | `varchar NOT NULL` |
| name | `varchar NOT NULL` |
| data_type | `varchar NOT NULL` |
| required | `boolean NOT NULL` |
| variant_factor | `boolean NOT NULL` |
| allowed_values | `jsonb DEFAULT '[]'::jsonb` |
| unit | `varchar` |

#### product

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| store_id | `uuid NOT NULL` |
| product_type_id | `uuid NOT NULL` |
| title | `varchar NOT NULL` |
| description | `text` |
| attributes_json | `jsonb NOT NULL DEFAULT '{}'::jsonb` |
| status | `varchar NOT NULL` |
| moderation_status | `varchar NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |

#### product_variant

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| product_id | `uuid NOT NULL` |
| store_id | `uuid NOT NULL` |
| sku | `varchar NOT NULL` |
| price_vnd | `bigint NOT NULL` |
| variant_values_json | `jsonb NOT NULL DEFAULT '{}'::jsonb` |
| variant_signature | `varchar NOT NULL` |
| is_default | `boolean NOT NULL` |
| status | `varchar NOT NULL` |

#### product_image

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| product_id | `uuid NOT NULL` |
| variant_id | `uuid` |
| url | `varchar NOT NULL` |
| position | `integer NOT NULL` |
| status | `varchar NOT NULL` |

#### review

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| product_id | `uuid NOT NULL` |
| order_item_id | `uuid NOT NULL` |
| customer_user_id | `uuid NOT NULL` |
| rating | `integer NOT NULL` |
| body | `text` |
| status | `varchar NOT NULL` |
| hidden_reason | `text` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |
| updated_at | `timestamptz NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |

#### review_audit

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| review_id | `uuid NOT NULL` |
| actor_user_id | `uuid NOT NULL` |
| action | `varchar NOT NULL` |
| reason | `text` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### m1_audit

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| actor_user_id | `uuid NOT NULL` |
| target_type | `varchar NOT NULL` |
| target_id | `uuid NOT NULL` |
| action | `varchar NOT NULL` |
| reason | `text` |
| request_id | `varchar NOT NULL` |
| before_json | `jsonb DEFAULT '{}'::jsonb` |
| after_json | `jsonb DEFAULT '{}'::jsonb` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### inventory

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| variant_id | `uuid NOT NULL` |
| store_id | `uuid NOT NULL` |
| quantity | `integer NOT NULL` |
| reserved_quantity | `integer NOT NULL DEFAULT 0` |
| version | `integer NOT NULL DEFAULT 0` |

#### inventory_reservation

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| order_id | `uuid NOT NULL` |
| purchase_group_id | `uuid NOT NULL` |
| status | `varchar NOT NULL` |
| expires_at | `timestamptz NOT NULL` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### reservation_item

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| reservation_id | `uuid NOT NULL` |
| inventory_id | `uuid NOT NULL` |
| quantity | `integer NOT NULL` |
| status | `varchar NOT NULL` |

#### stock_movement

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| inventory_id | `uuid NOT NULL` |
| reservation_item_id | `uuid` |
| order_id | `uuid` |
| operation_id | `uuid NOT NULL` |
| delta_quantity | `integer NOT NULL` |
| delta_reserved | `integer NOT NULL` |
| reason | `varchar NOT NULL` |
| actor_user_id | `uuid NOT NULL` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

### M2 — commerce-service

Migration: [001](../../backend/commerce-service/migrations/001_initial.sql), [002](../../backend/commerce-service/migrations/002_correlation_text.sql), [003](../../backend/commerce-service/migrations/003_schema_baseline.sql).

#### cart

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| customer_user_id | `uuid NOT NULL` |
| updated_at | `timestamptz NOT NULL` |

#### cart_item

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| cart_id | `uuid NOT NULL` |
| variant_id | `uuid NOT NULL` |
| store_id | `uuid NOT NULL` |
| quantity | `integer NOT NULL` |
| added_at | `timestamptz NOT NULL` |

#### idempotency_record

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| customer_user_id | `uuid NOT NULL` |
| key | `varchar NOT NULL` |
| payload_hash | `varchar NOT NULL` |
| purchase_group_id | `uuid NOT NULL` |
| response_json | `jsonb DEFAULT '{}'::jsonb` |
| expires_at | `timestamptz NOT NULL` |

#### order

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| purchase_group_id | `uuid NOT NULL` |
| customer_user_id | `uuid NOT NULL` |
| store_id | `uuid NOT NULL` |
| address_snapshot | `jsonb NOT NULL DEFAULT '{}'::jsonb` |
| status | `varchar NOT NULL` |
| payment_method | `varchar NOT NULL` |
| payment_expires_at | `timestamptz` |
| goods_vnd | `bigint NOT NULL` |
| store_discount_vnd | `bigint NOT NULL` |
| platform_discount_vnd | `bigint NOT NULL` |
| shipping_vnd | `bigint NOT NULL` |
| payable_vnd | `bigint NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### order_item

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| order_id | `uuid NOT NULL` |
| product_id | `uuid NOT NULL` |
| variant_id | `uuid NOT NULL` |
| product_snapshot | `jsonb NOT NULL DEFAULT '{}'::jsonb` |
| sku_snapshot | `varchar NOT NULL` |
| unit_price_vnd | `bigint NOT NULL` |
| quantity | `integer NOT NULL` |
| line_total_vnd | `bigint NOT NULL` |

#### order_status_history

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| order_id | `uuid NOT NULL` |
| from_status | `varchar` |
| to_status | `varchar NOT NULL` |
| actor_user_id | `uuid NOT NULL` |
| reason | `text` |
| operation_id | `uuid NOT NULL` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### shipment

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| order_id | `uuid NOT NULL` |
| status | `varchar NOT NULL` |
| tracking_code | `varchar` |
| shipped_at | `timestamptz` |
| delivered_at | `timestamptz` |

#### payment

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| order_id | `uuid NOT NULL` |
| method | `varchar NOT NULL` |
| status | `varchar NOT NULL` |
| payable_vnd | `bigint NOT NULL` |
| collectible_vnd | `bigint NOT NULL` |
| collected_vnd | `bigint NOT NULL DEFAULT 0` |
| refunded_vnd | `bigint NOT NULL DEFAULT 0` |
| version | `integer NOT NULL DEFAULT 0` |

#### payment_attempt

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| payment_id | `uuid NOT NULL` |
| provider_reference | `varchar NOT NULL` |
| status | `varchar NOT NULL` |
| amount_vnd | `bigint NOT NULL` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### payment_event

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| attempt_id | `uuid NOT NULL` |
| provider_event_id | `varchar NOT NULL` |
| event_type | `varchar NOT NULL` |
| payload_hash | `varchar NOT NULL` |
| received_at | `timestamptz NOT NULL DEFAULT now()` |

#### refund

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| payment_id | `uuid NOT NULL` |
| order_id | `uuid NOT NULL` |
| amount_vnd | `bigint NOT NULL` |
| status | `varchar NOT NULL` |
| operation_id | `uuid NOT NULL` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### c_o_d_collection

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| order_id | `uuid NOT NULL` |
| amount_due_vnd | `bigint NOT NULL` |
| amount_collected_vnd | `bigint NOT NULL` |
| status | `varchar NOT NULL` |
| operation_id | `uuid NOT NULL` |
| collected_at | `timestamptz` |

#### voucher

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| code | `varchar NOT NULL` |
| scope | `varchar NOT NULL` |
| store_id | `uuid` |
| owner_user_id | `uuid NOT NULL` |
| discount_type | `varchar NOT NULL` |
| discount_value | `bigint NOT NULL` |
| max_discount_vnd | `bigint` |
| min_goods_vnd | `bigint NOT NULL` |
| starts_at | `timestamptz NOT NULL` |
| ends_at | `timestamptz NOT NULL` |
| usage_limit | `integer NOT NULL` |
| per_customer_limit | `integer NOT NULL` |
| status | `varchar NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |

#### voucher_reservation

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| voucher_id | `uuid NOT NULL` |
| purchase_group_id | `uuid NOT NULL` |
| customer_user_id | `uuid NOT NULL` |
| store_id | `uuid` |
| status | `varchar NOT NULL` |
| discount_vnd | `bigint NOT NULL` |
| expires_at | `timestamptz NOT NULL` |

#### voucher_redemption

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| voucher_id | `uuid NOT NULL` |
| purchase_group_id | `uuid NOT NULL` |
| order_id | `uuid NOT NULL` |
| customer_user_id | `uuid NOT NULL` |
| discount_vnd | `bigint NOT NULL` |
| redeemed_at | `timestamptz NOT NULL DEFAULT now()` |

#### m2_audit

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| actor_user_id | `uuid` |
| target_type | `varchar NOT NULL` |
| target_id | `uuid NOT NULL` |
| action | `varchar NOT NULL` |
| reason | `text` |
| request_id | `varchar NOT NULL` |
| before_json | `jsonb DEFAULT '{}'::jsonb` |
| after_json | `jsonb DEFAULT '{}'::jsonb` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

### M3 — identity-store-service

Migration: [001](../../backend/identity-store-service/migrations/001_initial.sql), [002](../../backend/identity-store-service/migrations/002_correlation_text.sql), [003](../../backend/identity-store-service/migrations/003_schema_baseline.sql).

#### user

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| email | `varchar NOT NULL` |
| email_verified_at | `timestamptz` |
| password_hash | `varchar NOT NULL` |
| status | `varchar NOT NULL` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |
| version | `integer NOT NULL DEFAULT 0` |

#### customer_profile

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| user_id | `uuid NOT NULL` |
| display_name | `varchar NOT NULL` |
| phone | `varchar` |
| updated_at | `timestamptz NOT NULL` |

#### address

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| customer_user_id | `uuid NOT NULL` |
| recipient_name | `varchar NOT NULL` |
| phone | `varchar NOT NULL` |
| line1 | `varchar NOT NULL` |
| ward | `varchar NOT NULL` |
| district | `varchar NOT NULL` |
| city | `varchar NOT NULL` |
| is_default | `boolean NOT NULL` |
| status | `varchar NOT NULL` |

#### role

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| code | `varchar NOT NULL` |
| scope | `varchar NOT NULL` |
| status | `varchar NOT NULL` |

#### permission

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| code | `varchar NOT NULL` |
| resource | `varchar NOT NULL` |
| action | `varchar NOT NULL` |

#### role_permission

| Cột | Kiểu / null / default |
| --- | --- |
| role_id | `uuid NOT NULL` |
| permission_id | `uuid NOT NULL` |

#### user_role

| Cột | Kiểu / null / default |
| --- | --- |
| user_id | `uuid NOT NULL` |
| role_id | `uuid NOT NULL` |
| granted_at | `timestamptz NOT NULL` |

#### refresh_session

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| user_id | `uuid NOT NULL` |
| token_hash | `varchar NOT NULL` |
| expires_at | `timestamptz NOT NULL` |
| revoked_at | `timestamptz` |
| family_id | `uuid NOT NULL` |

#### one_time_token

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| user_id | `uuid NOT NULL` |
| purpose | `varchar NOT NULL` |
| token_hash | `varchar NOT NULL` |
| expires_at | `timestamptz NOT NULL` |
| consumed_at | `timestamptz` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### m3_audit

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| actor_user_id | `uuid` |
| target_type | `varchar NOT NULL` |
| target_id | `uuid NOT NULL` |
| action | `varchar NOT NULL` |
| reason | `text` |
| request_id | `varchar NOT NULL` |
| before_json | `jsonb DEFAULT '{}'::jsonb` |
| after_json | `jsonb DEFAULT '{}'::jsonb` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### store_application

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| applicant_user_id | `uuid NOT NULL` |
| proposed_name | `varchar NOT NULL` |
| contact | `varchar NOT NULL` |
| status | `varchar NOT NULL` |
| decision_reason | `text` |
| decided_by_user_id | `uuid` |
| submitted_at | `timestamptz NOT NULL DEFAULT now()` |
| decided_at | `timestamptz` |
| version | `integer NOT NULL DEFAULT 0` |

#### store

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| application_id | `uuid NOT NULL` |
| name | `varchar NOT NULL` |
| slug | `varchar NOT NULL` |
| description | `text` |
| logo_url | `varchar` |
| contact | `varchar NOT NULL` |
| shipping_fee_vnd | `bigint NOT NULL` |
| status | `varchar NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |

#### store_membership

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| store_id | `uuid NOT NULL` |
| user_id | `uuid NOT NULL` |
| role | `varchar NOT NULL` |
| status | `varchar NOT NULL` |
| joined_at | `timestamptz NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |

#### staff_invitation

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| store_id | `uuid NOT NULL` |
| invited_email | `varchar NOT NULL` |
| invited_user_id | `uuid` |
| invited_by_user_id | `uuid NOT NULL` |
| status | `varchar NOT NULL` |
| token_hash | `varchar NOT NULL` |
| expires_at | `timestamptz NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |

#### membership_permission

| Cột | Kiểu / null / default |
| --- | --- |
| membership_id | `uuid NOT NULL` |
| permission_id | `uuid NOT NULL` |
| granted_at | `timestamptz NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |

### M4 — ai-service

Migration: [001](../../backend/ai-service/migrations/001_initial.sql), [002](../../backend/ai-service/migrations/002_correlation_text.sql), [003](../../backend/ai-service/migrations/003_schema_baseline.sql).

#### chat_session

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| user_id | `uuid` |
| anonymous_key | `varchar` |
| status | `varchar NOT NULL` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### chat_message

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| session_id | `uuid NOT NULL` |
| role | `varchar NOT NULL` |
| content | `text NOT NULL` |
| product_refs | `jsonb DEFAULT '{}'::jsonb` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### search_history

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| user_id | `uuid NOT NULL` |
| query | `text NOT NULL` |
| created_at | `timestamptz NOT NULL DEFAULT now()` |

#### recommendation_interaction

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| user_id | `uuid NOT NULL` |
| product_id | `uuid NOT NULL` |
| event_id | `varchar NOT NULL` |
| event_type | `varchar NOT NULL` |
| weight | `integer NOT NULL` |
| occurred_at | `timestamptz NOT NULL` |

#### personalization_consent

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| user_id | `uuid NOT NULL` |
| status | `varchar NOT NULL` |
| source | `varchar NOT NULL` |
| changed_at | `timestamptz NOT NULL` |
| version | `integer NOT NULL DEFAULT 0` |

#### user_preference

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| user_id | `uuid NOT NULL` |
| profile_json | `jsonb NOT NULL DEFAULT '{}'::jsonb` |
| updated_at | `timestamptz NOT NULL` |

#### product_embedding

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| product_id | `uuid NOT NULL` |
| source_version | `integer NOT NULL` |
| vector | `vector(1536) NOT NULL` |
| status | `varchar NOT NULL` |
| updated_at | `timestamptz NOT NULL` |

#### model_version

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| algorithm | `varchar NOT NULL` |
| version | `varchar NOT NULL DEFAULT 0` |
| artifact_uri | `varchar NOT NULL` |
| status | `varchar NOT NULL` |
| trained_at | `timestamptz NOT NULL` |

#### training_run

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| model_version_id | `uuid NOT NULL` |
| dataset_version | `varchar NOT NULL` |
| split_spec | `jsonb NOT NULL DEFAULT '{}'::jsonb` |
| status | `varchar NOT NULL` |
| started_at | `timestamptz NOT NULL` |
| finished_at | `timestamptz` |

#### model_evaluation

| Cột | Kiểu / null / default |
| --- | --- |
| id | `uuid NOT NULL DEFAULT gen_random_uuid()` |
| training_run_id | `uuid NOT NULL` |
| baseline_name | `varchar NOT NULL` |
| k | `integer NOT NULL` |
| precision_at_k | `numeric NOT NULL` |
| recall_at_k | `numeric NOT NULL` |
| ndcg_at_k | `numeric NOT NULL` |
| evaluated_at | `timestamptz NOT NULL` |


## Kiểm chứng schema

`python scripts/check_database_schema.py` áp dụng toàn bộ migration trong schema tách biệt của một transaction và rollback sau kiểm tra, không reset database thành viên. Kiểm tra dữ liệu hợp lệ cùng 12 trường hợp bị chặn: trùng giỏ/variant, số lượng bằng 0, tổng tiền sai, Refund lệch Order, Variant lệch Store, hai variant mặc định, vượt tồn giữ, hai địa chỉ mặc định, địa chỉ ngừng dùng vẫn mặc định, Guest/Customer chat sai danh tính và interaction trùng. CI chạy bước này trước migration/seed ứng dụng.

Ngày 02/10/2026: migration 003 áp dụng thành công trên cả 4 database local đang có dữ liệu; kiểm tra schema mới và 12 invariant đều đạt. Đây là kiểm chứng schema, không là tuyên bố toàn bộ nghiệp vụ đã hoàn thành.

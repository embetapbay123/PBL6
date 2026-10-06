# Bàn giao nhánh tổng của Hoa

PR giữ lại: [#88](https://github.com/embetapbay123/PBL6/pull/88), nhánh [`feat/mob-03`](https://github.com/embetapbay123/PBL6/tree/feat/mob-03). Nhánh này chứa Cart, Voucher, Order, report và Mobile từ chuỗi PR #72–85, cộng MOB-03 mới nhất và `main` có QuoteVariants của Thịnh. #73 có Store Voucher trùng #74 nhưng lịch sử khác nhau; giữ CRUD và kiểm quyền membership hiện hành trong bản tổng. Các issue nghiệp vụ vẫn mở cho đến review, merge và nghiệm thu đầy đủ.

Đã đóng 14 PR #72–85 và xóa 14 nhánh cũ sau khi kiểm tra toàn bộ head commit là ancestor của nhánh tổng. Lịch sử vẫn có trong PR #88; các issue liên quan giao Hoa và giữ Review, không chuyển Done khi chỉ có một lát cắt.

## Phần có thể chạy

- Cart đọc/thêm/gộp/sửa/xóa dùng DB M2, quyền Customer và quote M1 thật. Khóa Cart trước Item để serialize hai lần add cùng Variant. `InteractionRecorded` ghi payload vào outbox; worker bọc đúng một envelope.
- Voucher Store/Admin CRUD có kiểm scope, version và audit cùng transaction. Usage đếm reservation chưa hết hạn và redemption, tránh đếm hai lần một purchase group; không giảm `usage_limit` để biểu diễn lượt đã dùng.
- Customer/Store/Admin đọc Order từ dữ liệu M2. Seller cần membership và permission tương ứng; role tổng không thay thế permission đã bị thu hồi. `VerifyReviewEligibility` chỉ cho M1 gọi, trả HTTP 200 và kiểm OrderItem/Customer/Product/trạng thái COMPLETED.
- Chuyển trạng thái Order giữ lock/version; PREPARING không được nhảy sang CONFIRMED. PENDING → CONFIRMED → PROCESSING → SHIPPED → COMPLETED đã chạy; PENDING phải là đơn đã consume kho qua checkout/payment. SHIPPED tạo Shipment mô phỏng, COMPLETED chuyển Shipment sang DELIVERED sau khi kiểm Payment SUCCEEDED và thu đủ tiền. Order/history/Shipment/audit/outbox cùng transaction; Shipment thiếu trả 409 và rollback. Mẫu COD gọi PaymentPort bằng cùng manager; không có writer tiền riêng trong OrderRepository.
- Mobile sửa route/DTO Auth, Address và consent, khôi phục phiên khi mở app, giữ phiên sau lỗi nghiệp vụ ở request retry. Catalog truyền category UUID/page; Product Detail tải lại trước mua. Giỏ hàng lấy giá hiển thị từ Catalog, item không lấy được giá không được chọn mua; tổng cuối cùng phải theo quote server.

## Contract và migration cần áp dụng

`POST /cart/items` nhận `product_id`, `variant_id`, `quantity`. M2 lấy Store từ Product M1 rồi kiểm Variant thuộc Product, không tin giá/Store từ client. Quantity tối đa 2147483647. Web/Flutter caller cần bổ sung Product ID; DTO, type và fixture generated đã đồng bộ, vẫn 99 public + 11 internal operation.

Chạy migration mới [`004_cart_product_reference.sql`](../../backend/commerce-service/migrations/004_cart_product_reference.sql). Migration 001–003 không đổi. `cart_item.product_id` nullable để giữ dữ liệu cũ; là tham chiếu logic sang M1, không tạo FK xuyên database. Item cũ thiếu Product ID cần xóa/thêm lại khi quote, không tự backfill ID giả. Add lại đúng Variant sẽ cập nhật mapping và cộng lượng theo tồn khả dụng.

## Phần chưa nghiệm thu và việc tiếp theo

| Issue / owner | Phần còn cần làm |
| --- | --- |
| [ORDER-01 #21](https://github.com/embetapbay123/PBL6/issues/21), [VOUCHER-03 #29](https://github.com/embetapbay123/PBL6/issues/29) — Hoa | Quote/validate dùng M1 price và M3 address/Store/shipping snapshot; cần [ID-LOOKUP-01 #45](https://github.com/embetapbay123/PBL6/issues/45) của Trí hoàn thiện ResolveCheckoutContext để demo thật. Quote lưu owner/hash/TTL 15 phút trong Redis. Quota đọc đã có; reservation/redemption lifecycle vẫn cần orchestration. |
| [ORDER-02 #22](https://github.com/embetapbay123/PBL6/issues/22) — Hoa | Confirm hiện trả 501 sau kiểm owner/hash/expiry, trước reserve/ghi DB. Hoàn thiện inventory reserve/consume/release của Thịnh, PaymentPort của Công, idempotency bền vững, snapshot và compensation rồi mới bật tạo Order thật. |
| [ORDER-04 #24](https://github.com/embetapbay123/PBL6/issues/24) — Hoa | Transition và Shipment mô phỏng đã hoàn thiện với lock/version/audit/rollback; orchestration hủy/release/restock/refund còn cần làm. Cancel hợp lệ hiện trả 501 trước ghi, không báo hủy thành công khi chưa hoàn tồn/tiền. |
| [ORDER-05 #25](https://github.com/embetapbay123/PBL6/issues/25) — Hoa, [PAY-04 #54](https://github.com/embetapbay123/PBL6/issues/54) — Công | Endpoint kiểm membership, SHIPPED/COD/version/amount rồi gọi port; PaymentService.recordCodCollection vẫn 501. Port phải ghi tiền/CODCollection/audit nguyên tử, xác nhận SUCCEEDED và thu đủ; lỗi rollback cả transaction. |
| [REPORT-01 #30](https://github.com/embetapbay123/PBL6/issues/30) — Hoa | Doanh thu COMPLETED trừ cả giảm Store/platform. Low-stock gọi ListLowStockVariants của Thịnh; tổng User/Store lấy từ API Admin M3 của Trí, không suy từ số người có Order. Dependency 501/503 truyền ra; không trả số liệu giả. |
| [MOB-01 #31](https://github.com/embetapbay123/PBL6/issues/31), [MOB-02 #32](https://github.com/embetapbay123/PBL6/issues/32), [MOB-03 #33](https://github.com/embetapbay123/PBL6/issues/33) — Hoa | Màn hình/client đã nối đúng contract; Auth/Profile/Address/consent/taxonomy còn phụ thuộc API owner. Form chỉ cho sửa trường được API hỗ trợ. Không coi widget test dùng mock là nghiệm thu thiết bị/API thật; checkout chưa có giao dịch thành công thật. |

Không gọi provider/network trong transaction M2, không query DB của M1/M3 và không tự retry command HTTP. Không bật fixture khi API lỗi; consent lỗi giữ trạng thái chưa tải, không mặc định GRANTED. Giữ Idempotency-Key qua retry cùng attempt; đổi address/payment/voucher phải bỏ quote cũ và lấy quote mới.

## Kiểm tra và chạy

```powershell
npm run contracts:drift
npm run docs:check
npm run contracts:check
npm run build:backend
npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/seed.js
npm run infra:up
python scripts/wait_local.py
python scripts/check_database_schema.py
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Flutter: `flutter analyze` và `flutter test` trong `mobile`; chạy emulator theo [README Mobile](../../mobile/README.md). Test regression kiểm concurrent Cart trên PostgreSQL, response UPDATE RETURNING, event schema, COD/Order state, review ownership và doanh thu giảm giá. Unit test kiểm quote/dependency lỗi, manager Payment, quota và không ghi dữ liệu khi feature còn 501. Test Mobile kiểm request thật qua Dio adapter; fixture/mock chỉ dùng trong test có chủ đích.

## Hoàn thiện phạm vi độc lập — 06/10/2026

Voucher trùng code khi tạo đồng thời trả 409 VOUCHER_CODE_EXISTS, không trả lỗi 500. Mobile giữ refresh token sau lỗi tạm thời, tải đủ giỏ nhiều trang, chặn quote hết hạn và response quote cũ, hiển thị lỗi địa chỉ với retry. Confirm 501 giữ màn hình checkout và Idempotency-Key của attempt. Các dependency M1 kho/low-stock của Thịnh, M3 lookup của Trí và Payment của Công giữ đúng owner; không đóng issue hoặc bật checkout thành công khi dependency chưa đạt.

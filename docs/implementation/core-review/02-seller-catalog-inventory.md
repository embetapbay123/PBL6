# 02 — Sản phẩm và tồn kho Seller

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Nháp/ACTIVE/STOPPED/HIDDEN, SKU/thuộc tính bắt buộc | PASS | catalog-write, variant-image, seller-products/attributes; DB unique/version/Store scope. |
| Biến thể thêm/sửa và bảo toàn toàn bộ set | PASS | createVariant, full replacement update, typed values và version conflict suites. |
| Xóa biến thể | N/A | Thiết kế hiện tại giữ lịch sử bằng STOPPED; không có API xóa variant để nghiệm thu. |
| Ảnh thêm/xóa/thứ tự và conflict | PASS | catalog-image unit/integration + seller-products browser. |
| Nhập kho, delta/reserved/history/idempotency | PASS | inventory ops/reservation/restock integration, fixture retry giữ operation ID. |
| Race giữ tồn và số lượng 0/1/nhiều | PASS | reservation integration có tổng demand/rollback; journeys kiểm tra hậu điều kiện quantity/reserved. |
| Kết quả tạo sản phẩm không chắc chắn | FAIL | CR-002; đồng thời cùng SKU được DB bảo vệ khỏi tạo trùng. |
| Bảng thao tác trên mobile | FAIL | CR-017 qua ảnh mới 390px. |

Lượt04 thêm22 nhiệm vụ UI-first trên1440/390, editor12variant thêm768/1024. Xem [báo cáo Seller](continuation-04-seller-catalog-stock.md). Các PASS kỹ thuật bên trên không phủ nhận CR-023/024/025, thiếu lý do ẩn UX-15 hoặc policy tồn S22 chưa rõ.

| Ca vận hành mới | Kết quả | Bằng chứng/giới hạn |
|---|---|---|
| Tạo nháp/12tổ hợp/sửa một giá/ảnh/dừng-mở | PASS phạm vi ca | UI fixture có trạng thái và đối chiếu HTTP phù hợp; không yêu cầu bulk, ảnh chỉ URL kiểm soát |
| Giá100500 ở form tạo | FRICTION | CR-023, UI/API thật; tạo nháp rồi sửa được |
| Nhập xong kiểm lịch sử | FRICTION | CR-024, UI/API thật; reload mới có movement |
| Nhận diện hàng kho với inventory-only/catalog300 | FAIL | CR-025 P1, UI/API thật; dòng chỉUUID, không đủ chọn đúng hàng |
| Hiểu lý do kiểm duyệt | FAIL | UX-15, audit córeason nhưng Seller projection/UI không có |
| Hiểu nghĩa tồn vật lý | POLICY_GAP | S22/POL-06; phép trừ quantity-reserved đúng, chưa chốt nghĩa quantity COD consume sớm |

## Phát hiện

- [CR-002](findings.md#cr-002) — Form tạo sản phẩm cho retry sau 503 mà chưa xác minh kết quả
- [CR-017](findings.md#cr-017) — Cột thao tác sticky che tên sản phẩm trên Seller mobile
- [CR-023](findings.md#cr-023) — Chặn giá nguyên VND hợp lệ ở form tạo
- [CR-024](findings.md#cr-024) — Lịch sử kho không cập nhật sau điều chỉnh
- [CR-025](findings.md#cr-025) — Màn kho không nhận ra món/SKU theo quyền và catalog
- [UX-15](usability-findings.md) — Seller thiếu lý do ẩn/đường khắc phục

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.

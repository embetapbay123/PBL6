# 07 — Đổi trả và hoàn tiền

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| EXCHANGE toàn vòng và ba vai trò | PASS | Real journey create→APPROVED→RECEIVED→EXCHANGE_SENT→Customer confirm; Admin đọc lại. |
| Ownership/version/lý do/retry tạo | PASS | returns integration/browser và backend replay cùng nội dung. |
| REFUND COD | FAIL | CR-006: API nhận yêu cầu nhưng không có luồng hoàn tất. |
| REFUND online đủ tiền/provider tắt/UNKNOWN | PASS | refund.runtime DB: controlled provider; enqueue/receipt/lookup/idempotency, không phải tiền thật. |
| Trạng thái đang chờ cập nhật UI | FAIL | CR-007. |
| Hoàn tiền online thật end-to-end | BLOCKED | Live worker chỉ DisabledRefundProvider. Không đánh dấu completed giả. |
| Nhập lại hàng trả/tồn kho hàng đổi | BLOCKED | Return service không nối stock movement trong luồng hiện có; chưa có quy tắc chất lượng hàng trả/nguồn hàng đổi để kết luận cách hạch toán đúng. |

Lượt05 S35 chấp thuận cónotequaUI nhưng nơi gửi/phíPOL-02chưa chốt. S36 điEXCHANGE RECEIVED→ghi reference thủcông→EXCHANGE_SENT/biếtchờkhách; CODREFUNDRECEIVEDchưa cóxácnhận bịdisabledđúng. Không nângS36PASS vì backendCODadapter vẫnCR-006; không đếm guard chốngfakehoàn thành bug. Xem [lượt05](continuation-05-seller-orders-operations.md).

## Phát hiện

- [CR-006](findings.md#cr-006) — Cho gửi REFUND cho đơn COD nhưng luồng không thể hoàn tất
- [CR-007](findings.md#cr-007) — Trạng thái refund đang chờ không có cách cập nhật tại màn đổi trả

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.

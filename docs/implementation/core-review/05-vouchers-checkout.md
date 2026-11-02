# 05 — Voucher và checkout

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Voucher thời hạn/min/cap/quota/scope | PASS | voucher unit/lifecycle/commerce integration, real journey store voucher. |
| Sửa/mở lại voucher từ UI | FAIL | CR-013; API đã có khả năng update. |
| Nhiều Store, tổng/discount/shipping/rounding | PASS | order/voucher unit, HTTP/DB journey đối chiếu tổng quote với batch. |
| Mixed COD/online và input thay đổi | PASS | Browser fixture live-market; không coi là online provider thật. |
| Đổi địa chỉ/payment/voucher; quote hết hạn | PASS | customer/live-market/order-recovery test xác nhận quote stale và fingerprint. |
| Confirm hai lần/reload/503/lost response | PASS | order-recovery DB với internal adapter và browser body/key; real journey same key cùng order IDs. |
| Quota race và release khi hủy/expire | PASS | voucher-lifecycle và order-recovery integration. |
| Dòng giá sau QUOTE_CHANGED | FAIL | CR-022 lượt 03 UI/API thật hai viewport: tổng mới 110.000đ nhưng dòng vẫn 100.000đ; reload mới đồng bộ. Backend từ chối quote cũ đúng. |

Các PASS bảng trên giới hạn theo test kỹ thuật, không chốt chính sách phục hồi lượt voucher. C49 vẫn POLICY_GAP POL-03. Lượt 03 X10/X11 xác minh thêm hai confirm cùng key chỉ một order thật, X14 hai Customer tranh tồn 1 chỉ một winner, X15 xóa địa chỉ sau quote trả 404 và không tạo đơn. X03/X06 draft trước confirm mất khi reload/rời màn; attempt đã gửi nhưng chưa rõ kết quả vẫn giữ body/key ở X10. Xem [lượt 03](continuation-03-auth-aftersales.md).

Lượt05 S37 tạo/đọc điều kiện/thời hạn/counters bằng UIhai viewport; usage là sự kiệnfixturemôphỏng, không phải giao dịchDBmới. S38 đi dừng→STOPPED nhưng thiếueditor/reactivation, giữFAILCR-013. Không coi tạo mã mới là mở lại mãcũ; policy phục hồi lượt khi hủy vẫnPOL-03.

## Phát hiện

- [CR-013](findings.md#cr-013) — Voucher thiếu thao tác sửa và mở lại
- [CR-022](findings.md#cr-022) — Dòng giá checkout còn cũ sau báo giá thay đổi

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.

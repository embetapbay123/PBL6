# 06 — Đơn hàng và thanh toán

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Lịch sử/chi tiết/batch và sở hữu | PASS | orders browser, payment/commerce integration; real journey read Customer/Admin. |
| Seller state machine và quyền COD | PASS | commerce-regression/payment tests; real journey từ PENDING tới COMPLETED, chặn unpaid. |
| Hủy trước/sau tiền, release/restock/recovery | PASS | order-recovery và inventory-restock DB; payment callbacks integration. |
| QR/PENDING/FAILED/UNKNOWN/expiry | PASS | payment browser fixtures; payment foundation/callback DB. |
| Callback trùng/muộn/sai tiền | PASS | payment.callback integration với adapter/kernel có kiểm soát. |
| Lối tắt tới thao tác | FAIL | CR-009. |
| Thanh toán/đối soát qua provider thật | BLOCKED | Provider runtime disabled; không chuyển tiền thật. |

Lượt05 S26/S29/S30/S32/S33/S34 bổ sung UIhai viewport: xácnhận/hủy đúngID/version, đóngdialog giữtrang2, checkboxCODđúngtổng270000,503khôngfake success và đọc lại trước retry. Bàn giaoS31 thiếuaddressUX-03; nhân viênthiếuCODkhông hiểu vìsaonútCOMPLETEDdisabledUX-12. Guard được giữ, không kết luận đã thu/giao vật lý. Xem [lượt05](continuation-05-seller-orders-operations.md).

## Phát hiện

Lượt 03 mở rộng walkthrough Customer: C44 tìm đúng đơn cần trả bằng dò trang (FRICTION), C45 thiếu chỉ dẫn đang chờ ai (UX-12), C46 thiếu dữ liệu giao/timeline (UX-03/OP-03). C49 hủy COD và tồn được xác minh thật nhưng chính sách lượt voucher còn POL-03; C50 hủy–đặt lại trước bàn giao được, SHIPPED không có hủy/sửa trực tiếp. Không tự đòi chức năng đổi số lượng sau đặt. X18 giữ lý do khi 409 rồi đọc lại PROCESSING bỏ nút hủy. Xem [lượt 03](continuation-03-auth-aftersales.md).

- [CR-009](findings.md#cr-009) — Lối tắt Hủy đơn/Đổi trả/Đánh giá không cuộn tới form

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.

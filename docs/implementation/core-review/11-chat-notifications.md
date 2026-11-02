# 11 — Chat và thông báo

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Hai phiên Customer–Seller/lịch sử reload | PASS | messaging-live browser hiện tại qua với API thật. |
| Participant/Store scope và thu hồi quyền | PASS | messaging integration HTTP/DB gồm foreign thread và member đổi role. |
| Gửi trùng/lost response/retry cùng ID | PASS | messaging fixture + integration backend replay/conflicting content. |
| Widget/full-page draft/close/minimize/send pending | PASS | messaging/ai-widgets browser tests hiện tại. |
| Polling hoạt động và tab ẩn | PASS | Query enabled/refetchInterval + visibility guard trong ChatCenter; toàn trang dùng mặc định React Query background polling off. |
| Thông báo đúng user/order/read/link | PASS | notifications integration/browser; real journey có order và return events. |
| Bàn phím mobile vật lý và realtime transport | BLOCKED | Chỉ desktop Edge giả viewport; hệ thống dùng polling, không nghiệm thu realtime push. |

Lượt05 S41 Seller từchatLan cómãđơn→menuĐơn hàngkiểm→quaychatLanreply đúngStore/conversation; FRICTIONUX-07 vìtựchép/nghĩ ngữcảnhđơn. Tin nhắn chỉfixture; không gửi người thật hay suy thêmnghiệmthu transportrealtime.

## Phát hiện

Lượt 03 C47 đi đơn → sản phẩm → chat đúng Store, tự chép mã đơn vào nội dung; làm được với vòng tránh, nối UX-07. Tin nhắn chỉ gửi trong fixture. C48 UI hai viewport đọc/đánh dấu/link đúng đơn; API thật A đọc notification của đơn riêng được, B mark read nhận 404, A đọc lại read=true. Không dùng ca này tuyên bố đã chạy thêm toàn bộ hai phiên Seller–Customer bằng runtime.

Chưa ghi nhận bug mới đủ bằng chứng trong phạm vi đã chạy; vẫn còn giới hạn được nêu ở bảng.

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.

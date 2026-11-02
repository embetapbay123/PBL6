# Nghiệm thu UI marketplace chuyên nghiệp — 29/10/2026

## Kết quả triển khai

UI Customer, Seller và Admin dùng graphite/cam trầm và Be Vietnam Pro tự lưu trữ (kèm OFL). Storefront ưu tiên catalog/danh mục/sản phẩm; trang tài khoản có sidebar; Seller/Admin dùng shell riêng, sidebar thu gọn và menu thao tác. Admin taxonomy, thuộc tính, kiểm duyệt sản phẩm và đánh giá đã tách thành mục con.

Chat dùng chung lớp dữ liệu giữa widget và trang Tin nhắn, có ba trạng thái đóng/mở/thu nhỏ; có nút X, thu nhỏ, mở trang Tin nhắn; chuyển AI/Gian hàng và điều hướng bằng bàn phím. Draft, pending và client_message_id được giữ trong scope phiên, không ghi nội dung chat vào localStorage. Đóng khung lúc gửi không tự gửi lại. Guest không gọi hội thoại riêng tư; Seller portal không có widget mua sắm; Admin không có chat Customer. Native dialog mobile và visualViewport hỗ trợ bố cục khi bàn phím mở.

Giỏ hàng nhóm theo Store; checkout và giỏ hàng có thanh thao tác mobile. Nhãn Store dùng API public profile; không hiển thị UUID trong phần nhãn gian hàng mua sắm. Quote, idempotency, quyền và version giữ nguyên. Thành phần chung gồm Modal/Drawer, ActionMenu native popover, FormField, Toast và PurchaseActionBar; trạng thái bảng/form dùng hệ token chung.

Hai stylesheet ghi đè cũ đã bỏ khỏi source đang chạy; bản sao được giữ tại `artifacts/previous-ui-styles/`. UI legacy và API tools chỉ truy cập trong development; production không cho query mode bật lại UI giao dịch giả.

Một lỗi backend phát hiện qua QA đã sửa: GET lời mời Customer và lời mời nhân viên dùng DTO contract được sinh sẵn, chuẩn hóa số từ query string thay vì DTO IsInt chưa chuyển kiểu gây 422.

Ma trận route, quyền, thao tác, API và cách xử lý lỗi: [Ma trận UI](ui-marketplace-action-matrix.md).

## Bằng chứng kiểm tra

- `npm run build`: TypeScript/Vite production build thành công. Font phục vụ local, không dùng Google Fonts runtime.
- Image backend `pbl6-node:fe-verify` build thành công, bao gồm tsc toàn backend. Chỉ M3 của stack test riêng được cập nhật để xác minh sửa DTO.
- OpenAPI public/internal: kiểm tra hợp lệ bằng `node scripts/check_openapi.mjs`; không thay đổi public wire contract.
- Jest `backend/tests/unit/staff-query.test.ts`: **2 passed**; kiểm tra handler dùng generated DTO, chuỗi số hợp lệ chuyển thành số và phân trang không hợp lệ bị từ chối.
- Playwright toàn bộ với `E2E_REAL_MESSAGING=1`: **110 passed, 2 skipped** / 112 test. Hai skip thuộc fixture mode, không được coi là đã chạy.
- Hồi quy phần thay đổi nhiều nhất trước lượt toàn bộ: **56 passed**, bao gồm trao đổi tin Customer–Seller thật và ảnh checkout fixture.
- API thật: **37 route/trạng thái × 4 viewport = 148 tổ hợp** ở 1440/1024/768/390px; 0 tràn ngang, 0 alert bất thường, 0 pageerror/console error, 0 requestfailed trong lượt cuối.
- Chat: ảnh mở/thu nhỏ ở bốn viewport; kiểm tra focus sau đóng đều đúng; test modal mobile, Guest/private requests, giữ draft qua route/full page, đóng lúc gửi AI và Store đều đạt.
- Checkout có dữ liệu fixture được chụp ở bốn viewport, kiểm tra không tràn ngang; tests giữ quote/body/key sau 503 và chặn quote cũ vẫn đạt.
- `git diff --check`: không có lỗi whitespace; có cảnh báo CRLF/LF thông thường.

## Artifact và cách chạy

- Preview API thật: `http://127.0.0.1:3109/` → gateway riêng `http://127.0.0.1:18080`.
- Ảnh Customer/Seller/Admin và JSON: `artifacts/ui-review/`, `responsive-report.json`.
- Ảnh chat/checkout: `artifacts/ui-professional/`; file `checkout-fixture-*.png` là HTTP fixture có kiểm tra request/response, không phải giao dịch provider thật.
- Scripts kiểm tra ảnh: `artifacts/verify-professional-all.mjs`, `artifacts/verify-chat-visual.mjs`.
- E2E: đặt `WEB_TEST_URL=http://127.0.0.1:3109`, `PLAYWRIGHT_CHANNEL=msedge`; chỉ bật `E2E_REAL_MESSAGING=1` trên môi trường test riêng vì test ghi tin nhắn.

## Ranh giới nghiệm thu

Ảnh chính dùng dữ liệu/API thật của stack `pbl6-fe-verify`. Seed có sản phẩm thiếu ảnh được hiển thị đúng trạng thái thiếu ảnh; không tự bổ sung dữ liệu bán hàng giả. Các lỗi provider, payment, checkout bất định được kiểm thử bằng HTTP fixture; không xác nhận đã tích hợp provider thanh toán/email/hoàn tiền/AI bên ngoài trong đợt UI này.

Viewport/touch layout được kiểm tra trên Edge automation; chưa nghiệm thu trên thiết bị iOS/Android vật lý. Chưa phát hành thay đổi vào stack dùng chung.

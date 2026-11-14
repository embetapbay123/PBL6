# Frontend thử đồ AI

Ngày: 13/11/2026.

## Đã triển khai

- Nút “Thử với ảnh của bạn” trong trang chi tiết áo/quần, bên dưới phân loại đang chọn. Nhận diện nhóm sản phẩm ở FE chỉ quyết định hiển thị; backend phải kiểm tra điều kiện chính thức.
- Hộp thoại riêng cho desktop/tablet, toàn màn hình trên mobile. Ảnh cá nhân là vùng chính; sản phẩm đúng phân loại và hạn mức nằm bên cạnh hoặc bên dưới.
- Chọn/kéo thả một ảnh JPEG/PNG/WebP, tối đa 8 MiB, kiểm tra giải mã và kích thước từ 256 px mỗi chiều, tối đa 24 megapixel. Backend vẫn phải kiểm tra lại file thực tế.
- Xem trước bằng object URL; không upload khi chọn ảnh. Upload chỉ sau khi bấm tạo và đồng ý gửi ảnh theo thông tin server trả về.
- Trạng thái chờ/đang tạo/chưa rõ kết quả/lỗi/hết lượt/chưa sẵn sàng; xem ảnh gốc/kết quả, xóa kết quả và thêm đúng lựa chọn hiện tại vào giỏ.
- Chống double-click bằng khóa phía client; mutation không tự retry. Giữ khóa yêu cầu chưa rõ trong sessionStorage theo user/product/variant, chỉ lưu metadata, không lưu ảnh hoặc key API.
- Mở lại hộp thoại đọc tác vụ từ server; signed URL và query cache được xóa khi unmount, preview được revoke. Ứng dụng hiện có tự remount toàn bộ query scope khi logout/đổi danh tính.
- Dùng modal native sẵn có, focus trap, Escape, focus trả về nút mở và reduced motion.
- Loại bỏ luồng Google/Imagen/Pollinations và chuỗi khóa nhúng khỏi bản nháp. Không có lời gọi model từ browser.

## Điểm nối backend

BE đã triển khai sau bản FE đầu tiên. Bản ngày 14/11 bổ sung ô mật khẩu demo khi backend yêu cầu: nhập lại cho mỗi lần tạo ảnh, xóa sau khi gửi, không lưu trong browser storage. Khóa OpenAI cấu hình riêng ở backend; ngân sách 1 USD/ngày, 10 USD/tháng. Xem [hướng dẫn backend](../../backend/ai-service/app/try_on/README.md).

Adapter: `frontend/src/api/try-on.ts`. Luồng trạng thái: `frontend/src/features/customer/useTryOnSession.ts`.

- `/api/v1/ai/try-on/capabilities` phải trả `enabled`, `quota.remaining/limit/reset_at`, `consent_version`, `privacy.provider_label/retention_hours`.
- `GET /jobs?product_id=...&variant_id=...` trả `{items: [...]}` theo thời gian mới nhất trước; mỗi job phải có đúng product/variant ID và trạng thái theo type.
- Tác vụ cần trả `idempotency_key` để đối soát lần gửi chưa có acknowledgement. `POST /jobs` nhận header `Idempotency-Key` và photo/product/variant ID + consent version.
- `POST /photos` nhận multipart field `photo`, trả `{id}`. Shared authenticated client đã hỗ trợ FormData và để browser tạo multipart boundary.
- `GET /jobs/{id}` trả trạng thái; FE polling GET cho QUEUED/PROCESSING. UNKNOWN chỉ được kiểm tra, không tự tạo lại.
- Tác vụ SUCCEEDED trả `result_url` là URL ký có thời hạn, tải được bằng img mà không đưa bearer token vào URL, và `expires_at`. URL phải là HTTPS hoặc cùng origin; hết hạn thì ngừng hiển thị.
- `DELETE /jobs/{id}` xóa kết quả của chính chủ.
- Quota, ngân sách, ownership, chống trùng và thời hạn lưu phải được thực thi ở backend. FE không cung cấp biện pháp bảo vệ chi phí thay backend.
- Endpoint chưa có hoặc dữ liệu capabilities không hợp lệ: FE chặn tạo và báo chưa sẵn sàng, không bịa số lượt. Giao diện vẫn xem trước được ảnh cục bộ.

OpenAPI và generated types/runtime contracts đã được cập nhật cùng BE. Kiểm thử provider dùng transport giả; quyền model, độ đúng ảnh và chi phí thực tế chưa được nghiệm thu bằng khóa thật.

## Kiểm chứng

- `npm --prefix frontend run build`: đạt; còn cảnh báo kích thước main chunk sẵn có, modal mới được lazy load.
- 11 test mới trong `frontend/tests/virtual-try-on.spec.ts`: bố cục 1440/1366/768/390 px, keyboard/focus, ảnh cục bộ và consent, multipart/auth, chống trùng, kết quả/so sánh/xóa, thiếu backend, hết quota, timeout/mở lại, guest/file không hợp lệ, sản phẩm ngoài phạm vi, logout từ tab khác.
- Hai test hồi quy chi tiết sản phẩm trong `product-store-identity.spec.ts`: tên gian hàng/khôi phục và thứ tự trục phân loại đều đạt.
- Tổng lượt chạy cuối: 13/13 đạt, dùng HTTP fixtures; không gọi model trả phí.
- Một test danh sách cùng tên trong file hồi quy cũ thất bại do kỳ vọng href `/products/{id}` trong khi workspace đã dùng `/products/{id}?variant={id}` ở ProductCardActions. Không sửa hành vi hoặc test ngoài phạm vi này.
- Kiểm tra thêm luồng guest với catalog local thật; deploy bằng `scripts/deploy-demo-web.ps1` trả `DEPLOY_OK`, public smoke check của script đạt.
- Kiểm tra trực tiếp demo sau deploy ở 1366×768 và 390×844: mở/đóng phòng thử, focus/không tràn ngang, ảnh sản phẩm tải thành công, không có page error. Báo cáo: `outputs/virtual-try-on-frontend/public-smoke.json`; ảnh: `demo-desktop.png` và `demo-mobile.png` trong cùng thư mục.

Lệnh chạy bộ kiểm tra liên quan:

```powershell
$env:WEB_TEST_URL='http://127.0.0.1:3000'
node frontend/node_modules/@playwright/test/cli.js test --config frontend/playwright.config.ts frontend/tests/virtual-try-on.spec.ts frontend/tests/product-store-identity.spec.ts --grep 'try-on|photo stays|unavailable backend|exhausted quota|uncertain submission|guest can|unrelated product|signing out|detail Store|variant label'
```

Ảnh QA được Playwright ghi trong `frontend/test-results`; ảnh luồng thật và demo nằm tại `outputs/virtual-try-on-frontend`.

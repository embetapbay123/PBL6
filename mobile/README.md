# Customer Android — Hoa

Flutter / Riverpod / Dio. Màn Auth, Profile, Address, Catalog, consent, Cart và checkout đã có client theo [OpenAPI](../docs/contracts/openapi.json). Chưa nghiệm thu toàn bộ luồng bằng API thật hoặc thiết bị Android; xem [bản tổng Hoa và dependency](../docs/implementation/hoa-consolidated-handoff.md).

## File và điểm nối

- `lib/core/api_client.dart`: Bearer token, mutex refresh khi 401, secure storage, request đúng contract. Request retry gặp lỗi nghiệp vụ không xóa phiên mới. `main.dart` khôi phục refresh token trước khi mở màn hình.
- Auth: forgot gọi `POST /auth/reset-password`, confirm reset gọi `POST /auth/reset-password/confirm`; change dùng `current_password`. Register chỉ gửi email/password/display_name; sửa số điện thoại qua Profile. Profile không cung cấp sửa avatar vì contract chưa hỗ trợ.
- Address dùng `city`, `line1`; đổi default bằng `PATCH /me/addresses/{id}` với `is_default=true`.
- Catalog gửi `q`, category UUID, page/size. Product Detail tải dữ liệu hiện tại; thêm giỏ gửi Product ID và Variant ID. Taxonomy/filter/review/related còn phụ thuộc M1 owner; empty fallback ở section phụ chưa phải nghiệm thu dữ liệu.
- Consent gọi `/me/personalization-consent`; tải lỗi giữ trạng thái chưa biết và có retry, không mặc định GRANTED. Recommendation lỗi không sinh danh sách fixture/baseline thành công.
- Cart gom Store, lấy title/SKU/giá từ M1 qua Product ID. Item legacy hoặc Catalog lỗi hiện chưa có giá và không cho chọn mua; có thể xóa và thêm lại. Tổng giỏ chỉ tạm tính, số tiền checkout lấy từ quote server.
- Checkout dùng `/checkout/quotes` và `/orders/batches`, giữ Idempotency-Key khi retry cùng attempt. Đổi address/payment/voucher phải lấy quote mới. Confirm server còn 501; màn thành công chỉ mở khi API confirm thực sự thành công. Mock success trong widget test chưa chứng minh đã thu tiền/giữ kho.
- `lib/core/contract_fixtures.dart` chỉ đọc bộ JSON chung khi bật `USE_CONTRACT_FIXTURES` rõ ràng; không tự bật khi API lỗi, chặn fixture checkout/payment.

## Chạy và kiểm thử

Trong `mobile`:

```powershell
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

Android emulator dùng `10.0.2.2` để gọi gateway máy host. Máy thật cần thiết bị cùng mạng và base URL của host. Backend setup/migration/seed theo [README gốc](../README.md), gồm migration M2 004 mới.

`test/api_contract_test.dart` ghi request qua Dio adapter để kiểm route/key/consent/refresh/Cart mapping. `test/widget_test.dart` dùng provider/client mock có chủ đích để kiểm màn hình. Auth/Profile/Address/consent và Checkout còn dependency chưa triển khai đầy đủ; cần demo thật trước khi đóng MOB-01/02/03.

Release build khi có môi trường demo:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://demo.example.com/api/v1
```

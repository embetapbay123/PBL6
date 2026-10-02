# Customer Android starter — Hoa

Flutter/Riverpod/Dio, login/profile/catalog mẫu gọi API thật. Cart/Order/Chat đang là màn pending. Refresh token lưu secure storage; access token trong memory; refresh một lần khi 401.

```powershell
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

Android emulator dùng 10.0.2.2 để gọi gateway máy host. Máy thật cần gateway bind địa chỉ phù hợp, thiết bị cùng mạng và base URL của host. Local debug cho cleartext; release dùng HTTPS:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://demo.example.com/api/v1
```

Thay domain bằng môi trường thực. Máy bàn giao hiện chưa có Android SDK; analyze/test đã chạy, chưa build APK hoặc kiểm thiết bị. Cài SDK/emulator và chấp nhận license trước khi build.

Code hiện tập trung ở main.dart/core để đọc mẫu. Khi mở rộng, Hoa tách `features/auth`, `catalog`, `cart`, `checkout`, `order`, `profile`, `review`, `chat` theo module, bổ sung typed models, provider/repository và widget. Payload theo [OpenAPI](../docs/contracts/openapi.json), không tính giá/tồn/quyền trên client. Test đang là widget/utility mẫu, chưa đại diện e2e Android. Xem [backlog](../docs/implementation/member-backlog.md).

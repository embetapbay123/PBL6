# Customer Android — Hoa

Flutter / Riverpod / Dio ứng dụng Customer Android. Đã hoàn thiện toàn bộ luồng Auth, Profile, Address và Quản lý phiên theo hợp đồng [OpenAPI](../docs/contracts/openapi.json).

## Cấu trúc Module

- `lib/core/`
  - `api_client.dart`: Dio HTTP Client, tự động gắn Bearer Token, cơ chế retry khi gặp lỗi 401 với mutex refresh token tránh race condition, lưu `refresh_token` trong `FlutterSecureStorage`, `access_token` trong memory.
  - `contract_fixtures.dart`: Tải dữ liệu mock fixture theo schema contract khi cần test offline.
- `lib/features/auth/`
  - `login_page.dart`: Đăng nhập tài khoản (`POST /auth/login`).
  - `register_page.dart`: Đăng ký tài khoản (`POST /auth/register`).
  - `verify_email_page.dart`: Xác minh tài khoản qua email token (`POST /auth/verify-email`).
  - `forgot_password_page.dart`: Quên & đặt lại mật khẩu (`POST /auth/forgot-password`, `POST /auth/reset-password`).
  - `change_password_page.dart`: Đổi mật khẩu (`POST /auth/change-password`).
- `lib/features/profile/`
  - `profile_page.dart`: Xem thông tin cá nhân (`GET /me`) & điều hướng.
  - `edit_profile_page.dart`: Cập nhật thông tin cá nhân (`PATCH /me`).
- `lib/features/address/`
  - `address_list_page.dart`: Danh sách địa chỉ nhận hàng (`GET /me/addresses`), đặt mặc định (`PATCH /me/addresses/{id}/default`), xóa (`DELETE /me/addresses/{id}`).
  - `address_form_page.dart`: Thêm mới & chỉnh sửa địa chỉ (`POST /me/addresses`, `PATCH /me/addresses/{id}`).
- `lib/main.dart`: Thiết lập Routing, Drawer navigation, Riverpod Providers, Theme Material 3.

## Lệnh kiểm thử và chạy

```powershell
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

Android emulator dùng `10.0.2.2` để gọi gateway máy host. Máy thật cần gateway bind địa chỉ phù hợp, thiết bị cùng mạng và base URL của host.
Release build:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://demo.example.com/api/v1
```

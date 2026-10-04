import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pbl6_mobile/core/api_client.dart';
import 'package:pbl6_mobile/features/address/address_form_page.dart';
import 'package:pbl6_mobile/features/address/address_list_page.dart';
import 'package:pbl6_mobile/features/auth/change_password_page.dart';
import 'package:pbl6_mobile/features/auth/forgot_password_page.dart';
import 'package:pbl6_mobile/features/auth/login_page.dart';
import 'package:pbl6_mobile/features/auth/register_page.dart';
import 'package:pbl6_mobile/features/auth/verify_email_page.dart';
import 'package:pbl6_mobile/features/profile/edit_profile_page.dart';
import 'package:pbl6_mobile/features/profile/profile_page.dart';
import 'package:pbl6_mobile/main.dart';

void main() {
  group('Pending and Utility Tests', () {
    testWidgets('Pending screens disclose unfinished behavior', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: PendingPage('Cart')));
      expect(find.text('Cart'), findsNWidgets(2));
      expect(find.text('Khung module — nghiệp vụ chờ triển khai trong các task tiếp theo.'), findsOneWidget);
    });

    test('Useful unauthenticated message', () {
      expect(errorMessage(StateError('Vui lòng đăng nhập.')), contains('Vui lòng đăng nhập'));
    });
  });

  group('Authentication Screen Tests', () {
    testWidgets('LoginPage renders email, password fields and login button', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: LoginPage()),
        ),
      );

      expect(find.text('Đăng nhập'), findsWidgets);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Mật khẩu'), findsOneWidget);
      expect(find.text('Quên mật khẩu?'), findsOneWidget);
      expect(find.text('Đăng ký ngay'), findsOneWidget);
    });

    testWidgets('RegisterPage renders all input fields and validation', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: RegisterPage()),
        ),
      );

      expect(find.text('Đăng ký tài khoản'), findsOneWidget);
      expect(find.text('Họ và tên *'), findsOneWidget);
      expect(find.text('Email *'), findsOneWidget);
      expect(find.text('Mật khẩu *'), findsOneWidget);
      expect(find.text('Xác nhận mật khẩu *'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Đăng ký'));
      await tester.pump();

      expect(find.text('Vui lòng nhập họ và tên.'), findsOneWidget);
    });

    testWidgets('VerifyEmailPage renders token input and verify button', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: VerifyEmailPage()),
        ),
      );

      expect(find.text('Xác minh Email'), findsOneWidget);
      expect(find.text('Mã xác minh (Token) *'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Xác minh'), findsOneWidget);
    });

    testWidgets('ForgotPasswordPage toggles between forgot email and reset password modes', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: ForgotPasswordPage()),
        ),
      );

      expect(find.text('Quên mật khẩu'), findsOneWidget);
      expect(find.text('Email đã đăng ký *'), findsOneWidget);

      // Switch to reset mode
      await tester.tap(find.text('Đã có mã xác nhận? Đặt lại mật khẩu ngay'));
      await tester.pump();

      expect(find.text('Đặt lại mật khẩu'), findsOneWidget);
      expect(find.text('Mã xác nhận (Token) *'), findsOneWidget);
      expect(find.text('Mật khẩu mới *'), findsOneWidget);
    });

    testWidgets('ChangePasswordPage renders password input fields', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: ChangePasswordPage()),
        ),
      );

      expect(find.text('Đổi mật khẩu'), findsOneWidget);
      expect(find.text('Mật khẩu hiện tại *'), findsOneWidget);
      expect(find.text('Mật khẩu mới *'), findsOneWidget);
      expect(find.text('Xác nhận mật khẩu mới *'), findsOneWidget);
    });
  });

  group('Profile and Address Screen Tests', () {
    testWidgets('ProfilePage displays profile data correctly', (tester) async {
      final container = ProviderContainer(
        overrides: [
          profileProvider.overrideWith((ref) async => {
                'email': 'user@example.com',
                'display_name': 'Nguyễn Văn A',
                'phone': '0901234567',
                'roles': ['CUSTOMER'],
              }),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: ProfilePage()),
        ),
      );
      await tester.pump();

      expect(find.text('Hồ sơ của tôi'), findsOneWidget);
      expect(find.text('Nguyễn Văn A'), findsOneWidget);
      expect(find.text('user@example.com'), findsOneWidget);
      expect(find.text('CUSTOMER'), findsOneWidget);
      expect(find.text('Sổ địa chỉ nhận hàng'), findsOneWidget);
      expect(find.text('Đổi mật khẩu'), findsOneWidget);
    });

    testWidgets('EditProfilePage pre-fills initial values', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: EditProfilePage(
              initialProfile: {
                'display_name': 'Trần Thị B',
                'phone': '0912345678',
              },
            ),
          ),
        ),
      );

      expect(find.text('Chỉnh sửa hồ sơ'), findsOneWidget);
      expect(find.text('Trần Thị B'), findsOneWidget);
      expect(find.text('0912345678'), findsOneWidget);
    });

    testWidgets('AddressListPage displays empty and list states', (tester) async {
      final emptyContainer = ProviderContainer(
        overrides: [
          addressListProvider.overrideWith((ref) async => []),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: emptyContainer,
          child: const MaterialApp(home: AddressListPage()),
        ),
      );
      await tester.pump();

      expect(find.text('Sổ địa chỉ nhận hàng'), findsOneWidget);
      expect(find.text('Bạn chưa có địa chỉ nhận hàng nào'), findsOneWidget);

      final listContainer = ProviderContainer(
        overrides: [
          addressListProvider.overrideWith((ref) async => [
                {
                  'id': 'addr-1',
                  'recipient_name': 'Lê Văn C',
                  'phone': '0987654321',
                  'street': '456 Hoàng Diệu',
                  'ward': 'Hải Châu 2',
                  'district': 'Hải Châu',
                  'province': 'Đà Nẵng',
                  'is_default': true,
                },
              ]),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: listContainer,
          child: const MaterialApp(home: AddressListPage()),
        ),
      );
      await tester.pump();

      expect(find.text('Lê Văn C'), findsOneWidget);
      expect(find.text('(0987654321)'), findsOneWidget);
      expect(find.text('Mặc định'), findsOneWidget);
    });

    testWidgets('AddressFormPage validates required fields', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: AddressFormPage()),
        ),
      );

      expect(find.text('Thêm địa chỉ mới'), findsOneWidget);
      expect(find.text('Tên người nhận *'), findsOneWidget);
      expect(find.text('Số điện thoại *'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Tạo địa chỉ'));
      await tester.pump();

      expect(find.text('Vui lòng nhập tên người nhận.'), findsOneWidget);
    });
  });

  group('ApiClient Unit Tests', () {
    test('ApiClient initializes properly', () {
      final client = ApiClient(baseUrl: 'http://localhost:8080/api/v1');
      expect(client.isAuthenticated, isFalse);
      client.setAccessTokenForTesting('mock-token');
      expect(client.isAuthenticated, isTrue);
    });
  });
}

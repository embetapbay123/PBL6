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
import 'package:pbl6_mobile/features/catalog/catalog_page.dart';
import 'package:pbl6_mobile/features/catalog/consent_dialog.dart';
import 'package:pbl6_mobile/features/catalog/product_detail_page.dart';
import 'package:pbl6_mobile/features/profile/edit_profile_page.dart';
import 'package:pbl6_mobile/features/profile/profile_page.dart';
import 'package:pbl6_mobile/main.dart';

class MockApiClient extends ApiClient {
  @override
  Future<Map<String, dynamic>> getPersonalizationConsent() async => {'status': 'GRANTED', 'version': 1};

  @override
  Future<Map<String, dynamic>> updatePersonalizationConsent(String status, int expectedVersion) async => {
        'status': status,
        'version': expectedVersion + 1,
      };

  @override
  Future<Map<String, dynamic>> getProduct(String id) async => {
        'id': id,
        'title': 'Bàn phím cơ không dây Bluetooth',
        'description': 'Bàn phím cơ switch Red êm ái, pin 4000mAh',
        'attributes': {'Hãng': 'PBL Tech', 'Bảo hành': '12 tháng'},
        'variants': [
          {'id': 'v-red', 'sku': 'KB-RED', 'price_vnd': '1200000'},
          {'id': 'v-blue', 'sku': 'KB-BLUE', 'price_vnd': '1250000'},
        ],
      };

  @override
  Future<List<Map<String, dynamic>>> getProductReviews(String productId, {int page = 1, int size = 20}) async => [
        {'id': 'rev-1', 'rating': 5, 'body': 'Sản phẩm gõ rất êm!'},
      ];

  @override
  Future<List<Map<String, dynamic>>> getRelatedProducts(String productId, {int page = 1, int size = 10}) async => [];

  @override
  Future<Map<String, dynamic>> addToCart({required String variantId, int quantity = 1}) async => {'status': 'success'};
}

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



  group('MOB-02 Catalog & Product Detail Screen Tests', () {
    testWidgets('CatalogPage renders product list, AI recommendations banner, and categories', (tester) async {
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          catalogProductsProvider.overrideWith((ref, query) async => {
                'items': [
                  {
                    'id': 'prod-01',
                    'title': 'Áo thun thể thao Dry-Fit',
                    'description': 'Áo thun thoáng khí chất lượng cao',
                    'variants': [
                      {'id': 'v-01', 'sku': 'AT-M', 'price_vnd': '250000'},
                      {'id': 'v-02', 'sku': 'AT-L', 'price_vnd': '260000'},
                    ],
                  },
                ],
                'total': 1,
              }),
          categoriesProvider.overrideWith((ref) async => [
                {'id': 'cat-1', 'name': 'Thời trang'},
                {'id': 'cat-2', 'name': 'Điện tử'},
              ]),
          recommendationProvider.overrideWith((ref) async => {
                'source': 'BASELINE',
                'mode': 'mock',
                'product_ids': ['prod-01'],
              }),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: CatalogPage()),
        ),
      );
      await tester.pump();

      expect(find.text('PBL6 E-Commerce'), findsOneWidget);
      expect(find.text('Dành riêng cho bạn'), findsOneWidget);
      expect(find.text('Gợi ý Baseline / Mock'), findsOneWidget);
      expect(find.text('Thời trang'), findsOneWidget);
      expect(find.text('Điện tử'), findsOneWidget);
      expect(find.text('Áo thun thể thao Dry-Fit'), findsOneWidget);
      expect(find.text('250000 ₫'), findsOneWidget);
    });

    testWidgets('CatalogPage displays empty state when no products found', (tester) async {
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          catalogProductsProvider.overrideWith((ref, query) async => {
                'items': [],
                'total': 0,
              }),
          categoriesProvider.overrideWith((ref) async => []),
          recommendationProvider.overrideWith((ref) async => {
                'source': 'BASELINE',
                'mode': 'mock',
                'product_ids': [],
              }),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: CatalogPage()),
        ),
      );
      await tester.pump();

      expect(find.text('Không tìm thấy sản phẩm nào'), findsOneWidget);
    });

    testWidgets('ProductDetailPage renders full details, variant chips and quantity selection', (tester) async {
      final mockProduct = {
        'id': 'prod-01',
        'title': 'Bàn phím cơ không dây Bluetooth',
        'description': 'Bàn phím cơ switch Red êm ái, pin 4000mAh',
        'attributes': {'Hãng': 'PBL Tech', 'Bảo hành': '12 tháng'},
        'variants': [
          {'id': 'v-red', 'sku': 'KB-RED', 'price_vnd': '1200000'},
          {'id': 'v-blue', 'sku': 'KB-BLUE', 'price_vnd': '1250000'},
        ],
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
          ],
          child: MaterialApp(
            home: ProductDetailPage(
              productId: 'prod-01',
              initialProduct: mockProduct,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Bàn phím cơ không dây Bluetooth'), findsWidgets);
      expect(find.text('1200000 ₫'), findsOneWidget);
      expect(find.text('Mã SKU: KB-RED'), findsOneWidget);
      expect(find.text('KB-RED (1200000 ₫)'), findsOneWidget);
      expect(find.text('KB-BLUE (1250000 ₫)'), findsOneWidget);
      expect(find.text('Thêm vào giỏ'), findsOneWidget);
      expect(find.text('Mua ngay'), findsOneWidget);

      // Change variant
      await tester.tap(find.text('KB-BLUE (1250000 ₫)'));
      await tester.pump();
      expect(find.text('1250000 ₫'), findsOneWidget);
      expect(find.text('Mã SKU: KB-BLUE'), findsOneWidget);

      // Increase quantity
      expect(find.text('1'), findsOneWidget);
      await tester.ensureVisible(find.byIcon(Icons.add));
      await tester.tap(find.byIcon(Icons.add));
      await tester.pumpAndSettle();
      expect(find.text('2'), findsOneWidget);
    });

    testWidgets('ConsentDialog renders switch and controls AI personalization', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
          ],
          child: const MaterialApp(home: Scaffold(body: ConsentDialog())),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Cá nhân hóa & Gợi ý AI'), findsOneWidget);
      expect(find.text('Bật gợi ý thông minh'), findsOneWidget);
      expect(find.text('Đóng'), findsOneWidget);
    });
  });

  group('ApiClient Unit Tests', () {
    test('ApiClient initializes properly', () {
      final client = ApiClient(baseUrl: 'http://localhost:8080/api/v1');
      expect(client.isAuthenticated, isFalse);
      client.setAccessTokenForTesting('mock-token');
      expect(client.isAuthenticated, isTrue);
    });

    test('ApiClient recommendation fallback returns non-null map', () async {
      final client = ApiClient(baseUrl: 'http://invalid-host-for-testing:9999/api/v1');
      final res = await client.getRecommendations();
      expect(res['source'], equals('BASELINE'));
      expect(res['mode'], equals('mock'));
    });

    test('ApiClient categories fallback returns empty list on network error', () async {
      final client = ApiClient(baseUrl: 'http://invalid-host-for-testing:9999/api/v1');
      final res = await client.getCategories();
      expect(res, isEmpty);
    });
  });
}


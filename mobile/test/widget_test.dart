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

import 'package:pbl6_mobile/features/cart/cart_page.dart';
import 'package:pbl6_mobile/features/checkout/checkout_page.dart';
import 'package:pbl6_mobile/features/checkout/order_success_page.dart';

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

  @override
  Future<Map<String, dynamic>> getCartItems({int page = 1, int size = 50}) async => {
        'items': [
          {
            'id': 'ci-01',
            'store_id': 'store-tech',
            'store_name': 'PBL Tech Store',
            'product_id': 'prod-01',
            'title': 'Chuột Gaming không dây',
            'sku': 'MOUSE-RGB',
            'unit_price_vnd': 350000,
            'quantity': 1,
          },
          {
            'id': 'ci-02',
            'store_id': 'store-fashion',
            'store_name': 'PBL Fashion Hub',
            'product_id': 'prod-02',
            'title': 'Áo hoodie Unisex',
            'sku': 'HOODIE-BLACK-L',
            'unit_price_vnd': 450000,
            'quantity': 2,
          },
        ],
        'total': 2,
      };

  @override
  Future<Map<String, dynamic>> updateCartItem(String id, {required int quantity}) async => {
        'id': id,
        'quantity': quantity,
      };

  @override
  Future<void> removeCartItem(String id) async {}

  @override
  Future<List<Map<String, dynamic>>> getAddresses() async => [
        {
          'id': 'addr-01',
          'recipient_name': 'Nguyễn Văn A',
          'phone': '0901234567',
          'street': '123 Nguyễn Huệ',
          'ward': 'Bến Nghé',
          'district': 'Quận 1',
          'province': 'Hồ Chí Minh',
          'is_default': true,
        },
      ];

  @override
  Future<Map<String, dynamic>> quoteCheckout({
    required List<String> cartItemIds,
    required String addressId,
    Map<String, String>? paymentMethods,
    Map<String, String>? storeVouchers,
    String? platformVoucherCode,
  }) async => {
        'quote_id': 'quote-uuid-1234',
        'expires_at': DateTime.now().add(const Duration(minutes: 15)).toIso8601String(),
        'payable_total_vnd': 1250000,
        'stores': [
          {
            'store_id': 'store-tech',
            'items_subtotal_vnd': 350000,
            'shipping_fee_vnd': 25000,
            'store_voucher_discount_vnd': 0,
            'platform_voucher_discount_vnd': 25000,
            'store_payable_total_vnd': 350000,
          },
          {
            'store_id': 'store-fashion',
            'items_subtotal_vnd': 900000,
            'shipping_fee_vnd': 30000,
            'store_voucher_discount_vnd': 30000,
            'platform_voucher_discount_vnd': 0,
            'store_payable_total_vnd': 900000,
          },
        ],
      };

  @override
  Future<Map<String, dynamic>> confirmCheckout({
    required List<String> cartItemIds,
    required String addressId,
    required Map<String, String> paymentMethods,
    Map<String, String>? storeVouchers,
    String? platformVoucherCode,
    required String quoteId,
    required int expectedPayableTotalVnd,
    required String idempotencyKey,
  }) async => {
        'purchase_group_id': 'pg-uuid-9999',
        'order_ids': ['order-tech-1', 'order-fashion-2'],
        'payable_total_vnd': expectedPayableTotalVnd,
        'orders': [
          {
            'id': 'order-tech-1',
            'purchase_group_id': 'pg-uuid-9999',
            'store_id': 'store-tech',
            'status': 'PENDING',
            'version': 1,
            'payment_method': paymentMethods['store-tech'] ?? 'COD',
            'amounts': {'payable_vnd': 350000},
          },
          {
            'id': 'order-fashion-2',
            'purchase_group_id': 'pg-uuid-9999',
            'store_id': 'store-fashion',
            'status': 'PENDING',
            'version': 1,
            'payment_method': paymentMethods['store-fashion'] ?? 'COD',
            'amounts': {'payable_vnd': 900000},
          },
        ],
      };

  @override
  Future<Map<String, dynamic>> getPurchaseGroupOrders(String batchId) async => {
        'purchase_group_id': batchId,
        'order_ids': ['order-1'],
        'payable_total_vnd': 500000,
        'orders': [],
      };
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

  group('MOB-03 Cart, Multi-Store Checkout & Order Screen Tests', () {
    testWidgets('CartPage displays grouped items by store, handles selection and updates subtotal', (tester) async {
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          cartItemsProvider.overrideWith((ref) async => {
                'items': [
                  {
                    'id': 'ci-01',
                    'store_id': 'store-tech',
                    'store_name': 'PBL Tech Store',
                    'product_id': 'prod-01',
                    'title': 'Chuột Gaming không dây',
                    'sku': 'MOUSE-RGB',
                    'unit_price_vnd': 350000,
                    'quantity': 1,
                  },
                  {
                    'id': 'ci-02',
                    'store_id': 'store-fashion',
                    'store_name': 'PBL Fashion Hub',
                    'product_id': 'prod-02',
                    'title': 'Áo hoodie Unisex',
                    'sku': 'HOODIE-BLACK-L',
                    'unit_price_vnd': 450000,
                    'quantity': 2,
                  },
                ],
                'total': 2,
              }),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: CartPage()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Giỏ hàng của bạn'), findsOneWidget);
      expect(find.text('PBL Tech Store'), findsOneWidget);
      expect(find.text('PBL Fashion Hub'), findsOneWidget);
      expect(find.text('Chuột Gaming không dây'), findsOneWidget);
      expect(find.text('Áo hoodie Unisex'), findsOneWidget);
      expect(find.text('Mua hàng (0)'), findsOneWidget);

      // Select All items
      await tester.tap(find.text('Chọn tất cả sản phẩm'));
      await tester.pumpAndSettle();

      expect(find.text('Mua hàng (2)'), findsOneWidget);
      expect(find.text('1250000 ₫'), findsOneWidget);
    });

    testWidgets('CartPage displays empty state when cart is empty', (tester) async {
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          cartItemsProvider.overrideWith((ref) async => {
                'items': [],
                'total': 0,
              }),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: CartPage()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Giỏ hàng của bạn đang trống'), findsOneWidget);
      expect(find.text('Tiếp tục mua sắm'), findsOneWidget);
    });

    testWidgets('CheckoutPage renders addresses, multi-store items, vouchers, and quote breakdown', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
          ],
          child: MaterialApp(
            home: CheckoutPage(
              cartItemIds: const ['ci-01', 'ci-02'],
              initialSelectedItems: [
                {
                  'id': 'ci-01',
                  'store_id': 'store-tech',
                  'store_name': 'PBL Tech Store',
                  'title': 'Chuột Gaming không dây',
                  'sku': 'MOUSE-RGB',
                  'unit_price_vnd': 350000,
                  'quantity': 1,
                },
                {
                  'id': 'ci-02',
                  'store_id': 'store-fashion',
                  'store_name': 'PBL Fashion Hub',
                  'title': 'Áo hoodie Unisex',
                  'sku': 'HOODIE-BLACK-L',
                  'unit_price_vnd': 450000,
                  'quantity': 2,
                },
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Xác nhận & Báo giá đơn hàng'), findsOneWidget);
      expect(find.text('Địa chỉ nhận hàng'), findsOneWidget);
      expect(find.text('Nguyễn Văn A (0901234567)'), findsOneWidget);
      expect(find.text('PBL Tech Store'), findsOneWidget);
      expect(find.text('PBL Fashion Hub'), findsOneWidget);
      expect(find.text('Voucher toàn sàn PBL6'), findsOneWidget);
      expect(find.text('Chi tiết báo giá'), findsOneWidget);
      expect(find.text('1250000 ₫'), findsWidgets);
      expect(find.text('Đặt hàng'), findsOneWidget);
    });

    testWidgets('CheckoutPage confirms order and navigates to OrderSuccessPage', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
          ],
          child: MaterialApp(
            home: CheckoutPage(
              cartItemIds: const ['ci-01'],
              initialSelectedItems: [
                {
                  'id': 'ci-01',
                  'store_id': 'store-tech',
                  'store_name': 'PBL Tech Store',
                  'title': 'Chuột Gaming không dây',
                  'sku': 'MOUSE-RGB',
                  'unit_price_vnd': 350000,
                  'quantity': 1,
                },
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Đặt hàng'));
      await tester.pumpAndSettle();

      expect(find.text('Đặt hàng thành công'), findsOneWidget);
      expect(find.text('Cảm ơn bạn đã đặt hàng!'), findsOneWidget);
      expect(find.text('pg-uuid-9999'), findsOneWidget);
      expect(find.textContaining('order-tech-1'), findsOneWidget);
      expect(find.textContaining('order-fashion-2'), findsOneWidget);
      expect(find.text('Xem đơn hàng của tôi'), findsOneWidget);
    });

    testWidgets('OrderSuccessPage renders complete batch details', (tester) async {
      final mockBatch = {
        'purchase_group_id': 'pg-123456',
        'payable_total_vnd': 750000,
        'order_ids': ['order-1', 'order-2'],
        'orders': [
          {
            'id': 'order-1',
            'store_id': 'store-a',
            'status': 'CONFIRMED',
            'payment_method': 'COD',
            'amounts': {'payable_vnd': 300000},
          },
          {
            'id': 'order-2',
            'store_id': 'store-b',
            'status': 'PENDING',
            'payment_method': 'SANDBOX',
            'amounts': {'payable_vnd': 450000},
          },
        ],
      };

      await tester.pumpWidget(
        MaterialApp(home: OrderSuccessPage(orderBatch: mockBatch)),
      );
      await tester.pump();

      expect(find.text('Đặt hàng thành công'), findsOneWidget);
      expect(find.text('pg-123456'), findsOneWidget);
      expect(find.text('750000 ₫'), findsOneWidget);
      expect(find.text('Store: store-a'), findsOneWidget);
      expect(find.text('Store: store-b'), findsOneWidget);
      expect(find.text('CONFIRMED'), findsOneWidget);
      expect(find.text('PENDING'), findsOneWidget);
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


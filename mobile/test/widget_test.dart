import 'package:pbl6_mobile/features/chat/chat_ai_modal.dart';
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
import 'package:pbl6_mobile/features/profile/store_messages_page.dart';
import 'package:pbl6_mobile/main.dart';

import 'package:pbl6_mobile/features/cart/cart_page.dart';
import 'package:pbl6_mobile/features/checkout/checkout_page.dart';
import 'package:pbl6_mobile/features/checkout/order_success_page.dart';
import 'package:pbl6_mobile/features/customer/store_application_page.dart';
import 'package:pbl6_mobile/features/customer/favorites_page.dart';
import 'package:pbl6_mobile/features/orders/order_list_page.dart';
import 'package:pbl6_mobile/features/orders/order_refund_page.dart';
import 'package:pbl6_mobile/features/orders/order_detail_page.dart';

class MockApiClient extends ApiClient {
  @override
  Future<Map<String, dynamic>> listOwnChatSessions({
    int page = 1,
    int size = 20,
    String? sessionId,
    int? messagePage,
    int? messageSize,
  }) async => {
    'items': [
      {
        'id': 'sess-e35f',
        'created_at': '2026-11-04T08:09:00Z',
        'messages': {
          'items': [
            {'role': 'USER', 'content': 'Tư vấn mua sắm'},
            {'role': 'ASSISTANT', 'content': 'Chào bạn, mình có thể giúp gì cho bạn?'},
          ],
          'total': 2,
        },
      },
    ],
    'total': 1,
    'page': 1,
    'size': 20,
  };

  @override
  Future<Map<String, dynamic>> getPersonalizationConsent() async => {
    'status': 'GRANTED',
    'version': 1,
  };

  @override
  Future<Map<String, dynamic>> updatePersonalizationConsent(
    String status,
    int expectedVersion,
  ) async => {'status': status, 'version': expectedVersion + 1};

  @override
  Future<Map<String, dynamic>> getProduct(String id) async => {
    'id': id,
    'title': 'Bàn phím cơ không dây Bluetooth',
    'description': 'Bàn phím cơ switch Red êm ái, pin 4000mAh',
    'attributes': {'Hãng': 'PBL Tech', 'Bảo hành': '12 tháng'},
    'variants': [
      {'id': 'v-red', 'sku': 'KB-RED', 'price_vnd': '1200000', 'available_quantity': 25},
      {'id': 'v-blue', 'sku': 'KB-BLUE', 'price_vnd': '1250000', 'available_quantity': 10},
    ],
  };

  @override
  Future<List<Map<String, dynamic>>> getProductReviews(
    String productId, {
    int page = 1,
    int size = 20,
  }) async => [
    {'id': 'rev-1', 'rating': 5, 'body': 'Sản phẩm gõ rất êm!'},
  ];

  @override
  Future<List<Map<String, dynamic>>> getRelatedProducts(
    String productId, {
    int page = 1,
    int size = 10,
  }) async => [];

  @override
  Future<Map<String, dynamic>> getStore(String storeId) async => {
    'id': storeId,
    'name': 'PBL Tech Store',
    'description': 'Cửa hàng công nghệ chính hãng',
    'shipping_fee_vnd': 30000,
  };

  @override
  Future<Map<String, dynamic>> createChatSession({String? firstMessage}) async => {
    'id': 'sess-mock-1',
    'anonymous_key': 'key-mock-1',
  };

  @override
  Future<Map<String, dynamic>> sendChatMessage(
    String sessionId,
    String content, {
    String? chatKey,
  }) async => {
    'content': 'Đây là phản hồi từ AI hỗ trợ mua sắm.',
    'product_cards': [],
  };

  @override
  Future<Map<String, dynamic>> addToCart({
    required String variantId,
    required String productId,
    int quantity = 1,
  }) async => {'status': 'success'};

  @override
  Future<Map<String, dynamic>> addCartItem({
    required String variantId,
    required String productId,
    int quantity = 1,
  }) async => addToCart(variantId: variantId, productId: productId, quantity: quantity);

  @override
  Future<Map<String, dynamic>> getCartItems({
    int page = 1,
    int size = 50,
  }) async => {
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
  Future<Map<String, dynamic>> updateCartItem(
    String id, {
    required int quantity,
  }) async => {'id': id, 'quantity': quantity};

  @override
  Future<void> removeCartItem(String id) async {}

  @override
  Future<List<Map<String, dynamic>>> getAddresses() async => [
    {
      'id': 'addr-01',
      'recipient_name': 'Nguyễn Văn A',
      'phone': '0901234567',
      'line1': '123 Nguyễn Huệ',
      'ward': 'Bến Nghé',
      'district': 'Quận 1',
      'city': 'Hồ Chí Minh',
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
    'expires_at': DateTime.now()
        .add(const Duration(minutes: 15))
        .toIso8601String(),
    'payable_total_vnd': 1250000,
    'stores': [
      {
        'store_id': 'store-tech',
        'amounts': {
          'goods_vnd': 350000,
          'shipping_vnd': 25000,
          'store_discount_vnd': 0,
          'platform_discount_vnd': 25000,
          'payable_vnd': 350000,
        },
        'items': [
          {
            'product_title': 'Bàn phím cơ không dây Bluetooth',
            'sku': 'KB-RED',
            'unit_price_vnd': 350000,
            'quantity': 1,
          },
        ],
      },
      {
        'store_id': 'store-fashion',
        'amounts': {
          'goods_vnd': 900000,
          'shipping_vnd': 30000,
          'store_discount_vnd': 30000,
          'platform_discount_vnd': 0,
          'payable_vnd': 900000,
        },
        'items': [
          {
            'product_title': 'Áo hoodie Unisex',
            'sku': 'HOODIE-BLACK-L',
            'unit_price_vnd': 450000,
            'quantity': 2,
          },
        ],
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

  @override
  Future<Map<String, dynamic>> suggestVouchers({
    required List<String> cartItemIds,
    required String addressId,
    required Map<String, String> paymentMethods,
    String? platformVoucherCode,
    Map<String, String>? storeVouchers,
  }) async => {
    'items': [
      {
        'voucher': {
          'id': 'vch-san-5k',
          'code': 'DEMO-SAN-5K',
          'scope': 'PLATFORM',
          'discount_type': 'FIXED',
          'discount_value': 5000,
          'min_goods_vnd': 100000,
          'ends_at': '2027-11-02T14:32:00.000Z',
          'per_customer_limit': 50,
          'status': 'ACTIVE',
        },
        'eligible': true,
        'reason': 'Có thể áp dụng',
        'estimated_discount_vnd': 5000,
      },
      {
        'voucher': {
          'id': 'vch-b-10k',
          'code': 'DEMO-B-10K',
          'scope': 'STORE',
          'store_id': 'store-tech',
          'store_name': 'Mây Xanh Living',
          'discount_type': 'FIXED',
          'discount_value': 10000,
          'min_goods_vnd': 200000,
          'ends_at': '2027-11-02T14:32:00.000Z',
          'per_customer_limit': 10,
          'status': 'ACTIVE',
        },
        'eligible': true,
        'reason': 'Có thể áp dụng',
        'estimated_discount_vnd': 10000,
      },
    ],
    'evaluated_at': DateTime.now().toIso8601String(),
    'truncated': false,
  };

  @override
  Future<Map<String, dynamic>> getProfile() async => {
    'id': 'user-01',
    'email': 'customer@example.com',
    'display_name': 'Nguyễn Văn A',
    'phone_number': '0901234567',
  };

  @override
  Future<Map<String, dynamic>> listOwnOrders({
    int page = 1,
    int size = 50,
  }) async => {
    'items': [
      {
        'id': 'order-test-01',
        'purchase_group_id': 'pg-01',
        'store_id': 'store-tech',
        'store_name': 'PBL Tech Store',
        'status': 'PENDING',
        'version': 1,
        'payment_method': 'COD',
        'amounts': {'payable_vnd': 350000},
        'items': [
          {
            'id': 'oi-01',
            'order_id': 'order-test-01',
            'product_id': 'prod-01',
            'product_title': 'Chuột Gaming không dây',
            'sku': 'MOUSE-RGB',
            'price_vnd': 350000,
            'quantity': 1,
          },
        ],
      },
      {
        'id': 'order-test-02',
        'purchase_group_id': 'pg-02',
        'store_id': 'store-fashion',
        'store_name': 'PBL Fashion Hub',
        'status': 'COMPLETED',
        'version': 1,
        'payment_method': 'SANDBOX',
        'amounts': {'payable_vnd': 450000},
        'items': [
          {
            'id': 'oi-02',
            'order_id': 'order-test-02',
            'product_id': 'prod-02',
            'product_title': 'Áo hoodie Unisex',
            'sku': 'HOODIE-BLACK-L',
            'price_vnd': 450000,
            'quantity': 1,
          },
        ],
      },
    ],
    'total': 2,
    'page': 1,
    'size': 50,
  };

  @override
  Future<Map<String, dynamic>> getOwnOrder(String id) async => {
    'id': id,
    'purchase_group_id': 'pg-01',
    'store_id': 'store-tech',
    'store_name': 'PBL Tech Store',
    'status': 'PENDING',
    'version': 1,
    'payment_method': 'COD',
    'amounts': {
      'goods_vnd': 350000,
      'shipping_vnd': 30000,
      'store_discount_vnd': 0,
      'platform_discount_vnd': 0,
      'payable_vnd': 380000,
    },
    'items': [
      {
        'id': 'oi-01',
        'order_id': id,
        'product_id': 'prod-01',
        'product_title': 'Chuột Gaming không dây',
        'sku': 'MOUSE-RGB',
        'price_vnd': 350000,
        'quantity': 1,
      },
    ],
  };

  @override
  Future<Map<String, dynamic>> cancelOwnOrder(
    String id, {
    required int expectedVersion,
    String? reason,
  }) async => {'status': 'CANCELLED'};

  @override
  Future<Map<String, dynamic>?> getOrderRefund(String id) async => null;

  @override
  Future<Map<String, dynamic>> requestOrderRefund({
    required String orderId,
    required String reason,
    required int amountVnd,
    List<Map<String, dynamic>>? items,
    String? note,
  }) async => {
    'status': 'PENDING',
    'order_id': orderId,
    'reason': reason,
    'amount_vnd': amountVnd,
  };

  @override
  Future<Map<String, dynamic>> createPaymentAttempt(
    String orderId, {
    required int expectedOrderVersion,
  }) async => {'id': 'attempt-01', 'status': 'SUCCEEDED'};

  @override
  Future<Map<String, dynamic>> submitStoreApplication({
    required String proposedName,
    required String contact,
  }) async => {
    'id': 'app-01',
    'proposed_name': proposedName,
    'contact': contact,
    'status': 'PENDING',
  };

  @override
  Future<Map<String, dynamic>> listOwnStoreApplications({
    int page = 1,
    int size = 20,
  }) async => {
    'items': [
      {
        'id': 'app-01',
        'proposed_name': 'TechZone Flagship',
        'contact': 'contact@techzone.vn',
        'status': 'PENDING',
        'created_at': DateTime.now().toIso8601String(),
      },
    ],
    'total': 1,
  };
}

void main() {
  group('Pending and Utility Tests', () {
    testWidgets('Pending screens disclose unfinished behavior', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: PendingPage('Cart')));
      expect(find.text('Cart'), findsNWidgets(2));
      expect(
        find.text(
          'Khung module — nghiệp vụ chờ triển khai trong các task tiếp theo.',
        ),
        findsOneWidget,
      );
    });

    test('Useful unauthenticated message', () {
      expect(
        errorMessage(StateError('Vui lòng đăng nhập.')),
        contains('Vui lòng đăng nhập'),
      );
    });
  });

  group('Authentication Screen Tests', () {
    testWidgets('LoginPage renders email, password fields and login button', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginPage())),
      );

      expect(find.text('Đăng nhập'), findsWidgets);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Mật khẩu'), findsOneWidget);
      expect(find.text('Quên mật khẩu?'), findsOneWidget);
      expect(find.text('Đăng ký ngay'), findsOneWidget);
    });

    testWidgets('RegisterPage renders all input fields and validation', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: RegisterPage())),
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

    testWidgets('VerifyEmailPage renders token input and verify button', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: VerifyEmailPage())),
      );

      expect(find.text('Xác minh Email'), findsOneWidget);
      expect(find.text('Mã xác minh (Token) *'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Xác minh'), findsOneWidget);
    });

    testWidgets(
      'ForgotPasswordPage toggles between forgot email and reset password modes',
      (tester) async {
        await tester.pumpWidget(
          const ProviderScope(child: MaterialApp(home: ForgotPasswordPage())),
        );

        expect(find.text('Quên mật khẩu'), findsOneWidget);
        expect(find.text('Email đã đăng ký *'), findsOneWidget);

        // Switch to reset mode
        await tester.tap(find.text('Đã có mã xác nhận? Đặt lại mật khẩu ngay'));
        await tester.pump();

        expect(find.text('Đặt lại mật khẩu'), findsOneWidget);
        expect(find.text('Mã xác nhận (Token) *'), findsOneWidget);
        expect(find.text('Mật khẩu mới *'), findsOneWidget);
      },
    );

    testWidgets('ChangePasswordPage renders password input fields', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: ChangePasswordPage())),
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
          apiProvider.overrideWithValue(MockApiClient()),
          profileProvider.overrideWith(
            (ref) async => {
              'email': 'user@example.com',
              'display_name': 'Nguyễn Văn A',
              'phone': '0901234567',
              'roles': ['CUSTOMER'],
            },
          ),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: ProfilePage()),
        ),
      );
      await tester.pump();

      expect(find.widgetWithText(AppBar, 'Tài khoản'), findsOneWidget);
      expect(find.text('Nguyễn Văn A'), findsOneWidget);
      expect(find.text('user@example.com'), findsOneWidget);
      expect(find.text('CUSTOMER'), findsOneWidget);
      expect(find.text('Tin nhắn với gian hàng', skipOffstage: false), findsOneWidget);
      expect(find.text('Sổ địa chỉ nhận hàng', skipOffstage: false), findsOneWidget);
      expect(find.text('Đổi mật khẩu', skipOffstage: false), findsOneWidget);
    });

    testWidgets('StoreMessagesPage renders conversations and matching header', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: StoreMessagesPage(),
          ),
        ),
      );

      expect(find.text('Tin nhắn với gian hàng'), findsWidgets);
      expect(find.text('Trao đổi về sản phẩm, đơn hàng và hỗ trợ sau mua.'), findsOneWidget);
      expect(find.text('An Nhiên Studio'), findsOneWidget);
      expect(find.text('Mây Xanh Living'), findsOneWidget);
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

    testWidgets('AddressListPage displays empty and list states', (
      tester,
    ) async {
      final emptyContainer = ProviderContainer(
        overrides: [addressListProvider.overrideWith((ref) async => [])],
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
          addressListProvider.overrideWith(
            (ref) async => [
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
            ],
          ),
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
        const ProviderScope(child: MaterialApp(home: AddressFormPage())),
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
    testWidgets(
      'CatalogPage search bar focuses outer border without inner capsule border',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiProvider.overrideWithValue(MockApiClient()),
              categoriesProvider.overrideWith((ref) async => []),
            ],
            child: const MaterialApp(home: CatalogPage()),
          ),
        );
        await tester.pumpAndSettle();

        final searchField = find.widgetWithText(TextField, 'Bạn đang tìm sản phẩm gì?');
        expect(searchField, findsOneWidget);

        // Tap into search field to focus
        await tester.tap(searchField);
        await tester.pumpAndSettle();

        // Verify TextField decoration has no inner borders
        final tfWidget = tester.widget<TextField>(searchField);
        expect(tfWidget.decoration?.focusedBorder, InputBorder.none);
        expect(tfWidget.decoration?.border, InputBorder.none);
        expect(tfWidget.decoration?.filled, isFalse);
      },
    );
    testWidgets(
      'CatalogPage renders product list, AI recommendations banner, and categories',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            catalogProductsProvider.overrideWith(
              (ref, query) async => {
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
              },
            ),
            categoriesProvider.overrideWith(
              (ref) async => [
                {'id': 'cat-1', 'name': 'Thời trang'},
                {'id': 'cat-2', 'name': 'Điện tử'},
              ],
            ),
            recommendationProvider.overrideWith(
              (ref) async => {
                'source': 'BASELINE',
                'mode': 'mock',
                'product_ids': ['prod-01'],
              },
            ),
          ],
        );

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(home: CatalogPage()),
          ),
        );
        await tester.pump();

        expect(find.text('PBL6 Market'), findsOneWidget);
        expect(find.text('Sản phẩm dành cho bạn', skipOffstage: false), findsOneWidget);
        expect(find.text('Thời trang', skipOffstage: false), findsWidgets);
        expect(find.text('Góc làm việc', skipOffstage: false), findsOneWidget);
        expect(find.text('Áo thun thể thao Dry-Fit', skipOffstage: false), findsOneWidget);
        expect(find.text('250000 ₫', skipOffstage: false), findsOneWidget);
      },
    );

    testWidgets('Tapping favorite heart icon on product card toggles favorite and does not navigate', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          catalogProductsProvider.overrideWith(
            (ref, query) async => {
              'items': [
                {
                  'id': 'test-card-01',
                  'title': 'Sổ tay ghi chép Daily Notes',
                  'price_vnd': 79000,
                  'category_id': 'cat-1',
                  'store_name': 'TechZone Store',
                  'variants': [{'id': 'v-1', 'price_vnd': 79000}],
                  'images': [{'image_url': 'https://example.com/img.png'}],
                },
              ],
              'total': 1,
            },
          ),
          categoriesProvider.overrideWith((ref) async => []),
          recommendationProvider.overrideWith((ref) async => {'product_ids': []}),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: CatalogPage()),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Sổ tay ghi chép Daily Notes'), findsOneWidget);

      final cardHeartFinder = find.descendant(
        of: find.byType(CustomScrollView),
        matching: find.byIcon(Icons.favorite_border_rounded),
      );
      expect(cardHeartFinder, findsOneWidget);

      // Tap on the heart icon
      await tester.tap(cardHeartFinder);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Verified: Toggled to filled heart inside the card
      final filledHeartFinder = find.descendant(
        of: find.byType(CustomScrollView),
        matching: find.byIcon(Icons.favorite_rounded),
      );
      expect(filledHeartFinder, findsOneWidget);

      // Verified: Did not navigate to ProductDetailPage
      expect(find.text('Mã SKU:'), findsNothing);
      expect(find.text('Mua ngay'), findsNothing);
      expect(find.text('PBL6 Market'), findsOneWidget);
    });

    testWidgets('CatalogPage displays empty state when no products found', (
      tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          catalogProductsProvider.overrideWith(
            (ref, query) async => {'items': [], 'total': 0},
          ),
          categoriesProvider.overrideWith((ref) async => []),
          recommendationProvider.overrideWith(
            (ref) async => {
              'source': 'BASELINE',
              'mode': 'mock',
              'product_ids': [],
            },
          ),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: CatalogPage()),
        ),
      );
      await tester.pump();

      expect(
        find.text('Không tìm thấy sản phẩm nào', skipOffstage: false),
        findsOneWidget,
      );
    });

    testWidgets(
      'Searching from top search bar transitions to dedicated search results view matching web design',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            catalogProductsProvider.overrideWith(
              (ref, query) async => {
                'items': [
                  {
                    'id': 'prod-01',
                    'title': 'Áo hoodie xám Weekend',
                    'price_vnd': 389000,
                    'category_id': 'cat-1',
                    'store_name': 'An Nhiên Studio',
                    'variants': [
                      {'id': 'v-1', 'price_vnd': 389000},
                      {'id': 'v-2', 'price_vnd': 399000},
                    ],
                  },
                ],
                'total': 1,
              },
            ),
            categoriesProvider.overrideWith((ref) async => [
              {'id': 'cat-1', 'name': 'Thời trang'},
            ]),
            recommendationProvider.overrideWith((ref) async => {'product_ids': []}),
          ],
        );

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(home: CatalogPage()),
          ),
        );
        await tester.pumpAndSettle();

        // Initially in home mode
        expect(find.text('Sản phẩm dành cho bạn', skipOffstage: false), findsOneWidget);

        // Enter search query "hoodie" and tap Tìm kiếm
        await tester.enterText(find.byType(TextField).first, 'hoodie');
        await tester.tap(find.text('Tìm kiếm'));
        await tester.pumpAndSettle();

        // Now in dedicated search results mode matching web
        expect(find.text('KHÁM PHÁ CÙNG PBL6'), findsOneWidget);
        expect(find.text('Trang chủ'), findsOneWidget);
        expect(find.text('Bộ lọc'), findsOneWidget);
        expect(find.text('Áo hoodie xám Weekend'), findsOneWidget);
        expect(find.text('Thêm vào giỏ'), findsOneWidget);
        expect(find.text('Xóa bộ lọc'), findsOneWidget);

        // Tap "Xóa bộ lọc" returns to home mode
        await tester.tap(find.text('Xóa bộ lọc'));
        await tester.pumpAndSettle();

        expect(find.text('Sản phẩm dành cho bạn', skipOffstage: false), findsOneWidget);
      },
    );

    testWidgets(
      'ProductDetailPage renders full details, variant chips and quantity selection',
      (tester) async {
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
            overrides: [apiProvider.overrideWithValue(MockApiClient())],
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
        expect(find.text('Đang bán'), findsOneWidget);
        expect(find.text('1200000 ₫'), findsOneWidget);
        expect(find.text('Mã SKU: KB-RED'), findsOneWidget);
        expect(find.text('KB-RED (1200000 ₫)'), findsOneWidget);
        expect(find.text('KB-BLUE (1250000 ₫)'), findsOneWidget);
        expect(find.text('Thêm vào giỏ'), findsOneWidget);
        expect(find.text('Mua ngay'), findsOneWidget);

        // Change variant
        await tester.ensureVisible(find.text('KB-BLUE (1250000 ₫)'));
        await tester.tap(find.text('KB-BLUE (1250000 ₫)'));
        await tester.pumpAndSettle();
        expect(find.text('1250000 ₫'), findsOneWidget);
        expect(find.text('Mã SKU: KB-BLUE'), findsOneWidget);

        // Increase quantity
        expect(find.text('1'), findsOneWidget);
        await tester.ensureVisible(find.byIcon(Icons.add));
        await tester.tap(find.byIcon(Icons.add));
        await tester.pumpAndSettle();
        expect(find.text('2'), findsWidgets);
      },
    );

    testWidgets(
      'ConsentDialog renders switch and controls AI personalization',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [apiProvider.overrideWithValue(MockApiClient())],
            child: const MaterialApp(home: Scaffold(body: ConsentDialog())),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Cá nhân hóa & Gợi ý AI'), findsOneWidget);
        expect(find.text('Bật gợi ý thông minh'), findsOneWidget);
        expect(find.text('Đóng'), findsOneWidget);
      },
    );
  });

  group('MOB-03 Cart, Multi-Store Checkout & Order Screen Tests', () {
    testWidgets(
      'CartPage displays grouped items by store, handles selection and updates subtotal',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            cartItemsProvider.overrideWith(
              (ref) async => {
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
              },
            ),
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
      },
    );

    testWidgets(
      'Tapping variant pill opens CartVariantModal, updates price & stock on variant change, and confirms',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            cartItemsProvider.overrideWith(
              (ref) async => {
                'items': [
                  {
                    'id': 'ci-01',
                    'store_id': 'store-tech',
                    'store_name': 'PBL Tech Store',
                    'product_id': 'prod-01',
                    'variant_id': 'v-red',
                    'title': 'Chuột Gaming không dây',
                    'sku': 'KB-RED',
                    'variant_text': 'Phiên bản Đỏ',
                    'unit_price_vnd': 1200000,
                    'quantity': 1,
                  },
                ],
                'total': 1,
              },
            ),
          ],
        );

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(home: CartPage()),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Phiên bản Đỏ'), findsOneWidget);

        // Tap on variant pill to open bottom sheet
        await tester.tap(find.text('Phiên bản Đỏ'));
        await tester.pumpAndSettle();

        // Bottom sheet header displays price and stock
        expect(find.text('Kho: 25'), findsOneWidget);
        expect(find.text('1.200.000 ₫'), findsOneWidget);
        expect(find.text('KB-BLUE'), findsOneWidget);
        expect(find.text('Xác nhận'), findsOneWidget);

        // Select KB-BLUE variant
        await tester.tap(find.text('KB-BLUE'));
        await tester.pumpAndSettle();

        // Price updates to 1.250.000 ₫ and stock updates to 10
        expect(find.text('1.250.000 ₫'), findsOneWidget);
        expect(find.text('Kho: 10'), findsOneWidget);

        // Tap increment button
        await tester.tap(find.byIcon(Icons.add).last);
        await tester.pumpAndSettle();

        // Quantity becomes 2
        expect(find.text('2'), findsWidgets);

        // Confirm variant change
        await tester.tap(find.text('Xác nhận'));
        await tester.pumpAndSettle();

        // Verify bottom sheet closed and success snackbar displayed
        expect(find.text('Đã cập nhật phân loại sản phẩm!'), findsOneWidget);
      },
    );

    testWidgets('CartPage displays empty state when cart is empty', (
      tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          cartItemsProvider.overrideWith(
            (ref) async => {'items': [], 'total': 0},
          ),
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

    testWidgets(
      'CheckoutPage renders addresses, multi-store items, vouchers, and quote breakdown',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [apiProvider.overrideWithValue(MockApiClient())],
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
        expect(find.text('DEMO-SAN-5K'), findsOneWidget);
        expect(find.text('Chọn DEMO-SAN-5K'), findsOneWidget);
        expect(find.text('DEMO-B-10K'), findsOneWidget);
        expect(find.text('Chọn DEMO-B-10K'), findsOneWidget);
        expect(find.text('Ưu đãi từ cửa hàng'), findsOneWidget);

        // Scroll into view and tap to select DEMO-SAN-5K
        await tester.ensureVisible(find.text('Chọn DEMO-SAN-5K'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Chọn DEMO-SAN-5K'));
        await tester.pumpAndSettle();
        expect(find.text('Bỏ chọn DEMO-SAN-5K'), findsOneWidget);

        expect(find.text('Chi tiết báo giá'), findsOneWidget);
        expect(find.text('1250000 ₫'), findsWidgets);
        expect(find.text('Đặt hàng'), findsOneWidget);
      },
    );

    testWidgets(
      'CheckoutPage confirms order and navigates to OrderSuccessPage',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [apiProvider.overrideWithValue(MockApiClient())],
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
      },
    );

    testWidgets('OrderSuccessPage renders complete batch details', (
      tester,
    ) async {
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

  group('MOB-04 Order History, Details & Cancellation Screen Tests', () {
    testWidgets('OrderListPage renders tabs and displays orders from API', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(home: OrderListPage()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Đơn hàng của tôi'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Tất cả'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Chờ xác nhận'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Đang xử lý'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Đang giao'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Hoàn thành'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Đã hủy'), findsOneWidget);

      expect(find.text('PBL Tech Store'), findsOneWidget);
      expect(find.text('Chuột Gaming không dây'), findsOneWidget);
      expect(find.text('PBL Fashion Hub'), findsOneWidget);
      expect(find.text('Áo hoodie Unisex'), findsOneWidget);
    });

    testWidgets('OrderListPage displays empty state when tab has no orders', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            customerOrdersProvider.overrideWith((ref) async => {'items': [], 'total': 0}),
          ],
          child: const MaterialApp(home: OrderListPage()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Chưa có đơn hàng nào'), findsOneWidget);
      expect(find.text('Tiếp tục mua sắm'), findsOneWidget);
    });

    testWidgets('OrderListPage verifies updated order card UI: no chevron, orange status, Phân loại & qty inline, Thành tiền with product count', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(home: OrderListPage()),
        ),
      );
      await tester.pumpAndSettle();

      // Verify refresh button is removed and replaced by search and chat buttons
      expect(find.byIcon(Icons.refresh), findsNothing);
      expect(find.byIcon(Icons.search), findsOneWidget);
      expect(find.byIcon(Icons.chat_bubble_outline_rounded), findsOneWidget);

      // Verify tapping search button enables search mode and filters orders
      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Chuột');
      await tester.pumpAndSettle();
      expect(find.text('Chuột Gaming không dây'), findsOneWidget);
      expect(find.text('Áo hoodie Unisex'), findsNothing);

      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsNothing);

      // 1. Store name without chevron icon next to it
      expect(find.text('PBL Tech Store'), findsOneWidget);
      expect(find.byIcon(Icons.chevron_right), findsNothing);

      // 2. No "Mã đơn: #" displayed
      expect(find.textContaining('Mã đơn:'), findsNothing);

      // 3. Status text is displayed in orange (AppColors.primary)
      final statusWidgets = tester.widgetList<Text>(find.text('Chờ xác nhận')).toList();
      // The order card status is styled with color and font size 14
      final cardStatus = statusWidgets.firstWhere((w) => w.style?.fontSize == 14);
      expect(cardStatus.style?.color, const Color(0xFFBA3416)); // AppColors.primary
      expect(cardStatus.style?.fontSize, 14);

      // 4. Inline Phân loại and qty
      expect(find.text('Phân loại: MOUSE-RGB'), findsOneWidget);
      expect(find.text('x1'), findsWidgets);

      // 5. Total text: "Thành tiền (1 sản phẩm): "
      expect(find.textContaining('Thành tiền (1 sản phẩm):'), findsWidgets);

      // 6. Completed order displays "Trả hàng/Hoàn tiền" (black) and "Mua lại" (orange)
      expect(find.text('Trả hàng/Hoàn tiền'), findsOneWidget);
      expect(find.text('Mua lại'), findsOneWidget);

      final refundBtn = tester.widget<OutlinedButton>(find.byKey(const ValueKey('refund_button')));
      final reorderBtn = tester.widget<OutlinedButton>(find.byKey(const ValueKey('reorder_button')));

      // Refund button has black text/border
      final refundStyle = refundBtn.style;
      expect(refundStyle?.foregroundColor?.resolve({}), const Color(0xFF1F2937));

      // Reorder button has orange text/border
      final reorderStyle = reorderBtn.style;
      expect(reorderStyle?.foregroundColor?.resolve({}), const Color(0xFFBA3416));
    });

    testWidgets('OrderListPage tapping "Trả hàng/Hoàn tiền" opens OrderRefundPage and submitting works', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(home: OrderListPage()),
        ),
      );
      await tester.pumpAndSettle();

      // Scroll to and Tap "Trả hàng/Hoàn tiền"
      await tester.ensureVisible(find.byKey(const ValueKey('refund_button')));
      await tester.tap(find.byKey(const ValueKey('refund_button')));
      await tester.pumpAndSettle();

      // Verify on OrderRefundPage
      expect(find.text('Trả hàng / Hoàn tiền'), findsWidgets);
      expect(find.text('Chọn sản phẩm hoàn trả'), findsOneWidget);
      expect(find.text('Lý do Trả hàng / Hoàn tiền'), findsOneWidget);
      expect(find.text('Thông tin hoàn tiền'), findsOneWidget);
      expect(find.text('Gửi yêu cầu'), findsOneWidget);

      // Scroll and Tap "Gửi yêu cầu"
      await tester.ensureVisible(find.text('Gửi yêu cầu'));
      await tester.tap(find.text('Gửi yêu cầu'));
      await tester.pumpAndSettle();

      // Verify notice dialog shown
      expect(find.textContaining('Yêu cầu trả hàng/hoàn tiền của bạn đã được gửi thành công'), findsOneWidget);
      expect(find.text('Đã hiểu'), findsOneWidget);

      // Dismiss dialog
      await tester.tap(find.text('Đã hiểu'));
      await tester.pumpAndSettle();
    });

    testWidgets('OrderListPage tapping "Mua lại" adds to cart and opens CartPage with selected items', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(home: OrderListPage()),
        ),
      );
      await tester.pumpAndSettle();

      // Scroll to and Tap "Mua lại"
      await tester.ensureVisible(find.byKey(const ValueKey('reorder_button')));
      await tester.tap(find.byKey(const ValueKey('reorder_button')));
      await tester.pumpAndSettle();

      // Verify navigated to CartPage
      expect(find.textContaining('Giỏ hàng'), findsWidgets);
    });

    testWidgets('OrderDetailPage renders order details, items and billing', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(
            home: OrderDetailPage(orderId: 'order-test-01'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Chi tiết đơn hàng'), findsOneWidget);
      expect(find.text('PBL Tech Store'), findsOneWidget);
      expect(find.text('Chuột Gaming không dây'), findsOneWidget);
      expect(find.text('Phương thức thanh toán'), findsOneWidget);
      expect(find.text('Thanh toán khi nhận hàng (COD)'), findsOneWidget);
      expect(find.text('Chi tiết thanh toán'), findsOneWidget);
      expect(find.text('380.000 đ'), findsWidgets);
      expect(find.text('Hủy đơn hàng'), findsOneWidget);
    });

    testWidgets('StoreApplicationPage renders submission form and previous applications', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(
            home: StoreApplicationPage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Đăng ký mở gian hàng'), findsWidgets);
      expect(find.text('Hồ sơ của bạn'), findsOneWidget);
      expect(find.text('Gửi hồ sơ đăng ký'), findsOneWidget);
    });

    testWidgets('FavoritesPage renders favorite products matching web design and handles removal', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(home: FavoritesPage()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Tiếp tục khám phá'), findsOneWidget);
      expect(find.text('Sản phẩm yêu thích'), findsOneWidget);
      expect(find.text('Áo hoodie xám Weekend'), findsOneWidget);
      expect(find.text('Từ 389.000 đ'), findsOneWidget);
      expect(find.text('An Nhiên Studio'), findsOneWidget);
      expect(find.text('Ấm trà kim loại hình học'), findsOneWidget);
      expect(find.text('349.000 đ'), findsOneWidget);
      expect(find.text('Mây Xanh Living'), findsOneWidget);
      expect(find.text('Bỏ yêu thích'), findsNWidgets(2));
      expect(find.text('Thêm vào giỏ'), findsNWidgets(2));
      expect(find.text('Trang 1 · 2 kết quả'), findsOneWidget);

      // Scroll and Tap "Bỏ yêu thích" on first product
      await tester.ensureVisible(find.text('Bỏ yêu thích').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Bỏ yêu thích').first);
      await tester.pumpAndSettle();

      expect(find.text('Áo hoodie xám Weekend'), findsNothing);
      expect(find.text('Ấm trà kim loại hình học'), findsOneWidget);
      expect(find.text('Trang 1 · 1 kết quả'), findsOneWidget);
    });
  });

  group('Chat Center Screen Tests', () {
    testWidgets(
      'Tapping suggestion prompt "Tìm quà tặng" populates text into TextField without immediately sending',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiProvider.overrideWithValue(MockApiClient()),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: ChatCenterView(
                  isPage: true,
                  onClose: () {},
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Ensure visible and tap on suggestion prompt "Tìm quà tặng"
        await tester.ensureVisible(find.text('Tìm quà tặng'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Tìm quà tặng'));
        await tester.pumpAndSettle();

        // Verify textfield now contains "Tìm quà tặng " and message was NOT immediately sent
        final tfFinder = find.byType(TextField);
        expect(tfFinder, findsOneWidget);
        final tfWidget = tester.widget<TextField>(tfFinder);
        expect(tfWidget.controller?.text, 'Tìm quà tặng ');

        // Verify welcome screen is still showing (not navigated away or auto-sent)
        expect(find.text('Bạn đang tìm\nsản phẩm gì?'), findsOneWidget);

        // User enters full query
        await tester.enterText(tfFinder, 'Tìm quà tặng sinh nhật bạn gái');
        await tester.pumpAndSettle();

        // User clicks send arrow button
        await tester.tap(find.byIcon(Icons.arrow_upward_rounded));
        await tester.pumpAndSettle();

        // Verify message was now sent
        expect(find.text('Tìm quà tặng sinh nhật bạn gái'), findsOneWidget);
      },
    );
    testWidgets(
      'ChatCenterView Gian hàng tab renders conversation list matching Image 1 without Image 2 subheader card',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiProvider.overrideWithValue(MockApiClient()),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: ChatCenterView(
                  isPage: true,
                  onClose: () {},
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Switch to Gian hàng tab
        await tester.tap(find.text('Gian hàng'));
        await tester.pumpAndSettle();

        // Verify "Hỗ trợ từ Gian hàng" subheader card (Image 2) is removed
        expect(find.text('Hỗ trợ từ Gian hàng'), findsNothing);
        expect(find.text('Trao đổi và nhận tư vấn trực tiếp từ người bán'), findsNothing);

        // Verify "Hội thoại" header & count badge
        expect(find.text('Hội thoại'), findsOneWidget);

        // Verify store details are preserved: name, category, rating, shipping, initials, timestamp
        expect(find.text('An Nhiên Studio'), findsOneWidget);
        expect(find.text('AN'), findsOneWidget);
        expect(find.text('01:30 03-11'), findsOneWidget);
        expect(find.text('5.0 ★'), findsOneWidget);
        expect(find.text('Gốm sứ & Thủ công'), findsOneWidget);
        expect(find.text('Đồng giá 25.000 đ'), findsOneWidget);

        // Tapping on store opens active store chat
        await tester.tap(find.text('An Nhiên Studio'));
        await tester.pumpAndSettle();

        // Verify store chat header with back button and "Đổi shop"
        expect(find.text('Đổi shop'), findsOneWidget);
        expect(find.text('Đang trực tuyến'), findsOneWidget);

        // Tapping back button returns to conversation list
        await tester.tap(find.text('Đổi shop'));
        await tester.pumpAndSettle();

        expect(find.text('Hội thoại'), findsOneWidget);
        expect(find.text('An Nhiên Studio'), findsOneWidget);
      },
    );
    testWidgets(
      'ChatCenterView renders +, - buttons, no expand or close buttons, removes Enter hint, and toggles history view',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiProvider.overrideWithValue(MockApiClient()),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: ChatCenterView(
                  isPage: true,
                  onClose: () {},
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Verify Header buttons: only + and -
        expect(find.byIcon(Icons.add_rounded), findsOneWidget);
        expect(find.byIcon(Icons.remove_rounded), findsOneWidget);
        expect(find.byIcon(Icons.close_fullscreen_rounded), findsNothing);
        expect(find.byIcon(Icons.open_in_full_rounded), findsNothing);
        expect(find.byIcon(Icons.close_rounded), findsNothing);

        // Verify "Enter để gửi..." is removed
        expect(find.textContaining('Enter để gửi'), findsNothing);
        expect(find.text('0/2000'), findsOneWidget);

        // Verify clicking Trợ lý AI toggles history view (Image 2)
        await tester.tap(find.text('Trợ lý AI'));
        await tester.pumpAndSettle();

        expect(find.text('Lịch sử của bạn'), findsOneWidget);
        expect(find.text('Phiên mới'), findsWidgets);

        // Clicking "+ Phiên mới" starts new chat session
        await tester.tap(find.text('Phiên mới').last);
        await tester.pumpAndSettle();

        expect(find.text('Bạn đang tìm\nsản phẩm gì?'), findsOneWidget);
      },
    );
  });

  group('ApiClient Unit Tests', () {
    test('ApiClient initializes properly', () {
      final client = ApiClient(baseUrl: 'http://localhost:8080/api/v1');
      expect(client.isAuthenticated, isFalse);
      client.setAccessTokenForTesting('mock-token');
      expect(client.isAuthenticated, isTrue);
    });

    test('ApiClient propagates recommendation network errors', () async {
      final client = ApiClient();
      await expectLater(client.getRecommendations(), throwsA(isA<Exception>()));
    });

    test(
      'ApiClient categories fallback returns empty list on network error',
      () async {
        final client = ApiClient(
          baseUrl: 'http://invalid-host-for-testing:9999/api/v1',
        );
        final res = await client.getCategories();
        expect(res, isEmpty);
      },
    );
  });
}

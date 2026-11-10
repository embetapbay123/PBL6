import 'package:pbl6_mobile/features/catalog/recently_viewed_provider.dart';
import 'package:pbl6_mobile/features/chat/chat_ai_modal.dart';
import 'package:pbl6_mobile/features/shared/app_bottom_nav.dart';
import 'package:pbl6_mobile/features/shared/chat_badge_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pbl6_mobile/core/api_client.dart';
import 'package:pbl6_mobile/core/app_theme.dart';
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
import 'package:pbl6_mobile/features/cart/cart_variant_modal.dart';
import 'package:pbl6_mobile/features/checkout/checkout_page.dart';
import 'package:pbl6_mobile/features/checkout/order_success_page.dart';
import 'package:pbl6_mobile/features/customer/customer_settings_page.dart';
import 'package:pbl6_mobile/features/customer/store_application_page.dart';
import 'package:pbl6_mobile/features/customer/favorites_page.dart';
import 'package:pbl6_mobile/features/customer/recently_viewed_page.dart';
import 'package:pbl6_mobile/features/notifications/notifications_page.dart';
import 'package:pbl6_mobile/features/orders/order_list_page.dart';
import 'package:pbl6_mobile/features/orders/order_detail_page.dart';
import 'package:pbl6_mobile/features/shared/recommendations_section.dart';
import 'package:pbl6_mobile/features/catalog/shop_page.dart';
import 'package:pbl6_mobile/features/store/store_provider.dart';
import 'package:pbl6_mobile/features/banner/hero_banner_carousel.dart';

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
  Future<Map<String, dynamic>> getProduct(String id) async {
    if (id == 'prod-oos') {
      return {
        'id': id,
        'title': 'Sản phẩm hết hàng',
        'is_out_of_stock': true,
        'variants': [
          {'id': 'v-1', 'sku': 'OOS', 'price_vnd': '100000', 'available_quantity': 0},
        ],
      };
    }
    if (id == 'prod-hidden') {
      return {
        'id': id,
        'title': 'Sản phẩm đã ẩn',
        'status': 'HIDDEN',
        'variants': [
          {'id': 'v-1', 'sku': 'HID', 'price_vnd': '100000', 'available_quantity': 10},
        ],
      };
    }
    return {
      'id': id,
      'title': 'Bàn phím cơ không dây Bluetooth',
      'description': 'Bàn phím cơ switch Red êm ái, pin 4000mAh',
      'attributes': {'Hãng': 'PBL Tech', 'Bảo hành': '12 tháng'},
      'variants': [
        {'id': 'v-red', 'sku': 'KB-RED', 'price_vnd': '1200000', 'available_quantity': 25},
        {'id': 'v-blue', 'sku': 'KB-BLUE', 'price_vnd': '1250000', 'available_quantity': 10},
      ],
    };
  }

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
  Future<Map<String, dynamic>> getRecommendations() async => {
    'source': 'BASELINE',
    'mode': 'mock',
    'product_ids': ['prod-01'],
  };

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
    List<String>? storeIds,
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
    'following_count': 513,
    'followers_count': 1,
  };

  @override
  Future<Map<String, dynamic>> getUserSocialStats() async => {
    'following_count': 513,
    'followers_count': 1,
  };

  @override
  Future<int> getStoreUnreadMessagesCount() async => 1;

  @override
  Future<Map<String, dynamic>> listOwnOrders({
    int page = 1,
    int size = 50,
  }) async {
    final items = [
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
    ];
    for (final it in items) {
      final id = it['id']?.toString();
      if (id != null && _mockRefunds.containsKey(id)) {
        it['refund_status'] = _mockRefunds[id]!['status'];
        it['refunded_vnd'] = _mockRefunds[id]!['amount_vnd'];
      }
    }
    return {
      'items': items,
      'total': items.length,
      'page': page,
      'size': size,
    };
  }

  @override
  Future<Map<String, dynamic>> getOwnOrder(String id) async => {
    'id': id,
    'purchase_group_id': 'pg-01',
    'store_id': 'store-tech',
    'store_name': 'PBL Tech Store',
    'status': id.contains('comp') ? 'COMPLETED' : 'PENDING',
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

  static final Map<String, Map<String, dynamic>> _mockRefunds = {};

  MockApiClient() {
    _mockRefunds.clear();
  }

  @override
  Future<Map<String, dynamic>?> getOrderRefund(String id) async => _mockRefunds[id];

  @override
  Future<Map<String, dynamic>> requestOrderRefund({
    required String orderId,
    required String reason,
    required int amountVnd,
    List<Map<String, dynamic>>? items,
    String? note,
  }) async {
    _mockRefunds[orderId] = {
      'status': 'PENDING',
      'order_id': orderId,
      'reason': reason,
      'amount_vnd': amountVnd,
    };
    return _mockRefunds[orderId]!;
  }

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
          catalogProductsProvider.overrideWith(
            (ref, query) async => {
              'items': [
                {
                  'id': 'prod-01',
                  'title': 'Áo thun thể thao Dry-Fit',
                  'variants': [
                    {'id': 'v-01', 'sku': 'AT-M', 'price_vnd': '250000'},
                  ],
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
          child: const MaterialApp(home: ProfilePage()),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Tài khoản'), findsNothing);
      expect(find.text('Nguyễn Văn A'), findsOneWidget);
      expect(find.textContaining('Đang theo dõi'), findsNothing);
      expect(find.textContaining('Người theo dõi'), findsNothing);
      expect(find.byIcon(Icons.settings_outlined), findsOneWidget);
      expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
      expect(find.text('user@example.com'), findsOneWidget);
      expect(find.text('CUSTOMER'), findsOneWidget);
      expect(find.text('Tin nhắn với gian hàng'), findsNothing);
      expect(find.text('Sổ địa chỉ nhận hàng', skipOffstage: false), findsOneWidget);
      expect(find.text('Đổi mật khẩu', skipOffstage: false), findsOneWidget);
      expect(find.text('Có thể bạn cũng thích', skipOffstage: false), findsOneWidget);
      expect(find.text('Áo thun thể thao Dry-Fit', skipOffstage: false), findsWidgets);
      expect(find.text('Đăng xuất'), findsNothing);
    });

    testWidgets('ProfilePage loads and displays following and followers count from server', (tester) async {
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          profileProvider.overrideWith(
            (ref) async => {
              'email': 'customer.a@pbl6.test',
              'display_name': '[DEMO] Nguyễn Văn A',
              'phone': '0901234567',
              'roles': ['CUSTOMER'],
              'following_count': 513,
              'followers_count': 1,
            },
          ),
          catalogProductsProvider.overrideWith(
            (ref, query) async => {'items': [], 'total': 0},
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
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('[DEMO] Nguyễn Văn A'), findsOneWidget);
      expect(find.text('customer.a@pbl6.test'), findsOneWidget);
      expect(find.text('513 Đang theo dõi'), findsNothing);
      expect(find.text('1 Người theo dõi'), findsNothing);
      expect(find.text('CUSTOMER'), findsOneWidget);
    });

    testWidgets('CustomerSettingsPage renders settings screen matching design with title Cài đặt and chat button', (tester) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: CustomerSettingsPage(),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Cài đặt'), findsWidgets);
      expect(find.byIcon(Icons.chat_bubble_outline_rounded), findsOneWidget);
      expect(find.text('37'), findsNothing);
      expect(find.descendant(of: find.byType(ChatBadgeButton), matching: find.text('1')), findsOneWidget);
      expect(find.text('Tài khoản của tôi'), findsOneWidget);
      expect(find.text('Tài khoản & Bảo mật'), findsOneWidget);
      expect(find.text('Địa Chỉ'), findsOneWidget);
      expect(find.text('Cài đặt Thông báo'), findsOneWidget);
      expect(find.text('Cài đặt riêng tư'), findsOneWidget);
      expect(find.text('Hỗ trợ', skipOffstage: false), findsOneWidget);
      expect(find.text('Chuyển tài khoản / Đăng xuất', skipOffstage: false), findsOneWidget);

      // Verify removed items are not present
      expect(find.text('Tài khoản / Thẻ ngân hàng'), findsNothing);
      expect(find.text('Người dùng đã bị chặn'), findsNothing);
      expect(find.text('Ngôn ngữ / Language / ភាសា'), findsNothing);
      expect(find.text('Điều khoản Shopee'), findsNothing);
      expect(find.text('Hài lòng với Shopee? Hãy đánh giá ngay!'), findsNothing);
    });

    testWidgets('ProfilePage removes Tin nhắn với gian hàng from account security section', (tester) async {
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          storeUnreadMessagesCountProvider.overrideWith((ref) async => 3),
          profileProvider.overrideWith(
            (ref) async => {
              'email': 'customer@example.com',
              'display_name': 'Nguyễn Văn A',
              'phone': '0901234567',
              'roles': ['CUSTOMER'],
            },
          ),
          catalogProductsProvider.overrideWith(
            (ref, query) async => {'items': [], 'total': 0},
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
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Tin nhắn với gian hàng'), findsNothing);
      expect(find.text('Địa chỉ nhận hàng', skipOffstage: false), findsOneWidget);
      expect(find.text('Đổi mật khẩu', skipOffstage: false), findsOneWidget);
    });

    testWidgets('StoreMessagesPage renders conversations and matching header', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            storeUnreadMessagesCountProvider.overrideWith((ref) async => 0),
          ],
          child: const MaterialApp(
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

      expect(find.text('Thông tin cá nhân'), findsWidgets);
      expect(find.text('Trần Thị B'), findsOneWidget);
      expect(find.text('*********78'), findsOneWidget);
      expect(find.text('Tên'), findsOneWidget);
      expect(find.text('Tiểu sử'), findsOneWidget);
      expect(find.text('Giới tính'), findsOneWidget);
      expect(find.text('Ngày sinh'), findsOneWidget);
      expect(find.text('Số điện thoại'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Tài khoản liên kết'), findsNothing);
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
      expect(find.text('0987654321'), findsOneWidget);
      expect(find.byIcon(Icons.refresh), findsNothing);
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

        final searchField = find.byType(TextField);
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
      'CatalogPage search bar click displays search suggestions screen matching Image 2 with Gợi ý tìm kiếm, keyword tags and best-sellers for new users',
      (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
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
                    'id': 'prod-01',
                    'title': 'Pate Snappy Tom 400g',
                    'price_vnd': 45000,
                    'monthly_sales': 2500,
                  },
                  {
                    'id': 'prod-02',
                    'title': 'Dây Sạc Baseus iPhone',
                    'price_vnd': 89000,
                    'monthly_sales': 3200,
                  },
                ],
                'total': 2,
              },
            ),
            categoriesProvider.overrideWith((ref) async => []),
            cartItemsProvider.overrideWith((ref) async => {'items': []}),
          ],
        );

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(home: CatalogPage()),
          ),
        );
        await tester.pumpAndSettle();

        // Initially in explore mode
        expect(find.text('Gợi ý tìm kiếm'), findsNothing);

        // Tap search bar to open suggestions
        final searchBar = find.byType(TextField);
        await tester.tap(searchBar);
        await tester.pumpAndSettle();

        // Verify Search Suggestions screen (Image 2) is now displayed
        expect(find.text('Gợi ý tìm kiếm'), findsOneWidget);
        expect(find.text('Mì Tôm Hảo Hảo'), findsNothing);
        expect(find.byIcon(Icons.delete_outline_rounded), findsNothing);
        expect(find.byIcon(Icons.camera_alt_outlined), findsOneWidget);

        // Product names from the app are shown as tags and in suggestions
        expect(find.text('Pate Snappy Tom 400g'), findsWidgets);
        expect(find.text('Dây Sạc Baseus iPhone'), findsWidgets);

        // Tap back arrow to return to catalog
        await tester.tap(find.byIcon(Icons.arrow_back));
        await tester.pumpAndSettle();

        expect(find.text('Gợi ý tìm kiếm'), findsNothing);
      },
    );

    testWidgets(
      'CatalogPage search bar displays user search history when searched before, and only displays products when never searched',
      (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
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
                    'id': 'prod-01',
                    'title': 'Pate Snappy Tom 400g',
                    'price_vnd': 45000,
                    'monthly_sales': 2500,
                  },
                ],
                'total': 1,
              },
            ),
            categoriesProvider.overrideWith((ref) async => []),
            cartItemsProvider.overrideWith((ref) async => {'items': []}),
          ],
        );

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(home: CatalogPage()),
          ),
        );
        await tester.pumpAndSettle();

        // 1. Initial state: never searched -> product tags shown, no 'Lịch sử tìm kiếm'
        final searchBar = find.byType(TextField);
        await tester.tap(searchBar);
        await tester.pumpAndSettle();

        expect(find.text('Lịch sử tìm kiếm'), findsNothing);
        expect(find.text('Pate Snappy Tom 400g'), findsWidgets);

        // 2. Perform a search for 'áo hoodie'
        await tester.enterText(find.byType(TextField), 'áo hoodie');
        await tester.testTextInput.receiveAction(TextInputAction.search);
        await tester.pumpAndSettle();

        // 3. Tap search bar again to open suggestions: now has search history!
        final activeSearchBar = find.byType(TextField);
        await tester.tap(activeSearchBar);
        await tester.pumpAndSettle();

        expect(find.text('Lịch sử tìm kiếm'), findsOneWidget);
        expect(find.descendant(of: find.byType(Wrap), matching: find.text('áo hoodie')), findsOneWidget);
        expect(find.byIcon(Icons.delete_outline_rounded), findsOneWidget);

        // 4. Tap delete icon to clear history -> reverts back to products tags
        await tester.tap(find.byIcon(Icons.delete_outline_rounded));
        await tester.pumpAndSettle();

        expect(find.text('Lịch sử tìm kiếm'), findsNothing);
        expect(find.text('Pate Snappy Tom 400g'), findsWidgets);
      },
    );

    testWidgets(
      'HeroBannerCarousel in lib/features/banner renders both fashion and home banners with swipeable carousel',
      (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: HeroBannerCarousel(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Initially Banner 1 is visible
        expect(find.text('TỪ NHỮNG ĐIỀU GIẢN ĐƠN'), findsOneWidget);
        expect(find.text('Khám phá thời trang'), findsOneWidget);

        // Swipe left to Banner 2 ("Nhà là nơi bạn muốn về.")
        await tester.drag(find.byType(PageView), const Offset(-500, 0));
        await tester.pumpAndSettle();

        expect(find.text('CHĂM CHÚT GÓC NHỎ'), findsOneWidget);
        expect(find.text('Xem đồ dùng cho nhà'), findsOneWidget);
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
        expect(find.byTooltip('Thông báo'), findsOneWidget);
        expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
        expect(find.byIcon(Icons.menu_rounded), findsNothing);
        expect(find.text('Sản phẩm dành cho bạn', skipOffstage: false), findsOneWidget);
        expect(find.text('Bạn đang tìm gì?', skipOffstage: false), findsOneWidget);
        expect(find.text('Xem tất cả'), findsNothing);
        expect(find.text('Thời trang', skipOffstage: false), findsWidgets);
        expect(find.text('Góc làm việc', skipOffstage: false), findsOneWidget);
        expect(find.text('Nhà cửa & đời sống', skipOffstage: false), findsOneWidget);
        expect(find.text('Túi & phụ kiện', skipOffstage: false), findsOneWidget);

        // Verify scrolling horizontally reveals more categories until end
        final horizontalScroll = find.ancestor(
          of: find.text('Góc làm việc'),
          matching: find.byType(SingleChildScrollView),
        );
        expect(horizontalScroll, findsOneWidget);
        await tester.drag(horizontalScroll, const Offset(-400, 0), warnIfMissed: false);
        await tester.pumpAndSettle();
        expect(find.text('Sách & Văn phòng phẩm', skipOffstage: false), findsOneWidget);

        expect(find.text('Áo thun thể thao Dry-Fit', skipOffstage: false), findsWidgets);
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

      expect(find.text('Sổ tay ghi chép Daily Notes'), findsWidgets);

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

      // Verified: Heart button background remains white when clicked
      final heartContainer = tester.widget<Container>(
        find.ancestor(of: filledHeartFinder, matching: find.byType(Container)).first,
      );
      expect((heartContainer.decoration as BoxDecoration).color, Colors.white);



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
        tester.view.physicalSize = const Size(800, 1400);
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
        expect(find.text('KHÁM PHÁ CÙNG PBL6'), findsNothing);
        expect(find.text('Trang chủ'), findsOneWidget);
        expect(find.text('Bộ lọc'), findsOneWidget);
        expect(find.text('Áo hoodie xám Weekend'), findsWidgets);
        expect(find.text('Thêm vào giỏ'), findsOneWidget);

        // Verify 'Thêm vào giỏ' button hover states (orange background, white foreground and icon)
        final addToCartBtnFinder = find.widgetWithText(OutlinedButton, 'Thêm vào giỏ');
        final outlinedBtn = tester.widget<OutlinedButton>(addToCartBtnFinder);
        expect(
          outlinedBtn.style?.backgroundColor?.resolve({WidgetState.hovered}),
          AppColors.primary,
        );
        expect(
          outlinedBtn.style?.foregroundColor?.resolve({WidgetState.hovered}),
          Colors.white,
        );
        expect(
          outlinedBtn.style?.iconColor?.resolve({WidgetState.hovered}),
          Colors.white,
        );
        expect(
          outlinedBtn.style?.backgroundColor?.resolve({}),
          Colors.white,
        );
        expect(
          outlinedBtn.style?.foregroundColor?.resolve({}),
          const Color(0xFF374151),
        );

        // Tap "Thêm vào giỏ" on multi-variant product opens CartVariantModal (Image 2)
        await tester.tap(addToCartBtnFinder);
        await tester.pumpAndSettle();

        expect(find.byType(CartVariantModal), findsOneWidget);
        expect(find.text('Xác nhận'), findsOneWidget);
        expect(find.text('Số lượng'), findsOneWidget);

        // Close variant modal via modal close button
        await tester.tap(
          find.descendant(of: find.byType(CartVariantModal), matching: find.byIcon(Icons.close)),
        );
        await tester.pumpAndSettle();

        // Verify active filter tag row and "Xóa bộ lọc" are removed
        expect(find.text('Xóa bộ lọc'), findsNothing);

        // Tap "PBL6 Market" returns to home mode
        await tester.tap(find.text('PBL6 Market'));
        await tester.pumpAndSettle();

        expect(find.text('Sản phẩm dành cho bạn', skipOffstage: false), findsOneWidget);

        // Search again and verify clicking 'PBL6 Market' brand logo routes back to Explore
        await tester.enterText(find.byType(TextField).first, 'hoodie');
        await tester.tap(find.text('Tìm kiếm'));
        await tester.pumpAndSettle();
        expect(find.text('Áo hoodie xám Weekend'), findsWidgets);

        // Tap back button next to search bar -> routes back to Explore
        expect(find.byIcon(Icons.arrow_back), findsOneWidget);
        await tester.tap(find.byIcon(Icons.arrow_back));
        await tester.pumpAndSettle();
        expect(find.text('Sản phẩm dành cho bạn', skipOffstage: false), findsOneWidget);
        expect(find.byIcon(Icons.arrow_back), findsNothing);
      },
    );

    testWidgets(
      'Recently viewed section dynamically renders products viewed on ProductDetailPage',
      (tester) async {
        final mockProduct = {
          'id': 'recent-test-01',
          'title': 'Bàn phím cơ DareU EK87 Pro',
          'price_vnd': 450000,
          'image_url': 'https://example.com/keyboard.jpg',
          'variants': [
            {'id': 'v-1', 'price_vnd': 450000},
          ],
        };

        final container = ProviderContainer(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            catalogProductsProvider.overrideWith(
              (ref, query) async => {'items': [], 'total': 0},
            ),
            categoriesProvider.overrideWith((ref) async => []),
            recommendationProvider.overrideWith((ref) async => {'product_ids': []}),
          ],
        );

        // 1. Initially no products viewed -> "Đã xem gần đây" is hidden
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(home: CatalogPage()),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Đã xem gần đây'), findsNothing);

        // 2. User opens ProductDetailPage for mockProduct -> recorded in recentlyViewedProvider
        container.read(recentlyViewedProvider.notifier).addProduct(mockProduct);
        await tester.pumpAndSettle();

        // 3. Now "Đã xem gần đây" is visible with the viewed product
        expect(find.text('Đã xem gần đây', skipOffstage: false), findsOneWidget);
        expect(find.text('Bàn phím cơ DareU EK87 Pro', skipOffstage: false), findsOneWidget);
        expect(find.text('450.000 ₫', skipOffstage: false), findsOneWidget);
      },
    );

    testWidgets(
      'CatalogPage defaults to Bán chạy sort and provides Mới nhất, Bán chạy, Giá tăng/giảm (no Tên sản phẩm)',
      (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
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
                    'id': 'prod-01',
                    'title': 'Sản phẩm B (Vừa)',
                    'price_vnd': 200000,
                    'monthly_sales': 500,
                    'created_at': '2026-10-01T00:00:00Z',
                    'category_id': 'cat-1',
                  },
                  {
                    'id': 'prod-02',
                    'title': 'Sản phẩm A (Bán chạy nhất)',
                    'price_vnd': 300000,
                    'monthly_sales': 1500,
                    'created_at': '2026-09-01T00:00:00Z',
                    'category_id': 'cat-1',
                  },
                  {
                    'id': 'prod-03',
                    'title': 'Sản phẩm C (Mới nhất)',
                    'price_vnd': 100000,
                    'monthly_sales': 100,
                    'created_at': '2026-11-01T00:00:00Z',
                    'category_id': 'cat-1',
                  },
                ],
                'total': 3,
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

        // 1. Verify sort chips in explore mode contain 'Bán chạy' and 'Mới nhất'
        expect(find.text('Bán chạy'), findsOneWidget);
        expect(find.text('Mới nhất'), findsOneWidget);

        // By default 'Bán chạy' (highest monthly sales) is first
        final titlesBefore = tester
            .widgetList<Text>(find.descendant(of: find.byType(SliverGrid), matching: find.byType(Text)))
            .map((t) => t.data)
            .where((t) => t != null && t.startsWith('Sản phẩm ') && t != 'Sản phẩm dành cho bạn')
            .toList();
        expect(titlesBefore.first, 'Sản phẩm A (Bán chạy nhất)');

        // Switch to Mới nhất chip
        await tester.tap(find.text('Mới nhất'));
        await tester.pumpAndSettle();

        final titlesNewest = tester
            .widgetList<Text>(find.descendant(of: find.byType(SliverGrid), matching: find.byType(Text)))
            .map((t) => t.data)
            .where((t) => t != null && t.startsWith('Sản phẩm ') && t != 'Sản phẩm dành cho bạn')
            .toList();
        expect(titlesNewest.first, 'Sản phẩm C (Mới nhất)');

        // 2. Transition to search / category view to test Dropdown
        await tester.enterText(find.byType(TextField).first, 'Sản phẩm');
        await tester.tap(find.text('Tìm kiếm'));
        await tester.pumpAndSettle();

        // The Dropdown should exist and display current sort (defaults to Bán chạy on new search)
        final dropdownFinder = find.byType(PopupMenuButton<String>);
        expect(dropdownFinder, findsOneWidget);
        expect(find.descendant(of: dropdownFinder, matching: find.text('Bán chạy')), findsOneWidget);

        // Tap dropdown to open menu
        await tester.tap(dropdownFinder);
        await tester.pumpAndSettle();

        // Check options inside popup (NO 'Tên sản phẩm')
        expect(find.text('Bán chạy'), findsWidgets);
        expect(find.text('Mới nhất'), findsWidgets);
        expect(find.text('Tên sản phẩm'), findsNothing);
        expect(find.text('Giá tăng dần'), findsWidgets);
        expect(find.text('Giá giảm dần'), findsWidgets);

        // Tap 'Giá tăng dần'
        await tester.tap(find.text('Giá tăng dần').last);
        await tester.pumpAndSettle();

        final titlesPriceAsc = tester
            .widgetList<Text>(find.descendant(of: find.byType(SliverGrid), matching: find.byType(Text)))
            .map((t) => t.data)
            .where((t) => t != null && t.startsWith('Sản phẩm ') && t != 'Sản phẩm dành cho bạn')
            .toList();
        expect(titlesPriceAsc.first, 'Sản phẩm C (Mới nhất)'); // 100k

        // 3. Changing to a new search keyword resets sort to 'Bán chạy'
        await tester.enterText(find.byType(TextField).first, 'áo');
        await tester.tap(find.text('Tìm kiếm'));
        await tester.pumpAndSettle();

        expect(find.descendant(of: dropdownFinder, matching: find.text('Bán chạy')), findsOneWidget);
      },
    );

    testWidgets('CatalogPage excludes out-of-stock products from the product list and search suggestions', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            catalogProductsProvider.overrideWith(
              (ref, query) async => {
                'items': [
                  {
                    'id': 'p-available',
                    'title': 'Sản phẩm có sẵn',
                    'price_vnd': 50000,
                    'is_out_of_stock': false,
                  },
                  {
                    'id': 'p-oos',
                    'title': 'Sản phẩm đã bán hết',
                    'price_vnd': 60000,
                    'is_out_of_stock': true,
                  },
                ],
                'total': 2,
              },
            ),
          ],
          child: const MaterialApp(
            home: CatalogPage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Available product is shown
      expect(find.text('Sản phẩm có sẵn', skipOffstage: false), findsWidgets);
      // Out-of-stock product is NOT shown
      expect(find.text('Sản phẩm đã bán hết', skipOffstage: false), findsNothing);
    });

    testWidgets('AppBottomNav renders 4 tabs without Đã lưu button', (tester) async {
      int tappedIndex = -1;
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatBadgeCountProvider.overrideWithValue(5),
          ],
          child: MaterialApp(
            home: Scaffold(
              bottomNavigationBar: AppBottomNav(
                currentIndex: 0,
                cartCount: 2,
                onTap: (index) => tappedIndex = index,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Khám phá'), findsOneWidget);
      expect(find.text('Giỏ hàng'), findsOneWidget);
      expect(find.text('Chat'), findsOneWidget);
      expect(find.text('37'), findsNothing);
      expect(find.text('5'), findsOneWidget);
      expect(find.text('Cá nhân'), findsOneWidget);
      expect(find.text('Đã lưu'), findsNothing);

      // Verify tap on Giỏ hàng triggers index 1
      await tester.tap(find.text('Giỏ hàng'));
      expect(tappedIndex, 1);
    });

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

        expect(find.byType(PageView), findsOneWidget);
        expect(find.text('Bàn phím cơ không dây Bluetooth'), findsWidgets);
        expect(find.text('Đang bán'), findsNothing);
        expect(find.text('Tất cả sản phẩm'), findsNothing);
        expect(find.textContaining('Mã SKU'), findsNothing);
        expect(find.text('1200000 ₫'), findsOneWidget);
        expect(find.textContaining('Đã bán'), findsWidgets);
        expect(find.text('KB-RED (1200000 ₫)'), findsOneWidget);
        expect(find.text('KB-BLUE (1250000 ₫)'), findsOneWidget);
        expect(find.text('Thêm vào giỏ'), findsOneWidget);
        expect(find.text('Mua ngay'), findsOneWidget);

        // Change variant
        await tester.ensureVisible(find.text('KB-BLUE (1250000 ₫)'));
        await tester.tap(find.text('KB-BLUE (1250000 ₫)'));
        await tester.pumpAndSettle();
        expect(find.text('1250000 ₫'), findsOneWidget);

        // Increase quantity
        expect(find.text('1'), findsWidgets);
        await tester.ensureVisible(find.byIcon(Icons.add));
        await tester.tap(find.byIcon(Icons.add));
        await tester.pumpAndSettle();
        expect(find.text('2'), findsWidgets);

        // Verify out of stock displays 'Đã hết'
        await tester.pumpWidget(
          ProviderScope(
            overrides: [apiProvider.overrideWithValue(MockApiClient())],
            child: MaterialApp(
              home: ProductDetailPage(
                key: UniqueKey(),
                productId: 'prod-oos',
                initialProduct: const {
                  'id': 'prod-oos',
                  'title': 'Sản phẩm hết hàng',
                  'is_out_of_stock': true,
                },
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Đã hết'), findsOneWidget);

        // Verify hidden product displays 'Đã ẩn'
        await tester.pumpWidget(
          ProviderScope(
            overrides: [apiProvider.overrideWithValue(MockApiClient())],
            child: MaterialApp(
              home: ProductDetailPage(
                key: UniqueKey(),
                productId: 'prod-hidden',
                initialProduct: const {
                  'id': 'prod-hidden',
                  'title': 'Sản phẩm đã ẩn',
                  'status': 'HIDDEN',
                },
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Đã ẩn'), findsOneWidget);
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

        // Verify Chat button is present next to Sửa in AppBar
        expect(find.byTooltip('Chat'), findsOneWidget);
        expect(find.byIcon(Icons.chat_bubble_outline_rounded), findsOneWidget);
        expect(find.text('37'), findsNothing);
        expect(find.descendant(of: find.byType(ChatBadgeButton), matching: find.text('1')), findsOneWidget);

        // Verify bottom navigation bar (AppBottomNav) is removed from CartPage
        expect(find.text('Khám phá'), findsNothing);
        expect(find.text('Cá nhân'), findsNothing);

        // Select All items
        await tester.tap(find.text('Chọn tất cả sản phẩm'));
        await tester.pumpAndSettle();

        expect(find.text('Mua hàng (3)'), findsOneWidget);
        expect(find.text('1250000 ₫'), findsOneWidget);

        // Verify inline delete button is removed from row
        expect(find.byIcon(Icons.delete_outline), findsNothing);

        // Swiping cart item from right to left reveals red Xóa button
        await tester.drag(find.text('Chuột Gaming không dây'), const Offset(-120, 0));
        await tester.pumpAndSettle();
        expect(find.text('Xóa'), findsNWidgets(2));

        // Tapping Xóa opens confirmation dialog
        await tester.tap(find.text('Xóa').first);
        await tester.pumpAndSettle();
        expect(find.text('Xác nhận xóa'), findsOneWidget);
        expect(find.text('Bạn có chắc muốn xóa "Chuột Gaming không dây" khỏi giỏ hàng?'), findsOneWidget);

        // Confirm deletion
        await tester.tap(find.widgetWithText(FilledButton, 'Xóa'));
        await tester.pumpAndSettle();
        expect(find.text('Đã xóa sản phẩm khỏi giỏ hàng.'), findsOneWidget);
        await tester.tap(find.text('Đồng ý'));
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'CartPage search bar filters cart items inline without navigating to another page and search button has Tìm kiếm label',
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

        // Initially both items are shown
        expect(find.text('Chuột Gaming không dây'), findsOneWidget);
        expect(find.text('Áo hoodie Unisex'), findsOneWidget);

        // Search button has text 'Tìm kiếm'
        expect(find.text('Tìm kiếm'), findsOneWidget);

        // Search for 'hoodie'
        final searchField = find.byType(TextField);
        await tester.enterText(searchField, 'hoodie');
        await tester.tap(find.text('Tìm kiếm'));
        await tester.pumpAndSettle();

        // CartPage stays on cart, filters items: 'Áo hoodie Unisex' visible, 'Chuột Gaming' filtered out
        expect(find.text('Giỏ hàng của bạn'), findsOneWidget);
        expect(find.text('Áo hoodie Unisex'), findsOneWidget);
        expect(find.text('Chuột Gaming không dây'), findsNothing);

        // Clear search restores all items
        await tester.tap(find.byIcon(Icons.close));
        await tester.pumpAndSettle();
        expect(find.text('Chuột Gaming không dây'), findsOneWidget);
        expect(find.text('Áo hoodie Unisex'), findsOneWidget);
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

        // Quantity is editable via text input
        final modalQtyField = find.descendant(
          of: find.byType(CartVariantModal),
          matching: find.byType(TextField),
        );
        expect(modalQtyField, findsOneWidget);
        await tester.enterText(modalQtyField, '5');
        await tester.pumpAndSettle();
        expect(find.text('5'), findsWidgets);

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
      expect(find.byTooltip('Chat'), findsOneWidget);
      expect(find.text('Khám phá'), findsNothing);
    });

    testWidgets('CartPage tapping Sửa switches bottom bar to Lưu vào Đã thích and Xóa buttons', (tester) async {
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

      // Before edit mode: "Mua hàng (0)" is visible
      expect(find.text('Mua hàng (0)'), findsOneWidget);
      expect(find.text('Lưu vào Đã thích'), findsNothing);

      // Tap "Sửa"
      await tester.tap(find.text('Sửa'));
      await tester.pumpAndSettle();

      // In edit mode: "Mua hàng (0)" is replaced by "Lưu vào Đã thích" and "Xóa"
      expect(find.text('Mua hàng (0)'), findsNothing);
      expect(find.text('Lưu vào Đã thích'), findsOneWidget);
      expect(find.widgetWithText(OutlinedButton, 'Xóa'), findsOneWidget);

      // Select item
      await tester.tap(find.text('Chọn tất cả (1)'));
      await tester.pumpAndSettle();

      // Tap "Lưu vào Đã thích"
      await tester.tap(find.text('Lưu vào Đã thích'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Đã lưu 1 sản phẩm vào Đã thích!'), findsOneWidget);
      await tester.tap(find.text('Đồng ý'));
      await tester.pumpAndSettle();
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
        expect(find.text('Voucher'), findsOneWidget);
        expect(find.text('Voucher toàn sàn PBL6'), findsNothing);
        expect(find.text('DEMO-SAN-5K'), findsNothing);

        // Tap on the voucher field to open VoucherSelectionPage
        final voucherField = find.byKey(const Key('checkout_voucher_field'));
        await tester.ensureVisible(voucherField);
        await tester.pumpAndSettle();
        await tester.tap(voucherField);
        await tester.pumpAndSettle();

        // On VoucherSelectionPage (matching Image 2)
        expect(find.text('Chọn Voucher'), findsOneWidget);
        expect(find.text('Ưu đãi toàn sàn'), findsOneWidget);
        expect(find.text('DEMO-SAN-5K'), findsOneWidget);
        expect(find.text('Ưu đãi từ cửa hàng'), findsOneWidget);
        expect(find.text('DEMO-B-10K'), findsOneWidget);

        // Tap to select DEMO-SAN-5K
        await tester.tap(find.text('DEMO-SAN-5K'));
        await tester.pumpAndSettle();

        // Tap 'Đồng ý'
        await tester.tap(find.text('Đồng ý'));
        await tester.pumpAndSettle();

        expect(find.text('DEMO-SAN-5K'), findsOneWidget);

        expect(find.text('Chi tiết báo giá'), findsOneWidget);
        expect(find.text('1250000 ₫'), findsWidgets);
        expect(find.text('Đặt hàng'), findsOneWidget);

        // Verify single store notice banner is removed
        expect(find.textContaining('Đơn hàng này chỉ gồm sản phẩm của'), findsNothing);

        // Verify payment method dropdown
        expect(find.text('Chọn phương thức:'), findsOneWidget);
        expect(find.byKey(const Key('payment_method_dropdown')), findsOneWidget);

        // Tap Điều khoản đặt hàng opens OrderTermsPage
        await tester.ensureVisible(find.text('Điều khoản đặt hàng'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Điều khoản đặt hàng'));
        await tester.pumpAndSettle();

        expect(find.text('Điều khoản & Quy định Mua sắm'), findsOneWidget);
        expect(find.text('Báo giá & Thời hạn giữ giá (Quote Expiry)'), findsOneWidget);
        expect(find.text('Tôi đã hiểu và đồng ý'), findsOneWidget);

        // Tap Tôi đã hiểu và đồng ý returns to CheckoutPage
        await tester.tap(find.text('Tôi đã hiểu và đồng ý'));
        await tester.pumpAndSettle();
        expect(find.text('Chi tiết báo giá'), findsOneWidget);
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
        expect(find.text('Đơn hàng của bạn đã được ghi nhận thành công'), findsOneWidget);
        expect(find.textContaining('Mã nhóm mua sắm'), findsNothing);
        expect(find.textContaining('Mã đơn hàng'), findsNothing);
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
      expect(find.byKey(const Key('order_success_cart_button')), findsOneWidget);
      expect(find.text('Đơn hàng của bạn đã được ghi nhận thành công'), findsOneWidget);
      expect(find.textContaining('Mã nhóm mua sắm'), findsNothing);
      expect(find.textContaining('Mã đơn hàng'), findsNothing);
      expect(find.text('750.000 đ'), findsOneWidget);
      expect(find.text('Store: store-a'), findsOneWidget);
      expect(find.text('Store: store-b'), findsOneWidget);
      expect(find.text('Hình thức: COD'), findsOneWidget);
      expect(find.text('Hình thức: SEPAY'), findsOneWidget);
      expect(find.text('300.000 đ'), findsOneWidget);
      expect(find.text('450.000 đ'), findsOneWidget);
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
      final backBtn = find.ancestor(of: find.byIcon(Icons.arrow_back_ios_new), matching: find.byType(IconButton));
      final searchBtn = find.ancestor(of: find.byIcon(Icons.search), matching: find.byType(IconButton));
      final backRight = tester.getTopRight(backBtn).dx;
      final searchLeft = tester.getTopLeft(searchBtn).dx;
      final titleCenter = tester.getCenter(find.text('Đơn hàng của tôi')).dx;
      final expectedCenter = (backRight + searchLeft) / 2;
      // Verify title is centered between back button and search button
      expect((titleCenter - expectedCenter).abs(), lessThan(3.0));
      expect(find.widgetWithText(Tab, 'Tất cả'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Chờ xác nhận'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Đang xử lý'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Đang giao'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Hoàn thành'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Đã hủy'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Trả hàng/Hoàn tiền'), findsOneWidget);

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
      expect(find.text('37'), findsNothing);
      expect(find.descendant(of: find.byType(ChatBadgeButton), matching: find.text('1')), findsOneWidget);

      // Verify page background is light grey
      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
      expect(scaffold.backgroundColor, const Color(0xFFF6F6F6));

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
      expect(find.widgetWithText(OutlinedButton, 'Trả hàng/Hoàn tiền'), findsOneWidget);
      expect(find.widgetWithText(OutlinedButton, 'Mua lại'), findsOneWidget);

      final refundBtn = tester.widget<OutlinedButton>(find.byKey(const ValueKey('refund_button')));
      final reorderBtn = tester.widget<OutlinedButton>(find.byKey(const ValueKey('reorder_button')));

      // Refund button has black text/border
      final refundStyle = refundBtn.style;
      expect(refundStyle?.foregroundColor?.resolve({}), const Color(0xFF1F2937));

      // Reorder button has orange text/border
      final reorderStyle = reorderBtn.style;
      expect(reorderStyle?.foregroundColor?.resolve({}), const Color(0xFFBA3416));
    });

    testWidgets('OrderListPage renders Trả hàng/Hoàn tiền tab and filters refund orders', (tester) async {
      final mock = MockApiClient();
      await mock.requestOrderRefund(
        orderId: 'order-test-02',
        reason: 'Sản phẩm lỗi',
        amountVnd: 450000,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(mock)],
          child: const MaterialApp(home: OrderListPage(initialIndex: 6)),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.widgetWithText(Tab, 'Trả hàng/Hoàn tiền'), findsOneWidget);
      expect(find.text('PBL Fashion Hub'), findsOneWidget);
      expect(find.text('Áo hoodie Unisex'), findsOneWidget);
      expect(find.textContaining('Yêu cầu hoàn tiền'), findsOneWidget);
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

    testWidgets('OrderDetailPage renders Trả hàng/Hoàn tiền, Đánh giá and Mua lại for completed orders', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(
            home: OrderDetailPage(
              orderId: 'order-test-comp',
              initialOrder: {
                'id': 'order-test-comp',
                'status': 'COMPLETED',
                'store_name': 'PBL Tech Store',
                'payment_method': 'COD',
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Trả hàng/Hoàn tiền'), findsOneWidget);
      expect(find.text('Đánh giá'), findsOneWidget);
      expect(find.text('Mua lại'), findsOneWidget);

      // Tapping "Mua lại" adds items with order quantity to cart and navigates to CartPage
      await tester.tap(find.text('Mua lại'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Giỏ hàng'), findsWidgets);
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

    testWidgets('FavoritesPage renders favorite products matching modern design and handles removal', (tester) async {
      const sampleFavorite = FavoriteProductItem(
        id: 'fav-item-1',
        title: 'Áo thun xám Basic Essential',
        storeId: 'store-1',
        storeName: 'An Nhiên Studio',
        priceVnd: 169000,
        priceDisplay: '169.000 đ',
        optionLabel: '4 lựa chọn',
        imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80',
        variantId: 'v-1',
        categoryName: 'Thời trang',
        discountPercent: 25,
        soldCount: '1.2k đã bán',
      );

      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
          favoritesProvider.overrideWith((ref) => FavoritesNotifier([sampleFavorite])),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: FavoritesPage()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Đã lưu'), findsOneWidget);
      expect(find.text('Lượt Thích'), findsNothing);
      expect(find.text('Chỉnh sửa'), findsNothing);
      expect(find.text('Tất Cả'), findsOneWidget);
      expect(find.text('Trạng thái'), findsOneWidget);
      expect(find.text('Giảm giá'), findsOneWidget);
      expect(find.text('Ngành hàng'), findsOneWidget);

      // Verify product info matching catalog design
      expect(find.text('Áo thun xám Basic Essential'), findsOneWidget);
      expect(find.text('169000 ₫'), findsOneWidget);
      expect(find.text('-25%'), findsOneWidget);
      expect(find.textContaining('1.2k đã bán'), findsOneWidget);
      expect(find.text('Thêm vào giỏ'), findsOneWidget);
      expect(find.textContaining('An Nhiên Studio'), findsOneWidget);
      expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);

      // Test search with no matching product -> shows 'Không tìm thấy sản phẩm' and no heart icon
      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'từ khóa không tồn tại');
      await tester.pumpAndSettle();

      expect(find.text('Không tìm thấy sản phẩm'), findsOneWidget);
      expect(find.byIcon(Icons.favorite_border_rounded), findsNothing);
      expect(find.byIcon(Icons.favorite_rounded), findsNothing);

      // Clear search
      await tester.tap(find.text('Xóa tìm kiếm'));
      await tester.pumpAndSettle();

      expect(find.text('Áo thun xám Basic Essential'), findsOneWidget);

      // Test removal via heart icon tap
      await tester.tap(find.byIcon(Icons.favorite_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Áo thun xám Basic Essential'), findsNothing);
      expect(find.text('Chưa có sản phẩm yêu thích'), findsOneWidget);
      expect(find.byIcon(Icons.favorite_border_rounded), findsOneWidget);
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

  group('RecommendationsSection Tests', () {
    testWidgets('RecommendationsSection renders 10 products, no "Xem tất cả", and cards match design', (tester) async {
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final tenProducts = List.generate(10, (i) => {
        'id': 'rec-prod-$i',
        'title': 'Sản phẩm gợi ý $i',
        'price_vnd': 349000,
        'monthly_sales': 1200,
        'rating': '4.9',
        'variants': [
          {'id': 'v-$i', 'price_vnd': 349000},
        ],
      });

      final container = ProviderContainer(
        overrides: [
          catalogProductsProvider.overrideWith((ref, query) async {
            return {
              'items': tenProducts,
              'total': 15,
              'page': 1,
              'size': 10,
            };
          }),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: RecommendationsSection(),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      // Check header title exists
      expect(find.text('Có thể bạn cũng thích'), findsOneWidget);
      // Check "Xem tất cả" is NOT present
      expect(find.text('Xem tất cả'), findsNothing);
      expect(find.text('Xem tất cả >'), findsNothing);
      expect(find.text('Xem tất cả ›'), findsNothing);

      // Check product items
      expect(find.text('Sản phẩm gợi ý 0'), findsOneWidget);
      expect(find.text('Sản phẩm gợi ý 9'), findsOneWidget);
      // Check discount badge
      expect(find.text('-25%'), findsNWidgets(10));
      // Check price formatted
      expect(find.text('349.000 đ'), findsNWidgets(10));
      // Check sales
      expect(find.text('Đã bán 1,2K'), findsNWidgets(10));
      // Check 'Thêm vào giỏ' button on cards
      expect(find.widgetWithText(OutlinedButton, 'Thêm vào giỏ'), findsNWidgets(10));
    });
  });

  group('ShopPage Tests', () {
    testWidgets('ShopPage renders store info at top with orange background, no empty slogan banner', (tester) async {
      tester.view.physicalSize = const Size(800, 2000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(
            home: ShopPage(
              shopName: 'TechZone Official',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Slogan is removed (no empty beige banner)
      expect(find.text('Công nghệ\nkiến tạo cuộc sống tốt đẹp hơn'), findsNothing);

      // Store info exists in top header and slogan intro card
      expect(find.text('TechZone Official'), findsWidgets);
      expect(find.text('Công nghệ chính hãng'), findsOneWidget);
      expect(find.text('4.9'), findsWidgets);
      expect(find.text('| 12,5K người theo dõi'), findsNothing);
      expect(find.text('98% phản hồi tích cực'), findsOneWidget);

      // Action buttons: Chat button present, follow button removed
      expect(find.widgetWithText(OutlinedButton, 'Chat'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, '+ Theo dõi'), findsNothing);

      // Stats row with real data (6 products, 4.8 real rating, 0 duration when no backend date)
      expect(find.text('6'), findsOneWidget);
      expect(find.text('4.8'), findsWidgets);
      expect(find.text('0'), findsOneWidget);
      expect(find.text('Hoạt động'), findsOneWidget);

      // Tab bar directly below (no "Đánh giá" tab)
      expect(find.widgetWithText(Tab, 'Trang chủ'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Sản phẩm'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Danh mục'), findsOneWidget);
      expect(find.widgetWithText(Tab, 'Đánh giá'), findsNothing);
    });

    testWidgets('StorePage category circles are scrollable without "Xem thêm", tapping switches to Sản phẩm tab filtered by category', (tester) async {
      tester.view.physicalSize = const Size(800, 2000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(
            home: StorePage(
              shopName: 'TechZone Official',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // No "Xem thêm" button
      expect(find.text('Xem thêm'), findsNothing);

      // Categories exist from products
      expect(find.text('Điện thoại'), findsOneWidget);
      expect(find.text('Tai nghe'), findsOneWidget);

      // Tapping category switches to "Sản phẩm" tab
      await tester.tap(find.text('Điện thoại'));
      await tester.pumpAndSettle();

      // In "Sản phẩm" tab, toolbar has sort options and filtered category
      expect(find.text('Phổ biến'), findsOneWidget);
      expect(find.text('Mới nhất'), findsOneWidget);
      expect(find.text('Bán chạy'), findsOneWidget);
      expect(find.text('Điện thoại thông minh màn hình AMOLED 128GB'), findsOneWidget);
      // Products of other categories are filtered out
      expect(find.text('Tai nghe không dây Bluetooth chống ồn, pin lâu'), findsNothing);
    });

    testWidgets('StorePage promo banner Mua ngay scrolls down to Sản phẩm nổi bật', (tester) async {
      tester.view.physicalSize = const Size(800, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(
            home: StorePage(
              shopName: 'TechZone Official',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('ƯU ĐÃI RIÊNG TẠI SHOP'), findsOneWidget);
      expect(find.text('Mua ngay'), findsOneWidget);

      await tester.tap(find.text('Mua ngay'));
      await tester.pumpAndSettle();

      // Ensure "Sản phẩm nổi bật" is in view
      expect(find.text('Sản phẩm nổi bật'), findsOneWidget);
    });

    testWidgets('StorePage displays out-of-stock products at the bottom with circular "Đã hết" badge and disabled add to cart button', (tester) async {
      tester.view.physicalSize = const Size(800, 2000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            storeProductsListProvider('d3e00000-0000-4000-8000-000000000201').overrideWith(
              (ref) => Future.value([
                {
                  'id': 'prod-in-stock',
                  'title': 'Sản phẩm còn hàng',
                  'price_vnd': 100000,
                  'is_out_of_stock': false,
                },
                {
                  'id': 'prod-out-stock',
                  'title': 'Sản phẩm hết hàng',
                  'price_vnd': 200000,
                  'is_out_of_stock': true,
                },
              ]),
            ),
          ],
          child: const MaterialApp(
            home: StorePage(
              shopName: 'TechZone Official',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Circular "Đã hết" badge exists on the out-of-stock product
      expect(find.text('Đã hết'), findsOneWidget);
      expect(find.text('Hết hàng'), findsOneWidget);

      // Verify that the out-of-stock "Hết hàng" button cannot add to cart
      final outOfStockButton = find.widgetWithText(OutlinedButton, 'Hết hàng');
      expect(outOfStockButton, findsOneWidget);
      final OutlinedButton buttonWidget = tester.widget(outOfStockButton);
      expect(buttonWidget.onPressed, isNull);
    });

    testWidgets('StorePage search allows searching store products with OrderListPage-style search UI', (tester) async {
      tester.view.physicalSize = const Size(800, 2000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(MockApiClient())],
          child: const MaterialApp(
            home: StorePage(
              shopName: 'TechZone Official',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap search icon in top right
      final searchIconFinder = find.byIcon(Icons.search);
      expect(searchIconFinder, findsOneWidget);
      await tester.tap(searchIconFinder);
      await tester.pumpAndSettle();

      // Search TextField appears with close icon
      expect(find.byType(TextField), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);

      // Enter search query
      await tester.enterText(find.byType(TextField), 'Tai nghe');
      await tester.pumpAndSettle();

      // Displays matching products and filters out non-matching products
      expect(find.text('Tai nghe không dây Bluetooth chống ồn, pin lâu'), findsWidgets);
      expect(find.text('Điện thoại thông minh màn hình AMOLED 128GB'), findsNothing);

      // Tap close button resets search
      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();

      expect(find.byType(TextField), findsNothing);
      expect(find.byIcon(Icons.search), findsOneWidget);
      expect(find.text('Điện thoại thông minh màn hình AMOLED 128GB'), findsWidgets);
    });
  });

  group('RecentlyViewedPage Tests', () {
    testWidgets('ProfilePage displays "Đã xem" and tapping opens RecentlyViewedPage', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
          ],
          child: MaterialApp(
            routes: {
              '/customer/recently-viewed': (_) => const RecentlyViewedPage(),
            },
            home: const ProfilePage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Label is "Đã xem" (not "Đã xem gần đây"), "Đã lưu" is present
      expect(find.text('Đã xem'), findsOneWidget);
      expect(find.text('Đã lưu'), findsOneWidget);
      // Removed items
      expect(find.text('Lịch sử tìm kiếm'), findsNothing);
      expect(find.text('Lịch sử Chat AI'), findsNothing);

      // Tap on "Đã xem"
      await tester.tap(find.text('Đã xem'));
      await tester.pumpAndSettle();

      // Navigated to RecentlyViewedPage with header title "Đã xem gần đây"
      expect(find.text('Đã xem gần đây'), findsOneWidget);
    });

    testWidgets('RecentlyViewedPage renders with title "Đã xem gần đây", filter tabs, search and cards matching favorites page', (tester) async {
      final mockProduct = {
        'id': 'recent-view-01',
        'title': 'Áo hoodie xám Weekend',
        'price_vnd': 389000,
        'discount': '-25%',
        'image_url': 'https://example.com/hoodie.jpg',
        'rating': 4.8,
        'sold': 516,
        'variants': [
          {'id': 'v-1', 'price_vnd': 389000},
        ],
      };

      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(MockApiClient()),
        ],
      );

      // Add a product to recently viewed
      container.read(recentlyViewedProvider.notifier).addProduct(mockProduct);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: RecentlyViewedPage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Top title
      expect(find.text('Đã xem gần đây'), findsOneWidget);

      // Filter tabs matching favorites page
      expect(find.text('Tất Cả'), findsOneWidget);
      expect(find.text('Trạng thái'), findsOneWidget);
      expect(find.text('Giảm giá'), findsOneWidget);
      expect(find.text('Ngành hàng'), findsOneWidget);

      // Product card matching unified search/favorites card
      expect(find.text('Áo hoodie xám Weekend'), findsOneWidget);
      expect(find.text('389.000 đ'), findsOneWidget);
      expect(find.text('-25%'), findsOneWidget);
      expect(find.text('Thêm vào giỏ'), findsOneWidget);
      expect(find.byIcon(Icons.shopping_cart_outlined), findsWidgets);
      expect(find.byIcon(Icons.favorite_border_rounded), findsWidgets);
    });

    testWidgets(
      'NotificationsPage renders order updates fetched from server, categories, and matches design',
      (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        final container = ProviderContainer(
          overrides: [
            apiProvider.overrideWithValue(MockApiClient()),
            customerOrdersProvider.overrideWith((ref) async => {
              'items': [
                {
                  'id': 'order-101',
                  'status': 'SHIPPED',
                  'updated_at': '2026-11-09T08:19:00Z',
                  'items': [
                    {
                      'product_id': 'prod-1',
                      'title': 'Bột yến mạch',
                      'image_url': 'https://example.com/yenmach.jpg',
                    }
                  ],
                },
                {
                  'id': 'order-102',
                  'status': 'CANCELLED',
                  'cancellation_reason': 'Hủy tự động bởi hệ thống.',
                  'updated_at': '2026-11-09T00:03:00Z',
                  'items': [
                    {
                      'product_id': 'prod-2',
                      'title': 'Cáp sạc',
                      'image_url': 'https://example.com/cable.jpg',
                    }
                  ],
                },
              ],
            }),
          ],
        );

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(
              home: NotificationsPage(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Top title and action icons
        expect(find.text('Thông báo'), findsOneWidget);
        expect(find.byIcon(Icons.shopping_cart_outlined), findsOneWidget);
        expect(find.byIcon(Icons.chat_bubble_outline_rounded), findsOneWidget);

        // Permission banner
        expect(find.textContaining('Bật thông báo để nhận cập nhật thông báo đơn hàng'), findsOneWidget);
        expect(find.text('Bật'), findsOneWidget);

        // Section: Cập nhật đơn hàng from server
        expect(find.text('Cập nhật đơn hàng'), findsOneWidget);
        expect(find.text('Xem thêm'), findsOneWidget);
        expect(find.text('Đang vận chuyển'), findsOneWidget);
        expect(find.textContaining('Đơn hàng đang vận chuyển và dự kiến giao đến bạn'), findsOneWidget);
        expect(find.text('Đã hủy đơn hàng'), findsOneWidget);
        expect(find.textContaining('Hủy tự động bởi hệ thống.'), findsOneWidget);

        // Section: Cập nhật mới nhất
        expect(find.text('Cập nhật mới nhất'), findsOneWidget);
        expect(find.text('Đọc Tất Cả'), findsOneWidget);
        expect(find.text('Thông báo nổi bật'), findsOneWidget);
        expect(find.text('Khuyến mãi'), findsOneWidget);
        expect(find.text('Live, Video & Thưởng'), findsNothing);
        expect(find.text('Thông tin Tài chính'), findsOneWidget);
        expect(find.text('Cập nhật Sàn'), findsOneWidget);
        expect(find.text('Không có cập nhật mới'), findsOneWidget);

        // Tab 0 (Thông báo nổi bật) aggregates latest promotions, finance and updates
        expect(find.textContaining('Mã giảm giá 50.000₫ dành riêng cho bạn!'), findsOneWidget);
        expect(find.textContaining('Cập nhật ứng dụng phiên bản 2.2.0'), findsOneWidget);

        // Tab 1 (Khuyến mãi) displays vouchers and sale programs
        await tester.tap(find.text('Khuyến mãi'));
        await tester.pumpAndSettle();
        expect(find.textContaining('Siêu Sale 11.11 - Đón Bão Deal Khủng Toàn Sàn'), findsOneWidget);

        // Tab 2 (Thông tin Tài chính) displays successfully paid orders
        await tester.tap(find.text('Thông tin Tài chính'));
        await tester.pumpAndSettle();
        expect(find.textContaining('đã thanh toán thành công'), findsWidgets);

        // Tab 3 (Cập nhật Sàn) displays app version and new features
        await tester.tap(find.text('Cập nhật Sàn'));
        await tester.pumpAndSettle();
        expect(find.textContaining('Tính năng mới: Trợ lý mua sắm AI thông minh'), findsOneWidget);

        // Verify unread orders badge starts at 2
        expect(find.text('2'), findsWidgets);

        // Tapping 'Đọc Tất Cả' marks all orders and categories as read
        await tester.tap(find.text('Đọc Tất Cả'));
        await tester.pumpAndSettle();
        expect(find.text('Đã đánh dấu tất cả là đã đọc.'), findsOneWidget);
      },
    );
  });
}

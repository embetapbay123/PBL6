import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/api_client.dart';
import 'core/app_theme.dart';
import 'features/auth/login_page.dart';
import 'features/auth/register_page.dart';
import 'features/auth/verify_email_page.dart';
import 'features/auth/forgot_password_page.dart';
import 'features/auth/change_password_page.dart';
import 'features/profile/profile_page.dart';
import 'features/profile/edit_profile_page.dart';
import 'features/profile/store_messages_page.dart';
import 'features/address/address_list_page.dart';
import 'features/address/address_form_page.dart';

import 'features/catalog/catalog_page.dart';
import 'features/catalog/product_detail_page.dart';
import 'features/cart/cart_page.dart';
import 'features/checkout/checkout_page.dart';
import 'features/checkout/order_success_page.dart';
import 'features/orders/order_list_page.dart';
import 'features/orders/order_detail_page.dart';
import 'features/customer/store_application_page.dart';
import 'features/customer/customer_settings_page.dart';
import 'features/customer/favorites_page.dart';
import 'features/chat/chat_ai_modal.dart';

final apiProvider = Provider<ApiClient>((ref) => ApiClient());

final catalogProductsProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, query) async {
      final params = query.startsWith('{')
          ? jsonDecode(query) as Map<String, dynamic>
          : {'q': query};
      try {
        final sortParam = params['sort'] as String?;
        final backendSort = (sortParam == 'title' ||
                sortParam == 'price_asc' ||
                sortParam == 'price_desc')
            ? sortParam
            : null;
        final page = (params['page'] as int?) ?? 1;
        final size = (params['size'] as int?) ?? 20;
        return await ref
            .read(apiProvider)
            .getProducts(
              q: params['q'] as String?,
              categoryId: params['category_id'] as String?,
              sort: backendSort,
              page: page,
              size: size,
            );
      } catch (e) {
        return buildFallbackProducts(
          categoryId: params['category_id'] as String?,
          q: params['q'] as String?,
          page: (params['page'] as int?) ?? 1,
          size: (params['size'] as int?) ?? 20,
        );
      }
    });

Map<String, dynamic> buildFallbackProducts({
  String? categoryId,
  String? q,
  int page = 1,
  int size = 20,
}) {
  final all = [
    {
      'id': '26d45e7d-4663-43d6-840f-e31b7d6192aa',
      'title': 'Áo hoodie xám Weekend',
      'store_name': 'An Nhiên Studio',
      'category_id': '3aeb8256-3d88-46be-8321-89bb43aaf300',
      'price_vnd': 389000,
      'monthly_sales': 1200,
      'created_at': '2026-10-15T08:00:00Z',
      'variants': [{'id': 'v-1', 'price_vnd': 389000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80'}],
    },
    {
      'id': '1367cbaf-40bb-46d1-b95e-9d1f97645e4a',
      'title': 'Áo thun Everyday cổ tròn',
      'store_name': 'An Nhiên Studio',
      'category_id': '3aeb8256-3d88-46be-8321-89bb43aaf300',
      'price_vnd': 149000,
      'monthly_sales': 2500,
      'created_at': '2026-09-10T10:00:00Z',
      'variants': [{'id': 'v-2', 'price_vnd': 149000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80'}],
    },
    {
      'id': 'e466c6b5-151d-425a-bf92-7d6f905eefd3',
      'title': 'Áo thun trắng có túi ngực',
      'store_name': 'An Nhiên Studio',
      'category_id': '3aeb8256-3d88-46be-8321-89bb43aaf300',
      'price_vnd': 189000,
      'monthly_sales': 850,
      'created_at': '2026-10-25T14:30:00Z',
      'variants': [{'id': 'v-3', 'price_vnd': 189000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&q=80'}],
    },
    {
      'id': '4227588f-76a4-4923-a9d9-1c05fb43e7df',
      'title': 'Áo thun xám Basic Essential',
      'store_name': 'An Nhiên Studio',
      'category_id': '3aeb8256-3d88-46be-8321-89bb43aaf300',
      'price_vnd': 169000,
      'monthly_sales': 620,
      'created_at': '2026-11-02T16:00:00Z',
      'variants': [{'id': 'v-4', 'price_vnd': 169000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=500&q=80'}],
    },
    {
      'id': 'e23cab0c-9a5b-46a2-91e5-349358f2e95d',
      'title': 'Áo thun xanh teal City',
      'store_name': 'An Nhiên Studio',
      'category_id': '3aeb8256-3d88-46be-8321-89bb43aaf300',
      'price_vnd': 179000,
      'monthly_sales': 410,
      'created_at': '2026-11-05T09:00:00Z',
      'variants': [{'id': 'v-5', 'price_vnd': 179000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80'}],
    },
    {
      'id': '4b17b456-0068-4799-848d-dc574e5713c7',
      'title': 'Đèn bàn kim loại Nordic',
      'store_name': 'Mây Xanh Living',
      'category_id': 'cd314f70-d4f7-4b34-bb05-33df23027833',
      'price_vnd': 459000,
      'monthly_sales': 980,
      'created_at': '2026-09-22T11:00:00Z',
      'variants': [{'id': 'v-6', 'price_vnd': 459000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80'}],
    },
    {
      'id': '4b86e585-7706-4659-a8c3-a25f9a4ba844',
      'title': 'Khay gỗ sắp xếp bàn làm việc',
      'store_name': 'Mây Xanh Living',
      'category_id': 'cd314f70-d4f7-4b34-bb05-33df23027833',
      'price_vnd': 199000,
      'monthly_sales': 340,
      'created_at': '2026-10-18T13:00:00Z',
      'variants': [{'id': 'v-7', 'price_vnd': 199000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=500&q=80'}],
    },
    {
      'id': '137bc125-5bd4-46dc-8a73-3e390a11dcee',
      'title': 'Sổ tay ghi chép Daily Notes',
      'store_name': 'Mây Xanh Living',
      'category_id': 'cd314f70-d4f7-4b34-bb05-33df23027833',
      'price_vnd': 79000,
      'monthly_sales': 1950,
      'created_at': '2026-08-15T08:00:00Z',
      'variants': [{'id': 'v-8', 'price_vnd': 79000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80'}],
    },
    {
      'id': '036bbd08-0cb6-4f3e-82e8-d594e8b1fb1f',
      'title': 'Tai nghe chụp tai Studio',
      'store_name': 'Mây Xanh Living',
      'category_id': 'cd314f70-d4f7-4b34-bb05-33df23027833',
      'price_vnd': 549000,
      'monthly_sales': 780,
      'created_at': '2026-10-08T07:00:00Z',
      'variants': [{'id': 'v-9', 'price_vnd': 549000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'}],
    },
    {
      'id': '4c9e3908-01a9-4bf4-845b-0c57b7d10cd0',
      'title': 'Ấm trà kim loại hình học',
      'store_name': 'Mây Xanh Living',
      'category_id': '33e0b2c4-c52c-4839-9796-41d6214e3bcd',
      'price_vnd': 399000,
      'monthly_sales': 290,
      'created_at': '2026-10-12T15:00:00Z',
      'variants': [{'id': 'v-10', 'price_vnd': 399000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80'}],
    },
    {
      'id': '3a782d25-a413-4aa6-bf42-788d5857bbfa',
      'title': 'Cốc sứ tối giản Dune',
      'store_name': 'Mây Xanh Living',
      'category_id': '33e0b2c4-c52c-4839-9796-41d6214e3bcd',
      'price_vnd': 129000,
      'monthly_sales': 1100,
      'created_at': '2026-09-08T14:00:00Z',
      'variants': [{'id': 'v-11', 'price_vnd': 129000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80'}],
    },
    {
      'id': 'ddba6c89-1cf9-4733-9fb9-034c22284601',
      'title': 'Túi đeo chéo da chần bông',
      'store_name': 'An Nhiên Studio',
      'category_id': 'ddba6c89-1cf9-4733-9fb9-034c222846c9',
      'price_vnd': 850000,
      'monthly_sales': 520,
      'created_at': '2026-10-28T10:00:00Z',
      'variants': [{'id': 'v-12', 'price_vnd': 850000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80'}],
    },
    {
      'id': 'ddba6c89-1cf9-4733-9fb9-034c22284602',
      'title': 'Balo canvas du lịch Minimalist',
      'store_name': 'An Nhiên Studio',
      'category_id': 'ddba6c89-1cf9-4733-9fb9-034c222846c9',
      'price_vnd': 490000,
      'monthly_sales': 670,
      'created_at': '2026-11-06T12:00:00Z',
      'variants': [{'id': 'v-13', 'price_vnd': 490000}],
      'images': [{'image_url': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80'}],
    },
  ];

  var filtered = all;
  if (categoryId != null && categoryId.isNotEmpty) {
    filtered = filtered.where((p) => p['category_id'] == categoryId).toList();
  }
  if (q != null && q.trim().isNotEmpty) {
    final lower = q.trim().toLowerCase();
    filtered = filtered
        .where((p) => (p['title'] as String).toLowerCase().contains(lower))
        .toList();
  }

  final start = (page - 1) * size;
  final pagedItems = start >= filtered.length
      ? <Map<String, dynamic>>[]
      : filtered.skip(start).take(size).toList();

  return {
    'items': pagedItems,
    'total': filtered.length,
    'page': page,
    'size': size,
  };
}

final categoriesProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  return await ref.read(apiProvider).getCategories();
});

final recommendationProvider = FutureProvider<Map<String, dynamic>>((
  ref,
) async {
  return await ref.read(apiProvider).getRecommendations();
});

final productThumbnailProvider =
    FutureProvider.family<String?, String>((ref, productId) async {
  if (productId.isEmpty) return null;
  final catalogAsync = ref.watch(catalogProductsProvider(''));
  final items = (catalogAsync.value?['items'] as List?) ?? [];
  for (final p in items) {
    if ((p as Map)['id']?.toString() == productId) {
      final images = p['images'] as List?;
      if (images != null && images.isNotEmpty) {
        final first = images[0];
        return first is Map ? first['image_url']?.toString() : first?.toString();
      }
    }
  }
  try {
    final client = ref.read(apiProvider);
    final p = await client.getProduct(productId);
    final images = p['images'] as List?;
    if (images != null && images.isNotEmpty) {
      final first = images[0];
      return first is Map ? first['image_url']?.toString() : first?.toString();
    }
  } catch (_) {}
  return null;
});

final cartItemsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return await ref.read(apiProvider).getAllCartItems();
});

final cartBadgeCountProvider = Provider<int>((ref) {
  final cartAsync = ref.watch(cartItemsProvider);
  return cartAsync.maybeWhen(
    data: (data) {
      final items = data['items'] as List?;
      if (items != null) return items.length;
      final count = data['total_items'] ?? data['count'];
      if (count is num) return count.toInt();
      return 0;
    },
    orElse: () => 0,
  );
});

final chatBadgeCountProvider = StateProvider<int>((ref) => 37);

final profileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return await ref.read(apiProvider).getProfile();
});

final addressListProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  return await ref.read(apiProvider).getAddresses();
});

void main() => runApp(const ProviderScope(child: SessionBootstrap()));

class SessionBootstrap extends ConsumerStatefulWidget {
  const SessionBootstrap({super.key});
  @override
  ConsumerState<SessionBootstrap> createState() => _SessionBootstrapState();
}

class _SessionBootstrapState extends ConsumerState<SessionBootstrap> {
  bool ready = false;
  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    try {
      await ref.read(apiProvider).tryRestoreSession();
    } finally {
      if (mounted) setState(() => ready = true);
    }
  }

  @override
  Widget build(BuildContext context) => ready
      ? const BootstrapApp()
      : const MaterialApp(
          home: Scaffold(body: Center(child: CircularProgressIndicator())),
        );
}

class BootstrapApp extends StatelessWidget {
  const BootstrapApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PBL6 Customer Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: '/',
      onGenerateRoute: (settings) {
        final uri = Uri.tryParse(settings.name ?? '');
        if (uri != null && uri.pathSegments.length == 2 && uri.pathSegments[0] == 'products') {
          return MaterialPageRoute(
            builder: (_) => ProductDetailPage(productId: uri.pathSegments[1]),
          );
        }

        switch (settings.name) {
          case '/':
          case '/products':
            final initialSearch = settings.arguments as String?;
            return MaterialPageRoute(
              builder: (_) => CatalogPage(initialSearch: initialSearch),
            );
          case '/product-detail':
            final args = settings.arguments as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (_) => ProductDetailPage(
                productId: args?['id']?.toString() ?? '',
                initialProduct: args,
              ),
            );
          case '/cart':
            final args = settings.arguments as Map<String, dynamic>?;
            final initialVariantIds = (args?['initialSelectedVariantIds'] as Set<String>?) ??
                (args?['initialSelectedVariantIds'] as List?)?.map((e) => e.toString()).toSet();
            return MaterialPageRoute(
              builder: (_) => CartPage(initialSelectedVariantIds: initialVariantIds),
            );
          case '/checkout':
            final args = settings.arguments as Map<String, dynamic>?;
            final itemIds =
                (args?['cart_item_ids'] as List?)
                    ?.map((e) => e.toString())
                    .toList() ??
                [];
            final items = (args?['items'] as List?)
                ?.map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
            return MaterialPageRoute(
              builder: (_) => CheckoutPage(
                cartItemIds: itemIds,
                initialSelectedItems: items,
              ),
            );
          case '/order-success':
            final args = settings.arguments as Map<String, dynamic>? ?? {};
            return MaterialPageRoute(
              builder: (_) => OrderSuccessPage(orderBatch: args),
            );
          case '/login':
            return MaterialPageRoute(builder: (_) => const LoginPage());
          case '/register':
            return MaterialPageRoute(builder: (_) => const RegisterPage());
          case '/verify-email':
            return MaterialPageRoute(builder: (_) => const VerifyEmailPage());
          case '/forgot-password':
            return MaterialPageRoute(
              builder: (_) => const ForgotPasswordPage(),
            );
          case '/change-password':
            return MaterialPageRoute(
              builder: (_) => const ChangePasswordPage(),
            );
          case '/profile':
            return MaterialPageRoute(builder: (_) => const ProfilePage());
          case '/customer/profile':
          case '/edit-profile':
            final args = settings.arguments as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (_) => EditProfilePage(initialProfile: args),
            );
          case '/store-messages':
            return MaterialPageRoute(
              builder: (_) => const StoreMessagesPage(),
            );
          case '/addresses':
            return MaterialPageRoute(builder: (_) => const AddressListPage());
          case '/address-form':
            final args = settings.arguments as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (_) => AddressFormPage(initialAddress: args),
            );
          case '/orders':
            final args = settings.arguments as Map<String, dynamic>?;
            final initialIndex = (args?['initialIndex'] as int?) ?? 0;
            return MaterialPageRoute(
              builder: (_) => OrderListPage(initialIndex: initialIndex),
            );
          case '/store-applications':
            return MaterialPageRoute(
              builder: (_) => const StoreApplicationPage(),
            );
          case '/customer/settings':
          case '/settings':
            final args = settings.arguments as Map<String, dynamic>?;
            final tab = args?['tab'] as SettingsTab?;
            return MaterialPageRoute(
              builder: (_) => CustomerSettingsPage(initialTab: tab),
            );
          case '/order-detail':
            final args = settings.arguments as Map<String, dynamic>? ?? {};
            final orderId = args['orderId']?.toString() ?? '';
            final order = args['order'] as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (_) => OrderDetailPage(
                orderId: orderId,
                initialOrder: order,
              ),
            );
          case '/chat':
            return MaterialPageRoute(
              builder: (_) => const ChatCenterPage(),
            );
          case '/favorites':
          case '/customer/favorites':
            return MaterialPageRoute(
              builder: (_) => const FavoritesPage(),
            );
          default:
            return MaterialPageRoute(builder: (_) => const CatalogPage());
        }
      },
    );
  }
}

String errorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      final msg = data['message'] ?? 'Lỗi từ máy chủ.';
      final code = data['code'];
      final corrId = data['correlation_id'];
      final buffer = StringBuffer(msg.toString());
      if (code != null) buffer.write(' [$code]');
      if (corrId != null) buffer.write('\nMã yêu cầu: $corrId');
      return buffer.toString();
    }
    if (error.response?.statusCode == 401) {
      return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.';
    }
    return 'Không kết nối được API. Kiểm tra base URL và Gateway.';
  }
  return error
      .toString()
      .replaceAll('Exception: ', '')
      .replaceAll('StateError: ', '');
}

class PendingPage extends StatelessWidget {
  const PendingPage(this.feature, {super.key});
  final String feature;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(feature)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.construction_outlined,
                size: 64,
                color: Colors.orange,
              ),
              const SizedBox(height: 16),
              Text(
                feature,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Khung module — nghiệp vụ chờ triển khai trong các task tiếp theo.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

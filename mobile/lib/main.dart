import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/api_client.dart';
import 'features/auth/login_page.dart';
import 'features/auth/register_page.dart';
import 'features/auth/verify_email_page.dart';
import 'features/auth/forgot_password_page.dart';
import 'features/auth/change_password_page.dart';
import 'features/profile/profile_page.dart';
import 'features/profile/edit_profile_page.dart';
import 'features/address/address_list_page.dart';
import 'features/address/address_form_page.dart';

import 'features/catalog/catalog_page.dart';
import 'features/catalog/product_detail_page.dart';
import 'features/cart/cart_page.dart';
import 'features/checkout/checkout_page.dart';
import 'features/checkout/order_success_page.dart';

final apiProvider = Provider<ApiClient>((ref) => ApiClient());

final catalogProductsProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, query) async {
      final params = query.startsWith('{')
          ? jsonDecode(query) as Map<String, dynamic>
          : {'q': query};
      return await ref
          .read(apiProvider)
          .getProducts(
            q: params['q'] as String?,
            categoryId: params['category_id'] as String?,
            page: (params['page'] as int?) ?? 1,
          );
    });

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

final cartItemsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return await ref.read(apiProvider).getAllCartItems();
});

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
      theme: ThemeData(
        colorSchemeSeed: const Color(0xff1648a8),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
        ),
      ),
      initialRoute: '/',
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/':
            return MaterialPageRoute(builder: (_) => const CatalogPage());
          case '/products':
            return MaterialPageRoute(builder: (_) => const CatalogPage());
          case '/product-detail':
            final args = settings.arguments as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (_) => ProductDetailPage(
                productId: args?['id']?.toString() ?? '',
                initialProduct: args,
              ),
            );
          case '/cart':
            return MaterialPageRoute(builder: (_) => const CartPage());
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
          case '/edit-profile':
            final args = settings.arguments as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (_) => EditProfilePage(initialProfile: args),
            );
          case '/addresses':
            return MaterialPageRoute(builder: (_) => const AddressListPage());
          case '/address-form':
            final args = settings.arguments as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (_) => AddressFormPage(initialAddress: args),
            );
          case '/orders':
            return MaterialPageRoute(
              builder: (_) => const PendingPage('Đơn hàng (Orders)'),
            );
          case '/chat':
            return MaterialPageRoute(
              builder: (_) => const PendingPage('Chat AI'),
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

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

final apiProvider = Provider<ApiClient>((ref) => ApiClient());

final productProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await ref.read(apiProvider).get('/products');
  return Map<String, dynamic>.from(res as Map);
});

final profileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return await ref.read(apiProvider).getProfile();
});

final addressListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return await ref.read(apiProvider).getAddresses();
});

void main() => runApp(const ProviderScope(child: BootstrapApp()));

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
            return MaterialPageRoute(builder: (_) => const ProductPage());
          case '/login':
            return MaterialPageRoute(builder: (_) => const LoginPage());
          case '/register':
            return MaterialPageRoute(builder: (_) => const RegisterPage());
          case '/verify-email':
            return MaterialPageRoute(builder: (_) => const VerifyEmailPage());
          case '/forgot-password':
            return MaterialPageRoute(builder: (_) => const ForgotPasswordPage());
          case '/change-password':
            return MaterialPageRoute(builder: (_) => const ChangePasswordPage());
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
          case '/cart':
            return MaterialPageRoute(builder: (_) => const PendingPage('Giỏ hàng (Cart)'));
          case '/orders':
            return MaterialPageRoute(builder: (_) => const PendingPage('Đơn hàng (Orders)'));
          case '/chat':
            return MaterialPageRoute(builder: (_) => const PendingPage('Chat AI'));
          default:
            return MaterialPageRoute(builder: (_) => const ProductPage());
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
  return error.toString().replaceAll('Exception: ', '').replaceAll('StateError: ', '');
}

class ProductPage extends ConsumerWidget {
  const ProductPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('PBL6 E-Commerce'),
        actions: [
          IconButton(
            onPressed: () => Navigator.pushNamed(context, '/login'),
            icon: const Icon(Icons.account_circle_outlined),
            tooltip: 'Tài khoản',
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: Color(0xff1648a8)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 36),
                  SizedBox(height: 12),
                  Text(
                    'PBL6 Customer App',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Customer Android Starter',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.home_outlined),
              title: const Text('Trang chủ / Sản phẩm'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('Hồ sơ cá nhân'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/profile');
              },
            ),
            ListTile(
              leading: const Icon(Icons.location_on_outlined),
              title: const Text('Sổ địa chỉ'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/addresses');
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.shopping_cart_outlined),
              title: const Text('Giỏ hàng'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/cart');
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long_outlined),
              title: const Text('Đơn hàng của tôi'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/orders');
              },
            ),
            ListTile(
              leading: const Icon(Icons.chat_bubble_outline),
              title: const Text('Chat AI Trợ lý'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/chat');
              },
            ),
          ],
        ),
      ),
      body: products.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 12),
                Text(
                  errorMessage(error),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(productProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (result) {
          final items = (result['items'] as List?) ?? [];
          if (items.isEmpty) {
            return const Center(child: Text('Chưa có sản phẩm nào.'));
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12.0),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final product = items[index];
              final title = product['title']?.toString() ?? 'Sản phẩm';
              final desc = product['description']?.toString() ?? '';
              final variants = product['variants'] as List?;
              final price = variants != null && variants.isNotEmpty
                  ? variants[0]['price_vnd']
                  : '100000';

              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  side: BorderSide(color: Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ListTile(
                  title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(desc, maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: Text(
                    '$price ₫',
                    style: const TextStyle(
                      color: Color(0xff1648a8),
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
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
              const Icon(Icons.construction_outlined, size: 64, color: Colors.orange),
              const SizedBox(height: 16),
              Text(
                feature,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
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

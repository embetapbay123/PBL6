import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/api_client.dart';
final apiProvider = Provider<ApiClient>((ref) => ApiClient());
final productProvider = FutureProvider<Map<String, dynamic>>((ref) async => Map<String, dynamic>.from(await ref.read(apiProvider).get('/products')));
void main() => runApp(const ProviderScope(child: BootstrapApp()));
class BootstrapApp extends StatelessWidget {
  const BootstrapApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(title: 'PBL6 Mobile Starter', theme: ThemeData(colorSchemeSeed: const Color(0xff1648a8), useMaterial3: true), routes: {
    '/': (_) => const ProductPage(), '/login': (_) => const LoginPage(), '/profile': (_) => const ProfilePage(), '/cart': (_) => const PendingPage('Cart'), '/orders': (_) => const PendingPage('Order'), '/chat': (_) => const PendingPage('Chat AI'),
  });
}
String errorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) return '${data['message']}\nMã yêu cầu: ${data['correlation_id']}';
    return 'Không kết nối được API. Kiểm tra base URL và Gateway.';
  }
  return error.toString();
}
class ProductPage extends ConsumerWidget {
  const ProductPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productProvider);
    return Scaffold(appBar: AppBar(title: const Text('PBL6 · API thật'), actions: [IconButton(onPressed: () => Navigator.pushNamed(context, '/login'), icon: const Icon(Icons.login))]), drawer: Drawer(child: ListView(children: [const DrawerHeader(child: Text('Khung Customer Mobile')), for (final item in {'/profile': 'Hồ sơ', '/cart': 'Giỏ hàng', '/orders': 'Đơn hàng', '/chat': 'Chat AI'}.entries) ListTile(title: Text(item.value), onTap: () => Navigator.pushNamed(context, item.key))])), body: products.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(errorMessage(error)), TextButton(onPressed: () => ref.invalidate(productProvider), child: const Text('Thử lại'))])),
      data: (result) { final items = result['items'] as List; if (items.isEmpty) return const Center(child: Text('Chưa có sản phẩm.')); return ListView(children: [const Padding(padding: EdgeInsets.all(16), child: Text('Luồng mẫu hoạt động. Hoa hoàn thiện các luồng Customer còn lại.')), for (final product in items) Card(child: ListTile(title: Text(product['title']), subtitle: Text(product['description'] ?? ''), trailing: Text('${product['variants'][0]['price_vnd']} ₫')))]); },
    ));
  }
}
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});
  @override
  ConsumerState<LoginPage> createState() => _LoginState();
}
class _LoginState extends ConsumerState<LoginPage> {
  final email = TextEditingController(text: 'customer1@pbl6.test'); final password = TextEditingController(); bool busy = false; String? error;
  @override
  void dispose() { email.dispose(); password.dispose(); super.dispose(); }
  Future<void> login() async {
    setState(() { busy = true; error = null; });
    try { await ref.read(apiProvider).login(email.text, password.text); if (mounted) Navigator.pushReplacementNamed(context, '/profile'); }
    catch (e) { if (mounted) setState(() => error = errorMessage(e)); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Đăng nhập')), body: Padding(padding: const EdgeInsets.all(24), child: Column(children: [TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')), TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Mật khẩu seed local')), const SizedBox(height: 20), FilledButton(onPressed: busy ? null : login, child: Text(busy ? 'Đang đăng nhập…' : 'Đăng nhập')), if (error != null) Text(error!)])));
}
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(appBar: AppBar(title: const Text('Hồ sơ')), body: FutureBuilder<dynamic>(future: ref.read(apiProvider).get('/me'), builder: (context, snapshot) {
    if (snapshot.hasError) return Center(child: Text(errorMessage(snapshot.error!))); if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
    return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(snapshot.data['email']), Text(snapshot.data['display_name'] ?? ''), TextButton(onPressed: () async { await ref.read(apiProvider).logout(); if (context.mounted) Navigator.popUntil(context, (route) => route.isFirst); }, child: const Text('Đăng xuất'))]));
  }));
}
class PendingPage extends StatelessWidget {
  const PendingPage(this.feature, {super.key}); final String feature;
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(feature)), body: const Center(child: Text('Khung module — nghiệp vụ chờ Hoa triển khai.')));
}

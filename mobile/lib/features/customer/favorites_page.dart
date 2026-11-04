import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../catalog/product_detail_page.dart';
import '../catalog/shop_page.dart';
import '../chat/chat_ai_modal.dart';
import '../shared/app_bottom_nav.dart';

class FavoriteProductItem {
  final String id;
  final String title;
  final String storeId;
  final String storeName;
  final int priceVnd;
  final String priceDisplay;
  final String optionLabel;
  final String imageUrl;
  final String variantId;

  const FavoriteProductItem({
    required this.id,
    required this.title,
    required this.storeId,
    required this.storeName,
    required this.priceVnd,
    required this.priceDisplay,
    required this.optionLabel,
    required this.imageUrl,
    required this.variantId,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'title': title,
    'store_id': storeId,
    'store_name': storeName,
    'price_vnd': priceVnd,
    'price_display': priceDisplay,
    'option_label': optionLabel,
    'image_url': imageUrl,
    'variant_id': variantId,
  };

  factory FavoriteProductItem.fromMap(Map<String, dynamic> map) {
    final price = (map['price_vnd'] as num?)?.toInt() ?? 0;
    return FavoriteProductItem(
      id: map['id']?.toString() ?? '',
      title: map['title']?.toString() ?? map['name']?.toString() ?? 'Sản phẩm',
      storeId: map['store_id']?.toString() ?? 'store-default',
      storeName: map['store_name']?.toString() ?? 'Gian hàng đối tác',
      priceVnd: price,
      priceDisplay: map['price_display']?.toString() ?? _formatVnd(price),
      optionLabel: map['option_label']?.toString() ?? 'Phân loại tiêu chuẩn',
      imageUrl: map['image_url']?.toString() ??
          (map['images'] is List && (map['images'] as List).isNotEmpty
              ? ((map['images'] as List).first is Map
                  ? (map['images'] as List).first['image_url']?.toString() ?? ''
                  : (map['images'] as List).first.toString())
              : 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80'),
      variantId: map['variant_id']?.toString() ??
          (map['variants'] is List && (map['variants'] as List).isNotEmpty
              ? (map['variants'] as List).first['id']?.toString() ?? 'v-1'
              : 'v-1'),
    );
  }

  static String _formatVnd(int price) {
    final s = price.toString();
    final buffer = StringBuffer();
    int count = 0;
    for (int i = s.length - 1; i >= 0; i--) {
      buffer.write(s[i]);
      count++;
      if (count % 3 == 0 && i > 0) buffer.write('.');
    }
    return '${buffer.toString().split('').reversed.join('')} đ';
  }
}

class FavoritesNotifier extends StateNotifier<List<FavoriteProductItem>> {
  FavoritesNotifier()
      : super([
          const FavoriteProductItem(
            id: '26d45e7d-4663-43d6-840f-e31b7d6192aa',
            title: 'Áo hoodie xám Weekend',
            storeId: '3aeb8256-3d88-46be-8321-89bb43aaf300',
            storeName: 'An Nhiên Studio',
            priceVnd: 389000,
            priceDisplay: 'Từ 389.000 đ',
            optionLabel: '4 lựa chọn',
            imageUrl:
                'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80',
            variantId: 'v-1',
          ),
          const FavoriteProductItem(
            id: '4c9e3908-01a9-4bf4-845b-0c57b7d10cd0',
            title: 'Ấm trà kim loại hình học',
            storeId: '33e0b2c4-c52c-4839-9796-41d6214e3bcd',
            storeName: 'Mây Xanh Living',
            priceVnd: 349000,
            priceDisplay: '349.000 đ',
            optionLabel: 'Phân loại tiêu chuẩn',
            imageUrl:
                'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80',
            variantId: 'v-10',
          ),
        ]);

  bool isFavorite(String id) => state.any((item) => item.id == id);

  void toggleFavorite(Map<String, dynamic> product) {
    final id = product['id']?.toString() ?? '';
    if (id.isEmpty) return;
    if (isFavorite(id)) {
      removeFavorite(id);
    } else {
      state = [...state, FavoriteProductItem.fromMap(product)];
    }
  }

  void removeFavorite(String id) {
    state = state.where((item) => item.id != id).toList();
  }
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, List<FavoriteProductItem>>(
  (ref) => FavoritesNotifier(),
);

class FavoritesPage extends ConsumerStatefulWidget {
  const FavoritesPage({super.key});

  @override
  ConsumerState<FavoritesPage> createState() => _FavoritesPageState();
}

class _FavoritesPageState extends ConsumerState<FavoritesPage> {
  final Set<String> _addingCartIds = {};

  Future<void> _handleAddToCart(FavoriteProductItem item) async {
    setState(() => _addingCartIds.add(item.id));
    try {
      final client = ref.read(apiProvider);
      await client.addToCart(
        variantId: item.variantId,
        productId: item.id,
        quantity: 1,
      );
      ref.invalidate(cartBadgeCountProvider);
      ref.invalidate(cartItemsProvider);
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: 'Đã thêm "${item.title}" vào giỏ hàng!',
        );
      }
    } catch (e) {
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: errorMessage(e),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _addingCartIds.remove(item.id));
      }
    }
  }

  void _handleRemoveFavorite(FavoriteProductItem item) {
    ref.read(favoritesProvider.notifier).removeFavorite(item.id);
    AppNoticeDialog.show(
      context,
      message: 'Đã bỏ yêu thích "${item.title}".',
    );
  }

  void _navigateToProduct(FavoriteProductItem item) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProductDetailPage(productId: item.id),
      ),
    );
  }

  void _navigateToShop(String storeId, String storeName) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ShopPage(shopId: storeId, shopName: storeName),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final favorites = ref.watch(favoritesProvider);
    final cartCount = ref.watch(cartBadgeCountProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 1,
        cartCount: cartCount,
        onTap: (index) {
          if (index == 1) return;
          if (index == 0) {
            Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
          } else if (index == 2) {
            Navigator.pushNamed(context, '/cart');
          } else if (index == 3) {
            ChatAiModal.show(context);
          } else if (index == 4) {
            Navigator.pushNamed(context, '/profile');
          }
        },
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Back link: "← Tiếp tục khám phá"
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                child: InkWell(
                  onTap: () {
                    if (Navigator.canPop(context)) {
                      Navigator.pop(context);
                    } else {
                      Navigator.pushNamedAndRemoveUntil(
                          context, '/', (route) => false);
                    }
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(
                          Icons.arrow_back,
                          size: 16,
                          color: Color(0xFF1F2937),
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Tiếp tục khám phá',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF1F2937),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // 2. Heading: "Sản phẩm yêu thích"
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 18),
                child: const Text(
                  'Sản phẩm yêu thích',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                    letterSpacing: -0.5,
                  ),
                ),
              ),

              // 3. Products List / Grid or Empty State
              if (favorites.isEmpty)
                _buildEmptyState()
              else ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _buildProductsGrid(favorites),
                ),

                const SizedBox(height: 16),

                // 4. Pagination matching web footer: "Trang trước | Trang 1 · N kết quả | Trang sau"
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF9CA3AF),
                          side: const BorderSide(color: Color(0xFFE5E7EB)),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                          minimumSize: const Size(80, 36),
                        ),
                        onPressed: null, // Disabled for page 1
                        child: const Text(
                          'Trang trước',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Trang 1 · ${favorites.length} kết quả',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF4B5563),
                        ),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF9CA3AF),
                          side: const BorderSide(color: Color(0xFFE5E7EB)),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                          minimumSize: const Size(80, 36),
                        ),
                        onPressed: null, // Disabled for single page
                        child: const Text(
                          'Trang sau',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: Color(0xFFFEF2F2),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Icon(
                  Icons.favorite_border_rounded,
                  size: 38,
                  color: Color(0xFFC2410C),
                ),
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Chưa có sản phẩm yêu thích',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Hãy khám phá danh mục và lưu lại những món đồ bạn yêu thích để dễ dàng mua sắm sau nhé!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Color(0xFF6B7280),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: () =>
                  Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFC2410C),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Khám phá sản phẩm ngay',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductsGrid(List<FavoriteProductItem> items) {
    final leftCol = <FavoriteProductItem>[];
    final rightCol = <FavoriteProductItem>[];

    for (int i = 0; i < items.length; i++) {
      if (i % 2 == 0) {
        leftCol.add(items[i]);
      } else {
        rightCol.add(items[i]);
      }
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            children: leftCol.map((item) => _buildProductCard(item)).toList(),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            children: rightCol.map((item) => _buildProductCard(item)).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildProductCard(FavoriteProductItem item) {
    final isAddingCart = _addingCartIds.contains(item.id);

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // White Card Box
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(5),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Product Image
                GestureDetector(
                  onTap: () => _navigateToProduct(item),
                  child: ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(9)),
                    child: AspectRatio(
                      aspectRatio: 1.0,
                      child: Container(
                        color: Colors.grey.shade100,
                        child: Image.network(
                          item.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (ctx, err, stack) => const Center(
                            child: Icon(
                              Icons.image_outlined,
                              size: 40,
                              color: Colors.grey,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

                // Card Content
                Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // "Sản phẩm" tag
                      const Text(
                        'Sản phẩm',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: Color(0xFF9CA3AF),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 5),

                      // Product Title
                      GestureDetector(
                        onTap: () => _navigateToProduct(item),
                        child: Text(
                          item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1F2937),
                            height: 1.25,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Price (warm rust orange-red #C2410C matching web)
                      Text(
                        item.priceDisplay,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFC2410C),
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Variant / Option count (storefront icon)
                      Row(
                        children: [
                          const Icon(
                            Icons.storefront_outlined,
                            size: 13,
                            color: Color(0xFF6B7280),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              item.optionLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Actions Row: [🛒 Thêm vào giỏ] + [♥]
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(
                                    color: Color(0xFFE5E7EB), width: 1),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 9,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                minimumSize: const Size(0, 36),
                              ),
                              onPressed: isAddingCart
                                  ? null
                                  : () => _handleAddToCart(item),
                              icon: isAddingCart
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Color(0xFF374151),
                                      ),
                                    )
                                  : const Icon(
                                      Icons.shopping_cart_outlined,
                                      size: 15,
                                      color: Color(0xFF374151),
                                    ),
                              label: const Text(
                                'Thêm vào giỏ',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF374151),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          InkWell(
                            onTap: () => _handleRemoveFavorite(item),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: const Color(0xFFE5E7EB),
                                  width: 1,
                                ),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.favorite,
                                  size: 16,
                                  color: Color(0xFF4B5563),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),
                      const Divider(height: 1, color: Color(0xFFF3F4F6)),
                      const SizedBox(height: 8),

                      // Store footer
                      InkWell(
                        onTap: () => _navigateToShop(item.storeId, item.storeName),
                        borderRadius: BorderRadius.circular(4),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.storefront,
                                size: 12.5,
                                color: Color(0xFF6B7280),
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  item.storeName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF6B7280),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Under card: "Bỏ yêu thích" Solid Rust Red button
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFC2410C),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                elevation: 0,
              ),
              onPressed: () => _handleRemoveFavorite(item),
              child: const Text(
                'Bỏ yêu thích',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

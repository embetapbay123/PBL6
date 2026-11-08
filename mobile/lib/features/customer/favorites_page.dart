import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_notice_dialog.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../cart/cart_variant_modal.dart';
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
  final String categoryName;
  final List<Map<String, dynamic>> variants;

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
    this.categoryName = 'Thời trang',
    this.variants = const [],
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
    'category_name': categoryName,
    'variants': variants,
    'images': [{'image_url': imageUrl}],
  };

  factory FavoriteProductItem.fromMap(Map<String, dynamic> map) {
    final price = (map['price_vnd'] as num?)?.toInt() ?? 0;
    final variantsList = (map['variants'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];
    final variantCount = variantsList.length;
    final optionLabel = map['option_label']?.toString() ??
        (variantCount > 1 ? '$variantCount lựa chọn' : 'Phiên bản chuẩn');
    return FavoriteProductItem(
      id: map['id']?.toString() ?? '',
      title: map['title']?.toString() ?? map['name']?.toString() ?? 'Sản phẩm',
      storeId: map['store_id']?.toString() ?? 'store-default',
      storeName: map['store_name']?.toString() ?? 'An Nhiên Studio',
      priceVnd: price,
      priceDisplay: map['price_display']?.toString() ?? _formatVnd(price),
      optionLabel: optionLabel,
      imageUrl: map['image_url']?.toString() ??
          (map['images'] is List && (map['images'] as List).isNotEmpty
              ? ((map['images'] as List).first is Map
                  ? (map['images'] as List).first['image_url']?.toString() ?? ''
                  : (map['images'] as List).first.toString())
              : 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80'),
      variantId: map['variant_id']?.toString() ??
          (variantsList.isNotEmpty
              ? variantsList.first['id']?.toString() ?? 'v-1'
              : 'v-1'),
      categoryName: map['category_name']?.toString() ?? 'Thời trang',
      variants: variantsList,
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
            categoryName: 'Thời trang',
            variants: [
              {'id': 'v-1', 'sku': 'HD-GRY-M', 'price_vnd': 389000, 'variant_values': {'size': 'M', 'color': 'Xám'}},
              {'id': 'v-2', 'sku': 'HD-GRY-L', 'price_vnd': 389000, 'variant_values': {'size': 'L', 'color': 'Xám'}},
              {'id': 'v-3', 'sku': 'HD-GRY-XL', 'price_vnd': 409000, 'variant_values': {'size': 'XL', 'color': 'Xám'}},
              {'id': 'v-4', 'sku': 'HD-GRY-S', 'price_vnd': 389000, 'variant_values': {'size': 'S', 'color': 'Xám'}},
            ],
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
            categoryName: 'Nhà cửa & đời sống',
            variants: [
              {'id': 'v-10', 'sku': 'TEA-01', 'price_vnd': 349000, 'variant_values': {'type': 'Tiêu chuẩn'}},
            ],
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

  Future<void> _quickAddToCart(FavoriteProductItem item) async {
    final variants = item.variants;
    if (variants.length > 1) {
      await CartVariantModal.show(
        context: context,
        cartItem: {
          'product_id': item.id,
          'variant_id': item.variantId,
          'quantity': 1,
          'image_url': item.imageUrl,
        },
        initialProduct: item.toMap(),
        onConfirm: (selectedVariant, quantity) async {
          final selVariantId = selectedVariant['id']?.toString() ?? '';
          if (selVariantId.isEmpty) return;
          try {
            final client = ref.read(apiProvider);
            await client.addToCart(
              variantId: selVariantId,
              productId: item.id,
              quantity: quantity,
            );
            ref.invalidate(cartItemsProvider);
            ref.invalidate(cartBadgeCountProvider);
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
          }
        },
      );
    } else {
      await _handleAddToCart(item);
    }
  }

  void _handleRemoveFavorite(FavoriteProductItem item) {
    ref.read(favoritesProvider.notifier).removeFavorite(item.id);
  }

  void _navigateToProduct(FavoriteProductItem item) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProductDetailPage(productId: item.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final favorites = ref.watch(favoritesProvider);
    final cartCount = ref.watch(cartBadgeCountProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back,
            color: Color(0xFFEE4D2D),
            size: 24,
          ),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
            }
          },
        ),
        title: const Text(
          'Đã lưu',
          style: TextStyle(
            color: Color(0xFF1F2937),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(
                  Icons.shopping_cart_outlined,
                  color: Color(0xFF1F2937),
                  size: 24,
                ),
                if (cartCount > 0)
                  Positioned(
                    right: -6,
                    top: -6,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Color(0xFFEE4D2D),
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        cartCount > 99 ? '99+' : '$cartCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            onPressed: () => Navigator.pushNamed(context, '/cart'),
          ),
        ],
      ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: -1,
        cartCount: cartCount,
        onTap: (index) {
          if (index == 0) {
            Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
          } else if (index == 1) {
            Navigator.pushNamed(context, '/cart');
          } else if (index == 2) {
            ChatAiModal.show(context);
          } else if (index == 3) {
            Navigator.pushNamed(context, '/profile');
          }
        },
      ),
      body: favorites.isEmpty
          ? _buildEmptyState()
          : Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.54,
                ),
                itemCount: favorites.length,
                itemBuilder: (context, index) =>
                    _buildProductCard(favorites[index]),
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
                  color: Color(0xFFEE4D2D),
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
                backgroundColor: AppColors.primary,
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

  Widget _buildProductCard(FavoriteProductItem item) {
    return GestureDetector(
      onTap: () => _navigateToProduct(item),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Thumbnail Image
            SizedBox(
              height: 155,
              width: double.infinity,
              child: Container(
                color: const Color(0xFFF9FAFB),
                child: item.imageUrl.isNotEmpty
                    ? Image.network(
                        item.imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Center(
                          child: Icon(
                            Icons.shopping_bag_outlined,
                            color: Colors.grey,
                            size: 36,
                          ),
                        ),
                      )
                    : const Center(
                        child: Icon(
                          Icons.shopping_bag_outlined,
                          color: Colors.grey,
                          size: 36,
                        ),
                      ),
              ),
            ),

            // 2. Details Column
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Category Tag
                        Text(
                          item.categoryName.isNotEmpty
                              ? item.categoryName
                              : 'Thời trang',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 3),
                        // Product Title
                        Text(
                          item.title,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1F2937),
                            height: 1.25,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        // Price
                        Text(
                          item.priceDisplay,
                          style: const TextStyle(
                            color: Color(0xFFBA3416),
                            fontWeight: FontWeight.bold,
                            fontSize: 14.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        // Variant count
                        Text(
                          item.optionLabel,
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),

                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Action buttons row: [🛒 Thêm vào giỏ] and [♥]
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                style: ButtonStyle(
                                  backgroundColor:
                                      WidgetStateProperty.resolveWith<Color?>(
                                          (states) {
                                    if (states.contains(WidgetState.hovered) ||
                                        states.contains(WidgetState.pressed)) {
                                      return AppColors.primary;
                                    }
                                    return Colors.white;
                                  }),
                                  foregroundColor:
                                      WidgetStateProperty.resolveWith<Color?>(
                                          (states) {
                                    if (states.contains(WidgetState.hovered) ||
                                        states.contains(WidgetState.pressed)) {
                                      return Colors.white;
                                    }
                                    return const Color(0xFF374151);
                                  }),
                                  iconColor:
                                      WidgetStateProperty.resolveWith<Color?>(
                                          (states) {
                                    if (states.contains(WidgetState.hovered) ||
                                        states.contains(WidgetState.pressed)) {
                                      return Colors.white;
                                    }
                                    return const Color(0xFF374151);
                                  }),
                                  side:
                                      WidgetStateProperty.resolveWith<BorderSide>(
                                          (states) {
                                    if (states.contains(WidgetState.hovered) ||
                                        states.contains(WidgetState.pressed)) {
                                      return const BorderSide(
                                          color: AppColors.primary);
                                    }
                                    return const BorderSide(
                                        color: Color(0xFFD1D5DB));
                                  }),
                                  padding: const WidgetStatePropertyAll(
                                    EdgeInsets.symmetric(
                                        horizontal: 4, vertical: 0),
                                  ),
                                  minimumSize: const WidgetStatePropertyAll(
                                      Size(0, 32)),
                                  shape: WidgetStatePropertyAll(
                                    RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(6)),
                                  ),
                                ),
                                icon: const Icon(Icons.shopping_cart_outlined,
                                    size: 13),
                                label: const Text(
                                  'Thêm vào giỏ',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                onPressed: () => _quickAddToCart(item),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Tooltip(
                              message: 'Bỏ yêu thích',
                              child: InkWell(
                                onTap: () => _handleRemoveFavorite(item),
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: const Color(0xFFFECACA),
                                    ),
                                  ),
                                  child: const Center(
                                    child: Icon(
                                      Icons.favorite,
                                      size: 16,
                                      color: Color(0xFFDC2626),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        // Store name
                        Row(
                          children: [
                            const Icon(
                              Icons.storefront_outlined,
                              size: 12,
                              color: Color(0xFF6B7280),
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                item.storeName,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: Color(0xFF6B7280),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

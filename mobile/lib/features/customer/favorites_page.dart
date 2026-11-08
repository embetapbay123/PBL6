import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../cart/cart_variant_modal.dart';
import '../catalog/product_detail_page.dart';
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
  final int discountPercent;
  final String soldCount;
  final bool isMall;
  final bool hasVideo;

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
    this.discountPercent = 25,
    this.soldCount = '120 đã bán',
    this.isMall = true,
    this.hasVideo = false,
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
    'discount_percent': discountPercent,
    'sold_count': soldCount,
    'is_mall': isMall,
    'has_video': hasVideo,
  };

  factory FavoriteProductItem.fromMap(Map<String, dynamic> map) {
    int price = (map['price_vnd'] as num?)?.toInt() ?? 0;
    final variantsList = (map['variants'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];
    if (price <= 0 && variantsList.isNotEmpty) {
      for (final v in variantsList) {
        final p = v['price_vnd'];
        int? pInt;
        if (p is num) pInt = p.toInt();
        if (p is String) pInt = int.tryParse(p);
        if (pInt != null && pInt > 0) {
          if (price <= 0 || pInt < price) {
            price = pInt;
          }
        }
      }
    }
    if (price <= 0) price = 100000;

    final variantCount = variantsList.length;
    final optionLabel = map['option_label']?.toString() ??
        (variantCount > 1 ? '$variantCount lựa chọn' : 'Phiên bản chuẩn');

    String imageUrl = map['image_url']?.toString() ?? '';
    if (imageUrl.isEmpty && map['images'] is List && (map['images'] as List).isNotEmpty) {
      final first = (map['images'] as List).first;
      imageUrl = first is Map ? (first['image_url']?.toString() ?? '') : first.toString();
    }
    if (imageUrl.isEmpty) {
      imageUrl = map['thumbnail']?.toString() ?? '';
    }

    final storeName = map['store_name']?.toString() ??
        (map['attributes'] is Map ? map['attributes']['brand']?.toString() : null) ??
        'An Nhiên Studio';

    final sold = map['sold_count']?.toString() ??
        (map['monthly_sales'] != null ? '${map['monthly_sales']} đã bán' : '100+ đã bán');

    return FavoriteProductItem(
      id: map['id']?.toString() ?? '',
      title: map['title']?.toString() ?? map['name']?.toString() ?? 'Sản phẩm',
      storeId: map['store_id']?.toString() ?? 'store-default',
      storeName: storeName,
      priceVnd: price,
      priceDisplay: map['price_display']?.toString() ?? _formatVnd(price),
      optionLabel: optionLabel,
      imageUrl: imageUrl.isNotEmpty
          ? imageUrl
          : 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80',
      variantId: map['variant_id']?.toString() ??
          (variantsList.isNotEmpty
              ? variantsList.first['id']?.toString() ?? 'v-1'
              : 'v-1'),
      categoryName: map['category_name']?.toString() ?? 'Thời trang',
      variants: variantsList,
      discountPercent: (map['discount_percent'] as num?)?.toInt() ?? 25,
      soldCount: sold,
      isMall: map['is_mall'] as bool? ?? true,
      hasVideo: map['has_video'] as bool? ?? false,
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
  FavoritesNotifier([List<FavoriteProductItem>? initial]) : super(initial ?? const []);

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

  void removeMultiple(Iterable<String> ids) {
    final set = ids.toSet();
    state = state.where((item) => !set.contains(item.id)).toList();
  }
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, List<FavoriteProductItem>>(
  (ref) => FavoritesNotifier(),
);

class _CornerTrianglePainter extends CustomPainter {
  final Color color;
  _CornerTrianglePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class FavoritesPage extends ConsumerStatefulWidget {
  const FavoritesPage({super.key});

  @override
  ConsumerState<FavoritesPage> createState() => _FavoritesPageState();
}

class _FavoritesPageState extends ConsumerState<FavoritesPage> {
  String _activeTab = 'all'; // 'all', 'status', 'discount', 'category'
  String _selectedCategory = '';
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _navigateToProduct(FavoriteProductItem item) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProductDetailPage(
          productId: item.id,
          initialProduct: item.toMap(),
        ),
      ),
    );
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
      return;
    }

    try {
      final client = ref.read(apiProvider);
      await client.addToCart(
        variantId: item.variantId,
        productId: item.id,
        quantity: 1,
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
  }

  void _showCategoryFilterDialog(List<FavoriteProductItem> allFavorites) {
    final categories = allFavorites.map((e) => e.categoryName).toSet().toList();
    if (categories.isEmpty) return;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Chọn ngành hàng',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  if (_selectedCategory.isNotEmpty)
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _selectedCategory = '';
                          _activeTab = 'all';
                        });
                        Navigator.pop(ctx);
                      },
                      child: const Text('Đặt lại', style: TextStyle(color: AppColors.primary)),
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            ...categories.map((cat) => ListTile(
                  title: Text(cat),
                  trailing: _selectedCategory == cat
                      ? const Icon(Icons.check, color: AppColors.primary)
                      : null,
                  onTap: () {
                    setState(() {
                      _selectedCategory = cat;
                      _activeTab = 'category';
                    });
                    Navigator.pop(ctx);
                  },
                )),
          ],
        ),
      ),
    );
  }

  void _showStatusFilterDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Lọc theo trạng thái',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            const Divider(height: 1),
            ListTile(
              title: const Text('Tất cả'),
              trailing: _activeTab == 'all'
                  ? const Icon(Icons.check, color: AppColors.primary)
                  : null,
              onTap: () {
                setState(() => _activeTab = 'all');
                Navigator.pop(ctx);
              },
            ),
            ListTile(
              title: const Text('Còn hàng'),
              trailing: _activeTab == 'status'
                  ? const Icon(Icons.check, color: AppColors.primary)
                  : null,
              onTap: () {
                setState(() => _activeTab = 'status');
                Navigator.pop(ctx);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final allFavorites = ref.watch(favoritesProvider);
    final cartCount = ref.watch(cartBadgeCountProvider);

    // Apply filtering
    List<FavoriteProductItem> filteredList = List.from(allFavorites);

    final searchQuery = _searchController.text.trim();
    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      filteredList = filteredList
          .where((item) =>
              item.title.toLowerCase().contains(q) ||
              item.categoryName.toLowerCase().contains(q))
          .toList();
    }

    if (_activeTab == 'discount') {
      filteredList = filteredList.where((item) => item.discountPercent > 0).toList();
    } else if (_activeTab == 'category' && _selectedCategory.isNotEmpty) {
      filteredList =
          filteredList.where((item) => item.categoryName == _selectedCategory).toList();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back,
            color: AppColors.primary,
            size: 24,
          ),
          onPressed: () {
            if (_isSearching) {
              setState(() {
                _isSearching = false;
                _searchController.clear();
              });
              return;
            }
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
            }
          },
        ),
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'Tìm trong Đã lưu...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF)),
                ),
                style: const TextStyle(fontSize: 14, color: Color(0xFF1F2937)),
              )
            : const Text(
                'Đã lưu',
                style: TextStyle(
                  color: Color(0xFF1F2937),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
        centerTitle: false,
        actions: [
          if (!_isSearching)
            IconButton(
              icon: const Icon(
                Icons.search,
                color: AppColors.primary,
                size: 24,
              ),
              onPressed: () => setState(() => _isSearching = true),
            ),
          IconButton(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(
                  Icons.shopping_cart_outlined,
                  color: AppColors.primary,
                  size: 24,
                ),
                if (cartCount > 0)
                  Positioned(
                    right: -6,
                    top: -6,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
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
          const SizedBox(width: 8),
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
      body: Column(
        children: [
          // Filter subheader row
          _buildFilterBar(allFavorites),

          // Product Grid or Empty State
          Expanded(
            child: filteredList.isEmpty
                ? (searchQuery.isNotEmpty
                    ? _buildSearchEmptyState(searchQuery)
                    : _buildEmptyState())
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 0.51,
                    ),
                    itemCount: filteredList.length,
                    itemBuilder: (context, index) =>
                        _buildProductCard(filteredList[index]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(List<FavoriteProductItem> allFavorites) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: Row(
        children: [
          // 1. Tất Cả tab
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _activeTab = 'all';
                  _selectedCategory = '';
                });
              },
              child: Container(
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: _activeTab == 'all'
                        ? AppColors.primary
                        : const Color(0xFFE5E7EB),
                    width: _activeTab == 'all' ? 1.2 : 0.8,
                  ),
                ),
                child: Stack(
                  children: [
                    if (_activeTab == 'all') ...[
                      Positioned(
                        top: 0,
                        left: 0,
                        child: CustomPaint(
                          size: const Size(14, 14),
                          painter: _CornerTrianglePainter(
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const Positioned(
                        top: 0.5,
                        left: 1,
                        child: Icon(
                          Icons.check,
                          size: 8,
                          color: Colors.white,
                        ),
                      ),
                    ],
                    Center(
                      child: Text(
                        'Tất Cả',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: _activeTab == 'all'
                              ? FontWeight.w600
                              : FontWeight.normal,
                          color: _activeTab == 'all'
                              ? AppColors.primary
                              : const Color(0xFF374151),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 2. Trạng thái ˅ tab
          Expanded(
            child: GestureDetector(
              onTap: _showStatusFilterDialog,
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: _activeTab == 'status'
                        ? AppColors.primary
                        : const Color(0xFFE5E7EB),
                    width: _activeTab == 'status' ? 1.2 : 0.8,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Trạng thái',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: _activeTab == 'status'
                            ? AppColors.primary
                            : const Color(0xFF374151),
                        fontWeight: _activeTab == 'status'
                            ? FontWeight.w600
                            : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(
                      Icons.keyboard_arrow_down,
                      size: 16,
                      color: _activeTab == 'status'
                          ? AppColors.primary
                          : const Color(0xFF6B7280),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 3. Giảm giá tab
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _activeTab = _activeTab == 'discount' ? 'all' : 'discount';
                });
              },
              child: Container(
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: _activeTab == 'discount'
                        ? AppColors.primary
                        : const Color(0xFFE5E7EB),
                    width: _activeTab == 'discount' ? 1.2 : 0.8,
                  ),
                ),
                child: Center(
                  child: Text(
                    'Giảm giá',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: _activeTab == 'discount'
                          ? AppColors.primary
                          : const Color(0xFF374151),
                      fontWeight: _activeTab == 'discount'
                          ? FontWeight.w600
                          : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 4. Ngành hàng ˅ tab
          Expanded(
            child: GestureDetector(
              onTap: () => _showCategoryFilterDialog(allFavorites),
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: _activeTab == 'category'
                        ? AppColors.primary
                        : const Color(0xFFE5E7EB),
                    width: _activeTab == 'category' ? 1.2 : 0.8,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        _selectedCategory.isNotEmpty ? _selectedCategory : 'Ngành hàng',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: _activeTab == 'category'
                              ? AppColors.primary
                              : const Color(0xFF374151),
                          fontWeight: _activeTab == 'category'
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(
                      Icons.keyboard_arrow_down,
                      size: 16,
                      color: _activeTab == 'category'
                          ? AppColors.primary
                          : const Color(0xFF6B7280),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Card sản phẩm theo đúng UI của trang khám phá (CatalogPage)
  Widget _buildProductCard(FavoriteProductItem item) {
    final id = item.id;
    final title = item.title;
    final storeName = item.storeName.isNotEmpty ? item.storeName : 'An Nhiên Studio';
    final variants = item.variants;

    int? lowestPrice;
    if (variants.isNotEmpty) {
      for (final v in variants) {
        final p = v['price_vnd'];
        int? pInt;
        if (p is num) pInt = p.toInt();
        if (p is String) pInt = int.tryParse(p);
        if (pInt != null && pInt > 0) {
          if (lowestPrice == null || pInt < lowestPrice) {
            lowestPrice = pInt;
          }
        }
      }
    }
    lowestPrice ??= (item.priceVnd > 0 ? item.priceVnd : 100000);

    final originalPriceInt = (lowestPrice * 1.25).round();
    final imageUrl = item.imageUrl;

    return GestureDetector(
      onTap: () => _navigateToProduct(item),
      child: Container(
        decoration: AppDecorations.card(radius: 14),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Product Image & Badges
            AspectRatio(
              aspectRatio: 1.0,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: const Color(0xFFF9FAFB),
                    child: (imageUrl.isNotEmpty && imageUrl.startsWith('http'))
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => const Center(
                              child: Icon(
                                Icons.shopping_bag_outlined,
                                size: 42,
                                color: Color(0xFFCBD5E1),
                              ),
                            ),
                          )
                        : const Center(
                            child: Icon(
                              Icons.shopping_bag_outlined,
                              size: 42,
                              color: Color(0xFFCBD5E1),
                            ),
                          ),
                  ),
                  // Discount Badge Top-Left
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                      decoration: AppDecorations.discountTag,
                      child: Text(
                        item.discountPercent > 0 ? '-${item.discountPercent}%' : '-25%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  // Favorite Heart Button Top-Right
                  Positioned(
                    top: 2,
                    right: 2,
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        ref.read(favoritesProvider.notifier).removeFavorite(id);
                        AppNoticeDialog.show(
                          context,
                          message: 'Đã xóa khỏi danh sách yêu thích.',
                        );
                      },
                      child: Container(
                        width: 44,
                        height: 44,
                        alignment: Alignment.center,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black12,
                                blurRadius: 4,
                                offset: Offset(0, 1),
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.favorite_rounded,
                              size: 17,
                              color: Color(0xFFDC2626),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 2. Product Details
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Price Row
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '$lowestPrice ₫',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 13.5,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '$originalPriceInt ₫',
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 10,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    // Rating & Sold Row
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: AppColors.star, size: 13),
                        const SizedBox(width: 2),
                        const Text(
                          '4.8',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '• Đã bán ${item.soldCount}',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    // "Thêm vào giỏ" Button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        style: ButtonStyle(
                          backgroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
                            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                              return AppColors.primary;
                            }
                            return Colors.white;
                          }),
                          foregroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
                            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                              return Colors.white;
                            }
                            return const Color(0xFF374151);
                          }),
                          iconColor: WidgetStateProperty.resolveWith<Color?>((states) {
                            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                              return Colors.white;
                            }
                            return const Color(0xFF374151);
                          }),
                          side: WidgetStateProperty.resolveWith<BorderSide>((states) {
                            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                              return const BorderSide(color: AppColors.primary);
                            }
                            return const BorderSide(color: Color(0xFFD1D5DB));
                          }),
                          padding: const WidgetStatePropertyAll(
                            EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                          ),
                          minimumSize: const WidgetStatePropertyAll(Size(0, 30)),
                          shape: WidgetStatePropertyAll(
                            RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          ),
                        ),
                        icon: const Icon(Icons.shopping_cart_outlined, size: 13),
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
                    if (storeName.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.storefront_outlined,
                            size: 11,
                            color: AppColors.textMuted,
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              '$storeName ›',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Empty state khi tìm kiếm không có kết quả: không hiển thị trái tim
  Widget _buildSearchEmptyState(String query) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: Color(0xFFF3F4F6),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Icon(
                  Icons.search_off_rounded,
                  size: 36,
                  color: Color(0xFF9CA3AF),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Không tìm thấy sản phẩm',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Không có sản phẩm nào phù hợp với từ khóa "$query".',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF6B7280),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () {
                setState(() {
                  _searchController.clear();
                  _isSearching = false;
                });
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Xóa tìm kiếm'),
            ),
          ],
        ),
      ),
    );
  }

  /// Empty state khi chưa có sản phẩm nào được lưu
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
                color: Color(0xFFFFF1F0),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Icon(
                  Icons.favorite_border_rounded,
                  size: 38,
                  color: AppColors.primary,
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
}

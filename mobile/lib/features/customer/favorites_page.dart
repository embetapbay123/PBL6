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
    this.discountPercent = 0,
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
      storeName: map['store_name']?.toString() ?? 'Gian hàng chính hãng',
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
      discountPercent: (map['discount_percent'] as num?)?.toInt() ?? 0,
      soldCount: map['sold_count']?.toString() ?? '100+ đã bán',
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
  FavoritesNotifier()
      : super([
          const FavoriteProductItem(
            id: 'fav-1',
            title: '[CHÉERYEP OFFICIAL] Phấn Mắt Đơn Sắc Ánh Nhũ Mịn Lì Má Hồng DIY Đa Năng',
            storeId: 'store-cheeryep',
            storeName: 'CHÉERYEP Official Store',
            priceVnd: 85455,
            priceDisplay: '85.455 đ',
            optionLabel: '100+ màu sắc',
            imageUrl:
                'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80',
            variantId: 'v-cheeryep-1',
            categoryName: 'Mỹ phẩm',
            discountPercent: 37,
            soldCount: '8k+ đã bán',
            isMall: true,
            hasVideo: true,
            variants: [
              {'id': 'v-cheeryep-1', 'sku': 'CY-01', 'price_vnd': 85455, 'variant_values': {'color': 'Nhũ hồng ánh kim'}},
              {'id': 'v-cheeryep-2', 'sku': 'CY-02', 'price_vnd': 85455, 'variant_values': {'color': 'Cam đào mịn lì'}},
            ],
          ),
          const FavoriteProductItem(
            id: 'fav-2',
            title: '[Sẵn + Hoả tốc] Naii.order | Đầm dài hoa nhí cổ yếm – Phong cách tiểu thư dáng xoè',
            storeId: 'store-naii',
            storeName: 'Naii.order Studio',
            priceVnd: 451080,
            priceDisplay: '451.080 đ',
            optionLabel: '2 kích cỡ',
            imageUrl:
                'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&q=80',
            variantId: 'v-naii-1',
            categoryName: 'Thời trang',
            discountPercent: 18,
            soldCount: '474 đã bán',
            isMall: false,
            hasVideo: false,
            variants: [
              {'id': 'v-naii-1', 'sku': 'DR-S', 'price_vnd': 451080, 'variant_values': {'size': 'S'}},
              {'id': 'v-naii-2', 'sku': 'DR-M', 'price_vnd': 451080, 'variant_values': {'size': 'M'}},
            ],
          ),
          const FavoriteProductItem(
            id: 'fav-3',
            title: 'Vòng tay bạc boho hoa chạm khắc, phong cách dân tộc cổ điển cao cấp',
            storeId: 'store-silver',
            storeName: 'Boho Silver Store',
            priceVnd: 51400,
            priceDisplay: '51.400 đ',
            optionLabel: 'Bản 12mm',
            imageUrl:
                'https://images.unsplash.com/photo-1611591475874-6819b1e95e8d?w=500&q=80',
            variantId: 'v-silver-1',
            categoryName: 'Phụ kiện',
            discountPercent: 15,
            soldCount: '53 đã bán',
            isMall: true,
            hasVideo: true,
            variants: [
              {'id': 'v-silver-1', 'sku': 'SLV-12', 'price_vnd': 51400, 'variant_values': {'type': 'Bản 12mm'}},
            ],
          ),
          const FavoriteProductItem(
            id: 'fav-4',
            title: 'Bộ sưu tập JOOCYEE Be A Kidult Collection son bùn lì & phấn má tạo khối',
            storeId: 'store-joocyee',
            storeName: 'JOOCYEE Official Store',
            priceVnd: 210100,
            priceDisplay: '210.100 đ',
            optionLabel: 'Duy nhất',
            imageUrl:
                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&q=80',
            variantId: 'v-joocyee-1',
            categoryName: 'Mỹ phẩm',
            discountPercent: 46,
            soldCount: '327 đã bán',
            isMall: true,
            hasVideo: true,
            variants: [
              {'id': 'v-joocyee-1', 'sku': 'JCY-KD', 'price_vnd': 210100, 'variant_values': {'tone': 'Hồng đất'}},
            ],
          ),
          const FavoriteProductItem(
            id: '26d45e7d-4663-43d6-840f-e31b7d6192aa',
            title: 'Áo hoodie xám Weekend unisex form rộng chất nỉ bông cao cấp',
            storeId: '3aeb8256-3d88-46be-8321-89bb43aaf300',
            storeName: 'An Nhiên Studio',
            priceVnd: 389000,
            priceDisplay: 'Từ 389.000 đ',
            optionLabel: '4 lựa chọn',
            imageUrl:
                'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80',
            variantId: 'v-1',
            categoryName: 'Thời trang',
            discountPercent: 20,
            soldCount: '1.2k đã bán',
            isMall: true,
            hasVideo: false,
            variants: [
              {'id': 'v-1', 'sku': 'HD-GRY-M', 'price_vnd': 389000, 'variant_values': {'size': 'M', 'color': 'Xám'}},
              {'id': 'v-2', 'sku': 'HD-GRY-L', 'price_vnd': 389000, 'variant_values': {'size': 'L', 'color': 'Xám'}},
              {'id': 'v-3', 'sku': 'HD-GRY-XL', 'price_vnd': 409000, 'variant_values': {'size': 'XL', 'color': 'Xám'}},
              {'id': 'v-4', 'sku': 'HD-GRY-S', 'price_vnd': 389000, 'variant_values': {'size': 'S', 'color': 'Xám'}},
            ],
          ),
          const FavoriteProductItem(
            id: '4c9e3908-01a9-4bf4-845b-0c57b7d10cd0',
            title: 'Ấm trà kim loại hình học phong cách Bắc Âu hiện đại',
            storeId: '33e0b2c4-c52c-4839-9796-41d6214e3bcd',
            storeName: 'Mây Xanh Living',
            priceVnd: 349000,
            priceDisplay: '349.000 đ',
            optionLabel: 'Phân loại tiêu chuẩn',
            imageUrl:
                'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80',
            variantId: 'v-10',
            categoryName: 'Nhà cửa & đời sống',
            discountPercent: 10,
            soldCount: '210 đã bán',
            isMall: false,
            hasVideo: false,
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
  bool _isEditMode = false;
  final Set<String> _selectedIds = {};
  String _activeTab = 'all'; // 'all', 'status', 'discount', 'category'
  String _selectedCategory = '';
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _addingCartIds = {};

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleEditMode() {
    setState(() {
      _isEditMode = !_isEditMode;
      _selectedIds.clear();
    });
  }

  void _toggleSelectAll(List<FavoriteProductItem> currentList) {
    setState(() {
      if (_selectedIds.length == currentList.length) {
        _selectedIds.clear();
      } else {
        _selectedIds.addAll(currentList.map((e) => e.id));
      }
    });
  }

  void _deleteSelected() {
    if (_selectedIds.isEmpty) return;
    final count = _selectedIds.length;
    ref.read(favoritesProvider.notifier).removeMultiple(_selectedIds);
    setState(() {
      _selectedIds.clear();
      _isEditMode = false;
    });
    AppNoticeDialog.show(
      context,
      message: 'Đã xóa $count sản phẩm khỏi danh sách yêu thích.',
    );
  }

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

  void _showItemOptions(FavoriteProductItem item) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 8, bottom: 4),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD1D5DB),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                item.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Color(0xFFEE4D2D)),
              title: const Text('Bỏ yêu thích', style: TextStyle(color: Color(0xFFEE4D2D))),
              onTap: () {
                Navigator.pop(ctx);
                _handleRemoveFavorite(item);
              },
            ),
            ListTile(
              leading: const Icon(Icons.search, color: Color(0xFF374151)),
              title: const Text('Tìm sản phẩm tương tự'),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.pushNamed(context, '/', arguments: {'search': item.categoryName});
              },
            ),
            ListTile(
              leading: const Icon(Icons.close, color: Color(0xFF6B7280)),
              title: const Text('Đóng'),
              onTap: () => Navigator.pop(ctx),
            ),
          ],
        ),
      ),
    );
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
                      child: const Text('Đặt lại', style: TextStyle(color: Color(0xFFEE4D2D))),
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            ...categories.map((cat) => ListTile(
                  title: Text(cat),
                  trailing: _selectedCategory == cat
                      ? const Icon(Icons.check, color: Color(0xFFEE4D2D))
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
                  ? const Icon(Icons.check, color: Color(0xFFEE4D2D))
                  : null,
              onTap: () {
                setState(() => _activeTab = 'all');
                Navigator.pop(ctx);
              },
            ),
            ListTile(
              title: const Text('Còn hàng'),
              trailing: _activeTab == 'status'
                  ? const Icon(Icons.check, color: Color(0xFFEE4D2D))
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

    if (_searchController.text.trim().isNotEmpty) {
      final q = _searchController.text.trim().toLowerCase();
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
            color: Color(0xFFEE4D2D),
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
                  hintText: 'Tìm trong Lượt Thích...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF)),
                ),
                style: const TextStyle(fontSize: 14, color: Color(0xFF1F2937)),
              )
            : const Text(
                'Lượt Thích',
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
                color: Color(0xFFEE4D2D),
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
                  color: Color(0xFFEE4D2D),
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
          TextButton(
            onPressed: _toggleEditMode,
            child: Text(
              _isEditMode ? 'Xong' : 'Chỉnh sửa',
              style: const TextStyle(
                color: Color(0xFFEE4D2D),
                fontSize: 14.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      bottomNavigationBar: _isEditMode
          ? _buildBottomEditBar(allFavorites)
          : AppBottomNav(
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

          // Product Grid
          Expanded(
            child: filteredList.isEmpty
                ? _buildEmptyState()
                : GridView.builder(
                    padding: const EdgeInsets.fromLTRB(10, 10, 10, 16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 8,
                      crossAxisSpacing: 8,
                      childAspectRatio: 0.585,
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
                        ? const Color(0xFFEE4D2D)
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
                            color: const Color(0xFFEE4D2D),
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
                              ? const Color(0xFFEE4D2D)
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
                        ? const Color(0xFFEE4D2D)
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
                            ? const Color(0xFFEE4D2D)
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
                          ? const Color(0xFFEE4D2D)
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
                        ? const Color(0xFFEE4D2D)
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
                          ? const Color(0xFFEE4D2D)
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
                        ? const Color(0xFFEE4D2D)
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
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: _activeTab == 'category'
                              ? const Color(0xFFEE4D2D)
                              : const Color(0xFF374151),
                          fontWeight: _activeTab == 'category'
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(
                      Icons.keyboard_arrow_down,
                      size: 16,
                      color: _activeTab == 'category'
                          ? const Color(0xFFEE4D2D)
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

  Widget _buildProductCard(FavoriteProductItem item) {
    final isSelected = _selectedIds.contains(item.id);

    return GestureDetector(
      onTap: () {
        if (_isEditMode) {
          setState(() {
            if (isSelected) {
              _selectedIds.remove(item.id);
            } else {
              _selectedIds.add(item.id);
            }
          });
        } else {
          _navigateToProduct(item);
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(4),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A000000),
              blurRadius: 3,
              offset: Offset(0, 1),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Thumbnail Image Stack with Badges
            AspectRatio(
              aspectRatio: 1.0,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: const Color(0xFFF9FAFB),
                    child: item.imageUrl.isNotEmpty
                        ? Image.network(
                            item.imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => const Center(
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

                  // Discount badge on top right
                  if (item.discountPercent > 0)
                    Positioned(
                      top: 4,
                      right: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF1F0),
                          borderRadius: BorderRadius.circular(2),
                          border: Border.all(
                            color: const Color(0xFFFFCCC7),
                            width: 0.5,
                          ),
                        ),
                        child: Text(
                          '-${item.discountPercent}%',
                          style: const TextStyle(
                            color: Color(0xFFEE4D2D),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            height: 1.1,
                          ),
                        ),
                      ),
                    ),

                  // Play button on bottom right if product has video
                  if (item.hasVideo)
                    Positioned(
                      bottom: 6,
                      right: 6,
                      child: Container(
                        width: 22,
                        height: 22,
                        decoration: const BoxDecoration(
                          color: Colors.black45,
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.play_arrow,
                            color: Colors.white,
                            size: 14,
                          ),
                        ),
                      ),
                    ),

                  // Selection checkbox overlay in edit mode
                  if (_isEditMode)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected
                              ? const Color(0xFFEE4D2D)
                              : Colors.white.withValues(alpha: 0.9),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFFEE4D2D)
                                : const Color(0xFF9CA3AF),
                            width: 1.5,
                          ),
                        ),
                        child: isSelected
                            ? const Icon(
                                Icons.check,
                                size: 14,
                                color: Colors.white,
                              )
                            : null,
                      ),
                    ),
                ],
              ),
            ),

            // 2. Info area
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Title with inline Mall badge
                    Text.rich(
                      TextSpan(
                        children: [
                          if (item.isMall) ...[
                            WidgetSpan(
                              alignment: PlaceholderAlignment.middle,
                              child: Container(
                                margin: const EdgeInsets.only(right: 4),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 3, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFD0011B),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: const Text(
                                  'Mall',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.bold,
                                    height: 1.0,
                                  ),
                                ),
                              ),
                            ),
                          ],
                          TextSpan(
                            text: item.title,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF222222),
                              height: 1.25,
                            ),
                          ),
                        ],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    // Price and Sold count row
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Expanded(
                          child: Text(
                            item.priceDisplay,
                            style: const TextStyle(
                              color: Color(0xFFEE4D2D),
                              fontWeight: FontWeight.bold,
                              fontSize: 13.5,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          item.soldCount,
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: Color(0xFF888888),
                          ),
                        ),
                      ],
                    ),

                    // Bottom Action Row: [...] [Tìm sản p...] [(Cart)]
                    Row(
                      children: [
                        // [...] Option button (also serves as quick remove with tooltip 'Bỏ yêu thích')
                        Tooltip(
                          message: 'Bỏ yêu thích',
                          child: InkWell(
                            onTap: () => _showItemOptions(item),
                            borderRadius: BorderRadius.circular(3),
                            child: Container(
                              width: 30,
                              height: 26,
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: const Color(0xFFE5E7EB),
                                  width: 0.8,
                                ),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.more_horiz,
                                  size: 16,
                                  color: Color(0xFF757575),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),

                        // [Tìm sản p...] Button
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              Navigator.pushNamed(
                                context,
                                '/',
                                arguments: {'search': item.categoryName},
                              );
                            },
                            borderRadius: BorderRadius.circular(3),
                            child: Container(
                              height: 26,
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: const Color(0xFFEE4D2D),
                                  width: 0.8,
                                ),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                'Tìm sản p...',
                                style: TextStyle(
                                  color: Color(0xFFEE4D2D),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),

                        // Circular Orange Cart Button
                        InkWell(
                          onTap: () => _quickAddToCart(item),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: 26,
                            height: 26,
                            decoration: const BoxDecoration(
                              color: Color(0xFFEE4D2D),
                              shape: BoxShape.circle,
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.shopping_cart_outlined,
                                size: 14,
                                color: Colors.white,
                              ),
                            ),
                          ),
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

  Widget _buildBottomEditBar(List<FavoriteProductItem> allFavorites) {
    final isAllSelected = _selectedIds.length == allFavorites.length && allFavorites.isNotEmpty;

    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 6,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          InkWell(
            onTap: () => _toggleSelectAll(allFavorites),
            child: Row(
              children: [
                Checkbox(
                  value: isAllSelected,
                  activeColor: const Color(0xFFEE4D2D),
                  onChanged: (_) => _toggleSelectAll(allFavorites),
                ),
                Text(
                  'Chọn tất cả (${allFavorites.length})',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          FilledButton(
            onPressed: _selectedIds.isEmpty ? null : _deleteSelected,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFEE4D2D),
              disabledBackgroundColor: const Color(0xFFFFCCBA),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            ),
            child: Text(
              'Xóa (${_selectedIds.length})',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ),
        ],
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
}

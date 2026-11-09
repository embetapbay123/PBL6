import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../cart/cart_variant_modal.dart';
import '../catalog/product_detail_page.dart';
import '../catalog/recently_viewed_provider.dart';
import '../chat/chat_ai_modal.dart';
import '../shared/app_bottom_nav.dart';
import 'favorites_page.dart';

class RecentlyViewedPage extends ConsumerStatefulWidget {
  const RecentlyViewedPage({super.key});

  @override
  ConsumerState<RecentlyViewedPage> createState() => _RecentlyViewedPageState();
}

class _RecentlyViewedPageState extends ConsumerState<RecentlyViewedPage> {
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;

  // Active filter tab: 'all', 'status', 'discount', 'category'
  String _activeTab = 'all';

  // Sub-filter values
  String _selectedCategory = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _formatPrice(int price) {
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

  void _showStatusFilterDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Lọc theo trạng thái',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ListTile(
                title: const Text('Tất cả'),
                leading: Icon(
                  _activeTab == 'all' ? Icons.check_circle : Icons.circle_outlined,
                  color: _activeTab == 'all' ? AppColors.primary : Colors.grey,
                ),
                onTap: () {
                  setState(() => _activeTab = 'all');
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('Có giảm giá'),
                leading: Icon(
                  _activeTab == 'discount' ? Icons.check_circle : Icons.circle_outlined,
                  color: _activeTab == 'discount' ? AppColors.primary : Colors.grey,
                ),
                onTap: () {
                  setState(() => _activeTab = 'discount');
                  Navigator.pop(ctx);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCategoryFilterDialog(List<String> categories) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Chọn ngành hàng',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ListTile(
                title: const Text('Tất cả ngành hàng'),
                leading: Icon(
                  _selectedCategory.isEmpty ? Icons.check_circle : Icons.circle_outlined,
                  color: _selectedCategory.isEmpty ? AppColors.primary : Colors.grey,
                ),
                onTap: () {
                  setState(() {
                    _selectedCategory = '';
                    _activeTab = 'all';
                  });
                  Navigator.pop(ctx);
                },
              ),
              ...categories.map(
                (cat) => ListTile(
                  title: Text(cat),
                  leading: Icon(
                    _selectedCategory == cat ? Icons.check_circle : Icons.circle_outlined,
                    color: _selectedCategory == cat ? AppColors.primary : Colors.grey,
                  ),
                  onTap: () {
                    setState(() {
                      _selectedCategory = cat;
                      _activeTab = 'category';
                    });
                    Navigator.pop(ctx);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmClearHistory() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa lịch sử đã xem?'),
        content: const Text('Bạn có chắc muốn xóa tất cả sản phẩm đã xem gần đây không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: Color(0xFF6B7280))),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              ref.read(recentlyViewedProvider.notifier).clear();
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Đã xóa lịch sử sản phẩm đã xem.')),
              );
            },
            child: const Text('Xóa tất cả'),
          ),
        ],
      ),
    );
  }

  Future<void> _quickAddToCart(RecentlyViewedItem item) async {
    final rawProduct = item.rawProduct;
    final variants = (rawProduct['variants'] as List?) ?? [];
    final productId = item.id;
    final defaultVariantId = variants.isNotEmpty ? (variants.first as Map)['id']?.toString() ?? 'v-1' : 'v-1';

    if (variants.length > 1) {
      await CartVariantModal.show(
        context: context,
        cartItem: {
          'product_id': productId,
          'variant_id': defaultVariantId,
          'quantity': 1,
          'image_url': item.imageUrl,
        },
        initialProduct: rawProduct.isNotEmpty ? rawProduct : {'id': productId, 'title': item.title},
        onConfirm: (selectedVariant, quantity) async {
          final selVariantId = selectedVariant['id']?.toString() ?? '';
          if (selVariantId.isEmpty) return;
          try {
            final client = ref.read(apiProvider);
            await client.addToCart(
              variantId: selVariantId,
              productId: productId,
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
        variantId: defaultVariantId,
        productId: productId,
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

  @override
  Widget build(BuildContext context) {
    final allRecentItems = ref.watch(recentlyViewedProvider);
    final cartCount = ref.watch(cartBadgeCountProvider);

    // Extract categories
    final categories = <String>{};
    for (final it in allRecentItems) {
      final cat = it.rawProduct['category_name']?.toString() ??
          (it.rawProduct['category'] is Map ? it.rawProduct['category']['name']?.toString() : null) ??
          'Thời trang';
      if (cat.isNotEmpty) categories.add(cat);
    }

    List<RecentlyViewedItem> filteredList = List.from(allRecentItems);

    final searchQuery = _searchController.text.trim();
    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      filteredList = filteredList.where((item) => item.title.toLowerCase().contains(q)).toList();
    }

    if (_activeTab == 'discount') {
      filteredList = filteredList.where((item) {
        final disc = item.rawProduct['discount']?.toString() ?? '';
        return disc.isNotEmpty && disc != '0%';
      }).toList();
    } else if (_activeTab == 'category' && _selectedCategory.isNotEmpty) {
      filteredList = filteredList.where((item) {
        final cat = item.rawProduct['category_name']?.toString() ??
            (item.rawProduct['category'] is Map ? item.rawProduct['category']['name']?.toString() : null) ??
            'Thời trang';
        return cat == _selectedCategory;
      }).toList();
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
                  hintText: 'Tìm trong Đã xem gần đây...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF)),
                ),
                style: const TextStyle(fontSize: 14, color: Color(0xFF1F2937)),
              )
            : const Text(
                'Đã xem gần đây',
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
          if (allRecentItems.isNotEmpty)
            IconButton(
              icon: const Icon(
                Icons.delete_outline_rounded,
                color: Color(0xFF6B7280),
                size: 22,
              ),
              tooltip: 'Xóa lịch sử',
              onPressed: _confirmClearHistory,
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
          // Filter subheader row matching favorites page
          _buildFilterBar(categories.toList()),

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
                      childAspectRatio: 0.58,
                    ),
                    itemCount: filteredList.length,
                    itemBuilder: (context, index) => _buildProductCard(filteredList[index]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(List<String> categories) {
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
                    color: _activeTab == 'all' ? AppColors.primary : const Color(0xFFE5E7EB),
                    width: _activeTab == 'all' ? 1.2 : 0.8,
                  ),
                ),
                child: Center(
                  child: Text(
                    'Tất Cả',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: _activeTab == 'all' ? FontWeight.w600 : FontWeight.normal,
                      color: _activeTab == 'all' ? AppColors.primary : const Color(0xFF374151),
                    ),
                  ),
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
                    color: _activeTab == 'status' ? AppColors.primary : const Color(0xFFE5E7EB),
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
                        color: _activeTab == 'status' ? AppColors.primary : const Color(0xFF374151),
                        fontWeight: _activeTab == 'status' ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(
                      Icons.keyboard_arrow_down,
                      size: 16,
                      color: _activeTab == 'status' ? AppColors.primary : const Color(0xFF6B7280),
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
                    color: _activeTab == 'discount' ? AppColors.primary : const Color(0xFFE5E7EB),
                    width: _activeTab == 'discount' ? 1.2 : 0.8,
                  ),
                ),
                child: Center(
                  child: Text(
                    'Giảm giá',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: _activeTab == 'discount' ? AppColors.primary : const Color(0xFF374151),
                      fontWeight: _activeTab == 'discount' ? FontWeight.w600 : FontWeight.normal,
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
              onTap: () => _showCategoryFilterDialog(categories),
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: _activeTab == 'category' ? AppColors.primary : const Color(0xFFE5E7EB),
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
                          color: _activeTab == 'category' ? AppColors.primary : const Color(0xFF374151),
                          fontWeight: _activeTab == 'category' ? FontWeight.w600 : FontWeight.normal,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(
                      Icons.keyboard_arrow_down,
                      size: 16,
                      color: _activeTab == 'category' ? AppColors.primary : const Color(0xFF6B7280),
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

  Widget _buildProductCard(RecentlyViewedItem item) {
    final id = item.id;
    final title = item.title;
    final lowestPrice = item.priceVnd;
    final originalPriceInt = (lowestPrice * 1.25).round();
    final imageUrl = item.imageUrl;
    final rawProduct = item.rawProduct;

    // Rating
    final rawRating = rawProduct['rating'] ?? rawProduct['rating_average'] ?? rawProduct['avg_rating'];
    final ratingStr = (rawRating is num && rawRating > 0)
        ? rawRating.toStringAsFixed(1)
        : (rawRating is String && (double.tryParse(rawRating) ?? 0) > 0
            ? double.parse(rawRating).toStringAsFixed(1)
            : '4.8');

    // Sales
    final rawSold = rawProduct['sold'] ?? rawProduct['sold_count'] ?? rawProduct['monthly_sales'];
    final soldStr = (rawSold != null && rawSold.toString().isNotEmpty) ? rawSold.toString() : '100+';

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ProductDetailPage(
              productId: id,
              initialProduct: rawProduct.isNotEmpty ? rawProduct : {'id': id, 'title': title},
            ),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF3F4F6), width: 1),
          boxShadow: const [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Image + badges
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Container(
                      color: Colors.grey.shade100,
                      child: imageUrl.isNotEmpty && imageUrl.startsWith('http')
                          ? Image.network(
                              imageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (ctx, err, stack) => const Center(
                                child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 36),
                              ),
                            )
                          : const Center(
                              child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 36),
                            ),
                    ),
                    // Discount Badge (-25%)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          '-25%',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    // Favorite Heart Button
                    Positioned(
                      top: 4,
                      right: 4,
                      child: Consumer(
                        builder: (context, ref, _) {
                          final isFav = ref.watch(favoritesProvider).any((f) => f.id == id);
                          return GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () {
                              ref.read(favoritesProvider.notifier).toggleFavorite(
                                    rawProduct.isNotEmpty
                                        ? rawProduct
                                        : {
                                            'id': id,
                                            'title': title,
                                            'price_vnd': lowestPrice,
                                            'image_url': imageUrl,
                                          },
                                  );
                              AppNoticeDialog.show(
                                context,
                                message: isFav
                                    ? 'Đã xóa khỏi danh sách yêu thích.'
                                    : 'Đã thêm vào danh sách yêu thích!',
                              );
                            },
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
                              child: Center(
                                child: Icon(
                                  isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                  size: 16,
                                  color: isFav ? const Color(0xFFDC2626) : const Color(0xFF6B7280),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // 2. Details
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    height: 32,
                    child: Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                        height: 1.25,
                      ),
                    ),
                  ),
                  const SizedBox(height: 3),
                  // Price Row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        _formatPrice(lowestPrice),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13.5,
                        ),
                      ),
                      if (originalPriceInt > lowestPrice) ...[
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            _formatPrice(originalPriceInt),
                            style: TextStyle(
                              color: Colors.grey.shade400,
                              fontSize: 10.5,
                              decoration: TextDecoration.lineThrough,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  // Rating & Sold Row
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, size: 13, color: AppColors.star),
                      const SizedBox(width: 2),
                      Text(
                        ratingStr,
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '• Đã bán $soldStr',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // "Thêm vào giỏ" Button with orange hover state
                  SizedBox(
                    width: double.infinity,
                    height: 28,
                    child: OutlinedButton.icon(
                      style: ButtonStyle(
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
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
                        minimumSize: const WidgetStatePropertyAll(Size(0, 28)),
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
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: Color(0xFFF3F4F6),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.access_time_rounded,
                size: 40,
                color: Color(0xFF9CA3AF),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Chưa có sản phẩm đã xem',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Các sản phẩm bạn vừa xem sẽ xuất hiện tại đây để bạn tiện xem lại.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 24),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false),
              child: const Text(
                'Khám phá ngay',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchEmptyState(String query) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: Color(0xFFF3F4F6),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.search_off_rounded,
                size: 40,
                color: Color(0xFF9CA3AF),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Không tìm thấy sản phẩm',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Không có sản phẩm nào khớp với "$query"',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
            ),
          ],
        ),
      ),
    );
  }
}

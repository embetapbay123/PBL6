import 'recently_viewed_provider.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../cart/cart_variant_modal.dart';
import '../chat/chat_ai_modal.dart';
import '../customer/favorites_page.dart';
import 'shop_page.dart';

class ProductDetailPage extends ConsumerStatefulWidget {
  const ProductDetailPage({
    super.key,
    required this.productId,
    this.initialProduct,
  });

  final String productId;
  final Map<String, dynamic>? initialProduct;

  @override
  ConsumerState<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends ConsumerState<ProductDetailPage> {
  Map<String, dynamic>? _product;
  Map<String, dynamic>? _storeData;
  List<Map<String, dynamic>> _reviews = [];
  List<Map<String, dynamic>> _relatedProducts = [];
  bool _loading = true;
  String? _error;

  int _selectedImageIndex = 0;
  int _selectedVariantIndex = 0;
  int _quantity = 1;
  bool _addingToCart = false;
  late final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }


  @override
  void initState() {
    super.initState();
    _product = widget.initialProduct;
    _recordRecentlyViewed();
    _loadAll();
  }

  void _recordRecentlyViewed() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final p = _product;
      if (p != null && p['id'] != null) {
        ref.read(recentlyViewedProvider.notifier).addProduct(p);
      }
    });
  }

  @override
  void didUpdateWidget(covariant ProductDetailPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.productId != widget.productId || oldWidget.initialProduct != widget.initialProduct) {
      _selectedImageIndex = 0;
      if (_pageController.hasClients) {
        _pageController.jumpToPage(0);
      }
      _product = widget.initialProduct;
      _recordRecentlyViewed();
      _loadAll();
    }
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final client = ref.read(apiProvider);
    try {
      final productFuture = client.getProduct(widget.productId);
      final reviewsFuture = client.getProductReviews(widget.productId);
      final relatedFuture = client.getRelatedProducts(widget.productId);

      final results = await Future.wait([
        productFuture,
        reviewsFuture,
        relatedFuture,
      ]);

      final product = results[0] as Map<String, dynamic>;
      final storeId = product['store_id']?.toString();
      Map<String, dynamic>? storeData;
      if (storeId != null && storeId.isNotEmpty) {
        try {
          storeData = await client.getStore(storeId);
        } catch (_) {}
      }

      if (mounted) {
        setState(() {
          _product = product;
          _storeData = storeData;
          _reviews = results[1] as List<Map<String, dynamic>>;
          _relatedProducts = results[2] as List<Map<String, dynamic>>;
          _loading = false;
        });
        ref.read(recentlyViewedProvider.notifier).addProduct(product);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _product = null;
          _error = errorMessage(e);
          _loading = false;
        });
      }
    }
  }

  bool _isProductHiddenOrDeleted() {
    final p = _product;
    if (p == null) return false;
    final status = p['status']?.toString().toUpperCase() ?? '';
    if (status == 'HIDDEN' ||
        status == 'DELETED' ||
        status == 'INACTIVE' ||
        status == 'DRAFT' ||
        status == 'ẨN' ||
        status == 'ĐÃ ẨN') {
      return true;
    }
    if (p['is_hidden'] == true ||
        p['is_deleted'] == true ||
        p['is_active'] == false) {
      return true;
    }
    return false;
  }

  bool _isProductOutOfStock() {
    final p = _product;
    if (p == null) return false;
    final status = p['status']?.toString().toUpperCase() ?? '';
    if (p['is_out_of_stock'] == true ||
        p['stock_status']?.toString().toUpperCase() == 'OUT_OF_STOCK' ||
        status == 'OUT_OF_STOCK' ||
        status == 'HẾT HÀNG' ||
        status == 'ĐÃ HẾT') {
      return true;
    }

    final variants = (p['variants'] as List?) ?? [];
    if (variants.isNotEmpty) {
      int totalStock = 0;
      bool hasExplicitStock = false;
      for (final v in variants) {
        if (v is Map) {
          final s1 = (v['available_quantity'] as num?)?.toInt();
          final s2 = (v['stock'] as num?)?.toInt();
          final s3 = (v['inventory_quantity'] as num?)?.toInt();
          final s = s1 ?? s2 ?? s3;
          if (s != null) {
            hasExplicitStock = true;
            totalStock += s;
          }
        }
      }
      if (hasExplicitStock && totalStock <= 0) return true;
    } else {
      final s1 = (p['available_quantity'] as num?)?.toInt();
      final s2 = (p['stock'] as num?)?.toInt();
      final s3 = (p['inventory_quantity'] as num?)?.toInt();
      final s = s1 ?? s2 ?? s3;
      if (s != null && s <= 0) return true;
    }
    return false;
  }

  int _getProductSold(Map<String, dynamic> product) {
    final v = product['sold_count'] ??
        product['monthly_sales'] ??
        product['sales_monthly'] ??
        product['sales'] ??
        product['sold'] ??
        product['sold_quantity'] ??
        product['total_sold'];
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
  }

  String _formatSales(int count) {
    if (count <= 0) return '0';
    if (count >= 1000) {
      final k = (count / 1000).toStringAsFixed(1);
      return k.endsWith('.0') ? '${k.substring(0, k.length - 2)}k' : '${k}k';
    }
    return '$count';
  }

  Future<void> _addToCart({bool navigateToCart = false}) async {
    if (_isProductHiddenOrDeleted()) {
      AppNoticeDialog.show(
        context,
        message: 'Sản phẩm đã bị ẩn hoặc tạm ngừng kinh doanh',
      );
      return;
    }
    if (_isProductOutOfStock()) {
      AppNoticeDialog.show(
        context,
        message: 'Sản phẩm hiện đã hết hàng',
      );
      return;
    }

    final variants = (_product?['variants'] as List?) ?? [];
    if (variants.isEmpty) {
      AppNoticeDialog.show(
        context,
        message: 'Sản phẩm chưa có phiên bản để mua.',
      );
      return;
    }

    final selectedVariant =
        variants[_selectedVariantIndex] as Map<String, dynamic>;
    final variantId =
        selectedVariant['id']?.toString() ??
        selectedVariant['sku']?.toString() ??
        '';
    final stock = (selectedVariant['available_quantity'] as num?)?.toInt() ??
        (selectedVariant['stock'] as num?)?.toInt() ??
        (selectedVariant['inventory_quantity'] as num?)?.toInt();
    if (stock != null && stock > 0 && _quantity > stock) {
      AppNoticeDialog.show(
        context,
        message: 'Chỉ còn lại ' + stock.toString() + ' sản phẩm cho mặt hàng này',
      );
      return;
    }

    setState(() => _addingToCart = true);
    try {
      final client = ref.read(apiProvider);
      await client.addToCart(
        variantId: variantId,
        productId: widget.productId,
        quantity: _quantity,
      );
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: 'Đã thêm ' + _quantity.toString() + ' sản phẩm vào giỏ hàng!',
        );
        if (navigateToCart) {
          Navigator.pushNamed(context, '/cart');
        }
      }
    } catch (e) {
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: errorMessage(e),
        );
      }
    } finally {
      if (mounted) setState(() => _addingToCart = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _product == null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF1F2937)),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text('Chi tiết sản phẩm', style: TextStyle(color: Color(0xFF1F2937), fontSize: 16, fontWeight: FontWeight.bold)),
        ),
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (_error != null && _product == null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF1F2937)),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text('Chi tiết sản phẩm', style: TextStyle(color: Color(0xFF1F2937), fontSize: 16, fontWeight: FontWeight.bold)),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.primary),
                const SizedBox(height: 12),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.primary),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _loadAll,
                  style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final product = _product!;
    final title = product['title']?.toString() ?? 'Sản phẩm';
    final desc = product['description']?.toString() ?? 'Không có mô tả sản phẩm.';
    final attributes = (product['attributes'] as Map?) ?? {};
    final variants = (product['variants'] as List?) ?? [];
    final storeId = product['store_id']?.toString() ?? '';
    final storeName = attributes['brand']?.toString() ??
        product['store_name']?.toString() ??
        'PBL6 Store';

    Map<String, dynamic>? activeVariant;
    if (variants.isNotEmpty && _selectedVariantIndex < variants.length) {
      activeVariant = variants[_selectedVariantIndex] as Map<String, dynamic>;
    }

    final priceStr = activeVariant != null
        ? activeVariant['price_vnd']?.toString() ?? '100000'
        : (variants.isNotEmpty
            ? variants[0]['price_vnd']?.toString() ?? '100000'
            : '100000');

    final cartCount = ref.watch(cartBadgeCountProvider);

    final revSummary = product['review_summary'] as Map?;
    final rawRating = product['rating'] ??
        product['average_rating'] ??
        product['avg_rating'] ??
        product['rating_average'] ??
        product['stars'] ??
        product['score'] ??
        revSummary?['average'] ??
        revSummary?['avg'];

    double revAvg = 0.0;
    if (rawRating is num) {
      revAvg = rawRating.toDouble();
    } else if (rawRating is String) {
      revAvg = double.tryParse(rawRating) ?? 0.0;
    } else if (_reviews.isNotEmpty) {
      final totalStars = _reviews.fold<double>(
        0.0,
        (sum, r) => sum + ((r['rating'] as num?)?.toDouble() ?? 5.0),
      );
      revAvg = totalStars / _reviews.length;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF1F2937)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, size: 22, color: Color(0xFF374151)),
            tooltip: 'Chia sẻ',
            onPressed: () {
              AppNoticeDialog.show(
                context,
                message: 'Đã sao chép liên kết sản phẩm vào bộ nhớ tạm!',
              );
            },
          ),
          IconButton(
            icon: Icon(
              ref.watch(favoritesProvider).any((f) => f.id == widget.productId)
                  ? Icons.favorite_rounded
                  : Icons.favorite_border_rounded,
              color: ref.watch(favoritesProvider).any((f) => f.id == widget.productId)
                  ? const Color(0xFFC2410C)
                  : const Color(0xFF374151),
              size: 22,
            ),
            tooltip: 'Yêu thích',
            onPressed: () {
              final isFav = ref
                  .read(favoritesProvider)
                  .any((f) => f.id == widget.productId);
              if (_product != null) {
                ref.read(favoritesProvider.notifier).toggleFavorite(_product!);
              } else {
                ref.read(favoritesProvider.notifier).toggleFavorite({'id': widget.productId});
              }
              AppNoticeDialog.show(
                context,
                message: !isFav
                    ? 'Đã thêm vào danh sách yêu thích!'
                    : 'Đã xóa khỏi danh sách yêu thích.',
              );
            },
          ),
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined, size: 22, color: Color(0xFF374151)),
                tooltip: 'Giỏ hàng',
                onPressed: () => Navigator.pushNamed(context, '/cart'),
              ),
              if (cartCount > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                    child: Text(
                      '$cartCount',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8.5,
                        fontWeight: FontWeight.bold,
                        height: 1,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomActionBar(context),
      body: SingleChildScrollView(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Hero Image & Gallery Thumbnails (full screen width, flush against all edges)
            _buildHeroImageGallery(),

            Transform.translate(
              offset: const Offset(0, -16),
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 2. Price, Rating & Sold Row (directly below image, matching Image 2)
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                // Price
                Text(
                  '$priceStr ₫',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F0),
                    borderRadius: const BorderRadius.horizontal(
                      left: Radius.circular(10),
                      right: Radius.circular(10),
                    ),
                    border: Border.all(color: Colors.white, width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(8),
                        blurRadius: 2,
                        offset: const Offset(0, 0.5),
                      ),
                    ],
                  ),
                  child: const Text(
                    'Giá Sau Voucher',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      height: 1.1,
                    ),
                  ),
                ),
                const Spacer(),
                // Star Rating & Sold count
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.star_rounded, color: AppColors.star, size: 16),
                    const SizedBox(width: 2),
                    Text(
                      revAvg > 0 ? revAvg.toStringAsFixed(1) : '0',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '• Đã bán ${_formatSales(_getProductSold(product))}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 8),

            // 3. Product Title
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1F2937),
                height: 1.3,
              ),
            ),

            const SizedBox(height: 14),

            // 6. Trust Badges
            _buildTrustBadgesCard(),

            const SizedBox(height: 14),

            // 7. Variant & Quantity Selection
            _buildVariantAndQuantityCard(variants),

            const SizedBox(height: 14),

            // 8. Store Profile Card
            _buildStoreProfileCard(storeName, storeId),

            const SizedBox(height: 14),

            // 9. Product Specifications / Description Card
            _buildProductSpecsCard(desc, attributes),

            const SizedBox(height: 14),

            // 10. AI Assistant Banner
            _buildAiAssistantBanner(context, product),

            const SizedBox(height: 16),

            // 11. Customer Reviews Section
            _buildCustomerReviewsSection(),

            const SizedBox(height: 16),

            // 12. Related Products Section
            _buildRelatedProductsSection(),

            const SizedBox(height: 30),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// 1. Hero Image Container & Gallery (full width, flush against all edges)
  Widget _buildHeroImageGallery() {
    final images = (_product?['images'] as List?) ?? [];
    final fallbackUrl = _product?['image_url']?.toString() ?? _product?['thumbnail']?.toString();
    final List<String> imageList = [];
    if (images.isNotEmpty) {
      for (final img in images) {
        final u = img is Map ? img['image_url']?.toString() : img?.toString();
        if (u != null && u.isNotEmpty) {
          imageList.add(u);
        }
      }
    }
    if (imageList.isEmpty && fallbackUrl != null && fallbackUrl.isNotEmpty) {
      imageList.add(fallbackUrl);
    }

    final isHidden = _isProductHiddenOrDeleted();
    final isOutOfStock = !isHidden && _isProductOutOfStock();
    final overlayText = isHidden ? 'Đã ẩn' : (isOutOfStock ? 'Đã hết' : null);

    final currentIndex = (_selectedImageIndex < imageList.length)
        ? _selectedImageIndex
        : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            AspectRatio(
              aspectRatio: 1.0,
              child: PageView.builder(
                controller: _pageController,
                itemCount: imageList.isNotEmpty ? imageList.length : 1,
                onPageChanged: (idx) {
                  setState(() => _selectedImageIndex = idx);
                },
                itemBuilder: (context, index) {
                  if (imageList.isEmpty) {
                    return Container(
                      color: const Color(0xFFF3F4F6),
                      child: const Center(
                        child: Icon(
                          Icons.image_outlined,
                          size: 70,
                          color: Color(0xFFCBD5E1),
                        ),
                      ),
                    );
                  }
                  final imgUrl = imageList[index];
                  return (imgUrl.isNotEmpty && imgUrl.startsWith('http'))
                      ? Image.network(
                          imgUrl,
                          width: double.infinity,
                          height: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (ctx, err, stack) => Container(
                            color: const Color(0xFFF3F4F6),
                            child: const Center(
                              child: Icon(
                                Icons.image_outlined,
                                size: 70,
                                color: Color(0xFFCBD5E1),
                              ),
                            ),
                          ),
                          loadingBuilder: (ctx, child, progress) {
                            if (progress == null) return child;
                            return Container(
                              color: const Color(0xFFF3F4F6),
                              child: const Center(
                                child: SizedBox(
                                  width: 28,
                                  height: 28,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            );
                          },
                        )
                      : Container(
                          color: const Color(0xFFF3F4F6),
                          child: const Center(
                            child: Icon(
                              Icons.image_outlined,
                              size: 70,
                              color: Color(0xFFCBD5E1),
                            ),
                          ),
                        );
                },
              ),
            ),
            if (overlayText != null)
              Positioned.fill(
                child: Center(
                  child: Container(
                    width: 96,
                    height: 96,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xCC262626),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      overlayText,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ),
            if (imageList.length > 1)
              Positioned(
                bottom: 24,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withAlpha(140),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${currentIndex + 1}/${imageList.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
          ],
        ),
        if (imageList.length > 1) ...[
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: imageList.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final thumbUrl = entry.value;
                  final isSelected = currentIndex == idx;

                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: () {
                        setState(() => _selectedImageIndex = idx);
                        if (_pageController.hasClients) {
                          _pageController.animateToPage(
                            idx,
                            duration: const Duration(milliseconds: 250),
                            curve: Curves.easeInOut,
                          );
                        }
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: 56,
                        height: 56,
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : const Color(0xFFE2E8F0),
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: (thumbUrl.isNotEmpty && thumbUrl.startsWith('http'))
                              ? Image.network(thumbUrl, fit: BoxFit.cover)
                              : const Icon(Icons.image_outlined, size: 24, color: Colors.grey),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ],
    );
  }

  /// Trust Badges Card
  Widget _buildTrustBadgesCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildPolicyItem(
            icon: Icons.local_shipping_outlined,
            title: 'Giao hàng toàn quốc',
            subtitle: 'Đồng giá từ 30.000 đ',
          ),
          Container(height: 28, width: 1, color: Colors.grey.shade300),
          _buildPolicyItem(
            icon: Icons.cached_rounded,
            title: 'Đổi trả dễ dàng',
            subtitle: 'Hỗ trợ trong 7 ngày',
          ),
          Container(height: 28, width: 1, color: Colors.grey.shade300),
          _buildPolicyItem(
            icon: Icons.verified_user_outlined,
            title: 'Hàng chính hãng',
            subtitle: 'Đảm bảo chất lượng',
          ),
        ],
      ),
    );
  }

  Widget _buildPolicyItem({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppColors.primary, size: 20),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2937),
              ),
            ),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 9.5,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// Variant & Quantity Card
  Widget _buildVariantAndQuantityCard(List variants) {
    final currentVariant = variants.isNotEmpty && _selectedVariantIndex < variants.length
        ? (variants[_selectedVariantIndex] as Map<String, dynamic>)
        : null;
    final availableQuantity = (currentVariant?['available_quantity'] as num?)?.toInt() ??
        (currentVariant?['stock'] as num?)?.toInt() ??
        (currentVariant?['inventory_quantity'] as num?)?.toInt();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left: Variants
              Expanded(
                flex: 6,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Phiên bản / Phân loại',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (variants.isEmpty)
                      const Text(
                        'Phiên bản tiêu chuẩn',
                        style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                      )
                    else
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: List.generate(variants.length, (idx) {
                          final v = variants[idx] as Map<String, dynamic>;
                          final vSku = v['sku']?.toString() ?? 'SKU-${idx + 1}';
                          final vPrice = v['price_vnd']?.toString() ?? '';
                          final isSelected = _selectedVariantIndex == idx;

                          return InkWell(
                            onTap: () => setState(() => _selectedVariantIndex = idx),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primaryLight
                                    : Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.primary
                                      : const Color(0xFFE5E7EB),
                                  width: isSelected ? 1.4 : 1,
                                ),
                              ),
                              child: Text(
                                '$vSku ($vPrice ₫)',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.w500,
                                  color: isSelected
                                      ? AppColors.primary
                                      : const Color(0xFF1F2937),
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                  ],
                ),
              ),

              const SizedBox(width: 12),

              // Right: Quantity Stepper
              Expanded(
                flex: 4,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'Số lượng',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        // Minus button
                        InkWell(
                          onTap: _quantity > 1
                              ? () => setState(() => _quantity--)
                              : null,
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            width: 30,
                            height: 30,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.remove,
                              size: 16,
                              color: _quantity > 1
                                  ? const Color(0xFF1F2937)
                                  : Colors.grey.shade400,
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Text(
                            '$_quantity',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        // Plus button
                        InkWell(
                          onTap: () {
                            if (availableQuantity != null && availableQuantity > 0 && _quantity >= availableQuantity) {
                              AppNoticeDialog.show(
                                context,
                                message: 'Chỉ còn lại ' + availableQuantity.toString() + ' sản phẩm cho mặt hàng này',
                              );
                              return;
                            }
                            setState(() => _quantity++);
                          },
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            width: 30,
                            height: 30,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.add,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      availableQuantity != null
                          ? 'Còn $availableQuantity sản phẩm'
                          : 'Sẵn hàng',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Store Profile Card
  Widget _buildStoreProfileCard(String storeName, String storeId) {
    final finalStoreName = _storeData?['name']?.toString() ?? storeName;
    final shippingFee = _storeData?['shipping_fee_vnd'];
    final feeStr = shippingFee != null ? '$shippingFee ₫' : '30.000 ₫';
    final storeLogo = _storeData?['logo_url']?.toString() ??
        _storeData?['avatar_url']?.toString() ??
        (_product?['store'] is Map
            ? (_product!['store']['logo_url']?.toString() ?? _product!['store']['avatar_url']?.toString())
            : null);

    void openShop() {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ShopPage(
            shopId: storeId,
            shopName: finalStoreName,
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Store Avatar / Logo (Clickable)
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: openShop,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.primary.withAlpha(50), width: 1),
                  ),
                  child: ClipOval(
                    child: storeLogo != null && storeLogo.isNotEmpty
                        ? Image.network(
                            storeLogo,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => const Center(
                              child: Icon(Icons.storefront_rounded, color: AppColors.primary, size: 24),
                            ),
                          )
                        : const Center(
                            child: Icon(Icons.storefront_rounded, color: AppColors.primary, size: 24),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Store Name & Info (Clickable)
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: openShop,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              finalStoreName,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1F2937),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 5),
                          const Icon(
                            Icons.verified_rounded,
                            color: AppColors.primary,
                            size: 16,
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Store Xác Thực',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.star_rounded, color: AppColors.star, size: 14),
                          const Text(
                            ' 4.9',
                            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              OutlinedButton(
                onPressed: openShop,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 1),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: const Size(70, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Xem Shop ›', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFF3F4F6)),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.local_shipping_outlined, size: 16, color: Color(0xFF6B7280)),
              const SizedBox(width: 6),
              Text(
                'Phí giao tiêu chuẩn: $feeStr',
                style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Product Specifications / Attributes
  Widget _buildProductSpecsCard(String desc, Map attributes) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(
                Icons.fact_check_outlined,
                color: AppColors.primary,
                size: 18,
              ),
              SizedBox(width: 8),
              Text(
                'Thông tin sản phẩm',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1F2937),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (attributes.isNotEmpty)
            ...attributes.entries.map((e) {
              final keyLabel = _formatAttributeKey(e.key.toString());
              final valLabel = e.value is Map || e.value is List
                  ? jsonEncode(e.value)
                  : e.value.toString();

              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 4,
                      child: Text(
                        keyLabel,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 6,
                      child: Text(
                        valLabel,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            })
          else
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 4),
              child: Text(
                'Sản phẩm chưa có thông số thuộc tính bổ sung.',
                style: TextStyle(fontSize: 12.5, color: Color(0xFF9CA3AF)),
              ),
            ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFF3F4F6)),
          const SizedBox(height: 12),
          const Text(
            'Mô tả chi tiết',
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            desc,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF4B5563),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  String _formatAttributeKey(String key) {
    switch (key.toLowerCase()) {
      case 'care':
        return 'Chăm sóc / Bảo quản';
      case 'color':
        return 'Màu sắc';
      case 'material':
        return 'Chất liệu';
      case 'dimensions':
        return 'Kích thước / Quy cách';
      case 'brand':
        return 'Thương hiệu';
      case 'hang':
        return 'Hãng';
      case 'bảo hành':
      case 'bao hanh':
        return 'Bảo hành';
      case 'origin':
        return 'Xuất xứ';
      case 'weight':
        return 'Trọng lượng';
      default:
        return key.substring(0, 1).toUpperCase() + key.substring(1);
    }
  }

  /// AI Contextual Assistant Banner
  Widget _buildAiAssistantBanner(BuildContext context, Map<String, dynamic> product) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFF6F4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFFD4D4), width: 1),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: const BoxDecoration(
              gradient: AppColors.redGradient,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(Icons.auto_awesome, color: Colors.white, size: 18),
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Không chắc sản phẩm này phù hợp?',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2937),
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Hỏi Chat AI để được tư vấn nhanh chóng!',
                  style: TextStyle(
                    fontSize: 11,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: () => ChatAiModal.show(context, productContext: product),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                gradient: AppColors.redGradient,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.auto_awesome, color: Colors.white, size: 12),
                  SizedBox(width: 3),
                  Text(
                    'Hỏi Chat AI',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: Colors.white, size: 13),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Customer Reviews Section
  Widget _buildCustomerReviewsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Đánh giá sản phẩm',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2937),
              ),
            ),
            const Spacer(),
            Text(
              '(${_reviews.length} đánh giá)',
              style: const TextStyle(color: Color(0xFF6B7280), fontSize: 12),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_reviews.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
            ),
            child: const Center(
              child: Text(
                'Chưa có đánh giá nào cho sản phẩm này.',
                style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
              ),
            ),
          )
        else
          ..._reviews.map((rev) {
            final rating = (rev['rating'] as num?)?.toInt() ?? 5;
            final body = rev['body']?.toString() ?? 'Sản phẩm rất tốt.';
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        radius: 14,
                        backgroundColor: AppColors.primaryLight,
                        child: Icon(Icons.person, size: 16, color: AppColors.primary),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Khách hàng',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      Row(
                        children: List.generate(5, (starIdx) {
                          return Icon(
                            starIdx < rating ? Icons.star_rounded : Icons.star_border_rounded,
                            color: AppColors.star,
                            size: 15,
                          );
                        }),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    body,
                    style: const TextStyle(fontSize: 12.5, color: Color(0xFF1F2937)),
                  ),
                ],
              ),
            );
          }),
      ],
    );
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

  Future<void> _quickAddToCartRelated(Map<String, dynamic> item) async {
    final variants = (item['variants'] as List?) ?? [];
    final productId = item['id']?.toString() ?? '';

    if (variants.length > 1) {
      final images = item['images'] as List?;
      final imageUrl = (images != null && images.isNotEmpty)
          ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
          : (item['image_url']?.toString() ?? item['thumbnail']?.toString());

      await CartVariantModal.show(
        context: context,
        cartItem: {
          'product_id': productId,
          'variant_id': (variants.first as Map)['id']?.toString() ?? '',
          'quantity': 1,
          'image_url': imageUrl,
        },
        initialProduct: item,
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
                message: 'Đã thêm "${item['title'] ?? 'sản phẩm'}" vào giỏ hàng!',
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

    final variantId = variants.isNotEmpty
        ? (variants.first as Map)['id']?.toString() ?? ''
        : 'v-1';

    try {
      final client = ref.read(apiProvider);
      await client.addToCart(
        variantId: variantId,
        productId: productId,
        quantity: 1,
      );
      ref.invalidate(cartItemsProvider);
      ref.invalidate(cartBadgeCountProvider);
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: 'Đã thêm "${item['title'] ?? 'sản phẩm'}" vào giỏ hàng!',
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

  /// Related Products Section
  Widget _buildRelatedProductsSection() {
    if (_relatedProducts.isEmpty) return const SizedBox.shrink();

    final displayItems = _relatedProducts.take(4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: const [
            Icon(
              Icons.auto_awesome,
              color: AppColors.primary,
              size: 16,
            ),
            SizedBox(width: 6),
            Text(
              'Sản phẩm liên quan',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2937),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.58,
          ),
          itemCount: displayItems.length,
          itemBuilder: (context, idx) {
            final item = displayItems[idx];
            final pId = item['id']?.toString() ?? '';
            final pTitle = item['title']?.toString() ?? 'Sản phẩm tương tự';
            final pImages = item['images'] as List?;
            final pImageUrl = (pImages != null && pImages.isNotEmpty)
                ? (pImages[0] is Map ? pImages[0]['image_url']?.toString() : pImages[0]?.toString())
                : (item['image_url']?.toString() ?? item['thumbnail']?.toString());
            final pVariants = item['variants'] as List?;
            int? pPriceInt;
            if (pVariants != null && pVariants.isNotEmpty) {
              for (final v in pVariants) {
                if (v is Map) {
                  final p = v['price_vnd'];
                  int? pNum;
                  if (p is num) pNum = p.toInt();
                  if (p is String) pNum = int.tryParse(p);
                  if (pNum != null && pNum > 0) {
                    if (pPriceInt == null || pNum < pPriceInt) {
                      pPriceInt = pNum;
                    }
                  }
                }
              }
            }
            if (pPriceInt == null) {
              final p = item['price_vnd'] ?? item['min_price_vnd'];
              if (p is num) pPriceInt = p.toInt();
              if (p is String) pPriceInt = int.tryParse(p);
              pPriceInt ??= 100000;
            }

            final pOriginalPriceInt = (pPriceInt * 1.25).round();

            // Rating
            final rawRating = item['rating'] ?? item['rating_average'] ?? item['avg_rating'];
            final pRatingStr = (rawRating is num && rawRating > 0)
                ? rawRating.toStringAsFixed(1)
                : (rawRating is String && (double.tryParse(rawRating) ?? 0) > 0
                    ? double.parse(rawRating).toStringAsFixed(1)
                    : '4.8');

            // Sales
            final rawSold = item['sold'] ?? item['sold_count'] ?? item['monthly_sales'];
            final pSoldStr = (rawSold != null && rawSold.toString().isNotEmpty)
                ? rawSold.toString()
                : '100+';

            return InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ProductDetailPage(
                      productId: pId,
                      initialProduct: item,
                    ),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(12),
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
                    // Image Stack with Discount Badge and Favorite Heart Button
                    Expanded(
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Container(
                              color: Colors.grey.shade100,
                              child: (pImageUrl != null && pImageUrl.isNotEmpty && pImageUrl.startsWith('http'))
                                  ? Image.network(
                                      pImageUrl,
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
                                  final isFav = ref.watch(favoritesProvider).any((f) => f.id == pId);
                                  return GestureDetector(
                                    behavior: HitTestBehavior.opaque,
                                    onTap: () {
                                      ref.read(favoritesProvider.notifier).toggleFavorite(item);
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
                    // Product Details
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 4, 8, 6),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            height: 32,
                            child: Text(
                              pTitle,
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
                                _formatPrice(pPriceInt),
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13.5,
                                ),
                              ),
                              if (pOriginalPriceInt > pPriceInt) ...[
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text(
                                    _formatPrice(pOriginalPriceInt),
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
                                pRatingStr,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '• Đã bán $pSoldStr',
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
                              onPressed: () => _quickAddToCartRelated(item),
                            ),
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  /// Sticky Bottom Action Bar
  Widget _buildBottomActionBar(BuildContext context) {
    final isHidden = _isProductHiddenOrDeleted();
    final isOutOfStock = !isHidden && _isProductOutOfStock();
    final isUnavailable = isHidden || isOutOfStock;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: Color(0xFFE5E7EB), width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              // "Chat ngay" Button
              InkWell(
                onTap: () => ChatAiModal.show(context, productContext: _product),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          const Icon(
                            Icons.chat_outlined,
                            color: AppColors.primary,
                            size: 22,
                          ),
                          if (ref.watch(chatBadgeCountProvider) > 0)
                            Positioned(
                              right: -6,
                              top: -4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.white, width: 1.2),
                                ),
                                constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                                child: Text(
                                  ref.watch(chatBadgeCountProvider) > 99
                                      ? '99+'
                                      : '${ref.watch(chatBadgeCountProvider)}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                    fontWeight: FontWeight.bold,
                                    height: 1.1,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Chat ngay',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // "Thêm vào giỏ" Outlined Stadium Button
              Expanded(
                flex: 5,
                child: SizedBox(
                  height: 44,
                  child: OutlinedButton.icon(
                    onPressed: (_addingToCart || isUnavailable)
                        ? null
                        : () => _addToCart(navigateToCart: false),
                    icon: const Icon(Icons.shopping_cart_outlined, size: 18),
                    label: const Text(
                      'Thêm vào giỏ',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isUnavailable ? const Color(0xFF9CA3AF) : AppColors.primary,
                      side: BorderSide(
                        color: isUnavailable ? const Color(0xFFD1D5DB) : AppColors.primary,
                        width: 1.2,
                      ),
                      backgroundColor: isUnavailable ? const Color(0xFFF3F4F6) : Colors.white,
                      shape: const StadiumBorder(),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // "Mua ngay" Filled Red Stadium Button
              Expanded(
                flex: 5,
                child: SizedBox(
                  height: 44,
                  child: FilledButton(
                    onPressed: (_addingToCart || isUnavailable)
                        ? null
                        : () => _addToCart(navigateToCart: true),
                    style: FilledButton.styleFrom(
                      backgroundColor: isUnavailable ? const Color(0xFFE5E7EB) : AppColors.primary,
                      foregroundColor: isUnavailable ? const Color(0xFF9CA3AF) : Colors.white,
                      shape: const StadiumBorder(),
                      padding: EdgeInsets.zero,
                    ),
                    child: const Text(
                      'Mua ngay',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

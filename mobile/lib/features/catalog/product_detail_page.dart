import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../chat/chat_ai_modal.dart';

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
  List<Map<String, dynamic>> _reviews = [];
  List<Map<String, dynamic>> _relatedProducts = [];
  bool _loading = true;
  String? _error;

  int _selectedImageIndex = 0;
  int _selectedVariantIndex = 0;
  int _quantity = 1;
  bool _addingToCart = false;
  bool _isFavorite = false;

  @override
  void initState() {
    super.initState();
    _product = widget.initialProduct;
    _loadAll();
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

      if (mounted) {
        setState(() {
          _product = results[0] as Map<String, dynamic>;
          _reviews = results[1] as List<Map<String, dynamic>>;
          _relatedProducts = results[2] as List<Map<String, dynamic>>;
          _loading = false;
        });
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

  Future<void> _addToCart({bool navigateToCart = false}) async {
    final variants = (_product?['variants'] as List?) ?? [];
    if (variants.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sản phẩm chưa có phiên bản để mua.')),
      );
      return;
    }

    final selectedVariant =
        variants[_selectedVariantIndex] as Map<String, dynamic>;
    final variantId =
        selectedVariant['id']?.toString() ??
        selectedVariant['sku']?.toString() ??
        '';

    setState(() => _addingToCart = true);
    try {
      final client = ref.read(apiProvider);
      await client.addToCart(
        variantId: variantId,
        productId: widget.productId,
        quantity: _quantity,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã thêm $_quantity sản phẩm vào giỏ hàng!'),
            backgroundColor: Colors.green,
            action: SnackBarAction(
              label: 'Xem giỏ',
              textColor: Colors.white,
              onPressed: () => Navigator.pushNamed(context, '/cart'),
            ),
          ),
        );
        if (navigateToCart) {
          Navigator.pushNamed(context, '/cart');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMessage(e)), backgroundColor: Colors.red),
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
        appBar: AppBar(title: const Text('Chi tiết sản phẩm')),
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (_error != null && _product == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết sản phẩm')),
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
                FilledButton(onPressed: _loadAll, child: const Text('Thử lại')),
              ],
            ),
          ),
        ),
      );
    }

    final product = _product!;
    final title = product['title']?.toString() ?? 'Sản phẩm';
    final desc =
        product['description']?.toString() ?? 'Chưa có mô tả chi tiết.';
    final attributes = (product['attributes'] as Map?) ?? {};
    final variants = (product['variants'] as List?) ?? [];
    final storeName = product['store_name']?.toString() ?? 'TechZone Official';

    Map<String, dynamic>? activeVariant;
    if (variants.isNotEmpty && _selectedVariantIndex < variants.length) {
      activeVariant = variants[_selectedVariantIndex] as Map<String, dynamic>;
    }

    final priceStr = activeVariant != null
        ? activeVariant['price_vnd']?.toString() ?? '100000'
        : (variants.isNotEmpty
              ? variants[0]['price_vnd']?.toString() ?? '100000'
              : '100000');

    final priceInt = int.tryParse(priceStr) ?? 100000;
    final originalPriceInt = (priceInt * 1.35).round();
    final sku = activeVariant?['sku']?.toString() ?? 'SKU-DEFAULT';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, size: 22),
            tooltip: 'Chia sẻ',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Đã sao chép liên kết sản phẩm vào bộ nhớ tạm!'),
                  duration: Duration(seconds: 1),
                ),
              );
            },
          ),
          IconButton(
            icon: Icon(
              _isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              color: _isFavorite ? AppColors.primary : AppColors.textPrimary,
              size: 22,
            ),
            tooltip: 'Yêu thích',
            onPressed: () {
              setState(() => _isFavorite = !_isFavorite);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    _isFavorite
                        ? 'Đã thêm vào danh sách yêu thích!'
                        : 'Đã xóa khỏi danh sách yêu thích.',
                  ),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
          ),
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined, size: 22),
                tooltip: 'Giỏ hàng',
                onPressed: () => Navigator.pushNamed(context, '/cart'),
              ),
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
                  child: const Text(
                    '5',
                    textAlign: TextAlign.center,
                    style: TextStyle(
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
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Hero Image & Gallery Thumbnails (Image 2)
            _buildHeroImageGallery(),

            const SizedBox(height: 16),

            // 2. Product Title & SKU
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Mã SKU: $sku',
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),

            const SizedBox(height: 8),

            // 3. Rating & Sold Summary Row (Image 2)
            Row(
              children: [
                const Icon(Icons.star_rounded, color: AppColors.star, size: 16),
                const SizedBox(width: 3),
                const Text(
                  '4.8',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '|   2,1K đã bán',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    // Scroll or expand reviews
                  },
                  child: Text(
                    '|   ${_reviews.isNotEmpty ? _reviews.length : 356} đánh giá ›',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // 4. Price Row (Image 2)
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  '$priceStr ₫',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '$originalPriceInt ₫',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textMuted,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 5. Trust Badges Row (Image 2)
            _buildTrustBadgesCard(),

            const SizedBox(height: 14),

            // 6. Variant & Quantity Selection in 2 Columns (Image 2)
            _buildVariantAndQuantityCard(variants),

            const SizedBox(height: 14),

            // 7. Store Profile Card (Image 2)
            _buildStoreProfileCard(storeName),

            const SizedBox(height: 14),

            // 8. Product Specifications / Details (Image 2)
            _buildProductSpecsCard(desc, attributes),

            const SizedBox(height: 14),

            // 9. AI Assistant Contextual Banner (Image 2)
            _buildAiAssistantBanner(context, product),

            const SizedBox(height: 14),

            // 10. Related Products (Image 2)
            _buildRelatedProductsSection(),

            const SizedBox(height: 14),

            // 11. Customer Reviews (Image 2)
            _buildCustomerReviewsSection(),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  /// 1. Main Hero Image with Gallery Thumbnails matching Image 2
  Widget _buildHeroImageGallery() {
    final images = (_product?['images'] as List?) ?? [];
    final hasImages = images.isNotEmpty;
    final currentImageUrl = hasImages && _selectedImageIndex < images.length
        ? (images[_selectedImageIndex] is Map
            ? images[_selectedImageIndex]['image_url']?.toString()
            : images[_selectedImageIndex]?.toString())
        : (_product?['image_url']?.toString() ?? _product?['thumbnail']?.toString());

    return Container(
      decoration: AppDecorations.card(radius: 16),
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          // Main Image Container
          Stack(
            children: [
              Container(
                height: 240,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: (currentImageUrl != null && currentImageUrl.isNotEmpty && currentImageUrl.startsWith('http'))
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          currentImageUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (ctx, err, stack) => Center(
                            child: Icon(
                              _selectedImageIndex % 2 == 0
                                  ? Icons.headphones_rounded
                                  : Icons.shopping_bag_outlined,
                              size: 80,
                              color: AppColors.primary.withAlpha(180),
                            ),
                          ),
                        ),
                      )
                    : Center(
                        child: Icon(
                          _selectedImageIndex % 2 == 0
                              ? Icons.headphones_rounded
                              : Icons.shopping_bag_outlined,
                          size: 80,
                          color: AppColors.primary.withAlpha(180),
                        ),
                      ),
              ),
              // Discount Tag Top-Left (-30%)
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    '-30%',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              // Image Counter Bottom-Right (1/6)
              Positioned(
                bottom: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black.withAlpha(140),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${_selectedImageIndex + 1}/${hasImages ? images.length : 6}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // 6 Preview Thumbnails Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(hasImages ? images.length.clamp(1, 6) : 6, (idx) {
              final isSelected = _selectedImageIndex == idx;
              final thumbUrl = hasImages && idx < images.length
                  ? (images[idx] is Map ? images[idx]['image_url']?.toString() : images[idx]?.toString())
                  : null;

              return InkWell(
                onTap: () => setState(() => _selectedImageIndex = idx),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : Colors.grey.shade200,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: (thumbUrl != null && thumbUrl.isNotEmpty && thumbUrl.startsWith('http'))
                        ? Image.network(
                            thumbUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => Icon(
                              idx % 2 == 0 ? Icons.headphones_rounded : Icons.devices_rounded,
                              size: 20,
                              color: isSelected ? AppColors.primary : AppColors.textSecondary,
                            ),
                          )
                        : Icon(
                            idx % 2 == 0 ? Icons.headphones_rounded : Icons.devices_rounded,
                            size: 20,
                            color: isSelected ? AppColors.primary : AppColors.textSecondary,
                          ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  /// 5. Trust Badges Row matching Image 2
  Widget _buildTrustBadgesCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border, width: 0.8),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildPolicyItem(
            icon: Icons.local_shipping_outlined,
            title: 'Miễn phí vận chuyển',
            subtitle: 'Đơn từ 199.000 đ',
          ),
          Container(height: 28, width: 1, color: Colors.grey.shade300),
          _buildPolicyItem(
            icon: Icons.cached_rounded,
            title: 'Đổi trả 7 ngày',
            subtitle: 'Miễn phí đổi trả',
          ),
          Container(height: 28, width: 1, color: Colors.grey.shade300),
          _buildPolicyItem(
            icon: Icons.verified_user_outlined,
            title: 'Bảo hành 12 tháng',
            subtitle: 'Chính hãng 100%',
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
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 9.5,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// 6. Variant & Quantity Selection in 2 Columns matching Image 2
  Widget _buildVariantAndQuantityCard(List variants) {
    return Container(
      decoration: AppDecorations.card(radius: 14),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left Column: Variants
              Expanded(
                flex: 6,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Màu sắc / Phiên bản',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (variants.isEmpty)
                      const Text(
                        'Phiên bản tiêu chuẩn',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
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
                                      : Colors.grey.shade300,
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
                                      : AppColors.textPrimary,
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

              // Right Column: Quantity Stepper (Image 2)
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
                        color: AppColors.textPrimary,
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
                                  ? AppColors.textPrimary
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
                          onTap: () => setState(() => _quantity++),
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
                    const Text(
                      'Còn 24 sản phẩm',
                      style: TextStyle(
                        fontSize: 10.5,
                        color: AppColors.textSecondary,
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

  /// 7. Store Profile Card matching Image 2
  Widget _buildStoreProfileCard(String storeName) {
    return Container(
      decoration: AppDecorations.card(radius: 14),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          // Store Avatar Icon
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(Icons.storefront_rounded, color: Colors.white, size: 24),
            ),
          ),
          const SizedBox(width: 10),
          // Store Name & Ratings
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        storeName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(
                      Icons.check_circle_rounded,
                      color: AppColors.primary,
                      size: 14,
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                const Row(
                  children: [
                    Icon(Icons.star_rounded, color: AppColors.star, size: 14),
                    SizedBox(width: 2),
                    Text(
                      '4.9',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(width: 6),
                    Text(
                      '|  12,5K người theo dõi',
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Actions
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              OutlinedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Đang chuyển đến gian hàng "$storeName"...'),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 1),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: const Size(80, 28),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Xem cửa hàng ›', style: TextStyle(fontSize: 10.5)),
              ),
              const SizedBox(height: 4),
              OutlinedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Đã theo dõi cửa hàng!'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 1),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: const Size(80, 28),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Theo dõi', style: TextStyle(fontSize: 10.5)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 8. Product Specifications Card matching Image 2
  Widget _buildProductSpecsCard(String desc, Map attributes) {
    return Container(
      decoration: AppDecorations.card(radius: 14),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.description_outlined,
                color: AppColors.primary,
                size: 18,
              ),
              const SizedBox(width: 6),
              const Text(
                'Thông tin sản phẩm',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              const Text(
                'Xem thêm ∨',
                style: TextStyle(
                  fontSize: 11.5,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Attributes Table
          if (attributes.isNotEmpty)
            ...attributes.entries.map((e) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      flex: 4,
                      child: Text(
                        '${e.key}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 6,
                      child: Text(
                        '${e.value}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            })
          else ...[
            _buildSpecRow('Kết nối', 'Bluetooth 5.3'),
            _buildSpecRow('Thời lượng pin', '30 giờ'),
            _buildSpecRow('Chống nước', 'IPX4'),
          ],
          const SizedBox(height: 8),
          const Divider(),
          const SizedBox(height: 6),
          // Description Text
          Text(
            desc,
            style: const TextStyle(
              fontSize: 12.5,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecRow(String key, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            flex: 4,
            child: Text(
              key,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            flex: 6,
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 9. Contextual AI Assistant Banner matching Image 2
  Widget _buildAiAssistantBanner(BuildContext context, Map<String, dynamic> product) {
    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.lightPinkGradient,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFFD4D4), width: 1),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          // AI Robot Avatar
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              gradient: AppColors.redGradient,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withAlpha(60),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Center(
              child: Icon(Icons.auto_awesome, color: Colors.white, size: 18),
            ),
          ),
          const SizedBox(width: 10),
          // Title & Hint
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Không chắc sản phẩm này phù hợp?',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Hỏi Chat AI để được tư vấn nhanh chóng!',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          // Action Button
          InkWell(
            onTap: () => ChatAiModal.show(context, productContext: product),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                gradient: AppColors.redGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withAlpha(70),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
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

  /// 10. Related Products Section matching Image 2
  Widget _buildRelatedProductsSection() {
    final list = _relatedProducts.isNotEmpty ? _relatedProducts : null;
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
                color: AppColors.textPrimary,
              ),
            ),
            Spacer(),
            Text(
              'Xem tất cả ›',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        // 2-Column Grid
        Row(
          children: [
            Expanded(
              child: _buildRelatedCard(
                title: list != null && list.isNotEmpty
                    ? (list[0]['title']?.toString() ?? 'Sản phẩm tương tự')
                    : 'Tai nghe Bluetooth pin trâu, âm thanh hay',
                price: list != null && list.isNotEmpty
                    ? (list[0]['price']?.toString() ?? '599.000')
                    : '599.000',
                oldPrice: '799.000',
                discount: '-25%',
                rating: '4.7',
                sold: '1,2K',
                store: list != null && list.isNotEmpty
                    ? (list[0]['store']?['name']?.toString() ?? 'TechZone Store')
                    : 'Audio World',
                productId: list != null && list.isNotEmpty ? list[0]['id']?.toString() : null,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildRelatedCard(
                title: list != null && list.length > 1
                    ? (list[1]['title']?.toString() ?? 'Sản phẩm tương tự')
                    : 'Tai nghe không dây dành cho nữ',
                price: list != null && list.length > 1
                    ? (list[1]['price']?.toString() ?? '449.000')
                    : '449.000',
                oldPrice: '749.000',
                discount: '-40%',
                rating: '4.8',
                sold: '3,6K',
                store: list != null && list.length > 1
                    ? (list[1]['store']?['name']?.toString() ?? 'TechZone Store')
                    : 'Beauty House',
                productId: list != null && list.length > 1 ? list[1]['id']?.toString() : null,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRelatedCard({
    required String title,
    required String price,
    required String oldPrice,
    required String discount,
    required String rating,
    required String sold,
    required String store,
    String? productId,
  }) {
    return InkWell(
      onTap: productId != null
          ? () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ProductDetailPage(productId: productId),
                ),
              )
          : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: AppDecorations.card(radius: 12),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Container(
                  height: 110,
                  color: const Color(0xFFF9FAFB),
                  child: const Center(
                    child: Icon(Icons.headphones_rounded, size: 36, color: Colors.grey),
                  ),
                ),
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: AppDecorations.discountTag,
                    child: Text(
                      discount,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.favorite_border_rounded,
                        size: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '$price ₫',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$oldPrice ₫',
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 9.5,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: AppColors.star, size: 12),
                      Text(
                        ' $rating • $sold',
                        style: const TextStyle(
                          fontSize: 9.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '🏠 $store',
                    style: const TextStyle(
                      fontSize: 9.5,
                      color: AppColors.textMuted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 11. Customer Reviews Section matching Image 2
  Widget _buildCustomerReviewsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Đánh giá từ khách hàng',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const Spacer(),
            Text(
              '(${_reviews.length} đánh giá)',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_reviews.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: AppDecorations.card(radius: 12),
            child: const Center(
              child: Text(
                'Chưa có đánh giá nào cho sản phẩm này.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
              ),
            ),
          )
        else
          ..._reviews.map((rev) {
            final rating = (rev['rating'] as num?)?.toInt() ?? 5;
            final body = rev['body']?.toString() ?? 'Sản phẩm tốt, đóng gói cẩn thận.';
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: AppDecorations.card(radius: 12),
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
                        'Khách hàng ẩn danh',
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
                    style: const TextStyle(fontSize: 12.5, color: AppColors.textPrimary),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  /// Sticky Bottom Action Bar matching Image 2
  Widget _buildBottomActionBar(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(15),
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
              // Chat AI Button
              InkWell(
                onTap: () => ChatAiModal.show(context, productContext: _product),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          gradient: AppColors.redGradient,
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.auto_awesome,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Chat AI',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
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
                    onPressed: _addingToCart
                        ? null
                        : () => _addToCart(navigateToCart: false),
                    icon: const Icon(Icons.shopping_cart_outlined, size: 18),
                    label: const Text(
                      'Thêm vào giỏ',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary, width: 1.2),
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
                    onPressed: _addingToCart
                        ? null
                        : () => _addToCart(navigateToCart: true),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
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

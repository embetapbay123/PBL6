import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
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
    final status = product['status']?.toString() ?? 'ACTIVE';
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

    final sku = activeVariant?['sku']?.toString() ?? 'SKU-DEFAULT';
    final cartCount = ref.watch(cartBadgeCountProvider);

    final revSummary = product['review_summary'] as Map?;
    final revCount = (revSummary?['count'] as num?)?.toInt() ?? _reviews.length;
    final revAvg = (revSummary?['average'] as num?)?.toDouble() ?? 5.0;

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
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Breadcrumb navigation matching Web
            InkWell(
              onTap: () => Navigator.pop(context),
              child: const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.arrow_back_rounded, size: 15, color: Color(0xFF6B7280)),
                    SizedBox(width: 4),
                    Text(
                      'Tất cả sản phẩm',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF6B7280),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 1. Hero Image & Gallery Thumbnails (contain, aspect 1:1, soft grey bg)
            _buildHeroImageGallery(),

            const SizedBox(height: 16),

            // 2. Status Badge ("Đang bán")
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
              decoration: BoxDecoration(
                color: status.toUpperCase() == 'ACTIVE'
                    ? const Color(0xFFECFDF5)
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: status.toUpperCase() == 'ACTIVE'
                      ? const Color(0xFFA7F3D0)
                      : Colors.grey.shade300,
                  width: 0.8,
                ),
              ),
              child: Text(
                status.toUpperCase() == 'ACTIVE'
                    ? 'Đang bán'
                    : (status.isEmpty ? 'Đang bán' : status),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: status.toUpperCase() == 'ACTIVE'
                      ? const Color(0xFF059669)
                      : Colors.grey.shade700,
                ),
              ),
            ),
            const SizedBox(height: 8),

            // 3. Product Title & SKU
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1F2937),
                height: 1.3,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Mã SKU: $sku',
              style: const TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),

            const SizedBox(height: 8),

            // 4. Rating Summary Row
            if (revCount > 0)
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: AppColors.star, size: 16),
                  const SizedBox(width: 3),
                  Text(
                    revAvg.toStringAsFixed(1),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '|   $revCount đánh giá',
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              )
            else
              const Row(
                children: [
                  Icon(Icons.star_border_rounded, color: AppColors.star, size: 16),
                  SizedBox(width: 4),
                  Text(
                    'Chưa có đánh giá',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),

            const SizedBox(height: 12),

            // 5. Price Row (Bold Terracotta)
            Text(
              '$priceStr ₫',
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: AppColors.primary,
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
    );
  }

  /// 1. Hero Image Container & Gallery
  Widget _buildHeroImageGallery() {
    final images = (_product?['images'] as List?) ?? [];
    final hasImages = images.isNotEmpty;
    final currentImageUrl = hasImages && _selectedImageIndex < images.length
        ? (images[_selectedImageIndex] is Map
            ? images[_selectedImageIndex]['image_url']?.toString()
            : images[_selectedImageIndex]?.toString())
        : (_product?['image_url']?.toString() ?? _product?['thumbnail']?.toString());

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Stack(
            children: [
              Container(
                height: 280,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: (currentImageUrl != null && currentImageUrl.isNotEmpty && currentImageUrl.startsWith('http'))
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.network(
                          currentImageUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (ctx, err, stack) => const Center(
                            child: Icon(
                              Icons.image_outlined,
                              size: 70,
                              color: Color(0xFFCBD5E1),
                            ),
                          ),
                          loadingBuilder: (ctx, child, progress) {
                            if (progress == null) return child;
                            return const Center(
                              child: SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primary,
                                ),
                              ),
                            );
                          },
                        ),
                      )
                    : const Center(
                        child: Icon(
                          Icons.image_outlined,
                          size: 70,
                          color: Color(0xFFCBD5E1),
                        ),
                      ),
              ),
              if (images.length > 1)
                Positioned(
                  bottom: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: Colors.black.withAlpha(140),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_selectedImageIndex + 1}/${images.length}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (images.length > 1) ...[
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: images.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final img = entry.value;
                  final isSelected = _selectedImageIndex == idx;
                  final thumbUrl = img is Map ? img['image_url']?.toString() : img?.toString();

                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: () => setState(() => _selectedImageIndex = idx),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        width: 58,
                        height: 58,
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : const Color(0xFFE2E8F0),
                            width: isSelected ? 2 : 1.2,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(7),
                          child: (thumbUrl != null && thumbUrl.isNotEmpty && thumbUrl.startsWith('http'))
                              ? Image.network(thumbUrl, fit: BoxFit.cover)
                              : const Icon(Icons.image_outlined, size: 24, color: Colors.grey),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
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
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primary.withAlpha(50), width: 1),
                ),
                child: const Center(
                  child: Icon(Icons.storefront_rounded, color: AppColors.primary, size: 24),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
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
              OutlinedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ShopPage(
                        shopId: storeId,
                        shopName: finalStoreName,
                      ),
                    ),
                  );
                },
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
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.72,
          ),
          itemCount: displayItems.length,
          itemBuilder: (context, idx) {
            final item = displayItems[idx];
            final pId = item['id']?.toString() ?? '';
            final pTitle = item['title']?.toString() ?? 'Sản phẩm tương tự';
            final pImages = item['images'] as List?;
            final pImageUrl = (pImages != null && pImages.isNotEmpty)
                ? (pImages[0] is Map ? pImages[0]['image_url']?.toString() : pImages[0]?.toString())
                : null;
            final pVariants = item['variants'] as List?;
            final pPriceStr = (pVariants != null && pVariants.isNotEmpty)
                ? pVariants[0]['price_vnd']?.toString() ?? '100000'
                : '100000';

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
                  border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 5,
                      child: Container(
                        color: const Color(0xFFF9FAFB),
                        width: double.infinity,
                        child: (pImageUrl != null && pImageUrl.isNotEmpty && pImageUrl.startsWith('http'))
                            ? Image.network(
                                pImageUrl,
                                fit: BoxFit.contain,
                                errorBuilder: (ctx, err, stack) => const Icon(
                                  Icons.image_outlined,
                                  size: 32,
                                  color: Color(0xFFCBD5E1),
                                ),
                              )
                            : const Icon(
                                Icons.image_outlined,
                                size: 32,
                                color: Color(0xFFCBD5E1),
                              ),
                      ),
                    ),
                    Expanded(
                      flex: 4,
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              pTitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1F2937),
                                height: 1.25,
                              ),
                            ),
                            Text(
                              '$pPriceStr ₫',
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
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
                        decoration: const BoxDecoration(
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

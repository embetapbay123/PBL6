import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/app_theme.dart';
import '../../main.dart';
import '../catalog/product_detail_page.dart';
import '../customer/favorites_page.dart';

/// Reusable "Có thể bạn cũng thích" (Recommendations) section.
/// Displays 10 products by default and loads 10 more as the user scrolls
/// to the bottom until all products on the platform are exhausted.
/// Has NO "Xem tất cả >" button in the header.
class RecommendationsSection extends ConsumerStatefulWidget {
  final ScrollController? scrollController;
  final EdgeInsetsGeometry padding;
  final String title;
  final bool showHeaderBar;

  const RecommendationsSection({
    super.key,
    this.scrollController,
    this.padding = const EdgeInsets.fromLTRB(16, 16, 16, 8),
    this.title = 'Có thể bạn cũng thích',
    this.showHeaderBar = true,
  });

  @override
  ConsumerState<RecommendationsSection> createState() =>
      _RecommendationsSectionState();
}

class _RecommendationsSectionState
    extends ConsumerState<RecommendationsSection> {
  static final String _page1Key = jsonEncode({'page': 1, 'size': 10});

  final List<Map<String, dynamic>> _extraProducts = [];
  int _currentPage = 1;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  ScrollPosition? _scrollPosition;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _attachScrollListener();
  }

  @override
  void didUpdateWidget(covariant RecommendationsSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scrollController != widget.scrollController) {
      _attachScrollListener();
    }
  }

  void _attachScrollListener() {
    final newPosition = widget.scrollController?.hasClients == true
        ? widget.scrollController!.position
        : Scrollable.maybeOf(context)?.position;

    if (newPosition != _scrollPosition) {
      _scrollPosition?.removeListener(_onScroll);
      _scrollPosition = newPosition;
      _scrollPosition?.addListener(_onScroll);
    }
  }

  @override
  void dispose() {
    _scrollPosition?.removeListener(_onScroll);
    super.dispose();
  }

  void _onScroll() {
    final position = widget.scrollController?.hasClients == true
        ? widget.scrollController!.position
        : _scrollPosition;
    if (position == null) return;
    if (position.pixels >= position.maxScrollExtent - 250) {
      _loadNextPage();
    }
  }

  Future<void> _loadNextPage() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);

    final nextPage = _currentPage + 1;
    try {
      final queryStr = jsonEncode({'page': nextPage, 'size': 10});
      final res = await ref.read(catalogProductsProvider(queryStr).future);
      final items = (res['items'] as List?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          [];
      final total = (res['total'] as int?) ??
          (_extraProducts.length + items.length + 10);

      if (mounted) {
        setState(() {
          _currentPage = nextPage;
          final existingIds =
              _extraProducts.map((p) => p['id']?.toString()).toSet();
          for (final item in items) {
            final id = item['id']?.toString();
            if (id == null || !existingIds.contains(id)) {
              _extraProducts.add(item);
              if (id != null) existingIds.add(id);
            }
          }
          _isLoadingMore = false;
          if (items.length < 10 ||
              (_extraProducts.length + 10) >= total) {
            _hasMore = false;
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingMore = false);
      }
    }
  }

  String _formatPrice(int amount) {
    final str = amount.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(str[i]);
    }
    return '${buffer.toString()} đ';
  }

  String _formatSales(dynamic sales) {
    final numVal = (sales is num)
        ? sales.toDouble()
        : double.tryParse(sales?.toString() ?? '') ?? 1200;
    if (numVal >= 1000) {
      final k = (numVal / 1000).toStringAsFixed(1).replaceAll('.', ',');
      return '${k}K';
    }
    return numVal.toInt().toString();
  }

  @override
  Widget build(BuildContext context) {
    final page1Async = ref.watch(catalogProductsProvider(_page1Key));

    return Padding(
      padding: widget.padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: "Có thể bạn cũng thích" (without "Xem tất cả >")
          Row(
            children: [
              if (widget.showHeaderBar) ...[
                Container(
                  width: 4,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Text(
                widget.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          page1Async.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
            error: (_, _) => const SizedBox.shrink(),
            data: (data) {
              final initialItems = (data['items'] as List?)
                      ?.map((e) => Map<String, dynamic>.from(e as Map))
                      .toList() ??
                  [];
              final total = (data['total'] as int?) ?? initialItems.length;

              final displayedProducts = <Map<String, dynamic>>[...initialItems];
              final existingIds =
                  displayedProducts.map((p) => p['id']?.toString()).toSet();
              for (final extra in _extraProducts) {
                final id = extra['id']?.toString();
                if (id == null || !existingIds.contains(id)) {
                  displayedProducts.add(extra);
                  if (id != null) existingIds.add(id);
                }
              }

              if (displayedProducts.isEmpty) {
                return const SizedBox.shrink();
              }

              if (displayedProducts.length >= total) {
                _hasMore = false;
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GridView.builder(
                    padding: EdgeInsets.zero,
                    physics: const NeverScrollableScrollPhysics(),
                    shrinkWrap: true,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.68,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: displayedProducts.length,
                    itemBuilder: (context, idx) {
                      final prod = displayedProducts[idx];
                      return _buildProductCard(context, ref, prod);
                    },
                  ),
                  if (_isLoadingMore)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                  if (!_hasMore && displayedProducts.length > 6)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: Text(
                          'Đã hiển thị tất cả sản phẩm',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade400,
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> product,
  ) {
    final title = product['title']?.toString() ?? 'Sản phẩm';
    final pId = product['id']?.toString() ?? '';
    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images.first as Map)['image_url']?.toString()
        : null;

    final variants = product['variants'] as List?;
    int priceInt = 299000;
    if (variants != null && variants.isNotEmpty) {
      final firstVar = variants.first as Map;
      final p = firstVar['price_vnd'];
      if (p is num) {
        priceInt = p.toInt();
      } else if (p is String) {
        priceInt = int.tryParse(p) ?? 299000;
      }
    } else if (product['price_vnd'] != null) {
      final p = product['price_vnd'];
      if (p is num) {
        priceInt = p.toInt();
      } else if (p is String) {
        priceInt = int.tryParse(p) ?? 299000;
      }
    }

    final originalPriceInt = (priceInt * 1.3).round();
    final sales = product['monthly_sales'] ?? 1200;
    final rating = product['rating'] ?? '4.9';

    return InkWell(
      onTap: () {
        if (pId.isNotEmpty) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ProductDetailPage(productId: pId),
            ),
          );
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200, width: 0.8),
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
            // Image Stack
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                  child: Container(
                    height: 140,
                    width: double.infinity,
                    color: Colors.grey.shade100,
                    child: imageUrl != null && imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, _, _) => const Center(
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
                // Discount Badge (-25%)
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
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
                      final isFav =
                          ref.watch(favoritesProvider).any((f) => f.id == pId);
                      return GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          ref
                              .read(favoritesProvider.notifier)
                              .toggleFavorite(product);
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
                              isFav
                                  ? Icons.favorite_rounded
                                  : Icons.favorite_border_rounded,
                              size: 16,
                              color: isFav
                                  ? const Color(0xFFDC2626)
                                  : const Color(0xFF6B7280),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            // Product Info
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      height: 1.25,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatPrice(priceInt),
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatPrice(originalPriceInt),
                    style: TextStyle(
                      color: Colors.grey.shade400,
                      fontSize: 11,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 12, color: Colors.amber),
                      const SizedBox(width: 3),
                      Text(
                        rating.toString(),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Đã bán ${_formatSales(sales)}',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

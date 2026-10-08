import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';

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

  int _selectedVariantIndex = 0;
  int _quantity = 1;
  bool _addingToCart = false;

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
        body: const Center(child: CircularProgressIndicator()),
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
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 12),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
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

    Map<String, dynamic>? activeVariant;
    if (variants.isNotEmpty && _selectedVariantIndex < variants.length) {
      activeVariant = variants[_selectedVariantIndex] as Map<String, dynamic>;
    }

    final price = activeVariant != null
        ? activeVariant['price_vnd']?.toString() ?? '100000'
        : (variants.isNotEmpty
              ? variants[0]['price_vnd']?.toString() ?? '100000'
              : '100000');

    final sku = activeVariant?['sku']?.toString() ?? 'SKU-DEFAULT';

    return Scaffold(
      appBar: AppBar(
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.shopping_cart_outlined),
            onPressed: () => Navigator.pushNamed(context, '/cart'),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(15),
                blurRadius: 8,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _addingToCart
                      ? null
                      : () => _addToCart(navigateToCart: false),
                  icon: const Icon(Icons.add_shopping_cart),
                  label: const Text('Thêm vào giỏ'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _addingToCart
                      ? null
                      : () => _addToCart(navigateToCart: true),
                  icon: const Icon(Icons.bolt),
                  label: const Text('Mua ngay'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Banner / Hero
            Container(
              height: 220,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.image_outlined, size: 72, color: Colors.grey),
                  SizedBox(height: 8),
                  Text(
                    'Hình ảnh sản phẩm',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Price & Title
            Text(
              '$price ₫',
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: Color(0xff1648a8),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Mã SKU: $sku',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),

            const Divider(height: 32),

            // Variants Selection
            if (variants.isNotEmpty) ...[
              const Text(
                'Chọn phiên bản / Biến thể',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: List.generate(variants.length, (idx) {
                  final v = variants[idx] as Map<String, dynamic>;
                  final vSku = v['sku']?.toString() ?? 'SKU-${idx + 1}';
                  final vPrice = v['price_vnd']?.toString() ?? '';
                  final isSelected = _selectedVariantIndex == idx;

                  return ChoiceChip(
                    label: Text('$vSku ($vPrice ₫)'),
                    selected: isSelected,
                    selectedColor: const Color(0xff1648a8).withAlpha(40),
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _selectedVariantIndex = idx);
                      }
                    },
                  );
                }),
              ),
              const SizedBox(height: 16),
            ],

            // Quantity Counter
            Row(
              children: [
                const Text(
                  'Số lượng:',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton.outlined(
                  icon: const Icon(Icons.remove),
                  onPressed: _quantity > 1
                      ? () => setState(() => _quantity--)
                      : null,
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Text(
                    '$_quantity',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton.outlined(
                  icon: const Icon(Icons.add),
                  onPressed: () => setState(() => _quantity++),
                ),
              ],
            ),

            const Divider(height: 32),

            // Description
            const Text(
              'Mô tả sản phẩm',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              desc,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade800,
                height: 1.4,
              ),
            ),

            // Attributes
            if (attributes.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text(
                'Thông số kỹ thuật',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ...attributes.entries.map((entry) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Row(
                    children: [
                      Text(
                        '${entry.key}: ',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Text('${entry.value}'),
                    ],
                  ),
                );
              }),
            ],

            const Divider(height: 32),

            // Customer Reviews
            Row(
              children: [
                const Text(
                  'Đánh giá từ khách hàng',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Text(
                  '(${_reviews.length} đánh giá)',
                  style: const TextStyle(color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_reviews.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  'Chưa có đánh giá nào cho sản phẩm này.',
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              ..._reviews.map((rev) {
                final rating = (rev['rating'] as num?)?.toInt() ?? 5;
                final body =
                    rev['body']?.toString() ??
                    'Sản phẩm tốt, đóng gói cẩn thận.';
                return Card(
                  elevation: 0,
                  color: Colors.grey.shade50,
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: List.generate(5, (starIdx) {
                            return Icon(
                              starIdx < rating ? Icons.star : Icons.star_border,
                              color: Colors.amber,
                              size: 18,
                            );
                          }),
                        ),
                        const SizedBox(height: 6),
                        Text(body, style: const TextStyle(fontSize: 14)),
                      ],
                    ),
                  ),
                );
              }),

            // Related Products
            if (_relatedProducts.isNotEmpty) ...[
              const Divider(height: 32),
              const Text(
                'Sản phẩm tương tự',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 160,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _relatedProducts.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final item = _relatedProducts[index];
                    final rTitle = item['title']?.toString() ?? '';
                    final rPrice =
                        (item['variants'] as List?)
                            ?.firstOrNull?['price_vnd'] ??
                        '100000';

                    return GestureDetector(
                      onTap: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ProductDetailPage(
                              productId: item['id']?.toString() ?? '',
                              initialProduct: item,
                            ),
                          ),
                        );
                      },
                      child: Container(
                        width: 130,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade200),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              height: 70,
                              color: Colors.grey.shade100,
                              child: const Center(
                                child: Icon(
                                  Icons.shopping_bag_outlined,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              rTitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '$rPrice ₫',
                              style: const TextStyle(
                                color: Color(0xff1648a8),
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

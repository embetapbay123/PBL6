import 'package:flutter_riverpod/flutter_riverpod.dart';

class RecentlyViewedItem {
  final String id;
  final String title;
  final int priceVnd;
  final String priceDisplay;
  final String imageUrl;
  final String storeName;
  final Map<String, dynamic> rawProduct;

  const RecentlyViewedItem({
    required this.id,
    required this.title,
    required this.priceVnd,
    required this.priceDisplay,
    required this.imageUrl,
    this.storeName = 'An Nhiên Studio',
    this.rawProduct = const {},
  });

  factory RecentlyViewedItem.fromProduct(Map<String, dynamic> product) {
    final id = product['id']?.toString() ?? '';
    final title = product['title']?.toString() ?? product['name']?.toString() ?? 'Sản phẩm';
    final storeName = product['store_name']?.toString() ??
        (product['attributes'] is Map ? product['attributes']['brand']?.toString() : null) ??
        'An Nhiên Studio';

    int? lowestPrice;
    final variants = product['variants'] as List?;
    if (variants != null && variants.isNotEmpty) {
      for (final v in variants) {
        if (v is Map) {
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
    }
    if (lowestPrice == null) {
      final p = product['price_vnd'] ?? product['min_price_vnd'];
      if (p is num) lowestPrice = p.toInt();
      if (p is String) lowestPrice = int.tryParse(p);
      lowestPrice ??= 100000;
    }

    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
        : (product['image_url']?.toString() ?? product['thumbnail']?.toString() ?? '');

    return RecentlyViewedItem(
      id: id,
      title: title,
      priceVnd: lowestPrice,
      priceDisplay: _formatPrice(lowestPrice),
      imageUrl: imageUrl ?? '',
      storeName: storeName,
      rawProduct: product,
    );
  }

  static String _formatPrice(int price) {
    final s = price.toString();
    final buffer = StringBuffer();
    int count = 0;
    for (int i = s.length - 1; i >= 0; i--) {
      buffer.write(s[i]);
      count++;
      if (count % 3 == 0 && i > 0) buffer.write('.');
    }
    return buffer.toString().split('').reversed.join('');
  }
}

class RecentlyViewedNotifier extends StateNotifier<List<RecentlyViewedItem>> {
  RecentlyViewedNotifier([List<RecentlyViewedItem>? initial]) : super(initial ?? const []);

  void addProduct(Map<String, dynamic> product) {
    final id = product['id']?.toString() ?? '';
    if (id.isEmpty) return;

    final item = RecentlyViewedItem.fromProduct(product);
    // Remove if already exists so we can bump to the top
    final filtered = state.where((e) => e.id != id).toList();
    // Prepend to the top of the list, keep at most 20
    state = [item, ...filtered].take(20).toList();
  }

  void clear() {
    state = const [];
  }
}

final recentlyViewedProvider =
    StateNotifierProvider<RecentlyViewedNotifier, List<RecentlyViewedItem>>(
  (ref) => RecentlyViewedNotifier(),
);

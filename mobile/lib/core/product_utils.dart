bool isProductOutOfStock(Map<dynamic, dynamic>? p) {
  if (p == null) return false;
  final status = p['status']?.toString().toUpperCase() ?? '';
  final stockStatus = p['stock_status']?.toString().toUpperCase() ?? '';
  if (p['is_out_of_stock'] == true ||
      p['isOutOfStock'] == true ||
      p['out_of_stock'] == true ||
      stockStatus == 'OUT_OF_STOCK' ||
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

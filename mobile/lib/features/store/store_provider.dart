import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';
import 'store_model.dart';

/// Provider for fetching Store Profile details and stats from server
final storeProfileProvider = FutureProvider.family<StoreProfile, (String, String)>(
  (ref, args) async {
    final (storeId, defaultName) = args;
    final client = ref.read(apiProvider);
    try {
      final data = await client.getStore(storeId);
      return StoreProfile.fromJson(data, defaultName: defaultName);
    } catch (_) {
      return StoreProfile(
        id: storeId,
        name: defaultName,
      );
    }
  },
);

/// Provider for fetching Store Products from server
final storeProductsListProvider = FutureProvider.family<List<Map<String, dynamic>>, String>(
  (ref, storeId) async {
    final client = ref.read(apiProvider);
    try {
      final res = await client.getStoreProducts(storeId);
      final items = res['items'] as List?;
      if (items != null && items.isNotEmpty) {
        return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  },
);

/// Provider for fetching Store Vouchers from server
final storeVouchersListProvider = FutureProvider.family<List<StoreVoucherItem>, String>(
  (ref, storeId) async {
    final client = ref.read(apiProvider);
    try {
      final items = await client.getStoreVouchers(storeId);
      if (items.isNotEmpty) {
        return items.map((e) => StoreVoucherItem.fromJson(e)).toList();
      }
    } catch (_) {}
    return const [];
  },
);

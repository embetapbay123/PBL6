import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../cart/cart_page.dart';
import '../catalog/shop_page.dart';
import 'order_detail_page.dart';
import 'order_refund_page.dart';
import '../shared/chat_badge_button.dart';

final customerOrdersProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return await ref.read(apiProvider).listOwnOrders();
});

class OrderListPage extends ConsumerStatefulWidget {
  const OrderListPage({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  ConsumerState<OrderListPage> createState() => _OrderListPageState();
}

class _OrderListPageState extends ConsumerState<OrderListPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isSearching = false;

  final List<Map<String, String>> _tabs = const [
    {'label': 'Tất cả', 'key': 'ALL'},
    {'label': 'Chờ xác nhận', 'key': 'PENDING'},
    {'label': 'Đang xử lý', 'key': 'PROCESSING'},
    {'label': 'Đang giao', 'key': 'SHIPPED'},
    {'label': 'Hoàn thành', 'key': 'COMPLETED'},
    {'label': 'Đã hủy', 'key': 'CANCELLED'},
    {'label': 'Trả hàng/Hoàn tiền', 'key': 'RETURN_REFUND'},
  ];

  @override
  void initState() {
    super.initState();
    final safeIndex = widget.initialIndex.clamp(0, _tabs.length - 1);
    _tabController = TabController(
      length: _tabs.length,
      vsync: this,
      initialIndex: safeIndex,
    );
    _searchController.addListener(() {
      setState(() => _searchQuery = _searchController.text.trim());
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
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

  bool _hasRefund(Map<String, dynamic> order) {
    final status = (order['status']?.toString() ?? '').toUpperCase();
    final refundStatus = (order['refund_status']?.toString() ?? '').toUpperCase();
    return (refundStatus.isNotEmpty && refundStatus != 'NONE') ||
        (order['refunded_vnd'] != null && (order['refunded_vnd'] as num) > 0) ||
        status == 'REFUNDED' ||
        status == 'RETURNED' ||
        status == 'RETURN_REQUESTED' ||
        status == 'REFUND_REQUESTED' ||
        order['refund'] != null ||
        order['is_refund'] == true;
  }

  List<Map<String, dynamic>> _processOrdersWithSplits(
    List<Map<String, dynamic>> orders,
    dynamic apiClient,
  ) {
    final List<Map<String, dynamic>> result = [];

    for (final order in orders) {
      final orderId = (order['id'] ?? '').toString();
      final itemsRaw = (order['items'] as List?) ?? [];
      final items = itemsRaw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();

      final localRefund = apiClient.getLocalRefund(orderId);
      final refundObj = (order['refund'] as Map?) ?? localRefund;

      final refundedQtyByItemId = <String, int>{};
      final refundedItemIds = <String>{};
      if (refundObj != null && refundObj['items'] is List) {
        for (final it in (refundObj['items'] as List)) {
          if (it is Map) {
            final id = (it['order_item_id'] ?? it['id'] ?? it['variant_id'])?.toString();
            final q = (it['quantity'] as num?)?.toInt() ?? 1;
            if (id != null) {
              refundedItemIds.add(id);
              refundedQtyByItemId[id] = (refundedQtyByItemId[id] ?? 0) + q;
            }
            final varId = it['variant_id']?.toString();
            if (varId != null) {
              refundedItemIds.add(varId);
              refundedQtyByItemId[varId] = (refundedQtyByItemId[varId] ?? 0) + q;
            }
          }
        }
      }
      for (int i = 0; i < items.length; i++) {
        final it = items[i];
        final id = (it['id'] ?? 'item_$i').toString();
        final varId = it['variant_id']?.toString();
        if (it['refund_status'] != null ||
            it['is_refunded'] == true ||
            it['is_refund'] == true) {
          final q = (it['refund_quantity'] as num?)?.toInt() ??
              (it['quantity'] as num?)?.toInt() ??
              1;
          refundedItemIds.add(id);
          refundedQtyByItemId[id] ??= q;
          if (varId != null) {
            refundedItemIds.add(varId);
            refundedQtyByItemId[varId] ??= q;
          }
        }
      }

      // Split order if subset of items or partial quantities are refunded:
      final refundedItems = <Map<String, dynamic>>[];
      final remainingItems = <Map<String, dynamic>>[];

      for (int i = 0; i < items.length; i++) {
        final it = items[i];
        final id = (it['id'] ?? 'item_$i').toString();
        final varId = it['variant_id']?.toString();
        final totalQty = (it['quantity'] as num?)?.toInt() ?? 1;

        int? refundedQty;
        if (refundedQtyByItemId.containsKey(id)) {
          refundedQty = refundedQtyByItemId[id];
        } else if (varId != null && refundedQtyByItemId.containsKey(varId)) {
          refundedQty = refundedQtyByItemId[varId];
        } else if (refundedItemIds.contains(id) ||
            (varId != null && refundedItemIds.contains(varId))) {
          refundedQty = totalQty;
        }

        if (refundedQty != null && refundedQty > 0) {
          final clampedRefQty = refundedQty.clamp(1, totalQty);
          final remQty = totalQty - clampedRefQty;

          final refItem = Map<String, dynamic>.from(it);
          refItem['quantity'] = clampedRefQty;
          refundedItems.add(refItem);

          if (remQty > 0) {
            final remItem = Map<String, dynamic>.from(it);
            remItem['quantity'] = remQty;
            remainingItems.add(remItem);
          }
        } else {
          remainingItems.add(it);
        }
      }

      if (refundedItems.isNotEmpty && remainingItems.isNotEmpty) {
        // 1. Don chua cac san pham tra hang/hoan tien dua ve muc Tra hang/Hoan tien
        final refundEntry = Map<String, dynamic>.from(order);
        refundEntry['is_split'] = true;
        refundEntry['items'] = refundedItems;
        refundEntry['is_refund'] = true;
        refundEntry['refund_status'] =
            refundObj?['status'] ?? order['refund_status'] ?? 'REQUESTED';
        refundEntry['status'] = 'REFUND_REQUESTED';

        int refundTotal = 0;
        for (final it in refundedItems) {
          final price = (it['price_vnd'] as num?)?.toInt() ??
              (it['unit_price_vnd'] as num?)?.toInt() ??
              0;
          final qty = (it['quantity'] as num?)?.toInt() ?? 1;
          refundTotal += price * qty;
        }
        if (refundObj != null && refundObj['amount_vnd'] != null) {
          final declared = (refundObj['amount_vnd'] as num).toInt();
          if (declared > 0) {
            refundTotal = declared;
          }
        }

        final existingAmounts = order['amounts'] as Map?;
        refundEntry['amounts'] = {
          ...?existingAmounts,
          'payable_vnd': refundTotal,
        };
        refundEntry['payable_vnd'] = refundTotal;
        refundEntry['refunded_vnd'] = refundTotal;

        // 2. Don chua cac san pham con lai o muc Hoan thanh
        final completedEntry = Map<String, dynamic>.from(order);
        completedEntry['is_split'] = true;
        completedEntry['items'] = remainingItems;
        completedEntry['is_refund'] = false;
        completedEntry['refund_status'] = null;
        completedEntry['status'] = 'COMPLETED';

        int origPayable = 0;
        if (existingAmounts != null && existingAmounts['payable_vnd'] != null) {
          origPayable = (existingAmounts['payable_vnd'] as num).toInt();
        } else if (order['payable_vnd'] != null) {
          origPayable = (order['payable_vnd'] as num).toInt();
        }

        int remainingItemTotal = 0;
        for (final it in remainingItems) {
          final price = (it['price_vnd'] as num?)?.toInt() ??
              (it['unit_price_vnd'] as num?)?.toInt() ??
              0;
          final qty = (it['quantity'] as num?)?.toInt() ?? 1;
          remainingItemTotal += price * qty;
        }

        int completedTotal = (origPayable > refundTotal)
            ? (origPayable - refundTotal)
            : remainingItemTotal;

        completedEntry['amounts'] = {
          ...?existingAmounts,
          'payable_vnd': completedTotal,
        };
        completedEntry['payable_vnd'] = completedTotal;
        completedEntry.remove('refunded_vnd');
        completedEntry.remove('refund');

        result.add(refundEntry);
        result.add(completedEntry);
        continue;
      }

      if (localRefund != null && order['refund'] == null) {
        order['refund'] = localRefund;
        order['is_refund'] = true;
        order['refund_status'] = localRefund['status'] ?? 'REQUESTED';
      }

      result.add(order);
    }

    return result;
  }


  bool _matchesOrder(Map<String, dynamic> order, String filterKey) {
    final status = (order['status']?.toString() ?? '').toUpperCase();
    final hasRefund = _hasRefund(order);

    switch (filterKey) {
      case 'ALL':
        return true;
      case 'PENDING':
        return (status == 'PENDING' || status == 'CREATED') && !hasRefund;
      case 'PROCESSING':
        return (status == 'PROCESSING' || status == 'CONFIRMED') && !hasRefund;
      case 'SHIPPED':
        return status == 'SHIPPED' && !hasRefund;
      case 'COMPLETED':
        return (status == 'COMPLETED' || status == 'DELIVERED') && !hasRefund;
      case 'CANCELLED':
        return status == 'CANCELLED' && !hasRefund;
      case 'RETURN_REFUND':
        return hasRefund;
      default:
        return true;
    }
  }

  String _refundDisplayStatus(Map<String, dynamic> order) {
    final refundStatus = (order['refund_status']?.toString() ?? '').toUpperCase();
    final status = (order['status']?.toString() ?? '').toUpperCase();
    if (['SUCCEEDED', 'COMPLETED', 'REFUNDED', 'RETURNED'].contains(refundStatus) ||
        ['REFUNDED', 'RETURNED'].contains(status)) {
      return 'Đã hoàn tiền';
    }
    return 'Yêu cầu hoàn tiền';
  }

  String _statusDisplay(String status) {
    final upper = status.toUpperCase();
    switch (upper) {
      case 'CREATED':
      case 'PENDING':
        return 'Chờ xác nhận';
      case 'CONFIRMED':
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'SHIPPED':
        return 'Đang giao';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'RETURN_REQUESTED':
      case 'REFUND_REQUESTED':
        return 'Yêu cầu trả hàng';
      case 'RETURNED':
        return 'Đã trả hàng';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  }

  String _refundStatusBadgeText(String refundStatus) {
    final upper = refundStatus.toUpperCase();
    switch (upper) {
      case 'SUCCEEDED':
      case 'COMPLETED':
        return '(Đã hoàn tiền)';
      case 'PROCESSING':
        return '(Đang xử lý)';
      case 'REQUESTED':
      case 'PENDING':
        return '(Yêu cầu hoàn tiền)';
      case 'FAILED':
      case 'REJECTED':
        return '(Hoàn tiền thất bại)';
      default:
        return '()';
    }
  }



  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(customerOrdersProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new,
            size: 18,
            color: AppColors.textPrimary,
          ),
          onPressed: () {
            if (_isSearching) {
              setState(() {
                _isSearching = false;
                _searchController.clear();
              });
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: _isSearching
            ? Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: TextField(
                  controller: _searchController,
                  autofocus: true,
                  style: const TextStyle(
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Tìm theo tên, shop, SKU...',
                    hintStyle: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade400,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              )
            : const Center(
                child: Text(
                  'Đơn hàng của tôi',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
        actions: [
          if (_isSearching)
            IconButton(
              icon: const Icon(Icons.close, color: AppColors.textPrimary),
              tooltip: 'Đóng tìm kiếm',
              onPressed: () {
                setState(() {
                  _isSearching = false;
                  _searchController.clear();
                });
              },
            )
          else
            IconButton(
              icon: const Icon(Icons.search, color: AppColors.textPrimary),
              tooltip: 'Tìm kiếm',
              onPressed: () {
                setState(() => _isSearching = true);
              },
            ),
          const ChatBadgeButton(
            tooltip: 'Trung tâm chat',
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(color: Color(0xFFEFEFEF), width: 1),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              overlayColor: WidgetStateProperty.all(Colors.transparent),
              splashFactory: NoSplash.splashFactory,
              dividerColor: Colors.transparent,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13.5,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 13.5,
              ),
              indicatorColor: AppColors.primary,
              indicatorWeight: 2.5,
              indicatorSize: TabBarIndicatorSize.label,
              tabs: _tabs.map((t) => Tab(text: t['label'])).toList(),
            ),
          ),
        ),
      ),
      body: ordersAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 48,
                  color: AppColors.primary,
                ),
                const SizedBox(height: 12),
                Text(
                  errorMessage(err),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.primary),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                  ),
                  onPressed: () => ref.invalidate(customerOrdersProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final rawItems = (data['items'] as List?) ?? [];
          final allRawOrders = rawItems
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
          final allOrders = _processOrdersWithSplits(allRawOrders, ref.read(apiProvider));

          return TabBarView(
            controller: _tabController,
            children: _tabs.map((tab) {
              final tabKey = tab['key']!;
              var filteredOrders = allOrders
                  .where((o) => _matchesOrder(o, tabKey))
                  .toList();

              if (_searchQuery.isNotEmpty) {
                final q = _searchQuery.toLowerCase();
                filteredOrders = filteredOrders.where((o) {
                  final id = o['id']?.toString().toLowerCase() ?? '';
                  final store = o['store_name']?.toString().toLowerCase() ?? '';
                  final items = (o['items'] as List?) ?? [];
                  final hasMatchingItem = items.any((it) {
                    final t = (it as Map)['product_title']?.toString().toLowerCase() ?? '';
                    final s = it['sku']?.toString().toLowerCase() ?? '';
                    return t.contains(q) || s.contains(q);
                  });
                  return id.contains(q) || store.contains(q) || hasMatchingItem;
                }).toList();
              }

              if (filteredOrders.isEmpty) {
                return _buildEmptyState(tab['label']!);
              }

              return RefreshIndicator(
                color: AppColors.primary,
                onRefresh: () async => ref.invalidate(customerOrdersProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredOrders.length,
                  itemBuilder: (ctx, idx) {
                    final order = filteredOrders[idx];
                    return _buildOrderCard(order);
                  },
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(String tabLabel) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: const BoxDecoration(
                color: AppColors.primarySoft,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.receipt_long_outlined,
                size: 44,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Chưa có đơn hàng nào',
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Bạn chưa có đơn hàng nào ở mục "$tabLabel". Hãy khám phá ngay sản phẩm yêu thích!',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
              ),
              onPressed: () {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/',
                  (route) => false,
                );
              },
              icon: const Icon(Icons.shopping_bag_outlined, size: 18),
              label: const Text(
                'Tiếp tục mua sắm',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final orderId = order['id']?.toString() ?? '';
    final storeId = order['store_id']?.toString() ?? '';
    final shortStoreId = storeId.length > 8 ? storeId.substring(0, 8) : storeId;
    final storeName = order['store_name']?.toString() ?? 'Cửa hàng $shortStoreId';
    final status = order['status']?.toString() ?? 'PENDING';
    final hasRefund = _hasRefund(order);
    final amounts = order['amounts'] as Map?;
    final payableTotal = (amounts?['payable_vnd'] as num?)?.toInt() ?? 0;
    final items = ((order['items'] as List?) ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final isCancellable = status.toUpperCase() == 'CREATED' ||
        status.toUpperCase() == 'PENDING';
    final totalProductQty = items.fold<int>(
      0,
      (sum, it) => sum + ((it['quantity'] as num?)?.toInt() ?? 1),
    );
    final productCount = totalProductQty > 0 ? totalProductQty : items.length;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200, width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(5),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () async {
            final res = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => OrderDetailPage(orderId: orderId, initialOrder: order),
              ),
            );
            if (res == true && mounted) {
              ref.invalidate(customerOrdersProvider);
              final returnRefundIndex = _tabs.indexWhere((t) => t['key'] == 'RETURN_REFUND');
              if (returnRefundIndex != -1) {
                _tabController.animateTo(returnRefundIndex);
              }
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Store Header & Status Pill
                Row(
                  children: [
                    Container(
                      width: 26,
                      height: 26,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.storefront,
                          size: 15,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          if (storeId.isNotEmpty) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ShopPage(shopId: storeId),
                              ),
                            );
                          }
                        },
                        child: Text(
                          storeName,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      hasRefund ? _refundDisplayStatus(order) : _statusDisplay(status),
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const Divider(height: 18, color: Color(0xFFF1F3F5)),

                // Items preview
                if (items.isNotEmpty) ...[
                  ...items.take(2).map((it) {
                    final title = _extractItemTitle(it);
                    final sku = _extractItemSku(it);
                    final qty = (it['quantity'] as num?)?.toInt() ?? 1;
                    final price = (it['price_vnd'] as num?)?.toInt() ??
                        (it['unit_price_vnd'] as num?)?.toInt() ??
                        0;
                    final productId = it['product_id']?.toString() ?? '';
                    final directImg = it['image_url']?.toString() ??
                        (it['product_snapshot'] is Map
                            ? (it['product_snapshot'] as Map)['image_url']?.toString()
                            : null);

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Consumer(
                            builder: (context, ref, _) {
                              final liveImg = ref
                                  .watch(productThumbnailProvider(productId))
                                  .value;
                              final imgUrl = directImg ?? liveImg;
                              return ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  width: 56,
                                  height: 56,
                                  color: Colors.grey.shade100,
                                  child: imgUrl != null && imgUrl.isNotEmpty
                                      ? Image.network(
                                          imgUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (ctx, _, _) =>
                                              const Center(
                                            child: Icon(
                                              Icons.shopping_bag_outlined,
                                              color: Colors.grey,
                                            ),
                                          ),
                                        )
                                      : const Center(
                                          child: Icon(
                                            Icons.shopping_bag_outlined,
                                            color: Colors.grey,
                                          ),
                                        ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                    color: AppColors.textPrimary,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        'Phân loại: $sku',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          color: Colors.grey.shade500,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'x$qty',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey.shade700,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    Text(
                                      _formatPrice(price),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  if (items.length > 2)
                    Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(
                        'Xem thêm ${items.length - 2} sản phẩm khác...',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: Colors.grey.shade500,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                ],

                const Divider(height: 20, color: Color(0xFFF1F3F5)),

                // Total and Action Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      'Thành tiền ($productCount sản phẩm): ',
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      _formatPrice(payableTotal),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Button Actions
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (status.toUpperCase() == 'COMPLETED' && !hasRefund) ...[
                      OutlinedButton(
                        key: const ValueKey('refund_button'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF1F2937),
                          side: const BorderSide(color: Color(0xFF1F2937), width: 1.0),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        onPressed: () async {
                          final res = await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => OrderRefundPage(order: order),
                            ),
                          );
                          if (res == true && mounted) {
                            ref.invalidate(customerOrdersProvider);
                            final returnRefundIndex = _tabs.indexWhere((t) => t['key'] == 'RETURN_REFUND');
                            if (returnRefundIndex != -1) {
                              _tabController.animateTo(returnRefundIndex);
                            }
                          }
                        },
                        child: const Text(
                          'Trả hàng/Hoàn tiền',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1F2937),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        key: const ValueKey('reorder_button'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary, width: 1.2),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        onPressed: () => _handleReorder(order),
                        child: const Text(
                          'Mua lại',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ] else ...[
                      if (isCancellable) ...[
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red, width: 0.8),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          onPressed: () => _showCancelOrderDialog(order),
                          child: const Text(
                            'Hủy đơn',
                            style: TextStyle(fontSize: 12.5),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (hasRefund || status.toUpperCase() == 'CANCELLED') ...[
                        OutlinedButton(
                          key: const ValueKey('reorder_button'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary, width: 1.2),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          onPressed: () => _handleReorder(order),
                          child: const Text(
                            'Mua lại',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => OrderDetailPage(
                                orderId: orderId,
                                initialOrder: order,
                              ),
                            ),
                          );
                        },
                        child: const Text(
                          'Chi tiết',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _showCancelOrderDialog(Map<String, dynamic> order) async {
    final orderId = order['id']?.toString() ?? '';
    final version = (order['version'] as num?)?.toInt() ?? 0;
    String selectedReason = 'Đổi ý, không muốn mua nữa';

    final reasons = [
      'Đổi ý, không muốn mua nữa',
      'Tôi muốn cập nhật địa chỉ / số điện thoại nhận hàng',
      'Tôi muốn thay đổi sản phẩm (màu sắc, kích cỡ, số lượng)',
      'Tôi muốn đổi phương thức thanh toán',
      'Tìm thấy giá tốt hơn ở nơi khác',
    ];

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.cancel_outlined,
                          color: Colors.red,
                          size: 22,
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Lý do hủy đơn hàng',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx, false),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Bạn có chắc chắn muốn hủy đơn hàng này? Thao tác này không thể hoàn tác.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 14),
                    ...reasons.map((r) {
                      final isSelected = r == selectedReason;
                      return InkWell(
                        onTap: () => setModalState(() => selectedReason = r),
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: 8.0,
                            horizontal: 4.0,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isSelected
                                    ? Icons.radio_button_checked
                                    : Icons.radio_button_off,
                                color: isSelected
                                    ? AppColors.primary
                                    : Colors.grey,
                                size: 20,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  r,
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: isSelected
                                        ? FontWeight.w600
                                        : FontWeight.normal,
                                    color: isSelected
                                        ? AppColors.textPrimary
                                        : Colors.grey.shade800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Giữ lại đơn'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.red,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text(
                              'Xác nhận hủy',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (confirmed != true) return;

    try {
      final client = ref.read(apiProvider);
      await client.cancelOwnOrder(
        orderId,
        expectedVersion: version,
        reason: selectedReason,
      );
      ref.invalidate(customerOrdersProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã hủy đơn hàng thành công.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage(e)),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _extractItemTitle(Map<String, dynamic> it) {
    final snapshot = it['product_snapshot'];
    if (snapshot is Map && snapshot['title'] != null) {
      return snapshot['title'].toString();
    }
    if (snapshot is String && snapshot.isNotEmpty) {
      try {
        final decoded = jsonDecode(snapshot);
        if (decoded is Map && decoded['title'] != null) {
          return decoded['title'].toString();
        }
      } catch (_) {}
    }
    final direct = it['product_title'] ?? it['title'] ?? it['name'];
    if (direct != null && direct.toString().trim().isNotEmpty) {
      return direct.toString().trim();
    }
    return 'Sản phẩm';
  }

  Future<void> _handleReorder(Map<String, dynamic> order) async {
    final rawItems = (order['items'] as List?) ?? [];
    final items = rawItems
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    if (items.isEmpty) {
      AppNoticeDialog.show(
        context,
        message: 'Đơn hàng không có sản phẩm để mua lại.',
        buttonText: 'Đóng',
      );
      return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      ),
    );

    final client = ref.read(apiProvider);
    final reorderedVariantIds = <String>{};

    Map<String, dynamic>? currentCart;
    try {
      currentCart = await client.getAllCartItems();
    } catch (_) {
      try {
        currentCart = await client.getCartItems();
      } catch (_) {}
    }
    final existingItems = ((currentCart?['items'] as List?) ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    for (final it in items) {
      final variantId = (it['variant_id'] ?? it['product_variant_id'])?.toString() ?? '';
      final productId = (it['product_id'])?.toString() ?? '';
      final qty = (it['quantity'] as num?)?.toInt() ?? 1;

      // Find if this item already exists in the cart
      Map<String, dynamic>? matchedCartItem;
      for (final cartItem in existingItems) {
        final cVariantId = (cartItem['variant_id'] ?? cartItem['product_variant_id'])?.toString() ?? '';
        final cProductId = cartItem['product_id']?.toString() ?? '';

        if (variantId.isNotEmpty && cVariantId.isNotEmpty && cVariantId == variantId) {
          matchedCartItem = cartItem;
          break;
        }
        if (productId.isNotEmpty && cProductId.isNotEmpty && cProductId == productId) {
          matchedCartItem = cartItem;
          break;
        }
      }

      final targetKey = variantId.isNotEmpty ? variantId : productId;

      if (matchedCartItem != null) {
        final cartItemId = matchedCartItem['id']?.toString() ?? '';
        if (cartItemId.isNotEmpty) {
          try {
            // Adjust quantity to be exactly the order's quantity, no cumulation
            await client.updateCartItem(cartItemId, quantity: qty);
            if (targetKey.isNotEmpty) reorderedVariantIds.add(targetKey);
          } catch (_) {
            try {
              await client.addToCart(
                variantId: variantId,
                productId: productId,
                quantity: qty,
              );
              if (targetKey.isNotEmpty) reorderedVariantIds.add(targetKey);
            } catch (_) {}
          }
        }
      } else {
        try {
          await client.addToCart(
            variantId: variantId,
            productId: productId,
            quantity: qty,
          );
          if (targetKey.isNotEmpty) reorderedVariantIds.add(targetKey);
        } catch (_) {}
      }
    }

    ref.invalidate(cartItemsProvider);
    ref.invalidate(cartBadgeCountProvider);

    if (mounted && Navigator.canPop(context)) {
      Navigator.pop(context);
    }

    if (!mounted) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CartPage(
          initialSelectedVariantIds: reorderedVariantIds,
        ),
      ),
    );
  }

  String _extractItemSku(Map<String, dynamic> it) {
    final sku = it['sku_snapshot'] ?? it['sku'] ?? it['variant_sku'] ?? it['variant_title'];
    if (sku != null && sku.toString().trim().isNotEmpty) {
      return sku.toString().trim();
    }
    return 'Mặc định';
  }
}

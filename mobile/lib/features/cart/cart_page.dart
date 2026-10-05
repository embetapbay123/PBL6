import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';
import '../checkout/checkout_page.dart';

class CartPage extends ConsumerStatefulWidget {
  const CartPage({super.key});

  @override
  ConsumerState<CartPage> createState() => _CartPageState();
}

class _CartPageState extends ConsumerState<CartPage> {
  final Set<String> _selectedItemIds = {};
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final cartAsync = ref.watch(cartItemsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Giỏ hàng của bạn'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới',
            onPressed: () => ref.invalidate(cartItemsProvider),
          ),
        ],
      ),
      body: cartAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 12),
                Text(
                  errorMessage(err),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(cartItemsProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final items =
              (data['items'] as List?)
                  ?.map((e) => Map<String, dynamic>.from(e as Map))
                  .toList() ??
              [];
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.remove_shopping_cart_outlined,
                      size: 72,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Giỏ hàng của bạn đang trống',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Hãy khám phá thêm nhiều sản phẩm hấp dẫn trên PBL6 Marketplace!',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: () => Navigator.pushNamedAndRemoveUntil(
                        context,
                        '/',
                        (route) => false,
                      ),
                      icon: const Icon(Icons.shopping_bag_outlined),
                      label: const Text('Tiếp tục mua sắm'),
                    ),
                  ],
                ),
              ),
            );
          }

          // Group items by store_id
          final Map<String, List<Map<String, dynamic>>> storeGroups = {};
          final Map<String, String> storeNames = {};

          for (final item in items) {
            final storeId = item['store_id']?.toString() ?? 'store-default';
            final storeName =
                item['store_name']?.toString() ?? 'Cửa hàng $storeId';
            storeGroups.putIfAbsent(storeId, () => []).add(item);
            storeNames[storeId] = storeName;
          }

          final allItemIds = items
              .where(_available)
              .map((e) => e['id']?.toString() ?? '')
              .where((id) => id.isNotEmpty)
              .toSet();
          _selectedItemIds.retainAll(allItemIds);
          final isAllSelected =
              allItemIds.isNotEmpty && _selectedItemIds.containsAll(allItemIds);

          // Calculate estimated total of selected items
          int selectedSubtotal = 0;
          for (final item in items) {
            final id = item['id']?.toString() ?? '';
            if (_selectedItemIds.contains(id)) {
              final price =
                  (item['unit_price_vnd'] as num?)?.toInt() ??
                  (item['price_vnd'] as num?)?.toInt() ??
                  0;
              final qty = (item['quantity'] as num?)?.toInt() ?? 1;
              selectedSubtotal += price * qty;
            }
          }

          return Column(
            children: [
              // Select All Bar
              InkWell(
                onTap: _busy
                    ? null
                    : () {
                        setState(() {
                          if (isAllSelected) {
                            _selectedItemIds.clear();
                          } else {
                            _selectedItemIds.addAll(allItemIds);
                          }
                        });
                      },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    border: Border(
                      bottom: BorderSide(color: Colors.grey.shade200),
                    ),
                  ),
                  child: Row(
                    children: [
                      Checkbox(
                        value: isAllSelected,
                        onChanged: _busy
                            ? null
                            : (checked) {
                                setState(() {
                                  if (checked == true) {
                                    _selectedItemIds.addAll(allItemIds);
                                  } else {
                                    _selectedItemIds.clear();
                                  }
                                });
                              },
                      ),
                      const Text(
                        'Chọn tất cả sản phẩm',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const Spacer(),
                      Text(
                        '${_selectedItemIds.length}/${items.length} mục',
                        style: const TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),

              // Grouped Store Items List
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async => ref.invalidate(cartItemsProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: storeGroups.keys.length,
                    itemBuilder: (context, storeIdx) {
                      final storeId = storeGroups.keys.elementAt(storeIdx);
                      final storeItems = storeGroups[storeId]!;
                      final storeName = storeNames[storeId]!;

                      final storeItemIds = storeItems
                          .where(_available)
                          .map((e) => e['id']?.toString() ?? '')
                          .where((id) => id.isNotEmpty)
                          .toSet();
                      final isStoreAllSelected =
                          storeItemIds.isNotEmpty &&
                          _selectedItemIds.containsAll(storeItemIds);

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Colors.grey.shade200),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Store Header
                              Row(
                                children: [
                                  Checkbox(
                                    value: isStoreAllSelected,
                                    onChanged: _busy
                                        ? null
                                        : (checked) {
                                            setState(() {
                                              if (checked == true) {
                                                _selectedItemIds.addAll(
                                                  storeItemIds,
                                                );
                                              } else {
                                                _selectedItemIds.removeAll(
                                                  storeItemIds,
                                                );
                                              }
                                            });
                                          },
                                  ),
                                  const Icon(
                                    Icons.storefront,
                                    size: 20,
                                    color: Color(0xff1648a8),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      storeName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 16),

                              // Store Items
                              ...storeItems.map((item) {
                                final available = _available(item);
                                final itemId = item['id']?.toString() ?? '';
                                final title =
                                    item['title']?.toString() ??
                                    item['product_title']?.toString() ??
                                    'Sản phẩm';
                                final sku =
                                    item['sku']?.toString() ??
                                    item['variant_sku']?.toString() ??
                                    'SKU';
                                final price =
                                    (item['unit_price_vnd'] as num?)?.toInt() ??
                                    (item['price_vnd'] as num?)?.toInt() ??
                                    0;
                                final qty =
                                    (item['quantity'] as num?)?.toInt() ?? 1;
                                final isSelected = _selectedItemIds.contains(
                                  itemId,
                                );

                                return Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 8.0,
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Checkbox(
                                        value: isSelected,
                                        onChanged: _busy || !available
                                            ? null
                                            : (checked) {
                                                setState(() {
                                                  if (checked == true) {
                                                    _selectedItemIds.add(
                                                      itemId,
                                                    );
                                                  } else {
                                                    _selectedItemIds.remove(
                                                      itemId,
                                                    );
                                                  }
                                                });
                                              },
                                      ),
                                      Container(
                                        width: 60,
                                        height: 60,
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade100,
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.shopping_bag_outlined,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              title,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w600,
                                                fontSize: 13,
                                              ),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'Phân loại: $sku',
                                              style: TextStyle(
                                                color: Colors.grey.shade600,
                                                fontSize: 11,
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  available
                                                      ? '$price ₫'
                                                      : 'Chưa có giá',
                                                  style: const TextStyle(
                                                    color: Color(0xff1648a8),
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 14,
                                                  ),
                                                ),
                                                // Quantity Controller
                                                Row(
                                                  children: [
                                                    IconButton(
                                                      icon: const Icon(
                                                        Icons.remove,
                                                        size: 16,
                                                      ),
                                                      padding: EdgeInsets.zero,
                                                      constraints:
                                                          const BoxConstraints(
                                                            minWidth: 28,
                                                            minHeight: 28,
                                                          ),
                                                      onPressed:
                                                          (_busy ||
                                                              !available ||
                                                              qty <= 1)
                                                          ? null
                                                          : () =>
                                                                _updateQuantity(
                                                                  itemId,
                                                                  qty - 1,
                                                                ),
                                                    ),
                                                    Padding(
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 6.0,
                                                          ),
                                                      child: Text(
                                                        '$qty',
                                                        style: const TextStyle(
                                                          fontWeight:
                                                              FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                    IconButton(
                                                      icon: const Icon(
                                                        Icons.add,
                                                        size: 16,
                                                      ),
                                                      padding: EdgeInsets.zero,
                                                      constraints:
                                                          const BoxConstraints(
                                                            minWidth: 28,
                                                            minHeight: 28,
                                                          ),
                                                      onPressed:
                                                          _busy || !available
                                                          ? null
                                                          : () =>
                                                                _updateQuantity(
                                                                  itemId,
                                                                  qty + 1,
                                                                ),
                                                    ),
                                                    IconButton(
                                                      icon: const Icon(
                                                        Icons.delete_outline,
                                                        size: 18,
                                                        color: Colors.red,
                                                      ),
                                                      padding: EdgeInsets.zero,
                                                      constraints:
                                                          const BoxConstraints(
                                                            minWidth: 28,
                                                            minHeight: 28,
                                                          ),
                                                      tooltip: 'Xóa',
                                                      onPressed: _busy
                                                          ? null
                                                          : () => _removeItem(
                                                              itemId,
                                                              title,
                                                            ),
                                                    ),
                                                  ],
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
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              // Bottom Checkout Bar
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(12),
                      blurRadius: 6,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: SafeArea(
                  child: Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'Tổng thanh toán tạm tính:',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          Text(
                            '$selectedSubtotal ₫',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xff1648a8),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      FilledButton.icon(
                        onPressed: _selectedItemIds.isEmpty || _busy
                            ? null
                            : () {
                                final selectedList = items
                                    .where(
                                      (e) => _selectedItemIds.contains(
                                        e['id']?.toString(),
                                      ),
                                    )
                                    .toList();

                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => CheckoutPage(
                                      cartItemIds: _selectedItemIds.toList(),
                                      initialSelectedItems: selectedList,
                                    ),
                                  ),
                                );
                              },
                        icon: const Icon(Icons.shopping_cart_checkout),
                        label: Text('Mua hàng (${_selectedItemIds.length})'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  bool _available(Map<String, dynamic> item) =>
      item['catalog_available'] != false &&
      (item['unit_price_vnd'] is int || item['price_vnd'] is int);

  Future<void> _updateQuantity(String itemId, int newQuantity) async {
    setState(() => _busy = true);
    try {
      final client = ref.read(apiProvider);
      await client.updateCartItem(itemId, quantity: newQuantity);
      ref.invalidate(cartItemsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMessage(e)), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _removeItem(String itemId, String title) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xác nhận xóa'),
        content: Text('Bạn có chắc muốn xóa "$title" khỏi giỏ hàng?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _busy = true);
    try {
      final client = ref.read(apiProvider);
      await client.removeCartItem(itemId);
      _selectedItemIds.remove(itemId);
      ref.invalidate(cartItemsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã xóa sản phẩm khỏi giỏ hàng.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMessage(e)), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

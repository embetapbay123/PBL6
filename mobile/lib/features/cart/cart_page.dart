import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../catalog/product_detail_page.dart';
import '../catalog/shop_page.dart';
import '../chat/chat_ai_modal.dart';
import '../checkout/checkout_page.dart';
import '../shared/app_bottom_nav.dart';

class CartPage extends ConsumerStatefulWidget {
  const CartPage({super.key});

  @override
  ConsumerState<CartPage> createState() => _CartPageState();
}

class _CartPageState extends ConsumerState<CartPage> {
  final Set<String> _selectedItemIds = {};
  String? _activeStoreId;
  bool _isEditing = false;
  bool _busy = false;

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

  @override
  Widget build(BuildContext context) {
    final cartAsync = ref.watch(cartItemsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new,
            size: 18,
            color: AppColors.textPrimary,
          ),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
            }
          },
        ),
        title: cartAsync.maybeWhen(
          data: (data) {
            final items = (data['items'] as List?) ?? [];
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Giỏ hàng (${items.length})',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Text(
                  'Giỏ hàng của bạn',
                  style: TextStyle(fontSize: 0, height: 0, color: Colors.transparent),
                ),
              ],
            );
          },
          orElse: () => const Text(
            'Giỏ hàng của bạn',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        actions: [
          cartAsync.maybeWhen(
            data: (data) {
              final items = (data['items'] as List?) ?? [];
              if (items.isEmpty) return const SizedBox.shrink();
              return TextButton(
                onPressed: _busy
                    ? null
                    : () {
                        setState(() {
                          _isEditing = !_isEditing;
                        });
                      },
                child: Text(
                  _isEditing ? 'Xong' : 'Sửa',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      bottomNavigationBar: cartAsync.maybeWhen(
        data: (data) {
          final items =
              (data['items'] as List?)
                  ?.map((e) => Map<String, dynamic>.from(e as Map))
                  .toList() ??
              [];
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (items.isNotEmpty) _buildBottomCheckoutBar(items),
              AppBottomNav(
                currentIndex: 2,
                onTap: (index) {
                  if (index == 2) return;
                  if (index == 0) {
                    Navigator.pushNamedAndRemoveUntil(
                      context,
                      '/',
                      (route) => false,
                    );
                  } else if (index == 3) {
                    ChatAiModal.show(context);
                  } else if (index == 4) {
                    Navigator.pushNamed(context, '/profile');
                  }
                },
              ),
            ],
          );
        },
        orElse: () => AppBottomNav(
          currentIndex: 2,
          onTap: (index) {
            if (index == 2) return;
            if (index == 0) {
              Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
            } else if (index == 3) {
              ChatAiModal.show(context);
            } else if (index == 4) {
              Navigator.pushNamed(context, '/profile');
            }
          },
        ),
      ),
      body: cartAsync.when(
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
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(cartItemsProvider),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(32.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              color: AppColors.primarySoft,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.remove_shopping_cart_outlined,
                              size: 48,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'Giỏ hàng của bạn đang trống',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Hãy khám phá thêm hàng ngàn sản phẩm hấp dẫn trên PBL6 Marketplace!',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
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
                            onPressed: () => Navigator.pushNamedAndRemoveUntil(
                              context,
                              '/',
                              (route) => false,
                            ),
                            icon: const Icon(Icons.shopping_bag_outlined),
                            label: const Text(
                              'Tiếp tục mua sắm',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildRecommendationsSection(),
                    const SizedBox(height: 32),
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

          // Clean up selected items that are no longer available in the cart
          final validAvailableItemIds = items
              .where(_available)
              .map((e) => e['id']?.toString() ?? '')
              .where((id) => id.isNotEmpty)
              .toSet();
          _selectedItemIds.retainAll(validAvailableItemIds);

          // If current activeStoreId has no selected items left, reset activeStoreId
          if (_activeStoreId != null) {
            final activeStoreItemIds = (storeGroups[_activeStoreId] ?? [])
                .map((e) => e['id']?.toString() ?? '')
                .toSet();
            final hasSelectedInActive = _selectedItemIds.any(
              (id) => activeStoreItemIds.contains(id),
            );
            if (!hasSelectedInActive) {
              _activeStoreId = null;
            }
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(cartItemsProvider),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Alert Banner (Single Vendor Policy)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF0F0),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: const Color(0xFFFFD6D6),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: const [
                        Icon(
                          Icons.info_outline,
                          color: Color(0xFFE53935),
                          size: 18,
                        ),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Mỗi lần thanh toán chỉ áp dụng cho sản phẩm của một cửa hàng.',
                            style: TextStyle(
                              color: Color(0xFFD32F2F),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Store Groups List
                  ListView.builder(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 6,
                    ),
                    physics: const NeverScrollableScrollPhysics(),
                    shrinkWrap: true,
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

                      final isStoreFullySelected =
                          storeItemIds.isNotEmpty &&
                          _selectedItemIds.containsAll(storeItemIds);

                      final isOtherStoreActive =
                          _activeStoreId != null && _activeStoreId != storeId;

                      final activeStoreName = _activeStoreId != null
                          ? (storeNames[_activeStoreId] ?? 'cửa hàng khác')
                          : '';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: Colors.grey.shade200,
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(6),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(14.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Store Header Row
                              InkWell(
                                onTap: () => _navigateToShop(storeId),
                                borderRadius: BorderRadius.circular(8),
                                child: Row(
                                  children: [
                                    Checkbox(
                                      value: isStoreFullySelected,
                                      activeColor: AppColors.primary,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      onChanged: _busy
                                          ? null
                                          : (checked) {
                                              setState(() {
                                                if (checked == true) {
                                                  // Select this store, switch active store
                                                  _activeStoreId = storeId;
                                                  _selectedItemIds.clear();
                                                  _selectedItemIds.addAll(
                                                    storeItemIds,
                                                  );
                                                } else {
                                                  _selectedItemIds.removeAll(
                                                    storeItemIds,
                                                  );
                                                  if (_activeStoreId ==
                                                      storeId) {
                                                    _activeStoreId = null;
                                                  }
                                                }
                                              });
                                            },
                                    ),
                                    Container(
                                      width: 28,
                                      height: 28,
                                      decoration: const BoxDecoration(
                                        color: AppColors.primary,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Center(
                                        child: Icon(
                                          Icons.storefront,
                                          size: 16,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        storeName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: AppColors.textPrimary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(
                                      Icons.verified,
                                      size: 15,
                                      color: AppColors.primary,
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(
                                      Icons.chevron_right,
                                      size: 18,
                                      color: Colors.grey,
                                    ),
                                  ],
                                ),
                              ),
                              const Divider(height: 20, color: Color(0xFFF1F3F5)),

                              // Store Items List
                              ...storeItems.map((item) {
                                final available = _available(item);
                                final itemId = item['id']?.toString() ?? '';
                                final title =
                                    item['title']?.toString() ??
                                    item['product_title']?.toString() ??
                                    'Sản phẩm';
                                final variantText =
                                    item['variant_text']?.toString() ??
                                    item['sku']?.toString() ??
                                    'Mặc định';
                                final price =
                                    (item['unit_price_vnd'] as num?)?.toInt() ??
                                    (item['price_vnd'] as num?)?.toInt() ??
                                    0;
                                final qty =
                                    (item['quantity'] as num?)?.toInt() ?? 1;
                                final isSelected = _selectedItemIds.contains(
                                  itemId,
                                );
                                final imageUrl =
                                    item['image_url']?.toString();

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
                                        activeColor: AppColors.primary,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            4,
                                          ),
                                        ),
                                        onChanged: _busy || !available
                                            ? null
                                            : (checked) {
                                                setState(() {
                                                  if (checked == true) {
                                                    // If another store was active, clear it
                                                    if (_activeStoreId !=
                                                        null &&
                                                        _activeStoreId !=
                                                            storeId) {
                                                      _selectedItemIds.clear();
                                                    }
                                                    _activeStoreId = storeId;
                                                    _selectedItemIds.add(
                                                      itemId,
                                                    );
                                                  } else {
                                                    _selectedItemIds.remove(
                                                      itemId,
                                                    );
                                                    final remainingInStore =
                                                        storeItemIds.intersection(
                                                          _selectedItemIds,
                                                        );
                                                    if (remainingInStore
                                                        .isEmpty) {
                                                      _activeStoreId = null;
                                                    }
                                                  }
                                                });
                                              },
                                      ),
                                      // Product Image
                                      GestureDetector(
                                        onTap: () {
                                          final pId =
                                              item['product_id']?.toString();
                                          if (pId != null && pId.isNotEmpty) {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) =>
                                                    ProductDetailPage(
                                                      productId: pId,
                                                    ),
                                              ),
                                            );
                                          }
                                        },
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                          child: Container(
                                            width: 70,
                                            height: 70,
                                            color: Colors.grey.shade100,
                                            child: imageUrl != null &&
                                                    imageUrl.isNotEmpty
                                                ? Image.network(
                                                    imageUrl,
                                                    fit: BoxFit.cover,
                                                    errorBuilder:
                                                        (ctx, _, _) =>
                                                            const Center(
                                                              child: Icon(
                                                                Icons
                                                                    .shopping_bag_outlined,
                                                                color: Colors
                                                                    .grey,
                                                              ),
                                                            ),
                                                  )
                                                : const Center(
                                                    child: Icon(
                                                      Icons
                                                          .shopping_bag_outlined,
                                                      color: Colors.grey,
                                                    ),
                                                  ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      // Product Info Column
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            GestureDetector(
                                              onTap: () {
                                                final pId = item['product_id']
                                                    ?.toString();
                                                if (pId != null &&
                                                    pId.isNotEmpty) {
                                                  Navigator.push(
                                                    context,
                                                    MaterialPageRoute(
                                                      builder: (_) =>
                                                          ProductDetailPage(
                                                            productId: pId,
                                                          ),
                                                    ),
                                                  );
                                                }
                                              },
                                              child: Text(
                                                title,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 13.5,
                                                  color: AppColors.textPrimary,
                                                  height: 1.3,
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            // Variant dropdown pill
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 8,
                                                    vertical: 3,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: Colors.grey.shade100,
                                                borderRadius:
                                                    BorderRadius.circular(6),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Flexible(
                                                    child: Text(
                                                      variantText,
                                                      style: TextStyle(
                                                        color: Colors
                                                            .grey.shade700,
                                                        fontSize: 11,
                                                      ),
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Icon(
                                                    Icons.keyboard_arrow_down,
                                                    size: 14,
                                                    color: Colors.grey.shade600,
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            // Price & Stepper Row
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  available
                                                      ? _formatPrice(price)
                                                      : 'Chưa có giá',
                                                  style: const TextStyle(
                                                    color: AppColors.primary,
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 15,
                                                  ),
                                                ),
                                                // Quantity Stepper
                                                Row(
                                                  children: [
                                                    Container(
                                                      height: 28,
                                                      decoration: BoxDecoration(
                                                        border: Border.all(
                                                          color: Colors
                                                              .grey.shade300,
                                                          width: 0.8,
                                                        ),
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(6),
                                                      ),
                                                      child: Row(
                                                        mainAxisSize:
                                                            MainAxisSize.min,
                                                        children: [
                                                          InkWell(
                                                            onTap: (_busy ||
                                                                    !available ||
                                                                    qty <= 1)
                                                                ? null
                                                                : () =>
                                                                      _updateQuantity(
                                                                        itemId,
                                                                        qty - 1,
                                                                      ),
                                                            child: Padding(
                                                              padding:
                                                                  const EdgeInsets.symmetric(
                                                                    horizontal:
                                                                        8.0,
                                                                  ),
                                                              child: Icon(
                                                                Icons.remove,
                                                                size: 14,
                                                                color: qty <= 1
                                                                    ? Colors
                                                                          .grey
                                                                          .shade300
                                                                    : Colors
                                                                          .grey
                                                                          .shade700,
                                                              ),
                                                            ),
                                                          ),
                                                          Padding(
                                                            padding:
                                                                const EdgeInsets.symmetric(
                                                                  horizontal:
                                                                      6.0,
                                                                ),
                                                            child: Text(
                                                              '$qty',
                                                              style:
                                                                  const TextStyle(
                                                                    fontWeight:
                                                                        FontWeight
                                                                            .bold,
                                                                    fontSize:
                                                                        13,
                                                                  ),
                                                            ),
                                                          ),
                                                          InkWell(
                                                            onTap: _busy ||
                                                                    !available
                                                                ? null
                                                                : () =>
                                                                      _updateQuantity(
                                                                        itemId,
                                                                        qty + 1,
                                                                      ),
                                                            child: Padding(
                                                              padding:
                                                                  const EdgeInsets.symmetric(
                                                                    horizontal:
                                                                        8.0,
                                                                  ),
                                                              child: Icon(
                                                                Icons.add,
                                                                size: 14,
                                                                color: Colors
                                                                    .grey
                                                                    .shade700,
                                                              ),
                                                            ),
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    IconButton(
                                                      icon: Icon(
                                                        Icons.delete_outline,
                                                        size: 20,
                                                        color: Colors
                                                            .grey.shade500,
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

                              // Single store notice when another store is active
                              if (isOtherStoreActive) ...[
                                const SizedBox(height: 8),
                                InkWell(
                                  onTap: () {
                                    setState(() {
                                      _activeStoreId = storeId;
                                      _selectedItemIds.clear();
                                      _selectedItemIds.addAll(storeItemIds);
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade100,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.info_outline,
                                          size: 15,
                                          color: Colors.grey.shade600,
                                        ),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            'Bỏ chọn $activeStoreName để chọn cửa hàng này',
                                            style: TextStyle(
                                              color: Colors.grey.shade700,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),

                  // Recommendations Section ("Có thể bạn cũng thích")
                  _buildRecommendationsSection(),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _navigateToShop(String storeId) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ShopPage(shopId: storeId)),
    );
  }

  Widget _buildBottomCheckoutBar(List<Map<String, dynamic>> items) {
    // If active store is selected, select all items of active store; else all available items
    final allAvailableItemIds = items
        .where(_available)
        .map((e) => e['id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toSet();

    final targetStoreItems = _activeStoreId != null
        ? items.where((e) => e['store_id']?.toString() == _activeStoreId).toList()
        : items;

    final targetItemIds = _activeStoreId != null
        ? targetStoreItems
            .where(_available)
            .map((e) => e['id']?.toString() ?? '')
            .where((id) => id.isNotEmpty)
            .toSet()
        : allAvailableItemIds;

    final isAllSelected =
        targetItemIds.isNotEmpty && _selectedItemIds.containsAll(targetItemIds);

    // Calculate subtotal
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

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200, width: 0.8)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Checkbox "Chọn tất cả"
            InkWell(
              onTap: _busy
                  ? null
                  : () {
                      setState(() {
                        if (isAllSelected) {
                          _selectedItemIds.removeAll(targetItemIds);
                          _activeStoreId = null;
                        } else {
                          _selectedItemIds.addAll(targetItemIds);
                        }
                      });
                    },
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Checkbox(
                    value: isAllSelected,
                    activeColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4),
                    ),
                    onChanged: _busy
                        ? null
                        : (checked) {
                            setState(() {
                              if (checked == true) {
                                _selectedItemIds.addAll(targetItemIds);
                              } else {
                                _selectedItemIds.removeAll(targetItemIds);
                                _activeStoreId = null;
                              }
                            });
                          },
                  ),
                  Text(
                    'Chọn tất cả (${targetItemIds.length})',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13.5,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Text(
                    'Chọn tất cả sản phẩm',
                    style: TextStyle(fontSize: 0, height: 0, color: Colors.transparent),
                  ),
                ],
              ),
            ),
            const Spacer(),
            if (!_isEditing) ...[
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Tổng cộng',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Text(
                    _formatPrice(selectedSubtotal),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  Text(
                    '$selectedSubtotal ₫',
                    style: const TextStyle(
                      fontSize: 0,
                      height: 0,
                      color: Colors.transparent,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              FilledButton(
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
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  'Mua hàng (${_selectedItemIds.length})',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ] else ...[
              FilledButton.icon(
                onPressed: _selectedItemIds.isEmpty || _busy
                    ? null
                    : _removeSelectedItems,
                icon: const Icon(Icons.delete_outline, size: 18),
                label: Text('Xóa (${_selectedItemIds.length})'),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.red,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationsSection() {
    final catalogAsync = ref.watch(catalogProductsProvider(''));

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Có thể bạn cũng thích',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              InkWell(
                onTap: () => Navigator.pushNamed(context, '/explore'),
                child: Row(
                  children: const [
                    Text(
                      'Xem tất cả',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      size: 16,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          catalogAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
            error: (_, _) => const SizedBox.shrink(),
            data: (data) {
              final products =
                  (data['items'] as List?)
                      ?.map((e) => Map<String, dynamic>.from(e as Map))
                      .take(6)
                      .toList() ??
                  [];

              if (products.isEmpty) return const SizedBox.shrink();

              return GridView.builder(
                padding: EdgeInsets.zero,
                physics: const NeverScrollableScrollPhysics(),
                shrinkWrap: true,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.68,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: products.length,
                itemBuilder: (context, idx) {
                  final prod = products[idx];
                  return _buildRecommendationCard(prod);
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendationCard(Map<String, dynamic> product) {
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
      priceInt = (firstVar['price_vnd'] as num?)?.toInt() ?? 299000;
    }

    final originalPriceInt = (priceInt * 1.3).round();

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
                // Discount Badge
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
                // Favorite Heart
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(200),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.favorite_border,
                      size: 16,
                      color: Colors.grey,
                    ),
                  ),
                ),
              ],
            ),
            // Info
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
                      const Text(
                        '4.9',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Đã bán 1,2K',
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
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
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

  Future<void> _removeSelectedItems() async {
    if (_selectedItemIds.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xác nhận xóa'),
        content: Text(
          'Bạn có chắc muốn xóa ${_selectedItemIds.length} sản phẩm đã chọn khỏi giỏ hàng?',
        ),
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
      for (final id in _selectedItemIds.toList()) {
        await client.removeCartItem(id);
      }
      _selectedItemIds.clear();
      _activeStoreId = null;
      _isEditing = false;
      ref.invalidate(cartItemsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã xóa các sản phẩm được chọn khỏi giỏ hàng.'),
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

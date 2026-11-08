import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../catalog/product_detail_page.dart';
import '../catalog/shop_page.dart';
import '../chat/chat_ai_modal.dart';
import '../checkout/checkout_page.dart';
import '../shared/recommendations_section.dart';
import 'cart_variant_modal.dart';

class CartPage extends ConsumerStatefulWidget {
  final Set<String>? initialSelectedVariantIds;
  const CartPage({super.key, this.initialSelectedVariantIds});

  @override
  ConsumerState<CartPage> createState() => _CartPageState();
}

class _CartPageState extends ConsumerState<CartPage> {
  final Set<String> _selectedItemIds = {};
  String? _pendingSelectVariantId;
  Set<String> _pendingVariantIds = {};
  bool _clearSelectionOnPending = false;
  bool _isEditing = false;
  bool _busy = false;
  final _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  bool _isSearchHovered = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    if (widget.initialSelectedVariantIds != null && widget.initialSelectedVariantIds!.isNotEmpty) {
      _pendingVariantIds = Set<String>.from(widget.initialSelectedVariantIds!);
      _clearSelectionOnPending = true;
    }
    _searchFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _searchFocusNode.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearch(String query) {
    setState(() {
      _searchQuery = query.trim();
    });
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

  Widget _buildSearchBar() {
    final isFocusedOrHovered = _searchFocusNode.hasFocus || _isSearchHovered;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isSearchHovered = true),
        onExit: (_) => setState(() => _isSearchHovered = false),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isFocusedOrHovered ? const Color(0xFFBA3416) : const Color(0xFFD1D5DB),
              width: isFocusedOrHovered ? 1.5 : 1.2,
            ),
            boxShadow: _searchFocusNode.hasFocus
                ? [
                    BoxShadow(
                      color: const Color(0xFFBA3416).withValues(alpha: 0.08),
                      blurRadius: 6,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 14),
                child: Icon(
                  Icons.search,
                  color: isFocusedOrHovered ? const Color(0xFFBA3416) : const Color(0xFF6B7280),
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  focusNode: _searchFocusNode,
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  onChanged: (val) {
                    setState(() => _searchQuery = val.trim());
                  },
                  onSubmitted: _handleSearch,
                  decoration: InputDecoration(
                    hintText: 'Bạn đang tìm sản phẩm gì?',
                    hintStyle: const TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 13.5,
                    ),
                    filled: false,
                    fillColor: Colors.transparent,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    disabledBorder: InputBorder.none,
                    errorBorder: InputBorder.none,
                    focusedErrorBorder: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(
                              Icons.close,
                              size: 16,
                              color: Color(0xFF9CA3AF),
                            ),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                              minWidth: 24,
                              minHeight: 24,
                            ),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(4),
                child: Material(
                  color: const Color(0xFFBA3416),
                  borderRadius: BorderRadius.circular(8),
                  child: Tooltip(
                    message: 'Tìm kiếm',
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => _handleSearch(_searchController.text),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 9,
                        ),
                        child: Icon(
                          Icons.search,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
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
          IconButton(
            icon: const Icon(
              Icons.chat_bubble_outline_rounded,
              color: AppColors.textPrimary,
            ),
            tooltip: 'Chat',
            onPressed: () => ChatAiModal.show(context),
          ),
          const SizedBox(width: 4),
        ],
      ),
      bottomNavigationBar: cartAsync.maybeWhen(
        data: (data) {
          final items =
              (data['items'] as List?)
                  ?.map((e) => Map<String, dynamic>.from(e as Map))
                  .toList() ??
              [];
          if (items.isEmpty) return null;
          return _buildBottomCheckoutBar(items);
        },
        orElse: () => null,
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
                    _buildSearchBar(),
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

          // Filter items by search query inside cart
          final filteredItems = _searchQuery.isEmpty
              ? items
              : items.where((item) {
                  final q = _searchQuery.toLowerCase();
                  final title = (item['title'] ?? item['product_title'] ?? '')
                      .toString()
                      .toLowerCase();
                  final store =
                      (item['store_name'] ?? '').toString().toLowerCase();
                  final sku = (item['sku'] ?? '').toString().toLowerCase();
                  final variant =
                      (item['variant_text'] ?? '').toString().toLowerCase();
                  return title.contains(q) ||
                      store.contains(q) ||
                      sku.contains(q) ||
                      variant.contains(q);
                }).toList();

          // Group items by store_id
          final Map<String, List<Map<String, dynamic>>> storeGroups = {};
          final Map<String, String> storeNames = {};

          for (final item in filteredItems) {
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

          // Restore selection for newly swapped variant item if applicable
          if (_pendingSelectVariantId != null) {
            for (final it in items) {
              if (it['variant_id'] == _pendingSelectVariantId && _available(it)) {
                _selectedItemIds.add(it['id']?.toString() ?? '');
                break;
              }
            }
            _pendingSelectVariantId = null;
          }

          if (_pendingVariantIds.isNotEmpty) {
            if (_clearSelectionOnPending) {
              _selectedItemIds.clear();
              _clearSelectionOnPending = false;
            }
            bool foundAny = false;
            for (final it in items) {
              final vId = (it['variant_id'] ?? it['product_variant_id'])?.toString();
              final pId = it['product_id']?.toString();
              if ((_pendingVariantIds.contains(vId) || _pendingVariantIds.contains(pId)) && _available(it)) {
                final itemId = it['id']?.toString() ?? '';
                if (itemId.isNotEmpty) {
                  _selectedItemIds.add(itemId);
                  foundAny = true;
                }
              }
            }
            if (foundAny || items.isNotEmpty) {
              _pendingVariantIds.clear();
            }
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(cartItemsProvider),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Search Bar (matches web marketplace header)
                  _buildSearchBar(),

                  if (filteredItems.isEmpty && _searchQuery.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 36,
                        horizontal: 24,
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.search_off_rounded,
                              size: 44,
                              color: Colors.grey.shade400,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Không tìm thấy sản phẩm nào trong giỏ hàng phù hợp với "$_searchQuery"',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.grey.shade600,
                                fontSize: 13.5,
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextButton(
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                              child: const Text('Xóa bộ lọc tìm kiếm'),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
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

                      return Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        clipBehavior: Clip.antiAlias,
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
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Store Header Row
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
                              child: InkWell(
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
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 14),
                              child: Divider(height: 20, color: Color(0xFFF1F3F5)),
                            ),

                              // Store Items List (Swipeable full row)
                              ...storeItems.asMap().entries.map((entry) {
                                final index = entry.key;
                                final item = entry.value;
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

                                return Column(
                                  children: [
                                    if (index > 0)
                                      const Padding(
                                        padding: EdgeInsets.symmetric(
                                            horizontal: 14),
                                        child: Divider(
                                            height: 1,
                                            color: Color(0xFFF3F4F6)),
                                      ),
                                    _SwipeableCartItem(
                                      key: ValueKey(itemId),
                                      isBusy: _busy,
                                      onDelete: () =>
                                          _removeItem(itemId, title),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 14.0,
                                          vertical: 10.0,
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
                                            // Variant dropdown pill (clickable modal selector matching Image 1 & 2)
                                            InkWell(
                                              onTap: _busy
                                                  ? null
                                                  : () => _openVariantSelector(item),
                                              borderRadius: BorderRadius.circular(6),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(
                                                  horizontal: 8,
                                                  vertical: 3.5,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFF3F4F6),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Flexible(
                                                      child: Text(
                                                        variantText,
                                                        style: const TextStyle(
                                                          color: Color(0xFF4B5563),
                                                          fontSize: 11,
                                                          fontWeight: FontWeight.w500,
                                                        ),
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                    const SizedBox(width: 4),
                                                    const Icon(
                                                      Icons.keyboard_arrow_down,
                                                      size: 14,
                                                      color: Color(0xFF6B7280),
                                                    ),
                                                  ],
                                                ),
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
                                                                : () {
                                                                    final stock = (item['stock'] as num?)?.toInt() ??
                                                                        (item['available_quantity'] as num?)?.toInt();
                                                                    if (stock != null && stock > 0 && qty >= stock) {
                                                                      AppNoticeDialog.show(
                                                                        context,
                                                                        message: 'Chỉ còn lại $stock sản phẩm cho mặt hàng này',
                                                                      );
                                                                      return;
                                                                    }
                                                                    _updateQuantity(
                                                                      itemId,
                                                                      qty + 1,
                                                                    );
                                                                  },
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
                                                  ],
                                                ),
                                              ],
                                            ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            );
                          }),
                            const SizedBox(height: 6),
                          ],
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
    final activeItems = _searchQuery.isEmpty
        ? items
        : items.where((item) {
            final q = _searchQuery.toLowerCase();
            final title = (item['title'] ?? item['product_title'] ?? '')
                .toString()
                .toLowerCase();
            final store = (item['store_name'] ?? '').toString().toLowerCase();
            final sku = (item['sku'] ?? '').toString().toLowerCase();
            final variant =
                (item['variant_text'] ?? '').toString().toLowerCase();
            return title.contains(q) ||
                store.contains(q) ||
                sku.contains(q) ||
                variant.contains(q);
          }).toList();

    final allAvailableItemIds = activeItems
        .where(_available)
        .map((e) => e['id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toSet();

    final targetItemIds = allAvailableItemIds;

    final isAllSelected =
        targetItemIds.isNotEmpty && _selectedItemIds.containsAll(targetItemIds);

    // Calculate subtotal and selected total quantity
    int selectedSubtotal = 0;
    int selectedTotalQuantity = 0;
    for (final item in items) {
      final id = item['id']?.toString() ?? '';
      if (_selectedItemIds.contains(id)) {
        final price =
            (item['unit_price_vnd'] as num?)?.toInt() ??
            (item['price_vnd'] as num?)?.toInt() ??
            0;
        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
        selectedSubtotal += price * qty;
        selectedTotalQuantity += qty;
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
                  'Mua hàng ($selectedTotalQuantity)',
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
    return const RecommendationsSection();
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
        AppNoticeDialog.show(
          context,
          message: errorMessage(e),
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
        AppNoticeDialog.show(
          context,
          message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
        );
      }
    } catch (e) {
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: errorMessage(e),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _openVariantSelector(Map<String, dynamic> item) {
    CartVariantModal.show(
      context: context,
      cartItem: item,
      onConfirm: (selectedVariant, quantity) => _handleConfirmVariantChange(
        cartItem: item,
        newVariant: selectedVariant,
        newQuantity: quantity,
      ),
    );
  }

  Future<void> _handleConfirmVariantChange({
    required Map<String, dynamic> cartItem,
    required Map<String, dynamic> newVariant,
    required int newQuantity,
  }) async {
    final oldVariantId = cartItem['variant_id']?.toString() ?? '';
    final newVariantId = newVariant['id']?.toString() ?? '';
    final oldCartItemId = cartItem['id']?.toString() ?? '';
    final productId = cartItem['product_id']?.toString() ?? '';

    setState(() => _busy = true);
    try {
      final client = ref.read(apiProvider);
      if (oldVariantId == newVariantId) {
        if (newQuantity != cartItem['quantity']) {
          await client.updateCartItem(oldCartItemId, quantity: newQuantity);
        }
      } else {
        await client.addToCart(
          variantId: newVariantId,
          productId: productId,
          quantity: newQuantity,
        );
        await client.removeCartItem(oldCartItemId);

        if (_selectedItemIds.contains(oldCartItemId)) {
          _selectedItemIds.remove(oldCartItemId);
          _pendingSelectVariantId = newVariantId;
        }
      }

      ref.invalidate(cartItemsProvider);

      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: 'Đã cập nhật phân loại sản phẩm!',
        );
      }
    } catch (e) {
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: errorMessage(e),
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
      _isEditing = false;
      ref.invalidate(cartItemsProvider);
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: 'Đã xóa các sản phẩm được chọn khỏi giỏ hàng.',
        );
      }
    } catch (e) {
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: errorMessage(e),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _SwipeableCartItem extends StatefulWidget {
  final Widget child;
  final VoidCallback onDelete;
  final bool isBusy;

  const _SwipeableCartItem({
    super.key,
    required this.child,
    required this.onDelete,
    this.isBusy = false,
  });

  @override
  State<_SwipeableCartItem> createState() => _SwipeableCartItemState();
}

class _SwipeableCartItemState extends State<_SwipeableCartItem>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  static const double _actionWidth = 80.0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _open() {
    _controller.animateTo(1.0, curve: Curves.easeOut);
  }

  void _close() {
    _controller.animateTo(0.0, curve: Curves.easeOut);
  }

  void _handleDragUpdate(DragUpdateDetails details) {
    if (widget.isBusy) return;
    final delta = details.primaryDelta ?? 0.0;
    final newValue =
        (_controller.value - (delta / _actionWidth)).clamp(0.0, 1.0);
    setState(() {
      _controller.value = newValue;
    });
  }

  void _handleDragEnd(DragEndDetails details) {
    if (widget.isBusy) return;
    final velocity = details.primaryVelocity ?? 0.0;
    if (velocity < -200 || _controller.value > 0.4) {
      _open();
    } else {
      _close();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final offset = -_controller.value * _actionWidth;
        final isOpen = _controller.value > 0.05;

        return Stack(
          children: [
            // Background Delete Action (Red box with "Xóa" text matching design)
            Positioned.fill(
              child: Align(
                alignment: Alignment.centerRight,
                child: SizedBox(
                  width: _actionWidth,
                  child: Material(
                    color: const Color(0xFFEE4D2D),
                    child: InkWell(
                      onTap: widget.isBusy
                          ? null
                          : () {
                              _close();
                              widget.onDelete();
                            },
                      child: const Center(
                        child: Text(
                          'Xóa',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            // Foreground Content
            Transform.translate(
              offset: Offset(offset, 0),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onHorizontalDragUpdate: _handleDragUpdate,
                onHorizontalDragEnd: _handleDragEnd,
                onTap: isOpen ? _close : null,
                child: Container(
                  color: Colors.white,
                  child: widget.child,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

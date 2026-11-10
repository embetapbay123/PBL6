import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import 'order_success_page.dart';
import 'order_terms_page.dart';
import 'voucher_selection_page.dart';

class CheckoutPage extends ConsumerStatefulWidget {
  const CheckoutPage({
    super.key,
    required this.cartItemIds,
    this.initialSelectedItems,
  });

  final List<String> cartItemIds;
  final List<Map<String, dynamic>>? initialSelectedItems;

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  List<Map<String, dynamic>> _addresses = [];
  Map<String, dynamic>? _selectedAddress;
  bool _loadingAddresses = true;
  String? _addressError;

  // Payment methods per store: storeId -> "COD" | "SANDBOX"
  final Map<String, String> _paymentMethods = {};

  // Voucher codes per store: storeId -> code
  final Map<String, String> _storeVouchers = {};
  final Map<String, TextEditingController> _storeVoucherControllers = {};

  // Platform voucher
  final _platformVoucherController = TextEditingController();
  String? _appliedPlatformVoucher;

  // Order notes per store
  final Map<String, TextEditingController> _storeNoteControllers = {};

  TextEditingController _getStoreNoteController(String storeId) {
    return _storeNoteControllers.putIfAbsent(storeId, () => TextEditingController());
  }

  // Terms and conditions
  bool _agreedTerms = true;

  // Suggested Vouchers State
  List<Map<String, dynamic>> _suggestedVouchers = [];
  bool _loadingVouchers = false;

  // Quote State
  Map<String, dynamic>? _quote;
  bool _loadingQuote = false;
  int _quoteRequest = 0;
  String? _quoteError;
  String? _warningMessage;

  // Expiry Timer
  Timer? _quoteTimer;
  int _secondsLeft = 0;

  // Order Submission
  String? _checkoutKey;
  bool _submittingOrder = false;

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

  String _formatVoucherDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '31/12/2027';
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return '31/12/2027';
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final year = dt.year.toString();
    return '$hour:$minute $day/$month/$year';
  }

  Future<void> _fetchSuggestedVouchers() async {
    setState(() => _loadingVouchers = true);
    try {
      final client = ref.read(apiProvider);
      final storeIds = widget.initialSelectedItems
          ?.map((e) => e['store_id']?.toString() ?? '')
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      final res = await client.suggestVouchers(
        cartItemIds: widget.cartItemIds,
        addressId: _selectedAddress?['id']?.toString() ?? '',
        paymentMethods: Map<String, String>.from(_paymentMethods),
        platformVoucherCode: _appliedPlatformVoucher,
        storeVouchers: Map<String, String>.from(_storeVouchers),
        storeIds: storeIds,
      );
      final items = (res['items'] as List?)
          ?.map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      if (mounted) {
        setState(() {
          _suggestedVouchers = items ?? [];
          _loadingVouchers = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _suggestedVouchers = [];
          _loadingVouchers = false;
        });
      }
    }
  }

  void _toggleVoucher(Map<String, dynamic> vItem) {
    if (_submittingOrder) return;
    final v = vItem['voucher'] as Map<String, dynamic>? ?? {};
    final code = v['code']?.toString() ?? '';
    final scope = (v['scope']?.toString() ?? 'PLATFORM').toUpperCase();
    final isPlatform = scope == 'PLATFORM';
    final storeId = v['store_id']?.toString() ??
        widget.initialSelectedItems?.firstOrNull?['store_id']?.toString() ??
        '';

    setState(() {
      if (isPlatform) {
        if (_appliedPlatformVoucher == code) {
          _appliedPlatformVoucher = null;
          _platformVoucherController.clear();
        } else {
          _appliedPlatformVoucher = code;
          _platformVoucherController.text = code;
        }
      } else {
        if (_storeVouchers[storeId] == code) {
          _storeVouchers.remove(storeId);
          _storeVoucherControllers[storeId]?.clear();
        } else {
          _storeVouchers[storeId] = code;
          _storeVoucherControllers[storeId]?.text = code;
        }
      }
    });

    _fetchQuote();
    _fetchSuggestedVouchers();
  }

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  @override
  void dispose() {
    _quoteTimer?.cancel();
    _platformVoucherController.dispose();
    for (final c in _storeNoteControllers.values) {
      c.dispose();
    }
    for (final c in _storeVoucherControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadAddresses() async {
    setState(() {
      _loadingAddresses = true;
      _addressError = null;
    });
    try {
      final client = ref.read(apiProvider);
      final list = await client.getAddresses();
      if (mounted) {
        setState(() {
          _addresses = list;
          if (_addresses.isNotEmpty) {
            _selectedAddress = _addresses.firstWhere(
              (a) => a['is_default'] == true,
              orElse: () => _addresses.first,
            );
          }
          _loadingAddresses = false;
        });

        // Initialize default payment methods for stores
        final items = widget.initialSelectedItems ?? [];
        for (final item in items) {
          final sId = item['store_id']?.toString() ?? 'default-store';
          _paymentMethods.putIfAbsent(sId, () => 'COD');
          _storeVoucherControllers.putIfAbsent(
            sId,
            () => TextEditingController(),
          );
        }

        if (_selectedAddress != null) {
          _fetchQuote();
          _fetchSuggestedVouchers();
        }
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _loadingAddresses = false;
          _addressError = errorMessage(error);
        });
      }
    }
  }

  void _startTimer(DateTime expiresAt) {
    _quoteTimer?.cancel();
    final remaining = expiresAt.difference(DateTime.now()).inSeconds;
    setState(() {
      _secondsLeft = remaining > 0 ? remaining : 0;
    });

    _quoteTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsLeft > 1) {
        setState(() => _secondsLeft--);
      } else {
        setState(() {
          _secondsLeft = 0;
          _quoteError =
              'Báo giá đã hết hạn. Vui lòng bấm "Cập nhật báo giá" để tính lại.';
        });
        timer.cancel();
      }
    });
  }

  Future<void> _fetchQuote() async {
    if (_submittingOrder) return;
    final request = ++_quoteRequest;
    _quoteTimer?.cancel();
    _secondsLeft = 0;
    _checkoutKey = null;
    _quote = null;
    if (_selectedAddress == null) return;
    final addressId = _selectedAddress!['id']?.toString() ?? '';

    setState(() {
      _loadingQuote = true;
      _quoteError = null;
      _warningMessage = null;
    });

    try {
      final client = ref.read(apiProvider);
      final res = await client.quoteCheckout(
        cartItemIds: widget.cartItemIds,
        addressId: addressId,
        paymentMethods: Map<String, String>.from(_paymentMethods),
        storeVouchers: Map<String, String>.from(_storeVouchers),
        platformVoucherCode: _appliedPlatformVoucher,
      );

      if (!mounted || request != _quoteRequest) return;
      final expiresAt = DateTime.tryParse(res['expires_at']?.toString() ?? '');
      final amount = res['payable_total_vnd'];
      if (expiresAt == null ||
          !expiresAt.isAfter(DateTime.now()) ||
          res['quote_id'] is! String ||
          (res['quote_id'] as String).isEmpty ||
          amount is! int ||
          amount < 0 ||
          amount > 9007199254740991) {
        throw const FormatException(
          'Báo giá thiếu dữ liệu hợp lệ hoặc đã hết hạn.',
        );
      }
      setState(() {
        _quote = res;
        _loadingQuote = false;
      });
      _startTimer(expiresAt);
    } catch (e) {
      if (mounted && request == _quoteRequest) {
        final errText = errorMessage(e);
        setState(() {
          _loadingQuote = false;
          if (errText.contains('PRICE_CHANGED') || errText.contains('giá')) {
            _warningMessage =
                'Giá hoặc tồn kho sản phẩm vừa có thay đổi. Vui lòng kiểm tra lại trước khi chốt đơn!';
          }
          if (errText.contains('VOUCHER') || errText.contains('voucher') || errText.contains('không tồn tại')) {
            _appliedPlatformVoucher = null;
            _platformVoucherController.clear();
            _storeVouchers.clear();
          }
          _quoteError = errText;
        });
      }
    }
  }

  String _generateIdempotencyKey() {
    final rand = Random().nextInt(999999);
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'idem-$timestamp-$rand';
  }

  Future<void> _confirmOrder() async {
    if (_submittingOrder || _loadingQuote || _secondsLeft <= 0 || !_agreedTerms) {
      return;
    }
    if (_selectedAddress == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn địa chỉ giao hàng.')),
      );
      return;
    }

    if (_quote == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Chưa có báo giá hợp lệ. Vui lòng tính lại báo giá.'),
        ),
      );
      return;
    }

    final quoteId = _quote!['quote_id']?.toString() ?? '';
    final expectedTotal = (_quote!['payable_total_vnd'] as num?)?.toInt() ?? 0;
    final addressId = _selectedAddress!['id']?.toString() ?? '';
    final idempotencyKey = _checkoutKey ??= _generateIdempotencyKey();

    setState(() => _submittingOrder = true);
    var refreshQuote = false;

    try {
      final client = ref.read(apiProvider);
      final result = await client.confirmCheckout(
        cartItemIds: widget.cartItemIds,
        addressId: addressId,
        paymentMethods: Map<String, String>.from(_paymentMethods),
        storeVouchers: Map<String, String>.from(_storeVouchers),
        platformVoucherCode: _appliedPlatformVoucher,
        quoteId: quoteId,
        expectedPayableTotalVnd: expectedTotal,
        idempotencyKey: idempotencyKey,
      );

      // Invalidate cart to clear ordered items
      ref.invalidate(cartItemsProvider);

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => OrderSuccessPage(orderBatch: result),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        final errText = errorMessage(e);
        if (errText.contains('PRICE_CHANGED') ||
            errText.contains('QUOTE_EXPIRED') ||
            errText.contains('409')) {
          setState(() {
            _warningMessage =
                'Báo giá hoặc giá sản phẩm đã biến động. Đang tự động cập nhật báo giá mới...';
          });
          refreshQuote = true;
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(errText), backgroundColor: Colors.red),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() => _submittingOrder = false);
        if (refreshQuote) await _fetchQuote();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final initialItems = [
      ...?widget.initialSelectedItems,
      ...((ref.read(cartItemsProvider).valueOrNull?['items'] as List?)
              ?.whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e)) ??
          []),
    ];

    Map<String, dynamic>? findMatch(Map<String, dynamic> itemMap, int index) {
      final cartItemId =
          (itemMap['cart_item_id'] ?? itemMap['id'])?.toString();
      final sku = (itemMap['sku'] ?? itemMap['variant_sku'])?.toString();
      final variantId = itemMap['variant_id']?.toString();
      final productId = itemMap['product_id']?.toString();
      final title = (itemMap['title'] ?? itemMap['product_title'])?.toString();

      for (final init in initialItems) {
        if (cartItemId != null &&
            (init['id']?.toString() == cartItemId ||
                init['cart_item_id']?.toString() == cartItemId)) {
          return init;
        }
        if (sku != null &&
            (init['sku']?.toString() == sku ||
                init['variant_sku']?.toString() == sku)) {
          return init;
        }
        if (variantId != null && init['variant_id']?.toString() == variantId) {
          return init;
        }
        if (productId != null && init['product_id']?.toString() == productId) {
          return init;
        }
        if (title != null &&
            (init['title']?.toString() == title ||
                init['product_title']?.toString() == title)) {
          return init;
        }
      }
      if (index < initialItems.length) {
        return initialItems[index];
      }
      return null;
    }

    var itemIdx = 0;
    final items = _quote == null
        ? (widget.initialSelectedItems ?? [])
        : (_quote!['stores'] as List)
              .expand(
                (store) => (store['items'] as List? ?? []).map(
                  (item) {
                    final itemMap = Map<String, dynamic>.from(item as Map);
                    final match = findMatch(itemMap, itemIdx++);
                    return {
                      if (match != null) ...match,
                      ...itemMap,
                      'store_id': store['store_id'],
                      if (itemMap['image_url'] == null &&
                          match?['image_url'] != null)
                        'image_url': match!['image_url'],
                      if (itemMap['title'] == null && match?['title'] != null)
                        'title': match!['title'],
                      if (itemMap['variant_text'] == null &&
                          match?['variant_text'] != null)
                        'variant_text': match!['variant_text'],
                    };
                  },
                ),
              )
              .toList();

    // Retain display names, but use server quote prices and quantities.
    final initialStoreNames = {
      for (final item in widget.initialSelectedItems ?? <Map<String, dynamic>>[])
        item['store_id']?.toString() ?? '': item['store_name']?.toString() ?? '',
    };

    // Group items by store_id
    final Map<String, List<Map<String, dynamic>>> storeGroups = {};
    final Map<String, String> storeNames = {};

    for (final item in items) {
      final storeId = item['store_id']?.toString() ?? 'store-default';
      final storeName =
          item['store_name']?.toString() ??
          initialStoreNames[storeId] ??
          'Cửa hàng $storeId';
      storeGroups.putIfAbsent(storeId, () => []).add(item);
      storeNames[storeId] = storeName;
    }

    final payableTotal = (_quote?['payable_total_vnd'] as num?)?.toInt() ?? 0;
    final firstStoreName = storeNames.values.isNotEmpty
        ? storeNames.values.first
        : 'TechZone Official';

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
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Text(
              'Xác nhận đơn hàng',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              'Xác nhận & Báo giá đơn hàng',
              style: TextStyle(fontSize: 0, height: 0, color: Colors.transparent),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: Colors.grey.shade200, width: 0.8),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(10),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
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
                    _loadingQuote ? 'Đang tính...' : _formatPrice(payableTotal),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  if (!_loadingQuote)
                    Text(
                      '$payableTotal ₫',
                      style: const TextStyle(fontSize: 0, height: 0, color: Colors.transparent),
                    ),
                ],
              ),
              const Spacer(),
              FilledButton(
                onPressed:
                    (_submittingOrder ||
                        _loadingQuote ||
                        _quote == null ||
                        _secondsLeft <= 0 ||
                        !_agreedTerms)
                    ? null
                    : _confirmOrder,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 36,
                    vertical: 14,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: _submittingOrder
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Đặt hàng',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
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
            // Warning Alert
            if (_warningMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.warning_amber_rounded,
                      color: Colors.amber,
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _warningMessage!,
                        style: const TextStyle(
                          color: Colors.black87,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Shipping Address Card (Matching Image 4)
            _buildAddressCard(),

            const SizedBox(height: 14),

            // Store Items Cards (Matching Image 4)
            ...storeGroups.keys.map((sId) {
              final sItems = storeGroups[sId]!;
              final sName = storeNames[sId]!;

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
                child: Padding(
                  padding: const EdgeInsets.all(14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Store Header
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
                          Text(
                            sName,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.verified,
                            size: 15,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                      const Divider(height: 20, color: Color(0xFFF1F3F5)),

                      // Items list in this store
                      ...sItems.map((item) {
                        final title =
                            item['title']?.toString() ??
                            item['product_title']?.toString() ??
                            'Sản phẩm';
                        final variantText =
                            item['variant_text']?.toString() ??
                            item['sku']?.toString() ??
                            item['variant_sku']?.toString() ??
                            'Mặc định';
                        final price =
                            (item['unit_price_vnd'] as num?)?.toInt() ??
                            (item['price_vnd'] as num?)?.toInt();
                        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
                        final imageUrl = item['image_url']?.toString() ??
                            (item['images'] is List &&
                                    (item['images'] as List).isNotEmpty
                                ? ((item['images'] as List).first is Map
                                    ? (item['images'] as List).first['image_url']?.toString()
                                    : (item['images'] as List).first.toString())
                                : null) ??
                            item['thumbnail']?.toString();

                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Product Thumbnail
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  width: 60,
                                  height: 60,
                                  color: Colors.grey.shade100,
                                  child: imageUrl != null && imageUrl.isNotEmpty
                                      ? Image.network(
                                          imageUrl,
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
                              ),
                              const SizedBox(width: 12),
                              // Title & Variant
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                              fontSize: 13,
                                              color: AppColors.textPrimary,
                                              height: 1.25,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          'x$qty',
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      variantText.startsWith('Màu') ||
                                              variantText.startsWith('Size')
                                          ? variantText
                                          : 'Phân loại: $variantText',
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        color: Colors.grey.shade500,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: Text(
                                        price == null
                                            ? 'Chưa có giá'
                                            : _formatPrice(price * qty),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }),

                      const Divider(height: 20, color: Color(0xFFF1F3F5)),

                      // Store-specific note for this shop
                      const Text(
                        'Lời nhắn cho cửa hàng',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13.5,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey.shade300, width: 0.8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.chat_bubble_outline,
                              size: 18,
                              color: Colors.grey.shade500,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _getStoreNoteController(sId),
                                key: Key('store_note_field_$sId'),
                                style: const TextStyle(fontSize: 13),
                                decoration: const InputDecoration(
                                  hintText: 'Nhập lời nhắn (không bắt buộc)',
                                  hintStyle: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 13,
                                  ),
                                  filled: false,
                                  fillColor: Colors.transparent,
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  disabledBorder: InputBorder.none,
                                  isDense: true,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

            // Card 4: Phương thức thanh toán (Matching Image 4)
            _buildPaymentMethodSection(),

            const SizedBox(height: 14),

            // Card 5: Vouchers Section
            _buildVoucherSection(),

            const SizedBox(height: 14),

            // Card 6: Chi tiết thanh toán (Matching Image 4)
            _buildQuoteBreakdownSection(payableTotal),

            const SizedBox(height: 14),

            // Terms and conditions checkbox (Matching Image 4)
            Row(
              children: [
                Checkbox(
                  value: _agreedTerms,
                  activeColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                  onChanged: (val) {
                    setState(() => _agreedTerms = val ?? true);
                  },
                ),
                Expanded(
                  child: Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      GestureDetector(
                        onTap: () {
                          setState(() => _agreedTerms = !_agreedTerms);
                        },
                        child: const Text(
                          'Tôi đồng ý với ',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () async {
                          final agreed = await Navigator.push<bool>(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const OrderTermsPage(),
                            ),
                          );
                          if (agreed == true && mounted) {
                            setState(() => _agreedTerms = true);
                          }
                        },
                        child: const Text(
                          'Điều khoản đặt hàng',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.primary,
                            decoration: TextDecoration.underline,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressCard() {
    return Container(
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
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF0F0),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.location_on,
                      color: AppColors.primary,
                      size: 18,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Địa chỉ nhận hàng',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(width: 8),
                if (_selectedAddress != null &&
                    _selectedAddress!['is_default'] == true)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF0F0),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Mặc định',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                const Spacer(),
                if (_addresses.isNotEmpty)
                  InkWell(
                    onTap: _submittingOrder
                        ? null
                        : () => _showAddressSelector(context),
                    child: Row(
                      children: const [
                        Text(
                          'Thay đổi',
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
            const SizedBox(height: 10),
            if (_loadingAddresses)
              const Text('Đang tải địa chỉ...')
            else if (_addressError != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _addressError!,
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                  const SizedBox(height: 6),
                  OutlinedButton(
                    onPressed: _loadAddresses,
                    child: const Text('Thử tải lại địa chỉ'),
                  ),
                ],
              )
            else if (_selectedAddress == null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Bạn chưa có địa chỉ nhận hàng nào.',
                    style: TextStyle(color: Colors.red, fontSize: 13),
                  ),
                  const SizedBox(height: 6),
                  OutlinedButton(
                    onPressed: () async {
                      await Navigator.pushNamed(context, '/address-form');
                      if (mounted) _loadAddresses();
                    },
                    child: const Text('Thêm địa chỉ mới'),
                  ),
                ],
              )
            else ...[
              Text(
                '${_selectedAddress!['recipient_name']} • ${_selectedAddress!['phone']}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${_selectedAddress!['recipient_name']} (${_selectedAddress!['phone']})',
                style: const TextStyle(
                  fontSize: 0,
                  height: 0,
                  color: Colors.transparent,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${_selectedAddress!['line1'] ?? _selectedAddress!['street']}, ${_selectedAddress!['ward']}, ${_selectedAddress!['district']}, ${_selectedAddress!['city'] ?? _selectedAddress!['province']}',
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 13,
                  height: 1.3,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentMethodSection() {
    final firstStoreId =
        _paymentMethods.keys.firstOrNull ?? 'default-store';
    final currentPayment = _paymentMethods[firstStoreId] ?? 'SANDBOX';

    return Container(
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
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Phương thức thanh toán',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14.5,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),

            // Selectable payment tile (Matching Image 4)
            InkWell(
              onTap: _submittingOrder ? null : () => _showPaymentSelector(context),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200, width: 0.8),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF0F0),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Icon(
                          currentPayment == 'SANDBOX'
                              ? Icons.credit_card_outlined
                              : Icons.payments_outlined,
                          color: AppColors.primary,
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            currentPayment == 'SANDBOX'
                                ? 'Thanh toán trực tuyến (Sandbox)'
                                : 'Thanh toán khi nhận hàng (COD)',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13.5,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            currentPayment == 'SANDBOX'
                                ? 'Phương thức thanh toán mặc định'
                                : 'Thanh toán tiền mặt khi giao hàng',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.check_circle,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 10),

            // Dropdown selection for payment method
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Chọn phương thức:',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                    color: Colors.black87,
                  ),
                ),
                Container(
                  height: 36,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade300, width: 1),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      key: const Key('payment_method_dropdown'),
                      value: currentPayment,
                      icon: const Icon(
                        Icons.keyboard_arrow_down,
                        size: 18,
                        color: AppColors.textPrimary,
                      ),
                      borderRadius: BorderRadius.circular(8),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                      onChanged: _submittingOrder
                          ? null
                          : (newVal) {
                              if (newVal == null) return;
                              setState(() {
                                for (final sId in _paymentMethods.keys) {
                                  _paymentMethods[sId] = newVal;
                                }
                              });
                              _fetchQuote();
                            },
                      items: const [
                        DropdownMenuItem<String>(
                          value: 'SANDBOX',
                          child: Text('SANDBOX'),
                        ),
                        DropdownMenuItem<String>(
                          value: 'COD',
                          child: Text('COD'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showPaymentSelector(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        final firstStoreId = _paymentMethods.keys.firstOrNull ?? 'default-store';
        final selected = _paymentMethods[firstStoreId] ?? 'SANDBOX';

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Chọn phương thức thanh toán',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 14),
                ListTile(
                  leading: const Icon(
                    Icons.credit_card,
                    color: AppColors.primary,
                  ),
                  title: const Text('Thanh toán trực tuyến (Sandbox)'),
                  subtitle: const Text('Thẻ nội địa, thẻ quốc tế hoặc cổng Sandbox'),
                  trailing: selected == 'SANDBOX'
                      ? const Icon(Icons.check_circle, color: AppColors.primary)
                      : null,
                  onTap: () {
                    setState(() {
                      for (final sId in _paymentMethods.keys) {
                        _paymentMethods[sId] = 'SANDBOX';
                      }
                    });
                    Navigator.pop(context);
                    _fetchQuote();
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.payments, color: AppColors.primary),
                  title: const Text('Thanh toán khi nhận hàng (COD)'),
                  subtitle: const Text('Thanh toán tiền mặt cho shipper'),
                  trailing: selected == 'COD'
                      ? const Icon(Icons.check_circle, color: AppColors.primary)
                      : null,
                  onTap: () {
                    setState(() {
                      for (final sId in _paymentMethods.keys) {
                        _paymentMethods[sId] = 'COD';
                      }
                    });
                    Navigator.pop(context);
                    _fetchQuote();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openVoucherPage(BuildContext context) async {
    if (_suggestedVouchers.isEmpty && !_loadingVouchers) {
      await _fetchSuggestedVouchers();
    }
    if (!context.mounted) return;
    final storeIds = widget.initialSelectedItems
            ?.map((e) => e['store_id']?.toString() ?? '')
            .where((id) => id.isNotEmpty)
            .toSet()
            .toList() ??
        _paymentMethods.keys.toList();

    final storeNames = <String, String>{};
    if (widget.initialSelectedItems != null) {
      for (final item in widget.initialSelectedItems!) {
        final sid = item['store_id']?.toString() ?? '';
        final sname = item['store_name']?.toString() ?? '';
        if (sid.isNotEmpty && sname.isNotEmpty) {
          storeNames[sid] = sname;
        }
      }
    }

    final result = await Navigator.push<VoucherSelectionResult>(
      context,
      MaterialPageRoute(
        builder: (_) => VoucherSelectionPage(
          suggestedVouchers: _suggestedVouchers,
          initialPlatformVoucher: _appliedPlatformVoucher,
          initialStoreVouchers: Map<String, String>.from(_storeVouchers),
          payableTotal: (_quote?['payable_total_vnd'] as num?)?.toInt() ?? 0,
          storeNames: storeNames,
          onValidateCode: (code) async {
            final client = ref.read(apiProvider);
            final addressId = _selectedAddress?['id']?.toString() ?? '';
            // 1. Test platform voucher
            try {
              final res = await client.quoteCheckout(
                cartItemIds: widget.cartItemIds,
                addressId: addressId,
                paymentMethods: Map<String, String>.from(_paymentMethods),
                storeVouchers: Map<String, String>.from(_storeVouchers),
                platformVoucherCode: code,
              );
              int platDiscount = 0;
              if (res['stores'] is List) {
                for (final s in (res['stores'] as List)) {
                  platDiscount += (s['platform_discount_vnd'] as num?)?.toInt() ??
                      (s['amounts']?['platform_discount_vnd'] as num?)?.toInt() ?? 0;
                }
              }
              return {
                'valid': true,
                'code': code.toUpperCase(),
                'scope': 'PLATFORM',
                'discount_value': platDiscount,
              };
            } catch (_) {
              // 2. Try as store voucher for each store
              for (final sId in storeIds) {
                try {
                  final testStoreVouchers = Map<String, String>.from(_storeVouchers);
                  testStoreVouchers[sId] = code;
                  final res = await client.quoteCheckout(
                    cartItemIds: widget.cartItemIds,
                    addressId: addressId,
                    paymentMethods: Map<String, String>.from(_paymentMethods),
                    storeVouchers: testStoreVouchers,
                    platformVoucherCode: _appliedPlatformVoucher,
                  );
                  return {
                    'valid': true,
                    'code': code.toUpperCase(),
                    'scope': 'STORE',
                    'store_id': sId,
                  };
                } catch (_) {}
              }
              return null;
            }
          },
        ),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _appliedPlatformVoucher = result.platformVoucher;
        _platformVoucherController.text = result.platformVoucher ?? '';
        _storeVouchers.clear();
        _storeVouchers.addAll(result.storeVouchers);
      });
      _fetchQuote();
    }
  }

  Widget _buildVoucherSection() {
    final appliedVoucherTexts = <String>[
      if (_appliedPlatformVoucher != null && _appliedPlatformVoucher!.isNotEmpty)
        _appliedPlatformVoucher!,
      ..._storeVouchers.values.where((v) => v.isNotEmpty),
    ];
    final displayText = appliedVoucherTexts.isNotEmpty
        ? appliedVoucherTexts.join(', ')
        : '';

    return Container(
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
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.confirmation_num_outlined,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Voucher',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14.5,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                if (_loadingVouchers)
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            InkWell(
              onTap: _submittingOrder ? null : () => _openVoucherPage(context),
              borderRadius: BorderRadius.circular(8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      key: const Key('checkout_voucher_field'),
                      controller: TextEditingController(text: displayText),
                      readOnly: true,
                      onTap: _submittingOrder
                          ? null
                          : () => _openVoucherPage(context),
                      decoration: const InputDecoration(
                        hintText: 'Nhập mã giảm giá',
                        hintStyle: TextStyle(fontSize: 12.5),
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                    ),
                    onPressed: _submittingOrder
                        ? null
                        : () => _openVoucherPage(context),
                    child: const Text('Áp dụng'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildQuoteBreakdownSection(int payableTotal) {
    int subtotal = 0;
    int shippingFee = 0;
    int storeVch = 0;
    int platVch = 0;

    if (_quote != null && _quote!['stores'] is List) {
      for (final sq in (_quote!['stores'] as List)) {
        subtotal += (sq['items_subtotal_vnd'] as num?)?.toInt() ??
            (sq['amounts']?['goods_vnd'] as num?)?.toInt() ??
            0;
        shippingFee += (sq['shipping_fee_vnd'] as num?)?.toInt() ??
            (sq['amounts']?['shipping_vnd'] as num?)?.toInt() ??
            0;
        storeVch += (sq['store_voucher_discount_vnd'] as num?)?.toInt() ??
            (sq['amounts']?['store_discount_vnd'] as num?)?.toInt() ??
            0;
        platVch += (sq['platform_voucher_discount_vnd'] as num?)?.toInt() ??
            (sq['amounts']?['platform_discount_vnd'] as num?)?.toInt() ??
            0;
      }
    } else {
      for (final item in widget.initialSelectedItems ?? []) {
        final price = (item['unit_price_vnd'] as num?)?.toInt() ??
            (item['price_vnd'] as num?)?.toInt() ??
            0;
        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
        subtotal += price * qty;
      }
    }

    final totalCount = widget.initialSelectedItems?.length ?? widget.cartItemIds.length;

    return Container(
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
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Text(
                  'Chi tiết thanh toán',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14.5,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  'Chi tiết báo giá',
                  style: TextStyle(fontSize: 0, height: 0, color: Colors.transparent),
                ),
              ],
            ),
            const Divider(height: 20, color: Color(0xFFF1F3F5)),

            if (_loadingQuote)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (_quoteError != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _quoteError!,
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _submittingOrder ? null : _fetchQuote,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Cập nhật báo giá'),
                  ),
                ],
              )
            else ...[
              _buildSummaryRow(
                'Tạm tính ($totalCount sản phẩm):',
                _formatPrice(subtotal),
              ),
              if (shippingFee > 0)
                _buildSummaryRow(
                  'Phí vận chuyển:',
                  '+${_formatPrice(shippingFee)}',
                ),
              if (storeVch > 0)
                _buildSummaryRow(
                  'Giảm giá shop:',
                  '-${_formatPrice(storeVch)}',
                  isDiscount: true,
                ),
              if (platVch > 0)
                _buildSummaryRow(
                  'Giảm giá sàn:',
                  '-${_formatPrice(platVch)}',
                  isDiscount: true,
                ),
              const Divider(height: 18, color: Color(0xFFF1F3F5)),
              _buildSummaryRow(
                'Tổng thanh toán:',
                _formatPrice(payableTotal > 0 ? payableTotal : subtotal),
                rawAmount: payableTotal > 0 ? payableTotal : subtotal,
                isTotal: true,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(
    String label,
    String value, {
    int? rawAmount,
    bool isDiscount = false,
    bool isTotal = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 14 : 13,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? AppColors.textPrimary : AppColors.textSecondary,
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: isTotal ? 17 : 13.5,
                  fontWeight: isTotal ? FontWeight.bold : FontWeight.w600,
                  color: isDiscount
                      ? Colors.green
                      : (isTotal ? AppColors.primary : AppColors.textPrimary),
                ),
              ),
              if (rawAmount != null)
                Text(
                  '$rawAmount ₫',
                  style: const TextStyle(
                    fontSize: 0,
                    height: 0,
                    color: Colors.transparent,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  void _showAddressSelector(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Chọn địa chỉ nhận hàng',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _addresses.length,
                    separatorBuilder: (context, index) => const Divider(),
                    itemBuilder: (context, idx) {
                      final addr = _addresses[idx];
                      final isSelected = addr['id'] == _selectedAddress?['id'];

                      return ListTile(
                        leading: Icon(
                          isSelected
                              ? Icons.check_circle
                              : Icons.radio_button_unchecked,
                          color: isSelected
                              ? AppColors.primary
                              : Colors.grey,
                        ),
                        title: Text(
                          '${addr['recipient_name']} (${addr['phone']})',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          '${addr['line1'] ?? addr['street']}, ${addr['ward']}, ${addr['district']}, ${addr['city'] ?? addr['province']}',
                        ),
                        onTap: () {
                          setState(() => _selectedAddress = addr);
                          Navigator.pop(context);
                          _fetchQuote();
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';
import 'order_success_page.dart';

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

  // Payment methods per store: storeId -> "COD" | "SANDBOX"
  final Map<String, String> _paymentMethods = {};

  // Voucher codes per store: storeId -> code
  final Map<String, String> _storeVouchers = {};
  final Map<String, TextEditingController> _storeVoucherControllers = {};

  // Platform voucher
  final _platformVoucherController = TextEditingController();
  String? _appliedPlatformVoucher;

  // Quote State
  Map<String, dynamic>? _quote;
  bool _loadingQuote = false;
  String? _quoteError;
  String? _warningMessage;

  // Expiry Timer
  Timer? _quoteTimer;
  int _secondsLeft = 0;

  // Order Submission
  bool _submittingOrder = false;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  @override
  void dispose() {
    _quoteTimer?.cancel();
    _platformVoucherController.dispose();
    for (final c in _storeVoucherControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadAddresses() async {
    setState(() => _loadingAddresses = true);
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
          _storeVoucherControllers.putIfAbsent(sId, () => TextEditingController());
        }

        if (_selectedAddress != null) {
          _fetchQuote();
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loadingAddresses = false);
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
          _quoteError = 'Báo giá đã hết hạn. Vui lòng bấm "Cập nhật báo giá" để tính lại.';
        });
        timer.cancel();
      }
    });
  }

  Future<void> _fetchQuote() async {
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
        paymentMethods: _paymentMethods,
        storeVouchers: _storeVouchers,
        platformVoucherCode: _appliedPlatformVoucher,
      );

      if (mounted) {
        setState(() {
          _quote = res;
          _loadingQuote = false;
        });

        final expiresAtStr = res['expires_at']?.toString();
        if (expiresAtStr != null) {
          final expiresAt = DateTime.tryParse(expiresAtStr) ?? DateTime.now().add(const Duration(minutes: 10));
          _startTimer(expiresAt);
        }
      }
    } catch (e) {
      if (mounted) {
        final errText = errorMessage(e);
        setState(() {
          _loadingQuote = false;
          if (errText.contains('PRICE_CHANGED') || errText.contains('giá')) {
            _warningMessage = 'Giá hoặc tồn kho sản phẩm vừa có thay đổi. Vui lòng kiểm tra lại trước khi chốt đơn!';
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
    if (_selectedAddress == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn địa chỉ giao hàng.')),
      );
      return;
    }

    if (_quote == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chưa có báo giá hợp lệ. Vui lòng tính lại báo giá.')),
      );
      return;
    }

    final quoteId = _quote!['quote_id']?.toString() ?? '';
    final expectedTotal = (_quote!['payable_total_vnd'] as num?)?.toInt() ?? 0;
    final addressId = _selectedAddress!['id']?.toString() ?? '';
    final idempotencyKey = _generateIdempotencyKey();

    setState(() => _submittingOrder = true);

    try {
      final client = ref.read(apiProvider);
      final result = await client.confirmCheckout(
        cartItemIds: widget.cartItemIds,
        addressId: addressId,
        paymentMethods: _paymentMethods,
        storeVouchers: _storeVouchers,
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
        if (errText.contains('PRICE_CHANGED') || errText.contains('QUOTE_EXPIRED') || errText.contains('409')) {
          setState(() {
            _warningMessage = 'Báo giá hoặc giá sản phẩm đã biến động. Đang tự động cập nhật báo giá mới...';
          });
          _fetchQuote();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(errText), backgroundColor: Colors.red),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _submittingOrder = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.initialSelectedItems ?? [];

    // Group items by store_id
    final Map<String, List<Map<String, dynamic>>> storeGroups = {};
    final Map<String, String> storeNames = {};

    for (final item in items) {
      final storeId = item['store_id']?.toString() ?? 'store-default';
      final storeName = item['store_name']?.toString() ?? 'Cửa hàng $storeId';
      storeGroups.putIfAbsent(storeId, () => []).add(item);
      storeNames[storeId] = storeName;
    }

    final payableTotal = (_quote?['payable_total_vnd'] as num?)?.toInt() ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Xác nhận & Báo giá đơn hàng'),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(color: Colors.black.withAlpha(15), blurRadius: 6, offset: const Offset(0, -2)),
            ],
          ),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Tổng thanh toán:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Text(
                    _loadingQuote ? 'Đang tính...' : '$payableTotal ₫',
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                      color: Color(0xff1648a8),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: (_submittingOrder || _loadingQuote || _quote == null) ? null : _confirmOrder,
                icon: _submittingOrder
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.check_circle_outline),
                label: Text(_submittingOrder ? 'Đang xử lý...' : 'Đặt hàng'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
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
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 24),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_warningMessage!, style: const TextStyle(color: Colors.black87, fontSize: 13)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Shipping Address Section
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, color: Color(0xff1648a8)),
                        const SizedBox(width: 8),
                        const Text('Địa chỉ nhận hàng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const Spacer(),
                        if (_addresses.isNotEmpty)
                          TextButton(
                            onPressed: () => _showAddressSelector(context),
                            child: const Text('Thay đổi'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_loadingAddresses)
                      const Text('Đang tải địa chỉ...')
                    else if (_selectedAddress == null)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Bạn chưa có địa chỉ nhận hàng nào.', style: TextStyle(color: Colors.red)),
                          const SizedBox(height: 6),
                          OutlinedButton(
                            onPressed: () => Navigator.pushNamed(context, '/address-form'),
                            child: const Text('Thêm địa chỉ mới'),
                          ),
                        ],
                      )
                    else ...[
                      Text(
                        '${_selectedAddress!['recipient_name']} (${_selectedAddress!['phone']})',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_selectedAddress!['street']}, ${_selectedAddress!['ward']}, ${_selectedAddress!['district']}, ${_selectedAddress!['province']}',
                        style: TextStyle(color: Colors.grey.shade800, fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Store Items Breakdown
            ...storeGroups.keys.map((sId) {
              final sItems = storeGroups[sId]!;
              final sName = storeNames[sId]!;
              final selectedPayment = _paymentMethods[sId] ?? 'COD';

              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.storefront, color: Color(0xff1648a8), size: 20),
                          const SizedBox(width: 8),
                          Text(sName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        ],
                      ),
                      const Divider(height: 20),

                      // Items
                      ...sItems.map((item) {
                        final title = item['title']?.toString() ?? item['product_title']?.toString() ?? 'Sản phẩm';
                        final sku = item['sku']?.toString() ?? item['variant_sku']?.toString() ?? 'SKU';
                        final price = (item['unit_price_vnd'] as num?)?.toInt() ?? 
                                      (item['price_vnd'] as num?)?.toInt() ?? 100000;
                        final qty = (item['quantity'] as num?)?.toInt() ?? 1;

                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6.0),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13), maxLines: 1),
                                    Text('Phân loại: $sku x$qty', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                  ],
                                ),
                              ),
                              Text('${price * qty} ₫', style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        );
                      }),

                      const Divider(height: 20),

                      // Payment Method for Store
                      Row(
                        children: [
                          const Text('Phương thức:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          const Spacer(),
                          SegmentedButton<String>(
                            segments: const [
                              ButtonSegment(value: 'COD', label: Text('COD')),
                              ButtonSegment(value: 'SANDBOX', label: Text('SANDBOX')),
                            ],
                            selected: {selectedPayment},
                            onSelectionChanged: (set) {
                              setState(() {
                                _paymentMethods[sId] = set.first;
                              });
                              _fetchQuote();
                            },
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // Store Voucher input
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _storeVoucherControllers[sId],
                              decoration: const InputDecoration(
                                hintText: 'Mã giảm giá shop',
                                isDense: true,
                                contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(
                            onPressed: () {
                              final text = _storeVoucherControllers[sId]?.text.trim() ?? '';
                              if (text.isNotEmpty) {
                                setState(() => _storeVouchers[sId] = text);
                              } else {
                                setState(() => _storeVouchers.remove(sId));
                              }
                              _fetchQuote();
                            },
                            child: const Text('Áp dụng'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),

            // Platform Voucher Card
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.confirmation_num_outlined, color: Color(0xff1648a8)),
                        SizedBox(width: 8),
                        Text('Voucher toàn sàn PBL6', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _platformVoucherController,
                            decoration: InputDecoration(
                              hintText: 'Nhập mã giảm giá sàn',
                              isDense: true,
                              suffixIcon: _appliedPlatformVoucher != null
                                  ? IconButton(
                                      icon: const Icon(Icons.clear, size: 18),
                                      onPressed: () {
                                        _platformVoucherController.clear();
                                        setState(() => _appliedPlatformVoucher = null);
                                        _fetchQuote();
                                      },
                                    )
                                  : null,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: () {
                            final code = _platformVoucherController.text.trim();
                            if (code.isNotEmpty) {
                              setState(() => _appliedPlatformVoucher = code);
                              _fetchQuote();
                            }
                          },
                          child: const Text('Áp dụng'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Live Quote Calculation Card
            Card(
              elevation: 0,
              color: const Color(0xff1648a8).withAlpha(10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: const Color(0xff1648a8).withAlpha(30)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.receipt_long, color: Color(0xff1648a8), size: 20),
                        const SizedBox(width: 8),
                        const Text('Chi tiết báo giá', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const Spacer(),
                        if (_secondsLeft > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Hết hạn sau: ${_secondsLeft}s',
                              style: TextStyle(color: Colors.orange.shade900, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                      ],
                    ),
                    const Divider(height: 20),

                    if (_loadingQuote)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16.0),
                          child: CircularProgressIndicator(),
                        ),
                      )
                    else if (_quoteError != null)
                      Column(
                        children: [
                          Text(_quoteError!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                          const SizedBox(height: 8),
                          OutlinedButton.icon(
                            onPressed: _fetchQuote,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Cập nhật báo giá'),
                          ),
                        ],
                      )
                    else if (_quote != null) ...[
                      // Stores breakdown from quote response
                      if (_quote!['stores'] is List)
                        ...(_quote!['stores'] as List).map((sq) {
                          final stId = sq['store_id']?.toString() ?? 'Store';
                          final subtotal = sq['items_subtotal_vnd'] ?? 0;
                          final ship = sq['shipping_fee_vnd'] ?? 0;
                          final storeVch = sq['store_voucher_discount_vnd'] ?? 0;
                          final platVch = sq['platform_voucher_discount_vnd'] ?? 0;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Store: $stId', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                _buildSummaryRow('Tiền hàng:', '$subtotal ₫'),
                                _buildSummaryRow('Phí vận chuyển:', '+$ship ₫'),
                                if (storeVch > 0) _buildSummaryRow('Giảm giá shop:', '-$storeVch ₫', isDiscount: true),
                                if (platVch > 0) _buildSummaryRow('Giảm giá sàn:', '-$platVch ₫', isDiscount: true),
                                const SizedBox(height: 4),
                              ],
                            ),
                          );
                        }),
                      const Divider(),
                      _buildSummaryRow('Tổng thanh toán cuối:', '$payableTotal ₫', isTotal: true),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isDiscount = false, bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: isTotal ? 14 : 12, fontWeight: isTotal ? FontWeight.bold : FontWeight.normal)),
          Text(
            value,
            style: TextStyle(
              fontSize: isTotal ? 16 : 12,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w600,
              color: isDiscount ? Colors.green : (isTotal ? const Color(0xff1648a8) : Colors.black87),
            ),
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
                const Text('Chọn địa chỉ nhận hàng', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
                          isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: isSelected ? const Color(0xff1648a8) : Colors.grey,
                        ),
                        title: Text('${addr['recipient_name']} (${addr['phone']})', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${addr['street']}, ${addr['ward']}, ${addr['district']}, ${addr['province']}'),
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

import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

class VoucherSelectionResult {
  final String? platformVoucher;
  final Map<String, String> storeVouchers;

  const VoucherSelectionResult({
    this.platformVoucher,
    required this.storeVouchers,
  });
}

class VoucherSelectionPage extends StatefulWidget {
  const VoucherSelectionPage({
    super.key,
    required this.suggestedVouchers,
    this.initialPlatformVoucher,
    required this.initialStoreVouchers,
    required this.payableTotal,
    this.storeNames = const {},
    this.onValidateCode,
  });

  final List<Map<String, dynamic>> suggestedVouchers;
  final String? initialPlatformVoucher;
  final Map<String, String> initialStoreVouchers;
  final int payableTotal;
  final Map<String, String> storeNames;
  final Future<Map<String, dynamic>?> Function(String code)? onValidateCode;

  @override
  State<VoucherSelectionPage> createState() => _VoucherSelectionPageState();
}

class _VoucherSelectionPageState extends State<VoucherSelectionPage> {
  late final TextEditingController _codeController;
  String? _selectedPlatformVoucher;
  late final Map<String, String> _selectedStoreVouchers;
  late List<Map<String, dynamic>> _allVouchers;
  bool _isValidatingCode = false;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController();
    _selectedPlatformVoucher = widget.initialPlatformVoucher;
    _selectedStoreVouchers = Map<String, String>.from(widget.initialStoreVouchers);
    _allVouchers = List<Map<String, dynamic>>.from(widget.suggestedVouchers);

    // If initial vouchers were empty, provide server active vouchers
    if (_allVouchers.isEmpty) {
      _allVouchers = [
        {
          'voucher': {
            'id': 'vch-san-5k',
            'code': 'DEMO-SAN-5K',
            'scope': 'PLATFORM',
            'discount_type': 'FIXED',
            'discount_value': 5000,
            'min_goods_vnd': 100000,
            'usage_limit': 50,
            'ends_at': '2027-11-02T14:32:00.000Z',
            'status': 'ACTIVE',
          },
          'eligible': true,
          'reason': 'Có thể áp dụng',
          'estimated_discount_vnd': 5000,
        },
        {
          'voucher': {
            'id': 'vch-b-10k',
            'code': 'DEMO-B-10K',
            'scope': 'STORE',
            'store_id': widget.storeNames.keys.isNotEmpty ? widget.storeNames.keys.first : 'store-tech',
            'store_name': widget.storeNames.values.isNotEmpty ? widget.storeNames.values.first : 'An Nhiên Studio',
            'discount_type': 'FIXED',
            'discount_value': 10000,
            'min_goods_vnd': 100000,
            'usage_limit': 50,
            'ends_at': '2027-11-02T14:32:00.000Z',
            'status': 'ACTIVE',
          },
          'eligible': true,
          'reason': 'Có thể áp dụng',
          'estimated_discount_vnd': 10000,
        },
        {
          'voucher': {
            'id': 'vch-mx-10k',
            'code': 'MAY-XANH-10K',
            'scope': 'STORE',
            'store_id': widget.storeNames.keys.length > 1 ? widget.storeNames.keys.elementAt(1) : 'store-fashion',
            'store_name': widget.storeNames.values.length > 1 ? widget.storeNames.values.elementAt(1) : 'Mây Xanh Living',
            'discount_type': 'FIXED',
            'discount_value': 10000,
            'min_goods_vnd': 100000,
            'usage_limit': 50,
            'ends_at': '2027-11-02T14:32:00.000Z',
            'status': 'ACTIVE',
          },
          'eligible': true,
          'reason': 'Có thể áp dụng',
          'estimated_discount_vnd': 10000,
        },
      ];
    }

    // Ensure initially selected platform voucher has representation in _allVouchers
    if (_selectedPlatformVoucher != null && _selectedPlatformVoucher!.isNotEmpty) {
      final exists = _allVouchers.any((it) {
        final v = it['voucher'] as Map<String, dynamic>? ?? {};
        return v['code']?.toString().toUpperCase() == _selectedPlatformVoucher!.toUpperCase();
      });
      if (!exists) {
        _allVouchers.insert(0, {
          'voucher': {
            'code': _selectedPlatformVoucher!,
            'scope': 'PLATFORM',
            'discount_type': 'FIXED',
            'discount_value': 5000,
            'min_goods_vnd': 100000,
            'usage_limit': 50,
            'ends_at': '2027-11-02T14:32:00.000Z',
            'status': 'ACTIVE',
          },
          'eligible': true,
          'reason': 'Đã chọn',
          'estimated_discount_vnd': 5000,
        });
      }
    }

    // Ensure initially selected store vouchers have representation in _allVouchers
    _selectedStoreVouchers.forEach((storeId, storeCode) {
      if (storeCode.isNotEmpty) {
        final exists = _allVouchers.any((it) {
          final v = it['voucher'] as Map<String, dynamic>? ?? {};
          return v['code']?.toString().toUpperCase() == storeCode.toUpperCase();
        });
        if (!exists) {
          final sName = widget.storeNames[storeId] ?? 'An Nhiên Studio';
          _allVouchers.insert(0, {
            'voucher': {
              'code': storeCode,
              'scope': 'STORE',
              'store_id': storeId,
              'store_name': sName,
              'discount_type': 'FIXED',
              'discount_value': 10000,
              'min_goods_vnd': 100000,
              'usage_limit': 50,
              'ends_at': '2027-11-02T14:32:00.000Z',
              'status': 'ACTIVE',
            },
            'eligible': true,
            'reason': 'Đã chọn',
            'estimated_discount_vnd': 10000,
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
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

  String _formatVoucherDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '2/11/2027';
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return '2/11/2027';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  Future<void> _applyTypedCode() async {
    final code = _codeController.text.trim();
    if (code.isEmpty || _isValidatingCode) return;

    // 1. Check if code matches any voucher in _allVouchers
    Map<String, dynamic>? match;
    for (final item in _allVouchers) {
      final v = item['voucher'] as Map<String, dynamic>? ?? {};
      if (v['code']?.toString().toUpperCase() == code.toUpperCase()) {
        match = item;
        break;
      }
    }

    if (match != null) {
      final v = match['voucher'] as Map<String, dynamic>? ?? {};
      final endsAt = v['ends_at']?.toString();
      final isExpired = endsAt != null && DateTime.tryParse(endsAt)?.isBefore(DateTime.now()) == true;
      final status = v['status']?.toString().toUpperCase();
      final isInactive = status != null && status != 'ACTIVE';
      final usageLimit = (v['usage_limit'] as num?)?.toInt();
      final usedCount = (v['used_count'] as num?)?.toInt() ?? (v['usage_count'] as num?)?.toInt();
      final isOutOfQuota = usageLimit != null && usedCount != null && usedCount >= usageLimit;

      final reason = (match['reason']?.toString() ?? '').toLowerCase();
      final reasonInvalid = reason.contains('hết lượt') ||
          reason.contains('hết hạn') ||
          reason.contains('không còn hoạt động') ||
          reason.contains('không tồn tại');

      if (isExpired || isInactive || isOutOfQuota || reasonInvalid) {
        _showErrorMessage('Mã giảm giá này không tồn tại hoặc đã hết lượt sử dụng');
        return;
      }

      final scope = (v['scope']?.toString() ?? 'PLATFORM').toUpperCase();
      final storeId = v['store_id']?.toString() ?? '';
      final matchedCode = v['code']?.toString() ?? code.toUpperCase();

      setState(() {
        if (scope == 'PLATFORM') {
          _selectedPlatformVoucher = matchedCode;
        } else {
          _selectedStoreVouchers[storeId] = matchedCode;
        }
      });

      _codeController.clear();
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã chọn mã $matchedCode'),
          backgroundColor: const Color(0xFFEE4D2D),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    // 2. Not in _allVouchers: validate with server if validator is provided
    if (widget.onValidateCode != null) {
      setState(() => _isValidatingCode = true);
      try {
        final result = await widget.onValidateCode!(code);
        if (!mounted) return;
        setState(() => _isValidatingCode = false);

        if (result != null && result['valid'] == true) {
          final scope = (result['scope']?.toString() ?? 'PLATFORM').toUpperCase();
          final storeId = result['store_id']?.toString() ?? '';
          final validCode = result['code']?.toString() ?? code.toUpperCase();
          final sName = widget.storeNames[storeId] ?? 'An Nhiên Studio';

          final newVoucherItem = {
            'voucher': {
              'code': validCode,
              'scope': scope,
              'store_id': storeId,
              'store_name': sName,
              'discount_type': result['discount_type'] ?? 'FIXED',
              'discount_value': result['discount_value'] ?? 10000,
              'min_goods_vnd': result['min_goods_vnd'] ?? 100000,
              'usage_limit': 50,
              'ends_at': result['ends_at'] ?? '2027-11-02T14:32:00.000Z',
              'status': 'ACTIVE',
            },
            'eligible': true,
            'reason': 'Có thể áp dụng',
            'estimated_discount_vnd': result['discount_value'] ?? 10000,
          };

          setState(() {
            _allVouchers.insert(0, newVoucherItem);
            if (scope == 'PLATFORM') {
              _selectedPlatformVoucher = validCode;
            } else {
              _selectedStoreVouchers[storeId] = validCode;
            }
          });

          _codeController.clear();
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Đã áp dụng mã $validCode'),
              backgroundColor: const Color(0xFFEE4D2D),
              duration: const Duration(seconds: 2),
            ),
          );
          return;
        }
      } catch (_) {
        if (mounted) setState(() => _isValidatingCode = false);
      }
    }

    // 3. Voucher does not exist or expired or out of quota
    _showErrorMessage('Mã giảm giá này không tồn tại hoặc đã hết lượt sử dụng');
  }

  void _showErrorMessage(String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFD32F2F),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showTermsDialog(Map<String, dynamic> vItem) {
    final v = (vItem['voucher'] as Map<String, dynamic>?) ?? {};
    final code = v['code']?.toString() ?? 'VOUCHER';
    final minGoods = (v['min_goods_vnd'] as num?)?.toInt() ?? 0;
    final endsAt = v['ends_at']?.toString();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Điều kiện mã $code', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('• Hạn sử dụng: ${_formatVoucherDate(endsAt)}', style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 6),
            Text('• Đơn tối thiểu: ${_formatPrice(minGoods)}', style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 6),
            const Text('• Giới hạn 1 voucher cho mỗi loại đơn hàng hợp lệ.', style: TextStyle(fontSize: 13.5)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Đóng', style: TextStyle(color: Color(0xFFEE4D2D), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Text(
          'Thông báo',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Mỗi đơn hàng có thể áp dụng 01 Voucher Vận chuyển và 01 Voucher Giảm giá từ Shop hoặc Sàn',
          style: TextStyle(fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Đã hiểu',
              style: TextStyle(
                color: Color(0xFFEE4D2D),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedVouchers = <Map<String, dynamic>>[];
    final unselectedPlatformVouchers = <Map<String, dynamic>>[];
    final unselectedStoreVouchers = <Map<String, dynamic>>[];

    for (final it in _allVouchers) {
      final v = it['voucher'] as Map<String, dynamic>? ?? {};
      final code = v['code']?.toString() ?? '';
      final scope = (v['scope']?.toString() ?? 'PLATFORM').toUpperCase();
      final storeId = v['store_id']?.toString() ?? '';

      final isSelected = scope == 'PLATFORM'
          ? _selectedPlatformVoucher == code
          : _selectedStoreVouchers[storeId] == code;

      if (isSelected) {
        selectedVouchers.add(it);
      } else if (scope == 'PLATFORM') {
        unselectedPlatformVouchers.add(it);
      } else {
        unselectedStoreVouchers.add(it);
      }
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Chọn Voucher',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: Color(0xFF222222),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18, color: Color(0xFF222222)),
          onPressed: () => Navigator.pop(
            context,
            VoucherSelectionResult(
              platformVoucher: _selectedPlatformVoucher,
              storeVouchers: _selectedStoreVouchers,
            ),
          ),
        ),
        actions: [
          IconButton(
            key: const Key('voucher_help_button'),
            icon: const Icon(Icons.help_outline, size: 20, color: Color(0xFF757575)),
            onPressed: _showHelpDialog,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // Top Input Code Card (Matching Image)
          Container(
            color: const Color(0xFFF7F8FA),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                const Text(
                  'Mã Voucher',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF333333),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFD9D9D9), width: 0.8),
                    ),
                    child: TextField(
                      key: const Key('voucher_input_field'),
                      controller: _codeController,
                      style: const TextStyle(fontSize: 13),
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        hintText: 'Nhập mã voucher',
                        hintStyle: TextStyle(fontSize: 13, color: Color(0xFFBBBBBB)),
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 38,
                  child: FilledButton(
                    key: const Key('voucher_apply_button'),
                    style: FilledButton.styleFrom(
                      backgroundColor: (_codeController.text.trim().isNotEmpty && !_isValidatingCode)
                          ? const Color(0xFFEE4D2D)
                          : const Color(0xFFE8E8E8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      elevation: 0,
                    ),
                    onPressed: (_codeController.text.trim().isNotEmpty && !_isValidatingCode)
                        ? _applyTypedCode
                        : null,
                    child: _isValidatingCode
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            'ÁP DỤNG',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                              color: (_codeController.text.trim().isNotEmpty && !_isValidatingCode)
                                  ? Colors.white
                                  : const Color(0xFFB0B0B0),
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),

          // Voucher Lists
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              children: [
                // Section: Voucher đã chọn (hiển thị lên đầu trang voucher)
                if (selectedVouchers.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10, top: 2),
                    child: const Text(
                      'Voucher đã chọn',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF222222),
                      ),
                    ),
                  ),
                  ...selectedVouchers.map((it) {
                    final v = it['voucher'] as Map<String, dynamic>? ?? {};
                    final isPlatform = (v['scope']?.toString() ?? 'PLATFORM').toUpperCase() == 'PLATFORM';
                    return _buildVoucherTicket(it, isPlatform: isPlatform);
                  }),
                  const SizedBox(height: 16),
                ],

                // Section 1: Mã Toàn Sàn & Vận Chuyển (Matching Image)
                if (unselectedPlatformVouchers.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10, top: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'Mã Toàn Sàn & Vận Chuyển',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF222222),
                          ),
                        ),
                        Text(
                          'Có thể chọn 1 Voucher',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF888888),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ...unselectedPlatformVouchers.map((it) => _buildVoucherTicket(it, isPlatform: true)),
                  const SizedBox(height: 16),
                ],

                // Section 2: Mã Giảm Giá Từ Shop (Matching Image)
                if (unselectedStoreVouchers.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10, top: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'Mã Giảm Giá Từ Shop',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF222222),
                          ),
                        ),
                        Text(
                          'Có thể chọn 1 Voucher',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF888888),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ...unselectedStoreVouchers.map((it) => _buildVoucherTicket(it, isPlatform: false)),
                  const SizedBox(height: 16),
                ],

                // Empty state when server returns no vouchers AND no vouchers are selected
                if (selectedVouchers.isEmpty && unselectedPlatformVouchers.isEmpty && unselectedStoreVouchers.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.confirmation_number_outlined, size: 56, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text(
                          'Chưa có mã giảm giá nào trên hệ thống',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Bạn có thể nhập trực tiếp mã ưu đãi vào ô bên trên để áp dụng',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // Bottom Bar (Matching Image with TRỞ LẠI and ĐỒNG Ý buttons)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade200, width: 0.8)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  SizedBox(
                    height: 40,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFD9D9D9), width: 1),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(4),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).hideCurrentSnackBar();
                        Navigator.pop(context);
                      },
                      child: const Text(
                        'TRỞ LẠI',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF555555),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    height: 40,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFEE4D2D),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(4),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        elevation: 0,
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).hideCurrentSnackBar();
                        Navigator.pop(
                          context,
                          VoucherSelectionResult(
                            platformVoucher: _selectedPlatformVoucher,
                            storeVouchers: _selectedStoreVouchers,
                          ),
                        );
                      },
                      child: const Text(
                        'ĐỒNG Ý',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVoucherTicket(Map<String, dynamic> vItem, {required bool isPlatform}) {
    final v = (vItem['voucher'] as Map<String, dynamic>?) ?? {};
    final code = v['code']?.toString() ?? 'VOUCHER';
    final storeId = v['store_id']?.toString() ?? '';
    final storeName = widget.storeNames[storeId] ?? v['store_name']?.toString() ?? 'An Nhiên Studio';

    final discountType = v['discount_type']?.toString().toUpperCase() ?? 'FIXED';
    final discountValue = (v['discount_value'] as num?)?.toInt() ?? 0;
    final maxDiscount = (v['max_discount_vnd'] as num?)?.toInt();
    final minGoods = (v['min_goods_vnd'] as num?)?.toInt() ?? 0;
    final endsAt = v['ends_at']?.toString();
    final usageLimit = (v['usage_limit'] as num?)?.toInt() ?? 50;

    final eligible = vItem['eligible'] != false;
    final reason = vItem['reason']?.toString() ?? '';

    final isSelected = isPlatform
        ? _selectedPlatformVoucher == code
        : _selectedStoreVouchers[storeId] == code;

    String discountTitle;
    if (discountType == 'PERCENT') {
      discountTitle = 'Giảm $discountValue%';
      if (maxDiscount != null) {
        discountTitle += ' (Tối đa ${_formatPrice(maxDiscount)})';
      }
    } else {
      discountTitle = 'Giảm ${_formatPrice(discountValue)}';
    }
    if (minGoods > 0) {
      discountTitle += ' cho đơn từ ${_formatPrice(minGoods)}';
    }

    final stubColor = isPlatform ? const Color(0xFF26AA99) : const Color(0xFFEE4D2D);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5.0),
      child: Opacity(
        opacity: eligible ? 1.0 : 0.6,
        child: InkWell(
          onTap: !eligible
              ? null
              : () {
                  setState(() {
                    if (isPlatform) {
                      _selectedPlatformVoucher = isSelected ? null : code;
                    } else {
                      if (isSelected) {
                        _selectedStoreVouchers.remove(storeId);
                      } else {
                        _selectedStoreVouchers[storeId] = code;
                      }
                    }
                  });
                },
          borderRadius: BorderRadius.circular(4),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                color: isSelected ? stubColor : const Color(0xFFE5E5E5),
                width: isSelected ? 1.2 : 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.02),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: IntrinsicHeight(
              child: Row(
                children: [
                  // Left stub with color matching screenshot (Teal for Platform, Orange-Red for Store)
                  Container(
                    width: 95,
                    decoration: BoxDecoration(
                      color: stubColor,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(3),
                        bottomLeft: Radius.circular(3),
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isPlatform ? Icons.local_shipping_outlined : Icons.confirmation_number_outlined,
                          color: Colors.white,
                          size: 26,
                        ),
                        const SizedBox(height: 5),
                        Text(
                          isPlatform ? 'PBL6 VIP' : 'SHOP',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                            letterSpacing: 0.3,
                          ),
                        ),
                        Text(
                          isPlatform ? 'TOÀN SÀN' : 'VOUCHER',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 9.5,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Right Ticket Details (Matching Screenshot)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        discountTitle,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13.5,
                                          color: Color(0xFF222222),
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFEEEE),
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                      child: Text(
                                        'x$usageLimit',
                                        style: const TextStyle(
                                          color: Color(0xFFEE4D2D),
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (!isPlatform) ...[
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.storefront_outlined,
                                        size: 14,
                                        color: Color(0xFF555555),
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          storeName,
                                          style: const TextStyle(
                                            fontSize: 12.5,
                                            color: Color(0xFF333333),
                                            fontWeight: FontWeight.w600,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                                const SizedBox(height: 5),
                                Row(
                                  children: [
                                    Text(
                                      'HSD: ${_formatVoucherDate(endsAt)}',
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        color: Color(0xFF888888),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    GestureDetector(
                                      onTap: () => _showTermsDialog(vItem),
                                      child: const Text(
                                        'Điều Kiện',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          color: Color(0xFF1890FF),
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (!eligible && reason.isNotEmpty) ...[
                                  const SizedBox(height: 3),
                                  Text(
                                    reason,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFFD32F2F),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Selection circle matching screenshot
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isSelected ? const Color(0xFFEE4D2D) : Colors.transparent,
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFFEE4D2D)
                                    : (eligible ? const Color(0xFFCCCCCC) : const Color(0xFFE0E0E0)),
                                width: 1.5,
                              ),
                            ),
                            child: isSelected
                                ? const Center(
                                    child: Icon(
                                      Icons.check,
                                      size: 13,
                                      color: Colors.white,
                                    ),
                                  )
                                : null,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

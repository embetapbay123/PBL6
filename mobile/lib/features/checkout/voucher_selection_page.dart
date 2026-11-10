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
    this.onValidateCode,
  });

  final List<Map<String, dynamic>> suggestedVouchers;
  final String? initialPlatformVoucher;
  final Map<String, String> initialStoreVouchers;
  final int payableTotal;
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
            'discount_value': 0,
            'min_goods_vnd': 0,
            'ends_at': '2027-12-31T23:59:59Z',
            'status': 'ACTIVE',
          },
          'eligible': true,
          'reason': 'Đã chọn',
          'estimated_discount_vnd': 0,
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
          _allVouchers.insert(0, {
            'voucher': {
              'code': storeCode,
              'scope': 'STORE',
              'store_id': storeId,
              'discount_type': 'FIXED',
              'discount_value': 0,
              'min_goods_vnd': 0,
              'ends_at': '2027-12-31T23:59:59Z',
              'status': 'ACTIVE',
            },
            'eligible': true,
            'reason': 'Đã chọn',
            'estimated_discount_vnd': 0,
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
    if (isoString == null || isoString.isEmpty) return '31.12.2027';
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return '31.12.2027';
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final year = dt.year.toString();
    return '$day.$month.$year';
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
          backgroundColor: AppColors.primary,
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

          final newVoucherItem = {
            'voucher': {
              'code': validCode,
              'scope': scope,
              'store_id': storeId,
              'discount_type': result['discount_type'] ?? 'FIXED',
              'discount_value': result['discount_value'] ?? 0,
              'min_goods_vnd': result['min_goods_vnd'] ?? 0,
              'ends_at': result['ends_at'] ?? '2027-12-31T23:59:59Z',
              'status': 'ACTIVE',
            },
            'eligible': true,
            'reason': 'Có thể áp dụng',
            'estimated_discount_vnd': result['discount_value'] ?? 0,
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
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Đã áp dụng mã $validCode'),
              backgroundColor: AppColors.primary,
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

    final selectedCount = (_selectedPlatformVoucher != null && _selectedPlatformVoucher!.isNotEmpty ? 1 : 0) +
        _selectedStoreVouchers.values.where((v) => v.isNotEmpty).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      appBar: AppBar(
        title: const Text(
          'Chọn Voucher',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppColors.textPrimary),
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
            icon: const Icon(Icons.help_outline, size: 20, color: Colors.grey),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Top Input Code Card (Matching Image 2)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.grey.shade300, width: 0.8),
                    ),
                    child: TextField(
                      key: const Key('voucher_input_field'),
                      controller: _codeController,
                      style: const TextStyle(fontSize: 13),
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        hintText: 'Nhập mã voucher',
                        hintStyle: TextStyle(fontSize: 13, color: Colors.grey),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 40,
                  child: FilledButton(
                    key: const Key('voucher_apply_button'),
                    style: FilledButton.styleFrom(
                      backgroundColor: (_codeController.text.trim().isNotEmpty && !_isValidatingCode)
                          ? AppColors.primary
                          : Colors.grey.shade400,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
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
                        : const Text(
                            'Áp dụng',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ),

          // Voucher Lists
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 12),
              children: [
                // Section: Voucher đã chọn (Hiển thị lên đầu trang voucher)
                if (selectedVouchers.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
                    child: const Text(
                      'Voucher đã chọn',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  ...selectedVouchers.map((it) {
                    final v = it['voucher'] as Map<String, dynamic>? ?? {};
                    final isPlatform = (v['scope']?.toString() ?? 'PLATFORM').toUpperCase() == 'PLATFORM';
                    return _buildVoucherTicket(it, isPlatform: isPlatform);
                  }),
                  const SizedBox(height: 12),
                ],

                // Section 1: Ưu đãi toàn sàn
                if (unselectedPlatformVouchers.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
                    child: const Text(
                      'Ưu đãi toàn sàn',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  ...unselectedPlatformVouchers.map((it) => _buildVoucherTicket(it, isPlatform: true)),
                  const SizedBox(height: 12),
                ],

                // Section 2: Ưu đãi từ cửa hàng
                if (unselectedStoreVouchers.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                    child: const Text(
                      'Ưu đãi từ cửa hàng',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
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

          // Bottom Bar (Matching Image 2)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$selectedCount Voucher đã được chọn.',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        if (selectedCount > 0)
                          const Text(
                            'Đã áp dụng ưu đãi',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                  ),
                  SizedBox(
                    height: 44,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 32),
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
                        'Đồng ý',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.bold,
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
    final storeName = v['store_name']?.toString() ?? 'Cửa hàng';

    final discountType = v['discount_type']?.toString().toUpperCase() ?? 'FIXED';
    final discountValue = (v['discount_value'] as num?)?.toInt() ?? 0;
    final maxDiscount = (v['max_discount_vnd'] as num?)?.toInt();
    final minGoods = (v['min_goods_vnd'] as num?)?.toInt() ?? 0;
    final endsAt = v['ends_at']?.toString();

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

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 5.0),
      child: Opacity(
        opacity: eligible ? 1.0 : 0.65,
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
          borderRadius: BorderRadius.circular(8),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isSelected ? AppColors.primary : Colors.grey.shade200,
                width: isSelected ? 1.2 : 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: IntrinsicHeight(
              child: Row(
                children: [
                  // Left stub with App Orange color
                  Container(
                    width: 90,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(7),
                        bottomLeft: Radius.circular(7),
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isPlatform ? Icons.confirmation_num : Icons.storefront,
                          color: Colors.white,
                          size: 26,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isPlatform ? 'TOÀN SÀN' : 'STORE',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Right Ticket Details
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  discountTitle,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  code,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade700,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                if (!isPlatform && storeName.isNotEmpty) ...[
                                  const SizedBox(height: 1),
                                  Text(
                                    storeName,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey.shade500,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 2),
                                Text(
                                  'Đơn tối thiểu ${_formatPrice(minGoods)}',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'HSD: ${_formatVoucherDate(endsAt)} · Điều kiện',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                                if (!eligible && reason.isNotEmpty) ...[
                                  const SizedBox(height: 4),
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
                          const SizedBox(width: 8),

                          // Selection circle
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isSelected ? AppColors.primary : Colors.transparent,
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : (eligible ? Colors.grey.shade400 : Colors.grey.shade300),
                                width: 1.5,
                              ),
                            ),
                            child: isSelected
                                ? const Center(
                                    child: Icon(
                                      Icons.check,
                                      size: 14,
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

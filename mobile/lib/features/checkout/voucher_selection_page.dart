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
  });

  final List<Map<String, dynamic>> suggestedVouchers;
  final String? initialPlatformVoucher;
  final Map<String, String> initialStoreVouchers;
  final int payableTotal;

  @override
  State<VoucherSelectionPage> createState() => _VoucherSelectionPageState();
}

class _VoucherSelectionPageState extends State<VoucherSelectionPage> {
  late final TextEditingController _codeController;
  String? _selectedPlatformVoucher;
  late final Map<String, String> _selectedStoreVouchers;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController();
    _selectedPlatformVoucher = widget.initialPlatformVoucher;
    _selectedStoreVouchers = Map<String, String>.from(widget.initialStoreVouchers);
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

  void _applyTypedCode() {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;

    // Check if code matches any suggested voucher
    Map<String, dynamic>? match;
    for (final item in widget.suggestedVouchers) {
      final v = item['voucher'] as Map<String, dynamic>? ?? {};
      if (v['code']?.toString().toUpperCase() == code.toUpperCase()) {
        match = item;
        break;
      }
    }

    if (match != null) {
      final v = match['voucher'] as Map<String, dynamic>? ?? {};
      final scope = (v['scope']?.toString() ?? 'PLATFORM').toUpperCase();
      final storeId = v['store_id']?.toString() ?? '';

      setState(() {
        if (scope == 'PLATFORM') {
          _selectedPlatformVoucher = v['code']?.toString();
        } else {
          _selectedStoreVouchers[storeId] = v['code']?.toString() ?? '';
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã chọn mã ${v['code']}'),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 2),
        ),
      );
    } else {
      // Treat as manual platform voucher
      setState(() {
        _selectedPlatformVoucher = code.toUpperCase();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã áp dụng mã $code'),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final platformVouchers = widget.suggestedVouchers.where((it) {
      final v = it['voucher'] as Map<String, dynamic>? ?? {};
      return (v['scope']?.toString() ?? 'PLATFORM').toUpperCase() == 'PLATFORM';
    }).toList();

    final storeVouchers = widget.suggestedVouchers.where((it) {
      final v = it['voucher'] as Map<String, dynamic>? ?? {};
      return (v['scope']?.toString() ?? 'PLATFORM').toUpperCase() == 'STORE';
    }).toList();

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
                    style: FilledButton.styleFrom(
                      backgroundColor: _codeController.text.trim().isNotEmpty
                          ? AppColors.primary
                          : Colors.grey.shade400,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    onPressed: _codeController.text.trim().isNotEmpty
                        ? _applyTypedCode
                        : null,
                    child: const Text(
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
                // Section 1: Ưu đãi toàn sàn (Matching Image 2)
                if (platformVouchers.isNotEmpty) ...[
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
                  ...platformVouchers.map((it) => _buildVoucherTicket(it, isPlatform: true)),
                  const SizedBox(height: 12),
                ],

                // Section 2: Ưu đãi từ cửa hàng (Matching Image 2)
                if (storeVouchers.isNotEmpty) ...[
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
                  ...storeVouchers.map((it) => _buildVoucherTicket(it, isPlatform: false)),
                  const SizedBox(height: 16),
                ],
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

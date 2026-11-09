import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_notice_dialog.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import 'order_list_page.dart';

class OrderRefundPage extends ConsumerStatefulWidget {
  final Map<String, dynamic> order;

  const OrderRefundPage({super.key, required this.order});

  @override
  ConsumerState<OrderRefundPage> createState() => _OrderRefundPageState();
}

class _OrderRefundPageState extends ConsumerState<OrderRefundPage> {
  final Set<String> _selectedItemIds = {};
  final Map<String, int> _itemQuantities = {};
  String? _selectedReason;
  final TextEditingController _noteController = TextEditingController();
  final List<String> _evidencePhotos = [];
  bool _isSubmitting = false;

  final List<String> _refundReasons = const [
    'Chưa nhận được hàng',
    'Sản phẩm bị bể vỡ / hư hỏng do vận chuyển',
    'Sản phẩm không đúng mô tả / hình ảnh',
    'Nhận sai hàng / thiếu hàng phụ kiện',
    'Hàng lỗi / không hoạt động được',
    'Lý do khác',
  ];

  @override
  void initState() {
    super.initState();
    final items = _getItems();
    for (int i = 0; i < items.length; i++) {
      final it = items[i];
      final itemId = (it['id'] ?? 'item_$i').toString();
      _selectedItemIds.add(itemId);
      final qty = (it['quantity'] as num?)?.toInt() ?? 1;
      _itemQuantities[itemId] = qty;
    }
    _selectedReason = _refundReasons.first;
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _getItems() {
    final raw = (widget.order['items'] as List?) ?? [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  String _formatPrice(num price) {
    final str = price.toInt().toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(str[i]);
    }
    return '${buffer.toString()} đ';
  }

  int _calculateTotalRefund() {
    final items = _getItems();
    int total = 0;
    for (int i = 0; i < items.length; i++) {
      final it = items[i];
      final itemId = (it['id'] ?? 'item_$i').toString();
      if (_selectedItemIds.contains(itemId)) {
        final price = (it['price_vnd'] as num?)?.toInt() ??
            (it['unit_price_vnd'] as num?)?.toInt() ??
            0;
        final qty = _itemQuantities[itemId] ?? 1;
        total += price * qty;
      }
    }
    return total;
  }

  String _extractTitle(Map<String, dynamic> it) {
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

  String _extractSku(Map<String, dynamic> it) {
    final sku = it['sku_snapshot'] ?? it['sku'] ?? it['variant_sku'] ?? it['variant_title'];
    if (sku != null && sku.toString().trim().isNotEmpty) {
      return sku.toString().trim();
    }
    return 'Mặc định';
  }

  Future<void> _handleSubmitRefund() async {
    if (_selectedItemIds.isEmpty) {
      AppNoticeDialog.show(
        context,
        message: 'Vui lòng chọn ít nhất 1 sản phẩm bạn muốn trả hàng/hoàn tiền.',
        buttonText: 'Đã hiểu',
      );
      return;
    }

    if (_selectedReason == null || _selectedReason!.isEmpty) {
      AppNoticeDialog.show(
        context,
        message: 'Vui lòng chọn lý do trả hàng/hoàn tiền.',
        buttonText: 'Đã hiểu',
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final client = ref.read(apiProvider);
      final orderId = (widget.order['id'] ?? '').toString();
      final totalAmount = _calculateTotalRefund();

      final selectedItemsPayload = <Map<String, dynamic>>[];
      final items = _getItems();
      for (int i = 0; i < items.length; i++) {
        final it = items[i];
        final itemId = (it['id'] ?? 'item_$i').toString();
        if (_selectedItemIds.contains(itemId)) {
          selectedItemsPayload.add({
            'order_item_id': itemId,
            'quantity': _itemQuantities[itemId] ?? 1,
            'variant_id': it['variant_id'],
            'product_id': it['product_id'],
          });
        }
      }

      await client.requestOrderRefund(
        orderId: orderId,
        reason: _selectedReason!,
        amountVnd: totalAmount,
        items: selectedItemsPayload,
        note: _noteController.text.trim(),
      );

      if (!mounted) return;

      ref.invalidate(customerOrdersProvider);

      setState(() => _isSubmitting = false);

      await AppNoticeDialog.show(
        context,
        message:
            'Yêu cầu trả hàng/hoàn tiền của bạn đã được gửi thành công. Hệ thống và người bán sẽ xử lý trong vòng 24 - 48 giờ.',
        buttonText: 'Đã hiểu',
      );

      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: 'Không thể gửi yêu cầu: $e',
          buttonText: 'Đóng',
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final orderId = (order['id'] ?? '').toString();
    final shortOrderId = orderId.length > 8 ? orderId.substring(0, 8) : orderId;
    final storeName = order['store_name']?.toString() ?? 'Gian hàng đối tác';
    final items = _getItems();
    final totalRefund = _calculateTotalRefund();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Trả hàng / Hoàn tiền',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order and Store info card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.storefront,
                      size: 20,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          storeName,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Mã đơn hàng: #$shortOrderId',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Products to refund
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Chọn sản phẩm hoàn trả',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        '${_selectedItemIds.length}/${items.length} đã chọn',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFF3F4F6)),
                  ...items.asMap().entries.map((entry) {
                    final index = entry.key;
                    final it = entry.value;
                    final itemId = (it['id'] ?? 'item_$index').toString();
                    final isChecked = _selectedItemIds.contains(itemId);
                    final title = _extractTitle(it);
                    final sku = _extractSku(it);
                    final maxQty = (it['quantity'] as num?)?.toInt() ?? 1;
                    final selectedQty = _itemQuantities[itemId] ?? 1;
                    final price = (it['price_vnd'] as num?)?.toInt() ??
                        (it['unit_price_vnd'] as num?)?.toInt() ??
                        0;
                    final productId = (it['product_id'] ?? '').toString();
                    final directImg = it['image_url']?.toString() ??
                        (it['product_snapshot'] is Map
                            ? (it['product_snapshot'] as Map)['image_url']?.toString()
                            : null);

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Checkbox(
                            value: isChecked,
                            activeColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                            onChanged: (val) {
                              setState(() {
                                if (val == true) {
                                  _selectedItemIds.add(itemId);
                                } else {
                                  _selectedItemIds.remove(itemId);
                                }
                              });
                            },
                          ),
                          Consumer(
                            builder: (context, ref, _) {
                              final liveImg = ref
                                  .watch(productThumbnailProvider(productId))
                                  .value;
                              final imgUrl = directImg ?? liveImg;
                              return ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  width: 52,
                                  height: 52,
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
                                Text(
                                  'Phân loại: $sku',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _formatPrice(price),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                    if (maxQty > 1)
                                      Row(
                                        children: [
                                          IconButton(
                                            visualDensity: VisualDensity.compact,
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(
                                              minWidth: 26,
                                              minHeight: 26,
                                            ),
                                            icon: const Icon(Icons.remove, size: 16),
                                            onPressed: selectedQty > 1
                                                ? () {
                                                    setState(() {
                                                      _itemQuantities[itemId] = selectedQty - 1;
                                                    });
                                                  }
                                                : null,
                                          ),
                                          Text(
                                            '$selectedQty',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          IconButton(
                                            visualDensity: VisualDensity.compact,
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(
                                              minWidth: 26,
                                              minHeight: 26,
                                            ),
                                            icon: const Icon(Icons.add, size: 16),
                                            onPressed: selectedQty < maxQty
                                                ? () {
                                                    setState(() {
                                                      _itemQuantities[itemId] = selectedQty + 1;
                                                    });
                                                  }
                                                : null,
                                          ),
                                        ],
                                      )
                                    else
                                      Text(
                                        'x$maxQty',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade700,
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
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Reason selector
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Text(
                        'Lý do Trả hàng / Hoàn tiền',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        ' *',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFD1D5DB)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _selectedReason,
                        icon: const Icon(Icons.keyboard_arrow_down),
                        items: _refundReasons.map((reason) {
                          return DropdownMenuItem<String>(
                            value: reason,
                            child: Text(
                              reason,
                              style: const TextStyle(
                                fontSize: 13.5,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedReason = val);
                          }
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Refund Amount Summary
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Thông tin hoàn tiền',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Số tiền hoàn lại:',
                        style: TextStyle(
                          fontSize: 13.5,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        _formatPrice(totalRefund),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Hoàn tiền về phương thức thanh toán ban đầu hoặc số dư ví PBL6.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Note / Description
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Mô tả chi tiết',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _noteController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Nhập thêm chi tiết về tình trạng sản phẩm hoặc vấn đề gặp phải...',
                      hintStyle: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade400,
                      ),
                      contentPadding: const EdgeInsets.all(12),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: AppColors.primary),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Photo Evidence
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Hình ảnh bằng chứng',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        '${_evidencePhotos.length}/3 ảnh',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      ..._evidencePhotos.asMap().entries.map((entry) {
                        final idx = entry.key;
                        return Stack(
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              margin: const EdgeInsets.only(right: 10),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFE5E7EB)),
                              ),
                              child: const Icon(
                                Icons.image,
                                color: Colors.grey,
                                size: 30,
                              ),
                            ),
                            Positioned(
                              top: 2,
                              right: 12,
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _evidencePhotos.removeAt(idx);
                                  });
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: const BoxDecoration(
                                    color: Colors.black54,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.close,
                                    size: 12,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        );
                      }),
                      if (_evidencePhotos.length < 3)
                        InkWell(
                          onTap: () {
                            setState(() {
                              _evidencePhotos.add('proof_${_evidencePhotos.length + 1}.jpg');
                            });
                          },
                          child: Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF9FAFB),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: const Color(0xFFD1D5DB),
                                style: BorderStyle.solid,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(
                                  Icons.camera_alt_outlined,
                                  size: 22,
                                  color: Colors.grey,
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Thêm ảnh',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    color: Colors.grey,
                                  ),
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
            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: _isSubmitting ? null : _handleSubmitRefund,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Gửi yêu cầu',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

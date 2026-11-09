import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../catalog/shop_page.dart';
import 'order_list_page.dart';

class OrderDetailPage extends ConsumerStatefulWidget {
  const OrderDetailPage({
    super.key,
    required this.orderId,
    this.initialOrder,
  });

  final String orderId;
  final Map<String, dynamic>? initialOrder;

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage> {
  Map<String, dynamic>? _order;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _order = widget.initialOrder;
    _fetchOrder();
  }

  Future<void> _fetchOrder() async {
    if (_order == null) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final client = ref.read(apiProvider);
      final res = await client.getOwnOrder(widget.orderId);
      if (res['status'] == 'CANCELLED' || res['refund_status'] != null) {
        final refund = await client.getOrderRefund(widget.orderId);
        if (refund != null) {
          if (refund['status'] != null) {
            res['refund_status'] = refund['status'];
          }
          if (refund['amount_vnd'] != null) {
            res['refunded_vnd'] = refund['amount_vnd'];
          }
        }
      }
      if (mounted) {
        setState(() {
          _order = {
            if (widget.initialOrder != null) ...widget.initialOrder!,
            ...res,
          };
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          if (_order == null) {
            _error = errorMessage(e);
          }
        });
      }
    }
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

  int _getTimelineStep(String status) {
    switch (status.toUpperCase()) {
      case 'AWAITING_PAYMENT':
      case 'CREATED':
      case 'PENDING':
        return 1;
      case 'CONFIRMED':
      case 'PROCESSING':
        return 2;
      case 'SHIPPED':
        return 3;
      case 'COMPLETED':
        return 4;
      case 'CANCELLED':
      case 'EXPIRED':
        return -1;
      default:
        return 1;
    }
  }

  String _statusDescription(String status) {
    switch (status.toUpperCase()) {
      case 'AWAITING_PAYMENT':
        return 'Đơn hàng đang chờ thanh toán trực tuyến qua cổng Sandbox.';
      case 'CREATED':
      case 'PENDING':
        return 'Đơn hàng đã được đặt, đang chờ người bán xác nhận.';
      case 'CONFIRMED':
      case 'PROCESSING':
        return 'Người bán đang chuẩn bị đóng gói hàng để giao.';
      case 'SHIPPED':
        return 'Đơn hàng đang trên đường vận chuyển đến bạn.';
      case 'COMPLETED':
        return 'Đơn hàng đã được giao thành công.';
      case 'EXPIRED':
        return 'Đơn hàng đã hết hạn thanh toán giữ hàng.';
      case 'CANCELLED':
        return 'Đơn hàng đã bị hủy.';
      default:
        return 'Đang cập nhật trạng thái đơn hàng.';
    }
  }

  String _statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'AWAITING_PAYMENT':
        return 'Chờ thanh toán';
      case 'PENDING':
      case 'CREATED':
        return 'Chờ gian hàng xác nhận';
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'PROCESSING':
        return 'Đang chuẩn bị hàng';
      case 'SHIPPED':
        return 'Đang giao hàng';
      case 'COMPLETED':
        return 'Hoàn tất';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'EXPIRED':
        return 'Hết hạn';
      case 'RECOVERING':
        return 'Đang đối soát';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
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
        title: const Text(
          'Chi tiết đơn hàng',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomActionBar(),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _error != null
              ? Center(
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
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.primary),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                          ),
                          onPressed: _fetchOrder,
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  ),
                )
              : _order == null
                  ? const Center(child: Text('Không tìm thấy thông tin đơn hàng.'))
                  : RefreshIndicator(
                      onRefresh: _fetchOrder,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 1. Status & Timeline Header
                            _buildStatusHeaderCard(),

                            // Sandbox Payment Banner (if waiting for payment)
                            _buildSandboxPaymentBanner(),

                            // Shipment Details Card (if shipped / tracked)
                            _buildShipmentCard(),

                            const SizedBox(height: 14),

                            // 2. Shipping Address Card
                            _buildAddressCard(),

                            const SizedBox(height: 14),

                            // 3. Store & Products Card
                            _buildStoreProductsCard(),

                            const SizedBox(height: 14),

                            // 4. Payment Information Card
                            _buildPaymentInfoCard(),

                            const SizedBox(height: 14),

                            // Refund Information Card (if cancelled with refund or has refund_status)
                            if (_order!['refund_status'] != null ||
                                (_order!['status'] == 'CANCELLED' && _order!['payment_method'] == 'SANDBOX') ||
                                (_order!['refunded_vnd'] != null && (_order!['refunded_vnd'] as num) > 0)) ...[
                              _buildRefundInfoCard(),
                              const SizedBox(height: 14),
                            ],

                            // 5. Billing Summary Card
                            _buildBillingSummaryCard(),

                            const SizedBox(height: 14),

                            // Status History Card
                            _buildStatusHistoryCard(),

                            // 6. Order Metadata Card
                            _buildOrderMetadataCard(),

                            const SizedBox(height: 32),
                          ],
                        ),
                      ),
                    ),
    );
  }

  Widget _buildStatusHeaderCard() {
    final status = _order!['status']?.toString() ?? 'PENDING';
    final step = _getTimelineStep(status);
    final isCancelled = step == -1;

    return Container(
      width: double.infinity,
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
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isCancelled
                      ? Icons.cancel
                      : (step == 4 ? Icons.check_circle : Icons.local_shipping),
                  color: isCancelled
                      ? Colors.red
                      : (step == 4 ? Colors.green : AppColors.primary),
                  size: 24,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isCancelled
                            ? 'Đã hủy đơn hàng'
                            : (step == 4
                                ? 'Giao hàng thành công'
                                : (step == 3
                                    ? 'Đang vận chuyển'
                                    : (step == 2
                                        ? 'Đang chuẩn bị hàng'
                                        : 'Đang chờ xác nhận'))),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isCancelled ? Colors.red : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _statusDescription(status),
                        style: TextStyle(
                          fontSize: 12.5,
                          color: Colors.grey.shade600,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (!isCancelled) ...[
              const Divider(height: 24, color: Color(0xFFF1F3F5)),
              _buildTimelineStepper(step),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineStepper(int currentStep) {
    final steps = ['Đặt đơn', 'Xác nhận', 'Đang giao', 'Hoàn thành'];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(steps.length, (index) {
        final stepNum = index + 1;
        final isPassed = currentStep >= stepNum;
        final isCurrent = currentStep == stepNum;

        return Expanded(
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 2.5,
                      color: index == 0
                          ? Colors.transparent
                          : (currentStep >= stepNum
                              ? AppColors.primary
                              : Colors.grey.shade200),
                    ),
                  ),
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: isPassed ? AppColors.primary : Colors.grey.shade200,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: isPassed
                          ? const Icon(
                              Icons.check,
                              color: Colors.white,
                              size: 13,
                            )
                          : Text(
                              '$stepNum',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                  Expanded(
                    child: Container(
                      height: 2.5,
                      color: index == steps.length - 1
                          ? Colors.transparent
                          : (currentStep > stepNum
                              ? AppColors.primary
                              : Colors.grey.shade200),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                steps[index],
                style: TextStyle(
                  fontSize: 11,
                  fontWeight:
                      isCurrent ? FontWeight.bold : FontWeight.normal,
                  color: isPassed ? AppColors.textPrimary : Colors.grey.shade500,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildAddressCard() {
    final address = _order!['address'] as Map? ?? _order!['shipping_address'] as Map?;
    final recipient = address?['recipient_name']?.toString() ?? 'Khách hàng';
    final phone = address?['phone']?.toString() ?? '09xxxxxxxx';
    final line1 = address?['line1'] ?? address?['street'] ?? 'Địa chỉ mặc định';
    final ward = address?['ward'] ?? '';
    final district = address?['district'] ?? '';
    final city = address?['city'] ?? address?['province'] ?? '';
    final fullAddress = [line1, ward, district, city]
        .where((s) => s.toString().trim().isNotEmpty)
        .join(', ');

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
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF0F0),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.location_on,
                      color: AppColors.primary,
                      size: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Địa chỉ nhận hàng',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14.5,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              '$recipient • $phone',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13.5,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              fullAddress.isNotEmpty ? fullAddress : 'Địa chỉ giao hàng đã lưu',
              style: TextStyle(
                fontSize: 12.5,
                color: Colors.grey.shade700,
                height: 1.3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStoreProductsCard() {
    final storeId = _order!['store_id']?.toString() ?? '';
    final shortStoreId = storeId.length > 8 ? storeId.substring(0, 8) : storeId;
    final storeName = _order!['store_name']?.toString() ?? 'Cửa hàng $shortStoreId';
    final items = ((_order!['items'] as List?) ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

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
            // Store header
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
                  child: Text(
                    storeName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14.5,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (storeId.isNotEmpty)
                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ShopPage(shopId: storeId),
                        ),
                      );
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Text(
                          'Xem Shop',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
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
            const Divider(height: 18, color: Color(0xFFF1F3F5)),

            // Items
            ...items.map((it) {
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
                padding: const EdgeInsets.symmetric(vertical: 6.0),
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
                            width: 60,
                            height: 60,
                            color: Colors.grey.shade100,
                            child: imgUrl != null && imgUrl.isNotEmpty
                                ? Image.network(
                                    imgUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (ctx, _, _) => const Center(
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
                    const SizedBox(width: 12),
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
                              height: 1.25,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Phân loại: $sku',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Colors.grey.shade500,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'x$qty',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: Colors.grey.shade700,
                                ),
                              ),
                              Text(
                                _formatPrice(price),
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
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
    );
  }

  Widget _buildPaymentInfoCard() {
    final method = _order!['payment_method']?.toString() ?? 'COD';
    final paymentStatus = _order!['payment_status']?.toString();
    final refundStatus = _order!['refund_status']?.toString();

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
            const Divider(height: 18, color: Color(0xFFF1F3F5)),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  method == 'SANDBOX'
                      ? 'Thanh toán trực tuyến (Sandbox)'
                      : 'Thanh toán khi nhận hàng (COD)',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (paymentStatus != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: paymentStatus == 'SUCCEEDED'
                          ? Colors.green.shade50
                          : Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      paymentStatus == 'SUCCEEDED'
                          ? 'Đã thanh toán'
                          : 'Chưa thanh toán',
                      style: TextStyle(
                        fontSize: 11,
                        color: paymentStatus == 'SUCCEEDED'
                            ? Colors.green.shade700
                            : Colors.orange.shade800,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            if (refundStatus != null && refundStatus.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: refundStatus == 'SUCCEEDED'
                      ? Colors.green.shade50
                      : Colors.purple.shade50,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: refundStatus == 'SUCCEEDED'
                        ? Colors.green.shade200
                        : Colors.purple.shade200,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      refundStatus == 'SUCCEEDED'
                          ? Icons.check_circle_outline
                          : Icons.restore,
                      size: 16,
                      color: refundStatus == 'SUCCEEDED'
                          ? Colors.green.shade700
                          : Colors.purple.shade700,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        refundStatus == 'SUCCEEDED'
                            ? 'Đã hoàn tiền thành công.'
                            : 'Trạng thái hoàn tiền: $refundStatus (Đang đối soát)',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: refundStatus == 'SUCCEEDED'
                              ? Colors.green.shade800
                              : Colors.purple.shade800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRefundInfoCard() {
    final refundStatus = _order!['refund_status']?.toString() ?? 'REQUESTED';
    final refundedVnd = (_order!['refunded_vnd'] as num?)?.toInt() ??
        ((_order!['amounts'] as Map?)?['payable_vnd'] as num?)?.toInt() ??
        0;
    final isSuccess = refundStatus == 'SUCCEEDED';
    final isProcessing = refundStatus == 'PROCESSING' || refundStatus == 'REQUESTED';

    return Container(
      decoration: BoxDecoration(
        color: isSuccess ? const Color(0xFFF0FDF4) : const Color(0xFFFAF5FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSuccess ? const Color(0xFFBBF7D0) : const Color(0xFFE9D5FF),
          width: 1,
        ),
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
                Icon(
                  isSuccess ? Icons.check_circle_outline : Icons.restore,
                  color: isSuccess ? const Color(0xFF16A34A) : const Color(0xFF9333EA),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Thông tin hoàn tiền',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14.5,
                    color: isSuccess ? const Color(0xFF15803D) : const Color(0xFF7E22CE),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isSuccess ? const Color(0xFFDCFCE7) : const Color(0xFFF3E8FF),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: isSuccess ? const Color(0xFF86EFAC) : const Color(0xFFD8B4FE),
                    ),
                  ),
                  child: Text(
                    isSuccess ? 'ĐÃ HOÀN TIỀN' : (isProcessing ? 'ĐANG XỬ LÝ' : refundStatus),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isSuccess ? const Color(0xFF16A34A) : const Color(0xFF9333EA),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Số tiền hoàn:',
                  style: TextStyle(fontSize: 13, color: Color(0xFF4B5563)),
                ),
                Text(
                  _formatPrice(refundedVnd),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isSuccess ? const Color(0xFF16A34A) : const Color(0xFF7E22CE),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              isSuccess
                  ? 'Tiền hoàn đã được chuyển về tài khoản thanh toán của bạn.'
                  : (refundStatus == 'REQUESTED'
                      ? 'Chưa xác nhận hoàn tiền. Trạng thái yêu cầu: REQUESTED. Hệ thống đang tiến hành xử lý hoàn tiền tự động.'
                      : 'Yêu cầu hoàn tiền đang được cổng thanh toán đối soát.'),
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF6B7280),
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBillingSummaryCard() {
    final amounts = _order!['amounts'] as Map?;
    final goods = (amounts?['goods_vnd'] as num?)?.toInt() ?? 0;
    final shipping = (amounts?['shipping_vnd'] as num?)?.toInt() ?? 0;
    final storeVoucher =
        (amounts?['store_discount_vnd'] as num?)?.toInt() ?? 0;
    final platformVoucher =
        (amounts?['platform_discount_vnd'] as num?)?.toInt() ?? 0;
    final totalPayable = (amounts?['payable_vnd'] as num?)?.toInt() ?? goods;

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
              'Chi tiết thanh toán',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14.5,
                color: AppColors.textPrimary,
              ),
            ),
            const Divider(height: 18, color: Color(0xFFF1F3F5)),
            _buildPriceRow('Tổng tiền hàng', _formatPrice(goods)),
            _buildPriceRow('Phí vận chuyển', '+${_formatPrice(shipping)}'),
            if (storeVoucher > 0)
              _buildPriceRow(
                'Voucher giảm giá shop',
                '-${_formatPrice(storeVoucher)}',
                isDiscount: true,
              ),
            if (platformVoucher > 0)
              _buildPriceRow(
                'Voucher toàn sàn',
                '-${_formatPrice(platformVoucher)}',
                isDiscount: true,
              ),
            const Divider(height: 18, color: Color(0xFFF1F3F5)),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tổng số tiền',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  _formatPrice(totalPayable),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isDiscount = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12.5,
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: isDiscount ? Colors.green : AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderMetadataCard() {
    final orderId = _order!['id']?.toString() ?? widget.orderId;
    final purchaseGroupId = _order!['purchase_group_id']?.toString() ?? 'N/A';
    final createdAt = _order!['created_at']?.toString() ?? '';

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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Mã đơn hàng',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: orderId));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Đã sao chép mã đơn hàng.'),
                        duration: Duration(seconds: 1),
                      ),
                    );
                  },
                  child: Row(
                    children: [
                      Text(
                        orderId.length > 16
                            ? '${orderId.substring(0, 16)}...'
                            : orderId,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.copy, size: 14, color: AppColors.primary),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Mã nhóm mua sắm',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                Text(
                  purchaseGroupId.length > 16
                      ? '${purchaseGroupId.substring(0, 16)}...'
                      : purchaseGroupId,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            if (createdAt.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Thời gian đặt hàng',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Text(
                    createdAt,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget? _buildBottomActionBar() {
    if (_order == null) return null;
    final status = _order!['status']?.toString() ?? '';
    final isCancellable = ['CREATED', 'AWAITING_PAYMENT', 'PENDING', 'CONFIRMED']
        .contains(status.toUpperCase());
    final isCompleted = status.toUpperCase() == 'COMPLETED';
    final method =
        _order!['payment_method']?.toString().toUpperCase() ?? 'COD';
    final isAwaitingSandbox =
        status.toUpperCase() == 'AWAITING_PAYMENT' && method == 'SANDBOX';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200, width: 0.8)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            if (isAwaitingSandbox) ...[
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                icon: const Icon(Icons.credit_card, size: 16),
                label: const Text(
                  'Thanh toán Sandbox',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                onPressed: _openSandboxPaymentDialog,
              ),
              const SizedBox(width: 10),
            ],
            if (isCancellable) ...[
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red, width: 0.8),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: _showCancelOrderDialog,
                child: const Text(
                  'Hủy đơn hàng',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 10),
            ],
            if (isCompleted) ...[
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 0.8),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: _showRatingDialog,
                child: const Text(
                  'Đánh giá',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 10),
            ],
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: () {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/',
                  (route) => false,
                );
              },
              child: const Text(
                'Mua lại',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showCancelOrderDialog() async {
    final orderId = _order!['id']?.toString() ?? widget.orderId;
    final version = (_order!['version'] as num?)?.toInt() ?? 0;
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
                          'Hủy đơn hàng',
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
      await _fetchOrder();
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

  void _showRatingDialog() {
    int rating = 5;
    final commentCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: const Text(
                'Đánh giá sản phẩm',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Bạn cảm thấy chất lượng sản phẩm và dịch vụ thế nào?',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: Colors.grey),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (idx) {
                      final star = idx + 1;
                      return IconButton(
                        icon: Icon(
                          star <= rating ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                          size: 32,
                        ),
                        onPressed: () {
                          setDialogState(() => rating = star);
                        },
                      );
                    }),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: commentCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Hãy chia sẻ cảm nhận của bạn về sản phẩm...',
                      hintStyle: TextStyle(fontSize: 12.5),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Hủy'),
                ),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Cảm ơn bạn đã gửi đánh giá!'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  },
                  child: const Text('Gửi đánh giá'),
                ),
              ],
            );
          },
        );
      },
    );
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

  String _extractItemSku(Map<String, dynamic> it) {
    final sku = it['sku_snapshot'] ?? it['sku'] ?? it['variant_sku'] ?? it['variant_title'];
    if (sku != null && sku.toString().trim().isNotEmpty) {
      return sku.toString().trim();
    }
    return 'Mặc định';
  }

  Widget _buildSandboxPaymentBanner() {
    if (_order == null) return const SizedBox.shrink();
    final status = _order!['status']?.toString().toUpperCase() ?? '';
    final method = _order!['payment_method']?.toString().toUpperCase() ?? 'COD';

    if (status != 'AWAITING_PAYMENT' || method != 'SANDBOX') {
      return const SizedBox.shrink();
    }

    final amounts = _order!['amounts'] as Map?;
    final payableVnd = (amounts?['payable_vnd'] as num?)?.toInt() ?? 0;

    return Container(
      margin: const EdgeInsets.only(top: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF86EFAC), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.green.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.credit_card, color: Color(0xFF166534), size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Chờ thanh toán Sandbox',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14.5,
                        color: Color(0xFF166534),
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Vui lòng thanh toán trực tuyến để gian hàng tiến hành chuẩn bị đơn.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF15803D)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Cần trả: ${_formatPrice(payableVnd)}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13.5,
                  color: Color(0xFF166534),
                ),
              ),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.payment, size: 16),
                label: const Text('Thanh toán ngay', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                onPressed: _openSandboxPaymentDialog,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _openSandboxPaymentDialog() async {
    if (_order == null) return;
    final orderId = _order!['id']?.toString() ?? widget.orderId;
    final version = (_order!['version'] as num?)?.toInt() ?? 1;
    final amounts = _order!['amounts'] as Map?;
    final payableVnd = (amounts?['payable_vnd'] as num?)?.toInt() ?? 0;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return FutureBuilder<Map<String, dynamic>>(
              future: ref.read(apiProvider).createPaymentAttempt(
                    orderId,
                    expectedOrderVersion: version,
                  ),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return Container(
                    height: 240,
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        CircularProgressIndicator(),
                        SizedBox(height: 12),
                        Text('Đang tạo mã thanh toán Sandbox...'),
                      ],
                    ),
                  );
                }

                if (snapshot.hasError) {
                  return Container(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        const Text(
                          'Không thể tạo mã thanh toán',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          errorMessage(snapshot.error ?? ''),
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Đóng'),
                        ),
                      ],
                    ),
                  );
                }

                final attempt = snapshot.data ?? {};
                final qrUrl = attempt['qr_url']?.toString();
                final paymentCode = attempt['payment_code']?.toString() ?? 'PAY-$orderId';

                return Padding(
                  padding: EdgeInsets.only(
                    bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                    left: 20,
                    right: 20,
                    top: 20,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.credit_card, color: AppColors.primary),
                              SizedBox(width: 8),
                              Text(
                                'Cổng Sandbox Gateway',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      if (qrUrl != null && qrUrl.isNotEmpty) ...[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            qrUrl,
                            width: 180,
                            height: 180,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 180,
                              height: 180,
                              color: Colors.grey.shade200,
                              child: const Icon(Icons.qr_code, size: 80, color: Colors.grey),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Nội dung chuyển khoản:', style: TextStyle(fontSize: 12.5)),
                            Text(
                              paymentCode,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Số tiền thanh toán:', style: TextStyle(fontSize: 12.5)),
                            Text(
                              _formatPrice(payableVnd),
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.green.shade800),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          minimumSize: const Size(double.infinity, 44),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () async {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Đang làm mới trạng thái đơn hàng...')),
                          );
                          await _fetchOrder();
                          ref.invalidate(customerOrdersProvider);
                        },
                        child: const Text('Kiểm tra trạng thái thanh toán', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildShipmentCard() {
    if (_order == null) return const SizedBox.shrink();
    final shipment = _order!['shipment'] as Map?;
    final trackingCode =
        shipment?['tracking_code']?.toString() ?? _order!['tracking_code']?.toString();
    final carrierName = shipment?['carrier_name']?.toString() ??
        _order!['carrier_name']?.toString() ??
        'Đơn vị vận chuyển tiêu chuẩn';
    final shippedAt = shipment?['shipped_at'] ?? _order!['shipped_at'];
    final note = shipment?['dispatch_note']?.toString() ??
        shipment?['delivery_note']?.toString();
    final status = _order!['status']?.toString().toUpperCase() ?? '';

    final hasShipmentInfo = trackingCode != null ||
        shippedAt != null ||
        status == 'SHIPPED' ||
        status == 'COMPLETED';
    if (!hasShipmentInfo) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(top: 14),
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
                Icon(
                  Icons.local_shipping_outlined,
                  size: 20,
                  color: AppColors.primary,
                ),
                SizedBox(width: 8),
                Text(
                  'Thông tin vận chuyển',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14.5,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Đơn vị vận chuyển',
                  style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                ),
                Text(
                  carrierName,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            if (trackingCode != null && trackingCode.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Mã vận đơn',
                    style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                  ),
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: trackingCode));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Đã sao chép mã vận đơn.'),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                    child: Row(
                      children: [
                        Text(
                          trackingCode,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.copy, size: 14, color: AppColors.primary),
                      ],
                    ),
                  ),
                ],
              ),
            ],
            if (shippedAt != null) ...[
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Thời gian xuất kho',
                    style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                  ),
                  Text(
                    _formatDate(shippedAt),
                    style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                  ),
                ],
              ),
            ],
            if (note != null && note.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Ghi chú giao hàng',
                    style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                  ),
                  Text(
                    note,
                    style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHistoryCard() {
    if (_order == null) return const SizedBox.shrink();
    final rawHistory = _order!['status_history'] ?? _order!['timeline'];
    if (rawHistory is! List || rawHistory.isEmpty) return const SizedBox.shrink();

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
              'Lịch sử trạng thái',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14.5,
                color: AppColors.textPrimary,
              ),
            ),
            const Divider(height: 18, color: Color(0xFFF1F3F5)),
            ...rawHistory.map((item) {
              final map = item is Map ? item : <String, dynamic>{};
              final toStatus =
                  map['to_status']?.toString() ?? map['status']?.toString() ?? '';
              final reason = map['reason']?.toString();
              final createdAt = map['created_at'];

              return Padding(
                padding: const EdgeInsets.only(bottom: 10.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 3),
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _statusLabel(toStatus),
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (reason != null && reason.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                'Lý do: $reason',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ),
                          if (createdAt != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                _formatDate(createdAt),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade400,
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
          ],
        ),
      ),
    );
  }

  String _formatDate(dynamic value) {
    if (value == null) return '';
    try {
      final dt = value is DateTime ? value : DateTime.parse(value.toString());
      final local = dt.toLocal();
      final day = local.day.toString().padLeft(2, '0');
      final month = local.month.toString().padLeft(2, '0');
      final year = local.year.toString();
      final hour = local.hour.toString().padLeft(2, '0');
      final min = local.minute.toString().padLeft(2, '0');
      return '$day/$month/$year $hour:$min';
    } catch (_) {
      return value.toString();
    }
  }
}

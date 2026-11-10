import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';

class OrderSuccessPage extends StatelessWidget {
  const OrderSuccessPage({super.key, required this.orderBatch});
  final Map<String, dynamic> orderBatch;

  static String _formatPrice(dynamic price) {
    if (price == null || price == '---') return '---';
    final numVal = (price is num) ? price.toInt() : int.tryParse(price.toString());
    if (numVal == null) return '$price đ';
    final s = numVal.toString();
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
    final purchaseGroupId =
        orderBatch['purchase_group_id']?.toString() ?? 'N/A';
    final orders =
        (orderBatch['orders'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];
    final orderIds =
        (orderBatch['order_ids'] as List?)?.map((e) => e.toString()).toList() ??
        [];
    final totalVnd = (orderBatch['payable_total_vnd'] as num?)?.toInt() ?? 0;

    final hasSepay = orders.any((o) {
      final raw = o['payment_method']?.toString().toUpperCase() ?? '';
      return raw == 'SANDBOX' || raw == 'SEPAY';
    }) ||
    orderBatch['payment_method']?.toString().toUpperCase() == 'SANDBOX' ||
    orderBatch['payment_method']?.toString().toUpperCase() == 'SEPAY' ||
    (orderBatch['payment_methods'] is Map &&
        (orderBatch['payment_methods'] as Map).values.any((m) {
          final s = m.toString().toUpperCase();
          return s == 'SANDBOX' || s == 'SEPAY';
        }));

    final rawRef = purchaseGroupId != 'N/A' && purchaseGroupId.isNotEmpty
        ? purchaseGroupId.replaceAll('-', '').toUpperCase()
        : (orders.isNotEmpty && orders.first['id'] != null
            ? orders.first['id'].toString().replaceAll('-', '').toUpperCase()
            : 'ORDER$totalVnd');
    final transferCode =
        'PBL6${rawRef.substring(0, rawRef.length > 8 ? 8 : rawRef.length)}';
    final qrUrl = orderBatch['qr_url']?.toString() ??
        'https://qr.sepay.vn/img?acc=0900000000&bank=MBBank&amount=$totalVnd&des=$transferCode&template=compact';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Đặt hàng thành công'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            key: const Key('order_success_cart_button'),
            icon: const Icon(Icons.arrow_back_ios_new, size: 20),
            tooltip: 'Giỏ hàng',
            onPressed: () {
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/cart',
                (route) => false,
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                size: 72,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Cảm ơn bạn đã đặt hàng!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Đơn hàng của bạn đã được ghi nhận thành công',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade700, fontSize: 14),
            ),
            const SizedBox(height: 20),

            // Purchase Group Card
            Card(
              elevation: 0,
              color: AppColors.primaryLight.withAlpha(70),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: AppColors.primary.withAlpha(40)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Tổng tiền thanh toán:',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      _formatPrice(totalVnd),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (hasSepay) ...[
              const SizedBox(height: 16),
              Container(
                key: const Key('sepay_qr_section'),
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFD6E4FF), width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blue.withAlpha(12),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE6F7FF),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF91D5FF)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.qr_code_2, size: 18, color: Color(0xFF1890FF)),
                          SizedBox(width: 6),
                          Text(
                            'Thanh toán SePay QR',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF096DD9),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Quét mã QR để thanh toán',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF222222),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Sử dụng App Ngân hàng hoặc Ví điện tử quét mã VietQR',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),

                    // QR Frame
                    Container(
                      width: 220,
                      height: 220,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1890FF), width: 1.8),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blue.withAlpha(25),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          qrUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (ctx, err, stack) => Image.network(
                            'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=SEPAY_$transferCode',
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.qr_code_2, size: 85, color: Color(0xFF1890FF)),
                                  const SizedBox(height: 6),
                                  Text(
                                    transferCode,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Payment details
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFEEEEEE)),
                      ),
                      child: Column(
                        children: [
                          _buildDetailRow(context, 'Ngân hàng:', 'MBBank (Quân Đội)'),
                          const Divider(height: 14, color: Color(0xFFEBEBEB)),
                          _buildDetailRow(
                            context,
                            'Số tài khoản:',
                            '0900000000',
                            isCopyable: true,
                          ),
                          const Divider(height: 14, color: Color(0xFFEBEBEB)),
                          _buildDetailRow(context, 'Chủ tài khoản:', 'PBL6 E-COMMERCE'),
                          const Divider(height: 14, color: Color(0xFFEBEBEB)),
                          _buildDetailRow(
                            context,
                            'Số tiền:',
                            _formatPrice(totalVnd),
                            highlight: true,
                          ),
                          const Divider(height: 14, color: Color(0xFFEBEBEB)),
                          _buildDetailRow(
                            context,
                            'Nội dung CK:',
                            transferCode,
                            isCopyable: true,
                            highlight: true,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline, size: 14, color: Color(0xFFFAAD14)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Hệ thống SePay tự động xác nhận đơn hàng sau 1-3 phút khi nhận đúng nội dung chuyển khoản.',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade600,
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Orders list per Store
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Danh sách đơn hàng (${orders.isNotEmpty ? orders.length : orderIds.length} Store):',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 12),

            if (orders.isNotEmpty)
              ...orders.map((o) {
                final storeName = o['store_name']?.toString() ??
                    (o['store'] is Map ? o['store']['name']?.toString() : null) ??
                    (o['store_id'] != null ? 'Store: ${o['store_id']}' : 'Cửa hàng');
                final rawMethod = o['payment_method']?.toString().toUpperCase() ?? 'COD';
                final pMethod = (rawMethod == 'SANDBOX' || rawMethod == 'SEPAY')
                    ? 'SEPAY'
                    : (rawMethod == 'COD' ? 'COD' : rawMethod);
                final amounts = (o['amounts'] as Map?) ?? {};
                final storePayable =
                    amounts['payable_vnd'] ?? amounts['total_vnd'] ?? '---';

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
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
                            const Icon(
                              Icons.storefront,
                              color: AppColors.primary,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                storeName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: AppColors.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Hình thức: $pMethod',
                              style: const TextStyle(fontSize: 13),
                            ),
                            Text(
                              _formatPrice(storePayable),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        if (o['buyer_note'] != null &&
                            o['buyer_note'].toString().trim().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(
                                Icons.chat_bubble_outline,
                                size: 14,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'Lời nhắn cho shop: ',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: Color(0xFF666666),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  o['buyer_note'].toString().trim(),
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ] else if (orderBatch['store_notes'] is Map &&
                            (orderBatch['store_notes'][o['store_id']?.toString()] != null &&
                                orderBatch['store_notes'][o['store_id']?.toString()]
                                    .toString()
                                    .trim()
                                    .isNotEmpty)) ...[
                          const SizedBox(height: 8),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(
                                Icons.chat_bubble_outline,
                                size: 14,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'Lời nhắn cho shop: ',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: Color(0xFF666666),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  orderBatch['store_notes'][o['store_id']?.toString()]
                                      .toString()
                                      .trim(),
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              })
            else
              ...orderIds.map((oId) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(
                              Icons.storefront,
                              color: AppColors.primary,
                              size: 18,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'Cửa hàng',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          _formatPrice(totalVnd),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            const SizedBox(height: 24),

            // Action Buttons
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/orders',
                    (route) => route.isFirst,
                  );
                },
                icon: const Icon(Icons.receipt_long_outlined),
                label: const Text('Xem đơn hàng của tôi'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/',
                    (route) => false,
                  );
                },
                icon: const Icon(Icons.home_outlined),
                label: const Text('Tiếp tục mua sắm'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildDetailRow(
    BuildContext context,
    String label,
    String value, {
    bool isCopyable = false,
    bool highlight = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12.5,
            color: Color(0xFF666666),
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: highlight ? FontWeight.bold : FontWeight.w600,
                color:
                    highlight ? const Color(0xFFEE4D2D) : const Color(0xFF222222),
              ),
            ),
            if (isCopyable) ...[
              const SizedBox(width: 8),
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: value));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Đã sao chép $value'),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(4),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F7FF),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFF91D5FF), width: 0.5),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.copy, size: 11, color: Color(0xFF1890FF)),
                      SizedBox(width: 2),
                      Text(
                        'Sao chép',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Color(0xFF1890FF),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';

class OrderSuccessPage extends StatelessWidget {
  const OrderSuccessPage({super.key, required this.orderBatch});
  final Map<String, dynamic> orderBatch;

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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Đặt hàng thành công'),
        automaticallyImplyLeading: false,
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
              'Đơn hàng của bạn đã được ghi nhận và phân chia theo từng Store tương ứng.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade700, fontSize: 14),
            ),
            const SizedBox(height: 20),

            // Purchase Group Card
            Card(
              elevation: 0,
              color: const Color(0xff1648a8).withAlpha(12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: const Color(0xff1648a8).withAlpha(30)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Mã nhóm mua sắm:',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Flexible(
                          child: Text(
                            purchaseGroupId,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xff1648a8),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Tổng tiền thanh toán:',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          '$totalVnd ₫',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xff1648a8),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

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
                final oId = o['id']?.toString() ?? 'N/A';
                final storeId = o['store_id']?.toString() ?? 'N/A';
                final status = o['status']?.toString() ?? 'PENDING';
                final pMethod = o['payment_method']?.toString() ?? 'COD';
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
                              color: Color(0xff1648a8),
                              size: 18,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Store: $storeId',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                status,
                                style: TextStyle(
                                  color: Colors.blue.shade800,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Mã đơn hàng: $oId',
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Hình thức: $pMethod',
                              style: const TextStyle(fontSize: 13),
                            ),
                            Text(
                              '$storePayable ₫',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              })
            else
              ...orderIds.map((oId) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: const Icon(
                      Icons.receipt_long,
                      color: Color(0xff1648a8),
                    ),
                    title: Text('Mã đơn hàng: $oId'),
                    subtitle: const Text('Trạng thái: PENDING'),
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
}

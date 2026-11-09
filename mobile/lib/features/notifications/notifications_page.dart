import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../orders/order_detail_page.dart';
import '../orders/order_list_page.dart';
import '../shared/chat_badge_button.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  bool _showBanner = true;
  int _selectedCategoryIndex = 0;
  final Map<int, int> _categoryBadges = {
    0: 2, // Thông báo nổi bật
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };

  final List<Map<String, dynamic>> _categories = const [
    {
      'title': 'Thông báo nổi bật',
      'icon': Icons.thumb_up_alt_rounded,
    },
    {
      'title': 'Khuyến mãi',
      'icon': Icons.confirmation_number_outlined,
    },
    {
      'title': 'Live, Video & Thưởng',
      'icon': Icons.ondemand_video_rounded,
    },
    {
      'title': 'Thông tin Tài chính',
      'icon': Icons.receipt_long_rounded,
    },
    {
      'title': 'Cập nhật Sàn',
      'icon': Icons.shopping_bag_outlined,
    },
  ];

  String _formatTime(dynamic val) {
    if (val == null) return '';
    try {
      final dt = val is DateTime ? val : DateTime.parse(val.toString()).toLocal();
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      final now = DateTime.now();
      if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
        return '$h:$m';
      }
      final d = dt.day.toString().padLeft(2, '0');
      final mo = dt.month.toString().padLeft(2, '0');
      return '$d/$mo $h:$m';
    } catch (_) {
      return val.toString();
    }
  }

  String _getOrderStatusTitle(String status) {
    switch (status.toUpperCase()) {
      case 'SHIPPED':
        return 'Đang vận chuyển';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'Đã giao thành công';
      case 'CANCELLED':
        return 'Đã hủy đơn hàng';
      case 'PROCESSING':
      case 'CONFIRMED':
        return 'Đang chuẩn bị hàng';
      case 'RETURN_REFUND':
      case 'REFUNDED':
        return 'Cập nhật hoàn tiền';
      case 'PENDING':
      case 'CREATED':
      default:
        return 'Đơn hàng mới';
    }
  }

  String _getOrderStatusDetail(Map<String, dynamic> order) {
    final status = (order['status']?.toString() ?? 'PENDING').toUpperCase();
    switch (status) {
      case 'SHIPPED':
        return 'Đơn hàng đang vận chuyển và dự kiến giao đến bạn trong 1-2 ngày tới.';
      case 'CANCELLED':
        final reason = order['cancellation_reason'] ?? order['cancel_reason'];
        if (reason != null && reason.toString().trim().isNotEmpty) {
          return reason.toString();
        }
        return 'Hủy tự động bởi hệ thống.';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'Đơn hàng đã được giao thành công. Đánh giá ngay để nhận ưu đãi nhé!';
      case 'PROCESSING':
      case 'CONFIRMED':
        return 'Người bán đang đóng gói sản phẩm để giao cho đơn vị vận chuyển.';
      case 'RETURN_REFUND':
      case 'REFUNDED':
        return 'Yêu cầu trả hàng / hoàn tiền của bạn đang được hệ thống xử lý.';
      case 'PENDING':
      case 'CREATED':
      default:
        return 'Đơn hàng đã được tiếp nhận và đang chờ xác nhận thanh toán/đơn hàng.';
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = ref.watch(cartBadgeCountProvider);
    final ordersAsync = ref.watch(customerOrdersProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  size: 20,
                  color: Color(0xFF1F2937),
                ),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        title: const Text(
          'Thông báo',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1F2937),
          ),
        ),
        centerTitle: true,
        actions: [
          // Cart Button with badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(
                  Icons.shopping_cart_outlined,
                  size: 22,
                  color: Color(0xFF374151),
                ),
                tooltip: 'Giỏ hàng',
                onPressed: () => Navigator.pushNamed(context, '/cart'),
              ),
              if (cartCount > 0)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 14),
                    child: Text(
                      cartCount > 99 ? '99+' : '$cartCount',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        height: 1,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          // Chat Badge Button
          const ChatBadgeButton(
            color: Color(0xFF374151),
            size: 22,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          ref.invalidate(customerOrdersProvider);
        },
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // 1. Notification Permission Notice Banner
            if (_showBanner)
              Container(
                color: const Color(0xFFFEF9F5),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 26,
                      height: 26,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF97316),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.notifications_active_rounded,
                          size: 15,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF374151),
                            height: 1.35,
                          ),
                          children: [
                            const TextSpan(
                              text:
                                  'Bật thông báo để nhận cập nhật thông báo đơn hàng và các ưu đãi độc quyền. ',
                            ),
                            WidgetSpan(
                              alignment: PlaceholderAlignment.middle,
                              child: GestureDetector(
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Đã bật thông báo thành công!'),
                                    ),
                                  );
                                  setState(() => _showBanner = false);
                                },
                                child: const Text(
                                  'Bật',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF2563EB),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => setState(() => _showBanner = false),
                      child: const Icon(
                        Icons.close,
                        size: 18,
                        color: Color(0xFF9CA3AF),
                      ),
                    ),
                  ],
                ),
              ),

            // 2. Section: Cập nhật đơn hàng
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Text(
                        'Cập nhật đơn hàng',
                        style: TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                      const SizedBox(width: 6),
                      ordersAsync.when(
                        data: (data) {
                          final count = (data['items'] as List?)?.length ?? 0;
                          if (count == 0) return const SizedBox.shrink();
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 1.5,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              count > 99 ? '99+' : '$count',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          );
                        },
                        loading: () => const SizedBox.shrink(),
                        error: (_, _) => const SizedBox.shrink(),
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: () => Navigator.pushNamed(context, '/orders'),
                    borderRadius: BorderRadius.circular(4),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Row(
                        children: [
                          Text(
                            'Xem thêm',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                          SizedBox(width: 2),
                          Icon(
                            Icons.chevron_right,
                            size: 18,
                            color: Color(0xFF6B7280),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Order Notifications List (Fetched from Server)
            ordersAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
              error: (err, _) => Padding(
                padding: const EdgeInsets.all(16),
                child: Center(
                  child: Text(
                    'Không thể tải thông báo đơn hàng: $err',
                    style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                  ),
                ),
              ),
              data: (data) {
                final items = (data['items'] as List?) ?? [];
                if (items.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        'Chưa có cập nhật đơn hàng nào.',
                        style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                      ),
                    ),
                  );
                }

                // Show up to 5 most recent orders
                final displayOrders = items.take(5).toList();

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: displayOrders.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final order = Map<String, dynamic>.from(entry.value as Map);
                      final orderId = order['id']?.toString() ?? '';
                      final status = order['status']?.toString() ?? 'PENDING';
                      final isCancelled = status.toUpperCase() == 'CANCELLED';
                      final orderItems = ((order['items'] as List?) ?? [])
                          .map((e) => Map<String, dynamic>.from(e as Map))
                          .toList();
                      final firstItem = orderItems.isNotEmpty ? orderItems[0] : null;
                      final productId = firstItem?['product_id']?.toString() ?? '';
                      final directImg = firstItem?['image_url']?.toString() ??
                          firstItem?['product_image']?.toString();

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: idx == 0
                                ? const Color(0xFFFDDCCC)
                                : const Color(0xFFE5E7EB),
                            width: 0.9,
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          clipBehavior: Clip.antiAlias,
                          child: InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => OrderDetailPage(
                                    orderId: orderId,
                                    initialOrder: order,
                                  ),
                                ),
                              );
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Details column
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _getOrderStatusTitle(status),
                                          style: const TextStyle(
                                            fontSize: 14.5,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF1F2937),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text.rich(
                                          TextSpan(
                                            children: [
                                              TextSpan(
                                                text: isCancelled
                                                    ? 'Lý do  '
                                                    : 'Chi tiết  ',
                                                style: const TextStyle(
                                                  color: Color(0xFF888888),
                                                  fontSize: 12.5,
                                                ),
                                              ),
                                              TextSpan(
                                                text: _getOrderStatusDetail(order),
                                                style: const TextStyle(
                                                  color: Color(0xFF374151),
                                                  fontSize: 13,
                                                  height: 1.3,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          _formatTime(
                                            order['updated_at'] ??
                                                order['created_at'],
                                          ),
                                          style: const TextStyle(
                                            color: Color(0xFF9CA3AF),
                                            fontSize: 11.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  // Product thumbnail
                                  Consumer(
                                    builder: (context, ref, _) {
                                      final liveImg = productId.isNotEmpty
                                          ? ref
                                              .watch(
                                                productThumbnailProvider(productId),
                                              )
                                              .value
                                          : null;
                                      final imgUrl = directImg ?? liveImg;

                                      return ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          width: 60,
                                          height: 60,
                                          color: Colors.grey.shade100,
                                          child: imgUrl != null &&
                                                  imgUrl.isNotEmpty
                                              ? Image.network(
                                                  imgUrl,
                                                  fit: BoxFit.cover,
                                                  errorBuilder:
                                                      (ctx, _, _) => const Center(
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
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                );
              },
            ),

            // 3. Section Divider
            const SizedBox(height: 4),
            Container(height: 8, color: const Color(0xFFF3F4F6)),
            const SizedBox(height: 6),

            // 4. Section: Cập nhật mới nhất
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Cập nhật mới nhất',
                    style: TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                  InkWell(
                    onTap: () {
                      setState(() {
                        _categoryBadges.updateAll((key, value) => 0);
                      });
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Đã đánh dấu tất cả là đã đọc.'),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(4),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Text(
                        'Đọc Tất Cả',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Category Icons Row matching Image
            SizedBox(
              height: 104,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                itemCount: _categories.length,
                itemBuilder: (context, idx) {
                  final cat = _categories[idx];
                  final isSelected = _selectedCategoryIndex == idx;
                  final badge = _categoryBadges[idx] ?? 0;

                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedCategoryIndex = idx;
                        _categoryBadges[idx] = 0;
                      });
                    },
                    child: Container(
                      width: 82,
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Stack(
                            clipBehavior: Clip.none,
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? AppColors.primary.withAlpha(20)
                                      : const Color(0xFFF9FAFB),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isSelected
                                        ? AppColors.primary
                                        : const Color(0xFFE5E7EB),
                                    width: 1,
                                  ),
                                ),
                                child: Icon(
                                  cat['icon'] as IconData,
                                  size: 19,
                                  color: isSelected
                                      ? AppColors.primary
                                      : const Color(0xFF6B7280),
                                ),
                              ),
                              if (badge > 0)
                                Positioned(
                                  top: -2,
                                  right: -4,
                                  child: Container(
                                    padding: const EdgeInsets.all(3),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.white,
                                        width: 1.5,
                                      ),
                                    ),
                                    constraints: const BoxConstraints(
                                      minWidth: 16,
                                      minHeight: 16,
                                    ),
                                    child: Text(
                                      '$badge',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        height: 1,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            cat['title'] as String,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                              color: isSelected
                                  ? AppColors.primary
                                  : const Color(0xFF4B5563),
                            ),
                          ),
                          const Spacer(),
                          if (isSelected)
                            Container(
                              height: 2.5,
                              width: 32,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 20),

            // Empty state matching screenshot "Không có cập nhật mới"
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 36),
              child: Center(
                child: Text(
                  'Không có cập nhật mới',
                  style: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

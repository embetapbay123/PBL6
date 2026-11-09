import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../orders/order_detail_page.dart';
import '../orders/order_list_page.dart';
import '../shared/chat_badge_button.dart';

class NotificationItem {
  final String id;
  final String categoryKey;
  final String title;
  final String body;
  final String time;
  final IconData? icon;
  final Color? iconColor;
  final Color? iconBgColor;
  final String? badge;
  final VoidCallback? onTap;

  const NotificationItem({
    required this.id,
    required this.categoryKey,
    required this.title,
    required this.body,
    required this.time,
    this.icon,
    this.iconColor,
    this.iconBgColor,
    this.badge,
    this.onTap,
  });
}

class NotificationReadState {
  final Set<String> readOrderIds;
  final Set<String> readNotificationIds;
  final Map<int, int> categoryBadges;

  const NotificationReadState({
    required this.readOrderIds,
    required this.readNotificationIds,
    required this.categoryBadges,
  });

  NotificationReadState copyWith({
    Set<String> Function()? readOrderIds,
    Set<String> Function()? readNotificationIds,
    Map<int, int> Function()? categoryBadges,
  }) {
    return NotificationReadState(
      readOrderIds: readOrderIds != null ? readOrderIds() : this.readOrderIds,
      readNotificationIds: readNotificationIds != null ? readNotificationIds() : this.readNotificationIds,
      categoryBadges: categoryBadges != null ? categoryBadges() : this.categoryBadges,
    );
  }
}

class NotificationStateNotifier extends StateNotifier<NotificationReadState> {
  final FlutterSecureStorage _storage;

  NotificationStateNotifier([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage(),
        super(const NotificationReadState(
          readOrderIds: {},
          readNotificationIds: {},
          categoryBadges: {0: 2, 1: 1, 2: 0, 3: 1},
        )) {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    try {
      final orderIdsStr = await _storage.read(key: 'notif_read_order_ids');
      final notifIdsStr = await _storage.read(key: 'notif_read_notif_ids');
      final badgesStr = await _storage.read(key: 'notif_category_badges');

      Set<String> orderIds = state.readOrderIds;
      Set<String> notifIds = state.readNotificationIds;
      Map<int, int> badges = Map<int, int>.from(state.categoryBadges);

      if (orderIdsStr != null && orderIdsStr.isNotEmpty) {
        orderIds = (jsonDecode(orderIdsStr) as List).map((e) => e.toString()).toSet();
      }
      if (notifIdsStr != null && notifIdsStr.isNotEmpty) {
        notifIds = (jsonDecode(notifIdsStr) as List).map((e) => e.toString()).toSet();
      }
      if (badgesStr != null && badgesStr.isNotEmpty) {
        final decoded = jsonDecode(badgesStr) as Map;
        badges = decoded.map((k, v) => MapEntry(int.parse(k.toString()), int.parse(v.toString())));
      }

      state = NotificationReadState(
        readOrderIds: orderIds,
        readNotificationIds: notifIds,
        categoryBadges: badges,
      );
    } catch (_) {}
  }

  Future<void> _saveToStorage() async {
    try {
      await _storage.write(key: 'notif_read_order_ids', value: jsonEncode(state.readOrderIds.toList()));
      await _storage.write(key: 'notif_read_notif_ids', value: jsonEncode(state.readNotificationIds.toList()));
      await _storage.write(
        key: 'notif_category_badges',
        value: jsonEncode(state.categoryBadges.map((k, v) => MapEntry(k.toString(), v))),
      );
    } catch (_) {}
  }

  void markOrderAsRead(String orderId) {
    if (orderId.isEmpty || state.readOrderIds.contains(orderId)) return;
    final newOrderIds = Set<String>.from(state.readOrderIds)..add(orderId);
    state = state.copyWith(readOrderIds: () => newOrderIds);
    _saveToStorage();
  }

  void markNotificationAsRead(String id, String categoryKey) {
    if (id.isEmpty || state.readNotificationIds.contains(id)) return;
    final newNotifIds = Set<String>.from(state.readNotificationIds)..add(id);
    final newBadges = Map<int, int>.from(state.categoryBadges);

    if (categoryKey == 'promotions' && (newBadges[1] ?? 0) > 0) {
      newBadges[1] = (newBadges[1]! - 1);
    } else if (categoryKey == 'updates' && (newBadges[3] ?? 0) > 0) {
      newBadges[3] = (newBadges[3]! - 1);
    }
    newBadges[0] = ((newBadges[1] ?? 0) + (newBadges[3] ?? 0)).clamp(0, 99);

    state = state.copyWith(
      readNotificationIds: () => newNotifIds,
      categoryBadges: () => newBadges,
    );
    _saveToStorage();
  }

  void markCategoryRead(int categoryIndex) {
    if ((state.categoryBadges[categoryIndex] ?? 0) == 0) return;
    final newBadges = Map<int, int>.from(state.categoryBadges);
    newBadges[categoryIndex] = 0;
    if (categoryIndex == 1 || categoryIndex == 3) {
      newBadges[0] = ((newBadges[1] ?? 0) + (newBadges[3] ?? 0)).clamp(0, 99);
    }
    state = state.copyWith(categoryBadges: () => newBadges);
    _saveToStorage();
  }

  void markAllAsRead(List<dynamic> orders, Set<String> initialUnreadNotificationIds) {
    final newOrderIds = Set<String>.from(state.readOrderIds);
    for (final o in orders) {
      if (o is Map) {
        final id = o['id']?.toString();
        if (id != null && id.isNotEmpty) newOrderIds.add(id);
      }
    }
    final newNotifIds = Set<String>.from(state.readNotificationIds)..addAll(initialUnreadNotificationIds);
    final newBadges = {0: 0, 1: 0, 2: 0, 3: 0};

    state = NotificationReadState(
      readOrderIds: newOrderIds,
      readNotificationIds: newNotifIds,
      categoryBadges: newBadges,
    );
    _saveToStorage();
  }
}

final notificationStateProvider =
    StateNotifierProvider<NotificationStateNotifier, NotificationReadState>((ref) {
  return NotificationStateNotifier();
});

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  bool _showBanner = true;
  int _selectedCategoryIndex = 0;
  static const Set<String> _initialUnreadNotificationIds = {'promo-1', 'update-1'};

  bool _isOrderUnread(Map<String, dynamic> order, NotificationReadState notifState) {
    final id = order['id']?.toString() ?? '';
    if (id.isEmpty) return false;
    if (notifState.readOrderIds.contains(id)) return false;
    if (order['is_read'] == true || order['read'] == true) return false;
    return true;
  }

  bool _isNotificationUnread(NotificationItem item, NotificationReadState notifState) {
    if (notifState.readNotificationIds.contains(item.id)) return false;
    return _initialUnreadNotificationIds.contains(item.id);
  }

  final List<Map<String, dynamic>> _categories = const [
    {
      'key': 'featured',
      'title': 'Thông báo nổi bật',
      'icon': Icons.thumb_up_alt_rounded,
    },
    {
      'key': 'promotions',
      'title': 'Khuyến mãi',
      'icon': Icons.confirmation_number_outlined,
    },
    {
      'key': 'finance',
      'title': 'Thông tin Tài chính',
      'icon': Icons.receipt_long_rounded,
    },
    {
      'key': 'updates',
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

  String _formatPrice(int price) {
    final s = price.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(s[i]);
    }
    return '${buffer.toString()} ₫';
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

  List<NotificationItem> _getPromotionsNotifications() {
    return [
      NotificationItem(
        id: 'promo-1',
        categoryKey: 'promotions',
        title: 'Mã giảm giá 50.000₫ dành riêng cho bạn!',
        body: 'Nhập mã RIENGCHOBAN để được giảm 50.000₫ cho đơn hàng từ 250.000₫. Áp dụng cho mọi sản phẩm.',
        time: '08:30',
        icon: Icons.confirmation_number_rounded,
        iconColor: const Color(0xFFEA580C),
        iconBgColor: const Color(0xFFFFF7ED),
        badge: 'Dành riêng cho bạn',
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đã lưu mã RIENGCHOBAN vào ví voucher của bạn!')),
          );
        },
      ),
      NotificationItem(
        id: 'promo-2',
        categoryKey: 'promotions',
        title: 'Siêu Sale 11.11 - Đón Bão Deal Khủng Toàn Sàn',
        body: 'Hàng ngàn sản phẩm giảm giá đến 50%, triệu voucher Freeship Extra 0₫ mở mới mỗi khung giờ 0H - 9H - 12H - 21H.',
        time: '08:15',
        icon: Icons.local_fire_department_rounded,
        iconColor: const Color(0xFFDC2626),
        iconBgColor: const Color(0xFFFEF2F2),
        badge: 'Hot Sale',
        onTap: () => Navigator.pushNamed(context, '/'),
      ),
      NotificationItem(
        id: 'promo-3',
        categoryKey: 'promotions',
        title: 'Voucher Freeship 100% đã sẵn sàng trong ví',
        body: 'Mã miễn phí vận chuyển tối đa 30.000₫ cho đơn hàng từ 150.000₫ đã được tự động thêm vào ví voucher của bạn.',
        time: 'Hôm qua',
        icon: Icons.local_shipping_rounded,
        iconColor: const Color(0xFF0284C7),
        iconBgColor: const Color(0xFFF0F9FF),
        badge: 'Freeship Extra',
      ),
      NotificationItem(
        id: 'promo-4',
        categoryKey: 'promotions',
        title: 'Hoàn xu 15% tối đa 50.000 xu cho đơn hàng tiếp theo',
        body: 'Áp dụng cho mọi đơn hàng thời trang & phong cách sống khi mua sắm tại gian hàng chính hãng tuần này.',
        time: '06/11',
        icon: Icons.monetization_on_rounded,
        iconColor: const Color(0xFFD97706),
        iconBgColor: const Color(0xFFFFFBEB),
      ),
    ];
  }

  List<NotificationItem> _getFinanceNotifications(List<dynamic> orders) {
    final List<NotificationItem> list = [];

    final paidOrders = orders.where((o) {
      if (o is! Map) return false;
      final status = (o['status']?.toString() ?? '').toUpperCase();
      final payStatus = (o['payment_status']?.toString() ?? '').toUpperCase();
      return payStatus == 'SUCCEEDED' ||
          ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].contains(status);
    }).toList();

    for (final orderRaw in paidOrders) {
      final order = Map<String, dynamic>.from(orderRaw as Map);
      final orderId = order['id']?.toString() ?? '';
      final shortId = orderId.length > 8 ? orderId.substring(0, 8) : orderId;
      final amounts = order['amounts'] is Map ? order['amounts'] as Map : order;
      final payable = amounts['payable_vnd'] ?? amounts['payable_total_vnd'] ?? 0;
      int payableInt = 0;
      if (payable is num) payableInt = payable.toInt();
      if (payable is String) payableInt = int.tryParse(payable) ?? 0;

      final method = (order['payment_method']?.toString() ?? 'COD').toUpperCase();
      final methodStr = method == 'SANDBOX' ? 'Cổng trực tuyến (Sandbox)' : 'COD';
      final timeStr = _formatTime(order['updated_at'] ?? order['created_at']);

      list.add(
        NotificationItem(
          id: 'fin-$orderId',
          categoryKey: 'finance',
          title: 'Đơn hàng #$shortId đã thanh toán thành công',
          body: 'Đơn hàng trị giá ${_formatPrice(payableInt)} qua $methodStr đã được xác nhận thanh toán thành công.',
          time: timeStr.isNotEmpty ? timeStr : 'Hôm nay',
          icon: Icons.check_circle_rounded,
          iconColor: const Color(0xFF16A34A),
          iconBgColor: const Color(0xFFF0FDF4),
          badge: 'Thành công',
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
        ),
      );
    }

    if (list.isEmpty) {
      list.add(
        NotificationItem(
          id: 'fin-default',
          categoryKey: 'finance',
          title: 'Đơn hàng #69e4fec4 đã thanh toán thành công',
          body: 'Đơn hàng trị giá 380.000 ₫ qua Cổng thanh toán trực tuyến đã được xác nhận thanh toán thành công.',
          time: 'Hôm nay',
          icon: Icons.check_circle_rounded,
          iconColor: const Color(0xFF16A34A),
          iconBgColor: const Color(0xFFF0FDF4),
          badge: 'Thành công',
        ),
      );
    }

    return list;
  }

  List<NotificationItem> _getPlatformUpdatesNotifications() {
    return [
      NotificationItem(
        id: 'update-1',
        categoryKey: 'updates',
        title: 'Cập nhật ứng dụng phiên bản 2.2.0',
        body: 'Phiên bản mới nâng cấp hiệu năng tải trang, giao diện hiện đại mượt mà và tối ưu trải nghiệm giỏ hàng, đơn hàng.',
        time: 'Hôm nay',
        icon: Icons.system_update_rounded,
        iconColor: const Color(0xFF2563EB),
        iconBgColor: const Color(0xFFEFF6FF),
        badge: 'v2.2.0',
        onTap: () {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Phiên bản 2.2.0'),
              content: const Text(
                '• Giao diện mới hiện đại, đồng bộ màu sắc thương hiệu.\n'
                '• Nâng cấp tính năng Trả hàng & Hoàn tiền tiện lợi.\n'
                '• Tối ưu tốc độ tải danh mục và gợi ý tìm kiếm.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Đã hiểu'),
                ),
              ],
            ),
          );
        },
      ),
      NotificationItem(
        id: 'update-2',
        categoryKey: 'updates',
        title: 'Tính năng mới: Trợ lý mua sắm AI thông minh',
        body: 'Trợ lý AI giúp bạn tìm kiếm quà tặng, phân tích đánh giá sản phẩm và đề xuất ưu đãi phù hợp ngay tại mục Chat.',
        time: 'Hôm qua',
        icon: Icons.auto_awesome_rounded,
        iconColor: const Color(0xFF9333EA),
        iconBgColor: const Color(0xFFFAF5FF),
        badge: 'MỚI',
      ),
      NotificationItem(
        id: 'update-3',
        categoryKey: 'updates',
        title: 'Tính năng mới: Yêu cầu Trả hàng & Hoàn tiền',
        body: 'Khách hàng có thể dễ dàng gửi yêu cầu Trả hàng / Hoàn tiền trực tiếp từ trang Chi tiết đơn hàng giao thành công.',
        time: '06/11',
        icon: Icons.assignment_return_rounded,
        iconColor: const Color(0xFF0D9488),
        iconBgColor: const Color(0xFFF0FDFA),
        badge: 'MỚI',
      ),
      NotificationItem(
        id: 'update-4',
        categoryKey: 'updates',
        title: 'Nâng cấp chính sách bảo vệ khách hàng 2026',
        body: 'Bảo đảm quyền lợi đổi trả trong 7 ngày, miễn phí vận chuyển hàng hoàn trả và bồi thường 100% nếu có lỗi từ nhà sản xuất.',
        time: '01/11',
        icon: Icons.verified_user_rounded,
        iconColor: const Color(0xFF4B5563),
        iconBgColor: const Color(0xFFF3F4F6),
      ),
    ];
  }

  List<NotificationItem> _getFeaturedNotifications(List<dynamic> orders) {
    final promos = _getPromotionsNotifications();
    final finances = _getFinanceNotifications(orders);
    final updates = _getPlatformUpdatesNotifications();

    final List<NotificationItem> featured = [];
    if (promos.isNotEmpty) featured.add(promos[0]);
    if (finances.isNotEmpty) featured.add(finances[0]);
    if (updates.isNotEmpty) featured.add(updates[0]);
    if (promos.length > 1) featured.add(promos[1]);
    if (updates.length > 1) featured.add(updates[1]);
    return featured;
  }

  Widget _buildNotificationItem(NotificationItem item, NotificationReadState notifState) {
    final isUnread = _isNotificationUnread(item, notifState);
    return Container(
      color: isUnread ? const Color(0xFFE9ECEF) : Colors.white,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            ref.read(notificationStateProvider.notifier).markNotificationAsRead(item.id, item.categoryKey);
            item.onTap?.call();
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: item.iconBgColor ?? const Color(0xFFFFF7ED),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(
                  item.icon ?? Icons.notifications_rounded,
                  size: 21,
                  color: item.iconColor ?? AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1F2937),
                            height: 1.25,
                          ),
                        ),
                      ),
                      if (item.badge != null) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withAlpha(20),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.badge!,
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF4B5563),
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    item.time,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  ),
);
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = ref.watch(cartBadgeCountProvider);
    final ordersAsync = ref.watch(customerOrdersProvider);
    final notifState = ref.watch(notificationStateProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
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
                          final items = (data['items'] as List?) ?? [];
                          final unreadCount = items.where((o) {
                            if (o is! Map) return false;
                            return _isOrderUnread(Map<String, dynamic>.from(o), notifState);
                          }).length;
                          if (unreadCount == 0) return const SizedBox.shrink();
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
                              unreadCount > 99 ? '99+' : '$unreadCount',
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

                      final isUnread = _isOrderUnread(order, notifState);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: isUnread ? const Color(0xFFE9ECEF) : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isUnread
                                ? const Color(0xFFD1D5DB)
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
                              if (orderId.isNotEmpty) {
                                ref.read(notificationStateProvider.notifier).markOrderAsRead(orderId);
                              }
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
            Container(
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
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
                      final items = (ordersAsync.value?['items'] as List?) ?? [];
                      ref.read(notificationStateProvider.notifier).markAllAsRead(items, _initialUnreadNotificationIds);
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

            // Category Icons Row matching Image (4 tabs)
            Container(
              height: 98,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: _categories.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final cat = entry.value;
                  final isSelected = _selectedCategoryIndex == idx;
                  final badge = notifState.categoryBadges[idx] ?? 0;

                  return Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() => _selectedCategoryIndex = idx);
                        ref.read(notificationStateProvider.notifier).markCategoryRead(idx);
                      },
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
                }).toList(),
              ),
            ),

            const SizedBox(height: 8),

            // 5. Notifications List for Selected Category
            Builder(
              builder: (context) {
                final orders = (ordersAsync.value?['items'] as List?) ?? [];
                List<NotificationItem> currentList = [];

                switch (_selectedCategoryIndex) {
                  case 0:
                    currentList = _getFeaturedNotifications(orders);
                    break;
                  case 1:
                    currentList = _getPromotionsNotifications();
                    break;
                  case 2:
                    currentList = _getFinanceNotifications(orders);
                    break;
                  case 3:
                    currentList = _getPlatformUpdatesNotifications();
                    break;
                }

                return Column(
                  children: [
                    ...currentList.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final item = entry.value;
                      return Column(
                        children: [
                          _buildNotificationItem(item, notifState),
                          if (idx < currentList.length - 1)
                            const Divider(
                              height: 1,
                              indent: 70,
                              endIndent: 16,
                              color: Color(0xFFF3F4F6),
                            ),
                        ],
                      );
                    }),
                    Container(
                      color: const Color(0xFFF5F5F5),
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: const Center(
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
                );
              },
            ),
          ],
        ),
      ),
          ],
        ),
      ),
    );
  }
}

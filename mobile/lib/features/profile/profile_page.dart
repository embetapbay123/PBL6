import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_notice_dialog.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../catalog/product_detail_page.dart';
import '../chat/chat_ai_modal.dart';
import '../customer/favorites_page.dart';
import '../customer/customer_settings_page.dart';
import '../orders/order_list_page.dart';
import '../shared/app_bottom_nav.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 4,
        cartCount: 0,
        onTap: (index) {
          if (index == 4) return;
          if (index == 0) {
            Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
          } else if (index == 1) {
            Navigator.pushNamed(context, '/customer/favorites');
          } else if (index == 2) {
            Navigator.pushNamed(context, '/cart');
          } else if (index == 3) {
            ChatAiModal.show(context);
          }
        },
      ),
      body: profileAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.error_outline_rounded,
                    size: 48,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  errorMessage(error),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => ref.invalidate(profileProvider),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  child: const Text('Thử lại'),
                ),
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => Navigator.pushNamed(context, '/login'),
                  child: const Text(
                    'Đến màn hình Đăng nhập',
                    style: TextStyle(color: AppColors.primary),
                  ),
                ),
              ],
            ),
          ),
        ),
        data: (profile) {
          final email = profile['email']?.toString() ?? '';
          final displayName = profile['display_name']?.toString() ?? 'Khách hàng';
          final phone = profile['phone']?.toString();
          final roles = (profile['roles'] as List?)
                  ?.map((e) => e.toString())
                  .toList() ??
              ['CUSTOMER'];

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              ref.invalidate(profileProvider);
              await ref.read(profileProvider.future);
            },
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                // 1. Top Orange Header Banner (matching Shopee profile header)
                _buildTopHeaderBanner(
                  context,
                  ref,
                  profile: profile,
                  displayName: displayName,
                  email: email,
                  phone: phone,
                  roles: roles,
                ),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                const SizedBox(height: 16),

                // 2. Section "Đơn hàng của tôi"
                _buildMyOrdersSection(context, ref),
                const SizedBox(height: 16),

                // 3. Section "Hoạt động mua sắm" (2x2 Grid)
                _buildShoppingActivitiesSection(context),
                const SizedBox(height: 16),

                // 4. Section "Tài khoản và bảo mật"
                _buildAccountSecuritySection(context, ref, profile, displayName, phone),
                const SizedBox(height: 16),

                // 5. Section "Hỗ trợ và cài đặt"
                _buildSupportSettingsSection(context, ref),
                const SizedBox(height: 20),

                // 6. Section "Có thể bạn cũng thích" (Gợi ý sản phẩm)
                _buildRecommendationsSection(context, ref),
                const SizedBox(height: 20),

                // 7. Phiên bản footer
                const Center(
                  child: Text(
                    'Phiên bản 1.0.0',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  /// 1. Top Header Banner nền cam gradient Shopee
  Widget _buildTopHeaderBanner(
    BuildContext context,
    WidgetRef ref, {
    required Map<String, dynamic> profile,
    required String displayName,
    required String email,
    String? phone,
    required List<String> roles,
  }) {
    final topPadding = MediaQuery.of(context).padding.top;
    final username = profile['username']?.toString() ??
        (displayName.isNotEmpty ? displayName : 'Khách hàng');
    final followingCount = profile['following_stores_count'] ?? profile['following_count'] ?? 513;
    final followersCount = profile['followers_count'] ?? 1;
    final tier = profile['membership_tier']?.toString() ??
        (roles.isNotEmpty ? roles.first : 'Kim Cương');
    final savedVnd = profile['saved_amount_vnd'] ?? 58338145;

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFEE4D2D), // Shopee orange
            Color(0xFFFF5722),
          ],
        ),
      ),
      padding: EdgeInsets.fromLTRB(16, topPadding + 8, 8, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Avatar tròn nền trắng
              InkWell(
                onTap: () async {
                  final changed = await Navigator.pushNamed(
                    context,
                    '/edit-profile',
                    arguments: profile,
                  );
                  if (changed == true) {
                    ref.invalidate(profileProvider);
                    ref.invalidate(addressListProvider);
                    ref.invalidate(cartItemsProvider);
                    ref.invalidate(recommendationProvider);
                  }
                },
                child: Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withAlpha(220), width: 2),
                  ),
                  child: Center(
                    child: Icon(
                      Icons.person,
                      size: 32,
                      color: Colors.grey.shade400,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Username + Badge + Following counts
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            username,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16.5,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        // Badge (Kim Cương > / Thành viên >)
                        InkWell(
                          onTap: () {
                            AppNoticeDialog.show(
                              context,
                              message: 'Hạng thành viên của bạn: $tier',
                              buttonText: 'Đã hiểu',
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B).withAlpha(150),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  tier,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                const Icon(
                                  Icons.chevron_right,
                                  size: 13,
                                  color: Colors.white70,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (email.isNotEmpty && email != username) ...[
                      const SizedBox(height: 2),
                      Text(
                        email,
                        style: TextStyle(
                          color: Colors.white.withAlpha(200),
                          fontSize: 11.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          '$followingCount Đang theo dõi',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '$followersCount Người theo dõi',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Action buttons on the right: Setting & Notification
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(
                      Icons.settings_outlined,
                      color: Colors.white,
                      size: 22,
                    ),
                    tooltip: 'Cài đặt',
                    onPressed: () => Navigator.pushNamed(context, '/customer/settings'),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(
                      Icons.notifications_outlined,
                      color: Colors.white,
                      size: 22,
                    ),
                    tooltip: 'Thông báo',
                    onPressed: () {
                      AppNoticeDialog.show(
                        context,
                        message: 'Không có thông báo mới.',
                        buttonText: 'Đã hiểu',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Savings / VIP Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withAlpha(25),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.stars_rounded,
                  size: 15,
                  color: Color(0xFFFFD700),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Với PBL6 VIP, bạn đã tiết kiệm: ${_formatVnd(savedVnd)}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatVnd(num amount) {
    final str = amount.toInt().toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(str[i]);
    }
    return '${buffer.toString()}đ';
  }

  /// 2. Khối "Đơn hàng của tôi"
  Widget _buildMyOrdersSection(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(customerOrdersProvider);
    int? pendingCount;
    int? processingCount;
    int? shippedCount;

    ordersAsync.whenData((data) {
      final items = (data['items'] as List?) ?? [];
      int pending = 0;
      int processing = 0;
      int shipped = 0;
      for (final it in items) {
        final st = (it as Map)['status']?.toString().toUpperCase() ?? '';
        if (st == 'CREATED' || st == 'PENDING') pending++;
        if (st == 'CONFIRMED' || st == 'PROCESSING') processing++;
        if (st == 'SHIPPED') shipped++;
      }
      pendingCount = pending;
      processingCount = processing;
      shippedCount = shipped;
    });

    return Container(
      decoration: AppDecorations.card(radius: 16),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Đơn hàng của tôi',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  InkWell(
                    onTap: () => Navigator.pushNamed(
                      context,
                      '/orders',
                      arguments: {'initialIndex': 0},
                    ),
                    borderRadius: BorderRadius.circular(8),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Xem tất cả',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                          SizedBox(width: 2),
                          Icon(
                            Icons.chevron_right,
                            size: 18,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildOrderStatusItem(
                    context,
                    initialIndex: 1,
                    icon: Icons.receipt_long_outlined,
                    label: 'Chờ xác nhận',
                    badgeCount: pendingCount ?? 2,
                  ),
                  _buildOrderStatusItem(
                    context,
                    initialIndex: 2,
                    icon: Icons.inventory_2_outlined,
                    label: 'Đang xử lý',
                    badgeCount: processingCount ?? 1,
                  ),
                  _buildOrderStatusItem(
                    context,
                    initialIndex: 3,
                    icon: Icons.local_shipping_outlined,
                    label: 'Đang giao',
                    badgeCount: shippedCount ?? 1,
                  ),
                  _buildOrderStatusItem(
                    context,
                    initialIndex: 4,
                    icon: Icons.check_circle_outline_rounded,
                    label: 'Hoàn thành',
                  ),
                  _buildOrderStatusItem(
                    context,
                    initialIndex: 5,
                    icon: Icons.cancel_outlined,
                    label: 'Đã hủy',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrderStatusItem(
    BuildContext context, {
    required int initialIndex,
    required IconData icon,
    required String label,
    int? badgeCount,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.pushNamed(
          context,
          '/orders',
          arguments: {'initialIndex': initialIndex},
        ),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFFF0F0),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Icon(
                        icon,
                        color: AppColors.primary,
                        size: 24,
                      ),
                    ),
                  ),
                  if (badgeCount != null && badgeCount > 0)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                        constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                        child: Center(
                          child: Text(
                            '$badgeCount',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              height: 1,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 3. Lưới 2x2 "Hoạt động mua sắm"
  Widget _buildShoppingActivitiesSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Hoạt động mua sắm',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActivityCard(
                context,
                icon: Icons.access_time_rounded,
                title: 'Đã xem gần đây',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Danh sách sản phẩm đã xem gần đây.')),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActivityCard(
                context,
                icon: Icons.search_rounded,
                title: 'Lịch sử tìm kiếm',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Lịch sử tìm kiếm gần đây.')),
                  );
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActivityCard(
                context,
                icon: Icons.favorite_border_rounded,
                title: 'Đã lưu',
                onTap: () => Navigator.pushNamed(context, '/customer/favorites'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActivityCard(
                context,
                icon: Icons.auto_awesome_rounded,
                title: 'Lịch sử Chat AI',
                onTap: () => Navigator.pushNamed(context, '/chat'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActivityCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: AppDecorations.card(radius: 14),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFF0F0),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      icon,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Icon(
                  Icons.chevron_right,
                  size: 18,
                  color: AppColors.textMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// 4. Khối "Tài khoản và bảo mật"
  Widget _buildAccountSecuritySection(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> profile,
    String displayName,
    String? phone,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Tài khoản và bảo mật',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          decoration: AppDecorations.card(radius: 16),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                _buildMenuTile(
                  icon: Icons.person_outline_rounded,
                  title: 'Thông tin cá nhân',
                  subtitle: phone != null && phone.isNotEmpty
                      ? '$displayName • $phone'
                      : displayName,
                  onTap: () async {
                    final changed = await Navigator.pushNamed(
                      context,
                      '/edit-profile',
                      arguments: profile,
                    );
                    if (changed == true) {
                      ref.invalidate(profileProvider);
                      ref.invalidate(addressListProvider);
                      ref.invalidate(cartItemsProvider);
                      ref.invalidate(recommendationProvider);
                    }
                  },
                ),
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: 'Tin nhắn với gian hàng',
                  subtitle: 'Trao đổi về sản phẩm, đơn hàng và hỗ trợ sau mua',
                  badgeCount: 1,
                  onTap: () => Navigator.pushNamed(context, '/store-messages'),
                ),
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.location_on_outlined,
                  title: 'Địa chỉ nhận hàng',
                  subtitle: 'Sổ địa chỉ nhận hàng',
                  onTap: () => Navigator.pushNamed(context, '/addresses'),
                ),
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.lock_outline_rounded,
                  title: 'Đổi mật khẩu',
                  subtitle: 'Cập nhật mật khẩu bảo mật',
                  onTap: () => Navigator.pushNamed(context, '/change-password'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// 5. Khối "Hỗ trợ và cài đặt"
  Widget _buildSupportSettingsSection(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Hỗ trợ và cài đặt',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          decoration: AppDecorations.card(radius: 16),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                _buildMenuTile(
                  icon: Icons.tune_rounded,
                  title: 'Trung tâm Khách hàng & Cài đặt',
                  subtitle: 'Quyền riêng tư, bảo mật, thông báo và bán hàng',
                  onTap: () =>
                      Navigator.pushNamed(context, '/customer/settings'),
                ),
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.storefront_outlined,
                  title: 'Đăng ký mở gian hàng',
                  subtitle: 'Trở thành nhà bán hàng trên sàn PBL6',
                  onTap: () => Navigator.pushNamed(context, '/store-applications'),
                ),
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.notifications_none_rounded,
                  title: 'Thông báo',
                  subtitle: 'Cài đặt nhận tin khuyến mãi & đơn hàng',
                  onTap: () => Navigator.pushNamed(
                    context,
                    '/customer/settings',
                    arguments: {'tab': SettingsTab.notifications},
                  ),
                ),
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.description_outlined,
                  title: 'Điều khoản và quyền riêng tư',
                  subtitle: 'Chính sách bảo mật & quyền cá nhân hóa AI',
                  onTap: () => Navigator.pushNamed(
                    context,
                    '/customer/settings',
                    arguments: {'tab': SettingsTab.privacy},
                  ),
                ),
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.dns_outlined,
                  title: 'Cấu hình máy chủ API',
                  subtitle: 'Đổi địa chỉ kết nối backend (Live / Local)',
                  onTap: () => _showServerConfigDialog(context, ref),
                ),
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.help_outline_rounded,
                  title: 'Trợ giúp',
                  subtitle: 'Trung tâm hỗ trợ và câu hỏi thường gặp',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Trung tâm trợ giúp CSKH 24/7.')),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMenuTile({
    required IconData icon,
    required String title,
    String? subtitle,
    int? badgeCount,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
        leading: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Icon(
              icon,
              color: AppColors.textPrimary,
              size: 20,
            ),
          ),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        subtitle: subtitle != null
            ? Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              )
            : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (badgeCount != null && badgeCount > 0) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Text(
                  '$badgeCount',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
              const SizedBox(width: 6),
            ],
            const Icon(
              Icons.chevron_right,
              size: 20,
              color: AppColors.textMuted,
            ),
          ],
        ),
        onTap: onTap,
      ),
    );
  }

  /// 6. Section "Có thể bạn cũng thích" (Gợi ý sản phẩm)
  Widget _buildRecommendationsSection(BuildContext context, WidgetRef ref) {
    final catalogAsync = ref.watch(catalogProductsProvider(''));
    final recAsync = ref.watch(recommendationProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Có thể bạn cũng thích',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            InkWell(
              onTap: () => Navigator.pushNamed(context, '/explore'),
              child: const Row(
                children: [
                  Text(
                    'Xem tất cả',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
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
        const SizedBox(height: 12),
        catalogAsync.when(
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(24.0),
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          ),
          error: (_, _) => const SizedBox.shrink(),
          data: (data) {
            final rawItems = (data['items'] as List?)
                    ?.map((e) => Map<String, dynamic>.from(e as Map))
                    .toList() ??
                [];

            if (rawItems.isEmpty) return const SizedBox.shrink();

            final recIds = (recAsync.value?['product_ids'] as List?)
                    ?.map((e) => e.toString())
                    .toList() ??
                [];

            List<Map<String, dynamic>> products;
            if (recIds.isNotEmpty) {
              final recProducts = <Map<String, dynamic>>[];
              final otherProducts = <Map<String, dynamic>>[];
              for (final p in rawItems) {
                final id = p['id']?.toString() ?? '';
                if (recIds.contains(id)) {
                  recProducts.add(p);
                } else {
                  otherProducts.add(p);
                }
              }
              products = [...recProducts, ...otherProducts].take(6).toList();
            } else {
              products = rawItems.take(6).toList();
            }

            return GridView.builder(
              padding: EdgeInsets.zero,
              physics: const NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.68,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: products.length,
              itemBuilder: (context, idx) {
                final prod = products[idx];
                return _buildRecommendationCard(context, ref, prod);
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildRecommendationCard(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> product,
  ) {
    final title = product['title']?.toString() ?? 'Sản phẩm';
    final pId = product['id']?.toString() ?? '';
    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images.first is Map
            ? (images.first as Map)['image_url']?.toString()
            : images.first?.toString())
        : null;

    final variants = product['variants'] as List?;
    int priceInt = 299000;
    if (variants != null && variants.isNotEmpty) {
      final firstVar = variants.first as Map;
      final rawPrice = firstVar['price_vnd'];
      if (rawPrice is num) {
        priceInt = rawPrice.toInt();
      } else if (rawPrice is String) {
        priceInt = int.tryParse(rawPrice) ?? 299000;
      }
    }

    final originalPriceInt = (priceInt * 1.3).round();

    return InkWell(
      onTap: () {
        if (pId.isNotEmpty) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ProductDetailPage(productId: pId),
            ),
          );
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200, width: 0.8),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(5),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                  child: Container(
                    height: 140,
                    width: double.infinity,
                    color: Colors.grey.shade100,
                    child: imageUrl != null && imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, _, _) => const Center(
                              child: Icon(
                                Icons.shopping_bag_outlined,
                                color: Colors.grey,
                                size: 36,
                              ),
                            ),
                          )
                        : const Center(
                            child: Icon(
                              Icons.shopping_bag_outlined,
                              color: Colors.grey,
                              size: 36,
                            ),
                          ),
                  ),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      '-25%',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 2,
                  right: 2,
                  child: Consumer(
                    builder: (context, ref, _) {
                      final isFav =
                          ref.watch(favoritesProvider).any((f) => f.id == pId);
                      return GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          ref
                              .read(favoritesProvider.notifier)
                              .toggleFavorite(product);
                          AppNoticeDialog.show(
                            context,
                            message: isFav
                                ? 'Đã xóa khỏi danh sách yêu thích.'
                                : 'Đã thêm vào danh sách yêu thích!',
                          );
                        },
                        child: Container(
                          width: 44,
                          height: 44,
                          alignment: Alignment.center,
                          child: Container(
                            width: 30,
                            height: 30,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 3,
                                  offset: Offset(0, 1),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Icon(
                                isFav
                                    ? Icons.favorite_rounded
                                    : Icons.favorite_border_rounded,
                                size: 16,
                                color: isFav
                                    ? const Color(0xFFDC2626)
                                    : const Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      height: 1.25,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatVnd(priceInt),
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatVnd(originalPriceInt),
                    style: TextStyle(
                      color: Colors.grey.shade400,
                      fontSize: 11,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 12, color: Colors.amber),
                      const SizedBox(width: 3),
                      const Text(
                        '4.9',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Đã bán 1,2K',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showServerConfigDialog(BuildContext context, WidgetRef ref) {
    final client = ref.read(apiProvider);
    final controller = TextEditingController(text: client.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.dns_outlined, color: AppColors.primary),
              SizedBox(width: 8),
              Text(
                'Cấu hình máy chủ API',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Địa chỉ máy chủ hiện tại:',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  hintText: 'http://10.0.2.2:8080/api/v1',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Chọn nhanh cấu hình:',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.cloud_done_rounded, size: 14, color: AppColors.primary),
                    label: const Text('Máy chủ Live (demo.congnguyen.me)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    onPressed: () => controller.text = 'https://demo.congnguyen.me/api/v1',
                  ),
                  ActionChip(
                    label: const Text('Máy ảo Android (10.0.2.2)', style: TextStyle(fontSize: 10)),
                    onPressed: () => controller.text = 'http://10.0.2.2:8080/api/v1',
                  ),
                  ActionChip(
                    label: const Text('Windows / Desktop (127.0.0.1)', style: TextStyle(fontSize: 10)),
                    onPressed: () => controller.text = 'http://127.0.0.1:8080/api/v1',
                  ),
                  ActionChip(
                    label: const Text('Localhost (localhost:8080)', style: TextStyle(fontSize: 10)),
                    onPressed: () => controller.text = 'http://localhost:8080/api/v1',
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () async {
                final newUrl = controller.text.trim();
                if (newUrl.isNotEmpty) {
                  await client.updateBaseUrl(newUrl);
                  ref.invalidate(profileProvider);
                  ref.invalidate(catalogProductsProvider);
                  ref.invalidate(categoriesProvider);
                  if (ctx.mounted) {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Đã cập nhật máy chủ API: $newUrl')),
                    );
                  }
                }
              },
              child: const Text('Lưu & Áp dụng'),
            ),
          ],
        );
      },
    );
  }
}


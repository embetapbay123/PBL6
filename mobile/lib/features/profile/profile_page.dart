import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../chat/chat_ai_modal.dart';
import '../customer/customer_settings_page.dart';
import '../orders/order_list_page.dart';
import '../shared/app_bottom_nav.dart';
import '../shared/recommendations_section.dart';
import 'profile_model.dart';
import 'profile_provider.dart';
import 'widgets/profile_header_banner.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(userProfileProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 3,
        cartCount: 0,
        onTap: (index) {
          if (index == 3) return;
          if (index == 0) {
            Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
          } else if (index == 1) {
            Navigator.pushNamed(context, '/cart');
          } else if (index == 2) {
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
                  onPressed: () {
                    ref.invalidate(profileProvider);
                    ref.invalidate(userProfileProvider);
                  },
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
        data: (UserProfile userProfile) {
          final profile = userProfile.toMap();
          final displayName = userProfile.displayName;
          final phone = userProfile.phone;

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              ref.invalidate(profileProvider);
              ref.invalidate(userProfileProvider);
              ref.invalidate(userSocialStatsProvider);
              await ref.read(userProfileProvider.future);
            },
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                // 1. Top Orange Header Banner (matching Shopee profile header)
                ProfileHeaderBanner(profile: userProfile),

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
                _buildShoppingActivitiesSection(context, ref),
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
                    badgeCount: pendingCount ?? 0,
                  ),
                  _buildOrderStatusItem(
                    context,
                    initialIndex: 2,
                    icon: Icons.inventory_2_outlined,
                    label: 'Đang xử lý',
                    badgeCount: processingCount ?? 0,
                  ),
                  _buildOrderStatusItem(
                    context,
                    initialIndex: 3,
                    icon: Icons.local_shipping_outlined,
                    label: 'Đang giao',
                    badgeCount: shippedCount ?? 0,
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

  static String _formatPrice(num price) {
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

  /// 3. Lưới 2x2 "Hoạt động mua sắm"
  Widget _buildShoppingActivitiesSection(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletBalanceProvider);
    final walletData = walletAsync.value;
    final balance = (walletData?['balance_vnd'] as num?)?.toInt() ??
        (walletData?['balance'] as num?)?.toInt() ??
        (walletData?['amount_vnd'] as num?)?.toInt() ??
        500000;
    final balanceStr = _formatPrice(balance);

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
                title: 'Đã xem',
                onTap: () => Navigator.pushNamed(context, '/customer/recently-viewed'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActivityCard(
                context,
                icon: Icons.favorite_border_rounded,
                title: 'Đã lưu',
                onTap: () => Navigator.pushNamed(context, '/customer/favorites'),
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
                icon: Icons.account_balance_wallet_outlined,
                title: 'Ví số dư',
                subtitle: balanceStr,
                onTap: () => _showWalletBottomSheet(context, ref, balance),
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: SizedBox(),
            ),
          ],
        ),
      ],
    );
  }

  void _showWalletBottomSheet(BuildContext context, WidgetRef ref, int currentBalance) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final client = ref.read(apiProvider);
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF0F0),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.account_balance_wallet_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Ví số dư PBL6',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primary,
                      AppColors.primary.withAlpha(200),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Số dư khả dụng',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _formatPrice(currentBalance),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Dùng để thanh toán đơn hàng & nhận tiền hoàn đổi trả.',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Nạp nhanh số dư (Demo Sepay)',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [50000, 100000, 200000, 500000].map((amount) {
                  return ActionChip(
                    backgroundColor: const Color(0xFFFFF0F0),
                    side: BorderSide(color: AppColors.primary.withAlpha(60)),
                    label: Text(
                      '+${_formatPrice(amount)}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    onPressed: () {
                      client.topUpWallet(amount);
                      ref.invalidate(walletBalanceProvider);
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Đã nạp thành công ${_formatPrice(amount)} vào ví số dư!'),
                          backgroundColor: Colors.green.shade700,
                        ),
                      );
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Đóng'),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActivityCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? subtitle,
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle != null && subtitle.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
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
    return const RecommendationsSection(padding: EdgeInsets.zero);
  }



}

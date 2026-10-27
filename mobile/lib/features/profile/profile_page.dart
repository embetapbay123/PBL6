import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../shared/app_bottom_nav.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Tài khoản',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(
                  Icons.notifications_outlined,
                  color: AppColors.textPrimary,
                  size: 24,
                ),
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
            tooltip: 'Thông báo',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Không có thông báo mới.')),
              );
            },
          ),
          IconButton(
            icon: const Icon(
              Icons.settings_outlined,
              color: AppColors.textPrimary,
              size: 24,
            ),
            tooltip: 'Cài đặt',
            onPressed: () => ref.invalidate(profileProvider),
          ),
        ],
      ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 4,
        cartCount: 0,
        onTap: (index) {
          if (index == 0) {
            Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
          } else if (index == 1) {
            Navigator.pushNamed(context, '/products');
          } else if (index == 3) {
            Navigator.pushNamed(context, '/cart');
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
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              children: [
                // 1. User Header Banner Card (Red Gradient)
                _buildUserHeaderCard(
                  context,
                  ref,
                  profile: profile,
                  displayName: displayName,
                  email: email,
                  phone: phone,
                  roles: roles,
                ),
                const SizedBox(height: 16),

                // 2. Section "Đơn hàng của tôi"
                _buildMyOrdersSection(context),
                const SizedBox(height: 16),

                // 3. Section "Hoạt động mua sắm" (2x2 Grid)
                _buildShoppingActivitiesSection(context),
                const SizedBox(height: 16),

                // 4. Section "Tài khoản và bảo mật"
                _buildAccountSecuritySection(context, ref, profile, displayName, phone),
                const SizedBox(height: 16),

                // 5. Section "Hỗ trợ và cài đặt"
                _buildSupportSettingsSection(context),
                const SizedBox(height: 20),

                // 6. Nút Đăng xuất
                _buildLogoutButton(context, ref),
                const SizedBox(height: 12),

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
          );
        },
      ),
    );
  }

  /// 1. Thẻ thông tin cá nhân nền gradient đỏ
  Widget _buildUserHeaderCard(
    BuildContext context,
    WidgetRef ref, {
    required Map<String, dynamic> profile,
    required String displayName,
    required String email,
    String? phone,
    required List<String> roles,
  }) {
    final displayPhone = AppUtils.maskPhone(phone);

    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.redGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withAlpha(70),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Avatar tròn nền trắng
              Container(
                width: 68,
                height: 68,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    Icons.person,
                    size: 42,
                    color: Colors.grey.shade400,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              // Thông tin tên & số điện thoại
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      displayPhone.isNotEmpty && displayPhone != 'Chưa cập nhật SĐT'
                          ? displayPhone
                          : (email.isNotEmpty ? email : 'Chưa cập nhật SĐT'),
                      style: TextStyle(
                        color: Colors.white.withAlpha(220),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.2,
                      ),
                    ),
                    if (email.isNotEmpty && displayPhone != email) ...[
                      const SizedBox(height: 2),
                      Text(
                        email,
                        style: TextStyle(
                          color: Colors.white.withAlpha(180),
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              // Nút "Chỉnh sửa hồ sơ" dạng pill viền trắng
              Material(
                color: Colors.transparent,
                child: InkWell(
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
                  borderRadius: BorderRadius.circular(24),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.white.withAlpha(220), width: 1.2),
                      color: Colors.white.withAlpha(25),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.edit_outlined,
                          color: Colors.white,
                          size: 14,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Chỉnh sửa hồ sơ',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (roles.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              children: roles.map((role) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(40),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white.withAlpha(70), width: 0.8),
                  ),
                  child: Text(
                    role,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  /// 2. Khối "Đơn hàng của tôi"
  Widget _buildMyOrdersSection(BuildContext context) {
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
                    onTap: () => Navigator.pushNamed(context, '/orders'),
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
                    icon: Icons.receipt_long_outlined,
                    label: 'Chờ xác nhận',
                    badgeCount: 2,
                  ),
                  _buildOrderStatusItem(
                    context,
                    icon: Icons.inventory_2_outlined,
                    label: 'Đang xử lý',
                    badgeCount: 1,
                  ),
                  _buildOrderStatusItem(
                    context,
                    icon: Icons.local_shipping_outlined,
                    label: 'Đang giao',
                    badgeCount: 1,
                  ),
                  _buildOrderStatusItem(
                    context,
                    icon: Icons.check_circle_outline_rounded,
                    label: 'Hoàn thành',
                  ),
                  _buildOrderStatusItem(
                    context,
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
    required IconData icon,
    required String label,
    int? badgeCount,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.pushNamed(context, '/orders'),
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
                title: 'Dành cho bạn',
                onTap: () => Navigator.pushNamed(context, '/products'),
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
  Widget _buildSupportSettingsSection(BuildContext context) {
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
                  icon: Icons.notifications_none_rounded,
                  title: 'Thông báo',
                  subtitle: 'Cài đặt nhận tin khuyến mãi & đơn hàng',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cài đặt thông báo đang được cập nhật.')),
                    );
                  },
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
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildMenuTile(
                  icon: Icons.description_outlined,
                  title: 'Điều khoản và quyền riêng tư',
                  subtitle: 'Chính sách bảo mật & quy định sử dụng',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Điều khoản sử dụng nền tảng PBL6.')),
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
        trailing: const Icon(
          Icons.chevron_right,
          size: 20,
          color: AppColors.textMuted,
        ),
        onTap: onTap,
      ),
    );
  }

  /// 6. Nút Đăng xuất
  Widget _buildLogoutButton(BuildContext context, WidgetRef ref) {
    return OutlinedButton.icon(
      onPressed: () async {
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Xác nhận đăng xuất'),
            content: const Text('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Hủy'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                child: const Text('Đăng xuất'),
              ),
            ],
          ),
        );

        if (confirm == true) {
          await ref.read(apiProvider).logout();
          ref.invalidate(profileProvider);
          ref.invalidate(addressListProvider);
          ref.invalidate(cartItemsProvider);
          ref.invalidate(recommendationProvider);

          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đã đăng xuất thành công.')),
            );
            Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
          }
        }
      },
      icon: const Icon(Icons.logout_rounded, color: AppColors.primary, size: 20),
      label: const Text(
        'Đăng xuất',
        style: TextStyle(
          color: AppColors.primary,
          fontSize: 15,
          fontWeight: FontWeight.bold,
        ),
      ),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: AppColors.primary, width: 1.4),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(vertical: 14),
        backgroundColor: Colors.white,
      ),
    );
  }
}

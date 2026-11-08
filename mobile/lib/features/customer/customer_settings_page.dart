import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../chat/chat_ai_modal.dart';

enum SettingsTab {
  privacy,
  security,
  notifications,
  merchant,
}

class CustomerSettingsPage extends ConsumerStatefulWidget {
  final SettingsTab? initialTab;

  const CustomerSettingsPage({
    super.key,
    this.initialTab,
  });

  @override
  ConsumerState<CustomerSettingsPage> createState() =>
      _CustomerSettingsPageState();
}

class _CustomerSettingsPageState extends ConsumerState<CustomerSettingsPage> {
  SettingsTab? _activeSubTab;

  // Quyền riêng tư (Consent state)
  bool _consentLoading = true;
  bool _consentBusy = false;
  bool _granted = true;
  int _consentVersion = 1;
  String? _consentError;
  String? _consentNotice;

  // Thông báo state
  bool _notifyOrders = true;
  bool _notifyPromotions = true;
  bool _notifyStoreChat = true;

  // Lời mời Store state
  bool _invitationsLoading = false;
  List<Map<String, dynamic>> _invitations = [];

  @override
  void initState() {
    super.initState();
    _activeSubTab = widget.initialTab;
    _loadConsent();
  }

  Future<void> _loadConsent() async {
    setState(() {
      _consentLoading = true;
      _consentError = null;
    });

    try {
      final client = ref.read(apiProvider);
      final res = await client.getPersonalizationConsent();
      if (mounted) {
        setState(() {
          _granted = res['status'] == 'GRANTED';
          _consentVersion = (res['version'] as num?)?.toInt() ?? 1;
          _consentLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _consentError = errorMessage(e);
          _consentLoading = false;
          _granted = true;
          _consentVersion = 1;
        });
      }
    }
  }

  Future<void> _toggleConsent() async {
    if (_consentBusy) return;

    setState(() {
      _consentBusy = true;
      _consentError = null;
      _consentNotice = null;
    });

    final targetStatus = _granted ? 'WITHDRAWN' : 'GRANTED';
    try {
      final client = ref.read(apiProvider);
      final res = await client.updatePersonalizationConsent(
        targetStatus,
        _consentVersion,
      );
      if (mounted) {
        setState(() {
          _granted = targetStatus == 'GRANTED';
          _consentVersion = (res['version'] as num?)?.toInt() ?? (_consentVersion + 1);
          _consentBusy = false;
          _consentNotice = _granted
              ? 'Đã bật quyền cá nhân hóa thành công.'
              : 'Đã thu hồi quyền cá nhân hóa thành công.';
        });
        ref.invalidate(recommendationProvider);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _consentError = errorMessage(e);
          _consentBusy = false;
        });
        ref.invalidate(recommendationProvider);
      }
    }
  }

  Future<void> _loadInvitations() async {
    setState(() => _invitationsLoading = true);
    try {
      final client = ref.read(apiProvider);
      final res = await client.listOwnInvitations();
      if (mounted) {
        setState(() {
          _invitations = (res['items'] as List?)
                  ?.map((e) => Map<String, dynamic>.from(e as Map))
                  .toList() ??
              [];
          _invitationsLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _invitations = [];
          _invitationsLoading = false;
        });
      }
    }
  }

  Future<void> _respondInvitation(String id, bool accept) async {
    try {
      final client = ref.read(apiProvider);
      if (accept) { await client.acceptInvitation(id); }
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: accept
              ? 'Đã chấp nhận lời mời tham gia gian hàng!'
              : 'Đã từ chối lời mời.',
        );
        _loadInvitations();
      }
    } catch (e) {
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: 'Lỗi khi phản hồi lời mời: ${errorMessage(e)}',
        );
      }
    }
  }

  Future<void> _handleLogout(BuildContext context) async {
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
  }

  @override
  Widget build(BuildContext context) {
    if (_activeSubTab != null) {
      return _buildSubTabScreen();
    }
    return _buildMainSettingsScreen();
  }

  Widget _buildMainSettingsScreen() {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back,
            color: Color(0xFFEE4D2D),
            size: 24,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Cài đặt',
          style: TextStyle(
            color: Color(0xFF1F2937),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(
                  Icons.chat_bubble_outline_rounded,
                  color: Color(0xFFEE4D2D),
                  size: 24,
                ),
                Positioned(
                  right: -6,
                  top: -4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEE4D2D),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: const Text(
                      '37',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
            tooltip: 'Tin nhắn',
            onPressed: () => ChatAiModal.show(context),
          ),
        ],
      ),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Section 1: Tài khoản của tôi
          _buildSectionHeader('Tài khoản của tôi'),
          _buildSectionContainer([
            _buildSettingRow(
              title: 'Tài khoản & Bảo mật',
              onTap: () => setState(() => _activeSubTab = SettingsTab.security),
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Địa Chỉ',
              onTap: () => Navigator.pushNamed(context, '/customer/addresses'),
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Tài khoản / Thẻ ngân hàng',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Tính năng liên kết Tài khoản / Thẻ ngân hàng đang phát triển.',
                );
              },
            ),
          ]),

          // Section 2: Cài đặt
          _buildSectionHeader('Cài đặt'),
          _buildSectionContainer([
            _buildSettingRow(
              title: 'Cài đặt Chat',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Cài đặt chat và trả lời tự động đang được cập nhật.',
                );
              },
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Cài đặt đơn hàng',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Cài đặt đơn hàng đang được cập nhật.',
                );
              },
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Cài đặt Thông báo',
              onTap: () => setState(() => _activeSubTab = SettingsTab.notifications),
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Cài đặt riêng tư',
              onTap: () => setState(() => _activeSubTab = SettingsTab.privacy),
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Người dùng đã bị chặn',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Danh sách người dùng đã bị chặn đang trống.',
                );
              },
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Ngôn ngữ / Language / ភាសា',
              subtitle: 'Tiếng Việt',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Hệ thống hiện tại đang sử dụng Tiếng Việt (Mặc định).',
                );
              },
            ),
          ]),

          // Section 3: Hỗ trợ
          _buildSectionHeader('Hỗ trợ'),
          _buildSectionContainer([
            _buildSettingRow(
              title: 'Trung tâm hỗ trợ',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Tổng đài hỗ trợ 24/7 của PBL6: 1900 1234.',
                );
              },
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Tiêu chuẩn cộng đồng',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Quy định và tiêu chuẩn cộng đồng PBL6 Marketplace.',
                );
              },
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Điều khoản Shopee',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Điều khoản dịch vụ và chính sách bảo mật PBL6 Marketplace.',
                );
              },
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Hài lòng với Shopee? Hãy đánh giá ngay!',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Cảm ơn bạn đã đồng hành cùng PBL6 Marketplace!',
                );
              },
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Giới thiệu',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'PBL6 Marketplace v1.0.0 · Phát triển bởi nhóm dự án PBL6.',
                );
              },
            ),
            _buildDivider(),
            _buildSettingRow(
              title: 'Yêu cầu hủy tài khoản',
              onTap: () {
                AppNoticeDialog.show(
                  context,
                  message: 'Để yêu cầu hủy tài khoản, vui lòng liên hệ admin@pbl6.market.',
                );
              },
            ),
          ]),

          // Bottom Logout Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFFD1D5DB), width: 1.2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                onPressed: () => _handleLogout(context),
                child: const Text(
                  'Chuyển tài khoản / Đăng xuất',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSubTabScreen() {
    String tabTitle = 'Cài đặt';
    switch (_activeSubTab!) {
      case SettingsTab.privacy:
        tabTitle = 'Cài đặt riêng tư';
        break;
      case SettingsTab.security:
        tabTitle = 'Tài khoản & Bảo mật';
        break;
      case SettingsTab.notifications:
        tabTitle = 'Cài đặt Thông báo';
        break;
      case SettingsTab.merchant:
        tabTitle = 'Lời mời gian hàng';
        break;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back,
            color: Color(0xFFEE4D2D),
            size: 24,
          ),
          onPressed: () {
            if (widget.initialTab != null && Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              setState(() => _activeSubTab = null);
            }
          },
        ),
        title: Text(
          tabTitle,
          style: const TextStyle(
            color: Color(0xFF1F2937),
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          children: [
            _buildActiveTabContent(),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Container(
      width: double.infinity,
      color: const Color(0xFFF6F6F6),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 12.5,
          color: Color(0xFF6B7280),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildSectionContainer(List<Widget> children) {
    return Container(
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }

  Widget _buildDivider() {
    return const Divider(
      height: 1,
      thickness: 0.6,
      color: Color(0xFFEEEEEE),
      indent: 16,
    );
  }

  Widget _buildSettingRow({
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14.5,
                      color: Color(0xFF1F2937),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF9CA3AF),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 13,
              color: Color(0xFFBDBDBD),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveTabContent() {
    if (_activeSubTab == null) return const SizedBox.shrink();
    switch (_activeSubTab!) {
      case SettingsTab.privacy:
        return _buildPrivacyTab();
      case SettingsTab.security:
        return _buildSecurityTab();
      case SettingsTab.notifications:
        return _buildNotificationsTab();
      case SettingsTab.merchant:
        return _buildMerchantTab();
    }
  }

  /// 1. Tab Quyền riêng tư (Đồng bộ tuyệt đối với giao diện Web)
  Widget _buildPrivacyTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(6),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Quyền cá nhân hóa AI',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Bạn có thể cấp hoặc thu hồi quyền sử dụng hành vi để cá nhân hóa gợi ý.',
                style: TextStyle(
                  fontSize: 13.5,
                  color: Color(0xFF64748B),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 18),

              if (_consentLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                      SizedBox(width: 10),
                      Text(
                        'Đang kiểm tra quyền cá nhân hóa...',
                        style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                )
              else ...[
                Row(
                  children: [
                    const Text(
                      'Trạng thái hiện tại: ',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF334155),
                      ),
                    ),
                    Text(
                      _granted ? 'GRANTED' : 'REVOKED',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _granted
                            ? const Color(0xFF0F172A)
                            : const Color(0xFFDC2626),
                      ),
                    ),
                    Text(
                      ' · phiên bản $_consentVersion',
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                SizedBox(
                  height: 42,
                  child: FilledButton(
                    onPressed: _consentBusy ? null : _toggleConsent,
                    style: FilledButton.styleFrom(
                      backgroundColor: _granted
                          ? const Color(0xFFC84A32)
                          : const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                    ),
                    child: _consentBusy
                        ? const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              ),
                              SizedBox(width: 8),
                              Text('Đang lưu...'),
                            ],
                          )
                        : Text(
                            _granted ? 'Thu hồi (Revoke)' : 'Cấp quyền (Grant)',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],

              if (_consentNotice != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_outline_rounded,
                          size: 16, color: Color(0xFF16A34A)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _consentNotice!,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF166534),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (_consentError != null) ...[
                const SizedBox(height: 10),
                Text(
                  _consentError!,
                  style: const TextStyle(fontSize: 12.5, color: Colors.red),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline_rounded,
                  size: 20, color: Color(0xFF475569)),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Khi cấp quyền (GRANTED), sàn PBL6 sử dụng mô hình học máy để đề xuất các sản phẩm, bộ sưu tập và ưu đãi phù hợp với sở thích mua sắm của bạn. Bạn có thể thu hồi bất cứ lúc nào.',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF475569),
                    height: 1.45,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// 2. Tab Bảo mật
  Widget _buildSecurityTab() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bảo mật tài khoản & Đăng nhập',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Quản lý mật khẩu truy cập và bảo vệ an toàn cho tài khoản.',
            style: TextStyle(
              fontSize: 13.5,
              color: Color(0xFF64748B),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),
          _buildActionItem(
            icon: Icons.key_rounded,
            title: 'Đổi mật khẩu',
            subtitle: 'Cập nhật mật khẩu mới định kỳ để bảo vệ tài khoản',
            buttonLabel: 'Đổi mật khẩu',
            onTap: () => Navigator.pushNamed(context, '/change-password'),
          ),
          const Divider(height: 32, color: Color(0xFFE2E8F0)),
          _buildActionItem(
            icon: Icons.dns_outlined,
            title: 'Cấu hình máy chủ API',
            subtitle: 'Chuyển đổi giữa demo.congnguyen.me và môi trường cục bộ',
            buttonLabel: 'Cấu hình',
            onTap: () => _showServerConfigDialog(context),
          ),
        ],
      ),
    );
  }

  /// 3. Tab Thông báo
  Widget _buildNotificationsTab() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tùy chọn nhận thông báo',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Kiểm soát những tin tức và thông báo bạn muốn nhận từ sàn.',
            style: TextStyle(
              fontSize: 13.5,
              color: Color(0xFF64748B),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            activeTrackColor: AppColors.primary,
            title: const Text(
              'Cập nhật đơn hàng',
              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
            ),
            subtitle: const Text(
              'Thông báo trạng thái duyệt, đóng gói và giao hàng',
              style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
            ),
            value: _notifyOrders,
            onChanged: (val) => setState(() => _notifyOrders = val),
          ),
          const Divider(height: 16, color: Color(0xFFE2E8F0)),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            activeTrackColor: AppColors.primary,
            title: const Text(
              'Ưu đãi & Khuyến mãi',
              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
            ),
            subtitle: const Text(
              'Mã giảm giá sàn, voucher từ gian hàng và flash sale',
              style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
            ),
            value: _notifyPromotions,
            onChanged: (val) => setState(() => _notifyPromotions = val),
          ),
          const Divider(height: 16, color: Color(0xFFE2E8F0)),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            activeTrackColor: AppColors.primary,
            title: const Text(
              'Tin nhắn từ gian hàng',
              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
            ),
            subtitle: const Text(
              'Nhận chuông báo khi người bán phản hồi tin nhắn',
              style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
            ),
            value: _notifyStoreChat,
            onChanged: (val) => setState(() => _notifyStoreChat = val),
          ),
        ],
      ),
    );
  }

  /// 4. Tab Bán hàng
  Widget _buildMerchantTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(6),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Đăng ký trở thành Người bán',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Mở gian hàng kinh doanh, tiếp cận hàng triệu khách hàng tiềm năng trên PBL6.',
                style: TextStyle(
                  fontSize: 13.5,
                  color: Color(0xFF64748B),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 44,
                child: FilledButton.icon(
                  onPressed: () =>
                      Navigator.pushNamed(context, '/customer/store-application'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  icon: const Icon(Icons.storefront_outlined, size: 20),
                  label: const Text(
                    'Đăng ký mở Store ngay',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(6),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Lời mời tham gia Gian hàng',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, size: 20),
                    onPressed: _loadInvitations,
                    tooltip: 'Tải lại danh sách',
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Các cửa hàng đã mời bạn tham gia đội ngũ quản lý.',
                style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 16),

              if (_invitationsLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              else if (_invitations.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: const Column(
                    children: [
                      Icon(Icons.mail_outline_rounded,
                          size: 44, color: Color(0xFF94A3B8)),
                      SizedBox(height: 10),
                      Text(
                        'Không có lời mời nào.',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _invitations.length,
                  separatorBuilder: (context, index) =>
                      const Divider(height: 24, color: Color(0xFFE2E8F0)),
                  itemBuilder: (context, idx) {
                    final inv = _invitations[idx];
                    final invId = inv['id']?.toString() ?? '';
                    final storeName = inv['store_name']?.toString() ?? 'Gian hàng';
                    final role = inv['role']?.toString() ?? 'STAFF';

                    return Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.store_rounded,
                              color: AppColors.primary, size: 22),
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
                                  fontSize: 14.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Vai trò mời: $role',
                                style: const TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.check_circle_rounded,
                              color: Color(0xFF16A34A), size: 26),
                          tooltip: 'Chấp nhận',
                          onPressed: () => _respondInvitation(invId, true),
                        ),
                        IconButton(
                          icon: const Icon(Icons.cancel_rounded,
                              color: Color(0xFFDC2626), size: 26),
                          tooltip: 'Từ chối',
                          onPressed: () => _respondInvitation(invId, false),
                        ),
                      ],
                    );
                  },
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required String buttonLabel,
    required VoidCallback onTap,
  }) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Icon(icon, color: AppColors.primary, size: 22),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14.5,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF0F172A),
            side: const BorderSide(color: Color(0xFFCBD5E1)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          ),
          child: Text(
            buttonLabel,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  void _showServerConfigDialog(BuildContext context) {
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
                    avatar: const Icon(Icons.cloud_done_rounded,
                        size: 14, color: AppColors.primary),
                    label: const Text('Máy chủ Live (demo.congnguyen.me)',
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary)),
                    onPressed: () =>
                        controller.text = 'https://demo.congnguyen.me/api/v1',
                  ),
                  ActionChip(
                    label: const Text('Máy ảo Android (10.0.2.2)',
                        style: TextStyle(fontSize: 10)),
                    onPressed: () => controller.text = 'http://10.0.2.2:8080/api/v1',
                  ),
                  ActionChip(
                    label: const Text('Windows / Desktop (127.0.0.1)',
                        style: TextStyle(fontSize: 10)),
                    onPressed: () =>
                        controller.text = 'http://127.0.0.1:8080/api/v1',
                  ),
                  ActionChip(
                    label: const Text('Localhost (localhost:8080)',
                        style: TextStyle(fontSize: 10)),
                    onPressed: () =>
                        controller.text = 'http://localhost:8080/api/v1',
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

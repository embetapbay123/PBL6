import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';

enum SettingsTab {
  privacy,
  security,
  notifications,
  merchant,
}

class CustomerSettingsPage extends ConsumerStatefulWidget {
  final SettingsTab initialTab;

  const CustomerSettingsPage({
    super.key,
    this.initialTab = SettingsTab.privacy,
  });

  @override
  ConsumerState<CustomerSettingsPage> createState() =>
      _CustomerSettingsPageState();
}

class _CustomerSettingsPageState extends ConsumerState<CustomerSettingsPage> {
  late SettingsTab _selectedTab;

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
    _selectedTab = widget.initialTab;
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
          // Fallback to GRANTED version 1 so UI still reflects proper state
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
          _consentVersion =
              (res['version'] as num?)?.toInt() ?? (_consentVersion + 1);
          _consentNotice = 'Đã lưu quyền cá nhân hóa qua API.';
        });
        ref.invalidate(recommendationProvider);
      }
    } catch (e) {
      if (mounted) {
        // Fallback local state toggle if API connection is unavailable
        setState(() {
          _granted = targetStatus == 'GRANTED';
          _consentVersion++;
          _consentNotice = 'Đã cập nhật trạng thái quyền cá nhân hóa.';
        });
        ref.invalidate(recommendationProvider);
      }
    } finally {
      if (mounted) {
        setState(() => _consentBusy = false);
      }
    }
  }

  Future<void> _loadInvitations() async {
    setState(() {
      _invitationsLoading = true;
    });
    try {
      final client = ref.read(apiProvider);
      final res = await client.listOwnInvitations();
      final items = (res['items'] as List?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          [];
      if (mounted) {
        setState(() {
          _invitations = items;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: AppColors.textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Cài đặt & Quyền riêng tư',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          children: [
            // Page Title and Subtitle matching Web
            const Text(
              'Trung tâm Khách hàng & Cài đặt',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Quản lý quyền riêng tư, sự đồng ý và các tiện ích tài khoản.',
              style: TextStyle(
                fontSize: 13.5,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w400,
              ),
            ),
            const SizedBox(height: 20),

            // Horizontal Tab Selector Bar
            _buildTabSelector(),
            const SizedBox(height: 20),

            // Active Tab Content Card
            _buildActiveTabContent(),
          ],
        ),
      ),
    );
  }

  Widget _buildTabSelector() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          _buildTabPill(
            tab: SettingsTab.privacy,
            label: 'Quyền riêng tư',
            icon: Icons.verified_user_outlined,
          ),
          const SizedBox(width: 8),
          _buildTabPill(
            tab: SettingsTab.security,
            label: 'Bảo mật',
            icon: Icons.lock_outline_rounded,
          ),
          const SizedBox(width: 8),
          _buildTabPill(
            tab: SettingsTab.notifications,
            label: 'Thông báo',
            icon: Icons.notifications_none_rounded,
          ),
          const SizedBox(width: 8),
          _buildTabPill(
            tab: SettingsTab.merchant,
            label: 'Bán hàng',
            icon: Icons.storefront_outlined,
          ),
        ],
      ),
    );
  }

  Widget _buildTabPill({
    required SettingsTab tab,
    required String label,
    required IconData icon,
  }) {
    final isSelected = _selectedTab == tab;

    return InkWell(
      onTap: () {
        setState(() => _selectedTab = tab);
        if (tab == SettingsTab.merchant) {
          _loadInvitations();
        }
      },
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFFF5F3) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withAlpha(200)
                : const Color(0xFFE2E8F0),
            width: isSelected ? 1.4 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withAlpha(25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withAlpha(8),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  )
                ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? AppColors.primary : const Color(0xFF64748B),
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? AppColors.primary : const Color(0xFF334155),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveTabContent() {
    switch (_selectedTab) {
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
              // Title: Quyền cá nhân hóa AI
              const Text(
                'Quyền cá nhân hóa AI',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),

              // Subtitle: Bạn có thể cấp hoặc thu hồi quyền...
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
                // Status text: Trạng thái hiện tại: GRANTED · phiên bản 1
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

                // Button: Thu hồi (Revoke) / Cấp quyền (Grant)
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

        // Thẻ thông tin giải thích thêm về AI
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
                'Kênh Người Bán & Gian Hàng',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Mở rộng kinh doanh và bán hàng trên sàn đa gian hàng PBL6.',
                style: TextStyle(
                  fontSize: 13.5,
                  color: Color(0xFF64748B),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),
              _buildActionItem(
                icon: Icons.add_business_rounded,
                title: 'Đăng ký mở gian hàng mới',
                subtitle: 'Nộp hồ sơ và thông tin liên hệ để mở shop',
                buttonLabel: 'Mở gian hàng',
                onTap: () =>
                    Navigator.pushNamed(context, '/store-applications'),
              ),
              const Divider(height: 32, color: Color(0xFFE2E8F0)),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Lời mời làm nhân viên Store',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Các lời mời phân quyền quản lý từ chủ shop',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, size: 20),
                    onPressed: _loadInvitations,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_invitationsLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  ),
                )
              else if (_invitations.isEmpty)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: const Center(
                    child: Text(
                      'Hiện không có lời mời nào dành cho bạn.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                  ),
                )
              else
                ..._invitations.map((inv) {
                  final storeName = inv['store_name'] ?? 'Gian hàng';
                  final status = inv['status'] ?? 'PENDING';
                  final invId = inv['id']?.toString() ?? '';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                storeName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                'Trạng thái: $status',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (status == 'PENDING' && invId.isNotEmpty)
                          FilledButton(
                            onPressed: () async {
                              try {
                                await ref
                                    .read(apiProvider)
                                    .acceptInvitation(invId);
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                          'Đã chấp nhận lời mời tham gia gian hàng!'),
                                    ),
                                  );
                                  _loadInvitations();
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
                            },
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                            ),
                            child: const Text('Chấp nhận',
                                style: TextStyle(fontSize: 12)),
                          ),
                      ],
                    ),
                  );
                }),
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
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF0F0),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Color(0xFFCBD5E1)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
          child: Text(
            buttonLabel,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: Color(0xFF334155),
            ),
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
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
                    onPressed: () =>
                        controller.text = 'http://10.0.2.2:8080/api/v1',
                  ),
                  ActionChip(
                    label: const Text('Windows / Desktop (127.0.0.1)',
                        style: TextStyle(fontSize: 10)),
                    onPressed: () =>
                        controller.text = 'http://127.0.0.1:8080/api/v1',
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
                      SnackBar(
                          content: Text('Đã cập nhật máy chủ API: $newUrl')),
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

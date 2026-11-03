import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';

class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key, this.initialProfile});
  final Map<String, dynamic>? initialProfile;

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  late String _displayName;
  late String _email;
  late String _phone;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final profile = widget.initialProfile;
    _displayName = profile?['display_name']?.toString() ?? '[DEMO] Nguyễn Minh An';
    _email = profile?['email']?.toString() ?? 'customer.a@pbl6.test';
    _phone = profile?['phone']?.toString() ?? '';
  }

  Future<void> _updateProfile({String? newName, String? newPhone}) async {
    setState(() => _busy = true);
    try {
      final client = ref.read(apiProvider);
      final updatedName = (newName ?? _displayName).trim();
      final updatedPhone = (newPhone ?? _phone).trim();

      await client.updateProfile(
        displayName: updatedName.isNotEmpty ? updatedName : null,
        phone: updatedPhone.isNotEmpty ? updatedPhone : null,
      );

      setState(() {
        if (newName != null) _displayName = updatedName;
        if (newPhone != null) _phone = updatedPhone;
      });

      ref.invalidate(profileProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cập nhật thông tin thành công!'),
            backgroundColor: Color(0xFF059669),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Không thể cập nhật: ${errorMessage(e)}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showChangeNameDialog() {
    final nameCtrl = TextEditingController(text: _displayName);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Thay đổi tên hiển thị', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: nameCtrl,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Tên hiển thị',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: Color(0xFF64748B))),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFBA3416)),
            onPressed: () {
              final newName = nameCtrl.text.trim();
              if (newName.isNotEmpty) {
                Navigator.pop(ctx);
                _updateProfile(newName: newName);
              }
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
  }

  void _showChangePhoneDialog() {
    final phoneCtrl = TextEditingController(text: _phone);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Thay đổi số điện thoại', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: phoneCtrl,
          keyboardType: TextInputType.phone,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Số điện thoại',
            hintText: 'Ví dụ: 0901234567',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: Color(0xFF64748B))),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFBA3416)),
            onPressed: () {
              final newPhone = phoneCtrl.text.trim();
              Navigator.pop(ctx);
              _updateProfile(newPhone: newPhone);
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
  }

  void _showFullEditSheet() {
    final nameCtrl = TextEditingController(text: _displayName);
    final phoneCtrl = TextEditingController(text: _phone);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Chỉnh sửa thông tin cá nhân',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Tên hiển thị *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Số điện thoại',
                hintText: 'Ví dụ: 0901234567',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFBA3416),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                final newName = nameCtrl.text.trim();
                final newPhone = phoneCtrl.text.trim();
                if (newName.isNotEmpty) {
                  Navigator.pop(ctx);
                  _updateProfile(newName: newName, newPhone: newPhone);
                }
              },
              child: const Text('Lưu thay đổi', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // If initialProfile was not passed, sync with profileProvider if loaded
    if (widget.initialProfile == null) {
      final profileDataAsync = ref.watch(profileProvider);
      profileDataAsync.whenData((data) {
        final dName = data['display_name']?.toString();
        final eml = data['email']?.toString();
        final phn = data['phone']?.toString();
        if (dName != null && dName.isNotEmpty && _displayName == '[DEMO] Nguyễn Minh An') {
          _displayName = dName;
        }
        if (eml != null && eml.isNotEmpty && _email == 'customer.a@pbl6.test') {
          _email = eml;
        }
        if (phn != null && _phone.isEmpty) {
          _phone = phn;
        }
      });
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Chỉnh sửa hồ sơ',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: Color(0xFF0F172A),
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Horizontal Sub-Navigation Tabs matching Web Screenshot
            _buildSubNavTabs(context),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 2. Large Page Heading "Thông tin cá nhân"
                  const Text(
                    'Thông tin cá nhân',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 3. Information Card matching Web Screenshot
                  _buildProfileCard(context),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Horizontal Sub-Navigation Tabs matching Web
  Widget _buildSubNavTabs(BuildContext context) {
    final tabs = [
      {'label': 'Tổng quan', 'active': false},
      {'label': 'Thông tin cá nhân', 'active': true},
      {'label': 'Đơn hàng', 'active': false},
      {'label': 'Yêu thích', 'active': false},
      {'label': 'Đánh giá của tôi', 'active': false},
      {'label': 'Tin nhắn', 'active': false},
      {'label': 'Thông báo', 'active': false},
    ];

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: tabs.map((tab) {
            final isActive = tab['active'] as bool;
            final label = tab['label'] as String;

            return Padding(
              padding: const EdgeInsets.only(right: 6),
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () {
                  if (label == 'Tổng quan') {
                    Navigator.pop(context);
                  } else if (label == 'Đơn hàng') {
                    Navigator.pushNamed(context, '/orders');
                  } else if (label == 'Tin nhắn') {
                    Navigator.pushReplacementNamed(context, '/store-messages');
                  } else if (label == 'Yêu thích') {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Danh sách sản phẩm yêu thích')),
                    );
                  } else if (label == 'Đánh giá của tôi') {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Đánh giá của tôi')),
                    );
                  } else if (label == 'Thông báo') {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Không có thông báo mới.')),
                    );
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFFFBF2ED) : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      color: isActive ? const Color(0xFFBA3416) : const Color(0xFF475569),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  /// Profile Card matching Web Screenshot
  Widget _buildProfileCard(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Tên hiển thị
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Tên hiển thị',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _displayName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ),
              InkWell(
                onTap: _showChangeNameDialog,
                borderRadius: BorderRadius.circular(6),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Text(
                    'Thay đổi tên',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ),
              ),
            ],
          ),

          const Divider(height: 28, thickness: 1, color: Color(0xFFF1F5F9)),

          // Row 2: Email đăng nhập
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Email đăng nhập',
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _email,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Email đăng nhập được giữ cố định.',
                style: TextStyle(
                  fontSize: 11.5,
                  color: Color(0xFF94A3B8),
                ),
              ),
            ],
          ),

          const Divider(height: 28, thickness: 1, color: Color(0xFFF1F5F9)),

          // Row 3: Số điện thoại
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Số điện thoại',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _phone.isNotEmpty ? _phone : 'Chưa bổ sung',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: _phone.isNotEmpty ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
              InkWell(
                onTap: _showChangePhoneDialog,
                borderRadius: BorderRadius.circular(6),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Text(
                    'Thay đổi số điện thoại',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ),
              ),
            ],
          ),

          const Divider(height: 32, thickness: 1, color: Color(0xFFF1F5F9)),

          // Row 4: Action Buttons (Chỉnh sửa thông tin + Đổi mật khẩu)
          Row(
            children: [
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFBA3416),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                ),
                onPressed: _busy ? null : _showFullEditSheet,
                child: _busy
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Chỉnh sửa thông tin',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
              ),
              const SizedBox(width: 14),
              TextButton(
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                onPressed: () => Navigator.pushNamed(context, '/change-password'),
                child: const Text(
                  'Đổi mật khẩu',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

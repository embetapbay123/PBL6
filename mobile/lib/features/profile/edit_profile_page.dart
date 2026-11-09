import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';

class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key, this.initialProfile});
  final Map<String, dynamic>? initialProfile;

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  late String _displayName;
  late String _bio;
  late String _gender;
  late String _birthDate;
  late String _phone;
  late String _email;
  late String _avatarUrl;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final profile = widget.initialProfile;
    _displayName = profile?['display_name']?.toString() ??
        profile?['name']?.toString() ??
        'kophai?mincong';
    _email = profile?['email']?.toString() ?? 'nminhcong24@gmail.com';
    _phone = profile?['phone']?.toString() ??
        profile?['phone_number']?.toString() ??
        '0901234582';
    _bio = profile?['bio']?.toString() ?? '';
    _gender = profile?['gender']?.toString() ?? '';
    _birthDate = profile?['birth_date']?.toString() ??
        profile?['birthday']?.toString() ??
        '';
    _avatarUrl = profile?['avatar_url']?.toString() ??
        profile?['avatar']?.toString() ??
        '';
  }

  String _maskPhone(String phone) {
    final cleaned = phone.trim();
    if (cleaned.isEmpty) return 'Thiết lập ngay';
    if (cleaned.length <= 2) return cleaned;
    final suffix = cleaned.substring(cleaned.length - 2);
    return '*********$suffix';
  }

  String _maskEmail(String email) {
    final trimmed = email.trim();
    if (trimmed.isEmpty) return 'Thiết lập ngay';
    final parts = trimmed.split('@');
    if (parts.length != 2) return trimmed;
    final user = parts[0];
    final domain = parts[1];
    if (user.length <= 2) {
      final first = user[0];
      return '$first*@$domain';
    }
    final firstChar = user[0];
    final lastChar = user[user.length - 1];
    return '$firstChar***********$lastChar@$domain';
  }

  Future<void> _updateProfile({
    String? newName,
    String? newPhone,
    String? newBio,
    String? newGender,
    String? newBirthDate,
    String? newAvatarUrl,
  }) async {
    setState(() => _busy = true);
    try {
      final client = ref.read(apiProvider);
      final updatedName = (newName ?? _displayName).trim();
      final updatedPhone = (newPhone ?? _phone).trim();

      await client.updateProfile(
        displayName: updatedName.isNotEmpty ? updatedName : null,
        phone: updatedPhone.isNotEmpty ? updatedPhone : null,
        avatarUrl: newAvatarUrl ?? (_avatarUrl.isNotEmpty ? _avatarUrl : null),
      );

      setState(() {
        if (newName != null) _displayName = updatedName;
        if (newPhone != null) _phone = updatedPhone;
        if (newBio != null) _bio = newBio.trim();
        if (newGender != null) _gender = newGender;
        if (newBirthDate != null) _birthDate = newBirthDate;
        if (newAvatarUrl != null) _avatarUrl = newAvatarUrl;
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
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Thay đổi tên hiển thị',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: nameCtrl,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'Tên hiển thị',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: Color(0xFF64748B))),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
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

  void _showChangeBioDialog() {
    final bioCtrl = TextEditingController(text: _bio);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Thiết lập tiểu sử',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: bioCtrl,
          maxLines: 3,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Thêm vài dòng giới thiệu về bản thân...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: Color(0xFF64748B))),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _updateProfile(newBio: bioCtrl.text.trim());
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
  }

  void _showGenderSelectionSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Text(
                  'Chọn giới tính',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
              ),
              const Divider(height: 1, color: Color(0xFFF1F3F5)),
              ...['Nam', 'Nữ', 'Khác'].map((g) {
                final isSelected = _gender == g;
                return ListTile(
                  title: Text(
                    g,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? AppColors.primary : const Color(0xFF1F2937),
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check, color: AppColors.primary)
                      : null,
                  onTap: () {
                    Navigator.pop(ctx);
                    _updateProfile(newGender: g);
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _selectBirthDate() async {
    final now = DateTime.now();
    DateTime initial = DateTime(2000, 1, 1);
    if (_birthDate.isNotEmpty) {
      final parts = _birthDate.split('/');
      if (parts.length == 3) {
        final d = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        final y = int.tryParse(parts[2]);
        if (d != null && m != null && y != null) {
          initial = DateTime(y, m, d);
        }
      }
    }

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1920),
      lastDate: now,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: Color(0xFF1F2937),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final dayStr = picked.day.toString().padLeft(2, '0');
      final monthStr = picked.month.toString().padLeft(2, '0');
      final formatted = '$dayStr/$monthStr/${picked.year}';
      _updateProfile(newBirthDate: formatted);
    }
  }

  void _showPersonalInfoNotice() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF0ED),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.shield_outlined,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Thông tin cá nhân',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Thông tin cá nhân của bạn được mã hóa và bảo mật nghiêm ngặt theo tiêu chuẩn an toàn. Một số dữ liệu giúp chúng tôi cá nhân hóa trải nghiệm gợi ý mua sắm và bảo vệ tài khoản khi cần xác minh danh tính.',
                style: TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: Color(0xFF4B5563),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Đã hiểu', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showChangePhoneDialog() {
    final phoneCtrl = TextEditingController(text: _phone);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Thay đổi số điện thoại',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: phoneCtrl,
          keyboardType: TextInputType.phone,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'Số điện thoại',
            hintText: 'Ví dụ: 0901234567',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: Color(0xFF64748B))),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
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

  void _showEmailInfoDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Email đăng nhập',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _email,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Email đăng nhập được sử dụng để xác thực tài khoản và nhận thông báo bảo mật. Vui lòng liên hệ hỗ trợ nếu bạn cần thay đổi email.',
              style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
            ),
          ],
        ),
        actions: [
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  void _pickOrChangeAvatar() {
    final urlCtrl = TextEditingController(text: _avatarUrl);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ảnh đại diện',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: AppColors.primary),
                title: const Text('Chụp ảnh mới'),
                onTap: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Đang mở máy ảnh...')),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: AppColors.primary),
                title: const Text('Chọn ảnh từ thư viện'),
                onTap: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Đang mở thư viện ảnh...')),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.link, color: AppColors.primary),
                title: const Text('Nhập URL ảnh đại diện'),
                onTap: () {
                  Navigator.pop(ctx);
                  showDialog(
                    context: context,
                    builder: (dCtx) => AlertDialog(
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      title: const Text('URL ảnh đại diện', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      content: TextField(
                        controller: urlCtrl,
                        decoration: InputDecoration(
                          hintText: 'https://...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(dCtx),
                          child: const Text('Hủy'),
                        ),
                        FilledButton(
                          style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                          onPressed: () {
                            final val = urlCtrl.text.trim();
                            Navigator.pop(dCtx);
                            if (val.isNotEmpty) {
                              _updateProfile(newAvatarUrl: val);
                            }
                          },
                          child: const Text('Lưu'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.initialProfile == null) {
      final profileDataAsync = ref.watch(profileProvider);
      profileDataAsync.whenData((data) {
        final dName = data['display_name']?.toString() ?? data['name']?.toString();
        final eml = data['email']?.toString();
        final phn = data['phone']?.toString() ?? data['phone_number']?.toString();
        final bioVal = data['bio']?.toString();
        final gdr = data['gender']?.toString();
        final bDate = data['birth_date']?.toString() ?? data['birthday']?.toString();
        final avt = data['avatar_url']?.toString() ?? data['avatar']?.toString();

        if (dName != null && dName.isNotEmpty && _displayName == 'kophai?mincong') {
          _displayName = dName;
        }
        if (eml != null && eml.isNotEmpty && _email == 'nminhcong24@gmail.com') {
          _email = eml;
        }
        if (phn != null && _phone.isEmpty) {
          _phone = phn;
        }
        if (bioVal != null && _bio.isEmpty) {
          _bio = bioVal;
        }
        if (gdr != null && _gender.isEmpty) {
          _gender = gdr;
        }
        if (bDate != null && _birthDate.isEmpty) {
          _birthDate = bDate;
        }
        if (avt != null && _avatarUrl.isEmpty) {
          _avatarUrl = avt;
        }
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back,
            color: AppColors.primary,
            size: 24,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Thông tin cá nhân',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1F2937),
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            if (_busy)
              const LinearProgressIndicator(
                color: AppColors.primary,
                backgroundColor: Color(0xFFFFF0ED),
                minHeight: 2,
              ),
            // 1. Avatar Section Card
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 12, left: 16, right: 16, bottom: 6),
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    GestureDetector(
                      onTap: _pickOrChangeAvatar,
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF0ED),
                          shape: BoxShape.circle,
                          image: _avatarUrl.isNotEmpty
                              ? DecorationImage(
                                  image: NetworkImage(_avatarUrl),
                                  fit: BoxFit.cover,
                                )
                              : null,
                        ),
                        child: _avatarUrl.isEmpty
                            ? const Icon(
                                Icons.person,
                                size: 50,
                                color: AppColors.primary,
                              )
                            : null,
                      ),
                    ),
                    const SizedBox(height: 10),
                    GestureDetector(
                      onTap: _pickOrChangeAvatar,
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.edit_outlined,
                            size: 16,
                            color: Color(0xFF4B5563),
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Sửa',
                            style: TextStyle(
                              fontSize: 13.5,
                              color: Color(0xFF4B5563),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 2. Card 1: Basic Info (Tên, Tiểu sử)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildProfileRow(
                    title: 'Tên',
                    value: _displayName.isNotEmpty ? _displayName : 'Thiết lập ngay',
                    valueColor: _displayName.isNotEmpty
                        ? const Color(0xFF1F2937)
                        : const Color(0xFF9CA3AF),
                    onTap: _showChangeNameDialog,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  ),
                  const Divider(height: 1, thickness: 0.6, color: Color(0xFFF3F4F6), indent: 16, endIndent: 16),
                  _buildProfileRow(
                    title: 'Tiểu sử',
                    value: _bio.isNotEmpty ? _bio : 'Thiết lập ngay',
                    valueColor: _bio.isNotEmpty
                        ? const Color(0xFF1F2937)
                        : const Color(0xFF9CA3AF),
                    onTap: _showChangeBioDialog,
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                  ),
                ],
              ),
            ),

            // 3. Card 2: Personal Info (Giới tính, Ngày sinh, Thông tin cá nhân)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildProfileRow(
                    title: 'Giới tính',
                    showHelpIcon: true,
                    value: _gender.isNotEmpty ? _gender : 'Thiết lập ngay',
                    valueColor: _gender.isNotEmpty
                        ? const Color(0xFF1F2937)
                        : AppColors.primary,
                    onTap: _showGenderSelectionSheet,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  ),
                  const Divider(height: 1, thickness: 0.6, color: Color(0xFFF3F4F6), indent: 16, endIndent: 16),
                  _buildProfileRow(
                    title: 'Ngày sinh',
                    showHelpIcon: true,
                    value: _birthDate.isNotEmpty ? _birthDate : 'Thiết lập ngay',
                    valueColor: _birthDate.isNotEmpty
                        ? const Color(0xFF1F2937)
                        : AppColors.primary,
                    onTap: _selectBirthDate,
                  ),
                  const Divider(height: 1, thickness: 0.6, color: Color(0xFFF3F4F6), indent: 16, endIndent: 16),
                  _buildProfileRow(
                    title: 'Thông tin cá nhân',
                    showHelpIcon: true,
                    value: '',
                    onTap: _showPersonalInfoNotice,
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                  ),
                ],
              ),
            ),

            // 4. Card 3: Contact Info & Linked Accounts (Số điện thoại, Email, Tài khoản liên kết)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildProfileRow(
                    title: 'Số điện thoại',
                    value: _maskPhone(_phone),
                    valueColor: const Color(0xFF1F2937),
                    onTap: _showChangePhoneDialog,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  ),
                  const Divider(height: 1, thickness: 0.6, color: Color(0xFFF3F4F6), indent: 16, endIndent: 16),
                  _buildProfileRow(
                    title: 'Email',
                    value: _maskEmail(_email),
                    valueColor: const Color(0xFF1F2937),
                    onTap: _showEmailInfoDialog,
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileRow({
    required String title,
    required String value,
    bool showHelpIcon = false,
    Color? valueColor,
    required VoidCallback onTap,
    BorderRadius? borderRadius,
  }) {
    return Material(
      color: Colors.transparent,
      borderRadius: borderRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: borderRadius,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14.5,
                  color: Color(0xFF1F2937),
                  fontWeight: FontWeight.w400,
                ),
              ),
              if (showHelpIcon) ...[
                const SizedBox(width: 4),
                const Icon(
                  Icons.help_outline,
                  size: 15,
                  color: Color(0xFF9CA3AF),
                ),
              ],
              const SizedBox(width: 12),
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (value.isNotEmpty)
                      Flexible(
                        child: Text(
                          value,
                          textAlign: TextAlign.right,
                          style: TextStyle(
                            fontSize: 14,
                            color: valueColor ?? const Color(0xFF1F2937),
                            fontWeight: FontWeight.w400,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    const SizedBox(width: 4),
                    const Icon(
                      Icons.chevron_right,
                      size: 18,
                      color: Color(0xFF9CA3AF),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';

class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _emailFormKey = GlobalKey<FormState>();
  final _resetFormKey = GlobalKey<FormState>();

  final _emailController = TextEditingController();
  final _tokenController = TextEditingController();
  final _newPasswordController = TextEditingController();

  bool _isResetMode = false;
  bool _busy = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  String? _successMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _tokenController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _sendForgotEmail() async {
    if (!_emailFormKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final client = ref.read(apiProvider);
      final res = await client.forgotPassword(_emailController.text.trim());
      if (mounted) {
        setState(() {
          _isResetMode = true;
          _successMessage = res['message']?.toString() ??
              'Đã gửi liên kết/mã đặt lại mật khẩu đến email.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = errorMessage(e);
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  Future<void> _submitResetPassword() async {
    if (!_resetFormKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final client = ref.read(apiProvider);
      final res = await client.resetPassword(
        token: _tokenController.text.trim(),
        newPassword: _newPasswordController.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              res['message']?.toString() ?? 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.',
            ),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pushReplacementNamed(context, '/login');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = errorMessage(e);
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isResetMode ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: _isResetMode ? _buildResetForm() : _buildForgotEmailForm(),
      ),
    );
  }

  Widget _buildForgotEmailForm() {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(
            Icons.lock_reset_outlined,
            size: 72,
            color: Color(0xff1648a8),
          ),
          const SizedBox(height: 16),
          const Text(
            'Khôi phục mật khẩu',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Nhập email tài khoản của bạn để nhận mã đặt lại mật khẩu',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email đã đăng ký *',
              prefixIcon: Icon(Icons.email_outlined),
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Vui lòng nhập email.';
              }
              if (!value.contains('@')) {
                return 'Email không hợp lệ.';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(
                _errorMessage!,
                style: TextStyle(color: Colors.red.shade900),
              ),
            ),
            const SizedBox(height: 16),
          ],
          FilledButton(
            onPressed: _busy ? null : _sendForgotEmail,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Gửi mã xác nhận', style: TextStyle(fontSize: 16)),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              setState(() {
                _isResetMode = true;
                _errorMessage = null;
              });
            },
            child: const Text('Đã có mã xác nhận? Đặt lại mật khẩu ngay'),
          ),
        ],
      ),
    );
  }

  Widget _buildResetForm() {
    return Form(
      key: _resetFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_successMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Text(
                _successMessage!,
                style: TextStyle(color: Colors.green.shade900),
              ),
            ),
            const SizedBox(height: 16),
          ],
          const Text(
            'Nhập mã token & mật khẩu mới',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Nhập mã đã gửi qua email cùng mật khẩu mới của bạn',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _tokenController,
            decoration: const InputDecoration(
              labelText: 'Mã xác nhận (Token) *',
              prefixIcon: Icon(Icons.vpn_key_outlined),
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Vui lòng nhập mã token.';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _newPasswordController,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              labelText: 'Mật khẩu mới *',
              prefixIcon: const Icon(Icons.lock_outline),
              border: const OutlineInputBorder(),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                ),
                onPressed: () {
                  setState(() {
                    _obscurePassword = !_obscurePassword;
                  });
                },
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Vui lòng nhập mật khẩu mới.';
              }
              if (value.length < 6) {
                return 'Mật khẩu phải có ít nhất 6 ký tự.';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(
                _errorMessage!,
                style: TextStyle(color: Colors.red.shade900),
              ),
            ),
            const SizedBox(height: 16),
          ],
          FilledButton(
            onPressed: _busy ? null : _submitResetPassword,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Đổi mật khẩu', style: TextStyle(fontSize: 16)),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              setState(() {
                _isResetMode = false;
                _errorMessage = null;
              });
            },
            child: const Text('Quay lại bước trước'),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';

class AddressFormPage extends ConsumerStatefulWidget {
  const AddressFormPage({super.key, this.initialAddress});
  final Map<String, dynamic>? initialAddress;

  @override
  ConsumerState<AddressFormPage> createState() => _AddressFormPageState();
}

class _AddressFormPageState extends ConsumerState<AddressFormPage> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _recipientController;
  late final TextEditingController _phoneController;
  late final TextEditingController _provinceController;
  late final TextEditingController _districtController;
  late final TextEditingController _wardController;
  late final TextEditingController _streetController;
  bool _isDefault = false;

  bool _busy = false;
  String? _errorMessage;

  bool get _isEditMode =>
      widget.initialAddress != null && widget.initialAddress!['id'] != null;

  @override
  void initState() {
    super.initState();
    final addr = widget.initialAddress;
    _recipientController = TextEditingController(
      text: addr?['recipient_name']?.toString() ?? '',
    );
    _phoneController = TextEditingController(
      text: addr?['phone']?.toString() ?? '',
    );
    _provinceController = TextEditingController(
      text: addr?['city']?.toString() ?? 'Đà Nẵng',
    );
    _districtController = TextEditingController(
      text: addr?['district']?.toString() ?? 'Hải Châu',
    );
    _wardController = TextEditingController(
      text: addr?['ward']?.toString() ?? 'Thạch Thang',
    );
    _streetController = TextEditingController(
      text: addr?['line1']?.toString() ?? '',
    );
    _isDefault = addr?['is_default'] == true;
  }

  @override
  void dispose() {
    _recipientController.dispose();
    _phoneController.dispose();
    _provinceController.dispose();
    _districtController.dispose();
    _wardController.dispose();
    _streetController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _errorMessage = null;
    });

    final payload = {
      'recipient_name': _recipientController.text.trim(),
      'phone': _phoneController.text.trim(),
      'city': _provinceController.text.trim(),
      'district': _districtController.text.trim(),
      'ward': _wardController.text.trim(),
      'line1': _streetController.text.trim(),
      'is_default': _isDefault,
    };

    try {
      final client = ref.read(apiProvider);
      if (_isEditMode) {
        final id = widget.initialAddress!['id'].toString();
        await client.updateAddress(id, payload);
      } else {
        await client.createAddress(payload);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isEditMode
                  ? 'Cập nhật địa chỉ thành công!'
                  : 'Thêm địa chỉ mới thành công!',
            ),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
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
        title: Text(_isEditMode ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _recipientController,
                decoration: const InputDecoration(
                  labelText: 'Tên người nhận *',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Vui lòng nhập tên người nhận.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Số điện thoại *',
                  prefixIcon: Icon(Icons.phone_outlined),
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Vui lòng nhập số điện thoại.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _provinceController,
                      decoration: const InputDecoration(
                        labelText: 'Tỉnh/Thành phố *',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          (value == null || value.trim().isEmpty)
                          ? 'Bắt buộc'
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _districtController,
                      decoration: const InputDecoration(
                        labelText: 'Quận/Huyện *',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          (value == null || value.trim().isEmpty)
                          ? 'Bắt buộc'
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _wardController,
                decoration: const InputDecoration(
                  labelText: 'Phường/Xã *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) => (value == null || value.trim().isEmpty)
                    ? 'Vui lòng nhập phường/xã.'
                    : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _streetController,
                decoration: const InputDecoration(
                  labelText: 'Địa chỉ cụ thể (Số nhà, đường) *',
                  prefixIcon: Icon(Icons.home_outlined),
                  border: OutlineInputBorder(),
                  hintText: 'Ví dụ: 123 Lê Duẩn',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Vui lòng nhập địa chỉ cụ thể.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                value: _isDefault,
                onChanged: (val) {
                  setState(() {
                    _isDefault = val ?? false;
                  });
                },
                title: const Text('Đặt làm địa chỉ giao hàng mặc định'),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
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
                onPressed: _busy ? null : _submit,
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
                    : Text(
                        _isEditMode ? 'Lưu cập nhật' : 'Tạo địa chỉ',
                        style: const TextStyle(fontSize: 16),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

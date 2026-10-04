import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';

class ConsentDialog extends ConsumerStatefulWidget {
  const ConsentDialog({super.key});

  @override
  ConsumerState<ConsentDialog> createState() => _ConsentDialogState();
}

class _ConsentDialogState extends ConsumerState<ConsentDialog> {
  bool _busy = false;
  bool _granted = true;
  int _version = 1;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadConsent();
  }

  Future<void> _loadConsent() async {
    setState(() => _busy = true);
    try {
      final client = ref.read(apiProvider);
      final res = await client.getPersonalizationConsent();
      if (mounted) {
        setState(() {
          _granted = res['status'] == 'GRANTED';
          _version = (res['version'] as num?)?.toInt() ?? 1;
        });
      }
    } catch (_) {
      // Keep default granted
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _updateConsent(bool grant) async {
    setState(() {
      _busy = true;
      _errorMessage = null;
    });

    try {
      final client = ref.read(apiProvider);
      final newStatus = grant ? 'GRANTED' : 'WITHDRAWN';
      final res = await client.updatePersonalizationConsent(newStatus, _version);
      if (mounted) {
        setState(() {
          _granted = grant;
          _version = (res['version'] as num?)?.toInt() ?? (_version + 1);
        });
        ref.invalidate(recommendationProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              grant
                ? 'Đã bật tính năng gợi ý cá nhân hóa AI.'
                : 'Đã tắt tính năng gợi ý cá nhân hóa AI.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = errorMessage(e);
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.auto_awesome, color: Color(0xff1648a8)),
          SizedBox(width: 8),
          Text('Cá nhân hóa & Gợi ý AI'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Hệ thống AI sử dụng lịch sử xem sản phẩm và tương tác mua sắm để đưa ra các gợi ý phù hợp nhất với bạn.',
            style: TextStyle(fontSize: 14),
          ),
          const SizedBox(height: 16),
          if (_errorMessage != null) ...[
            Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            const SizedBox(height: 12),
          ],
          SwitchListTile(
            title: const Text('Bật gợi ý thông minh', style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(
              _granted
                ? 'Đang bật: Hiển thị sản phẩm phù hợp sở thích'
                : 'Đang tắt: Hiển thị sản phẩm phổ biến mặc định',
            ),
            value: _granted,
            contentPadding: EdgeInsets.zero,
            onChanged: _busy ? null : (val) => _updateConsent(val),
          ),
        ],
      ),
      actions: [
        FilledButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Đóng'),
        ),
      ],
    );
  }
}

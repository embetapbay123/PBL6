import 'package:flutter/material.dart';

class AppNoticeDialog extends StatelessWidget {
  final String message;
  final String buttonText;
  final VoidCallback? onConfirm;

  const AppNoticeDialog({
    super.key,
    required this.message,
    this.buttonText = 'Đồng ý',
    this.onConfirm,
  });

  static Future<void> show(
    BuildContext context, {
    required String message,
    String buttonText = 'Đồng ý',
    VoidCallback? onConfirm,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AppNoticeDialog(
        message: message,
        buttonText: buttonText,
        onConfirm: onConfirm,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 42),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      clipBehavior: Clip.antiAlias,
      elevation: 6,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15.5,
                color: Color(0xFF262626),
                height: 1.45,
                fontWeight: FontWeight.normal,
              ),
            ),
          ),
          const Divider(
            height: 1,
            thickness: 1,
            color: Color(0xFFF1F3F5),
          ),
          InkWell(
            onTap: () {
              Navigator.of(context, rootNavigator: true).pop();
              onConfirm?.call();
            },
            child: Container(
              height: 48,
              width: double.infinity,
              alignment: Alignment.center,
              child: Text(
                buttonText,
                style: const TextStyle(
                  color: Color(0xFFEE4D2D), // Brand red/orange matching Image 2
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

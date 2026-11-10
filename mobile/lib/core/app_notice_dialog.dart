import 'dart:async';
import 'package:flutter/material.dart';

class AppNoticeDialog extends StatefulWidget {
  final String message;
  final String? title;
  final String buttonText;
  final VoidCallback? onConfirm;
  final Widget? icon;
  final Duration duration;
  final bool autoDismiss;

  const AppNoticeDialog({
    super.key,
    required this.message,
    this.title,
    this.buttonText = 'Đồng ý',
    this.onConfirm,
    this.icon,
    this.duration = const Duration(milliseconds: 2000),
    this.autoDismiss = true,
  });

  static Future<void> show(
    BuildContext context, {
    required String message,
    String? title,
    String buttonText = 'Đồng ý',
    VoidCallback? onConfirm,
    Widget? icon,
    Duration duration = const Duration(milliseconds: 2000),
    bool autoDismiss = true,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.2),
      builder: (ctx) => AppNoticeDialog(
        message: message,
        title: title,
        buttonText: buttonText,
        onConfirm: onConfirm,
        icon: icon,
        duration: duration,
        autoDismiss: autoDismiss,
      ),
    );
  }

  @override
  State<AppNoticeDialog> createState() => _AppNoticeDialogState();
}

class _AppNoticeDialogState extends State<AppNoticeDialog> {
  Timer? _timer;
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    if (widget.autoDismiss) {
      _timer = Timer(widget.duration, () {
        if (!_dismissed && mounted && Navigator.of(context, rootNavigator: true).canPop()) {
          _dismissed = true;
          Navigator.of(context, rootNavigator: true).pop();
          widget.onConfirm?.call();
        }
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _handleDismiss() {
    if (_dismissed) return;
    _dismissed = true;
    _timer?.cancel();
    if (mounted && Navigator.of(context, rootNavigator: true).canPop()) {
      Navigator.of(context, rootNavigator: true).pop();
      widget.onConfirm?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      insetPadding: EdgeInsets.zero,
      child: Listener(
        behavior: HitTestBehavior.translucent,
        onPointerDown: (_) => _handleDismiss(),
        onPointerMove: (_) => _handleDismiss(),
        onPointerPanZoomStart: (_) => _handleDismiss(),
        child: SizedBox.expand(
          child: Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Dark Toast HUD Card matching the design
                Container(
                  constraints: const BoxConstraints(
                    minWidth: 180,
                    maxWidth: 310,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 22),
                  decoration: BoxDecoration(
                    color: const Color(0xEB262626), // dark charcoal translucent
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.25),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Icon: Circular speech bubble with checkmark (matches attached image) or custom/info icon
                      widget.icon ??
                          (widget.title != null
                              ? const Icon(Icons.info_outline_rounded, color: Colors.white, size: 44)
                              : const _SpeechBubbleCheckBadge(size: 56)),
                      const SizedBox(height: 14),
                      if (widget.title != null && widget.title!.isNotEmpty) ...[
                        Text(
                          widget.title!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                      // Message Text
                      Text(
                        widget.message,
                        textAlign: widget.title != null ? TextAlign.left : TextAlign.center,
                        style: TextStyle(
                          fontSize: widget.title != null ? 13.5 : 16,
                          fontWeight: widget.title != null ? FontWeight.w500 : FontWeight.bold,
                          color: Colors.white,
                          height: 1.4,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ],
                  ),
                ),

                // Tap-to-dismiss layer that also preserves test finder for buttonText ('Đồng ý')
                Positioned.fill(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      splashColor: Colors.transparent,
                      highlightColor: Colors.transparent,
                      onTap: _handleDismiss,
                      child: Center(
                        child: Text(
                          widget.buttonText,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.transparent,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SpeechBubbleCheckBadge extends StatelessWidget {
  final double size;
  const _SpeechBubbleCheckBadge({this.size = 56});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size * 1.05),
      painter: _SpeechBubblePainter(),
      child: SizedBox(
        width: size,
        height: size * 1.05,
        child: Center(
          child: Padding(
            padding: EdgeInsets.only(bottom: size * 0.06),
            child: Icon(
              Icons.check_rounded,
              color: const Color(0xFF262626),
              size: size * 0.56,
            ),
          ),
        ),
      ),
    );
  }
}

class _SpeechBubblePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;

    final double width = size.width;
    final double radius = width * 0.44;
    final center = Offset(width / 2, width * 0.46);

    final path = Path();
    path.addOval(Rect.fromCircle(center: center, radius: radius));

    // Tail at bottom left
    final tailPath = Path();
    final p1 = Offset(center.dx - radius * 0.65, center.dy + radius * 0.6);
    final p2 = Offset(center.dx - radius * 0.1, center.dy + radius * 0.95);
    final tip = Offset(center.dx - radius * 0.72, center.dy + radius * 1.12);

    tailPath.moveTo(p1.dx, p1.dy);
    tailPath.quadraticBezierTo(
      center.dx - radius * 0.5,
      center.dy + radius * 0.9,
      tip.dx,
      tip.dy,
    );
    tailPath.quadraticBezierTo(
      center.dx - radius * 0.25,
      center.dy + radius * 1.05,
      p2.dx,
      p2.dy,
    );
    tailPath.close();

    path.addPath(tailPath, Offset.zero);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

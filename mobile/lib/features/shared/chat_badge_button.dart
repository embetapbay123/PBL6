import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../chat/chat_ai_modal.dart';

class ChatBadgeButton extends ConsumerWidget {
  final VoidCallback? onPressed;
  final Color? color;
  final double size;
  final String tooltip;

  const ChatBadgeButton({
    super.key,
    this.onPressed,
    this.color,
    this.size = 24,
    this.tooltip = 'Trung tâm chat',
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    int unread = 0;
    try {
      unread = ref.watch(chatBadgeCountProvider);
    } catch (_) {
      unread = 0;
    }
    final iconColor = color ?? AppColors.primary;

    return IconButton(
      tooltip: tooltip,
      onPressed: () {
        if (onPressed != null) {
          onPressed!();
        } else {
          ChatAiModal.show(context).then((_) {
            try {
              ref.invalidate(storeUnreadMessagesCountProvider);
            } catch (_) {}
          });
        }
      },
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(
            Icons.chat_bubble_outline_rounded,
            color: iconColor,
            size: size,
          ),
          if (unread > 0)
            Positioned(
              right: -6,
              top: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white, width: 1.2),
                ),
                constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                child: Text(
                  unread > 99 ? '99+' : '$unread',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    height: 1.1,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

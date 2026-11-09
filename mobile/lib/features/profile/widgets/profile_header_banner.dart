import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/app_theme.dart';
import '../../../main.dart';
import '../profile_model.dart';
import '../profile_provider.dart';

class ProfileHeaderBanner extends ConsumerWidget {
  final UserProfile profile;

  const ProfileHeaderBanner({
    super.key,
    required this.profile,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Container(
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFEE4D2D), // Shopee orange
            Color(0xFFFF5722),
          ],
        ),
        borderRadius: BorderRadius.vertical(
          bottom: Radius.circular(24),
        ),
      ),
      padding: EdgeInsets.fromLTRB(16, topPadding + 14, 8, 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Avatar tròn nền trắng
              InkWell(
                onTap: () async {
                  final changed = await Navigator.pushNamed(
                    context,
                    '/edit-profile',
                    arguments: profile.toMap(),
                  );
                  if (changed == true) {
                    ref.invalidate(profileProvider);
                    ref.invalidate(userProfileProvider);
                    ref.invalidate(addressListProvider);
                    ref.invalidate(cartItemsProvider);
                    ref.invalidate(recommendationProvider);
                  }
                },
                child: Container(
                  width: 62,
                  height: 62,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withAlpha(220), width: 2.2),
                  ),
                  child: ClipOval(
                    child: profile.avatarUrl != null && profile.avatarUrl!.isNotEmpty
                        ? Image.network(
                            profile.avatarUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, _, _) => Center(
                              child: Icon(
                                Icons.person,
                                size: 38,
                                color: Colors.grey.shade400,
                              ),
                            ),
                          )
                        : Center(
                            child: Icon(
                              Icons.person,
                              size: 38,
                              color: Colors.grey.shade400,
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Username + Email + Badge
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.displayName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19.0,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (profile.email.isNotEmpty && profile.email != profile.displayName) ...[
                      const SizedBox(height: 3),
                      Text(
                        profile.email,
                        style: TextStyle(
                          color: Colors.white.withAlpha(225),
                          fontSize: 13.0,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 6),
                    // Badge (CUSTOMER > / Kim Cương >)
                    InkWell(
                      onTap: () {
                        AppNoticeDialog.show(
                          context,
                          message: 'Hạng thành viên của bạn: ${profile.tier}',
                          buttonText: 'Đã hiểu',
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withAlpha(150),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              profile.tier,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12.0,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 3),
                            const Icon(
                              Icons.chevron_right,
                              size: 15,
                              color: Colors.white70,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Action buttons on the right: Setting & Notification
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(
                      Icons.settings_outlined,
                      color: Colors.white,
                      size: 24,
                    ),
                    tooltip: 'Cài đặt',
                    onPressed: () => Navigator.pushNamed(context, '/customer/settings'),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(
                      Icons.notifications_outlined,
                      color: Colors.white,
                      size: 24,
                    ),
                    tooltip: 'Thông báo',
                    onPressed: () {
                      AppNoticeDialog.show(
                        context,
                        message: 'Không có thông báo mới.',
                        buttonText: 'Đã hiểu',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

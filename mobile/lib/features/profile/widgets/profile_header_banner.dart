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
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFEE4D2D), // Shopee orange
            Color(0xFFFF5722),
          ],
        ),
      ),
      padding: EdgeInsets.fromLTRB(16, topPadding + 8, 8, 14),
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
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withAlpha(220), width: 2),
                  ),
                  child: ClipOval(
                    child: profile.avatarUrl != null && profile.avatarUrl!.isNotEmpty
                        ? Image.network(
                            profile.avatarUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, _, _) => Center(
                              child: Icon(
                                Icons.person,
                                size: 32,
                                color: Colors.grey.shade400,
                              ),
                            ),
                          )
                        : Center(
                            child: Icon(
                              Icons.person,
                              size: 32,
                              color: Colors.grey.shade400,
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Username + Badge + Following counts
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            profile.displayName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16.5,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
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
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B).withAlpha(150),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  profile.tier,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                const Icon(
                                  Icons.chevron_right,
                                  size: 13,
                                  color: Colors.white70,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (profile.email.isNotEmpty && profile.email != profile.displayName) ...[
                      const SizedBox(height: 2),
                      Text(
                        profile.email,
                        style: TextStyle(
                          color: Colors.white.withAlpha(200),
                          fontSize: 11.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 4),
                    // Server-driven stats row: Đang theo dõi, Người theo dõi
                    Row(
                      children: [
                        Text(
                          profile.formattedFollowing,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          profile.formattedFollowers,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
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
                      size: 22,
                    ),
                    tooltip: 'Cài đặt',
                    onPressed: () => Navigator.pushNamed(context, '/customer/settings'),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(
                      Icons.notifications_outlined,
                      color: Colors.white,
                      size: 22,
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

import 'package:flutter/material.dart';
import '../../../core/app_theme.dart';
import '../../chat/chat_ai_modal.dart';
import '../store_model.dart';

class StoreHeaderView extends StatelessWidget {
  final StoreProfile profile;
  final bool isFollowing;
  final VoidCallback onToggleFollow;

  const StoreHeaderView({
    super.key,
    required this.profile,
    required this.isFollowing,
    required this.onToggleFollow,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Store Info Row: Avatar, Name/Details, Action Buttons
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Store Avatar
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withAlpha(220),
                  width: 2,
                ),
              ),
              child: ClipOval(
                child: profile.logoUrl != null && profile.logoUrl!.isNotEmpty
                    ? Image.network(
                        profile.logoUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => const Center(
                          child: Icon(
                            Icons.storefront_rounded,
                            color: Color(0xFFEE4D2D),
                            size: 30,
                          ),
                        ),
                      )
                    : const Center(
                        child: Icon(
                          Icons.storefront_rounded,
                          color: Color(0xFFEE4D2D),
                          size: 30,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          profile.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.white,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.verified,
                        color: Colors.white,
                        size: 16,
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    profile.slogan,
                    style: TextStyle(
                      color: Colors.white.withAlpha(220),
                      fontSize: 12,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      const Icon(
                        Icons.star,
                        color: Color(0xFFFFD700),
                        size: 14,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${profile.rating.toStringAsFixed(1)} ',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: Colors.white,
                        ),
                      ),
                      Flexible(
                        child: Text(
                          '| ${profile.formattedFollowers}',
                          style: TextStyle(
                            color: Colors.white.withAlpha(210),
                            fontSize: 11,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${profile.positiveFeedbackRate}% phản hồi tích cực',
                    style: TextStyle(
                      color: Colors.white.withAlpha(235),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                OutlinedButton.icon(
                  onPressed: () => ChatAiModal.show(
                    context,
                    initialPrompt: 'Tư vấn các sản phẩm của ${profile.name}',
                  ),
                  icon: const Icon(
                    Icons.chat_bubble_outline,
                    size: 13,
                    color: Colors.white,
                  ),
                  label: const Text(
                    'Chat',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    minimumSize: Size.zero,
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                FilledButton(
                  onPressed: onToggleFollow,
                  style: FilledButton.styleFrom(
                    backgroundColor: isFollowing
                        ? Colors.white.withAlpha(200)
                        : Colors.white,
                    foregroundColor: isFollowing
                        ? Colors.black87
                        : const Color(0xFFEE4D2D),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    minimumSize: Size.zero,
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  child: Text(
                    isFollowing ? 'Đang theo dõi' : '+ Theo dõi',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Stats Row on translucent dark container matching Image
        Container(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.black.withAlpha(25),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItem(profile.productCount, 'Sản phẩm', isLight: true),
              _buildDivider(isLight: true),
              _buildStatItem(profile.reviewCount, 'Đánh giá', isLight: true),
              _buildDivider(isLight: true),
              _buildStatItem(profile.activeDuration, 'Hoạt động', isLight: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(String val, String label, {bool isLight = false}) {
    return Column(
      children: [
        Text(
          val,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 15,
            color: isLight ? Colors.white : AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: isLight ? Colors.white70 : AppColors.textSecondary,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildDivider({bool isLight = false}) {
    return Container(
      height: 20,
      width: 1,
      color: isLight ? Colors.white24 : Colors.grey.shade200,
    );
  }
}

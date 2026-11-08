import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';
import 'profile_model.dart';

/// Provider for user social stats (following, followers) fetched from server
final userSocialStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.read(apiProvider);
  return await client.getUserSocialStats();
});

/// Dedicated Profile Provider that fetches full profile data and social stats from server
final userProfileProvider = FutureProvider<UserProfile>((ref) async {
  final profileMap = await ref.watch(profileProvider.future);
  final client = ref.read(apiProvider);

  Map<String, dynamic>? stats;
  try {
    stats = await client.getUserSocialStats();
  } catch (_) {}

  return UserProfile.fromJson(profileMap, stats: stats);
});

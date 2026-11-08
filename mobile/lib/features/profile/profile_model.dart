class UserProfile {
  final String userId;
  final String email;
  final String displayName;
  final String? phone;
  final String? avatarUrl;
  final List<String> roles;
  final String tier;
  final int followingCount;
  final int followersCount;
  final String? emailVerifiedAt;

  const UserProfile({
    required this.userId,
    required this.email,
    required this.displayName,
    this.phone,
    this.avatarUrl,
    this.roles = const ['CUSTOMER'],
    this.tier = 'CUSTOMER',
    this.followingCount = 513,
    this.followersCount = 1,
    this.emailVerifiedAt,
  });

  String get formattedFollowing => '$followingCount Đang theo dõi';
  String get formattedFollowers => '$followersCount Người theo dõi';

  factory UserProfile.fromJson(
    Map<String, dynamic> json, {
    Map<String, dynamic>? stats,
  }) {
    final userId = json['user_id']?.toString() ?? json['id']?.toString() ?? '';
    final email = json['email']?.toString() ?? '';
    final displayName = json['display_name']?.toString() ??
        json['name']?.toString() ??
        json['username']?.toString() ??
        'Khách hàng';
    final phone = json['phone']?.toString() ?? json['phone_number']?.toString();
    final avatarUrl = json['avatar_url']?.toString() ?? json['image_url']?.toString();

    // Roles
    final List<String> roles;
    if (json['roles'] is List) {
      roles = (json['roles'] as List).map((e) => e.toString()).toList();
    } else {
      roles = const ['CUSTOMER'];
    }

    // Tier / Member Badge
    final tier = json['membership_tier']?.toString() ??
        json['tier']?.toString() ??
        (roles.isNotEmpty ? roles.first : 'CUSTOMER');

    // Following count
    int following = 513;
    final rawFollowing = stats?['following_count'] ??
        stats?['following_stores_count'] ??
        stats?['following'] ??
        json['following_count'] ??
        json['following_stores_count'] ??
        json['following'];
    if (rawFollowing is num) following = rawFollowing.toInt();
    if (rawFollowing is String) following = int.tryParse(rawFollowing) ?? 513;

    // Followers count
    int followers = 1;
    final rawFollowers = stats?['followers_count'] ??
        stats?['followers'] ??
        json['followers_count'] ??
        json['followers'];
    if (rawFollowers is num) followers = rawFollowers.toInt();
    if (rawFollowers is String) followers = int.tryParse(rawFollowers) ?? 1;

    return UserProfile(
      userId: userId,
      email: email,
      displayName: displayName,
      phone: phone,
      avatarUrl: avatarUrl,
      roles: roles,
      tier: tier,
      followingCount: following,
      followersCount: followers,
      emailVerifiedAt: json['email_verified_at']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'user_id': userId,
      'email': email,
      'display_name': displayName,
      'phone': phone,
      'avatar_url': avatarUrl,
      'roles': roles,
      'membership_tier': tier,
      'following_count': followingCount,
      'followers_count': followersCount,
      'email_verified_at': emailVerifiedAt,
    };
  }
}

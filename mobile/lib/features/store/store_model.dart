class StoreProfile {
  final String id;
  final String name;
  final String? logoUrl;
  final String slogan;
  final double rating;
  final int followersCount;
  final int positiveFeedbackRate;
  final String productCount;
  final String reviewCount;
  final String activeDuration;
  final int? shippingFee;

  const StoreProfile({
    required this.id,
    required this.name,
    this.logoUrl,
    this.slogan = 'Công nghệ chính hãng',
    this.rating = 4.9,
    this.followersCount = 12500,
    this.positiveFeedbackRate = 98,
    this.productCount = '1,2K',
    this.reviewCount = '4.9',
    this.activeDuration = '2 năm',
    this.shippingFee = 30000,
  });

  String get formattedFollowers {
    if (followersCount >= 1000) {
      final k = (followersCount / 1000).toStringAsFixed(1).replaceAll('.', ',');
      return '${k}K người theo dõi';
    }
    return '$followersCount người theo dõi';
  }

  factory StoreProfile.fromJson(Map<String, dynamic> json, {String defaultName = 'TechZone Official'}) {
    final name = defaultName.isNotEmpty
        ? defaultName
        : (json['name']?.toString() ?? json['store_name']?.toString() ?? 'TechZone Official');
    String slogan = 'Công nghệ chính hãng';
    if (json['slogan'] != null && json['slogan'].toString().isNotEmpty) {
      slogan = json['slogan'].toString();
    } else if (json['description'] != null && json['description'].toString().isNotEmpty) {
      final desc = json['description'].toString();
      if (desc.toLowerCase().contains('công nghệ chính hãng')) {
        slogan = 'Công nghệ chính hãng';
      } else {
        slogan = desc;
      }
    }
    final logoUrl = json['logo_url']?.toString() ??
        json['avatar_url']?.toString() ??
        json['image_url']?.toString();

    // Rating
    double rating = 4.9;
    final rawRating = json['rating'] ?? json['avg_rating'] ?? json['rating_average'];
    if (rawRating is num) rating = rawRating.toDouble();
    if (rawRating is String) rating = double.tryParse(rawRating) ?? 4.9;

    // Followers
    int followers = 12500;
    final rawFollowers = json['followers_count'] ?? json['followers'];
    if (rawFollowers is num) followers = rawFollowers.toInt();
    if (rawFollowers is String) followers = int.tryParse(rawFollowers) ?? 12500;

    // Positive feedback %
    int positive = 98;
    final rawPositive = json['positive_feedback_pct'] ?? json['positive_response_rate'];
    if (rawPositive is num) positive = rawPositive.toInt();
    if (rawPositive is String) positive = int.tryParse(rawPositive.replaceAll('%', '').trim()) ?? 98;

    // Product count
    String pCount = '1,2K';
    final rawPCount = json['product_count'] ?? json['products_count'] ?? json['total_products'];
    if (rawPCount is num) {
      pCount = rawPCount >= 1000
          ? '${(rawPCount / 1000).toStringAsFixed(1).replaceAll('.', ',')}K'
          : rawPCount.toString();
    } else if (rawPCount is String && rawPCount.isNotEmpty) {
      pCount = rawPCount;
    }

    // Review / Rating score
    String rCount = '4.9';
    final rawRCount = json['rating_count'] ?? json['reviews_count'] ?? json['total_reviews'];
    if (rawRCount is num) {
      rCount = rawRCount >= 1000
          ? '${(rawRCount / 1000).toStringAsFixed(1).replaceAll('.', ',')}K'
          : rawRCount.toString();
    } else if (rawRCount is String && rawRCount.isNotEmpty) {
      rCount = rawRCount;
    }

    // Active duration
    String active = '2 năm';
    final rawActive = json['active_duration'] ?? json['active_years'] ?? json['active_time'];
    if (rawActive != null && rawActive.toString().isNotEmpty) {
      active = rawActive.toString();
    } else if (json['created_at'] != null) {
      try {
        final created = DateTime.parse(json['created_at'].toString());
        final diffDays = DateTime.now().difference(created).inDays;
        final years = (diffDays / 365).floor();
        if (years >= 1) {
          active = '$years năm';
        } else {
          final months = (diffDays / 30).floor();
          active = '${months > 0 ? months : 1} tháng';
        }
      } catch (_) {}
    }

    final fee = json['shipping_fee_vnd'] is num ? (json['shipping_fee_vnd'] as num).toInt() : 30000;

    return StoreProfile(
      id: json['id']?.toString() ?? '',
      name: name,
      logoUrl: logoUrl,
      slogan: slogan.isNotEmpty ? slogan : 'Công nghệ chính hãng',
      rating: rating,
      followersCount: followers,
      positiveFeedbackRate: positive,
      productCount: pCount,
      reviewCount: rCount,
      activeDuration: active,
      shippingFee: fee,
    );
  }
}

class StoreVoucherItem {
  final String id;
  final String title;
  final String condition;
  final String expiry;
  final String? code;
  final int discountVnd;
  final int minOrderVnd;

  const StoreVoucherItem({
    required this.id,
    required this.title,
    required this.condition,
    required this.expiry,
    this.code,
    this.discountVnd = 50000,
    this.minOrderVnd = 500000,
  });

  factory StoreVoucherItem.fromJson(Map<String, dynamic> json) {
    final title = json['title']?.toString() ?? json['name']?.toString() ?? 'Giảm 50K';
    final condition = json['condition']?.toString() ?? 'Đơn từ 500.000 đ';
    final expiry = json['expiry']?.toString() ?? 'HSD: 31/12/2026';
    return StoreVoucherItem(
      id: json['id']?.toString() ?? '',
      title: title,
      condition: condition,
      expiry: expiry,
      code: json['code']?.toString(),
      discountVnd: json['discount_vnd'] is num ? (json['discount_vnd'] as num).toInt() : 50000,
      minOrderVnd: json['min_order_vnd'] is num ? (json['min_order_vnd'] as num).toInt() : 500000,
    );
  }
}

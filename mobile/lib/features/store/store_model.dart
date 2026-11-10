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
    this.slogan = '',
    this.rating = 0.0,
    this.followersCount = 0,
    this.positiveFeedbackRate = 98,
    this.productCount = '0',
    this.reviewCount = '0',
    this.activeDuration = '0',
    this.shippingFee = 30000,
  });

  StoreProfile copyWith({
    String? id,
    String? name,
    String? logoUrl,
    String? slogan,
    double? rating,
    int? followersCount,
    int? positiveFeedbackRate,
    String? productCount,
    String? reviewCount,
    String? activeDuration,
    int? shippingFee,
  }) {
    return StoreProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      logoUrl: logoUrl ?? this.logoUrl,
      slogan: slogan ?? this.slogan,
      rating: rating ?? this.rating,
      followersCount: followersCount ?? this.followersCount,
      positiveFeedbackRate: positiveFeedbackRate ?? this.positiveFeedbackRate,
      productCount: productCount ?? this.productCount,
      reviewCount: reviewCount ?? this.reviewCount,
      activeDuration: activeDuration ?? this.activeDuration,
      shippingFee: shippingFee ?? this.shippingFee,
    );
  }

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
    String slogan = '';
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
    if (slogan.isEmpty) {
      if (name.toLowerCase().contains('mây xanh')) {
        slogan = 'Đồ dùng cho góc nhà và bàn làm việc. Mây Xanh Living mang tới không gian sống xanh, tối giản và tiện ích.';
      } else if (name.toLowerCase().contains('an nhiên')) {
        slogan = 'Thời trang thiết kế trẻ trung, chất liệu organic thoáng mát.';
      } else if (name.toLowerCase().contains('techzone')) {
        slogan = 'Công nghệ chính hãng';
      }
    }
    final logoUrl = json['logo_url']?.toString() ??
        json['avatar_url']?.toString() ??
        json['image_url']?.toString();

    // Rating
    double rating = 0.0;
    final rawRating = json['rating'] ?? json['avg_rating'] ?? json['rating_average'];
    if (rawRating is num) rating = rawRating.toDouble();
    if (rawRating is String) rating = double.tryParse(rawRating) ?? 0.0;

    // Followers
    int followers = 0;
    final rawFollowers = json['followers_count'] ?? json['followers'];
    if (rawFollowers is num) followers = rawFollowers.toInt();
    if (rawFollowers is String) followers = int.tryParse(rawFollowers) ?? 0;

    // Positive feedback %
    int positive = 98;
    final rawPositive = json['positive_feedback_pct'] ?? json['positive_response_rate'];
    if (rawPositive is num) positive = rawPositive.toInt();
    if (rawPositive is String) positive = int.tryParse(rawPositive.replaceAll('%', '').trim()) ?? 98;

    // Product count
    String pCount = '0';
    final rawPCount = json['product_count'] ?? json['products_count'] ?? json['total_products'];
    if (rawPCount is num) {
      pCount = rawPCount >= 1000
          ? '${(rawPCount / 1000).toStringAsFixed(1).replaceAll('.', ',')}K'
          : rawPCount.toString();
    } else if (rawPCount is String && rawPCount.isNotEmpty) {
      pCount = rawPCount;
    }

    // Review / Rating score
    String rCount = '0';
    final rawRCount = json['rating_count'] ?? json['reviews_count'] ?? json['total_reviews'];
    if (rawRCount is num) {
      rCount = rawRCount >= 1000
          ? '${(rawRCount / 1000).toStringAsFixed(1).replaceAll('.', ',')}K'
          : rawRCount.toString();
    } else if (rawRCount is String && rawRCount.isNotEmpty) {
      rCount = rawRCount;
    }

    // Active duration
    String active = '0';
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
      slogan: slogan,
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

  static String _formatNum(int n) {
    final s = n.toString();
    final buffer = StringBuffer();
    int count = 0;
    for (int i = s.length - 1; i >= 0; i--) {
      buffer.write(s[i]);
      count++;
      if (count % 3 == 0 && i > 0) buffer.write('.');
    }
    return buffer.toString().split('').reversed.join('');
  }

  factory StoreVoucherItem.fromJson(Map<String, dynamic> json) {
    final discountType = json['discount_type']?.toString().toUpperCase() ?? 'FIXED';
    final discountVal = json['discount_value'] is num
        ? (json['discount_value'] as num).toInt()
        : (json['discount_vnd'] is num ? (json['discount_vnd'] as num).toInt() : 0);
    final minGoods = json['min_goods_vnd'] is num
        ? (json['min_goods_vnd'] as num).toInt()
        : (json['min_order_vnd'] is num ? (json['min_order_vnd'] as num).toInt() : 0);

    String title = json['title']?.toString() ?? json['name']?.toString() ?? '';
    if (title.isEmpty) {
      if (discountType == 'PERCENT') {
        title = 'Giảm $discountVal%';
      } else if (discountVal > 0) {
        title = 'Giảm ${_formatNum(discountVal)} đ';
      } else {
        title = 'Ưu đãi cửa hàng';
      }
    }

    String condition = json['condition']?.toString() ?? '';
    if (condition.isEmpty) {
      condition = minGoods > 0 ? 'Đơn từ ${_formatNum(minGoods)} đ' : 'Cho mọi đơn hàng';
    }

    String expiry = json['expiry']?.toString() ?? '';
    if (expiry.isEmpty && json['ends_at'] != null) {
      final dt = DateTime.tryParse(json['ends_at'].toString())?.toLocal();
      if (dt != null) {
        final d = dt.day.toString().padLeft(2, '0');
        final m = dt.month.toString().padLeft(2, '0');
        final y = dt.year.toString();
        expiry = 'HSD: $d/$m/$y';
      }
    }
    if (expiry.isEmpty) expiry = 'HSD: 31/12/2026';

    return StoreVoucherItem(
      id: json['id']?.toString() ?? json['code']?.toString() ?? '',
      title: title,
      condition: condition,
      expiry: expiry,
      code: json['code']?.toString(),
      discountVnd: discountVal,
      minOrderVnd: minGoods,
    );
  }
}

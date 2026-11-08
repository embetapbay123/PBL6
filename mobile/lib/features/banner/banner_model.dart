import 'package:flutter/material.dart';

/// Mô hình thông tin banner và danh sách sản phẩm liên quan
class BannerItem {
  final String id;
  final String subtitle;
  final String title;
  final String description;
  final String actionText;
  final String imageUrl;
  final String categoryName;
  final Color backgroundColor;
  final List<String> productIds;
  final List<String> featuredProductTitles;

  const BannerItem({
    required this.id,
    required this.subtitle,
    required this.title,
    required this.description,
    required this.actionText,
    required this.imageUrl,
    required this.categoryName,
    this.backgroundColor = const Color(0xFFF7F2EC),
    this.productIds = const [],
    this.featuredProductTitles = const [],
  });
}

/// Kho dữ liệu banner chứa thông tin và sản phẩm của từng banner
class BannerRepository {
  static const List<BannerItem> defaultBanners = [
    BannerItem(
      id: 'fashion_simple',
      subtitle: 'TỪ NHỮNG ĐIỀU GIẢN ĐƠN',
      title: 'Chọn món bạn thích.\nThêm vui mỗi ngày.',
      description: 'Trang phục dễ mặc, góc nhà dễ thương và những món đồ dùng thật hữu ích.',
      actionText: 'Khám phá thời trang',
      imageUrl: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=500&q=80',
      categoryName: 'Thời trang',
      backgroundColor: Color(0xFFF7F2EC),
      productIds: [
        '26d45e7d-4663-43d6-840f-e31b7d6192aa',
        '1367cbaf-40bb-46d1-b95e-9d1f97645e4a',
        'e466c6b5-151d-425a-bf92-7d6f905eefd3',
        '4227588f-76a4-4923-a9d9-1c05fb43e7df',
        'e23cab0c-9a5b-46a2-91e5-349358f2e95d',
      ],
      featuredProductTitles: [
        'Áo hoodie xám Weekend',
        'Áo thun Everyday cổ tròn',
        'Áo thun trắng có túi ngực',
        'Áo thun xám Basic Essential',
      ],
    ),
    BannerItem(
      id: 'home_sweet_home',
      subtitle: 'CHĂM CHÚT GÓC NHỎ',
      title: 'Nhà là nơi\nbạn muốn về.',
      description: 'Góc làm việc gọn gàng, không gian sống ấm áp và những món đồ trang trí tối giản.',
      actionText: 'Xem đồ dùng cho nhà',
      imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=500&q=80',
      categoryName: 'Góc làm việc',
      backgroundColor: Color(0xFFF5EFE6),
      productIds: [
        '4b17b456-0068-4799-848d-dc574e5713c7',
        '4b86e585-7706-4659-a8c3-a25f9a4ba844',
        '137bc125-5bd4-46dc-8a73-3e390a11dcee',
      ],
      featuredProductTitles: [
        'Đèn bàn kim loại Nordic',
        'Khay gỗ sắp xếp bàn làm việc',
        'Sổ tay ghi chép Daily Notes',
      ],
    ),
  ];
}

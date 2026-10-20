import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../chat/chat_ai_modal.dart';
import '../shared/app_bottom_nav.dart';
import 'product_detail_page.dart';

class ShopPage extends StatefulWidget {
  const ShopPage({
    super.key,
    this.shopId = 'store-tech',
    this.shopName = 'TechZone Official',
  });

  final String shopId;
  final String shopName;

  @override
  State<ShopPage> createState() => _ShopPageState();
}

class _ShopPageState extends State<ShopPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isFollowing = false;
  final Set<String> _savedVouchers = {};

  final List<Map<String, dynamic>> _featuredProducts = [
    {
      'id': 'prod-phone-01',
      'title': 'Điện thoại thông minh màn hình AMOLED 128GB',
      'discount': '-25%',
      'price_vnd': 5990000,
      'original_price_vnd': 7990000,
      'rating': 4.9,
      'sold': '1,2K',
      'icon': Icons.phone_android_rounded,
      'color': Colors.indigo,
    },
    {
      'id': 'prod-earbuds-01',
      'title': 'Tai nghe không dây Bluetooth chống ồn, pin lâu',
      'discount': '-30%',
      'price_vnd': 699000,
      'original_price_vnd': 999000,
      'rating': 4.8,
      'sold': '2,1K',
      'icon': Icons.headphones_rounded,
      'color': Colors.grey,
    },
    {
      'id': 'prod-watch-01',
      'title': 'Đồng hồ thông minh theo dõi sức khỏe đa năng',
      'discount': '-20%',
      'price_vnd': 1590000,
      'original_price_vnd': 1990000,
      'rating': 4.9,
      'sold': '842',
      'icon': Icons.watch_rounded,
      'color': Colors.blueGrey,
    },
    {
      'id': 'prod-powerbank-01',
      'title': 'Sạc dự phòng 20000mAh sạc nhanh 22.5W',
      'discount': '-35%',
      'price_vnd': 390000,
      'original_price_vnd': 599000,
      'rating': 4.7,
      'sold': '1,5K',
      'icon': Icons.battery_charging_full_rounded,
      'color': Colors.amber,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _formatPrice(int price) {
    final s = price.toString();
    final buffer = StringBuffer();
    int count = 0;
    for (int i = s.length - 1; i >= 0; i--) {
      buffer.write(s[i]);
      count++;
      if (count % 3 == 0 && i > 0) buffer.write('.');
    }
    return '${buffer.toString().split('').reversed.join('')} đ';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: AppBottomNav(
        currentIndex: 0,
        onTap: (index) {
          if (index == 0) {
            Navigator.popUntil(context, (route) => route.isFirst);
          } else if (index == 3) {
            Navigator.pushNamed(context, '/cart');
          } else if (index == 4) {
            Navigator.pushNamed(context, '/profile');
          }
        },
      ),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 250,
              pinned: true,
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              title: innerBoxIsScrolled ? Text(widget.shopName) : null,
              actions: [
                IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: () {},
                ),
                IconButton(
                  icon: const Icon(Icons.share_outlined),
                  onPressed: () {},
                ),
                Stack(
                  alignment: Alignment.center,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.shopping_cart_outlined),
                      onPressed: () => Navigator.pushNamed(context, '/cart'),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                        child: const Center(
                          child: Text(
                            '5',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    Container(
                      decoration: const BoxDecoration(
                        gradient: AppColors.saleBannerGradient,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.only(left: 20, top: 75, right: 120),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Công nghệ\nkiến tạo cuộc sống tốt đẹp hơn',
                              style: TextStyle(
                                color: Colors.white.withAlpha(230),
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      right: 16,
                      top: 60,
                      child: Row(
                        children: [
                          Icon(Icons.laptop_chromebook, size: 48, color: Colors.white.withAlpha(180)),
                          const SizedBox(width: 8),
                          Icon(Icons.headphones, size: 42, color: Colors.white.withAlpha(180)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ];
        },
        body: ListView(
          padding: EdgeInsets.zero,
          children: [
            // Floating Shop Profile Card
            Transform.translate(
              offset: const Offset(0, -24),
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(15),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        // Avatar
                        Container(
                          width: 54,
                          height: 54,
                          decoration: const BoxDecoration(
                            color: AppColors.primaryLight,
                            shape: BoxShape.circle,
                          ),
                          child: const Center(
                            child: Icon(Icons.storefront_rounded, color: AppColors.primary, size: 30),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    widget.shopName,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.verified, color: AppColors.primary, size: 16),
                                ],
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Công nghệ chính hãng',
                                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.star, color: AppColors.star, size: 14),
                                  const Text(' 4.9 ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  Text(
                                    '| 12,5K người theo dõi',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                '98% phản hồi tích cực',
                                style: TextStyle(color: AppColors.green, fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          children: [
                            OutlinedButton.icon(
                              onPressed: () => ChatAiModal.show(context, initialPrompt: 'Tư vấn các sản phẩm của ${widget.shopName}'),
                              icon: const Icon(Icons.chat_bubble_outline, size: 14),
                              label: const Text('Chat', style: TextStyle(fontSize: 12)),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                            const SizedBox(height: 6),
                            FilledButton(
                              onPressed: () {
                                setState(() => _isFollowing = !_isFollowing);
                              },
                              style: FilledButton.styleFrom(
                                backgroundColor: _isFollowing ? Colors.grey.shade200 : AppColors.primary,
                                foregroundColor: _isFollowing ? Colors.black87 : Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                minimumSize: Size.zero,
                                visualDensity: VisualDensity.compact,
                              ),
                              child: Text(
                                _isFollowing ? 'Đang theo dõi' : 'Theo dõi',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    // Stats Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatItem('1,2K', 'Sản phẩm'),
                        _buildDivider(),
                        _buildStatItem('4.9', 'Đánh giá'),
                        _buildDivider(),
                        _buildStatItem('2 năm', 'Hoạt động'),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Tab Bar
            Container(
              color: Colors.white,
              child: TabBar(
                controller: _tabController,
                indicatorColor: AppColors.primary,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textSecondary,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                tabs: const [
                  Tab(text: 'Trang chủ'),
                  Tab(text: 'Sản phẩm'),
                  Tab(text: 'Danh mục'),
                  Tab(text: 'Đánh giá'),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Shop Promo Banner
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: AppColors.aiBannerGradient,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ƯU ĐÃI RIÊNG TẠI SHOP',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Giảm đến 40%',
                          style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Mua ngay',
                                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                              Icon(Icons.chevron_right, color: AppColors.primary, size: 14),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 64),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Shop Vouchers Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  const Icon(Icons.confirmation_num_outlined, color: AppColors.primary, size: 18),
                  const SizedBox(width: 6),
                  const Text(
                    'Mã giảm giá của Shop',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () {},
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Xem tất cả', style: TextStyle(color: AppColors.primary, fontSize: 12)),
                        Icon(Icons.chevron_right, color: AppColors.primary, size: 14),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Voucher Cards Horizontal List
            SizedBox(
              height: 88,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _buildVoucherCard(
                    id: 'VOUCHER_50K',
                    title: 'Giảm 50K',
                    condition: 'Đơn từ 500.000 đ',
                    expiry: 'HSD: 31/12/2026',
                    icon: Icons.confirmation_number_outlined,
                  ),
                  _buildVoucherCard(
                    id: 'VOUCHER_FREESHIP',
                    title: 'Freeship',
                    condition: 'Đơn từ 300.000 đ',
                    expiry: 'HSD: 31/12/2026',
                    icon: Icons.local_shipping_outlined,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Shop Category Circles
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildCategoryCircle(Icons.phone_iphone_rounded, 'Điện thoại'),
                  _buildCategoryCircle(Icons.headphones_rounded, 'Tai nghe'),
                  _buildCategoryCircle(Icons.watch_rounded, 'Đồng hồ'),
                  _buildCategoryCircle(Icons.cable_rounded, 'Phụ kiện'),
                  _buildCategoryCircle(Icons.more_horiz_rounded, 'Xem thêm'),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Featured Products Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  const Icon(Icons.local_fire_department, color: AppColors.primary, size: 20),
                  const SizedBox(width: 6),
                  const Text(
                    'Sản phẩm nổi bật',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () {},
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Xem tất cả', style: TextStyle(color: AppColors.primary, fontSize: 12)),
                        Icon(Icons.chevron_right, color: AppColors.primary, size: 14),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Products Grid
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _featuredProducts.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.65,
                ),
                itemBuilder: (context, index) {
                  final item = _featuredProducts[index];
                  return _buildProductCard(item);
                },
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String val, String label) {
    return Column(
      children: [
        Text(val, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(height: 24, width: 1, color: Colors.grey.shade200);
  }

  Widget _buildVoucherCard({
    required String id,
    required String title,
    required String condition,
    required String expiry,
    required IconData icon,
  }) {
    final isSaved = _savedVouchers.contains(id);

    return Container(
      width: 220,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.primarySoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withAlpha(50)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                ),
                Text(
                  condition,
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
                Text(
                  expiry,
                  style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          FilledButton(
            onPressed: () {
              setState(() {
                if (isSaved) {
                  _savedVouchers.remove(id);
                } else {
                  _savedVouchers.add(id);
                }
              });
            },
            style: FilledButton.styleFrom(
              backgroundColor: isSaved ? Colors.grey.shade300 : AppColors.primary,
              foregroundColor: isSaved ? Colors.black87 : Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              minimumSize: Size.zero,
              visualDensity: VisualDensity.compact,
            ),
            child: Text(isSaved ? 'Đã lưu' : 'Lưu', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryCircle(IconData icon, String label) {
    return Column(
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.grey.shade800, size: 24),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildProductCard(Map<String, dynamic> item) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ProductDetailPage(
              productId: item['id'] ?? 'prod-01',
              initialProduct: {
                'id': item['id'],
                'title': item['title'],
                'variants': [
                  {'id': 'v-01', 'sku': 'SKU-01', 'price_vnd': item['price_vnd'].toString()},
                ],
              },
            ),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image area + discount badge + favorite
            Stack(
              children: [
                Container(
                  height: 130,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                  ),
                  child: Center(
                    child: Icon(
                      item['icon'] as IconData? ?? Icons.shopping_bag_outlined,
                      size: 54,
                      color: item['color'] as Color? ?? AppColors.primary,
                    ),
                  ),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      item['discount'] ?? '-20%',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.favorite_border, size: 16, color: Colors.grey),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['title'] ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, height: 1.3),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        _formatPrice(item['price_vnd'] as int? ?? 500000),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  if (item['original_price_vnd'] != null)
                    Text(
                      _formatPrice(item['original_price_vnd'] as int),
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 10,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, color: AppColors.star, size: 12),
                      Text(
                        ' ${item['rating']} | Đã bán ${item['sold']}',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 10),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

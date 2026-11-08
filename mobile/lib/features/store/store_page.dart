import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../catalog/product_detail_page.dart';
import '../chat/chat_ai_modal.dart';
import '../customer/favorites_page.dart';
import '../shared/app_bottom_nav.dart';
import 'store_model.dart';
import 'store_provider.dart';
import 'widgets/store_header_view.dart';

class StorePage extends ConsumerStatefulWidget {
  const StorePage({
    super.key,
    this.shopId = 'd3e00000-0000-4000-8000-000000000201',
    this.shopName = 'TechZone Official',
  });

  final String shopId;
  final String shopName;

  @override
  ConsumerState<StorePage> createState() => _StorePageState();
}

/// Backward compatibility alias
typedef ShopPage = StorePage;

class _StorePageState extends ConsumerState<StorePage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isFollowing = false;
  final Set<String> _savedVouchers = {};
  String? _selectedCategory;
  String _productSort = 'popular';

  final List<Map<String, dynamic>> _featuredProductsFallback = [
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
      'category': 'Điện thoại',
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
      'category': 'Tai nghe',
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
      'category': 'Đồng hồ',
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
      'category': 'Phụ kiện',
    },
    {
      'id': 'prod-laptop-01',
      'title': 'Laptop Pro 14 inch mỏng nhẹ hiệu năng cao',
      'discount': '-15%',
      'price_vnd': 18990000,
      'original_price_vnd': 21990000,
      'rating': 4.9,
      'sold': '520',
      'icon': Icons.laptop_mac_rounded,
      'color': Colors.blue,
      'category': 'Laptop',
    },
    {
      'id': 'prod-camera-01',
      'title': 'Camera an ninh Wifi góc siêu rộng 2K',
      'discount': '-28%',
      'price_vnd': 490000,
      'original_price_vnd': 690000,
      'rating': 4.8,
      'sold': '930',
      'icon': Icons.videocam_rounded,
      'color': Colors.deepOrange,
      'category': 'Camera',
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
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

  String _extractCategory(Map<String, dynamic> item) {
    if (item['category'] != null) {
      if (item['category'] is String && item['category'].toString().isNotEmpty) {
        return item['category'].toString();
      }
      if (item['category'] is Map && item['category']['name'] != null) {
        return item['category']['name'].toString();
      }
    }
    if (item['category_name'] != null && item['category_name'].toString().isNotEmpty) {
      return item['category_name'].toString();
    }
    final title = (item['title'] ?? item['name'] ?? '').toString().toLowerCase();
    if (title.contains('điện thoại') || title.contains('phone')) return 'Điện thoại';
    if (title.contains('tai nghe') || title.contains('earbuds') || title.contains('headphone')) return 'Tai nghe';
    if (title.contains('đồng hồ') || title.contains('watch')) return 'Đồng hồ';
    if (title.contains('sạc') || title.contains('cáp') || title.contains('phụ kiện') || title.contains('pin')) return 'Phụ kiện';
    if (title.contains('laptop') || title.contains('máy tính')) return 'Laptop';
    if (title.contains('camera')) return 'Camera';
    if (title.contains('áo') || title.contains('quần') || title.contains('thời trang')) return 'Thời trang';
    if (title.contains('sổ') || title.contains('bút') || title.contains('văn phòng')) return 'Văn phòng phẩm';
    if (title.contains('mèo') || title.contains('chó') || title.contains('thú cưng') || title.contains('pet')) return 'Thú cưng';
    return 'Khác';
  }

  IconData _getCategoryIcon(String category) {
    final lower = category.toLowerCase();
    if (lower.contains('thoại') || lower.contains('phone')) return Icons.phone_iphone_rounded;
    if (lower.contains('tai nghe') || lower.contains('headphone') || lower.contains('earbud')) return Icons.headphones_rounded;
    if (lower.contains('đồng hồ') || lower.contains('watch')) return Icons.watch_rounded;
    if (lower.contains('phụ kiện') || lower.contains('cáp') || lower.contains('sạc') || lower.contains('pin')) return Icons.cable_rounded;
    if (lower.contains('laptop') || lower.contains('máy tính')) return Icons.laptop_mac_rounded;
    if (lower.contains('camera') || lower.contains('máy ảnh')) return Icons.videocam_rounded;
    if (lower.contains('thời trang') || lower.contains('áo') || lower.contains('quần')) return Icons.checkroom_rounded;
    if (lower.contains('sổ') || lower.contains('văn phòng') || lower.contains('bút')) return Icons.menu_book_rounded;
    if (lower.contains('thú cưng') || lower.contains('chó') || lower.contains('mèo') || lower.contains('pet')) return Icons.pets_rounded;
    return Icons.category_outlined;
  }

  int _extractPrice(Map<String, dynamic> item) {
    if (item['price_vnd'] != null) {
      return int.tryParse(item['price_vnd'].toString()) ?? 0;
    }
    if (item['variants'] is List && (item['variants'] as List).isNotEmpty) {
      final first = (item['variants'] as List).first;
      if (first is Map && first['price_vnd'] != null) {
        return int.tryParse(first['price_vnd'].toString()) ?? 0;
      }
    }
    return 0;
  }

  int _extractSold(Map<String, dynamic> item) {
    final raw = item['sold']?.toString() ?? '0';
    if (raw.endsWith('K') || raw.endsWith('k')) {
      final numPart = double.tryParse(raw.replaceAll(RegExp(r'[kK,]'), '.')) ?? 0;
      return (numPart * 1000).toInt();
    }
    return int.tryParse(raw) ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final storeProfileAsync = ref.watch(
      storeProfileProvider((widget.shopId, widget.shopName)),
    );
    final storeProductsAsync = ref.watch(storeProductsListProvider(widget.shopId));
    final storeVouchersAsync = ref.watch(storeVouchersListProvider(widget.shopId));

    final profile = storeProfileAsync.value ??
        StoreProfile(
          id: widget.shopId,
          name: widget.shopName,
        );

    final storeProducts = storeProductsAsync.value ?? [];
    final storeVouchers = storeVouchersAsync.value ?? const [
      StoreVoucherItem(
        id: 'VOUCHER_50K',
        title: 'Giảm 50K',
        condition: 'Đơn từ 500.000 đ',
        expiry: 'HSD: 31/12/2026',
      ),
      StoreVoucherItem(
        id: 'VOUCHER_FREESHIP',
        title: 'Freeship',
        condition: 'Đơn từ 300.000 đ',
        expiry: 'HSD: 31/12/2026',
      ),
    ];

    final displayProducts = storeProducts.isNotEmpty ? storeProducts : _featuredProductsFallback;

    // Dynamically extract categories present in the store's products
    final storeCategories = <String>[];
    for (final p in displayProducts) {
      final cat = _extractCategory(p);
      if (cat.isNotEmpty && !storeCategories.contains(cat)) {
        storeCategories.add(cat);
      }
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: AppBottomNav(
        currentIndex: 0,
        onTap: (index) {
          if (index == 0) {
            Navigator.popUntil(context, (route) => route.isFirst);
          } else if (index == 1) {
            Navigator.pushNamed(context, '/cart');
          } else if (index == 2) {
            ChatAiModal.show(context);
          } else if (index == 3) {
            Navigator.pushNamed(context, '/profile');
          }
        },
      ),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          final topPadding = MediaQuery.of(context).padding.top;
          return [
            SliverAppBar(
              expandedHeight: 215 + topPadding,
              pinned: true,
              backgroundColor: const Color(0xFFEE4D2D),
              foregroundColor: Colors.white,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
              title: innerBoxIsScrolled
                  ? Text(
                      profile.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    )
                  : null,
              actions: [
                IconButton(
                  icon: const Icon(Icons.search, color: Colors.white),
                  onPressed: () {},
                ),
                IconButton(
                  icon: const Icon(Icons.share_outlined, color: Colors.white),
                  onPressed: () {},
                ),
                Stack(
                  alignment: Alignment.center,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.shopping_cart_outlined, color: Colors.white),
                      onPressed: () => Navigator.pushNamed(context, '/cart'),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                        child: const Center(
                          child: Text(
                            '5',
                            style: TextStyle(
                              color: Color(0xFFEE4D2D),
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
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFFEE4D2D),
                        Color(0xFFFF5722),
                      ],
                    ),
                  ),
                  padding: EdgeInsets.fromLTRB(16, topPadding + 48, 16, 12),
                  child: StoreHeaderView(
                    profile: profile,
                    isFollowing: _isFollowing,
                    onToggleFollow: () {
                      setState(() => _isFollowing = !_isFollowing);
                    },
                  ),
                ),
              ),
            ),
          ];
        },
        body: ListView(
          padding: EdgeInsets.zero,
          children: [
            // Tab Bar
            Container(
              color: Colors.white,
              child: TabBar(
                controller: _tabController,
                onTap: (index) => setState(() {}),
                indicatorColor: AppColors.primary,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textSecondary,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                tabs: const [
                  Tab(text: 'Trang chủ'),
                  Tab(text: 'Sản phẩm'),
                  Tab(text: 'Danh mục'),
                ],
              ),
            ),
            if (_tabController.index == 0)
              ..._buildHomeTab(
                profile,
                displayProducts,
                storeVouchers,
                storeProductsAsync.isLoading,
                storeCategories,
              )
            else if (_tabController.index == 1)
              ..._buildProductsTab(
                displayProducts,
                storeCategories,
              )
            else
              ..._buildCategoriesTab(
                displayProducts,
                storeCategories,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVoucherCard(StoreVoucherItem voucher) {
    final isSaved = _savedVouchers.contains(voucher.id);

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
            child: const Icon(Icons.confirmation_number_outlined, color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  voucher.title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: AppColors.primary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  voucher.condition,
                  style: const TextStyle(fontSize: 10.5, color: AppColors.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  voucher.expiry,
                  style: const TextStyle(fontSize: 9.5, color: AppColors.textMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          FilledButton(
            onPressed: () {
              setState(() {
                if (isSaved) {
                  _savedVouchers.remove(voucher.id);
                } else {
                  _savedVouchers.add(voucher.id);
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

  List<Widget> _buildHomeTab(
    StoreProfile profile,
    List<Map<String, dynamic>> displayProducts,
    List<StoreVoucherItem> storeVouchers,
    bool isLoading,
    List<String> categories,
  ) {
    return [
      if (profile.slogan.isNotEmpty)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.storefront_outlined,
                  size: 16,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    profile.slogan,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF4B5563),
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
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

      // Shop Vouchers Section (loaded from server)
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            Icon(Icons.confirmation_num_outlined, color: AppColors.primary, size: 18),
            SizedBox(width: 6),
            Text(
              'Mã giảm giá của Shop',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ],
        ),
      ),

      // Voucher Cards Horizontal List
      SizedBox(
        height: 96,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          children: storeVouchers.map((v) => _buildVoucherCard(v)).toList(),
        ),
      ),

      const SizedBox(height: 16),

      // Shop Category Circles (scrollable horizontally, only categories of products in store, no "Xem thêm")
      if (categories.isNotEmpty)
        SizedBox(
          height: 84,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: categories.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final cat = categories[index];
              return _buildCategoryCircle(
                _getCategoryIcon(cat),
                cat,
                onTap: () {
                  setState(() {
                    _selectedCategory = cat;
                    _tabController.animateTo(1);
                  });
                },
              );
            },
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
              onPressed: () {
                setState(() {
                  _selectedCategory = null;
                  _tabController.animateTo(1);
                });
              },
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
        child: isLoading
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            : GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: displayProducts.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.65,
                ),
                itemBuilder: (context, index) {
                  final item = displayProducts[index];
                  return _buildProductCard(item);
                },
              ),
      ),

      const SizedBox(height: 24),
    ];
  }

  List<Widget> _buildProductsTab(
    List<Map<String, dynamic>> allProducts,
    List<String> categories,
  ) {
    // Filter by selected category if any
    var filtered = allProducts;
    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      filtered = allProducts
          .where((p) => _extractCategory(p).toLowerCase() == _selectedCategory!.toLowerCase())
          .toList();
    }

    // Sort products
    final sorted = List<Map<String, dynamic>>.from(filtered);
    if (_productSort == 'best_selling') {
      sorted.sort((a, b) => _extractSold(b).compareTo(_extractSold(a)));
    } else if (_productSort == 'price_asc') {
      sorted.sort((a, b) => _extractPrice(a).compareTo(_extractPrice(b)));
    } else if (_productSort == 'price_desc') {
      sorted.sort((a, b) => _extractPrice(b).compareTo(_extractPrice(a)));
    }

    return [
      // Sort Toolbar (matching Image 2: Phổ biến | Mới nhất | Bán chạy | Giá ⇅)
      Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            bottom: BorderSide(color: Colors.grey.shade200),
          ),
        ),
        child: Row(
          children: [
            _buildSortTab('Phổ biến', 'popular'),
            _buildSortTab('Mới nhất', 'latest'),
            _buildSortTab('Bán chạy', 'best_selling'),
            _buildSortTab(
              _productSort == 'price_asc'
                  ? 'Giá ↑'
                  : (_productSort == 'price_desc' ? 'Giá ↓' : 'Giá ⇅'),
              'price',
            ),
          ],
        ),
      ),

      // Categories filter chips bar
      if (categories.isNotEmpty)
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildCategoryFilterChip(
                  label: 'Tất cả (${allProducts.length})',
                  isSelected: _selectedCategory == null,
                  onTap: () => setState(() => _selectedCategory = null),
                ),
                const SizedBox(width: 8),
                ...categories.map((cat) {
                  final count = allProducts
                      .where((p) => _extractCategory(p).toLowerCase() == cat.toLowerCase())
                      .length;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: _buildCategoryFilterChip(
                      label: '$cat ($count)',
                      isSelected: _selectedCategory?.toLowerCase() == cat.toLowerCase(),
                      onTap: () => setState(() {
                        if (_selectedCategory?.toLowerCase() == cat.toLowerCase()) {
                          _selectedCategory = null;
                        } else {
                          _selectedCategory = cat;
                        }
                      }),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),

      const SizedBox(height: 12),

      // Products Grid
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: sorted.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(
                    children: [
                      Icon(Icons.inbox_outlined, size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 8),
                      Text(
                        'Không có sản phẩm nào thuộc danh mục này',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              )
            : GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: sorted.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.65,
                ),
                itemBuilder: (context, index) {
                  final item = sorted[index];
                  return _buildProductCard(item);
                },
              ),
      ),

      const SizedBox(height: 24),
    ];
  }

  Widget _buildSortTab(String title, String key) {
    final bool isSelected;
    if (key == 'price') {
      isSelected = _productSort == 'price_asc' || _productSort == 'price_desc';
    } else {
      isSelected = _productSort == key;
    }

    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            if (key == 'price') {
              if (_productSort == 'price_asc') {
                _productSort = 'price_desc';
              } else {
                _productSort = 'price_asc';
              }
            } else {
              _productSort = key;
            }
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isSelected ? AppColors.primary : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Center(
            child: Text(
              title,
              style: TextStyle(
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withAlpha(20) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.grey.shade300,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppColors.primary : AppColors.textPrimary,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildCategoriesTab(
    List<Map<String, dynamic>> allProducts,
    List<String> categories,
  ) {
    return [
      const SizedBox(height: 12),
      ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final count = allProducts
              .where((p) => _extractCategory(p).toLowerCase() == cat.toLowerCase())
              .length;
          return ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            leading: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(_getCategoryIcon(cat), color: AppColors.primary),
            ),
            title: Text(
              cat,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
            subtitle: Text(
              '$count sản phẩm',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            trailing: const Icon(Icons.chevron_right, color: Colors.grey),
            onTap: () {
              setState(() {
                _selectedCategory = cat;
                _tabController.animateTo(1);
              });
            },
          );
        },
      ),
      const SizedBox(height: 24),
    ];
  }


  Widget _buildCategoryCircle(IconData icon, String label, {VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.grey.shade800, size: 24),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: 64,
              child: Text(
                label,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> item) {
    final id = item['id']?.toString() ?? 'prod-01';
    final title = item['title']?.toString() ?? '';

    // Price extraction
    int priceInt = 100000;
    if (item['price_vnd'] != null) {
      priceInt = int.tryParse(item['price_vnd'].toString()) ?? 100000;
    } else if (item['variants'] is List && (item['variants'] as List).isNotEmpty) {
      final firstVariant = (item['variants'] as List).first;
      if (firstVariant is Map && firstVariant['price_vnd'] != null) {
        priceInt = int.tryParse(firstVariant['price_vnd'].toString()) ?? 100000;
      }
    }
    final originalPriceInt = item['original_price_vnd'] != null
        ? int.tryParse(item['original_price_vnd'].toString())
        : (priceInt * 1.25).round();

    // Image extraction
    String? imageUrl;
    final images = item['images'] as List?;
    if (images != null && images.isNotEmpty) {
      final firstImg = images.first;
      if (firstImg is Map && firstImg['image_url'] != null) {
        imageUrl = firstImg['image_url'].toString();
      } else if (firstImg is String) {
        imageUrl = firstImg;
      }
    } else if (item['image_url'] != null) {
      imageUrl = item['image_url'].toString();
    }

    final rating = item['rating']?.toString() ?? '4.8';
    final sold = item['sold']?.toString() ?? '100+';

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ProductDetailPage(
              productId: id,
              initialProduct: item,
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
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                  child: Container(
                    height: 130,
                    width: double.infinity,
                    color: Colors.grey.shade50,
                    child: imageUrl != null && imageUrl.startsWith('http')
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => Center(
                              child: Icon(
                                item['icon'] as IconData? ?? Icons.shopping_bag_outlined,
                                size: 54,
                                color: item['color'] as Color? ?? AppColors.primary,
                              ),
                            ),
                          )
                        : Center(
                            child: Icon(
                              item['icon'] as IconData? ?? Icons.shopping_bag_outlined,
                              size: 54,
                              color: item['color'] as Color? ?? AppColors.primary,
                            ),
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
                      item['discount']?.toString() ?? '-20%',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                Positioned(
                  top: 2,
                  right: 2,
                  child: Consumer(
                    builder: (context, ref, _) {
                      final isFav = ref.watch(favoritesProvider).any((f) => f.id == id);
                      return GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          ref.read(favoritesProvider.notifier).toggleFavorite(item);
                          AppNoticeDialog.show(
                            context,
                            message: isFav
                                ? 'Đã xóa khỏi danh sách yêu thích.'
                                : 'Đã thêm vào danh sách yêu thích!',
                          );
                        },
                        child: Container(
                          width: 44,
                          height: 44,
                          alignment: Alignment.center,
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 4,
                                  offset: Offset(0, 1),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Icon(
                                isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                size: 17,
                                color: isFav ? const Color(0xFFDC2626) : const Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
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
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, height: 1.3),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        _formatPrice(priceInt),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  if (originalPriceInt != null && originalPriceInt > priceInt)
                    Text(
                      _formatPrice(originalPriceInt),
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
                        ' $rating | Đã bán $sold',
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

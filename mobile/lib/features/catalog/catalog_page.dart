import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../chat/chat_ai_modal.dart';
import '../customer/favorites_page.dart';
import '../shared/app_bottom_nav.dart';
import 'product_detail_page.dart';

class CatalogPage extends ConsumerStatefulWidget {
  const CatalogPage({super.key, this.initialSearch});

  final String? initialSearch;

  @override
  ConsumerState<CatalogPage> createState() => _CatalogPageState();
}

class _CatalogPageState extends ConsumerState<CatalogPage> {
  late final TextEditingController _searchController;
  late final ScrollController _scrollController;
  String _searchQuery = '';
  String? _selectedCategory;
  String _sort = 'title';
  int _page = 1;

  @override
  void initState() {
    super.initState();
    _searchQuery = widget.initialSearch ?? '';
    _searchController = TextEditingController(text: _searchQuery);
    _scrollController = ScrollController();
  }

  String get _catalogKey => jsonEncode({
        'q': _searchQuery,
        'category_id': _selectedCategory,
        'sort': _sort,
        'page': _page,
      });

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSearch(String val) {
    setState(() {
      _searchQuery = val.trim();
      _page = 1;
    });
  }

  void _onSortChanged(String sort) {
    setState(() {
      _sort = sort;
      _page = 1;
    });
  }

  void _selectCategory(String? categoryId) {
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      if (_selectedCategory == categoryId) {
        _selectedCategory = null;
      } else {
        _selectedCategory = categoryId;
      }
      _page = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(catalogProductsProvider(_catalogKey));
    final categoriesAsync = ref.watch(categoriesProvider);
    final cartCount = ref.watch(cartBadgeCountProvider);


    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: AppBottomNav(
        currentIndex: 0,
        cartCount: cartCount,
        onTap: (index) {
          switch (index) {
            case 0:
              // Already on home / catalog
              break;
            case 1:
              Navigator.pushNamed(context, '/customer/favorites');
              break;
            case 2:
              Navigator.pushNamed(context, '/cart');
              break;
            case 3:
              ChatAiModal.show(context);
              break;
            case 4:
              Navigator.pushNamed(context, '/profile');
              break;
          }
        },
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          ref.invalidate(catalogProductsProvider);
          ref.invalidate(categoriesProvider);
          ref.invalidate(recommendationProvider);
        },
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            // Top Bar & Navbar & Search Bar
            SliverToBoxAdapter(
              child: _buildWebTopSection(context, cartCount),
            ),

            // Hero Banner ("TỪ NHỮNG ĐIỀU GIẢN ĐƠN ...")
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                child: _buildHeroBanner(context, categoriesAsync),
              ),
            ),

            // "Bạn đang tìm gì?" Section with 4 category cards
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                child: _buildWhatAreYouLookingFor(categoriesAsync),
              ),
            ),

            // Active Category Filter Indicator (if any)
            if (_selectedCategory != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFBF2ED),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFF3D2C4)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.filter_list_rounded, size: 16, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Đang xem danh mục: ${categoriesAsync.asData?.value.firstWhere((c) => c['id']?.toString() == _selectedCategory, orElse: () => <String, dynamic>{})['name']?.toString() ?? (_selectedCategory == '3aeb8256-3d88-46be-8321-89bb43aaf300' ? 'Thời trang' : (_selectedCategory == 'cd314f70-d4f7-4b34-bb05-33df23027833' ? 'Góc làm việc' : (_selectedCategory == '33e0b2c4-c52c-4839-9796-41d6214e3bcd' ? 'Nhà cửa & đời sống' : 'Túi & phụ kiện')))}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () => _selectCategory(null),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE5E7EB)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.close, size: 12, color: Color(0xFF64748B)),
                                SizedBox(width: 4),
                                Text(
                                  'Bỏ lọc',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            // Section "Sản phẩm dành cho bạn" Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 22, 16, 10),
                child: Row(
                  children: [
                    const Text(
                      'Sản phẩm dành cho bạn',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const Spacer(),
                    if (_searchQuery.isNotEmpty)
                      Text(
                        'Kết quả: "$_searchQuery"',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      )
                    else
                      InkWell(
                        onTap: () {
                          // View all or reset
                          if (_selectedCategory != null) {
                            _selectCategory(null);
                          }
                        },
                        child: const Text(
                          'Xem tất cả ›',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // Sort Filter Chips (Web alignment: title, price_asc, price_desc)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildSortChip(
                        label: 'Tên sản phẩm',
                        icon: Icons.sort_by_alpha,
                        selected: _sort == 'title',
                        onTap: () => _onSortChanged('title'),
                      ),
                      const SizedBox(width: 8),
                      _buildSortChip(
                        label: 'Giá tăng dần',
                        icon: Icons.arrow_upward_rounded,
                        selected: _sort == 'price_asc',
                        onTap: () => _onSortChanged('price_asc'),
                      ),
                      const SizedBox(width: 8),
                      _buildSortChip(
                        label: 'Giá giảm dần',
                        icon: Icons.arrow_downward_rounded,
                        selected: _sort == 'price_desc',
                        onTap: () => _onSortChanged('price_desc'),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Products Grid Content (Image 1)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: _buildProductsSliver(productsAsync),
            ),

            // Section "Đã xem gần đây" (Image 1)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 22, 16, 24),
                child: _buildRecentlyViewedSection(productsAsync),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Web-like top section: Announcement Bar + Brand Navbar + Search Bar
  Widget _buildWebTopSection(BuildContext context, int cartCount) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Terracotta Top Announcement Bar
        Container(
          color: AppColors.primary,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'PBL6 Market · Bản trải nghiệm với dữ liệu mẫu',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Chương trình Bán hàng cùng PBL6 đang mở đăng ký!'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    child: const Text(
                      'Bán hàng cùng PBL6',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // 2. Main White Brand Header
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              // Terracotta P6 Badge
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'P6',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'PBL6 Market',
                style: TextStyle(
                  color: Color(0xFF1F2937),
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                  letterSpacing: -0.3,
                ),
              ),
              const Spacer(),
              // Cart with badge
              InkWell(
                onTap: () => Navigator.pushNamed(context, '/cart'),
                borderRadius: BorderRadius.circular(20),
                child: Padding(
                  padding: const EdgeInsets.all(6),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(
                        Icons.shopping_cart_outlined,
                        size: 24,
                        color: Color(0xFF374151),
                      ),
                      if (cartCount > 0)
                        Positioned(
                          top: -4,
                          right: -6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                            child: Center(
                              child: Text(
                                cartCount > 99 ? '99+' : '$cartCount',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.bold,
                                  height: 1,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // User Profile Icon
              InkWell(
                onTap: () => Navigator.pushNamed(context, '/profile'),
                borderRadius: BorderRadius.circular(20),
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: Icon(
                    Icons.person_outline_rounded,
                    size: 24,
                    color: Color(0xFF374151),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Hamburger Menu Icon
              InkWell(
                onTap: () => _showNavigationMenu(context),
                borderRadius: BorderRadius.circular(20),
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: Icon(
                    Icons.menu_rounded,
                    size: 24,
                    color: Color(0xFF374151),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Divider
        const Divider(height: 1, thickness: 1, color: Color(0xFFE5E7EB)),

        // 3. Search Bar Section
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFD1D5DB), width: 1.2),
            ),
            child: Row(
              children: [
                const Padding(
                  padding: EdgeInsets.only(left: 12),
                  child: Icon(
                    Icons.search,
                    color: Color(0xFF9CA3AF),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: _onSearch,
                    decoration: const InputDecoration(
                      hintText: 'Bạn đang tìm sản phẩm gì?',
                      hintStyle: TextStyle(
                        color: Color(0xFF9CA3AF),
                        fontSize: 13.5,
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                if (_searchController.text.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear, size: 16, color: Color(0xFF9CA3AF)),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () {
                      _searchController.clear();
                      _onSearch('');
                    },
                  ),
                const SizedBox(width: 4),
                Material(
                  color: AppColors.primary,
                  borderRadius: const BorderRadius.horizontal(right: Radius.circular(6.8)),
                  child: InkWell(
                    borderRadius: const BorderRadius.horizontal(right: Radius.circular(6.8)),
                    onTap: () => _onSearch(_searchController.text),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Text(
                        'Tìm kiếm',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Warm Beige Hero Banner matching Web Screenshot
  Widget _buildHeroBanner(
    BuildContext context,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    return Material(
      color: const Color(0xFFF7F2EC),
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _onCategoryCardTapped('Thời trang', categoriesAsync),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'TỪ NHỮNG ĐIỀU GIẢN ĐƠN',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF8C7E72),
                        letterSpacing: 1.1,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Chọn món bạn thích.\nThêm vui mỗi ngày.',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1F2937),
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Trang phục dễ mặc, góc nhà dễ thương và những món đồ dùng thật hữu ích.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF5C5248),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Text(
                          'Khám phá thời trang',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 15,
                          color: AppColors.primary,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 110,
                  height: 135,
                  child: Image.network(
                    'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=500&q=80',
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stack) => Container(
                      color: const Color(0xFFEFE8DE),
                      child: const Center(
                        child: Icon(
                          Icons.checkroom_rounded,
                          size: 38,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    loadingBuilder: (ctx, child, progress) {
                      if (progress == null) return child;
                      return Container(
                        color: const Color(0xFFEFE8DE),
                        child: const Center(
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// "Bạn đang tìm gì?" Section matching Web Screenshot (4 visual category cards)
  Widget _buildWhatAreYouLookingFor(AsyncValue<List<Map<String, dynamic>>> categoriesAsync) {
    final categories = [
      {
        'title': 'Góc làm việc',
        'image': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=80',
        'icon': Icons.computer_rounded,
      },
      {
        'title': 'Nhà cửa & đời sống',
        'image': 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80',
        'icon': Icons.chair_outlined,
      },
      {
        'title': 'Thời trang',
        'image': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
        'icon': Icons.checkroom_rounded,
      },
      {
        'title': 'Túi & phụ kiện',
        'image': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
        'icon': Icons.shopping_bag_outlined,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        Row(
          children: [
            const Text(
              'Bạn đang tìm gì?',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1F2937),
              ),
            ),
            const Spacer(),
            InkWell(
              onTap: () {
                _selectCategory(null);
                _searchController.clear();
                _onSearch('');
              },
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Xem tất cả',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(width: 3),
                  Icon(
                    Icons.arrow_forward_rounded,
                    size: 14,
                    color: AppColors.primary,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 4 Category Cards in 2x2 Layout
        Row(
          children: [
            Expanded(
              child: _buildCategoryCard(
                categories[0],
                categoriesAsync,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildCategoryCard(
                categories[1],
                categoriesAsync,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildCategoryCard(
                categories[2],
                categoriesAsync,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildCategoryCard(
                categories[3],
                categoriesAsync,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCategoryCard(
    Map<String, dynamic> item,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    final title = item['title'] as String;
    final imageUrl = item['image'] as String;
    final icon = item['icon'] as IconData;

    final isSelected = (_selectedCategory == '3aeb8256-3d88-46be-8321-89bb43aaf300' && title == 'Thời trang') ||
        (_selectedCategory == 'cd314f70-d4f7-4b34-bb05-33df23027833' && title == 'Góc làm việc') ||
        (_selectedCategory == '33e0b2c4-c52c-4839-9796-41d6214e3bcd' && title == 'Nhà cửa & đời sống') ||
        (_selectedCategory == 'ddba6c89-1cf9-4733-9fb9-034c222846c9' && title == 'Túi & phụ kiện');

    return Material(
      color: isSelected ? const Color(0xFFFBF2ED) : Colors.white,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _onCategoryCardTapped(title, categoriesAsync),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : const Color(0xFFE5E7EB),
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: 95,
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (ctx, err, stack) => Container(
                    color: const Color(0xFFF3F4F6),
                    child: Center(
                      child: Icon(icon, color: AppColors.primary, size: 30),
                    ),
                  ),
                  loadingBuilder: (ctx, child, progress) {
                    if (progress == null) return child;
                    return Container(
                      color: const Color(0xFFF3F4F6),
                      child: const Center(
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                child: Text(
                  title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? AppColors.primary : const Color(0xFF1F2937),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _onCategoryCardTapped(
    String title, [
    AsyncValue<List<Map<String, dynamic>>>? categoriesAsync,
  ]) {
    _searchController.clear();
    _searchQuery = '';

    final list = categoriesAsync?.asData?.value ?? [];
    final query = title.toLowerCase();
    Map<String, dynamic>? match;
    for (final c in list) {
      final cName = (c['name']?.toString() ?? '').toLowerCase();
      if (cName.contains(query) ||
          (query.contains('thời trang') && cName.contains('thời trang')) ||
          (query.contains('làm việc') &&
              (cName.contains('làm việc') || cName.contains('điện tử') || cName.contains('laptop') || cName.contains('tech'))) ||
          (query.contains('nhà cửa') &&
              (cName.contains('nhà cửa') || cName.contains('gia dụng') || cName.contains('đời sống') || cName.contains('nhà'))) ||
          (query.contains('phụ kiện') &&
              (cName.contains('phụ kiện') || cName.contains('túi')))) {
        match = c;
        break;
      }
    }

    String? categoryId = match?['id']?.toString();
    if (categoryId == null) {
      if (query.contains('thời trang')) {
        categoryId = '3aeb8256-3d88-46be-8321-89bb43aaf300';
      } else if (query.contains('làm việc')) {
        categoryId = 'cd314f70-d4f7-4b34-bb05-33df23027833';
      } else if (query.contains('nhà cửa')) {
        categoryId = '33e0b2c4-c52c-4839-9796-41d6214e3bcd';
      } else if (query.contains('phụ kiện')) {
        categoryId = 'ddba6c89-1cf9-4733-9fb9-034c222846c9';
      }
    }

    if (categoryId != null) {
      _selectCategory(categoryId);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            500,
            duration: const Duration(milliseconds: 350),
            curve: Curves.easeOutCubic,
          );
        }
      });
    } else {
      _searchController.text = title;
      _onSearch(title);
    }
  }

  void _showNavigationMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.home_outlined, color: AppColors.primary),
                title: const Text('Trang chủ / Khám phá', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(ctx);
                  _selectCategory(null);
                  _searchController.clear();
                  _onSearch('');
                },
              ),
              ListTile(
                leading: const Icon(Icons.shopping_bag_outlined, color: AppColors.primary),
                title: const Text('Giỏ hàng', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.pushNamed(context, '/cart');
                },
              ),
              ListTile(
                leading: const Icon(Icons.auto_awesome, color: AppColors.primary),
                title: const Text('Trợ lý AI Mua sắm', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(ctx);
                  ChatAiModal.show(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.receipt_long_outlined, color: AppColors.primary),
                title: const Text('Đơn mua của tôi', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.pushNamed(context, '/orders');
                },
              ),
              ListTile(
                leading: const Icon(Icons.person_outline, color: AppColors.primary),
                title: const Text('Tài khoản & Cài đặt', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.pushNamed(context, '/profile');
                },
              ),
              ListTile(
                leading: const Icon(Icons.storefront_outlined, color: AppColors.primary),
                title: const Text('Bán hàng cùng PBL6', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Tính năng đăng ký bán hàng cùng PBL6 đang hoạt động!'),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSortChip({
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withAlpha(20) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.primary : Colors.grey.shade300,
            width: selected ? 1.2 : 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: selected ? AppColors.primary : Colors.grey.shade600,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                color: selected ? AppColors.primary : AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Products Grid matching Image 1
  Widget _buildProductsSliver(AsyncValue<Map<String, dynamic>> productsAsync) {
    return productsAsync.when(
      loading: () => const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
        ),
      ),
      error: (error, _) => SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.primary),
                const SizedBox(height: 12),
                Text(
                  errorMessage(error),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.primary),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(catalogProductsProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
      ),
      data: (result) {
        final items = (result['items'] as List?) ?? [];
        if (items.isEmpty) {
          return SliverToBoxAdapter(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    const Icon(
                      Icons.search_off_outlined,
                      size: 64,
                      color: AppColors.textMuted,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Không tìm thấy sản phẩm nào',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                    if (_searchQuery.isNotEmpty || _selectedCategory != null) ...[
                      const SizedBox(height: 16),
                      OutlinedButton(
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                            _selectedCategory = null;
                          });
                        },
                        child: const Text('Xóa bộ lọc'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        }

        return SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.67,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final product = items[index] as Map<String, dynamic>;
              return _buildProductCard(context, product);
            },
            childCount: items.length,
          ),
        );
      },
    );
  }

  /// Modern Product Card matching Image 1
  Widget _buildProductCard(BuildContext context, Map<String, dynamic> product) {
    final id = product['id']?.toString() ?? '';
    final title = product['title']?.toString() ?? 'Sản phẩm';
    final storeName = product['store_name']?.toString() ?? 'TechZone Store';
    final variants = product['variants'] as List?;
    final priceStr = variants != null && variants.isNotEmpty
        ? variants[0]['price_vnd']?.toString() ?? '100000'
        : '100000';

    final priceInt = int.tryParse(priceStr) ?? 100000;
    final originalPriceInt = (priceInt * 1.25).round();

    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
        : (product['image_url']?.toString() ?? product['thumbnail']?.toString());

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ProductDetailPage(
              productId: id,
              initialProduct: product,
            ),
          ),
        );
      },
      child: Container(
        decoration: AppDecorations.card(radius: 14),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image & Badges
            Expanded(
              flex: 5,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: const Color(0xFFF9FAFB),
                    child: (imageUrl != null && imageUrl.isNotEmpty && imageUrl.startsWith('http'))
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => const Center(
                              child: Icon(
                                Icons.shopping_bag_outlined,
                                size: 42,
                                color: Color(0xFFCBD5E1),
                              ),
                            ),
                          )
                        : const Center(
                            child: Icon(
                              Icons.shopping_bag_outlined,
                              size: 42,
                              color: Color(0xFFCBD5E1),
                            ),
                          ),
                  ),
                  // Discount Badge Top-Left
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                      decoration: AppDecorations.discountTag,
                      child: const Text(
                        '-25%',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  // Favorite Heart Button Top-Right
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Consumer(
                      builder: (context, ref, _) {
                        final isFav = ref.watch(favoritesProvider).any((f) => f.id == id);
                        return GestureDetector(
                          onTap: () {
                            ref.read(favoritesProvider.notifier).toggleFavorite(product);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  isFav
                                      ? 'Đã xóa khỏi danh sách yêu thích.'
                                      : 'Đã thêm vào danh sách yêu thích!',
                                ),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                          child: Container(
                            width: 28,
                            height: 28,
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
                                size: 15,
                                color: isFav ? const Color(0xFFC2410C) : AppColors.textSecondary,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),

            // Product Details
            Expanded(
              flex: 6,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Store Link
                        Row(
                          children: [
                            const Icon(
                              Icons.storefront_outlined,
                              size: 11,
                              color: AppColors.textMuted,
                            ),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                '$storeName ›',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        // Title
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),

                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Price Row
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              '$priceStr ₫',
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 13.5,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '$originalPriceInt ₫',
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 10,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        // Rating & Sold Row
                        const Row(
                          children: [
                            Icon(Icons.star_rounded, color: AppColors.star, size: 13),
                            SizedBox(width: 2),
                            Text(
                              '4.8',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(width: 4),
                            Text(
                              '• Đã bán 1.2k',
                              style: TextStyle(
                                fontSize: 10,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Section "Đã xem gần đây" matching Image 1
  Widget _buildRecentlyViewedSection(AsyncValue<Map<String, dynamic>> productsAsync) {
    final recentItems = [
      {'title': 'Tai nghe Sony ANC', 'price': '6.490.000'},
      {'title': 'Bàn phím DareU EK87', 'price': '450.000'},
      {'title': 'Chuột Logitech Master 3S', 'price': '1.990.000'},
      {'title': 'Củ sạc GaN 65W', 'price': '690.000'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Đã xem gần đây',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 130,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: recentItems.length,
            separatorBuilder: (_, index) => const SizedBox(width: 10),
            itemBuilder: (context, idx) {
              final prod = recentItems[idx];
              final title = prod['title']!;
              final price = prod['price']!;

              return InkWell(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Đang mở sản phẩm "$title"...'),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 95,
                  decoration: AppDecorations.card(radius: 10),
                  padding: const EdgeInsets.all(6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 65,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.shopping_bag_outlined,
                            size: 24,
                            color: Colors.grey,
                          ),
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$price ₫',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

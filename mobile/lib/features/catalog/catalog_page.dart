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
  final TextEditingController _minPriceController = TextEditingController();
  final TextEditingController _maxPriceController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  bool _isSearchHovered = false;
  String _searchQuery = '';
  String? _selectedCategory;
  String _sort = 'title';
  int _page = 1;
  bool _forceSearchMode = false;
  bool _isListView = false;
  int? _minPrice;
  int? _maxPrice;

  @override
  void initState() {
    super.initState();
    _searchQuery = widget.initialSearch ?? '';
    _searchController = TextEditingController(text: _searchQuery);
    _scrollController = ScrollController();
    _searchFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
  }

  String get _catalogKey => jsonEncode({
        'q': _searchQuery,
        'category_id': _selectedCategory,
        'sort': _sort,
        'page': _page,
      });

  @override
  void dispose() {
    _searchFocusNode.dispose();
    _searchController.dispose();
    _scrollController.dispose();
    _minPriceController.dispose();
    _maxPriceController.dispose();
    super.dispose();
  }

  void _onSearch(String val) {
    setState(() {
      _searchQuery = val.trim();
      _forceSearchMode = _searchQuery.isNotEmpty;
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
        _forceSearchMode = false;
      } else {
        _selectedCategory = categoryId;
        _forceSearchMode = true;
      }
      _page = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(catalogProductsProvider(_catalogKey));
    final categoriesAsync = ref.watch(categoriesProvider);
    final cartCount = ref.watch(cartBadgeCountProvider);
    final isSearchMode = _searchQuery.isNotEmpty ||
        _selectedCategory != null ||
        _forceSearchMode ||
        _minPrice != null ||
        _maxPrice != null;


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
          slivers: isSearchMode
              ? [
                  // Top Bar & Navbar & Search Bar
                  SliverToBoxAdapter(
                    child: _buildWebTopSection(context, cartCount),
                  ),

                  // Dedicated Search & Category View Header (Breadcrumb, Title, Counter, Toolbar, Active Tags)
                  SliverToBoxAdapter(
                    child: _buildDedicatedSearchHeader(context, productsAsync, categoriesAsync),
                  ),

                  // Dedicated Products Sliver (Grid 2-column or List view matching Web Screenshot)
                  _buildDedicatedProductsSliver(productsAsync, categoriesAsync),

                  const SliverToBoxAdapter(
                    child: SizedBox(height: 32),
                  ),
                ]
              : [
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
                      AppNoticeDialog.show(
                        context,
                        message: 'Chương trình Bán hàng cùng PBL6 đang mở đăng ký!',
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
              // Notification Icon
              Tooltip(
                message: 'Thông báo',
                child: InkWell(
                  onTap: () {
                    AppNoticeDialog.show(
                      context,
                      message: 'Không có thông báo mới.',
                      buttonText: 'Đã hiểu',
                    );
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(
                    padding: EdgeInsets.all(6),
                    child: Icon(
                      Icons.notifications_outlined,
                      size: 24,
                      color: Color(0xFF374151),
                    ),
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
          child: MouseRegion(
            onEnter: (_) => setState(() => _isSearchHovered = true),
            onExit: (_) => setState(() => _isSearchHovered = false),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: (_searchFocusNode.hasFocus || _isSearchHovered)
                      ? AppColors.primary
                      : const Color(0xFFD1D5DB),
                  width: (_searchFocusNode.hasFocus || _isSearchHovered) ? 1.5 : 1.2,
                ),
                boxShadow: _searchFocusNode.hasFocus
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          blurRadius: 6,
                          offset: const Offset(0, 1),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: Icon(
                      Icons.search,
                      color: (_searchFocusNode.hasFocus || _isSearchHovered)
                          ? AppColors.primary
                          : const Color(0xFF9CA3AF),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      focusNode: _searchFocusNode,
                      controller: _searchController,
                      onSubmitted: _onSearch,
                      decoration: const InputDecoration(
                        hintText: 'Bạn đang tìm sản phẩm gì?',
                        hintStyle: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 13.5,
                        ),
                        filled: false,
                        fillColor: Colors.transparent,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        disabledBorder: InputBorder.none,
                        errorBorder: InputBorder.none,
                        focusedErrorBorder: InputBorder.none,
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
                  AppNoticeDialog.show(
                    context,
                    message: 'Tính năng đăng ký bán hàng cùng PBL6 đang hoạt động!',
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
                    top: 2,
                    right: 2,
                    child: Consumer(
                      builder: (context, ref, _) {
                        final isFav = ref.watch(favoritesProvider).any((f) => f.id == id);
                        return GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () {
                            ref.read(favoritesProvider.notifier).toggleFavorite(product);
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
                              decoration: BoxDecoration(
                                color: isFav ? const Color(0xFFFEF2F2) : Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: const [
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
          height: 132,
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
                  AppNoticeDialog.show(
                    context,
                    message: 'Đang mở sản phẩm "$title"...',
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
                        height: 56,
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

  String _formatPrice(int price) {
    final s = price.toString();
    final buffer = StringBuffer();
    int count = 0;
    for (int i = s.length - 1; i >= 0; i--) {
      buffer.write(s[i]);
      count++;
      if (count % 3 == 0 && i > 0) buffer.write('.');
    }
    return '${buffer.toString().split('').reversed.join('')} ₫';
  }

  String _formatShortPrice(int price) {
    if (price >= 1000000) {
      final m = (price / 1000000).toStringAsFixed(1).replaceAll('.0', '');
      return '${m}tr';
    }
    if (price >= 1000) {
      return '${(price / 1000).round()}k';
    }
    return '$price';
  }

  String _getCategoryName(
    String? categoryId,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    if (categoryId == null) return '';
    final list = categoriesAsync.asData?.value ?? [];
    for (final c in list) {
      if (c['id']?.toString() == categoryId) {
        return c['name']?.toString() ?? 'Danh mục';
      }
    }
    if (categoryId == '3aeb8256-3d88-46be-8321-89bb43aaf300') return 'Thời trang';
    if (categoryId == 'cd314f70-d4f7-4b34-bb05-33df23027833') return 'Góc làm việc';
    if (categoryId == '33e0b2c4-c52c-4839-9796-41d6214e3bcd') return 'Nhà cửa & đời sống';
    return 'Túi & phụ kiện';
  }

  Future<void> _quickAddToCart(Map<String, dynamic> product) async {
    final variants = (product['variants'] as List?) ?? [];
    final variantId = variants.isNotEmpty
        ? (variants.first as Map)['id']?.toString() ?? ''
        : '';
    final productId = product['id']?.toString() ?? '';

    if (variantId.isEmpty || productId.isEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductDetailPage(productId: productId, initialProduct: product),
        ),
      );
      return;
    }

    try {
      final client = ref.read(apiProvider);
      await client.addToCart(variantId: variantId, productId: productId, quantity: 1);
      ref.invalidate(cartItemsProvider);
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: 'Đã thêm "${product['title']}" vào giỏ hàng!',
        );
      }
    } catch (e) {
      if (mounted) {
        AppNoticeDialog.show(
          context,
          message: errorMessage(e),
        );
      }
    }
  }

  /// Dedicated Header for Search & Category Results View (matching Web Screenshot)
  Widget _buildDedicatedSearchHeader(
    BuildContext context,
    AsyncValue<Map<String, dynamic>> productsAsync,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    final rawItems = productsAsync.asData?.value['items'] as List?;
    final items = (rawItems ?? []).where((p) {
      if (_minPrice == null && _maxPrice == null) return true;
      final variants = (p['variants'] as List?) ?? [];
      int pPrice = 0;
      if (variants.isNotEmpty) {
        final v = variants.first as Map;
        final pv = v['price_vnd'];
        if (pv is num) pPrice = pv.toInt();
        if (pv is String) pPrice = int.tryParse(pv) ?? 0;
      }
      if (_minPrice != null && pPrice < _minPrice!) return false;
      if (_maxPrice != null && pPrice > _maxPrice!) return false;
      return true;
    }).toList();

    final totalCount = items.length;
    final currentTitle = _selectedCategory != null
        ? _getCategoryName(_selectedCategory, categoriesAsync)
        : (_searchQuery.isNotEmpty ? _searchQuery : 'Tất cả sản phẩm');

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Breadcrumb: Trang chủ / <Category or Query>
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                InkWell(
                  onTap: () {
                    setState(() {
                      _searchController.clear();
                      _searchQuery = '';
                      _selectedCategory = null;
                      _forceSearchMode = false;
                      _minPrice = null;
                      _maxPrice = null;
                      _minPriceController.clear();
                      _maxPriceController.clear();
                      _page = 1;
                    });
                  },
                  child: const Text(
                    'Trang chủ',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF6B7280),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const Text(
                  '  /  ',
                  style: TextStyle(fontSize: 12.5, color: Color(0xFF9CA3AF)),
                ),
                Expanded(
                  child: Text(
                    currentTitle,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF1F2937),
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

          // 2. Subtitle & Title & Total count Row
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'KHÁM PHÁ CÙNG PBL6',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF6B7280),
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        currentTitle,
                        style: const TextStyle(
                          fontSize: 23,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF111827),
                          letterSpacing: -0.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '$totalCount',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF111827),
                            height: 1.0,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'sản phẩm',
                          style: TextStyle(
                            fontSize: 10.5,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 3. Toolbar Row: Nút Bộ lọc, Sắp xếp dropdown, Toggle Grid/List
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                // Nút Bộ lọc
                InkWell(
                  onTap: () => _openFilterModal(context, categoriesAsync),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6.5),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE5E7EB), width: 1.2),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.tune_rounded, size: 15, color: Color(0xFF374151)),
                        const SizedBox(width: 5),
                        const Text(
                          'Bộ lọc',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF374151),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '$totalCount kết quả',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF4B5563),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const Spacer(),

                // Dropdown Sắp xếp
                Container(
                  height: 33,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE5E7EB), width: 1.2),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _sort,
                      icon: const Icon(Icons.keyboard_arrow_down, size: 15, color: Color(0xFF6B7280)),
                      isDense: true,
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF374151),
                        fontWeight: FontWeight.w500,
                      ),
                      items: const [
                        DropdownMenuItem(value: 'title', child: Text('Tên sản phẩm')),
                        DropdownMenuItem(value: 'price_asc', child: Text('Giá tăng dần')),
                        DropdownMenuItem(value: 'price_desc', child: Text('Giá giảm dần')),
                      ],
                      onChanged: (val) {
                        if (val != null) _onSortChanged(val);
                      },
                    ),
                  ),
                ),

                const SizedBox(width: 8),

                // Toggle Grid/List mode
                Container(
                  height: 33,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE5E7EB), width: 1.2),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: Icon(
                          Icons.grid_view_rounded,
                          size: 15,
                          color: !_isListView ? AppColors.primary : const Color(0xFF9CA3AF),
                        ),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 30),
                        onPressed: () => setState(() => _isListView = false),
                      ),
                      Container(width: 1, height: 16, color: const Color(0xFFE5E7EB)),
                      IconButton(
                        icon: Icon(
                          Icons.view_agenda_outlined,
                          size: 15,
                          color: _isListView ? AppColors.primary : const Color(0xFF9CA3AF),
                        ),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 30),
                        onPressed: () => setState(() => _isListView = true),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 4. Active Filter Chips Row
          if (_selectedCategory != null || _searchQuery.isNotEmpty || _minPrice != null || _maxPrice != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 2, 16, 6),
              child: Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (_selectedCategory != null)
                    _buildActiveTag(
                      label: _getCategoryName(_selectedCategory, categoriesAsync),
                      onRemove: () => _selectCategory(null),
                    ),
                  if (_searchQuery.isNotEmpty)
                    _buildActiveTag(
                      label: '"$_searchQuery"',
                      onRemove: () {
                        _searchController.clear();
                        _onSearch('');
                      },
                    ),
                  if (_minPrice != null || _maxPrice != null)
                    _buildActiveTag(
                      label: '${_formatShortPrice(_minPrice ?? 0)} - ${_formatShortPrice(_maxPrice ?? 10000000)}',
                      onRemove: () {
                        setState(() {
                          _minPrice = null;
                          _maxPrice = null;
                          _minPriceController.clear();
                          _maxPriceController.clear();
                        });
                      },
                    ),
                  // Nút Xóa bộ lọc
                  InkWell(
                    onTap: () {
                      setState(() {
                        _searchController.clear();
                        _searchQuery = '';
                        _selectedCategory = null;
                        _minPrice = null;
                        _maxPrice = null;
                        _minPriceController.clear();
                        _maxPriceController.clear();
                        _forceSearchMode = false;
                        _page = 1;
                      });
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                      child: Text(
                        'Xóa bộ lọc',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Dedicated Products Sliver: Grid or List view
  Widget _buildDedicatedProductsSliver(
    AsyncValue<Map<String, dynamic>> productsAsync,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    return productsAsync.when(
      loading: () => const SliverToBoxAdapter(
        child: SizedBox(
          height: 250,
          child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
        ),
      ),
      error: (err, _) => SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Center(
            child: Text(
              'Lỗi tải sản phẩm: ${errorMessage(err)}',
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ),
      ),
      data: (data) {
        final rawItems = (data['items'] as List?) ?? [];
        final items = rawItems
            .map((e) => Map<String, dynamic>.from(e as Map))
            .where((p) {
              if (_minPrice == null && _maxPrice == null) return true;
              final variants = (p['variants'] as List?) ?? [];
              int pPrice = 0;
              if (variants.isNotEmpty) {
                final v = variants.first as Map;
                final pv = v['price_vnd'];
                if (pv is num) pPrice = pv.toInt();
                if (pv is String) pPrice = int.tryParse(pv) ?? 0;
              }
              if (_minPrice != null && pPrice < _minPrice!) return false;
              if (_maxPrice != null && pPrice > _maxPrice!) return false;
              return true;
            })
            .toList();

        if (items.isEmpty) {
          return SliverToBoxAdapter(
            child: _buildEmptyDedicatedResults(),
          );
        }

        if (_isListView) {
          return SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _buildDedicatedProductListItem(
                  context,
                  items[index],
                  categoriesAsync,
                ),
                childCount: items.length,
              ),
            ),
          );
        }

        return SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.53,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, index) => _buildDedicatedProductGridCard(
                context,
                items[index],
                categoriesAsync,
              ),
              childCount: items.length,
            ),
          ),
        );
      },
    );
  }

  /// Product Card in Grid view matching Web Screenshot
  Widget _buildDedicatedProductGridCard(
    BuildContext context,
    Map<String, dynamic> product,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    final id = product['id']?.toString() ?? '';
    final title = product['title']?.toString() ?? 'Sản phẩm';
    final storeName = product['store_name']?.toString() ?? 'An Nhiên Studio';
    final categoryId = product['category_id']?.toString();
    final categoryName = _getCategoryName(categoryId, categoriesAsync);

    final variants = (product['variants'] as List?) ?? [];
    final priceStr = variants.isNotEmpty
        ? variants[0]['price_vnd']?.toString() ?? '100000'
        : (product['price_vnd']?.toString() ?? '100000');
    final priceInt = int.tryParse(priceStr) ?? 100000;

    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
        : (product['image_url']?.toString() ?? product['thumbnail']?.toString());

    final variantCountText = variants.length > 1
        ? '${variants.length} lựa chọn'
        : 'Phiên bản chuẩn';

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ProductDetailPage(productId: id, initialProduct: product),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Thumbnail Image
            SizedBox(
              height: 155,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: const Color(0xFFF9FAFB),
                    child: imageUrl != null && imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Center(
                              child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 36),
                            ),
                          )
                        : const Center(
                            child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 36),
                          ),
                  ),
                ],
              ),
            ),

            // 2. Details Column
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Category Tag
                        Text(
                          categoryName.isNotEmpty ? categoryName : 'Thời trang',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 3),
                        // Product Title
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1F2937),
                            height: 1.25,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        // Price
                        Text(
                          'Từ ${_formatPrice(priceInt)}',
                          style: const TextStyle(
                            color: Color(0xFFBA3416),
                            fontWeight: FontWeight.bold,
                            fontSize: 14.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        // Variant count
                        Text(
                          variantCountText,
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),

                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Action buttons row: [🛒 Thêm vào giỏ] and [♡]
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                                  minimumSize: const Size(0, 32),
                                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                ),
                                icon: const Icon(Icons.shopping_cart_outlined, size: 13, color: Color(0xFF374151)),
                                label: const Text(
                                  'Thêm vào giỏ',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF374151),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                onPressed: () => _quickAddToCart(product),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Consumer(
                              builder: (context, ref, _) {
                                final isFav = ref.watch(favoritesProvider).any((f) => f.id == id);
                                return GestureDetector(
                                  behavior: HitTestBehavior.opaque,
                                  onTap: () {
                                    ref.read(favoritesProvider.notifier).toggleFavorite(product);
                                    AppNoticeDialog.show(
                                      context,
                                      message: isFav ? 'Đã xóa khỏi yêu thích.' : 'Đã lưu vào yêu thích!',
                                    );
                                  },
                                  child: Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: isFav ? const Color(0xFFFEF2F2) : Colors.white,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: isFav ? const Color(0xFFFECACA) : const Color(0xFFE5E7EB),
                                      ),
                                    ),
                                    child: Center(
                                      child: Icon(
                                        isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                        size: 16,
                                        color: isFav ? const Color(0xFFDC2626) : const Color(0xFF6B7280),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        // Store footer
                        Row(
                          children: [
                            const Icon(Icons.storefront_outlined, size: 12, color: Color(0xFF6B7280)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                storeName,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: Color(0xFF6B7280),
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
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

  /// Product Card in List view
  Widget _buildDedicatedProductListItem(
    BuildContext context,
    Map<String, dynamic> product,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    final id = product['id']?.toString() ?? '';
    final title = product['title']?.toString() ?? 'Sản phẩm';
    final storeName = product['store_name']?.toString() ?? 'An Nhiên Studio';
    final categoryId = product['category_id']?.toString();
    final categoryName = _getCategoryName(categoryId, categoriesAsync);

    final variants = (product['variants'] as List?) ?? [];
    final priceStr = variants.isNotEmpty
        ? variants[0]['price_vnd']?.toString() ?? '100000'
        : (product['price_vnd']?.toString() ?? '100000');
    final priceInt = int.tryParse(priceStr) ?? 100000;

    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
        : (product['image_url']?.toString() ?? product['thumbnail']?.toString());

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ProductDetailPage(productId: id, initialProduct: product),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left Image
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: 90,
                  height: 90,
                  color: const Color(0xFFF9FAFB),
                  child: imageUrl != null && imageUrl.isNotEmpty
                      ? Image.network(imageUrl, fit: BoxFit.cover)
                      : const Center(child: Icon(Icons.shopping_bag_outlined, color: Colors.grey)),
                ),
              ),
              const SizedBox(width: 12),
              // Right Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      categoryName.isNotEmpty ? categoryName : 'Thời trang',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1F2937),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Từ ${_formatPrice(priceInt)}',
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFBA3416),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                            minimumSize: const Size(0, 30),
                            side: const BorderSide(color: Color(0xFFD1D5DB)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          ),
                          icon: const Icon(Icons.shopping_cart_outlined, size: 13, color: Color(0xFF374151)),
                          label: const Text(
                            'Thêm vào giỏ',
                            style: TextStyle(fontSize: 11, color: Color(0xFF374151)),
                          ),
                          onPressed: () => _quickAddToCart(product),
                        ),
                        const SizedBox(width: 8),
                        Consumer(
                          builder: (context, ref, _) {
                            final isFav = ref.watch(favoritesProvider).any((f) => f.id == id);
                            return IconButton(
                              icon: Icon(
                                isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                size: 18,
                                color: isFav ? const Color(0xFFDC2626) : const Color(0xFF6B7280),
                              ),
                              onPressed: () => ref.read(favoritesProvider.notifier).toggleFavorite(product),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Empty state when no products match filters
  Widget _buildEmptyDedicatedResults() {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: Color(0xFFF3F4F6),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.search_off_rounded,
                size: 36,
                color: Color(0xFF9CA3AF),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Không tìm thấy sản phẩm nào',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bớt các bộ lọc đang chọn.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12.5,
                color: Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 18),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFD1D5DB)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                setState(() {
                  _searchController.clear();
                  _searchQuery = '';
                  _selectedCategory = null;
                  _minPrice = null;
                  _maxPrice = null;
                  _minPriceController.clear();
                  _maxPriceController.clear();
                  _forceSearchMode = false;
                  _page = 1;
                });
              },
              child: const Text('Xóa toàn bộ bộ lọc'),
            ),
          ],
        ),
      ),
    );
  }

  /// Active filter chip tag
  Widget _buildActiveTag({
    required String label,
    required VoidCallback onRemove,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFFBF2ED),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFFF3D2C4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(width: 4),
          InkWell(
            onTap: onRemove,
            child: const Icon(Icons.close, size: 14, color: AppColors.primary),
          ),
        ],
      ),
    );
  }

  /// Open filter bottom sheet
  void _openFilterModal(
    BuildContext context,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        String? tempCategory = _selectedCategory;
        final minCtrl = TextEditingController(text: _minPrice != null ? '$_minPrice' : '');
        final maxCtrl = TextEditingController(text: _maxPrice != null ? '$_maxPrice' : '');

        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final categoriesList = categoriesAsync.asData?.value ?? [];

            return Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.85,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Handle
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        margin: const EdgeInsets.only(top: 8, bottom: 4),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),

                    // Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Bộ lọc tìm kiếm',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 20, color: Color(0xFF6B7280)),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1, color: Color(0xFFE5E7EB)),

                    // Body
                    Flexible(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Danh mục Section
                            const Text(
                              'Danh mục',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                _buildCategoryFilterChip(
                                  label: 'Tất cả sản phẩm',
                                  isSelected: tempCategory == null,
                                  onTap: () => setModalState(() => tempCategory = null),
                                ),
                                ...categoriesList.map((c) {
                                  final cId = c['id']?.toString();
                                  final cName = c['name']?.toString() ?? 'Danh mục';
                                  return _buildCategoryFilterChip(
                                    label: cName,
                                    isSelected: tempCategory == cId,
                                    onTap: () => setModalState(() => tempCategory = cId),
                                  );
                                }),
                              ],
                            ),

                            const SizedBox(height: 20),
                            const Divider(height: 1, color: Color(0xFFE5E7EB)),
                            const SizedBox(height: 16),

                            // Khoảng giá Section matching screenshot
                            const Text(
                              'Khoảng giá (₫)',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: minCtrl,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      hintText: 'Giá từ',
                                      hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF9CA3AF)),
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                                      ),
                                    ),
                                  ),
                                ),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 8),
                                  child: Text('-', style: TextStyle(color: Color(0xFF6B7280))),
                                ),
                                Expanded(
                                  child: TextField(
                                    controller: maxCtrl,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      hintText: 'Giá đến',
                                      hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF9CA3AF)),
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 12),
                            // Quick price chips
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                _buildQuickPriceChip('< 200.000 ₫', () {
                                  minCtrl.text = '0';
                                  maxCtrl.text = '200000';
                                }),
                                _buildQuickPriceChip('200k - 500k', () {
                                  minCtrl.text = '200000';
                                  maxCtrl.text = '500000';
                                }),
                                _buildQuickPriceChip('> 500.000 ₫', () {
                                  minCtrl.text = '500000';
                                  maxCtrl.text = '10000000';
                                }),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                    const Divider(height: 1, color: Color(0xFFE5E7EB)),

                    // Footer Buttons
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                side: const BorderSide(color: Color(0xFFD1D5DB)),
                              ),
                              onPressed: () {
                                minCtrl.clear();
                                maxCtrl.clear();
                                setModalState(() => tempCategory = null);
                              },
                              child: const Text(
                                'Thiết lập lại',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF4B5563),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                elevation: 0,
                              ),
                              onPressed: () {
                                Navigator.pop(ctx);
                                setState(() {
                                  _selectedCategory = tempCategory;
                                  _minPrice = int.tryParse(minCtrl.text.trim());
                                  _maxPrice = int.tryParse(maxCtrl.text.trim());
                                  _minPriceController.text = minCtrl.text.trim();
                                  _maxPriceController.text = maxCtrl.text.trim();
                                  _forceSearchMode = true;
                                  _page = 1;
                                });
                              },
                              child: const Text(
                                'Áp dụng',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildCategoryFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFBF2ED) : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.transparent,
            width: 1.2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? AppColors.primary : const Color(0xFF374151),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickPriceChip(String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 11.5, color: Color(0xFF4B5563)),
        ),
      ),
    );
  }

}

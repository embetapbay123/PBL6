import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../chat/chat_ai_modal.dart';
import '../shared/app_bottom_nav.dart';
import 'consent_dialog.dart';
import 'product_detail_page.dart';

class CatalogPage extends ConsumerStatefulWidget {
  const CatalogPage({super.key});

  @override
  ConsumerState<CatalogPage> createState() => _CatalogPageState();
}

class _CatalogPageState extends ConsumerState<CatalogPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String? _selectedCategory;
  int _page = 1;

  String get _catalogKey => jsonEncode({
        'q': _searchQuery,
        'category_id': _selectedCategory,
        'page': _page,
      });

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String val) {
    setState(() {
      _searchQuery = val.trim();
      _page = 1;
    });
  }

  void _selectCategory(String? categoryId) {
    setState(() {
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
    final recommendationsAsync = ref.watch(recommendationProvider);
    const userName = 'Bình';
    const cartCount = 0;

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
              // Explore / Recommendations
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Đang khám phá danh mục và ưu đãi mới nhất!'),
                  duration: Duration(seconds: 1),
                ),
              );
              break;
            case 2:
              ChatAiModal.show(context);
              break;
            case 3:
              Navigator.pushNamed(context, '/cart');
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
          slivers: [
            // Curved Red Gradient Header (Image 1)
            SliverToBoxAdapter(
              child: _buildCurvedHeader(context, userName, cartCount),
            ),

            // AI Shopping Assistant Banner (Image 1)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                child: _buildAiAssistantBanner(context, recommendationsAsync),
              ),
            ),

            // Quick Category Circular Icons (Image 1)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: _buildQuickCategories(categoriesAsync),
              ),
            ),

            // Active Category Filter Indicator (if any)
            if (_selectedCategory != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                  child: Row(
                    children: [
                      Text(
                        'Đang lọc theo danh mục',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      ActionChip(
                        avatar: const Icon(Icons.close, size: 14),
                        label: const Text('Xóa lọc'),
                        onPressed: () => _selectCategory(null),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                ),
              ),

            // Promotional Carousel Banner ("SIÊU SALE 9.9" - Image 1)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: _buildSaleBanner(),
              ),
            ),

            // Section "Dành cho bạn" Header (Image 1)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
                child: Row(
                  children: [
                    const Icon(
                      Icons.local_fire_department_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Dành riêng cho bạn',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
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

  /// Curved Red Gradient Header matching Image 1
  Widget _buildCurvedHeader(BuildContext context, String userName, int cartCount) {
    return Container(
      decoration: const BoxDecoration(
        gradient: AppColors.headerGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Color(0x33BA1B1A),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: User Greeting & Actions
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'PBL6 E-Commerce',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Xin chào, $userName! • Hơn 1.000+ cửa hàng uy tín',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Notification Bell with badge 3
                  _buildHeaderIconButton(
                    icon: Icons.notifications_none_rounded,
                    badgeCount: 3,
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Bạn có 3 thông báo mới về đơn hàng và ưu đãi!'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 8),
                  // Shopping Cart with badge
                  _buildHeaderIconButton(
                    icon: Icons.shopping_cart_outlined,
                    badgeCount: cartCount > 0 ? cartCount : 5,
                    onTap: () => Navigator.pushNamed(context, '/cart'),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Location Pill: "Giao đến: Đà Nẵng • >"
              InkWell(
                onTap: () => Navigator.pushNamed(context, '/addresses'),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(45),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.location_on_outlined,
                        color: Colors.white,
                        size: 14,
                      ),
                      SizedBox(width: 5),
                      Text(
                        'Giao đến: Đà Nẵng • ›',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Search Bar Pill: "Bạn đang tìm sản phẩm gì?"
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(20),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                child: Row(
                  children: [
                    const Icon(
                      Icons.search,
                      color: AppColors.textMuted,
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onSubmitted: _onSearch,
                        decoration: const InputDecoration(
                          hintText: 'Bạn đang tìm sản phẩm gì?',
                          hintStyle: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 13,
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 10),
                          isDense: true,
                          filled: false,
                        ),
                      ),
                    ),
                    if (_searchController.text.isNotEmpty)
                      IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        color: AppColors.textMuted,
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      ),
                    IconButton(
                      icon: const Icon(
                        Icons.mic_none_rounded,
                        color: AppColors.textMuted,
                        size: 20,
                      ),
                      tooltip: 'Tìm bằng giọng nói',
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Tính năng tìm kiếm bằng giọng nói đang phát triển!'),
                          ),
                        );
                      },
                    ),
                    IconButton(
                      icon: const Icon(
                        Icons.tune_rounded,
                        color: AppColors.primary,
                        size: 20,
                      ),
                      tooltip: 'Tùy chỉnh AI & Bộ lọc',
                      onPressed: () => showDialog(
                        context: context,
                        builder: (_) => const ConsentDialog(),
                      ),
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

  Widget _buildHeaderIconButton({
    required IconData icon,
    required int badgeCount,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.white.withAlpha(45),
          shape: BoxShape.circle,
        ),
        child: Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            Icon(icon, color: Colors.white, size: 20),
            if (badgeCount > 0)
              Positioned(
                top: 3,
                right: 3,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                  child: Center(
                    child: Text(
                      badgeCount > 99 ? '99+' : '$badgeCount',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 8.5,
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
    );
  }

  /// AI Shopping Assistant Banner matching Image 1
  Widget _buildAiAssistantBanner(
    BuildContext context,
    AsyncValue<Map<String, dynamic>> recommendationsAsync,
  ) {
    final rec = recommendationsAsync.asData?.value;
    final source = rec?['source']?.toString() ?? 'BASELINE';
    final isMock = rec?['mode'] == 'mock' || source == 'BASELINE';
    final badgeLabel = isMock ? 'Gợi ý Baseline / Mock' : 'AI Cá nhân hóa';

    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.lightPinkGradient,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFD4D4), width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withAlpha(12),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => ChatAiModal.show(context),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Robot / Sparkle Icon
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    gradient: AppColors.redGradient,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withAlpha(70),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.auto_awesome,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Title and Subtitle
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Trợ lý mua sắm AI',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isMock ? Colors.grey.shade200 : AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              badgeLabel,
                              style: TextStyle(
                                color: isMock ? Colors.black87 : AppColors.primaryDark,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      const Text(
                        'Mô tả nhu cầu để nhận gợi ý phù hợp nhất từ AI',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // "Trò chuyện ngay >" Button
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withAlpha(60),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Trò chuyện ngay',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(width: 2),
                      Icon(
                        Icons.chevron_right_rounded,
                        color: Colors.white,
                        size: 14,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Quick Category Circular Icons matching Image 1
  Widget _buildQuickCategories(AsyncValue<List<Map<String, dynamic>>> categoriesAsync) {
    final backendCategories = categoriesAsync.asData?.value ?? [];

    final List<Map<String, dynamic>> categoryList;
    if (backendCategories.isNotEmpty) {
      categoryList = backendCategories.map((c) {
        final name = c['name']?.toString() ?? 'Danh mục';
        final id = c['id']?.toString();
        IconData icon = Icons.category_rounded;
        Color bg = const Color(0xFFEEF2FF);
        Color color = const Color(0xFF4338CA);

        final lower = name.toLowerCase();
        if (lower.contains('thoại') || lower.contains('phone')) {
          icon = Icons.phone_android_rounded;
          bg = const Color(0xFFEEF2FF);
          color = const Color(0xFF4338CA);
        } else if (lower.contains('trang') || lower.contains('fashion')) {
          icon = Icons.checkroom_rounded;
          bg = const Color(0xFFFFF7ED);
          color = const Color(0xFFC2410C);
        } else if (lower.contains('tử') || lower.contains('tech') || lower.contains('laptop')) {
          icon = Icons.devices_rounded;
          bg = const Color(0xFFEFF6FF);
          color = const Color(0xFF2563EB);
        } else if (lower.contains('phẩm') || lower.contains('beauty')) {
          icon = Icons.face_retouching_natural_rounded;
          bg = const Color(0xFFFDF2F8);
          color = const Color(0xFFBE185D);
        } else if (lower.contains('dụng') || lower.contains('home')) {
          icon = Icons.kitchen_rounded;
          bg = const Color(0xFFF0FDF4);
          color = const Color(0xFF15803D);
        }

        return {
          'id': id,
          'title': name,
          'icon': icon,
          'bg': bg,
          'color': color,
        };
      }).toList();
    } else {
      categoryList = [
        {
          'id': null,
          'title': 'Điện thoại',
          'icon': Icons.phone_android_rounded,
          'bg': const Color(0xFFEEF2FF),
          'color': const Color(0xFF4338CA),
        },
        {
          'id': null,
          'title': 'Thời trang',
          'icon': Icons.checkroom_rounded,
          'bg': const Color(0xFFFFF7ED),
          'color': const Color(0xFFC2410C),
        },
        {
          'id': null,
          'title': 'Mỹ phẩm',
          'icon': Icons.face_retouching_natural_rounded,
          'bg': const Color(0xFFFDF2F8),
          'color': const Color(0xFFBE185D),
        },
        {
          'id': null,
          'title': 'Gia dụng',
          'icon': Icons.kitchen_rounded,
          'bg': const Color(0xFFF0FDF4),
          'color': const Color(0xFF15803D),
        },
        {
          'id': null,
          'title': 'Xem thêm',
          'icon': Icons.grid_view_rounded,
          'bg': const Color(0xFFF8FAFC),
          'color': const Color(0xFF475569),
        },
      ];
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: categoryList.map((item) {
          final title = item['title'] as String;
          final icon = item['icon'] as IconData;
          final bg = item['bg'] as Color;
          final color = item['color'] as Color;
          final catId = item['id'] as String?;
          final isSelected = catId != null && _selectedCategory == catId;

          return Padding(
            padding: const EdgeInsets.only(right: 14),
            child: InkWell(
              onTap: () {
                if (title == 'Xem thêm') {
                  _showAllCategoriesSheet(context, backendCategories);
                } else if (catId != null) {
                  _selectCategory(catId);
                } else {
                  _onSearch(title);
                }
              },
              borderRadius: BorderRadius.circular(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : bg,
                      shape: BoxShape.circle,
                      border: isSelected
                          ? Border.all(color: Colors.white, width: 2)
                          : null,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(8),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Icon(
                        icon,
                        color: isSelected ? Colors.white : color,
                        size: 24,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected ? AppColors.primary : AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  void _showAllCategoriesSheet(BuildContext context, List<Map<String, dynamic>> categories) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tất cả danh mục sản phẩm',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Tất cả'),
                      selected: _selectedCategory == null,
                      onSelected: (_) {
                        _selectCategory(null);
                        Navigator.pop(ctx);
                      },
                    ),
                    ...categories.map((c) {
                      final name = c['name']?.toString() ?? 'Danh mục';
                      final id = c['id']?.toString();
                      final isSelected = _selectedCategory == id;
                      return ChoiceChip(
                        label: Text(name),
                        selected: isSelected,
                        selectedColor: AppColors.primaryLight,
                        onSelected: (_) {
                          _selectCategory(id);
                          Navigator.pop(ctx);
                        },
                      );
                    }),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Promotional Banner Carousel matching Image 1
  Widget _buildSaleBanner() {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: AppColors.saleBannerGradient,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withAlpha(50),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SIÊU SALE 9.9',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Giảm đến 50% • Đồ điện tử chính hãng',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: const [
                          BoxShadow(color: Colors.black12, blurRadius: 4),
                        ],
                      ),
                      child: const Text(
                        'Mua ngay',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.local_offer_rounded,
                color: Colors.white70,
                size: 54,
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        // Dots indicator matching mockup
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 16,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(width: 4),
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ],
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
                    child: const Center(
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
                      child: const Center(
                        child: Icon(
                          Icons.favorite_border_rounded,
                          size: 15,
                          color: AppColors.textSecondary,
                        ),
                      ),
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

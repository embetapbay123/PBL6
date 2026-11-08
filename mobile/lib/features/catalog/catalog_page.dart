import 'recently_viewed_provider.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../core/product_utils.dart';
import '../../main.dart';
import '../chat/chat_ai_modal.dart';
import '../customer/favorites_page.dart';
import '../cart/cart_variant_modal.dart';
import '../shared/app_bottom_nav.dart';
import '../banner/hero_banner_carousel.dart';
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
  bool _isSearchSuggesting = false;
  final List<String> _searchHistory = [];
  final List<String> _recentlyInteractedProductIds = [];
  String _searchQuery = '';
  String? _selectedCategory;
  String _sort = 'best_selling';
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
      if (_searchFocusNode.hasFocus && !_isSearchSuggesting) {
        setState(() {
          _isSearchSuggesting = true;
        });
      } else if (mounted) {
        setState(() {});
      }
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
    final trimmed = val.trim();
    if (trimmed.isNotEmpty) {
      _searchHistory.remove(trimmed);
      _searchHistory.insert(0, trimmed);
    }
    _searchFocusNode.unfocus();
    setState(() {
      _searchQuery = trimmed;
      _forceSearchMode = _searchQuery.isNotEmpty;
      _isSearchSuggesting = false;
      _sort = 'best_selling';
      _page = 1;
    });
  }

  void _onSortChanged(String sort) {
    setState(() {
      _sort = sort;
      _page = 1;
    });
  }

  String _getSortLabel(String sort) {
    switch (sort) {
      case 'best_selling':
        return 'Bán chạy';
      case 'newest':
        return 'Mới nhất';
      case 'price_asc':
        return 'Giá tăng dần';
      case 'price_desc':
        return 'Giá giảm dần';
      default:
        return 'Bán chạy';
    }
  }

  PopupMenuItem<String> _buildSortMenuItem(String value, String label) {
    final isSelected = _sort == value;
    return PopupMenuItem<String>(
      value: value,
      height: 36,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE5E7EB) : Colors.transparent,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            color: isSelected ? const Color(0xFF111827) : const Color(0xFF374151),
          ),
        ),
      ),
    );
  }

  int _getProductMonthlySales(Map<String, dynamic> product) {
    final v = product['monthly_sales'] ??
        product['sales_monthly'] ??
        product['sold_count'] ??
        product['sales'] ??
        product['sold'];
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
  }

  String _formatSalesCount(int sales) {
    if (sales >= 1000) {
      final k = (sales / 1000).toStringAsFixed(1);
      return k.endsWith('.0') ? '${k.substring(0, k.length - 2)}k' : '${k}k';
    }
    return '$sales';
  }

  DateTime _getProductCreatedAt(Map<String, dynamic> product) {
    final v = product['created_at'] ??
        product['publish_date'] ??
        product['published_at'] ??
        product['posted_at'] ??
        product['date'];
    if (v is DateTime) return v;
    if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
    if (v != null) {
      final parsed = DateTime.tryParse(v.toString());
      if (parsed != null) return parsed;
    }
    final key = product['id']?.toString() ?? product['title']?.toString() ?? '';
    final daysAgo = key.hashCode.abs() % 90;
    return DateTime.now().subtract(Duration(days: daysAgo));
  }

  int _getProductMinPrice(Map<String, dynamic> product) {
    final variants = (product['variants'] as List?) ?? [];
    if (variants.isNotEmpty) {
      int min = 1 << 30;
      for (final v in variants) {
        if (v is Map) {
          final p = v['price_vnd'];
          if (p is num && p.toInt() < min) min = p.toInt();
          if (p is String) {
            final parsed = int.tryParse(p);
            if (parsed != null && parsed < min) min = parsed;
          }
        }
      }
      if (min != 1 << 30) return min;
    }
    final pv = product['price_vnd'] ?? product['price'];
    if (pv is num) return pv.toInt();
    if (pv is String) return int.tryParse(pv) ?? 0;
    return 0;
  }

  List<Map<String, dynamic>> _applySort(List<Map<String, dynamic>> items) {
    final list = List<Map<String, dynamic>>.from(items);
    switch (_sort) {
      case 'best_selling':
        list.sort((a, b) {
          final aSales = _getProductMonthlySales(a);
          final bSales = _getProductMonthlySales(b);
          final cmp = bSales.compareTo(aSales); // highest monthly sales first
          if (cmp != 0) return cmp;
          return (a['title']?.toString() ?? '').compareTo(b['title']?.toString() ?? '');
        });
        break;
      case 'newest':
        list.sort((a, b) {
          final aDate = _getProductCreatedAt(a);
          final bDate = _getProductCreatedAt(b);
          final cmp = bDate.compareTo(aDate); // latest created_at first
          if (cmp != 0) return cmp;
          return (a['title']?.toString() ?? '').compareTo(b['title']?.toString() ?? '');
        });
        break;
      case 'title':
        list.sort((a, b) {
          return (a['title']?.toString() ?? '').compareTo(b['title']?.toString() ?? '');
        });
        break;
      case 'price_asc':
        list.sort((a, b) {
          final aPrice = _getProductMinPrice(a);
          final bPrice = _getProductMinPrice(b);
          return aPrice.compareTo(bPrice);
        });
        break;
      case 'price_desc':
        list.sort((a, b) {
          final aPrice = _getProductMinPrice(a);
          final bPrice = _getProductMinPrice(b);
          return bPrice.compareTo(aPrice);
        });
        break;
    }
    return list;
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

  void _resetToExplore() {
    _searchFocusNode.unfocus();
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _selectedCategory = null;
      _forceSearchMode = false;
      _isSearchSuggesting = false;
      _minPrice = null;
      _maxPrice = null;
      _minPriceController.clear();
      _maxPriceController.clear();
      _sort = 'best_selling';
      _page = 1;
    });
    if (Navigator.canPop(context)) {
      Navigator.popUntil(context, (route) => route.isFirst);
    }
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(catalogProductsProvider(_catalogKey));
    final categoriesAsync = ref.watch(categoriesProvider);
    final cartCount = ref.watch(cartBadgeCountProvider);
    final cartAsync = ref.watch(cartItemsProvider);
    final isSearchMode = _searchQuery.isNotEmpty ||
        _selectedCategory != null ||
        _forceSearchMode ||
        _minPrice != null ||
        _maxPrice != null;

    if (_isSearchSuggesting) {
      return _buildSearchSuggestionScreen(context, productsAsync, cartAsync);
    }


    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: AppBottomNav(
        currentIndex: 0,
        cartCount: cartCount,
        onTap: (index) {
          switch (index) {
            case 0:
              _resetToExplore();
              break;
            case 1:
              Navigator.pushNamed(context, '/cart');
              break;
            case 2:
              ChatAiModal.show(context);
              break;
            case 3:
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
                    child: _buildWebTopSection(context, cartCount, isSearchMode: true),
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
                    child: _buildWebTopSection(context, cartCount, isSearchMode: false),
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
                            'Đang xem danh mục: ${_getCategoryName(_selectedCategory, categoriesAsync)}',
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
                      ),
                  ],
                ),
              ),
            ),

            // Sort Filter Chips (Bán chạy, Mới nhất, Giá tăng dần, Giá giảm dần - No Icons, No Tên sản phẩm)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildSortChip(
                        label: 'Bán chạy',
                        selected: _sort == 'best_selling',
                        onTap: () => _onSortChanged('best_selling'),
                      ),
                      const SizedBox(width: 8),
                      _buildSortChip(
                        label: 'Mới nhất',
                        selected: _sort == 'newest',
                        onTap: () => _onSortChanged('newest'),
                      ),
                      const SizedBox(width: 8),
                      _buildSortChip(
                        label: 'Giá tăng dần',
                        selected: _sort == 'price_asc',
                        onTap: () => _onSortChanged('price_asc'),
                      ),
                      const SizedBox(width: 8),
                      _buildSortChip(
                        label: 'Giá giảm dần',
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
  Widget _buildWebTopSection(BuildContext context, int cartCount, {bool isSearchMode = false}) {
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
                  Expanded(
                    child: InkWell(
                      onTap: _resetToExplore,
                      child: const Text(
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
          color: AppColors.primary,
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              // Clickable PBL6 Market logo & brand title -> route to Explore page
              InkWell(
                onTap: _resetToExplore,
                borderRadius: BorderRadius.circular(8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
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
                  ],
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

            ],
          ),
          ),
        ),

        // Divider
        Container(
          color: Colors.white,
          child: const Divider(height: 1, thickness: 1, color: Color(0xFFE5E7EB)),
        ),

        // 3. Search Bar Section
        Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
          ),
          padding: EdgeInsets.fromLTRB(isSearchMode ? 6 : 16, 12, 16, 14),
          child: Row(
            children: [
              if (isSearchMode)
                Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: IconButton(
                    icon: const Icon(
                      Icons.arrow_back,
                      color: Color(0xFF1F2937),
                      size: 24,
                    ),
                    tooltip: 'Quay lại',
                    onPressed: _resetToExplore,
                  ),
                ),
              Expanded(
                child: MouseRegion(
                  onEnter: (_) => setState(() => _isSearchHovered = true),
                  onExit: (_) => setState(() => _isSearchHovered = false),
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _isSearchSuggesting = true);
                      _searchFocusNode.requestFocus();
                    },
                    child: Container(
                height: 40,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: (_searchFocusNode.hasFocus || _isSearchHovered)
                        ? const Color(0xFFEE4D2D)
                        : const Color(0xFFD1D5DB),
                    width: (_searchFocusNode.hasFocus || _isSearchHovered) ? 1.5 : 1.2,
                  ),
                  boxShadow: _searchFocusNode.hasFocus
                      ? [
                          BoxShadow(
                            color: const Color(0xFFEE4D2D).withValues(alpha: 0.08),
                            blurRadius: 6,
                            offset: const Offset(0, 1),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 12),
                      child: Center(
                        child: Icon(
                          Icons.search,
                          color: (_searchFocusNode.hasFocus || _isSearchHovered)
                              ? const Color(0xFFEE4D2D)
                              : const Color(0xFF9CA3AF),
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Center(
                        child: TextField(
                          focusNode: _searchFocusNode,
                          controller: _searchController,
                          onTap: () {
                            setState(() => _isSearchSuggesting = true);
                          },
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
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                    ),
                    if (_searchController.text.isNotEmpty)
                      Center(
                        child: IconButton(
                          icon: const Icon(Icons.clear, size: 16, color: Color(0xFF9CA3AF)),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: () {
                            _searchController.clear();
                            _onSearch('');
                          },
                        ),
                      ),
                    Material(
                      color: const Color(0xFFEE4D2D),
                      child: InkWell(
                        onTap: () => _onSearch(_searchController.text),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: Center(
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
                    ),
                  ],
                ),
              ),
          ),
          ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Screen displayed when user taps/clicks the search bar (Image 2)
  Widget _buildSearchSuggestionScreen(
    BuildContext context,
    AsyncValue<Map<String, dynamic>> productsAsync,
    AsyncValue<Map<String, dynamic>> cartAsync,
  ) {
    final allProducts = <Map<String, dynamic>>[];
    final pData = productsAsync.value;
    if (pData != null && pData['items'] is List) {
      for (final item in (pData['items'] as List)) {
        if (item is Map<String, dynamic> && !isProductOutOfStock(item)) {
          allProducts.add(item);
        }
      }
    }
    if (allProducts.isEmpty) {
      final fallback = buildFallbackProducts()['items'] as List;
      for (final item in fallback) {
        if (item is Map<String, dynamic> && !isProductOutOfStock(item)) {
          allProducts.add(item);
        }
      }
    }

    final cartItems = (cartAsync.value?['items'] as List?) ?? [];
    final suggestedProducts = _getSuggestedProducts(allProducts, cartItems);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _searchFocusNode.unfocus();
        setState(() {
          _isSearchSuggesting = false;
        });
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Bar: < Back arrow + Search Bar matching Image 2
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(
                        Icons.arrow_back,
                        color: Color(0xFFEE4D2D),
                        size: 24,
                      ),
                      onPressed: () {
                        _searchFocusNode.unfocus();
                        setState(() {
                          _isSearchSuggesting = false;
                        });
                      },
                    ),
                    Expanded(
                      child: Container(
                        height: 40,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: const Color(0xFFEE4D2D),
                            width: 1.5,
                          ),
                        ),
                        padding: const EdgeInsets.only(left: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Center(
                              child: Icon(
                                Icons.camera_alt_outlined,
                                size: 20,
                                color: Color(0xFF888888),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Center(
                                child: TextField(
                                  focusNode: _searchFocusNode,
                                  controller: _searchController,
                                  autofocus: true,
                                  textInputAction: TextInputAction.search,
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
                                    contentPadding: EdgeInsets.zero,
                                  ),
                                ),
                              ),
                            ),
                            if (_searchController.text.isNotEmpty)
                              Center(
                                child: IconButton(
                                  icon: const Icon(Icons.clear, size: 16, color: Color(0xFF9CA3AF)),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {});
                                  },
                                ),
                              ),
                            Material(
                              color: const Color(0xFFEE4D2D),
                              child: InkWell(
                                onTap: () => _onSearch(_searchController.text),
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 14),
                                  child: Center(
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.search,
                                          size: 16,
                                          color: Colors.white,
                                        ),
                                        SizedBox(width: 4),
                                        Text(
                                          'Tìm kiếm',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12.5,
                                          ),
                                        ),
                                      ],
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
                ),
              ),

              // Search History / Tags + Gợi ý tìm kiếm + Grid of products
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _buildSearchTagsSection(allProducts),
                    const SizedBox(height: 12),
                    const Text(
                      'Gợi ý tìm kiếm',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildSuggestedProductsGrid(context, suggestedProducts),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchTagsSection(List<Map<String, dynamic>> products) {
    final tags = products
        .map((p) => (p['title'] ?? p['name'])?.toString().trim() ?? '')
        .where((name) => name.isNotEmpty)
        .toSet()
        .take(10)
        .toList();

    if (tags.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: tags.map((tag) {
          return InkWell(
            onTap: () {
              _searchController.text = tag;
              _onSearch(tag);
            },
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                tag,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFF374151),
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  List<Map<String, dynamic>> _getSuggestedProducts(
    List<Map<String, dynamic>> allProducts,
    List<dynamic> cartItems,
  ) {
    final bool hasSearchHistory = _searchHistory.isNotEmpty;
    final bool hasCartItems = cartItems.isNotEmpty;
    final bool hasRecentInteractions = _recentlyInteractedProductIds.isNotEmpty;

    // Nếu người dùng là mới (chưa từng thêm giỏ hay tìm kiếm) -> hiện các sản phẩm bán chạy
    if (!hasSearchHistory && !hasCartItems && !hasRecentInteractions) {
      final sorted = List<Map<String, dynamic>>.from(allProducts);
      sorted.sort((a, b) => _getProductMonthlySales(b).compareTo(_getProductMonthlySales(a)));
      return sorted.take(10).toList();
    }

    // Người dùng đã có tương tác: tìm các sản phẩm theo lịch sử tìm kiếm, thêm giỏ, hoặc tương tác gần đây
    final List<Map<String, dynamic>> results = [];
    final Set<String> addedIds = {};

    // 1. Sản phẩm trong giỏ hàng gần đây
    for (final item in cartItems) {
      final pId = (item['product_id'] ?? item['id'])?.toString();
      if (pId != null && !addedIds.contains(pId)) {
        final match = allProducts.firstWhere(
          (p) => p['id']?.toString() == pId,
          orElse: () => <String, dynamic>{},
        );
        if (match.isNotEmpty) {
          results.add(match);
          addedIds.add(pId);
        }
      }
    }

    // 2. Sản phẩm người dùng vừa tương tác gần đây
    for (final pId in _recentlyInteractedProductIds) {
      if (!addedIds.contains(pId)) {
        final match = allProducts.firstWhere(
          (p) => p['id']?.toString() == pId,
          orElse: () => <String, dynamic>{},
        );
        if (match.isNotEmpty) {
          results.add(match);
          addedIds.add(pId);
        }
      }
    }

    // 3. Sản phẩm liên quan đến từ khóa tìm kiếm gần đây
    for (final query in _searchHistory) {
      final qLower = query.toLowerCase();
      for (final prod in allProducts) {
        final pId = prod['id']?.toString() ?? '';
        if (!addedIds.contains(pId)) {
          final title = (prod['title'] ?? '').toString().toLowerCase();
          final desc = (prod['description'] ?? '').toString().toLowerCase();
          final store = (prod['store_name'] ?? '').toString().toLowerCase();
          if (title.contains(qLower) || desc.contains(qLower) || store.contains(qLower)) {
            results.add(prod);
            addedIds.add(pId);
          }
        }
      }
    }

    // Nếu số lượng ít hơn 6, bổ sung sản phẩm bán chạy nhất
    if (results.length < 6) {
      final sorted = List<Map<String, dynamic>>.from(allProducts);
      sorted.sort((a, b) => _getProductMonthlySales(b).compareTo(_getProductMonthlySales(a)));
      for (final p in sorted) {
        final pId = p['id']?.toString() ?? '';
        if (!addedIds.contains(pId)) {
          results.add(p);
          addedIds.add(pId);
          if (results.length >= 10) break;
        }
      }
    }

    return results.take(10).toList();
  }

  Widget _buildSuggestedProductsGrid(
    BuildContext context,
    List<Map<String, dynamic>> products,
  ) {
    if (products.isEmpty) {
      return const SizedBox(
        height: 120,
        child: Center(
          child: Text(
            'Không có sản phẩm gợi ý',
            style: TextStyle(color: Color(0xFF9CA3AF)),
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: products.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.82,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemBuilder: (context, index) {
        final product = products[index];
        final id = product['id']?.toString() ?? '';
        final title = product['title']?.toString() ?? 'Sản phẩm';
        final images = product['images'] as List?;
        final imageUrl = (images != null && images.isNotEmpty)
            ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
            : (product['image_url']?.toString() ?? product['thumbnail']?.toString());

        return InkWell(
          onTap: () {
            if (id.isNotEmpty) {
              _recentlyInteractedProductIds.remove(id);
              _recentlyInteractedProductIds.insert(0, id);
            }
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
          borderRadius: BorderRadius.circular(8),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: const Color(0xFFE5E7EB),
                width: 0.8,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                    child: Container(
                      color: const Color(0xFFF9FAFB),
                      child: (imageUrl != null && imageUrl.isNotEmpty && imageUrl.startsWith('http'))
                          ? Image.network(
                              imageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (ctx, err, stack) => const Center(
                                child: Icon(
                                  Icons.image_outlined,
                                  size: 36,
                                  color: Color(0xFFCBD5E1),
                                ),
                              ),
                            )
                          : const Center(
                              child: Icon(
                                Icons.image_outlined,
                                size: 36,
                                color: Color(0xFFCBD5E1),
                              ),
                            ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                  child: Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1F2937),
                      height: 1.25,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Hero Banner Carousel (Thời trang, Góc làm việc: Nhà là nơi bạn muốn về)
  Widget _buildHeroBanner(
    BuildContext context,
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    return HeroBannerCarousel(
      onCategoryTapped: (categoryName) {
        _onCategoryCardTapped(categoryName, categoriesAsync);
      },
    );
  }

  String _getCategoryImage(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('thoại') || lower.contains('phone')) return 'https://images.unsplash.com/photo-1511707171634-5f897ff02560?w=400&q=80';
    if (lower.contains('tai nghe') || lower.contains('âm thanh')) return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80';
    if (lower.contains('đồng hồ') || lower.contains('trang sức')) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
    if (lower.contains('sách') || lower.contains('văn phòng')) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80';
    if (lower.contains('làm việc') || lower.contains('bàn')) return 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=80';
    if (lower.contains('nhà cửa') || lower.contains('đời sống')) return 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80';
    if (lower.contains('thời trang') || lower.contains('quần') || lower.contains('áo')) return 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80';
    if (lower.contains('túi') || lower.contains('phụ kiện')) return 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80';
    if (lower.contains('bếp') || lower.contains('gia dụng')) return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80';
    return 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80';
  }

  IconData _getCategoryIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('thoại') || lower.contains('phone')) return Icons.phone_iphone_rounded;
    if (lower.contains('tai nghe') || lower.contains('âm thanh')) return Icons.headphones_rounded;
    if (lower.contains('đồng hồ') || lower.contains('trang sức')) return Icons.watch_rounded;
    if (lower.contains('sách') || lower.contains('văn phòng')) return Icons.menu_book_rounded;
    if (lower.contains('làm việc') || lower.contains('laptop') || lower.contains('máy tính')) return Icons.computer_rounded;
    if (lower.contains('nhà cửa') || lower.contains('đời sống')) return Icons.chair_outlined;
    if (lower.contains('thời trang') || lower.contains('áo') || lower.contains('quần')) return Icons.checkroom_rounded;
    if (lower.contains('túi') || lower.contains('phụ kiện')) return Icons.shopping_bag_outlined;
    if (lower.contains('bếp') || lower.contains('gia dụng')) return Icons.kitchen_rounded;
    return Icons.category_rounded;
  }

  /// "Bạn đang tìm gì?" Section matching Web Screenshot (Visual category cards scrollable horizontally in 2 rows)
  Widget _buildWhatAreYouLookingFor(AsyncValue<List<Map<String, dynamic>>> categoriesAsync) {
    final defaultVisualCategories = <Map<String, dynamic>>[
      {
        'id': 'cd314f70-d4f7-4b34-bb05-33df23027833',
        'title': 'Góc làm việc',
        'image': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=80',
        'icon': Icons.computer_rounded,
      },
      {
        'id': '33e0b2c4-c52c-4839-9796-41d6214e3bcd',
        'title': 'Nhà cửa & đời sống',
        'image': 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80',
        'icon': Icons.chair_outlined,
      },
      {
        'id': '3aeb8256-3d88-46be-8321-89bb43aaf300',
        'title': 'Thời trang',
        'image': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
        'icon': Icons.checkroom_rounded,
      },
      {
        'id': 'ddba6c89-1cf9-4733-9fb9-034c222846c9',
        'title': 'Túi & phụ kiện',
        'image': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
        'icon': Icons.shopping_bag_outlined,
      },
      {
        'id': 'cat-books',
        'title': 'Sách & Văn phòng phẩm',
        'image': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
        'icon': Icons.menu_book_rounded,
      },
      {
        'id': 'cat-tech',
        'title': 'Điện tử & Thiết bị số',
        'image': 'https://images.unsplash.com/photo-1511707171634-5f897ff02560?w=400&q=80',
        'icon': Icons.phone_iphone_rounded,
      },
      {
        'id': 'cat-audio',
        'title': 'Âm thanh & Tai nghe',
        'image': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
        'icon': Icons.headphones_rounded,
      },
      {
        'id': 'cat-watches',
        'title': 'Đồng hồ & Trang sức',
        'image': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
        'icon': Icons.watch_rounded,
      },
      {
        'id': 'cat-kitchen',
        'title': 'Đồ gia dụng & Bếp',
        'image': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80',
        'icon': Icons.kitchen_rounded,
      },
      {
        'id': 'cat-beauty',
        'title': 'Làm đẹp & Sức khỏe',
        'image': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
        'icon': Icons.spa_rounded,
      },
    ];

    final serverCategories = categoriesAsync.asData?.value ?? [];
    final categories = List<Map<String, dynamic>>.from(defaultVisualCategories);
    for (final sCat in serverCategories) {
      final name = sCat['name']?.toString() ?? '';
      final id = sCat['id']?.toString() ?? '';
      if (name.isEmpty) continue;
      final matchIdx = categories.indexWhere((c) =>
          c['title'].toString().toLowerCase() == name.toLowerCase() ||
          c['id'] == id);
      if (matchIdx != -1) {
        categories[matchIdx]['id'] = id;
      } else {
        categories.add({
          'id': id,
          'title': name,
          'image': _getCategoryImage(name),
          'icon': _getCategoryIcon(name),
        });
      }
    }

    final row0 = <Map<String, dynamic>>[];
    final row1 = <Map<String, dynamic>>[];
    for (int i = 0; i < categories.length; i++) {
      if (i == 0 || i == 1) {
        row0.add(categories[i]);
      } else if (i == 2 || i == 3) {
        row1.add(categories[i]);
      } else if (row0.length <= row1.length) {
        row0.add(categories[i]);
      } else {
        row1.add(categories[i]);
      }
    }
    final columnCount = row0.length > row1.length ? row0.length : row1.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header without "Xem tất cả"
        const Text(
          'Bạn đang tìm gì?',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: Color(0xFF1F2937),
          ),
        ),
        const SizedBox(height: 12),

        // 2-row horizontally scrolling category cards
        LayoutBuilder(
          builder: (context, constraints) {
            final cardWidth = constraints.maxWidth > 500
                ? 170.0
                : ((constraints.maxWidth - 12) / 2).clamp(150.0, 240.0);
            return SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (int c = 0; c < columnCount; c++) ...[
                    if (c > 0) const SizedBox(width: 12),
                    SizedBox(
                      width: cardWidth,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildCategoryCard(row0[c], categoriesAsync),
                          if (c < row1.length) ...[
                            const SizedBox(height: 12),
                            _buildCategoryCard(row1[c], categoriesAsync),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
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
    final id = item['id']?.toString();

    final isSelected = (_selectedCategory != null && _selectedCategory == id) ||
        (_selectedCategory == '3aeb8256-3d88-46be-8321-89bb43aaf300' && title == 'Thời trang') ||
        (_selectedCategory == 'cd314f70-d4f7-4b34-bb05-33df23027833' && title == 'Góc làm việc') ||
        (_selectedCategory == '33e0b2c4-c52c-4839-9796-41d6214e3bcd' && title == 'Nhà cửa & đời sống') ||
        (_selectedCategory == 'ddba6c89-1cf9-4733-9fb9-034c222846c9' && title == 'Túi & phụ kiện');

    return Material(
      color: isSelected ? const Color(0xFFFBF2ED) : Colors.white,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _onCategoryCardTapped(title, categoriesAsync, id),
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
    String? explicitCategoryId,
  ]) {
    _searchController.clear();
    _searchQuery = '';

    String? categoryId = explicitCategoryId;
    if (categoryId == null || categoryId.isEmpty) {
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

      categoryId = match?['id']?.toString();
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

  Widget _buildSortChip({
    required String label,
    IconData? icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
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
            if (icon != null) ...[
              Icon(
                icon,
                size: 14,
                color: selected ? AppColors.primary : Colors.grey.shade600,
              ),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
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
        final rawItems = (result['items'] as List?) ?? [];
        final inStockItems = rawItems
            .where((e) => e is Map && !isProductOutOfStock(e))
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        final items = _applySort(inStockItems);
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
            childAspectRatio: 0.51,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final product = items[index];
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
    final variants = product['variants'] as List?;
    int? lowestPrice;
    if (variants != null && variants.isNotEmpty) {
      for (final v in variants) {
        if (v is Map) {
          final p = v['price_vnd'];
          int? pInt;
          if (p is num) pInt = p.toInt();
          if (p is String) pInt = int.tryParse(p);
          if (pInt != null && pInt > 0) {
            if (lowestPrice == null || pInt < lowestPrice) {
              lowestPrice = pInt;
            }
          }
        }
      }
    }
    if (lowestPrice == null) {
      final p = product['price_vnd'] ?? product['min_price_vnd'];
      if (p is num) lowestPrice = p.toInt();
      if (p is String) lowestPrice = int.tryParse(p);
      lowestPrice ??= 100000;
    }

    final originalPriceInt = (lowestPrice * 1.25).round();

    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
        : (product['image_url']?.toString() ?? product['thumbnail']?.toString());

    final ratingNum = product['rating'] ?? product['rating_average'] ?? product['avg_rating'];
    final ratingStr = (ratingNum is num)
        ? (ratingNum > 0 ? ratingNum.toStringAsFixed(1) : '0')
        : (ratingNum is String && double.tryParse(ratingNum) != null
            ? (double.parse(ratingNum) > 0 ? double.parse(ratingNum).toStringAsFixed(1) : '0')
            : '0');

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
            AspectRatio(
              aspectRatio: 1.0,
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
                                color: Colors.white,
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
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
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
                    const SizedBox(height: 4),

                    // Price Row
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '$lowestPrice ₫',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 13.5,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            '$originalPriceInt ₫',
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 10,
                              decoration: TextDecoration.lineThrough,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    // Rating & Sold Row
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: AppColors.star, size: 13),
                        const SizedBox(width: 2),
                        Text(
                          ratingStr,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '• Đã bán ${_formatSalesCount(_getProductMonthlySales(product))}',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    // "Thêm vào giỏ" Button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        style: ButtonStyle(
                          backgroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
                            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                              return AppColors.primary;
                            }
                            return Colors.white;
                          }),
                          foregroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
                            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                              return Colors.white;
                            }
                            return const Color(0xFF374151);
                          }),
                          iconColor: WidgetStateProperty.resolveWith<Color?>((states) {
                            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                              return Colors.white;
                            }
                            return const Color(0xFF374151);
                          }),
                          side: WidgetStateProperty.resolveWith<BorderSide>((states) {
                            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                              return const BorderSide(color: AppColors.primary);
                            }
                            return const BorderSide(color: Color(0xFFD1D5DB));
                          }),
                          padding: const WidgetStatePropertyAll(
                            EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                          ),
                          minimumSize: const WidgetStatePropertyAll(Size(0, 30)),
                          shape: WidgetStatePropertyAll(
                            RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          ),
                        ),
                        icon: const Icon(Icons.shopping_cart_outlined, size: 13),
                        label: const Text(
                          'Thêm vào giỏ',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onPressed: () => _quickAddToCart(product),
                      ),
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

  Widget _buildRecentlyViewedSection(AsyncValue<Map<String, dynamic>> productsAsync) {
    final recentItems = ref.watch(recentlyViewedProvider);
    if (recentItems.isEmpty) return const SizedBox.shrink();

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
              final title = prod.title;
              final price = prod.priceDisplay;
              final imageUrl = prod.imageUrl;

              return InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProductDetailPage(
                        productId: prod.id,
                        initialProduct: prod.rawProduct,
                      ),
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
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          height: 56,
                          width: double.infinity,
                          color: const Color(0xFFF3F4F6),
                          child: (imageUrl.isNotEmpty && imageUrl.startsWith('http'))
                              ? Image.network(
                                  imageUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => const Center(
                                    child: Icon(
                                      Icons.shopping_bag_outlined,
                                      size: 24,
                                      color: Colors.grey,
                                    ),
                                  ),
                                )
                              : const Center(
                                  child: Icon(
                                    Icons.shopping_bag_outlined,
                                    size: 24,
                                    color: Colors.grey,
                                  ),
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
                          fontSize: 11.5,
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
    if (categoryId == 'ddba6c89-1cf9-4733-9fb9-034c222846c9') return 'Túi & phụ kiện';
    if (categoryId == 'cat-books') return 'Sách & Văn phòng phẩm';
    if (categoryId == 'cat-tech') return 'Điện tử & Thiết bị số';
    if (categoryId == 'cat-audio') return 'Âm thanh & Tai nghe';
    if (categoryId == 'cat-watches') return 'Đồng hồ & Trang sức';
    if (categoryId == 'cat-kitchen') return 'Đồ gia dụng & Bếp';
    if (categoryId == 'cat-beauty') return 'Làm đẹp & Sức khỏe';
    return 'Danh mục';
  }

  Future<void> _quickAddToCart(Map<String, dynamic> product) async {
    final variants = (product['variants'] as List?) ?? [];
    final productId = product['id']?.toString() ?? '';

    // If product has multiple variants (> 1), show variant selection modal first
    if (variants.length > 1) {
      final images = product['images'] as List?;
      final imageUrl = (images != null && images.isNotEmpty)
          ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
          : (product['image_url']?.toString() ?? product['thumbnail']?.toString());

      await CartVariantModal.show(
        context: context,
        cartItem: {
          'product_id': productId,
          'variant_id': (variants.first as Map)['id']?.toString() ?? '',
          'quantity': 1,
          'image_url': imageUrl,
        },
        initialProduct: product,
        onConfirm: (selectedVariant, quantity) async {
          final selVariantId = selectedVariant['id']?.toString() ?? '';
          if (selVariantId.isEmpty) return;
          try {
            final client = ref.read(apiProvider);
            await client.addToCart(
              variantId: selVariantId,
              productId: productId,
              quantity: quantity,
            );
            ref.invalidate(cartItemsProvider);
            ref.invalidate(cartBadgeCountProvider);
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
        },
      );
      return;
    }

    final variantId = variants.isNotEmpty
        ? (variants.first as Map)['id']?.toString() ?? ''
        : '';

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
      ref.invalidate(cartBadgeCountProvider);
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
                  onTap: _resetToExplore,
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

          // 2. Title & Total count Row
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Row(
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
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          '$totalCount',
                          textAlign: TextAlign.center,
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
                          textAlign: TextAlign.center,
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
                      ],
                    ),
                  ),
                ),

                const Spacer(),

                // Dropdown Sắp xếp (mặc định xổ xuống dưới)
                PopupMenuButton<String>(
                  position: PopupMenuPosition.under,
                  offset: const Offset(0, 4),
                  elevation: 4,
                  shadowColor: Colors.black26,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: const BorderSide(color: Color(0xFFE5E7EB), width: 1.2),
                  ),
                  color: Colors.white,
                  padding: EdgeInsets.zero,
                  onSelected: (val) {
                    _onSortChanged(val);
                  },
                  itemBuilder: (context) => [
                    _buildSortMenuItem('best_selling', 'Bán chạy'),
                    _buildSortMenuItem('newest', 'Mới nhất'),
                    _buildSortMenuItem('price_asc', 'Giá tăng dần'),
                    _buildSortMenuItem('price_desc', 'Giá giảm dần'),
                  ],
                  child: Container(
                    height: 33,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE5E7EB), width: 1.2),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _getSortLabel(_sort),
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF374151),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.keyboard_arrow_down,
                          size: 15,
                          color: Color(0xFF6B7280),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 8),

                // Toggle Grid/List mode (single button toggling between grid and list)
                Tooltip(
                  message: _isListView ? 'Chuyển sang dạng lưới' : 'Chuyển sang dạng danh sách',
                  child: InkWell(
                    onTap: () => setState(() => _isListView = !_isListView),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: 33,
                      height: 33,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE5E7EB), width: 1.2),
                      ),
                      alignment: Alignment.center,
                      child: Icon(
                        _isListView ? Icons.view_agenda_outlined : Icons.grid_view_rounded,
                        size: 16,
                        color: AppColors.primary,
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
        final filteredItems = rawItems
            .map((e) => Map<String, dynamic>.from(e as Map))
            .where((p) {
              if (isProductOutOfStock(p)) return false;
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
        final items = _applySort(filteredItems);

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
              childAspectRatio: 0.50,
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

    final variants = (product['variants'] as List?) ?? [];
    int? lowestPrice;
    if (variants.isNotEmpty) {
      for (final v in variants) {
        if (v is Map) {
          final p = v['price_vnd'];
          int? pInt;
          if (p is num) pInt = p.toInt();
          if (p is String) pInt = int.tryParse(p);
          if (pInt != null && pInt > 0) {
            if (lowestPrice == null || pInt < lowestPrice) {
              lowestPrice = pInt;
            }
          }
        }
      }
    }
    if (lowestPrice == null) {
      final p = product['price_vnd'] ?? product['min_price_vnd'];
      if (p is num) lowestPrice = p.toInt();
      if (p is String) lowestPrice = int.tryParse(p);
      lowestPrice ??= 100000;
    }

    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
        : (product['image_url']?.toString() ?? product['thumbnail']?.toString());

    final ratingNum = product['rating'] ?? product['rating_average'] ?? product['avg_rating'];
    final ratingStr = (ratingNum is num)
        ? (ratingNum > 0 ? ratingNum.toStringAsFixed(1) : '0')
        : (ratingNum is String && double.tryParse(ratingNum) != null
            ? (double.parse(ratingNum) > 0 ? double.parse(ratingNum).toStringAsFixed(1) : '0')
            : '0');
    final salesCount = _getProductMonthlySales(product);

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
            // 1. Thumbnail Image with Favorite Button on Top-Right
            AspectRatio(
              aspectRatio: 1.0,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: const Color(0xFFF9FAFB),
                    child: imageUrl != null && imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => const Center(
                              child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 36),
                            ),
                          )
                        : const Center(
                            child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 36),
                          ),
                  ),
                  // Button yêu thích ở góc trên cùng bên phải trên ảnh sản phẩm
                  Positioned(
                    top: 6,
                    right: 6,
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
                            width: 30,
                            height: 30,
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
                                size: 16,
                                color: isFav ? const Color(0xFFDC2626) : const Color(0xFF6B7280),
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

            // 2. Details Column
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Tên sản phẩm
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
                        const SizedBox(height: 5),
                        // Giá tiền (của phân loại rẻ nhất, bỏ chữ "từ" đi)
                        Text(
                          _formatPrice(lowestPrice),
                          style: const TextStyle(
                            color: Color(0xFFBA3416),
                            fontWeight: FontWeight.bold,
                            fontSize: 14.5,
                          ),
                        ),
                        const SizedBox(height: 3),
                        // Số lượt bán và số sao
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, color: AppColors.star, size: 13),
                            const SizedBox(width: 2),
                            Text(
                              ratingStr,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '• Đã bán ${_formatSalesCount(salesCount)}',
                              style: const TextStyle(
                                fontSize: 10.5,
                                color: Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Spacer(),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Button thêm vào giỏ
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            style: ButtonStyle(
                              backgroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
                                if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                  return AppColors.primary;
                                }
                                return Colors.white;
                              }),
                              foregroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
                                if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                  return Colors.white;
                                }
                                return const Color(0xFF374151);
                              }),
                              iconColor: WidgetStateProperty.resolveWith<Color?>((states) {
                                if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                  return Colors.white;
                                }
                                return const Color(0xFF374151);
                              }),
                              side: WidgetStateProperty.resolveWith<BorderSide>((states) {
                                if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                  return const BorderSide(color: AppColors.primary);
                                }
                                return const BorderSide(color: Color(0xFFD1D5DB));
                              }),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              visualDensity: VisualDensity.compact,
                              padding: const WidgetStatePropertyAll(
                                EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                              ),
                              minimumSize: const WidgetStatePropertyAll(Size(0, 30)),
                              shape: WidgetStatePropertyAll(
                                RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                              ),
                            ),
                            icon: const Icon(Icons.shopping_cart_outlined, size: 13),
                            label: const Text(
                              'Thêm vào giỏ',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            onPressed: () => _quickAddToCart(product),
                          ),
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

    final variants = (product['variants'] as List?) ?? [];
    int? lowestPrice;
    if (variants.isNotEmpty) {
      for (final v in variants) {
        if (v is Map) {
          final p = v['price_vnd'];
          int? pInt;
          if (p is num) pInt = p.toInt();
          if (p is String) pInt = int.tryParse(p);
          if (pInt != null && pInt > 0) {
            if (lowestPrice == null || pInt < lowestPrice) {
              lowestPrice = pInt;
            }
          }
        }
      }
    }
    if (lowestPrice == null) {
      final p = product['price_vnd'] ?? product['min_price_vnd'];
      if (p is num) lowestPrice = p.toInt();
      if (p is String) lowestPrice = int.tryParse(p);
      lowestPrice ??= 100000;
    }

    final images = product['images'] as List?;
    final imageUrl = (images != null && images.isNotEmpty)
        ? (images[0] is Map ? images[0]['image_url']?.toString() : images[0]?.toString())
        : (product['image_url']?.toString() ?? product['thumbnail']?.toString());

    final ratingNum = product['rating'] ?? product['rating_average'] ?? product['avg_rating'];
    final ratingStr = (ratingNum is num)
        ? (ratingNum > 0 ? ratingNum.toStringAsFixed(1) : '0')
        : (ratingNum is String && double.tryParse(ratingNum) != null
            ? (double.parse(ratingNum) > 0 ? double.parse(ratingNum).toStringAsFixed(1) : '0')
            : '0');
    final salesCount = _getProductMonthlySales(product);

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
              // Left Image with Favorite Heart Button on Top-Right
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 90,
                  height: 90,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(
                        color: const Color(0xFFF9FAFB),
                        child: imageUrl != null && imageUrl.isNotEmpty
                            ? Image.network(imageUrl, fit: BoxFit.cover)
                            : const Center(child: Icon(Icons.shopping_bag_outlined, color: Colors.grey)),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
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
                                width: 24,
                                height: 24,
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
                                    size: 13,
                                    color: isFav ? const Color(0xFFDC2626) : const Color(0xFF6B7280),
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
              ),
              const SizedBox(width: 12),
              // Right Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tên sản phẩm
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
                    const SizedBox(height: 3),
                    // Giá tiền (của phân loại rẻ nhất, bỏ chữ "từ" đi)
                    Text(
                      _formatPrice(lowestPrice),
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFBA3416),
                      ),
                    ),
                    const SizedBox(height: 3),
                    // Số sao và số lượt bán
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: AppColors.star, size: 13),
                        const SizedBox(width: 2),
                        Text(
                          ratingStr,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1F2937),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '• Đã bán ${_formatSalesCount(salesCount)}',
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          style: ButtonStyle(
                            backgroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
                              if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                return AppColors.primary;
                              }
                              return Colors.white;
                            }),
                            foregroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
                              if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                return Colors.white;
                              }
                              return const Color(0xFF374151);
                            }),
                            iconColor: WidgetStateProperty.resolveWith<Color?>((states) {
                              if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                return Colors.white;
                              }
                              return const Color(0xFF374151);
                            }),
                            side: WidgetStateProperty.resolveWith<BorderSide>((states) {
                              if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                return const BorderSide(color: AppColors.primary);
                              }
                              return const BorderSide(color: Color(0xFFD1D5DB));
                            }),
                            padding: const WidgetStatePropertyAll(
                              EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                            ),
                            minimumSize: const WidgetStatePropertyAll(Size(0, 30)),
                            shape: WidgetStatePropertyAll(
                              RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            ),
                          ),
                          icon: const Icon(Icons.shopping_cart_outlined, size: 13),
                          label: const Text(
                            'Thêm vào giỏ',
                            style: TextStyle(fontSize: 11),
                          ),
                          onPressed: () => _quickAddToCart(product),
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

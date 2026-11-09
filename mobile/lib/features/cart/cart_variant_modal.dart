import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';

class CartVariantModal extends ConsumerStatefulWidget {
  final Map<String, dynamic> cartItem;
  final Map<String, dynamic>? initialProduct;
  final Future<void> Function(Map<String, dynamic> selectedVariant, int quantity) onConfirm;

  const CartVariantModal({
    super.key,
    required this.cartItem,
    this.initialProduct,
    required this.onConfirm,
  });

  static Future<void> show({
    required BuildContext context,
    required Map<String, dynamic> cartItem,
    Map<String, dynamic>? initialProduct,
    required Future<void> Function(Map<String, dynamic> selectedVariant, int quantity) onConfirm,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CartVariantModal(
        cartItem: cartItem,
        initialProduct: initialProduct,
        onConfirm: onConfirm,
      ),
    );
  }

  @override
  ConsumerState<CartVariantModal> createState() => _CartVariantModalState();
}

class _CartVariantModalState extends ConsumerState<CartVariantModal> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _product;
  List<Map<String, dynamic>> _variants = [];
  Map<String, dynamic>? _selectedVariant;
  int _quantity = 1;
  late final TextEditingController _quantityController;
  late final FocusNode _quantityFocusNode;
  bool _isSubmitting = false;

  // Multi-axis variant values: e.g. {"Màu sắc": "Đen", "Kích cỡ": "XL"}
  final Map<String, String> _selectedAttributes = {};
  final Map<String, List<String>> _attributeOptions = {};

  @override
  void initState() {
    super.initState();
    _quantity = (widget.cartItem['quantity'] as num?)?.toInt() ?? 1;
    if (_quantity < 1) _quantity = 1;
    _quantityController = TextEditingController(text: '$_quantity');
    _quantityFocusNode = FocusNode();
    _quantityFocusNode.addListener(_onQuantityFocusChanged);
    if (widget.initialProduct != null) {
      _applyProduct(widget.initialProduct!);
      _isLoading = false;
    }
    _fetchProductDetails();
  }

  @override
  void dispose() {
    _quantityFocusNode.removeListener(_onQuantityFocusChanged);
    _quantityFocusNode.dispose();
    _quantityController.dispose();
    super.dispose();
  }

  void _onQuantityFocusChanged() {
    if (!_quantityFocusNode.hasFocus) {
      _syncQuantityFromText();
    }
  }

  void _syncQuantityFromText() {
    final rawText = _quantityController.text.trim();
    final parsed = int.tryParse(rawText);
    final stock = _getStock(_selectedVariant);

    if (parsed == null || parsed < 1) {
      _quantity = 1;
    } else if (stock > 0 && parsed > stock) {
      _quantity = stock;
      AppNoticeDialog.show(
        context,
        message: 'Chỉ còn lại $stock sản phẩm cho mặt hàng này',
      );
    } else {
      _quantity = parsed;
    }

    final newText = '$_quantity';
    if (_quantityController.text != newText) {
      _quantityController.text = newText;
      _quantityController.selection = TextSelection.fromPosition(
        TextPosition(offset: newText.length),
      );
    }
    if (mounted) setState(() {});
  }

  void _onQuantityChanged(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      return;
    }
    final parsed = int.tryParse(trimmed);
    if (parsed == null || parsed < 1) {
      return;
    }

    final stock = _getStock(_selectedVariant);
    if (stock > 0 && parsed > stock) {
      _quantity = stock;
      _quantityController.text = '$stock';
      _quantityController.selection = TextSelection.fromPosition(
        TextPosition(offset: _quantityController.text.length),
      );
      AppNoticeDialog.show(
        context,
        message: 'Chỉ còn lại $stock sản phẩm cho mặt hàng này',
      );
      if (mounted) setState(() {});
      return;
    }

    _quantity = parsed;
    if (mounted) setState(() {});
  }

  void _decrementQuantity() {
    _syncQuantityFromText();
    final stock = _getStock(_selectedVariant);
    if (_quantity > 1 && stock > 0 && !_isSubmitting) {
      setState(() {
        _quantity--;
        _quantityController.text = '$_quantity';
        _quantityController.selection = TextSelection.fromPosition(
          TextPosition(offset: _quantityController.text.length),
        );
      });
    }
  }

  void _incrementQuantity(int stock) {
    _syncQuantityFromText();
    if (stock > 0 && !_isSubmitting) {
      if (_quantity >= stock) {
        AppNoticeDialog.show(
          context,
          message: 'Chỉ còn lại $stock sản phẩm cho mặt hàng này',
        );
      } else {
        setState(() {
          _quantity++;
          _quantityController.text = '$_quantity';
          _quantityController.selection = TextSelection.fromPosition(
            TextPosition(offset: _quantityController.text.length),
          );
        });
      }
    }
  }

  void _applyProduct(Map<String, dynamic> prod) {
    final rawVariants = (prod['variants'] as List?) ?? [];
    final variants = rawVariants
        .map((v) => Map<String, dynamic>.from(v as Map))
        .toList();

    final currentVariantId = widget.cartItem['variant_id']?.toString() ?? '';
    Map<String, dynamic>? activeVariant;

    if (variants.isNotEmpty) {
      activeVariant = variants.firstWhere(
        (v) => v['id']?.toString() == currentVariantId,
        orElse: () => variants.first,
      );
    }

    // Build attribute options groups
    final Map<String, Set<String>> attrMap = {};
    for (final v in variants) {
      final vv = v['variant_values'] as Map?;
      if (vv != null && vv.isNotEmpty) {
        for (final entry in vv.entries) {
          final key = entry.key.toString();
          final val = entry.value.toString();
          attrMap.putIfAbsent(key, () => <String>{}).add(val);
        }
      }
    }

    final Map<String, List<String>> attributeOptions = {};
    for (final entry in attrMap.entries) {
      attributeOptions[entry.key] = entry.value.toList();
    }

    // Initialize selected attributes from active variant
    final Map<String, String> initialSelectedAttributes = {};
    if (activeVariant != null) {
      final vv = activeVariant['variant_values'] as Map?;
      if (vv != null && vv.isNotEmpty) {
        for (final entry in vv.entries) {
          initialSelectedAttributes[entry.key.toString()] = entry.value.toString();
        }
      }
    }

    final stock = _getStock(activeVariant);
    if (_quantity > stock && stock > 0) {
      _quantity = stock;
    }
    _quantityController.text = '$_quantity';

    _product = prod;
    _variants = variants;
    _selectedVariant = activeVariant;
    _attributeOptions.clear();
    _attributeOptions.addAll(attributeOptions);
    _selectedAttributes.clear();
    _selectedAttributes.addAll(initialSelectedAttributes);
  }

  Future<void> _fetchProductDetails() async {
    final productId = widget.cartItem['product_id']?.toString();
    if (productId == null || productId.isEmpty) {
      if (_product == null) {
        setState(() {
          _isLoading = false;
          _error = 'Không tìm thấy thông tin sản phẩm.';
        });
      }
      return;
    }

    try {
      final client = ref.read(apiProvider);
      final prod = await client.getProduct(productId);
      if (!mounted) return;

      setState(() {
        _applyProduct(prod);
        _isLoading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      if (_product == null) {
        setState(() {
          _isLoading = false;
          _error = errorMessage(e);
        });
      }
    }
  }

  int _getStock(Map<String, dynamic>? variant) {
    if (variant == null) return 0;
    if (variant.containsKey('available_quantity') && variant['available_quantity'] != null) {
      return (variant['available_quantity'] as num).toInt();
    }
    if (variant.containsKey('stock') && variant['stock'] != null) {
      return (variant['stock'] as num).toInt();
    }
    return 70; // Default fallback stock if API does not constrain
  }

  int _getPrice(Map<String, dynamic>? variant) {
    if (variant != null) {
      final p = variant['price_vnd'];
      if (p is num) return p.toInt();
      if (p is String) return int.tryParse(p) ?? 0;
    }
    final raw = widget.cartItem['unit_price_vnd'] ?? widget.cartItem['price_vnd'];
    if (raw is num) return raw.toInt();
    if (raw is String) return int.tryParse(raw) ?? 0;
    return 0;
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

  void _onAttributeSelected(String attributeName, String value) {
    setState(() {
      _selectedAttributes[attributeName] = value;

      // Find matching variant
      Map<String, dynamic>? match;
      for (final v in _variants) {
        final vv = v['variant_values'] as Map?;
        if (vv != null) {
          bool isMatch = true;
          for (final entry in _selectedAttributes.entries) {
            if (vv[entry.key]?.toString() != entry.value) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) {
            match = v;
            break;
          }
        }
      }

      if (match != null) {
        _selectedVariant = match;
        final stock = _getStock(match);
        if (_quantity > stock && stock > 0) {
          _quantity = stock;
        } else if (_quantity <= 0 && stock > 0) {
          _quantity = 1;
        }
        _quantityController.text = '$_quantity';
      }
    });
  }

  void _onDirectVariantSelected(Map<String, dynamic> variant) {
    setState(() {
      _selectedVariant = variant;
      final stock = _getStock(variant);
      if (_quantity > stock && stock > 0) {
        _quantity = stock;
      } else if (_quantity <= 0 && stock > 0) {
        _quantity = 1;
      }
      _quantityController.text = '$_quantity';
    });
  }

  void _showImagePreview(String? imageUrl) {
    if (imageUrl == null || imageUrl.isEmpty) return;
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: InteractiveViewer(
                  child: Image.network(
                    imageUrl,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Container(
                      color: Colors.white,
                      padding: const EdgeInsets.all(32),
                      child: const Icon(Icons.broken_image, size: 64, color: Colors.grey),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 28),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleSubmit() async {
    _syncQuantityFromText();
    if (_selectedVariant == null) return;
    final stock = _getStock(_selectedVariant);
    if (stock <= 0) {
      AppNoticeDialog.show(
        context,
        message: 'Phân loại này hiện đã hết hàng, vui lòng chọn phân loại khác.',
      );
      return;
    }

    if (_quantity > stock) {
      AppNoticeDialog.show(
        context,
        message: 'Chỉ còn lại $stock sản phẩm cho mặt hàng này',
      );
      return;
    }

    Navigator.pop(context);
    widget.onConfirm(_selectedVariant!, _quantity);
  }

  @override
  Widget build(BuildContext context) {
    final activePrice = _getPrice(_selectedVariant);
    final originalPrice = (activePrice * 1.2).round();
    final stock = _getStock(_selectedVariant);

    // Resolve Image Url
    final images = _product?['images'] as List?;
    String? imageUrl = (images != null && images.isNotEmpty)
        ? (images.first as Map)['image_url']?.toString()
        : widget.cartItem['image_url']?.toString();
    if (_selectedVariant != null && _selectedVariant!['image_url'] != null) {
      imageUrl = _selectedVariant!['image_url'].toString();
    }

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Drag Handle
            Center(
              child: Container(
                width: 38,
                height: 4,
                margin: const EdgeInsets.only(top: 8, bottom: 4),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Top Header matching Image 2
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product Thumbnail with zoom icon
                  GestureDetector(
                    onTap: () => _showImagePreview(imageUrl),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: 108,
                            height: 108,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F4F6),
                              border: Border.all(color: const Color(0xFFE5E7EB)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: imageUrl != null && imageUrl.isNotEmpty
                                ? Image.network(
                                    imageUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Center(
                                      child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 32),
                                    ),
                                  )
                                : const Center(
                                    child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 32),
                                  ),
                          ),
                        ),
                        // Zoom icon overlay in top right of thumbnail
                        Positioned(
                          top: 5,
                          right: 5,
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.4),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.open_in_full_rounded,
                              size: 12,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 14),

                  // Price & Stock Information
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        // Price Row
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              _formatPrice(activePrice),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                                letterSpacing: -0.2,
                              ),
                            ),
                            if (originalPrice > activePrice) ...[
                              const SizedBox(width: 6),
                              Text(
                                _formatPrice(originalPrice),
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF9CA3AF),
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        // Stock info
                        Text(
                          stock > 0 ? 'Kho: $stock' : 'Hết hàng',
                          style: TextStyle(
                            fontSize: 13,
                            color: stock > 0 ? const Color(0xFF6B7280) : AppColors.primary,
                            fontWeight: stock > 0 ? FontWeight.normal : FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Close button
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: const Icon(Icons.close, color: Color(0xFF9CA3AF), size: 22),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(height: 1, thickness: 1, color: Color(0xFFF3F4F6)),

            // Body: Attribute Selection Groups & Stepper
            Flexible(
              child: _isLoading
                  ? const SizedBox(
                      height: 160,
                      child: Center(
                        child: CircularProgressIndicator(color: AppColors.primary),
                      ),
                    )
                  : _error != null
                      ? Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Center(
                            child: Text(
                              _error!,
                              style: const TextStyle(color: Colors.red, fontSize: 13),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Multi-axis attributes (e.g. Màu sắc, Kích cỡ)
                              if (_attributeOptions.isNotEmpty)
                                ..._attributeOptions.entries.map((entry) {
                                  final attrName = entry.key;
                                  final options = entry.value;
                                  final currentVal = _selectedAttributes[attrName];

                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          attrName,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF1F2937),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 8,
                                          runSpacing: 8,
                                          children: options.map((opt) {
                                            final isSelected = currentVal == opt;
                                            return _buildOptionChip(
                                              label: opt,
                                              isSelected: isSelected,
                                              onTap: () => _onAttributeSelected(attrName, opt),
                                            );
                                          }).toList(),
                                        ),
                                        const SizedBox(height: 8),
                                        const Divider(height: 1, color: Color(0xFFF3F4F6)),
                                      ],
                                    ),
                                  );
                                })
                              else if (_variants.isNotEmpty)
                                // Flat variant list fallback
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Phân loại',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF1F2937),
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: _variants.map((v) {
                                          final isSelected = _selectedVariant?['id'] == v['id'];
                                          final label = v['sku']?.toString() ??
                                              v['title']?.toString() ??
                                              'Phiên bản';
                                          return _buildOptionChip(
                                            label: label,
                                            isSelected: isSelected,
                                            onTap: () => _onDirectVariantSelected(v),
                                          );
                                        }).toList(),
                                      ),
                                      const SizedBox(height: 14),
                                      const Divider(height: 1, color: Color(0xFFF3F4F6)),
                                    ],
                                  ),
                                ),

                              // Quantity Stepper Section matching Image 2
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 2),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Số lượng',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF1F2937),
                                    ),
                                  ),
                                  Container(
                                    height: 32,
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: const Color(0xFFE5E7EB),
                                        width: 1,
                                      ),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        InkWell(
                                          onTap: (_quantity > 1 && stock > 0 && !_isSubmitting)
                                              ? _decrementQuantity
                                              : null,
                                          child: SizedBox(
                                            width: 32,
                                            height: 32,
                                            child: Icon(
                                              Icons.remove,
                                              size: 14,
                                              color: (_quantity > 1 && stock > 0)
                                                  ? const Color(0xFF374151)
                                                  : const Color(0xFFD1D5DB),
                                            ),
                                          ),
                                        ),
                                        Container(
                                          width: 48,
                                          height: 32,
                                          alignment: Alignment.center,
                                          decoration: const BoxDecoration(
                                            border: Border.symmetric(
                                              vertical: BorderSide(
                                                color: Color(0xFFE5E7EB),
                                                width: 1,
                                              ),
                                            ),
                                          ),
                                          child: TextField(
                                            controller: _quantityController,
                                            focusNode: _quantityFocusNode,
                                            enabled: stock > 0 && !_isSubmitting,
                                            keyboardType: TextInputType.number,
                                            textAlign: TextAlign.center,
                                            textAlignVertical: TextAlignVertical.center,
                                            inputFormatters: [
                                              FilteringTextInputFormatter.digitsOnly,
                                            ],
                                            onChanged: _onQuantityChanged,
                                            onSubmitted: (_) => _syncQuantityFromText(),
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF1F2937),
                                            ),
                                            decoration: const InputDecoration(
                                              border: InputBorder.none,
                                              isDense: true,
                                              contentPadding: EdgeInsets.zero,
                                            ),
                                          ),
                                        ),
                                        InkWell(
                                          onTap: (stock > 0 && !_isSubmitting)
                                              ? () => _incrementQuantity(stock)
                                              : null,
                                          child: SizedBox(
                                            width: 32,
                                            height: 32,
                                            child: Icon(
                                              Icons.add,
                                              size: 14,
                                              color: (_quantity < stock && stock > 0)
                                                  ? const Color(0xFF374151)
                                                  : const Color(0xFFD1D5DB),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                              if (stock <= 0)
                                const Padding(
                                  padding: EdgeInsets.only(top: 8),
                                  child: Text(
                                    'Sản phẩm trong phân loại này hiện đã hết hàng.',
                                    style: TextStyle(
                                      color: AppColors.primary,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
            ),

            const Divider(height: 1, thickness: 1, color: Color(0xFFF3F4F6)),

            // Bottom "Xác nhận" Button matching Image 2
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: stock <= 0
                        ? const Color(0xFFD1D5DB)
                        : AppColors.primary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: (stock <= 0 || _isSubmitting || _isLoading)
                      ? null
                      : _handleSubmit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2.4,
                          ),
                        )
                      : Text(
                          stock <= 0 ? 'Hết hàng' : 'Xác nhận',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
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

  /// Option chip widget matching Image 2
  Widget _buildOptionChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.transparent,
            width: 1.2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            color: isSelected ? AppColors.primary : const Color(0xFF374151),
          ),
        ),
      ),
    );
  }
}

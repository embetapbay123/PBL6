import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/app_theme.dart';
import '../../main.dart';
import '../catalog/product_detail_page.dart';

class ChatAiModal extends ConsumerStatefulWidget {
  const ChatAiModal({super.key, this.initialPrompt, this.productContext});

  final String? initialPrompt;
  final Map<String, dynamic>? productContext;

  static void show(BuildContext context, {String? initialPrompt, Map<String, dynamic>? productContext}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChatAiModal(
        initialPrompt: initialPrompt,
        productContext: productContext,
      ),
    );
  }

  @override
  ConsumerState<ChatAiModal> createState() => _ChatAiModalState();
}

class _ChatAiModalState extends ConsumerState<ChatAiModal> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isTyping = false;
  String? _sessionId;
  String? _chatKey;

  @override
  void initState() {
    super.initState();
    if (widget.productContext != null) {
      final title = widget.productContext!['title']?.toString() ?? 'sản phẩm này';
      _messages.add({
        'isUser': false,
        'text': 'Chào bạn! Mình là Trợ lý AI của PBL6 Marketplace. Bạn đang quan tâm đến "$title". Bạn cần mình tư vấn gì về sản phẩm này?',
      });
    } else {
      _messages.add({
        'isUser': false,
        'text': 'Xin chào! Mình là Trợ lý AI mua sắm thông minh kết nối Catalog trực tuyến. Hãy hỏi về bất kỳ sản phẩm nào bạn cần nhé!',
      });
    }

    if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _handleSend(widget.initialPrompt!);
      });
    }
  }

  Future<void> _ensureSession([String? firstMessage]) async {
    if (_sessionId != null) return;
    try {
      final client = ref.read(apiProvider);
      final res = await client.createChatSession(firstMessage: firstMessage);
      _sessionId = res['id']?.toString();
      _chatKey = res['anonymous_key']?.toString();
    } catch (_) {
      // Ignored: network failure will be handled gracefully during send
    }
  }

  String _formatVnd(dynamic value) {
    if (value == null) return '';
    final numVal = int.tryParse(value.toString());
    if (numVal == null) return '$value đ';
    final formatted = numVal.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]}.',
        );
    return '$formatted đ';
  }

  Future<void> _handleSend(String text) async {
    final query = text.trim();
    if (query.isEmpty) return;
    _controller.clear();

    setState(() {
      _messages.add({'isUser': true, 'text': query});
      _isTyping = true;
    });

    try {
      final client = ref.read(apiProvider);
      if (_sessionId == null) {
        await _ensureSession(query);
      }

      if (_sessionId == null) {
        if (!mounted) return;
        setState(() {
          _isTyping = false;
          _messages.add({
            'isUser': false,
            'text': 'Không thể khởi tạo phiên chat với máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
          });
        });
        return;
      }

      final res = await client.sendChatMessage(
        _sessionId!,
        query,
        chatKey: _chatKey,
      );

      final answerText = res['content']?.toString() ?? 'Dưới đây là một số gợi ý cho bạn:';
      final productCards = res['product_cards'] as List? ?? [];
      final suggestions = <Map<String, dynamic>>[];

      for (final card in productCards.take(5)) {
        if (card is Map) {
          final pid = card['product_id']?.toString();
          final price = card['current_price_vnd'];
          var title = 'Sản phẩm gợi ý';
          String? imageUrl;

          if (pid != null) {
            try {
              final prod = await client.getProduct(pid);
              title = prod['title']?.toString() ?? title;
              final images = prod['images'] as List?;
              if (images != null && images.isNotEmpty) {
                final firstImg = images.first;
                if (firstImg is Map && firstImg['image_url'] != null) {
                  imageUrl = firstImg['image_url'].toString();
                } else if (firstImg is String) {
                  imageUrl = firstImg;
                }
              }
            } catch (_) {}
          }

          suggestions.add({
            'id': pid,
            'title': title,
            'price': _formatVnd(price),
            'image_url': imageUrl,
          });
        }
      }

      if (!mounted) return;
      setState(() {
        _isTyping = false;
        _messages.add({
          'isUser': false,
          'text': answerText,
          'suggestions': suggestions,
        });
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isTyping = false;
        _messages.add({
          'isUser': false,
          'text': 'Đã có lỗi khi kết nối với Trợ lý AI: $e',
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: AppColors.redGradient,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Colors.white24,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Trợ lý mua sắm AI',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Tư vấn trực tuyến & gợi ý thông minh',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Quick prompt chips
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _buildPromptChip('🔥 Sản phẩm bán chạy nhất'),
                _buildPromptChip('🎧 Tai nghe chống ồn dưới 1 triệu'),
                _buildPromptChip('🎁 Gợi ý quà sinh nhật'),
                _buildPromptChip('⚡ Siêu sale hôm nay'),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Messages List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _messages.length && _isTyping) {
                  return Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                          ),
                          SizedBox(width: 8),
                          Text('AI đang suy nghĩ…', style: TextStyle(fontSize: 13, color: Colors.black54)),
                        ],
                      ),
                    ),
                  );
                }

                final msg = _messages[index];
                final isUser = msg['isUser'] == true;
                final text = msg['text']?.toString() ?? '';
                final suggestions = msg['suggestions'] as List?;

                return Column(
                  crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    Align(
                      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                        decoration: BoxDecoration(
                          color: isUser ? AppColors.primary : Colors.grey.shade100,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: Radius.circular(isUser ? 16 : 4),
                            bottomRight: Radius.circular(isUser ? 4 : 16),
                          ),
                        ),
                        child: Text(
                          text,
                          style: TextStyle(
                            color: isUser ? Colors.white : AppColors.textPrimary,
                            fontSize: 14,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ),
                    if (suggestions != null && suggestions.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6, bottom: 8),
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: suggestions.map((s) {
                              final item = s as Map<String, dynamic>;
                              final pid = item['id']?.toString();
                              final imageUrl = item['image_url']?.toString();
                              return Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    if (pid != null && pid.isNotEmpty) {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => ProductDetailPage(productId: pid),
                                        ),
                                      );
                                    }
                                  },
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    width: 170,
                                    margin: const EdgeInsets.only(right: 8),
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: AppColors.primaryLight),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withAlpha(8),
                                          blurRadius: 4,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(8),
                                          child: Container(
                                            height: 80,
                                            width: double.infinity,
                                            color: Colors.grey.shade100,
                                            child: imageUrl != null && imageUrl.startsWith('http')
                                                ? Image.network(
                                                    imageUrl,
                                                    fit: BoxFit.cover,
                                                    errorBuilder: (ctx, err, stack) => const Center(
                                                      child: Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 28),
                                                    ),
                                                  )
                                                : const Center(
                                                    child: Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 28),
                                                  ),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          item['title'] ?? '',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          item['price'] ?? '',
                                          style: const TextStyle(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),

          // Input Bar
          Container(
            padding: EdgeInsets.only(
              left: 12,
              right: 12,
              top: 8,
              bottom: MediaQuery.of(context).viewInsets.bottom + 12,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(12),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    textInputAction: TextInputAction.send,
                    onSubmitted: _handleSend,
                    decoration: InputDecoration(
                      hintText: 'Hỏi AI về sản phẩm, giá cả, so sánh…',
                      hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                      prefixIcon: const Icon(Icons.auto_awesome, color: AppColors.primary, size: 18),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                    onPressed: () => _handleSend(_controller.text),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPromptChip(String label) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        label: Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textPrimary)),
        backgroundColor: Colors.grey.shade100,
        shape: StadiumBorder(side: BorderSide(color: Colors.grey.shade200)),
        padding: const EdgeInsets.symmetric(horizontal: 4),
        onPressed: () => _handleSend(label.replaceAll(RegExp(r'^[^\w\s]+'), '').trim()),
      ),
    );
  }
}

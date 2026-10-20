import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

class ChatAiModal extends StatefulWidget {
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
  State<ChatAiModal> createState() => _ChatAiModalState();
}

class _ChatAiModalState extends State<ChatAiModal> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isTyping = false;

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
        'text': 'Xin chào! Mình là Trợ lý AI mua sắm thông minh. Hãy mô tả nhu cầu, sở thích hoặc ngân sách để mình gợi ý sản phẩm phù hợp nhất cho bạn!',
      });
    }

    if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
      _handleSend(widget.initialPrompt!);
    }
  }

  void _handleSend(String text) {
    final query = text.trim();
    if (query.isEmpty) return;
    _controller.clear();

    setState(() {
      _messages.add({'isUser': true, 'text': query});
      _isTyping = true;
    });

    Future.delayed(const Duration(milliseconds: 700), () {
      if (!mounted) return;
      setState(() {
        _isTyping = false;
        _messages.add({
          'isUser': false,
          'text': _generateAiResponse(query),
          'suggestions': [
            {'title': 'Tai nghe Bluetooth Pro 2', 'price': '699.000 đ', 'rating': '4.8'},
            {'title': 'Đồng hồ thông minh SmartFit', 'price': '1.590.000 đ', 'rating': '4.9'},
          ],
        });
      });
    });
  }

  String _generateAiResponse(String query) {
    final q = query.toLowerCase();
    if (q.contains('tai nghe') || q.contains('bluetooth')) {
      return 'Dưới đây là một số mẫu tai nghe Bluetooth chống ồn cực tốt, pin 30 giờ và đang được giảm giá 30% hôm nay:';
    } else if (q.contains('đồng hồ') || q.contains('watch')) {
      return 'Đây là mẫu Smartwatch theo dõi sức khỏe và đo nhịp tim liên tục rất được ưa chuộng:';
    } else if (q.contains('rẻ') || q.contains('giá')) {
      return 'Mình đã tìm thấy các ưu đãi tốt nhất phù hợp với ngân sách của bạn kèm mã giảm 50K của Shop:';
    }
    return 'Dựa trên nhu cầu của bạn, mình đề xuất một số sản phẩm chính hãng được đánh giá cao nhất trên hệ thống:';
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
                              return Container(
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
                                    Container(
                                      height: 70,
                                      decoration: BoxDecoration(
                                        color: Colors.grey.shade100,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Center(
                                        child: Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 28),
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

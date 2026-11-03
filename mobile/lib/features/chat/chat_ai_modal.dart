import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';
import '../catalog/product_detail_page.dart';

/// Full screen Chat Center Page for route `/chat`
class ChatCenterPage extends StatelessWidget {
  const ChatCenterPage({super.key, this.initialPrompt, this.productContext});

  final String? initialPrompt;
  final Map<String, dynamic>? productContext;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ChatCenterView(
          isPage: true,
          initialPrompt: initialPrompt,
          productContext: productContext,
          onClose: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }
}

/// Modal Bottom Sheet wrapper for Chat Center
class ChatAiModal extends StatelessWidget {
  const ChatAiModal({super.key, this.initialPrompt, this.productContext});

  final String? initialPrompt;
  final Map<String, dynamic>? productContext;

  static void show(
    BuildContext context, {
    String? initialPrompt,
    Map<String, dynamic>? productContext,
  }) {
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
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      clipBehavior: Clip.antiAlias,
      child: ChatCenterView(
        isPage: false,
        initialPrompt: initialPrompt,
        productContext: productContext,
        onClose: () => Navigator.of(context).pop(),
      ),
    );
  }
}

/// Core Chat Center View matching the PBL6 Web Marketplace design
class ChatCenterView extends ConsumerStatefulWidget {
  const ChatCenterView({
    super.key,
    required this.isPage,
    required this.onClose,
    this.initialPrompt,
    this.productContext,
  });

  final bool isPage;
  final VoidCallback onClose;
  final String? initialPrompt;
  final Map<String, dynamic>? productContext;

  @override
  ConsumerState<ChatCenterView> createState() => _ChatCenterViewState();
}

class _ChatCenterViewState extends ConsumerState<ChatCenterView> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];

  bool _isTyping = false;
  String? _sessionId;
  String? _chatKey;
  int _activeTab = 0; // 0: Trợ lý AI, 1: Gian hàng
  bool _isExpanded = false;

  // Selected store for Store Chat tab
  String? _selectedStoreName;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      if (mounted) setState(() {});
    });

    if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _handleSend(widget.initialPrompt!);
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
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
    _scrollToBottom();

    if (_activeTab == 1) {
      // Store chat response simulation
      await Future.delayed(const Duration(milliseconds: 700));
      if (!mounted) return;
      setState(() {
        _isTyping = false;
        _messages.add({
          'isUser': false,
          'senderName': _selectedStoreName ?? 'Gian hàng',
          'text':
              'Cảm ơn bạn đã nhắn tin cho gian hàng. Tư vấn viên sẽ phản hồi bạn trong ít phút! Nếu cần hỗ trợ khẩn cấp, bạn có thể gọi hotline của shop.',
        });
      });
      _scrollToBottom();
      return;
    }

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
            'text': 'Không thể kết nối đến máy chủ trợ lý AI. Vui lòng kiểm tra lại kết nối mạng.',
          });
        });
        _scrollToBottom();
        return;
      }

      final res = await client.sendChatMessage(
        _sessionId!,
        query,
        chatKey: _chatKey,
      );

      final answerText = res['content']?.toString() ?? 'Dưới đây là một số gợi ý phù hợp cho bạn:';
      final productCards = res['product_cards'] as List? ?? [];
      final suggestions = <Map<String, dynamic>>[];

      for (final card in productCards.take(6)) {
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
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isTyping = false;
        _messages.add({
          'isUser': false,
          'text': 'Đã có lỗi khi kết nối với Trợ lý AI: $e',
        });
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 1. Top Window Control Header (matches Web Screenshot)
        _buildWindowHeader(),

        const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),

        // 2. Tab Bar: [🤖 Trợ lý AI]  [🏬 Gian hàng]
        _buildTabBar(),

        // 3. Subheader Channel Info Card
        _buildSubheaderCard(),

        const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),

        // 4. Main Body: Empty State or Message List
        Expanded(
          child: _activeTab == 0 ? _buildAiChatBody() : _buildStoreChatBody(),
        ),

        // 5. Input Box Container & Disclaimer Footer
        _buildInputArea(),
      ],
    );
  }

  /// Window Header matching Web screenshot
  Widget _buildWindowHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: Colors.white,
      child: Row(
        children: [
          // Terracotta Chat Icon
          Container(
            padding: const EdgeInsets.all(4),
            child: const Icon(
              Icons.chat_bubble_outline_rounded,
              color: Color(0xFFBA3416),
              size: 22,
            ),
          ),
          const SizedBox(width: 8),
          const Text(
            'Trung tâm chat',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
              letterSpacing: -0.2,
            ),
          ),
          const Spacer(),
          // Window Control Icons: Expand, Minimize, Close
          IconButton(
            icon: Icon(
              _isExpanded ? Icons.close_fullscreen_rounded : Icons.open_in_full_rounded,
              size: 18,
              color: const Color(0xFF64748B),
            ),
            tooltip: 'Phóng to',
            visualDensity: VisualDensity.compact,
            onPressed: () {
              setState(() => _isExpanded = !_isExpanded);
            },
          ),
          IconButton(
            icon: const Icon(
              Icons.remove_rounded,
              size: 20,
              color: Color(0xFF64748B),
            ),
            tooltip: 'Thu nhỏ',
            visualDensity: VisualDensity.compact,
            onPressed: widget.onClose,
          ),
          IconButton(
            icon: const Icon(
              Icons.close_rounded,
              size: 20,
              color: Color(0xFF64748B),
            ),
            tooltip: 'Đóng',
            visualDensity: VisualDensity.compact,
            onPressed: widget.onClose,
          ),
        ],
      ),
    );
  }

  /// Tab bar switcher matching Web screenshot
  Widget _buildTabBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      color: Colors.white,
      child: Row(
        children: [
          // Tab 0: Trợ lý AI
          InkWell(
            onTap: () => setState(() => _activeTab = 0),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: _activeTab == 0 ? const Color(0xFFFBF2ED) : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _activeTab == 0 ? const Color(0xFFF3D5C5) : Colors.transparent,
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.smart_toy_outlined,
                    size: 16,
                    color: _activeTab == 0 ? const Color(0xFFBA3416) : const Color(0xFF64748B),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Trợ lý AI',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _activeTab == 0 ? const Color(0xFFBA3416) : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Tab 1: Gian hàng
          InkWell(
            onTap: () => setState(() => _activeTab = 1),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: _activeTab == 1 ? const Color(0xFFFBF2ED) : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _activeTab == 1 ? const Color(0xFFF3D5C5) : Colors.transparent,
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.storefront_outlined,
                    size: 16,
                    color: _activeTab == 1 ? const Color(0xFFBA3416) : const Color(0xFF64748B),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Gian hàng',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _activeTab == 1 ? const Color(0xFFBA3416) : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Subheader card with channel icon and description
  Widget _buildSubheaderCard() {
    final isAi = _activeTab == 0;
    final title = isAi ? 'Trợ lý mua sắm' : (_selectedStoreName ?? 'Hỗ trợ từ Gian hàng');
    final subtitle = isAi
        ? 'Tìm sản phẩm theo nhu cầu của bạn'
        : 'Trao đổi và nhận tư vấn trực tiếp từ người bán';

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
      color: Colors.white,
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFFFBF2ED),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFF3D5C5), width: 1),
            ),
            child: Center(
              child: Icon(
                isAi ? Icons.chat_bubble_outline_rounded : Icons.storefront_outlined,
                color: const Color(0xFFBA3416),
                size: 18,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          if (!isAi && _selectedStoreName != null)
            TextButton(
              onPressed: () => setState(() => _selectedStoreName = null),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('Đổi shop', style: TextStyle(fontSize: 12, color: Color(0xFFBA3416))),
            ),
        ],
      ),
    );
  }

  /// AI Chat Body: Empty State or Message List
  Widget _buildAiChatBody() {
    if (_messages.isEmpty && widget.productContext == null) {
      return SingleChildScrollView(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              // Centered Shopping Bag Squircle Badge
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF5EE),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE8DFD3), width: 1.5),
                ),
                child: const Center(
                  child: Icon(
                    Icons.shopping_bag_outlined,
                    color: Color(0xFF9A6A38),
                    size: 28,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Uppercase Subtitle
              const Text(
                'TRỢ LÝ PBL6',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.8,
                  color: Color(0xFF8C7E74),
                ),
              ),
              const SizedBox(height: 10),

              // Main Bold Heading
              const Text(
                'Bạn đang tìm\nsản phẩm gì?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 12),

              // Description
              const Text(
                'Kể một chút về món bạn cần.\nMình sẽ giúp bạn tìm trong gian hàng.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 28),

              // Quick Action Prompts (matches Web Cards)
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 380),
                child: Column(
                  children: [
                    _buildPromptActionCard(
                      icon: Icons.card_giftcard_outlined,
                      label: 'Tìm quà tặng',
                      onTap: () => _handleSend('Tìm quà tặng'),
                    ),
                    const SizedBox(height: 10),
                    _buildPromptActionCard(
                      icon: Icons.account_balance_wallet_outlined,
                      label: 'Chọn theo ngân sách',
                      onTap: () => _handleSend('Chọn theo ngân sách'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: _messages.length + (_isTyping ? 1 : 0) + (widget.productContext != null ? 1 : 0),
      itemBuilder: (context, index) {
        // Product Context Banner (if triggered from Product Detail)
        if (widget.productContext != null && index == 0) {
          return _buildProductContextBanner();
        }

        final msgIndex = widget.productContext != null ? index - 1 : index;

        // Typing indicator
        if (msgIndex == _messages.length && _isTyping) {
          return _buildTypingIndicator();
        }

        final msg = _messages[msgIndex];
        return _buildMessageItem(msg);
      },
    );
  }

  /// Store Chat Body
  Widget _buildStoreChatBody() {
    if (_selectedStoreName == null) {
      final sampleStores = [
        {
          'name': 'Mây Xanh Living',
          'category': 'Nhà cửa & Đời sống',
          'shipping': 'Đồng giá 30.000 đ',
          'rating': '4.9 ★',
          'status': 'Đang trực tuyến',
        },
        {
          'name': 'TechZone Store',
          'category': 'Thiết bị & Phụ kiện',
          'shipping': 'Miễn phí từ 500k',
          'rating': '4.8 ★',
          'status': 'Trả lời trong vài phút',
        },
        {
          'name': 'Everyday Living',
          'category': 'Gia dụng gia đình',
          'shipping': 'Đồng giá 30.000 đ',
          'rating': '4.9 ★',
          'status': 'Đang trực tuyến',
        },
      ];

      return ListView(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Chọn gian hàng để trò chuyện trực tiếp:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 12),
          ...sampleStores.map((store) {
            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              child: InkWell(
                onTap: () {
                  setState(() {
                    _selectedStoreName = store['name'];
                    _messages.clear();
                    _messages.add({
                      'isUser': false,
                      'senderName': store['name'],
                      'text':
                          'Xin chào! Cảm ơn bạn đã quan tâm đến ${store['name']}. Chúng mình có thể hỗ trợ gì cho bạn hôm nay?',
                    });
                  });
                },
                borderRadius: BorderRadius.circular(14),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFBF2ED),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF3D5C5)),
                        ),
                        child: const Center(
                          child: Icon(Icons.storefront_outlined, color: Color(0xFFBA3416), size: 22),
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
                                  store['name']!,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(width: 4),
                                const Icon(Icons.verified, color: Color(0xFFBA3416), size: 14),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${store['category']} · ${store['rating']}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              store['shipping']!,
                              style: const TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: _messages.length + (_isTyping ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == _messages.length && _isTyping) {
          return _buildTypingIndicator();
        }
        final msg = _messages[index];
        return _buildMessageItem(msg);
      },
    );
  }

  /// Action Prompt Card with arrow ↗
  Widget _buildPromptActionCard({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
          ),
          child: Row(
            children: [
              Icon(icon, color: const Color(0xFF8C7E74), size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF334155),
                  ),
                ),
              ),
              const Icon(
                Icons.north_east_rounded,
                color: Color(0xFF94A3B8),
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Product Context Banner
  Widget _buildProductContextBanner() {
    final title = widget.productContext?['title']?.toString() ?? 'Sản phẩm đang xem';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, size: 16, color: Color(0xFF64748B)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Đang hỏi về: $title',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  /// Single Chat Message Item
  Widget _buildMessageItem(Map<String, dynamic> msg) {
    final isUser = msg['isUser'] == true;
    final text = msg['text']?.toString() ?? '';
    final senderName = msg['senderName']?.toString();
    final suggestions = msg['suggestions'] as List?;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (!isUser && senderName != null)
            Padding(
              padding: const EdgeInsets.only(left: 36, bottom: 4),
              child: Text(
                senderName,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
            ),
          Row(
            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isUser) ...[
                Container(
                  width: 28,
                  height: 28,
                  margin: const EdgeInsets.only(right: 8, top: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFBF2ED),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFF3D5C5)),
                  ),
                  child: const Center(
                    child: Icon(Icons.smart_toy_outlined, color: Color(0xFFBA3416), size: 15),
                  ),
                ),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.76,
                  ),
                  decoration: BoxDecoration(
                    color: isUser ? const Color(0xFFBA3416) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isUser ? 16 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 16),
                    ),
                    border: isUser ? null : Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    text,
                    style: TextStyle(
                      color: isUser ? Colors.white : const Color(0xFF1E293B),
                      fontSize: 13.5,
                      height: 1.45,
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Product Suggestions Cards
          if (suggestions != null && suggestions.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8, left: 36),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: suggestions.map((s) {
                    final item = s as Map<String, dynamic>;
                    final pid = item['id']?.toString();
                    final imageUrl = item['image_url']?.toString();

                    return Container(
                      width: 160,
                      margin: const EdgeInsets.only(right: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(6),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
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
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                              child: Container(
                                height: 95,
                                width: double.infinity,
                                color: const Color(0xFFF8FAFC),
                                child: imageUrl != null && imageUrl.isNotEmpty
                                    ? Image.network(
                                        imageUrl,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => const Center(
                                          child: Icon(Icons.shopping_bag_outlined, color: Color(0xFF94A3B8), size: 28),
                                        ),
                                      )
                                    : const Center(
                                        child: Icon(Icons.shopping_bag_outlined, color: Color(0xFF94A3B8), size: 28),
                                      ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item['title'] ?? '',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, height: 1.3),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item['price'] ?? '',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFBA3416),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Typing indicator
  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(left: 36, top: 4, bottom: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(strokeWidth: 1.8, color: Color(0xFFBA3416)),
            ),
            SizedBox(width: 8),
            Text(
              'AI đang tìm kiếm thông tin...',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }

  /// Input area matching the Web screenshot
  Widget _buildInputArea() {
    final hasText = _controller.text.trim().isNotEmpty;
    final charCount = _controller.text.length;

    return Container(
      color: Colors.white,
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 8,
        bottom: MediaQuery.of(context).viewInsets.bottom + 10,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Rounded Border Box (matches web textarea container)
          Container(
            padding: const EdgeInsets.fromLTRB(14, 10, 10, 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
            ),
            child: Column(
              children: [
                TextField(
                  controller: _controller,
                  minLines: 1,
                  maxLines: 4,
                  maxLength: 2000,
                  textInputAction: TextInputAction.send,
                  onSubmitted: _handleSend,
                  decoration: const InputDecoration(
                    hintText: 'Bạn muốn tìm món gì?',
                    hintStyle: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF94A3B8),
                    ),
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Spacer(),
                    // Visual Resizer Indicator (from web screenshot //)
                    const Padding(
                      padding: EdgeInsets.only(right: 8, top: 4),
                      child: Icon(
                        Icons.filter_list,
                        size: 14,
                        color: Color(0xFFCBD5E1),
                      ),
                    ),
                    // Terracotta Circular Send Button with Up Arrow
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: hasText && !_isTyping ? () => _handleSend(_controller.text) : null,
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: hasText && !_isTyping ? const Color(0xFFBA3416) : const Color(0xFFE6A394),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.arrow_upward_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // Under-Input Info: Shortcuts & Counter
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Enter để gửi · Shift + Enter xuống dòng',
                  style: TextStyle(
                    fontSize: 10.5,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                Text(
                  '$charCount/2000',
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // Centered AI Disclaimer Note (matches web screenshot)
          const Text(
            'Gợi ý có hỗ trợ AI. Kiểm tra thông tin sản phẩm trước khi mua.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10.5,
              color: Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }
}

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
      backgroundColor: const Color(0xFFF6F6F6),
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
  const ChatAiModal({
    super.key,
    this.initialPrompt,
    this.productContext,
    this.initialTab = 0,
    this.initialStoreName,
  });

  final String? initialPrompt;
  final Map<String, dynamic>? productContext;
  final int initialTab;
  final String? initialStoreName;

  static Future<void> show(
    BuildContext context, {
    String? initialPrompt,
    Map<String, dynamic>? productContext,
    int initialTab = 0,
    String? initialStoreName,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChatAiModal(
        initialPrompt: initialPrompt,
        productContext: productContext,
        initialTab: initialTab,
        initialStoreName: initialStoreName,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: Color(0xFFF6F6F6),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      clipBehavior: Clip.antiAlias,
      child: ChatCenterView(
        isPage: false,
        initialPrompt: initialPrompt,
        productContext: productContext,
        initialTab: initialTab,
        initialStoreName: initialStoreName,
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
    this.initialTab = 0,
    this.initialStoreName,
  });

  final bool isPage;
  final VoidCallback onClose;
  final String? initialPrompt;
  final Map<String, dynamic>? productContext;
  final int initialTab;
  final String? initialStoreName;

  @override
  ConsumerState<ChatCenterView> createState() => _ChatCenterViewState();
}

class ChatHistoryItem {
  final String id;
  final String title;
  final DateTime createdAt;
  final List<Map<String, dynamic>> messages;

  ChatHistoryItem({
    required this.id,
    required this.title,
    required this.createdAt,
    this.messages = const [],
  });

  String get shortId {
    final clean = id.replaceAll('-', '').toUpperCase();
    if (clean.length >= 4) {
      return '#${clean.substring(clean.length - 4)}';
    }
    return '#${clean.padLeft(4, '0')}';
  }

  String get formattedTime {
    final hh = createdAt.hour.toString().padLeft(2, '0');
    final mm = createdAt.minute.toString().padLeft(2, '0');
    final dd = createdAt.day.toString().padLeft(2, '0');
    final month = createdAt.month.toString().padLeft(2, '0');
    return '$hh:$mm $dd-$month · $shortId';
  }
}

class StoreConversationItem {
  final String id;
  final String name;
  final String initials;
  final String category;
  final String rating;
  final String shipping;
  final String lastMessage;
  final String time;
  final String status;

  const StoreConversationItem({
    required this.id,
    required this.name,
    required this.initials,
    required this.category,
    required this.rating,
    required this.shipping,
    required this.lastMessage,
    required this.time,
    this.status = 'Đang trực tuyến',
  });
}

class _ChatCenterViewState extends ConsumerState<ChatCenterView> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _inputFocusNode = FocusNode();
  final List<Map<String, dynamic>> _messages = [];

  bool _isTyping = false;
  String? _sessionId;
  String? _chatKey;
  int _activeTab = 0; // 0: Trợ lý AI, 1: Gian hàng
  bool _showHistory = false;
  bool _isInputHovered = false;

  List<ChatHistoryItem> _historySessions = [];
  bool _isLoadingHistory = false;

  // Store conversations list matching Image 1
  final List<StoreConversationItem> _storeConversations = const [
    StoreConversationItem(
      id: 'store-an-nhien',
      name: 'An Nhiên Studio',
      initials: 'AN',
      category: 'Gốm sứ & Thủ công',
      rating: '5.0 ★',
      shipping: 'Đồng giá 25.000 đ',
      lastMessage: 'DEMO-CHAT-1793644239974 — Gian hàng demo đã nhận và trả lời. Bạn đang quan tâm đến sản phẩm nào của shop?',
      time: '01:30 03-11',
    ),
    StoreConversationItem(
      id: 'store-may-xanh',
      name: 'Mây Xanh Living',
      initials: 'MX',
      category: 'Nhà cửa & Đời sống',
      rating: '4.9 ★',
      shipping: 'Đồng giá 30.000 đ',
      lastMessage: 'Dạ bên em còn sẵn mẫu này đủ các màu ạ!',
      time: '14:20 02-11',
    ),
    StoreConversationItem(
      id: 'store-techzone',
      name: 'TechZone Store',
      initials: 'TZ',
      category: 'Thiết bị & Phụ kiện',
      rating: '4.8 ★',
      shipping: 'Miễn phí từ 500k',
      lastMessage: 'Sản phẩm được bảo hành chính hãng 12 tháng bạn nhé.',
      time: '09:15 01-11',
    ),
    StoreConversationItem(
      id: 'store-everyday',
      name: 'Everyday Living',
      initials: 'EL',
      category: 'Gia dụng gia đình',
      rating: '4.9 ★',
      shipping: 'Đồng giá 30.000 đ',
      lastMessage: 'Cảm ơn bạn đã nhắn tin cho gian hàng!',
      time: '18:45 30-10',
    ),
  ];

  // Selected store for Store Chat tab
  String? _selectedStoreName;

  @override
  void initState() {
    super.initState();
    _activeTab = widget.initialTab;
    _selectedStoreName = widget.initialStoreName;
    if (_selectedStoreName != null) {
      _messages.add({
        'isUser': false,
        'senderName': _selectedStoreName,
        'text': 'DEMO-CHAT-1793644239974 — Gian hàng demo đã nhận và trả lời. Bạn đang quan tâm đến sản phẩm nào của shop?',
      });
    }

    _historySessions = _getSampleHistory();
    _loadHistory();

    _controller.addListener(() {
      if (mounted) setState(() {});
    });

    _inputFocusNode.addListener(() {
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
    _inputFocusNode.dispose();
    super.dispose();
  }

  List<ChatHistoryItem> _getSampleHistory() {
    final now = DateTime.now();
    return [
      ChatHistoryItem(
        id: 'sess-e35f',
        title: 'Tư vấn mua sắm',
        createdAt: DateTime(now.year, 11, 4, 8, 9),
        messages: [
          {'isUser': true, 'text': 'Tư vấn giúp tôi điện thoại chụp ảnh đẹp dưới 15 triệu'},
          {'isUser': false, 'text': 'Dưới 15 triệu, bạn có thể tham khảo một số dòng máy chụp ảnh sắc nét, màu sắc tự nhiên và pin trâu.'},
        ],
      ),
      ChatHistoryItem(
        id: 'sess-cf8b',
        title: 'Tư vấn mua sắm',
        createdAt: DateTime(now.year, 11, 3, 9, 29),
        messages: [
          {'isUser': true, 'text': 'Tìm quà tặng sinh nhật cho bạn nữ phong cách thanh lịch'},
          {'isUser': false, 'text': 'Gợi ý quà tặng thanh lịch: túi xách mini nữ, nước hoa hương hoa cỏ nhẹ nhàng, hoặc set phụ kiện bạc.'},
        ],
      ),
      ChatHistoryItem(
        id: 'sess-db11',
        title: 'Tư vấn mua sắm',
        createdAt: DateTime(now.year, 11, 3, 9, 13),
        messages: [
          {'isUser': true, 'text': 'Bàn phím cơ văn phòng gõ êm không gây ồn'},
          {'isUser': false, 'text': 'Bạn nên chọn switch Red hoặc Silent Switch, có lót foam tiêu âm để gõ êm ái trong văn phòng.'},
        ],
      ),
      ChatHistoryItem(
        id: 'sess-f459',
        title: 'Tư vấn mua sắm',
        createdAt: DateTime(now.year, 11, 3, 8, 9),
        messages: [
          {'isUser': true, 'text': 'Tai nghe chống ồn bluetooth pin lâu'},
          {'isUser': false, 'text': 'Dưới đây là một số mẫu tai nghe chống ồn chủ động (ANC) với thời lượng pin trên 30 giờ rất được ưa chuộng.'},
        ],
      ),
      ChatHistoryItem(
        id: 'sess-3e0b',
        title: 'Tư vấn mua sắm',
        createdAt: DateTime(now.year, 11, 3, 7, 55),
        messages: [
          {'isUser': true, 'text': 'Áo sơ mi nam đi làm chất liệu cotton thoáng mát'},
          {'isUser': false, 'text': 'Gợi ý các mẫu sơ mi cotton 100% hoặc sợi tre thoáng mát, chống nhăn tốt cho dân công sở.'},
        ],
      ),
      ChatHistoryItem(
        id: 'sess-6d7e',
        title: 'Tư vấn mua sắm',
        createdAt: DateTime(now.year, 11, 3, 7, 32),
        messages: [
          {'isUser': true, 'text': 'Giày sneaker trắng đi học phối đồ đẹp'},
          {'isUser': false, 'text': 'Sneaker trắng dáng classic đơn giản là lựa chọn tuyệt vời, dễ phối với nhiều phong cách trang phục.'},
        ],
      ),
      ChatHistoryItem(
        id: 'sess-65d0',
        title: 'Tư vấn mua sắm',
        createdAt: DateTime(now.year, 11, 3, 2, 42),
        messages: [
          {'isUser': true, 'text': 'Nồi chiên không dầu dung tích lớn cho gia đình 4-6 người'},
          {'isUser': false, 'text': 'Dung tích 5L - 7L với khay nướng chống dính và cửa kính quan sát là gợi ý lý tưởng cho gia đình.'},
        ],
      ),
      ChatHistoryItem(
        id: 'sess-8f77',
        title: 'Tư vấn mua sắm',
        createdAt: DateTime(now.year, 11, 3, 2, 38),
        messages: [
          {'isUser': true, 'text': 'Đèn học để bàn bảo vệ thị lực chống cận'},
          {'isUser': false, 'text': 'Nên chọn đèn LED có chỉ số hoàn màu CRI > 90, ánh sáng liên tục không nhấp nháy và điều chỉnh được độ sáng.'},
        ],
      ),
      ...List.generate(11, (i) {
        final code = (0x9000 + i * 137).toRadixString(16).toUpperCase();
        return ChatHistoryItem(
          id: 'sess-$code',
          title: 'Tư vấn mua sắm',
          createdAt: DateTime(now.year, 11, 2, 20 - i, 15 + (i * 3) % 45),
          messages: [
            {'isUser': true, 'text': 'Gợi ý sản phẩm phù hợp ngân sách'},
            {'isUser': false, 'text': 'Dưới đây là một số sản phẩm đang có ưu đãi tốt trong gian hàng:'},
          ],
        );
      }),
    ];
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoadingHistory = true);
    try {
      final client = ref.read(apiProvider);
      final res = await client.listOwnChatSessions(page: 1, size: 20);
      final rawItems = res['items'] as List?;
      if (rawItems != null && rawItems.isNotEmpty) {
        final loaded = <ChatHistoryItem>[];
        for (final raw in rawItems) {
          if (raw is Map) {
            final id = raw['id']?.toString() ?? 'sess-0000';
            final createdAtStr = raw['created_at']?.toString();
            final createdAt = createdAtStr != null
                ? DateTime.tryParse(createdAtStr) ?? DateTime.now()
                : DateTime.now();
            final msgs = (raw['messages']?['items'] as List?) ?? [];
            final firstUserMsg = msgs.firstWhere(
              (m) => m is Map && m['role'] == 'USER',
              orElse: () => null,
            );
            final title = firstUserMsg is Map
                ? (firstUserMsg['content']?.toString() ?? 'Tư vấn mua sắm')
                : 'Tư vấn mua sắm';
            loaded.add(ChatHistoryItem(
              id: id,
              title: title.length > 30 ? '${title.substring(0, 30)}...' : title,
              createdAt: createdAt,
              messages: msgs
                  .map<Map<String, dynamic>>((m) => {
                        'isUser': m['role'] == 'USER',
                        'text': m['content']?.toString() ?? '',
                      })
                  .toList(),
            ));
          }
        }
        if (loaded.isNotEmpty) {
          if (mounted) {
            setState(() {
              _historySessions = loaded;
              _isLoadingHistory = false;
            });
            return;
          }
        }
      }
    } catch (_) {
      // Fallback
    }

    if (mounted) {
      if (_historySessions.isEmpty) {
        _historySessions = _getSampleHistory();
      }
      setState(() => _isLoadingHistory = false);
    }
  }

  void _saveCurrentSessionToHistory() {
    if (_messages.isEmpty) return;
    final sessId = _sessionId ??
        'sess-${DateTime.now().millisecondsSinceEpoch.toRadixString(16).substring(4)}';
    final firstUserMsg = _messages.firstWhere(
      (m) => m['isUser'] == true,
      orElse: () => _messages.first,
    );
    final title = firstUserMsg['text']?.toString() ?? 'Tư vấn mua sắm';
    final item = ChatHistoryItem(
      id: sessId,
      title: title.length > 30 ? '${title.substring(0, 30)}...' : title,
      createdAt: DateTime.now(),
      messages: List<Map<String, dynamic>>.from(_messages),
    );
    _historySessions.removeWhere((s) => s.id == sessId);
    _historySessions.insert(0, item);
  }

  void _startNewSession() {
    _saveCurrentSessionToHistory();
    setState(() {
      _sessionId = null;
      _chatKey = null;
      _messages.clear();
      _controller.clear();
      _showHistory = false;
      _activeTab = 0;
    });
  }

  void _openHistorySession(ChatHistoryItem item) {
    _saveCurrentSessionToHistory();
    setState(() {
      _sessionId = item.id;
      _messages.clear();
      if (item.messages.isNotEmpty) {
        _messages.addAll(item.messages);
      } else {
        _messages.add({
          'isUser': true,
          'text': item.title,
        });
        _messages.add({
          'isUser': false,
          'text':
              'Chào bạn! Dưới đây là thông tin tư vấn trong phiên chat ${item.shortId}. Bạn muốn tìm hiểu thêm về sản phẩm nào?',
        });
      }
      _showHistory = false;
    });
    _scrollToBottom();
  }

  void _selectPrompt(String promptText) {
    _controller.text = promptText;
    _controller.selection = TextSelection.fromPosition(
      TextPosition(offset: _controller.text.length),
    );
    _inputFocusNode.requestFocus();
    setState(() {});
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
    return Container(
      color: const Color(0xFFF6F6F6),
      child: Column(
        children: [
          // 1. Top Window Control Header (+, -)
          _buildWindowHeader(),

          const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

          // 2. Tab Bar: [🤖 Trợ lý AI]  [🏬 Gian hàng]
          _buildTabBar(),

          if (_activeTab == 0 && _showHistory) ...[
            // AI History View (Image 2)
            Expanded(child: _buildHistoryBody()),
          ] else if (_activeTab == 1 && _selectedStoreName == null) ...[
            // Store Conversations List matching Image 1 (NO Image 2 subheader card!)
            Expanded(child: _buildStoreConversationsList()),
          ] else ...[
            // 3. Subheader Channel Info Card (Only for AI tab - Image 2 subheader removed for Store tab)
            if (_activeTab == 0) ...[
              _buildSubheaderCard(),
              const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),
            ],

            // Active Store chat header with back button
            if (_activeTab == 1 && _selectedStoreName != null) ...[
              _buildActiveStoreHeader(),
              const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),
            ],

            // 4. Main Body: Empty State or Message List
            Expanded(
              child: _activeTab == 0 ? _buildAiChatBody() : _buildStoreChatMessagesBody(),
            ),

            // 5. Input Box Container & Disclaimer Footer
            _buildInputArea(),
          ],
        ],
      ),
    );
  }

  /// Window Header: only + (new session) and - (minimize)
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
          // + Button: Start new chat session
          IconButton(
            icon: const Icon(
              Icons.add_rounded,
              size: 22,
              color: Color(0xFF64748B),
            ),
            tooltip: 'Phiên mới',
            visualDensity: VisualDensity.compact,
            onPressed: _startNewSession,
          ),
          // - Button: Minimize / close modal
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
            onTap: () {
              if (_activeTab == 0) {
                // Click lại vào "Trợ lý AI" -> toggle xem lịch sử câu hỏi như ảnh 2
                setState(() {
                  _showHistory = !_showHistory;
                });
                if (_showHistory && _historySessions.isEmpty) {
                  _loadHistory();
                }
              } else {
                setState(() {
                  _activeTab = 0;
                  _showHistory = false;
                });
              }
            },
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
            onTap: () => setState(() {
              _activeTab = 1;
              _showHistory = false;
            }),
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
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // White Card wrapping Welcome Intro content
              Container(
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 380),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(4),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  children: [
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
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Quick Action Prompts (matches Web Cards)
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 380),
                child: Column(
                  children: [
                    _buildPromptActionCard(
                      icon: Icons.card_giftcard_outlined,
                      label: 'Tìm quà tặng',
                      onTap: () => _selectPrompt('Tìm quà tặng '),
                    ),
                    const SizedBox(height: 10),
                    _buildPromptActionCard(
                      icon: Icons.account_balance_wallet_outlined,
                      label: 'Chọn theo ngân sách',
                      onTap: () => _selectPrompt('Chọn theo ngân sách '),
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

  /// Active Store Chat Header with Back Button
  Widget _buildActiveStoreHeader() {
    final store = _storeConversations.firstWhere(
      (s) => s.name == _selectedStoreName,
      orElse: () => StoreConversationItem(
        id: 'store-custom',
        name: _selectedStoreName ?? 'Gian hàng',
        initials: _selectedStoreName != null && _selectedStoreName!.isNotEmpty
            ? _selectedStoreName!.substring(0, 1).toUpperCase()
            : 'GH',
        category: 'Gian hàng đối tác',
        rating: '5.0 ★',
        shipping: 'Đồng giá ship',
        lastMessage: '',
        time: '',
      ),
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      color: Colors.white,
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_rounded, size: 20, color: Color(0xFF334155)),
            tooltip: 'Quay lại hội thoại',
            visualDensity: VisualDensity.compact,
            onPressed: () => setState(() => _selectedStoreName = null),
          ),
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFEFECE6),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Text(
                store.initials,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF4A627A),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        store.name,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E293B),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.verified, color: Color(0xFFBA3416), size: 14),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      store.status,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '· ${store.rating}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFFD97706), fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => setState(() => _selectedStoreName = null),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('Đổi shop', style: TextStyle(fontSize: 12, color: Color(0xFFBA3416), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  /// Store Conversations List matching Image 1 (Hội thoại + badge count)
  Widget _buildStoreConversationsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header: "Hội thoại" + Badge pill matching Image 1
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
          child: Row(
            children: [
              const Text(
                'Hội thoại',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFECE6),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${_storeConversations.length}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF475569),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Conversation items list matching Image 1
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            itemCount: _storeConversations.length,
            itemBuilder: (context, index) {
              final store = _storeConversations[index];
              return Container(
                margin: const EdgeInsets.symmetric(vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(4),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _selectedStoreName = store.name;
                      _messages.clear();
                      _messages.add({
                        'isUser': false,
                        'senderName': store.name,
                        'text': store.lastMessage,
                      });
                    });
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Square rounded avatar with initials (AN, MX, etc.) matching Image 1
                      Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFECE6),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            store.initials,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF4A627A),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Row 1: Store name & Rating badge
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Flexible(
                                  child: Text(
                                    store.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14.5,
                                      color: Color(0xFF1E293B),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    store.rating,
                                    style: const TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFD97706),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            // Row 2: Timestamp & Category
                            Row(
                              children: [
                                Text(
                                  store.time,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                const Text(
                                  ' · ',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFFCBD5E1),
                                  ),
                                ),
                                Flexible(
                                  child: Text(
                                    store.category,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF64748B),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            // Row 3: Last Message snippet & Shipping / promo badge
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    store.lastMessage,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF64748B),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFECFDF5),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: const Color(0xFFA7F3D0), width: 0.8),
                                  ),
                                  child: Text(
                                    store.shipping,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF047857),
                                    ),
                                  ),
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
            },
          ),
        ),
      ],
    );
  }

  /// Store Chat Messages Body
  Widget _buildStoreChatMessagesBody() {
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(4),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
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
                    color: isUser ? const Color(0xFFBA3416) : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isUser ? 16 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 16),
                    ),
                    border: isUser ? null : Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: isUser
                        ? null
                        : [
                            BoxShadow(
                              color: Colors.black.withAlpha(4),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(4),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
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

  /// History Body matching Image 2
  Widget _buildHistoryBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header: "Lịch sử của bạn" + Badge count (e.g. 19)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            children: [
              const Text(
                'Lịch sử của bạn',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${_historySessions.length}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF475569),
                  ),
                ),
              ),
            ],
          ),
        ),

        // "+ Phiên mới" Button matching Image 2
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: InkWell(
            onTap: _startNewSession,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              height: 44,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFC2410C), width: 1.2),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_rounded, color: Color(0xFFC2410C), size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Phiên mới',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFC2410C),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Scrollable Session List
        Expanded(
          child: _isLoadingHistory && _historySessions.isEmpty
              ? const Center(
                  child: CircularProgressIndicator(color: Color(0xFFBA3416)),
                )
              : Scrollbar(
                  thumbVisibility: true,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    itemCount: _historySessions.length,
                    itemBuilder: (context, index) {
                      final session = _historySessions[index];
                      final isCurrent = session.id == _sessionId;
                      return Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isCurrent ? const Color(0xFFC2410C) : const Color(0xFFE2E8F0),
                            width: isCurrent ? 1.2 : 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(4),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: InkWell(
                          onTap: () => _openHistorySession(session),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                            child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.only(top: 2),
                                child: Icon(
                                  Icons.chat_bubble_outline_rounded,
                                  size: 19,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      session.title,
                                      style: TextStyle(
                                        fontSize: 14.5,
                                        fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w600,
                                        color: isCurrent ? const Color(0xFFC2410C) : const Color(0xFF1E293B),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      session.formattedTime,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF64748B),
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
                    },
                  ),
                ),
        ),
      ],
    );
  }

  /// Input area matching the Web screenshot
  Widget _buildInputArea() {
    final hasText = _controller.text.trim().isNotEmpty;
    final charCount = _controller.text.length;
    final isFocusedOrHovered = _inputFocusNode.hasFocus || _isInputHovered;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
      ),
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 8,
        bottom: MediaQuery.of(context).viewInsets.bottom + 10,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Rounded Border Box with hover/focus border color change
          MouseRegion(
            onEnter: (_) => setState(() => _isInputHovered = true),
            onExit: (_) => setState(() => _isInputHovered = false),
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 10, 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: isFocusedOrHovered ? const Color(0xFFBA3416) : const Color(0xFFE2E8F0),
                  width: isFocusedOrHovered ? 1.5 : 1.2,
                ),
                boxShadow: _inputFocusNode.hasFocus
                    ? [
                        BoxShadow(
                          color: const Color(0xFFBA3416).withValues(alpha: 0.08),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Column(
                children: [
                  TextField(
                    focusNode: _inputFocusNode,
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
                      filled: false,
                      fillColor: Colors.transparent,
                      contentPadding: EdgeInsets.zero,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
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
          ),

          const SizedBox(height: 6),

          // Under-Input Info: Character Counter (removed "Enter để gửi...")
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                '$charCount/2000',
                style: const TextStyle(
                  fontSize: 10.5,
                  color: Color(0xFF94A3B8),
                ),
              ),
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

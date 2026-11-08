import '../../core/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../chat/chat_ai_modal.dart';

class StoreMessagesPage extends ConsumerStatefulWidget {
  const StoreMessagesPage({super.key});

  @override
  ConsumerState<StoreMessagesPage> createState() => _StoreMessagesPageState();
}

class _StoreMessagesPageState extends ConsumerState<StoreMessagesPage> {
  late final ScrollController _navScrollCtrl;

  @override
  void initState() {
    super.initState();
    // Scroll so active tab "Tin nhắn" is centered and visible on entrance
    _navScrollCtrl = ScrollController(initialScrollOffset: 230);
  }

  @override
  void dispose() {
    _navScrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Tin nhắn với gian hàng',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: Color(0xFF0F172A),
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF8C7E74), size: 22),
            onPressed: () => ChatAiModal.show(context),
            tooltip: 'Trung tâm chat',
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Horizontal Sub-Navigation Tabs matching Web Screenshot
            _buildSubNavTabs(context),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 2. Header Section matching Web Screenshot
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Tin nhắn với gian hàng',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                                letterSpacing: -0.3,
                              ),
                            ),
                            SizedBox(height: 6),
                            Text(
                              'Trao đổi về sản phẩm, đơn hàng và hỗ trợ sau mua.',
                              style: TextStyle(
                                fontSize: 13.5,
                                color: Color(0xFF64748B),
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(8),
                        child: const Icon(
                          Icons.chat_bubble_outline_rounded,
                          color: Color(0xFF8C7E74),
                          size: 24,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // 3. Conversation Card Container matching Web Screenshot
                  _buildConversationsCard(context),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Horizontal Sub-Navigation Tabs matching Web
  Widget _buildSubNavTabs(BuildContext context) {
    final tabs = [
      {'label': 'Tổng quan', 'active': false},
      {'label': 'Thông tin cá nhân', 'active': false},
      {'label': 'Đơn hàng', 'active': false},
      {'label': 'Yêu thích', 'active': false},
      {'label': 'Đánh giá của tôi', 'active': false},
      {'label': 'Tin nhắn', 'active': true},
      {'label': 'Thông báo', 'active': false},
    ];

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
        ),
      ),
      child: SingleChildScrollView(
        controller: _navScrollCtrl,
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: tabs.map((tab) {
            final isActive = tab['active'] as bool;
            final label = tab['label'] as String;

            return Padding(
              padding: const EdgeInsets.only(right: 6),
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () {
                  if (label == 'Tổng quan') {
                    Navigator.pop(context);
                  } else if (label == 'Thông tin cá nhân') {
                    Navigator.pushReplacementNamed(context, '/edit-profile');
                  } else if (label == 'Đơn hàng') {
                    Navigator.pushNamed(context, '/orders');
                  } else if (label == 'Yêu thích') {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Danh sách sản phẩm yêu thích')),
                    );
                  } else if (label == 'Đánh giá của tôi') {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Đánh giá của tôi')),
                    );
                  } else if (label == 'Thông báo') {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Không có thông báo mới.')),
                    );
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFFFBF2ED) : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      color: isActive ? const Color(0xFFBA3416) : const Color(0xFF475569),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  /// Conversations Card matching Web Screenshot
  Widget _buildConversationsCard(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card Header: "Hội thoại" and Badge "1"
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Hội thoại',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  '1',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Conversation Item 1: An Nhiên Studio (matches Web Screenshot)
          _buildConversationTile(
            context,
            initials: 'AN',
            storeName: 'An Nhiên Studio',
            time: '01:30 03-11',
            message: 'DEMO-CHAT-1793644239974 — Gian hàng demo đã nhận và trả lời.',
          ),
          const SizedBox(height: 10),

          // Conversation Item 2: Mây Xanh Living
          _buildConversationTile(
            context,
            initials: 'MX',
            storeName: 'Mây Xanh Living',
            time: 'Hôm qua',
            message: 'Ấm trà kim loại hình học đang có sẵn hàng bạn nhé!',
          ),
        ],
      ),
    );
  }

  Widget _buildConversationTile(
    BuildContext context, {
    required String initials,
    required String storeName,
    required String time,
    required String message,
  }) {
    return Material(
      color: const Color(0xFFFAF6F2),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () {
          ChatAiModal.show(
            context,
            initialTab: 1,
            initialStoreName: storeName,
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFEFE7DE), width: 1),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar Squircle
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFEAE3DD),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF574E45),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      storeName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      time,
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      message,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        height: 1.35,
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
}

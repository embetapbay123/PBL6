import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

class OrderTermsPage extends StatefulWidget {
  final bool initialAgreed;

  const OrderTermsPage({
    super.key,
    this.initialAgreed = false,
  });

  @override
  State<OrderTermsPage> createState() => _OrderTermsPageState();
}

class _OrderTermsPageState extends State<OrderTermsPage> {
  late bool _agreed;

  @override
  void initState() {
    super.initState();
    _agreed = widget.initialAgreed;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text(
          'Điều khoản đặt hàng',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new,
            size: 18,
            color: AppColors.textPrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Summary Card - No icon
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.primary.withOpacity(0.08),
                          AppColors.primary.withOpacity(0.02),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.25),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Điều khoản & Quy định Mua sắm',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Áp dụng cho mọi giao dịch đặt hàng trên nền tảng PBL6. Cập nhật lần cuối: 10/11/2026.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: Colors.grey.shade700,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Section 1
                  _buildSection(
                    step: '1',
                    title: 'Quy định chung & Xác nhận đơn hàng',
                    content:
                        'Bằng việc nhấn "Đặt hàng", quý khách xác nhận đã kiểm tra kỹ thông tin người nhận, số điện thoại, địa chỉ giao hàng và danh sách sản phẩm. Hợp đồng mua bán chính thức có hiệu lực kể từ thời điểm hệ thống ghi nhận đơn hàng thành công.',
                  ),

                  // Section 2
                  _buildSection(
                    step: '2',
                    title: 'Báo giá & Thời hạn giữ giá (Quote Expiry)',
                    content:
                        'Giá trị đơn hàng, phí vận chuyển và số tiền giảm giá từ Voucher được hệ thống tính toán theo thời gian thực (Real-time Quote) và có giá trị hiệu lực trong vòng 15 phút. Nếu báo giá hết hạn trước khi xác nhận đặt hàng, hệ thống sẽ tự động cập nhật lại theo mức giá và tồn kho thực tế mới nhất.',
                  ),

                  // Section 3
                  _buildSection(
                    step: '3',
                    title: 'Đơn hàng đa cửa hàng (Multi-Store)',
                    content:
                        'Đối với giỏ hàng gồm sản phẩm từ nhiều Cửa hàng khác nhau, đơn hàng sẽ được phân chia độc lập theo từng Cửa hàng. Mỗi Cửa hàng có trách nhiệm chuẩn bị hàng, đóng gói và gửi hàng riêng biệt. Thời gian giao hàng có thể khác nhau giữa các cửa hàng.',
                  ),

                  // Section 4
                  _buildSection(
                    step: '4',
                    title: 'Phương thức thanh toán & Đảm bảo an toàn',
                    content:
                        '• Thanh toán khi nhận hàng (COD): Quý khách thanh toán tiền mặt trực tiếp cho nhân viên bưu tá khi nhận kiện hàng.\n• Thanh toán trực tuyến (Sandbox / Cổng thanh toán): Khoản tiền được tạm giữ an toàn trong hệ thống và chỉ được quyết toán cho Cửa hàng sau khi đơn hàng được giao thành công hoặc hết hạn khiếu nại.',
                  ),

                  // Section 5
                  _buildSection(
                    step: '5',
                    title: 'Chính sách Voucher & Khuyến mại',
                    content:
                        '• Voucher toàn sàn: Áp dụng trên tổng giá trị hàng hóa của tất cả các cửa hàng đủ điều kiện.\n• Voucher cửa hàng: Chỉ có giá trị khấu trừ cho sản phẩm của chính cửa hàng phát hành.\n• Mỗi đơn hàng được áp dụng tối đa 01 voucher sàn kết hợp với 01 voucher cho mỗi cửa hàng. Voucher không thể quy đổi thành tiền mặt.',
                  ),

                  // Section 6
                  _buildSection(
                    step: '6',
                    title: 'Giao nhận & Kiểm tra hàng hóa',
                    content:
                        'Quý khách được quyền kiểm tra tình trạng ngoại quan gói hàng (bao bì, tem niêm phong) trước khi nhận. Khuyến nghị quý khách quay video mở hộp rõ ràng không ngắt quãng để làm bằng chứng bảo vệ quyền lợi nếu xảy ra sự cố hư hỏng hoặc thiếu hàng.',
                  ),

                  // Section 7
                  _buildSection(
                    step: '7',
                    title: 'Hủy đơn, Đổi trả & Hoàn tiền',
                    content:
                        '• Hủy đơn: Quý khách có thể tự thao tác hủy đơn khi Cửa hàng chưa xử lý đóng gói.\n• Đổi trả & Hoàn tiền: Được hỗ trợ trong vòng 07 ngày kể từ ngày nhận hàng thành công nếu sản phẩm lỗi, sai phân loại, bể vỡ do vận chuyển hoặc khác biệt mô tả.',
                  ),

                  // Section 8
                  _buildSection(
                    step: '8',
                    title: 'Bảo mật thông tin & Hỗ trợ khiếu nại',
                    content:
                        'Thông tin cá nhân và dữ liệu thanh toán của quý khách được bảo mật tuyệt đối theo tiêu chuẩn mã hóa dữ liệu. Nếu có bất kỳ thắc mắc hoặc sự cố phát sinh, vui lòng liên hệ Trung tâm Trợ giúp PBL6 hoặc chat trực tiếp với Cửa hàng để được hỗ trợ kịp thời.',
                  ),

                  const SizedBox(height: 8),

                  // Checkbox Tôi đã hiểu và đồng ý
                  InkWell(
                    onTap: () => setState(() => _agreed = !_agreed),
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _agreed,
                              activeColor: AppColors.primary,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                              onChanged: (val) {
                                setState(() => _agreed = val ?? false);
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'Tôi đã hiểu và đồng ý',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // Bottom Bar - Button Xác nhận
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                width: double.infinity,
                height: 46,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    disabledBackgroundColor: Colors.grey.shade300,
                    disabledForegroundColor: Colors.grey.shade500,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: _agreed
                      ? () => Navigator.pop(context, true)
                      : null,
                  child: const Text(
                    'Xác nhận',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection({
    required String step,
    required String title,
    required String content,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200, width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    step,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade700,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

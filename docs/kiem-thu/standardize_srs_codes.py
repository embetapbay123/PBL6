import openpyxl
from openpyxl.styles import Alignment
import shutil
import math

def standardize():
    file_path = r'C:\Users\congh\Downloads\Test Report.xlsx'
    out_main_path = r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
    out_copy_path = r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx'

    mapping = {
        ('Xac_Thuc', 'U04'): '[FR-AUTH-01] Kiểm tra email: phân vùng hợp lệ/không hợp lệ, TLD, ký tự lạ.',
        ('Xac_Thuc', 'U07'): '[FR-AUTH-02; BR-35] Kiểm tra độ dài refresh_token và thời hạn thu hồi.',
        ('Xac_Thuc', 'API08'): '[NFR-SEC-05; BR-35] Kiểm tra giới hạn đăng nhập 30 request/phút/IP chống brute-force.',
        ('Xac_Thuc', 'API11'): '[FR-AUTH-01; NFR-REL-01] Kiểm tra xử lý lỗi khi email adapter gặp sự cố.',
        ('Xac_Thuc', 'W01'): '[FR-AUTH-02] Kiểm tra form đăng nhập: validate phía client.',
        ('Xac_Thuc', 'W02'): '[FR-AUTH-01] Kiểm tra xác minh email đúng token kích hoạt.',
        ('Xac_Thuc', 'W03'): '[FR-AUTH-02; BR-05] Kiểm tra đổi tài khoản không rò rỉ LocalStorage của phiên trước.',
        ('Xac_Thuc', 'AND02'): '[FR-AUTH-01/02/03] Kiểm tra đăng nhập/đăng ký/quên mật khẩu trên Android.',
        ('Xac_Thuc', 'AND03'): '[FR-AUTH-02; NFR-SEC-01] Kiểm tra cơ chế refresh token ngầm khi hết hạn trên Mobile.',
        ('Cua_Hang_Quan_Tri', 'API14'): '[FR-STORE-07; BR-04] Kiểm tra permissions lời mời nhân viên ngoài miền quyền cho phép.',
        ('Cua_Hang_Quan_Tri', 'W22'): '[FR-ADMIN-01/02; BR-34] Kiểm tra admin portal: tab theo URL và quản lý User/Store.',
        ('Cua_Hang_Quan_Tri', 'W23'): '[FR-STORE-06; BR-33] Kiểm tra admin duyệt đơn mở Store và danh mục hệ thống.',
        ('San_Pham_Kho', 'U33'): '[FR-INV-02; BR-04] Kiểm tra bắt buộc nhập lý do khi điều chỉnh tồn kho.',
        ('San_Pham_Kho', 'U34'): '[FR-INV-01; BR-10] Kiểm tra giới hạn lưu trữ tồn kho khả dụng int32.',
        ('San_Pham_Kho', 'API18'): '[FR-MPROD-02; BR-09] Kiểm tra tạo Product và SKU: giá trị biên các trường.',
        ('San_Pham_Kho', 'API20'): '[FR-MPROD-04] Kiểm tra quản lý ảnh Product: số lượng tối đa và định dạng URL.',
        ('San_Pham_Kho', 'API23'): '[FR-INV-03] Kiểm tra danh sách biến động kho theo khoảng thời gian [from, to).',
        ('San_Pham_Kho', 'API24'): '[FR-INV-02; BR-39] Kiểm tra duyệt stock request với version cũ (khóa lạc quan).',
        ('San_Pham_Kho', 'INT05'): '[FR-ORDER-02; BR-10/24] Kiểm tra hủy đơn sau consume -> hoàn tồn kho 1 lần duy nhất.',
        ('San_Pham_Kho', 'W04'): '[FR-CAT-01/02; BR-12] Kiểm tra catalog: tìm kiếm, lọc theo thuộc tính, sắp xếp, phân trang.',
        ('San_Pham_Kho', 'W05'): '[FR-PROD-01; BR-08] Kiểm tra chọn Variant thuộc tính động trên trang chi tiết.',
        ('San_Pham_Kho', 'W18'): '[FR-MPROD-02/05] Kiểm tra form tạo/sửa Product phía Seller.',
        ('San_Pham_Kho', 'W19'): '[FR-INV-02; BR-04] Kiểm tra điều chỉnh kho có kiểm soát version.',
        ('San_Pham_Kho', 'AND04'): '[FR-CAT-01; FR-PROD-01] Kiểm tra catalog, tìm kiếm, xem chi tiết sản phẩm trên Android.',
        ('Gio_Hang_Dat_Hang', 'U37'): '[FR-CART-01; BR-10] Kiểm tra số lượng thêm vào giỏ hàng (1 đến tồn khả dụng).',
        ('Gio_Hang_Dat_Hang', 'U39'): '[FR-CART-01; BR-08] Kiểm tra chặn thêm variant không thuộc Product vào giỏ.',
        ('Gio_Hang_Dat_Hang', 'API25'): '[FR-CHECKOUT-01; BR-01] Kiểm tra số dòng giỏ khi quote và tạo đơn đa Store.',
        ('Gio_Hang_Dat_Hang', 'API29'): '[FR-CHECKOUT-02; BR-18] Kiểm tra thời hạn hiệu lực quote đơn hàng 15 phút.',
        ('Gio_Hang_Dat_Hang', 'W06'): '[FR-CART-02] Kiểm tra bộ tăng/giảm số lượng trong giỏ hàng.',
        ('Gio_Hang_Dat_Hang', 'W07'): '[FR-CART-03; NFR-PERF-01] Kiểm tra hiển thị và thao tác giỏ hàng lớn hơn 100 dòng.',
        ('Gio_Hang_Dat_Hang', 'W08'): '[FR-CHECKOUT-03; BR-18] Kiểm tra quote thanh toán gắn liền với đúng dữ liệu đầu vào.',
        ('Gio_Hang_Dat_Hang', 'W09'): '[FR-CHECKOUT-06; BR-19] Kiểm tra mất mạng khi xác nhận đơn (Idempotency chống trùng đơn).',
        ('Gio_Hang_Dat_Hang', 'W10'): '[FR-CHECKOUT-01; BR-01/02] Kiểm tra checkout hai Store phối hợp COD và SePay Sandbox.',
        ('Gio_Hang_Dat_Hang', 'AND05'): '[FR-CART-01/02] Kiểm tra giỏ hàng và điều chỉnh số lượng trên Android.',
        ('Gio_Hang_Dat_Hang', 'AND07'): '[FR-CHECKOUT-01; BR-01] Kiểm tra quy trình đặt hàng và chọn địa chỉ trên Android.',
        ('Voucher', 'U13'): '[FR-VCH-01; BR-27] Kiểm tra validation loại giảm giá và định dạng mã voucher.',
        ('Voucher', 'W21'): '[FR-VCH-01/02; BR-28] Kiểm tra giao diện quản lý voucher Store của Owner.',
        ('Don_Hang', 'U25'): '[FR-ORDER-02; BR-39] Kiểm tra to_status chuyển trạng thái đơn hàng ngoài miền cho phép.',
        ('Don_Hang', 'U26'): '[FR-SORDER-02; BR-39] Kiểm tra bắt buộc thông tin vận chuyển khi chuyển SHIPPED.',
        ('Don_Hang', 'U29'): '[FR-ORDER-03; BR-24] Kiểm tra độ dài và validation lý do hủy đơn hàng.',
        ('Don_Hang', 'API30'): '[FR-ORDER-01] Kiểm tra tìm kiếm đơn hàng theo từ khóa q.',
        ('Don_Hang', 'API31'): '[FR-SORDER-01] Kiểm tra lọc đơn hàng Store theo khoảng thời gian [from, to).',
        ('Don_Hang', 'INT03'): '[NFR-REL-04; BR-41] Kiểm tra xử lý phục hồi khi worker crash/mất ACK RabbitMQ.',
        ('Don_Hang', 'W13'): '[FR-ORDER-01; UC-ORDER-DETAIL] Kiểm tra lịch sử và chi tiết đơn hàng theo UUID.',
        ('Don_Hang', 'W20'): '[FR-SORDER-02; BR-17] Kiểm tra Seller xử lý đơn hàng và xác nhận thu COD.',
        ('Thanh_Toan', 'U44'): '[FR-PAY-01; BR-21] Kiểm tra chữ ký HMAC và độ lệch thời gian callback SePay.',
        ('Thanh_Toan', 'U46'): '[FR-PAY-02; BR-16] Kiểm tra mã QR chỉ tạo cho số tiền dương an toàn.',
        ('Thanh_Toan', 'U47'): '[FR-PAY-04; BR-40] Kiểm tra trạng thái Refund độc lập, không hiển thị thành công giả.',
        ('Thanh_Toan', 'API38'): '[FR-PAY-04; BR-25/26] Kiểm tra cơ chế mock refund an toàn khi chưa bật gateway thật.',
        ('Thanh_Toan', 'W11'): '[FR-PAY-01; UC-PAY-SANDBOX] Kiểm tra hiển thị VietQR và polling trạng thái thanh toán SePay.',
        ('Thanh_Toan', 'W12'): '[FR-PAY-04; UC-REFUND-VIEW] Kiểm tra giao diện hiển thị trạng thái Refund của đơn hủy.',
        ('Danh_Gia', 'U40'): '[FR-REV-01; BR-37] Kiểm tra điểm đánh giá hợp lệ từ 1 đến 5 sao.',
        ('Danh_Gia', 'U41'): '[FR-REV-01; BR-37] Kiểm tra độ dài và nội dung nhận xét đánh giá.',
        ('Danh_Gia', 'W15'): '[FR-REV-01; BR-37] Kiểm tra form đánh giá sản phẩm sau khi đơn hoàn tất COMPLETED.',
        ('AI_Chatbot', 'U48'): '[FR-AI-01] Kiểm tra độ dài tin nhắn chat tư vấn (1 đến 2.000 ký tự).',
        ('AI_Chatbot', 'U49'): '[FR-AI-02; NFR-PRIV-01] Kiểm tra định dạng X-Chat-Key 64 hex của Guest.',
        ('AI_Chatbot', 'U51'): '[NFR-AI-01; NFR-REL-01] Kiểm tra middleware truyền correlation ID vào service AI.',
        ('AI_Chatbot', 'API45'): '[FR-ADMIN-06] Kiểm tra API thống kê metrics AI theo phạm vi thời gian.',
        ('AI_Chatbot', 'INT06'): '[FR-REC-01; BR-20] Kiểm tra sự kiện orderCompleted qua MQ cập nhật gợi ý M4 dedup.',
        ('AI_Chatbot', 'W16'): '[FR-AI-01/04] Kiểm tra giao diện chat AI và hiển thị card sản phẩm gợi ý.',
        ('AI_Chatbot', 'W17'): '[NFR-PRIV-01/02] Kiểm tra popup đồng ý/rút consent thu thập dữ liệu cá nhân hóa.',
        ('AI_Chatbot', 'EVAL01'): '[NFR-AI-01; FR-AI-05] Kiểm tra đánh giá benchmark RAG (độ tin cậy và hallucination).',
        ('AI_Chatbot', 'EVAL02'): '[FR-REC-09/10/11; BR-20] Kiểm tra mô hình gợi ý CF/MF so với baseline offline.',
        ('Chung_API_UI', 'API02'): '[NFR-API-01] Kiểm tra cấu trúc định dạng lỗi thống nhất RFC 7807.',
        ('Chung_API_UI', 'API04'): '[NFR-API-01] Kiểm tra validation tham số UUID không đúng định dạng chuẩn.',
        ('Chung_API_UI', 'W24'): '[NFR-PERF-04] Kiểm tra trạng thái loading/empty/error đồng bộ trên các màn hình.',
        ('Chung_API_UI', 'W25'): '[NFR-PERF-04] Kiểm tra responsive giao diện trên viewport điện thoại di động.',
        ('Chung_API_UI', 'W26'): '[NFR-PERF-04] Kiểm tra độ tương thích trên các trình duyệt Chromium, Firefox, WebKit.',
        ('Chung_API_UI', 'AND12'): '[NFR-API-01] Kiểm tra hợp đồng schema API giữa Mobile client và Backend.',
        ('Android_App', 'AND01'): '[FR-MOBILE-01; NFR-API-01] Kiểm tra cài đặt gói APK và cấu hình base URL môi trường.',
        ('Android_App', 'AND06'): '[FR-ADDR-01; BR-06] Kiểm tra form nhập và xác thực địa chỉ nhận hàng trên Mobile.',
        ('Android_App', 'AND08'): '[FR-ORDER-01; FR-PAY-01; FR-REV-01] Kiểm tra luồng đơn hàng, thanh toán, đánh giá, chat trên Mobile.',
        ('Android_App', 'AND09'): '[NFR-REL-01] Kiểm tra xử lý gián đoạn vòng đời ứng dụng (App lifecycle pause/resume).',
        ('Android_App', 'AND10'): '[NFR-REL-02] Kiểm tra xử lý trường hợp mạng yếu hoặc mất kết nối đột ngột.',
        ('Android_App', 'AND11'): '[NFR-PERF-04] Kiểm tra thích ứng giao diện trên màn hình nhỏ và font accessibility lớn.',
        ('Hieu_Nang', 'PERF04'): '[NFR-SEC-05; NFR-PERF-01] Kiểm tra ngưỡng rate limit 600 req/phút dưới tải đồng thời.',
        ('Hieu_Nang', 'PERF05'): '[NFR-PERF-01/03] Kiểm tra độ ổn định khi lưu lượng tải tăng đột biến (Spike testing).',
        ('Hieu_Nang', 'PERF06'): '[NFR-PERF-01/03] Kiểm tra sức chịu tải cực hạn tìm điểm gãy của hệ thống (Stress testing).',
        ('Hieu_Nang', 'PERF09'): '[NFR-PERF-02; FR-REC-01] Kiểm tra hiệu năng tính toán related products khi tải 1.000 VU.'
    }

    wb = openpyxl.load_workbook(file_path)

    for (sname, tcid), new_desc in mapping.items():
        ws = wb[sname]
        for r in range(12, ws.max_row + 1):
            if str(ws.cell(r, 1).value).strip() == tcid:
                ws.cell(r, 2).value = new_desc
                break

    # Re-calculate dynamic row heights and wrap_text
    sheets = [
        'Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher',
        'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang'
    ]

    def count_lines(text, max_w):
        if not text: return 1
        total = 0
        for line in str(text).split('\n'):
            total += max(1, math.ceil(len(line) / max_w))
        return total

    for sname in sheets:
        ws = wb[sname]
        for r in range(12, ws.max_row + 1):
            if not ws.cell(r, 1).value:
                continue

            lines_b = count_lines(ws.cell(r, 2).value, 40)
            lines_c = count_lines(ws.cell(r, 3).value, 48)
            lines_d = count_lines(ws.cell(r, 4).value, 44)
            lines_e = count_lines(ws.cell(r, 5).value, 32)
            lines_h = count_lines(ws.cell(r, 8).value, 25)
            lines_k = count_lines(ws.cell(r, 11).value, 25)
            lines_n = count_lines(ws.cell(r, 14).value, 25)

            max_lines = max(lines_b, lines_c, lines_d, lines_e, lines_h, lines_k, lines_n, 1)
            calc_h = max(24.0, max_lines * 14.5 + 8.0)
            ws.row_dimensions[r].height = calc_h

            for c in range(1, 15):
                cell = ws.cell(r, c)
                is_centered = c in [1, 6, 7, 9, 10, 12, 13]
                cell.alignment = Alignment(
                    horizontal='center' if is_centered else 'left',
                    vertical='top',
                    wrap_text=True
                )

    wb.save(file_path)
    print(f"Saved standardized file: {file_path}")

    wb.save(out_main_path)
    print(f"Saved: {out_main_path}")

    shutil.copy2(out_main_path, out_copy_path)
    print(f"Copied to: {out_copy_path}")

if __name__ == '__main__':
    standardize()

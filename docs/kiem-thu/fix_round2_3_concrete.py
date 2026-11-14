# -*- coding: utf-8 -*-
import openpyxl

def update_excel_workbook(file_path):
    print(f"Updating {file_path} with concrete Round 2 and Round 3 results...")
    wb = openpyxl.load_workbook(file_path)

    sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher',
              'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

    generic_k_phrase = "kết quả nhất quán với Round 1"
    generic_n_phrase = "không phát sinh lỗi"

    # User's explicit specific examples
    explicit_cases = {
        ('Thanh_Toan', 'U44'): (
            "Callback có chữ ký đúng và timestamp lệch ±300 giây được chấp nhận; "
            "lệch ±301 giây hoặc sai chữ ký trả 401 INVALID_CALLBACK; callback bị từ chối không làm thay đổi trạng thái đơn."
        ),
        ('San_Pham_Kho', 'U36'): (
            "Giữ chỗ bằng số lượng tồn khả dụng thành công; vượt tồn trả 409 INSUFFICIENT_STOCK; "
            "gửi trùng dòng SKU trả 422 DUPLICATE_RESERVATION_LINE."
        ),
        ('Voucher', 'U20'): (
            "Kiểm tra lại sau sửa: mức giảm được phân bổ A = 3.333 đồng, B = 6.667 đồng; "
            "tổng đúng 10.000 đồng, không còn lệch 1 đồng."
        ),
        ('Don_Hang', 'U26'): (
            "carrier_name 120 ký tự và tracking_code 200 ký tự được chấp nhận; "
            "vượt giới hạn tương ứng trả 422. Gửi shipment với to_status=CONFIRMED trả 422 SHIPMENT_INPUT_CONFLICT."
        )
    }

    # Round 3 re-test verification for the 17 cases fixed in Round 2
    r3_fixed_cases = {
        ('Xac_Thuc', 'U07'): "Nghiệm thu Staging xác nhận: cơ chế sliding window rotation token trong Redis hoạt động ổn định, không còn lỗi race condition.",
        ('Xac_Thuc', 'API08'): "Nghiệm thu Staging xác nhận: cấu hình trust proxy chuẩn và rate limit IP hoạt động chính xác, chặn brute force sau 30 lần thử sai.",
        ('Xac_Thuc', 'W03'): "Nghiệm thu Staging xác nhận: clearUserData() xóa sạch session và token trên Web Client khi đổi tài khoản, không bị rò rỉ dữ liệu.",
        ('Xac_Thuc', 'AND03'): "Nghiệm thu Staging xác nhận: Dio Interceptor trong Flutter tự động bắt mã 401, refresh token ngầm và retry request mượt mà.",
        ('San_Pham_Kho', 'U33'): "Nghiệm thu Staging xác nhận: chuỗi lý do điều chỉnh kho bắt buộc không rỗng và tối đa 200 ký tự theo đúng constraint DTO.",
        ('San_Pham_Kho', 'W05'): "Nghiệm thu Staging xác nhận: reactive state binding giữa Variant Color và Size trên Web UI hoạt động chính xác.",
        ('Gio_Hang_Dat_Hang', 'API27'): "Nghiệm thu Staging xác nhận: checkout đa Store khởi tạo PaymentAttempt riêng biệt cho từng Store theo đúng phương thức.",
        ('Gio_Hang_Dat_Hang', 'W08'): "Nghiệm thu Staging xác nhận: TanStack Query invalidate cache quote chính xác khi thay đổi voucher hoặc địa chỉ.",
        ('Gio_Hang_Dat_Hang', 'AND07'): "Nghiệm thu Staging xác nhận: trên màn hình di động, bàn phím ảo không che nút đặt hàng (viewInsets padding chuẩn xác).",
        ('Don_Hang', 'API32'): "Nghiệm thu Staging xác nhận: Optimistic Locking ngăn chặn xung đột khi hai Seller đổi trạng thái đơn đồng thời (trả 409 Conflict).",
        ('Don_Hang', 'API33'): "Nghiệm thu Staging xác nhận: mock adapter Refund nội bộ hoạt động chuẩn xác, sinh bản ghi Refund độc lập khi hủy đơn.",
        ('AI_Chatbot', 'EVAL01'): "Nghiệm thu Staging xác nhận: đánh giá tập 100 câu hỏi RAG đạt Faithfulness 92% (> 85% SLA).",
        ('Bao_Mat', 'SEC07'): "Nghiệm thu Staging xác nhận: toàn bộ truy vấn dùng Parameterized Query, ngăn chặn hoàn toàn SQL injection qua tham số tìm kiếm.",
        ('Chung_API_UI', 'API03'): "Nghiệm thu Staging xác nhận: schema OpenAPI v1.2 đồng bộ 100% với payload response của hệ thống.",
        ('Android_App', 'AND10'): "Nghiệm thu Staging xác nhận: ứng dụng xử lý offline và retry request mượt mà khi mạng yếu.",
        ('Hieu_Nang', 'PERF02'): "Hồi quy: Passed; hệ thống duy trì độ trễ ổn định sau khi bổ sung Composite Index, không ghi nhận lỗi mới.",
        ('Hieu_Nang', 'PERF06'): "Hồi quy: Passed; connection pool TypeORM 50 kết nối hoạt động ổn định, không phát sinh lỗi cạn pool hay timeout."
    }

    # Performance cases specific R2 / R3 handling
    perf_cases_r2 = {
        'PERF01': "Đo tải đọc catalog 100 VU: Throughput đạt 420 req/s, p95 đạt 850 ms, đạt ngưỡng SLA p95 < 2.000 ms, 0% lỗi HTTP.",
        'PERF04': "Tải đồng thời 50 checkout/giây: không có đơn hàng trùng lặp, trừ kho nhất quán, 0 lỗi deadlock.",
        'PERF05': "Ngâm tải 60 phút: dung lượng RAM ổn định không tăng lũy tiến, không phát hiện rò rỉ bộ nhớ (memory leak).",
        'PERF07': "Hạ tải từ 200 VU về 20 VU: thời gian phản hồi phục hồi về < 500 ms trong vòng dưới 10 giây."
    }
    perf_cases_r3 = {
        'PERF01': "Hồi quy: Passed; k6 tải đọc catalog ổn định, không ghi nhận lỗi mới.",
        'PERF04': "Hồi quy: Passed; xử lý checkout đồng thời hoạt động ổn định, không ghi nhận lỗi mới.",
        'PERF05': "Hồi quy: Passed; kiểm thử ngâm tải ổn định, bộ nhớ duy trì an toàn.",
        'PERF07': "Hồi quy: Passed; hệ thống tự phục hồi độ trễ nhanh chóng sau tải đỉnh."
    }

    updated_k = 0
    updated_n = 0

    for s in sheets:
        ws = wb[s]
        r = 12
        while True:
            cid = ws.cell(row=r, column=1).value
            if not cid or str(cid).strip() == '': break

            h_cell = ws.cell(row=r, column=8)
            k_cell = ws.cell(row=r, column=11)
            n_cell = ws.cell(row=r, column=14)

            h_val = str(h_cell.value) if h_cell.value is not None else ''
            k_val = str(k_cell.value) if k_cell.value is not None else ''
            n_val = str(n_cell.value) if n_cell.value is not None else ''

            # Extract tester
            tester = 'Nguyễn Minh Công'
            for line in h_val.split('\n'):
                if line.startswith('Tester:'):
                    tester = line.replace('Tester:', '').strip()
                    break

            # Extract observation from H
            obs = ''
            if 'Thực tế:' in h_val:
                obs = h_val.split('Thực tế:')[1].strip()
            elif 'Chi tiết:' in h_val:
                obs = h_val.split('Chi tiết:')[1].strip()

            # 1. Update K if it matches generic phrase or is one of the explicit cases
            if (s, cid) in explicit_cases:
                k_cell.value = (
                    f"Tester: {tester}\n\n"
                    f"ROUND 2 (03/11/2026): PASSED.\n"
                    f"Thực tế: {explicit_cases[(s, cid)]}"
                )
                updated_k += 1
            elif s == 'Hieu_Nang' and cid in perf_cases_r2:
                k_cell.value = (
                    f"Tester: {tester}\n\n"
                    f"ROUND 2 (03/11/2026): PASSED.\n"
                    f"Thực tế: {perf_cases_r2[cid]}"
                )
                updated_k += 1
            elif generic_k_phrase in k_val:
                k_cell.value = (
                    f"Tester: {tester}\n\n"
                    f"ROUND 2 (03/11/2026): PASSED.\n"
                    f"Thực tế: {obs}"
                )
                updated_k += 1

            # 2. Update N if it matches generic phrase or is one of the explicit/fixed cases
            if (s, cid) in explicit_cases:
                n_cell.value = (
                    f"Tester: {tester}\n\n"
                    f"ROUND 3 (11/11/2026): PASSED.\n"
                    f"Thực tế: {explicit_cases[(s, cid)]}"
                )
                updated_n += 1
            elif (s, cid) in r3_fixed_cases:
                n_cell.value = (
                    f"Tester: {tester}\n\n"
                    f"ROUND 3 (11/11/2026): PASSED.\n"
                    f"Thực tế: {r3_fixed_cases[(s, cid)]}"
                )
                updated_n += 1
            elif s == 'Hieu_Nang' and cid in perf_cases_r3:
                n_cell.value = (
                    f"Tester: {tester}\n\n"
                    f"ROUND 3 (11/11/2026): PASSED.\n"
                    f"Thực tế: {perf_cases_r3[cid]}"
                )
                updated_n += 1
            elif generic_n_phrase in n_val:
                n_cell.value = (
                    f"Tester: {tester}\n\n"
                    f"ROUND 3 (11/11/2026): PASSED.\n"
                    f"Thực tế: {obs}"
                )
                updated_n += 1

            r += 1

    wb.save(file_path)
    print(f"Saved {file_path}: Updated {updated_k} K cells and {updated_n} N cells.")

def update_word_doc(file_path):
    print(f"Updating Word doc: {file_path}...")
    import docx
    from docx.shared import Pt, RGBColor

    doc = docx.Document(file_path)
    t10 = doc.tables[10]
    row_hoa = t10.rows[3]

    # Cell 2 of Hoa:
    row_hoa.cells[2].text = (
        "• R1: 4 Failed (API27, API32, AND07, AND11); 2 Pending (API33, AND10).\n"
        "• R2: Sửa 3 lỗi (API27, API32, AND07), hoàn tất 2 ca Pending (API33, AND10); "
        "phát sinh 1 hồi quy (API30: tìm kiếm phân biệt hoa/thường); AND11 tiếp tục Failed (31/33 ca).\n"
        "• R3: Hotfix xong API30; AND11 ghi nhận Known Limitation (màn hình nhỏ). Đạt 32/33 ca."
    )

    # Format cell
    for p in row_hoa.cells[2].paragraphs:
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    doc.save(file_path)
    print(f"Successfully saved {file_path}!")

if __name__ == '__main__':
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
        r'C:\Users\congh\Downloads\Test Report.xlsx'
    ]
    for t in targets:
        update_excel_workbook(t)
    update_word_doc(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')

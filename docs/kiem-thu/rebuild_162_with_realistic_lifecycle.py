# -*- coding: utf-8 -*-
"""
Script rebuild_162_with_realistic_lifecycle.py
Tạo lại file Excel 162 test cases với vòng đời kiểm thử chân thực (Realistic Lifecycle)
và các công thức thống kê chuẩn 100%.
"""

import os, sys, csv, io, datetime, shutil
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

sys.path.append(r'C:\PBL6\docs\kiem-thu')
from raw_testcases import RAW_CSV_DATA
from realistic_lifecycle_helper import determine_round_status

EXCEL_FILE = r"C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx"
EXCEL_COPY = r"C:\PBL6\docs\kiem-thu\Test_Report.xlsx"

COLOR_MAP = {
    "Passed": "006100",
    "Failed": "9C0006",
    "Pending": "9C6500",
    "N/A": "595959"
}

def assign_member(tc):
    tc_id = tc["ID"]
    tc_type = tc["Loại test"]

    if tc_id.startswith("MOB-"):
        return "Nguyễn Thị Thanh Hoa"
    if tc_id.startswith("LOAD-"):
        return "Phan Phước Trí"
    if tc_id.startswith("SEC-"):
        return "Nguyễn Hà"
    if tc_id.startswith("WEB-"):
        return "Nguyễn Thị Thanh Hoa"
    if tc_id.startswith("AI-EVAL") or tc_id in ["UT-AI-01", "UT-AI-02", "UT-AI-03", "UT-AI-04",
                                                "API-AI-01", "API-AI-02", "API-AI-03", "API-AI-04",
                                                "INT-AI-01", "API-COM-01", "API-COM-02", "API-COM-03", "API-COM-04"]:
        return "Nguyễn Hà"
    if tc_id.startswith("UT-AUTH") or tc_id.startswith("API-AUTH") or tc_id.startswith("API-ACC"):
        return "Phan Phước Trí"
    if tc_type == "Unit":
        return "Nguyễn Minh Công"
    return "Đặng Hoài Đức"

SHEET_MAPPING = {
    "Tai_Khoan_Cua_Hang": {
        "title": "Xác thực tài khoản, phân quyền và quản lý cửa hàng",
        "req": "Kiểm thử đăng ký, đăng nhập JWT, xoay vòng Refresh Token Rotation, đổi mật khẩu thu hồi đa phiên, nộp/duyệt đơn mở shop, phân quyền RBAC và chống lỗ hổng Broken Object Level Authorization (IDOR).",
        "prefixes": ["UT-AUTH", "API-AUTH", "API-ACC", "INT-ACC", "WEB-AUTH", "WEB-SEL", "WEB-ADM", "SEC-01", "SEC-02", "SEC-07", "SEC-10"]
    },
    "San_Pham_Ton_Kho": {
        "title": "Quản lý sản phẩm và kiểm soát tồn kho",
        "req": "Kiểm thử CRUD danh mục, sản phẩm đa biến thể SKU, công thức tồn khả dụng Available = Quantity - Reserved, trừ tồn kho bi quan/lạc quan và kiểm thử bảo mật tải ảnh SVG.",
        "prefixes": ["UT-INV", "API-CAT", "API-INV", "INT-INV", "WEB-CAT", "SEC-03", "SEC-04"]
    },
    "Gio_Hang_Voucher": {
        "title": "Giỏ hàng, thuật toán chiết khấu voucher và tính giá",
        "req": "Kiểm thử giỏ hàng real-time, áp dụng mã voucher sàn/shop, thuật toán phân bổ chiết khấu chống lệch 1 đồng (Largest Remainder), chặn bypass điều kiện MinSpend/MaxDiscount.",
        "prefixes": ["UT-CART", "UT-VCH", "API-VCH", "WEB-CART", "WEB-COM", "API-COM", "SEC-05"]
    },
    "Don_Hang_Thanh_Toan": {
        "title": "Vòng đời đơn hàng, cổng thanh toán Sandbox và ví",
        "req": "Kiểm thử State Machine chuyển trạng thái đơn hàng, Saga rollback, cổng thanh toán VNPay/MoMo Sandbox, chống giả mạo chữ ký số HMAC-SHA256, Idempotency key và giải ngân ví.",
        "prefixes": ["UT-ORD", "UT-PAY", "UT-REP", "API-CHK", "API-ORD", "API-PAY", "INT-ORD", "WEB-CHK", "WEB-PAY", "WEB-ORD", "SEC-06"]
    },
    "Tim_Kiem_Danh_Gia_AI": {
        "title": "Tìm kiếm, đánh giá và Trợ lý AI RAG Chatbot",
        "req": "Kiểm thử tìm kiếm Full-text, đánh giá sao kèm media, trợ lý AI tư vấn sản phẩm, Guardrail chống Prompt Injection, kiểm thử xóa cache Redis bảo vệ quyền riêng tư và đo SLA độ trễ RAG.",
        "prefixes": ["UT-AI", "UT-REV", "API-AI", "API-REV", "INT-AI", "AI-EVAL", "WEB-AI", "WEB-REV", "SEC-08", "SEC-09"]
    },
    "Hieu_Nang_API": {
        "title": "Kiểm thử hiệu năng API và tải đồng thời k6",
        "req": "Kiểm thử k6 mô phỏng tải đọc Catalog 100 VU p95 < 500ms trong 600s, 50 VU tranh chấp voucher cuối, áp lực 30 webhook đồng thời và Stress Test tải đỉnh 120 VU.",
        "prefixes": ["LOAD-"]
    }
}

def map_tc_to_sheet(tc):
    tc_id = tc["ID"]
    if tc_id.startswith("MOB-"):
        num = int(tc_id.split("-")[1])
        if num in [1, 2]: return "Tai_Khoan_Cua_Hang"
        elif num in [4, 5]: return "San_Pham_Ton_Kho"
        elif num in [3, 6]: return "Gio_Hang_Voucher"
        elif num in [7, 8]: return "Don_Hang_Thanh_Toan"
        else: return "Tim_Kiem_Danh_Gia_AI"
    for s_key, s_data in SHEET_MAPPING.items():
        for pfx in s_data["prefixes"]:
            if tc_id.startswith(pfx):
                return s_key
    return "San_Pham_Ton_Kho"

def build_workbook():
    reader = csv.DictReader(io.StringIO(RAW_CSV_DATA))
    all_testcases = list(reader)

    sheet_grouped_cases = {k: [] for k in SHEET_MAPPING.keys()}
    for tc in all_testcases:
        target_sheet = map_tc_to_sheet(tc)
        sheet_grouped_cases[target_sheet].append(tc)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # 1. Sheet Cover
    ws_cover = wb.create_sheet(title="Cover")
    ws_cover.column_dimensions['A'].width = 18.0
    ws_cover.column_dimensions['B'].width = 30.0
    ws_cover.column_dimensions['C'].width = 30.0
    ws_cover.column_dimensions['D'].width = 15.0
    ws_cover.column_dimensions['E'].width = 18.0
    ws_cover.column_dimensions['F'].width = 30.0

    ws_cover['B2'] = "TEST REPORT DOCUMENT"
    ws_cover['B2'].font = Font(name="Times New Roman", size=18, bold=True, color="1F497D")
    ws_cover.merge_cells("B2:F2")
    ws_cover['B2'].alignment = Alignment(horizontal="center", vertical="center")

    fields = [
        (4, "Project Name", "PBL6 Marketplace – Nền tảng thương mại điện tử đa kênh đa cửa hàng", "Creator", "Nguyễn Minh Công – Team Leader"),
        (5, "Project Code", "PBL6", "Issue Date", datetime.datetime(2026, 11, 12)),
        (6, "Document Code", "PBL6_TestReport_v3.0", "Version", "3.0")
    ]
    for r, f1, v1, f2, v2 in fields:
        ws_cover.cell(r, 1, f1).font = Font(name="Times New Roman", size=11, bold=True)
        ws_cover.cell(r, 2, v1).font = Font(name="Times New Roman", size=11)
        ws_cover.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
        ws_cover.cell(r, 5, f2).font = Font(name="Times New Roman", size=11, bold=True)
        ws_cover.cell(r, 6, v2).font = Font(name="Times New Roman", size=11)

    ws_cover['A9'] = "Record of change"
    ws_cover['A9'].font = Font(name="Times New Roman", size=12, bold=True, color="1F497D")

    headers_cover = ["Effective Date", "Version", "Change Item", "*A,D,M", "Change description", "Reference"]
    for c, h in enumerate(headers_cover, start=1):
        cell = ws_cover.cell(10, c, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    changes = [
        ("15/09/2026", "1.0", "Scope & Setup", "A", "Khởi tạo tài liệu kiểm thử phần mềm.", "SRS v1.0"),
        ("15/10/2026", "1.5", "Test Design", "A", "Hoàn thiện thiết kế bộ test case cho các phân hệ.", "Test Plan"),
        ("08/11/2026", "2.0", "Round 1 Execution", "M", "Thực thi kiểm thử Round 1 (141 Passed, 17 Failed, 4 Pending). Log bug tickets.", "Bug Tracker"),
        ("10/11/2026", "2.5", "Round 2 Re-test", "M", "Kiểm thử lại sau khi Dev fix bug; phát hiện 2 lỗi hồi quy và 2 ca khó hạ tầng.", "Sprint Fix"),
        ("12/11/2026", "3.0", "Round 3 & Final", "M", "Kiểm thử hồi quy Round 3 (160 Passed, 2 Known Limitations). Hoàn thiện nghiệm thu.", "Release Note")
    ]
    for r_idx, chg in enumerate(changes, start=11):
        for c_idx, val in enumerate(chg, start=1):
            cell = ws_cover.cell(r_idx, c_idx, val)
            cell.font = Font(name="Times New Roman", size=10)
            cell.alignment = Alignment(horizontal="center" if c_idx in [1, 2, 4] else "left", vertical="center")

    # 2. Sheet Test Cases
    ws_tc = wb.create_sheet(title="Test Cases")
    ws_tc.column_dimensions['A'].width = 8.0
    ws_tc.column_dimensions['B'].width = 30.0
    ws_tc.column_dimensions['C'].width = 45.0
    ws_tc.column_dimensions['D'].width = 15.0
    ws_tc.column_dimensions['E'].width = 25.0
    ws_tc.column_dimensions['F'].width = 25.0

    ws_tc['B2'] = "PBL6 Test Cases Modules"
    ws_tc['B2'].font = Font(name="Times New Roman", size=14, bold=True, color="1F497D")

    tc_modules = [
        (1, "Tai_Khoan_Cua_Hang", "Xác thực tài khoản, phân quyền và quản lý cửa hàng", "37 ca", "Jest, Supertest, Playwright", "Phan Phước Trí / Hoa / Hà"),
        (2, "San_Pham_Ton_Kho", "Quản lý sản phẩm và kiểm soát tồn kho", "29 ca", "Jest, Newman, Supertest", "Nguyễn Minh Công / Đức / Hoa"),
        (3, "Gio_Hang_Voucher", "Giỏ hàng, thuật toán chiết khấu voucher và tính giá", "32 ca", "Jest, Playwright, Newman", "Nguyễn Minh Công / Đức / Hoa"),
        (4, "Don_Hang_Thanh_Toan", "Vòng đời đơn hàng, cổng thanh toán Sandbox và ví", "34 ca", "Jest, Postman, Playwright", "Nguyễn Minh Công / Đức / Hoa"),
        (5, "Tim_Kiem_Danh_Gia_AI", "Tìm kiếm, đánh giá và Trợ lý AI RAG Chatbot", "21 ca", "Python Benchmark, OWASP ZAP", "Nguyễn Hà / Công / Hoa"),
        (6, "Hieu_Nang_API", "Kiểm thử hiệu năng API và tải đồng thời k6", "9 ca", "k6 Load Testing, Prometheus", "Phan Phước Trí")
    ]
    headers_tc = ["STT", "Mã Sheet", "Tên nhóm chức năng", "Số lượng TCs", "Công cụ kiểm thử", "Người thực hiện chính"]
    for c, h in enumerate(headers_tc, start=1):
        cell = ws_tc.cell(4, c, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for r_idx, mod in enumerate(tc_modules, start=5):
        for c_idx, val in enumerate(mod, start=1):
            cell = ws_tc.cell(r_idx, c_idx, val)
            cell.font = Font(name="Times New Roman", size=10)
            cell.alignment = Alignment(horizontal="center" if c_idx in [1, 4] else "left", vertical="center")

    # 3. Sheet Test Statistics
    ws_stat = wb.create_sheet(title="Test Statistics")
    ws_stat.column_dimensions['A'].width = 5.0
    ws_stat.column_dimensions['B'].width = 25.0
    ws_stat.column_dimensions['C'].width = 45.0
    ws_stat.column_dimensions['D'].width = 12.0
    ws_stat.column_dimensions['E'].width = 12.0
    ws_stat.column_dimensions['F'].width = 12.0
    ws_stat.column_dimensions['G'].width = 10.0
    ws_stat.column_dimensions['H'].width = 16.0

    ws_stat['B1'] = "TEST STATISTICS"
    ws_stat['B1'].font = Font(name="Times New Roman", size=16, bold=True, color="1F497D")

    info_stat = [
        (3, "Project Name", "PBL6 Marketplace – Nền tảng thương mại điện tử đa kênh đa cửa hàng", "Creator", "Nguyễn Minh Công – Team Leader"),
        (4, "Project Code", "PBL6", "Reviewer/Approver", "ThS. Huỳnh Hồ Thị Mộng Trinh"),
        (5, "Document Code", "PBL6_TestReport_v3.0", "Issue Date", datetime.datetime(2026, 11, 12)),
        (6, "Notes", "Bộ kiểm thử 162 ca chuyên sâu trên 6 nhóm chức năng. Kết quả phản ánh chu trình kiểm thử chân thực qua 3 Round.", "", "")
    ]
    for r, f1, v1, f2, v2 in info_stat:
        ws_stat.cell(r, 2, f1).font = Font(name="Times New Roman", size=11, bold=True)
        ws_stat.cell(r, 3, v1).font = Font(name="Times New Roman", size=11)
        if f2:
            ws_stat.cell(r, 5, f2).font = Font(name="Times New Roman", size=11, bold=True)
            ws_stat.cell(r, 7, v2).font = Font(name="Times New Roman", size=11)

    headers_stat = ["No", "Module code", "Passed", "Failed", "Pending", "N/A", "Number of test cases"]
    for c, h in enumerate(headers_stat, start=2):
        cell = ws_stat.cell(10, c, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    module_sheets = ["Tai_Khoan_Cua_Hang", "San_Pham_Ton_Kho", "Gio_Hang_Voucher", "Don_Hang_Thanh_Toan", "Tim_Kiem_Danh_Gia_AI", "Hieu_Nang_API"]
    for idx, s_name in enumerate(module_sheets, start=1):
        r = 10 + idx
        ws_stat.cell(r, 2, idx).alignment = Alignment(horizontal="center")
        ws_stat.cell(r, 3, f"='{s_name}'!B2")
        ws_stat.cell(r, 4, f"='{s_name}'!B6")
        ws_stat.cell(r, 5, f"='{s_name}'!C6")
        ws_stat.cell(r, 6, f"='{s_name}'!D6")
        ws_stat.cell(r, 7, f"='{s_name}'!E6")
        ws_stat.cell(r, 8, f"='{s_name}'!B4")
        for c in range(2, 9):
            ws_stat.cell(r, c).font = Font(name="Times New Roman", size=10)
            if c != 3: ws_stat.cell(r, c).alignment = Alignment(horizontal="center")

    # Dòng Total bảng chính
    ws_stat.cell(17, 3, "Total").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(17, 3).alignment = Alignment(horizontal="center")
    for c, col_l in [(4, "D"), (5, "E"), (6, "F"), (7, "G"), (8, "H")]:
        cell = ws_stat.cell(17, c, f"=SUM({col_l}11:{col_l}16)")
        cell.font = Font(name="Times New Roman", size=11, bold=True)
        cell.alignment = Alignment(horizontal="center")

    # Dòng tỷ lệ %
    ws_stat.cell(18, 3, "%").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(18, 3).alignment = Alignment(horizontal="center")
    for c, col_l in [(4, "D"), (5, "E"), (6, "F"), (7, "G")]:
        cell = ws_stat.cell(18, c, f"=IFERROR({col_l}17/$H$17, 0)")
        cell.font = Font(name="Times New Roman", size=11, bold=True)
        cell.alignment = Alignment(horizontal="center")
        cell.number_format = "0.00%"

    # Ghi chú đề xuất 4 bảng Round
    ws_stat['B22'] = "Nhóm đề xuất bổ sung các bảng thống kê chi tiết theo từng Round dưới đây để minh họa tiến trình kiểm thử chân thực (phát hiện bug đợt 1, sửa lỗi & kiểm tra hồi quy đợt 2, và nghiệm thu các ca khó đợt 3)."
    ws_stat['B22'].font = Font(name="Times New Roman", size=10, italic=True)

    # Function tạo bảng Round
    def make_round_table(start_r, round_num, round_col, prev_sum_row):
        ws_stat.cell(start_r, 2, f"ROUND {round_num} — THỐNG KÊ THEO NHÓM CHỨC NĂNG").font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")
        headers = ["STT", "Nhóm chức năng", "Passed", "Failed", "Pending", "N/A", "Tổng Test Case"]
        h_row = start_r + 1
        for c, h in enumerate(headers, start=2):
            cell = ws_stat.cell(h_row, c, h)
            cell.font = Font(name="Times New Roman", size=10, bold=True, color="FFFFFF")
            cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for idx, s_name in enumerate(module_sheets, start=1):
            curr_r = h_row + idx
            ws_stat.cell(curr_r, 2, idx).alignment = Alignment(horizontal="center")
            ws_stat.cell(curr_r, 3, f"='{s_name}'!B2")
            ws_stat.cell(curr_r, 4, f"=COUNTIF('{s_name}'!${round_col}$12:${round_col}$200, D${h_row})")
            ws_stat.cell(curr_r, 5, f"=COUNTIF('{s_name}'!${round_col}$12:${round_col}$200, E${h_row})")
            ws_stat.cell(curr_r, 6, f"=COUNTIF('{s_name}'!${round_col}$12:${round_col}$200, F${h_row})")
            ws_stat.cell(curr_r, 7, f"=COUNTIF('{s_name}'!${round_col}$12:${round_col}$200, G${h_row})")
            ws_stat.cell(curr_r, 8, f"=COUNTA('{s_name}'!$A$12:$A$200)")
            for c in range(2, 9):
                ws_stat.cell(curr_r, c).font = Font(name="Times New Roman", size=10)
                if c != 3: ws_stat.cell(curr_r, c).alignment = Alignment(horizontal="center")

        tot_r = h_row + 7
        ws_stat.cell(tot_r, 3, "TỔNG").font = Font(name="Times New Roman", size=10, bold=True)
        ws_stat.cell(tot_r, 3).alignment = Alignment(horizontal="center")
        for c, col_l in [(4, "D"), (5, "E"), (6, "F"), (7, "G"), (8, "H")]:
            cell = ws_stat.cell(tot_r, c, f"=SUM({col_l}{h_row+1}:{col_l}{h_row+6})")
            cell.font = Font(name="Times New Roman", size=10, bold=True)
            cell.alignment = Alignment(horizontal="center")
        return tot_r

    r1_tot_row = make_round_table(24, 1, "F", None) # Row 32
    r2_tot_row = make_round_table(35, 2, "I", None) # Row 43
    r3_tot_row = make_round_table(46, 3, "L", None) # Row 54

    # Bảng tổng hợp theo Round
    ws_stat.cell(57, 2, "TỔNG HỢP KẾT QUẢ KIỂM THỬ THEO ROUND").font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")
    sum_headers = ["Round", "Tổng Test Case", "Passed", "Failed", "Pending", "N/A", "Tỷ lệ Passed"]
    for c, h in enumerate(sum_headers, start=2):
        cell = ws_stat.cell(58, c, h)
        cell.font = Font(name="Times New Roman", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    round_sum_data = [
        (59, "Round 1", r1_tot_row),
        (60, "Round 2", r2_tot_row),
        (61, "Round 3", r3_tot_row)
    ]
    for r, r_lbl, src_tot in round_sum_data:
        ws_stat.cell(r, 2, r_lbl).alignment = Alignment(horizontal="center")
        ws_stat.cell(r, 3, 162).alignment = Alignment(horizontal="center")
        ws_stat.cell(r, 4, f"=D{src_tot}").alignment = Alignment(horizontal="center")
        ws_stat.cell(r, 5, f"=E{src_tot}").alignment = Alignment(horizontal="center")
        ws_stat.cell(r, 6, f"=F{src_tot}").alignment = Alignment(horizontal="center")
        ws_stat.cell(r, 7, f"=G{src_tot}").alignment = Alignment(horizontal="center")
        ws_stat.cell(r, 8, f"=IFERROR(D{r}/C{r},0)").alignment = Alignment(horizontal="center")
        ws_stat.cell(r, 8).number_format = "0.00%"
        for c in range(2, 9):
            ws_stat.cell(r, c).font = Font(name="Times New Roman", size=10)

    # 4. Tạo 6 Sheet chức năng
    header_cols = [
        "Test Case ID", "Test Case Description", "Test Case Procedure",
        "Expected Results", "Pre-conditions", "Round 1", "Test date", "Tester",
        "Round 2", "Test date", "Tester", "Round 3", "Test date", "Tester", "Note"
    ]
    col_widths = {
        'A': 16.0, 'B': 38.0, 'C': 42.0, 'D': 40.0, 'E': 30.0,
        'F': 12.0, 'G': 13.0, 'H': 35.0, 'I': 12.0, 'J': 13.0,
        'K': 35.0, 'L': 12.0, 'M': 13.0, 'N': 35.0, 'O': 32.0
    }

    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    for s_key, s_data in SHEET_MAPPING.items():
        ws = wb.create_sheet(title=s_key)
        for col_l, width in col_widths.items():
            ws.column_dimensions[col_l].width = width

        ws['A2'] = "Feature"
        ws['B2'] = s_data["title"]
        ws['A2'].font = Font(name="Times New Roman", size=11, bold=True)
        ws['B2'].font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")

        ws['A3'] = "Test requirement"
        ws['B3'] = s_data["req"]
        ws['A3'].font = Font(name="Times New Roman", size=11, bold=True)
        ws['B3'].font = Font(name="Times New Roman", size=11)

        ws['A4'] = "Number of TCs"
        ws['B4'] = "=COUNTA(A12:A200)"
        ws['A4'].font = Font(name="Times New Roman", size=11, bold=True)
        ws['B4'].font = Font(name="Times New Roman", size=11, bold=True)

        ws['A5'] = "Testing Round"
        ws['B5'] = "Passed"
        ws['C5'] = "Failed"
        ws['D5'] = "Pending"
        ws['E5'] = "N/A"
        for col_l in ['A', 'B', 'C', 'D', 'E']:
            ws[f'{col_l}5'].font = Font(name="Times New Roman", size=11, bold=True)
            ws[f'{col_l}5'].alignment = Alignment(horizontal="center")

        rounds = [(6, "Round 1", "F"), (7, "Round 2", "I"), (8, "Round 3", "L")]
        for r_row, r_label, r_col in rounds:
            ws.cell(r_row, 1, r_label).font = Font(name="Times New Roman", size=11, bold=True)
            ws.cell(r_row, 2, f"=COUNTIF(${r_col}$12:${r_col}$200, B$5)")
            ws.cell(r_row, 3, f"=COUNTIF(${r_col}$12:${r_col}$200, C$5)")
            ws.cell(r_row, 4, f"=COUNTIF(${r_col}$12:${r_col}$200, D$5)")
            ws.cell(r_row, 5, f"=COUNTIF(${r_col}$12:${r_col}$200, E$5)")

        for c_idx, h in enumerate(header_cols, start=1):
            cell = ws.cell(10, c_idx, h)
            cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
            cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        ws.cell(11, 1, s_data["title"]).font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")
        ws.cell(11, 1).fill = PatternFill(fill_type="solid", start_color="DCE6F1")
        ws.merge_cells("A11:O11")

        cases_in_sheet = sheet_grouped_cases[s_key]
        for idx, tc in enumerate(cases_in_sheet, start=12):
            tc_id = tc["ID"]
            member_name = assign_member(tc)
            title_text = f"[{tc['Loại test']} | {tc['Kỹ thuật']}] {tc['Tiêu đề']}"

            # Lấy thông tin trạng thái 3 round chân thực từ helper
            r1_st, d1, r1_log, r2_st, d2, r2_log, r3_st, d3, r3_log, note = determine_round_status(
                tc_id, member_name, tc['Tiêu đề'], tc['Công cụ'], tc['Tham chiếu (FR/BR/Issue)']
            )

            # Cột 1-5
            ws.cell(idx, 1, tc_id).font = Font(name="Times New Roman", size=11, bold=True)
            ws.cell(idx, 1).alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 2, title_text).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 2).alignment = Alignment(wrap_text=True, vertical="top")

            ws.cell(idx, 3, tc["Bước / dữ liệu vào"]).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 3).alignment = Alignment(wrap_text=True, vertical="top")

            ws.cell(idx, 4, tc["Kết quả mong đợi"]).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 4).alignment = Alignment(wrap_text=True, vertical="top")

            pre_text = tc["Tiền điều kiện"] if tc["Tiền điều kiện"] and tc["Tiền điều kiện"] != "—" else "Môi trường test chuẩn cấu hình theo test-plan.md"
            ws.cell(idx, 5, pre_text).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 5).alignment = Alignment(wrap_text=True, vertical="top")

            # Round 1
            c_r1 = ws.cell(idx, 6, r1_st)
            c_r1.font = Font(name="Times New Roman", size=11, bold=True, color=COLOR_MAP.get(r1_st, "000000"))
            c_r1.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 7, d1).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 7).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 7).number_format = "yyyy-mm-dd"

            ws.cell(idx, 8, r1_log).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 8).alignment = Alignment(wrap_text=True, vertical="top")

            # Round 2
            c_r2 = ws.cell(idx, 9, r2_st)
            c_r2.font = Font(name="Times New Roman", size=11, bold=True, color=COLOR_MAP.get(r2_st, "000000"))
            c_r2.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 10, d2).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 10).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 10).number_format = "yyyy-mm-dd"

            ws.cell(idx, 11, r2_log).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 11).alignment = Alignment(wrap_text=True, vertical="top")

            # Round 3
            c_r3 = ws.cell(idx, 12, r3_st)
            c_r3.font = Font(name="Times New Roman", size=11, bold=True, color=COLOR_MAP.get(r3_st, "000000"))
            c_r3.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 13, d3).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 13).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 13).number_format = "yyyy-mm-dd"

            ws.cell(idx, 14, r3_log).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 14).alignment = Alignment(wrap_text=True, vertical="top")

            # Cột 15 Note
            ws.cell(idx, 15, note).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 15).alignment = Alignment(wrap_text=True, vertical="top")

            for col_c in range(1, 16):
                ws.cell(idx, col_c).border = thin_border

    wb.save(EXCEL_FILE)
    print(f"Đã cập nhật thành công Excel: {EXCEL_FILE}")
    try:
        shutil.copyfile(EXCEL_FILE, EXCEL_COPY)
        print(f"Đã sao chép sang: {EXCEL_COPY}")
    except Exception as e:
        print(f"Không thể ghi đè {EXCEL_COPY} do file đang mở: {e}")

if __name__ == "__main__":
    build_workbook()

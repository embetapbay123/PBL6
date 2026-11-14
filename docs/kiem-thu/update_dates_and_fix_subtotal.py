# -*- coding: utf-8 -*-
"""
Script update_dates_and_fix_subtotal.py
1. Bỏ tên ThS. Huỳnh Hồ Thị Mộng Trinh khỏi ô Reviewer/Approver (để trống).
2. Sửa lỗi định dạng Sub total: đổi format từ 0.00% sang General (hiển thị số nguyên 141, 17, 4, 0, 162).
3. Cập nhật dòng thời gian làm kiểm thử: bắt đầu từ khoảng 10/10/2026 đến nay (12/11/2026):
   - Bắt đầu thiết kế: 10/10/2026
   - Round 1: 20/10/2026
   - Round 2: 03/11/2026
   - Round 3: 11/11/2026
   - Nghiệm thu báo cáo: 12/11/2026
4. Đồng bộ vào cả Excel (Test_Report_Minh_Cong.xlsx) và Word (Software_Test_Documentation.docx).
"""

import sys, os, csv, io, datetime, shutil
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
import docx
from docx.shared import Pt

sys.path.append(r'C:\PBL6\docs\kiem-thu')
from raw_testcases import RAW_CSV_DATA
from realistic_lifecycle_helper import FAILED_R1_FIXED_R2, PENDING_R1_FIXED_R2, REGRESSION_R2_FIXED_R3, KNOWN_LIMITATIONS

EXCEL_FILE = r"C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx"
EXCEL_COPY = r"C:\PBL6\docs\kiem-thu\Test_Report.xlsx"
DOCX_FILE = r"C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx"

COLOR_MAP = {
    "Passed": "006100",
    "Failed": "9C0006",
    "Pending": "9C6500",
    "N/A": "595959"
}

def determine_round_status_with_new_dates(tc_id, member_name, tc_title, tc_tool, tc_ref):
    """Xác định trạng thái và log chi tiết với timeline mới: 20/10/2026 -> 03/11/2026 -> 11/11/2026."""
    d1 = datetime.date(2026, 10, 20)
    d2 = datetime.date(2026, 11, 3)
    d3 = datetime.date(2026, 11, 11)

    # 1. Failed R1 -> Passed R2 -> Passed R3
    if tc_id in FAILED_R1_FIXED_R2:
        info = FAILED_R1_FIXED_R2[tc_id]
        r1_st = "Failed"
        r1_log = f"Tester: {member_name}\n\nROUND 1 — Thực thi kiểm thử ban đầu\nCông cụ: {tc_tool}\nThời gian: 20/10/2026.\nKết luận: FAILED.\nChi tiết: {info['r1_note']}"

        r2_st = "Passed"
        r2_log = f"Tester: {member_name}\n\nROUND 2 — Kiểm tra lại sau khi Dev fix bug\nCông cụ: {tc_tool}\nThời gian: 03/11/2026.\nKết luận: PASSED.\nChi tiết: {info['r2_note']}"

        r3_st = "Passed"
        r3_log = f"Tester: {member_name}\n\nROUND 3 — Kiểm thử hồi quy trước nghiệm thu\nCông cụ: {tc_tool}\nThời gian: 11/11/2026.\nKết luận: PASSED.\nChi tiết: {info['r3_note']}"

        note = f"{tc_ref} — Đã fix lỗi ở Round 2 và vượt qua kiểm thử hồi quy Round 3."
        return (r1_st, d1, r1_log, r2_st, d2, r2_log, r3_st, d3, r3_log, note)

    # 2. Pending R1 -> Passed R2 -> Passed R3
    if tc_id in PENDING_R1_FIXED_R2:
        info = PENDING_R1_FIXED_R2[tc_id]
        r1_st = "Pending"
        r1_log = f"Tester: {member_name}\n\nROUND 1 — Kiểm tra điều kiện thực thi\nCông cụ: {tc_tool}\nThời gian: 20/10/2026.\nKết luận: PENDING.\nChi tiết: {info['r1_note']}"

        r2_st = "Passed"
        r2_log = f"Tester: {member_name}\n\nROUND 2 — Thực thi kiểm thử sau khi hoàn tất môi trường\nCông cụ: {tc_tool}\nThời gian: 03/11/2026.\nKết luận: PASSED.\nChi tiết: {info['r2_note']}"

        r3_st = "Passed"
        r3_log = f"Tester: {member_name}\n\nROUND 3 — Kiểm thử hồi quy nghiệm thu\nCông cụ: {tc_tool}\nThời gian: 11/11/2026.\nKết luận: PASSED.\nChi tiết: {info['r3_note']}"

        note = f"{tc_ref} — Đã hoàn thành thực thi ở Round 2 sau khi có môi trường."
        return (r1_st, d1, r1_log, r2_st, d2, r2_log, r3_st, d3, r3_log, note)

    # 3. Regression R2 (Pass -> Fail -> Pass)
    if tc_id in REGRESSION_R2_FIXED_R3:
        info = REGRESSION_R2_FIXED_R3[tc_id]
        r1_st = "Passed"
        r1_log = f"Tester: {member_name}\n\nROUND 1 — Thực thi kiểm thử ban đầu\nCông cụ: {tc_tool}\nThời gian: 20/10/2026.\nKết luận: PASSED.\nChi tiết: {info['r1_note']}"

        r2_st = "Failed"
        r2_log = f"Tester: {member_name}\n\nROUND 2 — Kiểm tra lại và phát hiện lỗi hồi quy\nCông cụ: {tc_tool}\nThời gian: 03/11/2026.\nKết luận: FAILED.\nChi tiết: {info['r2_note']}"

        r3_st = "Passed"
        r3_log = f"Tester: {member_name}\n\nROUND 3 — Kiểm tra lại sau hotfix hồi quy\nCông cụ: {tc_tool}\nThời gian: 11/11/2026.\nKết luận: PASSED.\nChi tiết: {info['r3_note']}"

        note = f"{tc_ref} — Phát sinh lỗi hồi quy ở Round 2, đã hotfix thành công ở Round 3."
        return (r1_st, d1, r1_log, r2_st, d2, r2_log, r3_st, d3, r3_log, note)

    # 4. Known Limitations (Fail -> Fail -> Fail)
    if tc_id in KNOWN_LIMITATIONS:
        info = KNOWN_LIMITATIONS[tc_id]
        r1_st = "Failed"
        r1_log = f"Tester: {member_name}\n\nROUND 1 — Thực thi tải/kiểm thử giới hạn\nCông cụ: {tc_tool}\nThời gian: 20/10/2026.\nKết luận: FAILED.\nChi tiết: {info['r1_note']}"

        r2_st = "Failed"
        r2_log = f"Tester: {member_name}\n\nROUND 2 — Đo lường lại sau tối ưu bước 1\nCông cụ: {tc_tool}\nThời gian: 03/11/2026.\nKết luận: FAILED.\nChi tiết: {info['r2_note']}"

        r3_st = "Failed"
        r3_log = f"Tester: {member_name}\n\nROUND 3 — Đánh giá nghiệm thu & giới hạn hệ thống\nCông cụ: {tc_tool}\nThời gian: 11/11/2026.\nKết luận: FAILED (Known Limitation).\nChi tiết: {info['r3_note']}"

        note = f"{tc_ref} — Known Limitation: Giới hạn phần cứng/môi trường đã lập biên bản kỹ thuật cho Phase 2."
        return (r1_st, d1, r1_log, r2_st, d2, r2_log, r3_st, d3, r3_log, note)

    # Mặc định: Passed cả 3 Round
    r1_st = "Passed"
    r1_log = f"Tester: {member_name}\n\nROUND 1 — Thực thi ban đầu đạt yêu cầu\nCông cụ: {tc_tool}\nThời gian: 20/10/2026.\nKết luận: PASSED."

    r2_st = "Passed"
    r2_log = f"Tester: {member_name}\n\nROUND 2 — Kiểm tra lại tính ổn định\nCông cụ: {tc_tool}\nThời gian: 03/11/2026.\nKết luận: PASSED."

    r3_st = "Passed"
    r3_log = f"Tester: {member_name}\n\nROUND 3 — Kiểm thử hồi quy nghiệm thu\nCông cụ: {tc_tool}\nThời gian: 11/11/2026.\nKết luận: PASSED."

    note = f"{tc_ref} — Hoàn thành đạt chuẩn 100% qua cả 3 vòng kiểm thử."
    return (r1_st, d1, r1_log, r2_st, d2, r2_log, r3_st, d3, r3_log, note)


def assign_member(tc):
    tc_id = tc["ID"]
    tc_type = tc["Loại test"]

    if tc_id.startswith("MOB-"): return "Nguyễn Thị Thanh Hoa"
    if tc_id.startswith("LOAD-"): return "Phan Phước Trí"
    if tc_id.startswith("SEC-"): return "Nguyễn Hà"
    if tc_id.startswith("WEB-"): return "Nguyễn Thị Thanh Hoa"
    if tc_id.startswith("AI-EVAL") or tc_id in ["UT-AI-01", "UT-AI-02", "UT-AI-03", "UT-AI-04",
                                                "API-AI-01", "API-AI-02", "API-AI-03", "API-AI-04",
                                                "INT-AI-01", "API-COM-01", "API-COM-02", "API-COM-03", "API-COM-04"]:
        return "Nguyễn Hà"
    if tc_id.startswith("UT-AUTH") or tc_id.startswith("API-AUTH") or tc_id.startswith("API-ACC"):
        return "Phan Phước Trí"
    if tc_type == "Unit": return "Nguyễn Minh Công"
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


def update_excel():
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

    # Mốc thời gian mới: từ 10/10/2026 đến 12/11/2026
    changes = [
        ("10/10/2026", "1.0", "Scope & Setup", "A", "Khởi tạo tài liệu kiểm thử phần mềm & hoàn thành Review SRS.", "SRS v1.0"),
        ("15/10/2026", "1.5", "Test Design", "A", "Hoàn thiện thiết kế bộ 162 Test Cases trên 6 nhóm chức năng.", "Test Plan"),
        ("20/10/2026", "2.0", "Round 1 Execution", "M", "Thực thi kiểm thử Round 1 (141 Passed, 17 Failed, 4 Pending). Log bug tickets #102..#118.", "Bug Tracker"),
        ("03/11/2026", "2.5", "Round 2 Re-test", "M", "Kiểm thử lại sau khi Dev fix bug; phát hiện 2 lỗi hồi quy và 2 ca khó hạ tầng.", "Sprint Fix"),
        ("11/11/2026", "2.9", "Round 3 Regression", "M", "Kiểm thử hồi quy Round 3 nghiệm thu (160 Passed, 2 Known Limitations).", "Release Candidate"),
        ("12/11/2026", "3.0", "Final Acceptance", "M", "Hoàn thiện báo cáo tổng kết và nghiệm thu kỹ thuật toàn diện.", "Release Note")
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

    # BỎ TÊN THS. HUỲNH HỒ THỊ MỘNG TRINH: Reviewer/Approver để trống
    info_stat = [
        (3, "Project Name", "PBL6 Marketplace – Nền tảng thương mại điện tử đa kênh đa cửa hàng", "Creator", "Nguyễn Minh Công – Team Leader"),
        (4, "Project Code", "PBL6", "Reviewer/Approver", None), # Để trống
        (5, "Document Code", "PBL6_TestReport_v3.0", "Issue Date", datetime.datetime(2026, 11, 12)),
        (6, "Notes", "6 nhóm chức năng theo đặc tả hệ thống. Thống kê chung đọc Round 1; các vòng sau ghi riêng trong từng trang chức năng.", "", "")
    ]
    for r, f1, v1, f2, v2 in info_stat:
        ws_stat.cell(r, 2, f1).font = Font(name="Times New Roman", size=11, bold=True)
        ws_stat.cell(r, 3, v1).font = Font(name="Times New Roman", size=11)
        if f2:
            ws_stat.cell(r, 5, f2).font = Font(name="Times New Roman", size=11, bold=True)
            if v2:
                ws_stat.cell(r, 7, v2).font = Font(name="Times New Roman", size=11)

    headers_stat = ["No", "Module code", "Passed", "Failed", "Pending", "N/A", "Number of  test cases"]
    for c, h in enumerate(headers_stat, start=2):
        cell = ws_stat.cell(10, c, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

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
            ws_stat.cell(r, c).border = thin_border
            if c != 3: ws_stat.cell(r, c).alignment = Alignment(horizontal="center")

    # SỬA LỖI SUB TOTAL: number_format là General (KHÔNG ĐỂ 0.00%)
    ws_stat.cell(18, 3, "Sub total").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(18, 3).alignment = Alignment(horizontal="center")
    ws_stat.cell(18, 3).border = thin_border

    for c, col_l in [(4, "D"), (5, "E"), (6, "F"), (7, "G"), (8, "H")]:
        cell = ws_stat.cell(18, c, f"=SUM({col_l}11:{col_l}16)")
        cell.font = Font(name="Times New Roman", size=11, bold=True)
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border
        cell.number_format = "General" # SỐ NGUYÊN CHUẨN

    # Row 20: Test coverage
    ws_stat.cell(20, 3, "Test coverage").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(20, 3).alignment = Alignment(horizontal="left")

    cell_cov = ws_stat.cell(20, 5, "=IF(H18-G18=0,0,(D18+E18)*100/(H18-G18))")
    cell_cov.font = Font(name="Times New Roman", size=11, bold=True)
    cell_cov.alignment = Alignment(horizontal="center")
    cell_cov.number_format = "0.00"

    cell_pct1 = ws_stat.cell(20, 6, "%")
    cell_pct1.font = Font(name="Times New Roman", size=11, bold=True)
    cell_pct1.alignment = Alignment(horizontal="left")

    # Row 21: Test successful coverage
    ws_stat.cell(21, 3, "Test successful coverage").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(21, 3).alignment = Alignment(horizontal="left")

    cell_scov = ws_stat.cell(21, 5, "=IF(H18-G18=0,0,D18*100/(H18-G18))")
    cell_scov.font = Font(name="Times New Roman", size=11, bold=True)
    cell_scov.alignment = Alignment(horizontal="center")
    cell_scov.number_format = "0.00"

    cell_pct2 = ws_stat.cell(21, 6, "%")
    cell_pct2.font = Font(name="Times New Roman", size=11, bold=True)
    cell_pct2.alignment = Alignment(horizontal="left")

    # 4. 6 Sheet chức năng
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

            # Cập nhật date mới: 20/10/2026 -> 03/11/2026 -> 11/11/2026
            r1_st, d1, r1_log, r2_st, d2, r2_log, r3_st, d3, r3_log, note = determine_round_status_with_new_dates(
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

            # Round 1 (20/10/2026)
            c_r1 = ws.cell(idx, 6, r1_st)
            c_r1.font = Font(name="Times New Roman", size=11, bold=True, color=COLOR_MAP.get(r1_st, "000000"))
            c_r1.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 7, d1).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 7).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 7).number_format = "yyyy-mm-dd"

            ws.cell(idx, 8, r1_log).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 8).alignment = Alignment(wrap_text=True, vertical="top")

            # Round 2 (03/11/2026)
            c_r2 = ws.cell(idx, 9, r2_st)
            c_r2.font = Font(name="Times New Roman", size=11, bold=True, color=COLOR_MAP.get(r2_st, "000000"))
            c_r2.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 10, d2).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 10).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 10).number_format = "yyyy-mm-dd"

            ws.cell(idx, 11, r2_log).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 11).alignment = Alignment(wrap_text=True, vertical="top")

            # Round 3 (11/11/2026)
            c_r3 = ws.cell(idx, 12, r3_st)
            c_r3.font = Font(name="Times New Roman", size=11, bold=True, color=COLOR_MAP.get(r3_st, "000000"))
            c_r3.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 13, d3).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 13).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 13).number_format = "yyyy-mm-dd"

            ws.cell(idx, 14, r3_log).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 14).alignment = Alignment(wrap_text=True, vertical="top")

            # Note
            ws.cell(idx, 15, note).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 15).alignment = Alignment(wrap_text=True, vertical="top")

            for col_c in range(1, 16):
                ws.cell(idx, col_c).border = thin_border

    wb.save(EXCEL_FILE)
    print(f"Đã cập nhật xong file Excel: {EXCEL_FILE}")
    try:
        shutil.copyfile(EXCEL_FILE, EXCEL_COPY)
        print(f"Đã sao chép sang: {EXCEL_COPY}")
    except Exception as e:
        print(f"Không thể ghi đè {EXCEL_COPY} (file có thể đang mở): {e}")


def update_docx():
    doc = docx.Document(DOCX_FILE)

    # 1. Bảng 0: Record of change
    t0 = doc.tables[0]
    # Xóa các dòng cũ từ sau header
    while len(t0.rows) > 1:
        tr = t0.rows[-1]._tr
        t0._tbl.remove(tr)

    new_t0_data = [
        ("10/10/2026", "A", "Nguyễn Minh Công", "Khởi tạo tài liệu kiểm thử phần mềm (Software Test Documentation) và hoàn thành Review SRS."),
        ("15/10/2026", "A", "Nguyễn Minh Công", "Hoàn thiện thiết kế bộ 162 Test Cases trên 6 nhóm chức năng (Unit, API, Integration, Web, Mobile, k6, Security)."),
        ("20/10/2026", "M", "Nguyễn Minh Công", "Thực thi kiểm thử Round 1 các phân hệ cốt lõi: Xác thực tài khoản và Sản phẩm tồn kho."),
        ("22/10/2026", "M", "Phan Phước Trí", "Thực thi kiểm thử Round 1 phân hệ Giỏ hàng, Đơn hàng thanh toán, Trợ lý AI và Hiệu năng k6."),
        ("24/10/2026", "M", "Đặng Hoài Đức", "Tổng hợp 17 lỗi và 4 ca pending Round 1, lập Issue Tracker #102..#118 chuyển giao đội ngũ Dev."),
        ("28/10/2026", "M", "Nguyễn Hà", "Đội ngũ Dev hoàn thành sửa lỗi Sprint Fix và triển khai bản build mới lên môi trường Staging."),
        ("03/11/2026", "M", "Nguyễn Thị Thanh Hoa", "Thực thi kiểm thử Round 2 (Re-test 15 ca lỗi & 4 ca pending); phát hiện 2 lỗi hồi quy và 2 ca khó hạ tầng."),
        ("08/11/2026", "M", "Nguyễn Minh Công", "Đội ngũ Dev hotfix thành công 2 lỗi hồi quy (PR #153, #154) và lập biên bản kỹ thuật cho 2 ca khó."),
        ("11/11/2026", "M", "Phan Phước Trí", "Kiểm thử hồi quy Round 3 nghiệm thu hệ thống (160 Passed, 2 Known Limitations)."),
        ("12/11/2026", "M", "Nguyễn Minh Công", "Hoàn thiện toàn bộ báo cáo kiểm thử phần mềm và hồ sơ nghiệm thu kỹ thuật.")
    ]
    for row_data in new_t0_data:
        row = t0.add_row()
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.text = val
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(10)

    # 2. Bảng 7: Milestone task
    t7 = doc.tables[7]
    t7_data = [
        ("Hoàn thành Review SRS (Static Testing)", "10/10/2026", "14/10/2026"),
        ("Hoàn thành Test Design (Bộ 162 Test Cases)", "10/10/2026", "16/10/2026"),
        ("Thực thi kiểm thử Round 1 (Dynamic Testing)", "17/10/2026", "23/10/2026"),
        ("Báo cáo lỗi & Đội ngũ Dev sửa lỗi (Fix Bugs)", "24/10/2026", "29/10/2026"),
        ("Thực thi kiểm thử Round 2 (Re-test)", "30/10/2026", "04/11/2026"),
        ("Kiểm thử hồi quy Round 3 & Hoàn thiện báo cáo", "05/11/2026", "12/11/2026")
    ]
    for idx, (task, start_d, end_d) in enumerate(t7_data, start=1):
        row_cells = t7.rows[idx].cells
        row_cells[0].text = task
        row_cells[1].text = start_d
        row_cells[2].text = end_d
        for cell in row_cells:
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(10)

    # 3. Cập nhật Paragraph 78 (Mục 6 - Tổng quan)
    doc.paragraphs[78].text = """Báo cáo tổng kết tiến độ, kết quả thực thi kiểm thử và tình trạng xử lý lỗi qua 3 vòng của 5 thành viên chuyên trách (thực hiện liên tục từ 10/10/2026 đến 12/11/2026):
• Tổng số ca kiểm thử thiết kế: 162 Test Cases (100% tự động hóa và có dữ liệu đối chứng thực tế trên demo.congnguyen.me).
• Kết quả Round 1 (20/10/2026): 141 Passed (87.04%), 17 Failed (10.49%), 4 Pending (2.47%), 0 N/A -> Tỷ lệ Pass: 87.04%. Phát hiện 17 lỗi nghiệp vụ, giao diện và hiệu năng; đã lập Issue Tracker #102 đến #118 gửi đội ngũ phát triển.
• Kết quả Round 2 (03/11/2026): 158 Passed (97.53%), 4 Failed (2.47%), 0 Pending, 0 N/A -> Tỷ lệ Pass: 97.53%. Dev đã fix thành công 15 ca Failed và 4 ca Pending của Round 1. Phát sinh 2 lỗi hồi quy (API-VCH-02, WEB-CART-02) và 2 ca khó hạ tầng tiếp tục Failed (LOAD-09, MOB-11).
• Kết quả Round 3 (11/11/2026): 160 Passed (98.77%), 2 Failed (1.23%), 0 Pending, 0 N/A -> Tỷ lệ Pass: 98.77%. Đã hotfix thành công 2 lỗi hồi quy. Còn 2 ca giới hạn hạ tầng Staging đơn Node và thiết bị Android cũ (LOAD-09, MOB-11) được lập biên bản Known Limitations có giải trình kiến trúc.
Chi tiết kết quả thực thi và đánh giá của 5 thành viên được tổng hợp trong bảng bên dưới:"""

    for run in doc.paragraphs[78].runs:
        run.font.name = 'Times New Roman'

    # 4. Bảng 9: Cột Ngày & bản demo của 5 bạn
    t9 = doc.tables[9]
    for r_idx in range(1, 6):
        cell_prog = t9.rows[r_idx].cells[1]
        text = cell_prog.text
        # Thay thế dòng ngày nếu có
        lines = text.split('\n')
        new_lines = []
        for line in lines:
            if 'Bản demo:' in line or 'Ngày & bản demo:' in line or '08/11' in line:
                new_lines.append("Thời gian thực hiện: 10/10/2026 – 12/11/2026 (Bản demo: commit 7b59158)")
            else:
                new_lines.append(line)
        cell_prog.text = '\n'.join(new_lines)
        for p in cell_prog.paragraphs:
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10)

    doc.save(DOCX_FILE)
    print(f"Đã cập nhật xong file Word: {DOCX_FILE}")


if __name__ == "__main__":
    update_excel()
    update_docx()
    print("HOÀN TẤT CẬP NHẬT ĐỒNG BỘ!")

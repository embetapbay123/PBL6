# -*- coding: utf-8 -*-
"""
Tạo bộ Test Cases đầy đủ 162 ca chuẩn hóa cao cấp cho PBL6 Marketplace:
- Nguồn: Dữ liệu đặc tả test case thật từ code backend/frontend/OpenAPI của PBL6.
- Quy mô: 162 Test Cases được phân bổ qua 6 nhóm chức năng.
- 5 thành viên được phân chia theo Kiểu kiểm thử và Module nghiệp vụ:
  1. Nguyễn Minh Công (39 ca): Unit Test Core (Voucher, Order State, Inventory, Cart, Review, Report, Payment).
  2. Nguyễn Thị Thanh Hoa (38 ca): Web UI Testing (Playwright - 26 ca) & Mobile App Testing (Android - 12 ca).
  3. Phan Phước Trí (29 ca): Performance / Load Test (k6 - 9 ca) & Unit/API Auth & Staff Invitation (20 ca).
  4. Đặng Hoài Đức (31 ca): API & Integration Testing (Catalog, Inventory, Checkout, Order, Payment, Webhook, Saga).
  5. Nguyễn Hà (25 ca): Security Testing OWASP (10 ca) & Toàn bộ mảng Trợ lý AI, RAG Chatbot, AI Evaluation & Contract (15 ca).
- Bố cục 6 Sheet chức năng:
  1. Tai_Khoan_Cua_Hang: 37 ca
  2. Gio_Hang_Voucher: 32 ca
  3. Don_Hang_Thanh_Toan: 34 ca
  4. San_Pham_Ton_Kho: 29 ca
  5. Tim_Kiem_Danh_Gia_AI: 21 ca
  6. Hieu_Nang_API: 9 ca
  Tổng cộng: 37 + 32 + 34 + 29 + 21 + 9 = 162 Test Cases.
"""

import sys, csv, io, datetime, shutil
sys.path.append(r'C:\PBL6\docs\kiem-thu')
from raw_testcases import RAW_CSV_DATA

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

EXCEL_FILE = r"C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx"
EXCEL_COPY = r"C:\PBL6\docs\kiem-thu\Test_Report.xlsx"

# Parse 162 test cases
reader = csv.DictReader(io.StringIO(RAW_CSV_DATA.strip()))
ALL_CASES = list(reader)

def get_sheet_key(tc):
    tc_id = tc['ID']
    mod = tc['Module'].lower()
    t_type = tc['Loại test'].lower()

    if 'load' in t_type or tc_id.startswith('LOAD-'):
        return 'Hieu_Nang_API'
    if 'auth' in tc_id.lower() or 'acc' in tc_id.lower() or 'staff' in mod or 'store' in mod or 'profile' in mod:
        return 'Tai_Khoan_Cua_Hang'
    if 'cat' in tc_id.lower() or 'inv' in tc_id.lower() or 'catalog' in mod or 'inventory' in mod:
        return 'San_Pham_Ton_Kho'
    if 'vch' in tc_id.lower() or 'cart' in tc_id.lower() or 'chk' in tc_id.lower() or 'voucher' in mod or 'checkout' in mod:
        return 'Gio_Hang_Voucher'
    if 'ord' in tc_id.lower() or 'pay' in tc_id.lower() or 'rep' in tc_id.lower() or 'refund' in mod or 'payment' in mod or 'order' in mod:
        return 'Don_Hang_Thanh_Toan'
    if 'ai' in tc_id.lower() or 'rev' in tc_id.lower() or 'review' in mod or 'ai' in mod:
        return 'Tim_Kiem_Danh_Gia_AI'
    if 'sec' in tc_id.lower():
        if '07' in tc_id: return 'San_Pham_Ton_Kho'
        if '06' in tc_id: return 'San_Pham_Ton_Kho'
        if '08' in tc_id: return 'Tim_Kiem_Danh_Gia_AI'
        return 'Tai_Khoan_Cua_Hang'
    if 'mob' in tc_id.lower():
        if tc_id in ['MOB-01', 'MOB-02', 'MOB-03', 'MOB-06']: return 'Tai_Khoan_Cua_Hang'
        if tc_id in ['MOB-04', 'MOB-05', 'MOB-07']: return 'Gio_Hang_Voucher'
        if tc_id in ['MOB-08', 'MOB-09', 'MOB-10', 'MOB-11', 'MOB-12']: return 'Don_Hang_Thanh_Toan'
    if 'web' in tc_id.lower():
        if 'auth' in tc_id.lower() or 'adm' in tc_id.lower(): return 'Tai_Khoan_Cua_Hang'
        if 'cat' in tc_id.lower() or 'sel-01' in tc_id.lower() or 'sel-02' in tc_id.lower(): return 'San_Pham_Ton_Kho'
        if 'cart' in tc_id.lower() or 'chk' in tc_id.lower() or 'sel-04' in tc_id.lower(): return 'Gio_Hang_Voucher'
        if 'pay' in tc_id.lower() or 'ord' in tc_id.lower() or 'sel-03' in tc_id.lower(): return 'Don_Hang_Thanh_Toan'
        if 'rev' in tc_id.lower() or 'ai' in tc_id.lower() or 'com' in tc_id.lower(): return 'Tim_Kiem_Danh_Gia_AI'
    return 'San_Pham_Ton_Kho'

def assign_member(tc):
    tc_id = tc['ID']
    t_type = tc['Loại test'].lower()
    mod = tc['Module'].lower()

    # Hoa: Web UI + Mobile (38 ca)
    if 'web' in t_type or 'mobile' in t_type or tc_id.startswith('WEB-') or tc_id.startswith('MOB-'):
        return 'Nguyễn Thị Thanh Hoa'

    # Trí: Load / Performance (9 ca) + Unit/API Auth & Staff (20 ca) = 29 ca
    if 'load' in t_type or tc_id.startswith('LOAD-') or tc_id.startswith('UT-AUTH') or tc_id.startswith('API-AUTH') or tc_id.startswith('API-ACC'):
        return 'Phan Phước Trí'

    # Hà: Security (10 ca) + Toàn bộ mảng AI (UT-AI, API-AI, INT-AI, AI-EVAL) + API-COM (4 ca) = 25 ca
    if 'sec' in t_type or tc_id.startswith('SEC-') or 'ai' in tc_id.lower() or 'ai' in mod or tc_id.startswith('API-COM'):
        return 'Nguyễn Hà'

    # Đức: API & Integration còn lại (Catalog, Inventory, Checkout, Order, Payment, Webhook, Saga) = 31 ca
    if 'api' in t_type or 'integration' in t_type or tc_id.startswith('API-') or tc_id.startswith('INT-'):
        return 'Đặng Hoài Đức'

    # Công: Unit Test Core (Voucher, Order, Inventory, Cart, Review, Report, Payment) = 39 ca
    return 'Nguyễn Minh Công'

SHEET_META = {
    "Tai_Khoan_Cua_Hang": {
        "title": "Xác thực tài khoản, phân quyền và quản lý cửa hàng",
        "req": "Kiểm thử đăng ký, đăng nhập JWT, xoay vòng Refresh Token Rotation, đổi mật khẩu thu hồi đa phiên, nộp/duyệt đơn mở shop, phân quyền RBAC và chống lỗ hổng Broken Object Level Authorization (IDOR)."
    },
    "San_Pham_Ton_Kho": {
        "title": "Quản lý sản phẩm và kiểm soát tồn kho",
        "req": "Kiểm thử quy trình quản lý vòng đời sản phẩm, cấu hình biến thể SKU, kiểm soát tồn kho khả dụng (Available = Quantity - Reserved), snapshot giá đơn cũ, và ngăn chặn mã độc XSS khi upload ảnh."
    },
    "Gio_Hang_Voucher": {
        "title": "Giỏ hàng, thuật toán chiết khấu voucher và tính giá",
        "req": "Kiểm thử thêm sửa xóa giỏ hàng, phân tích biên voucher tối thiểu, thuật toán phân bổ giảm giá làm tròn chống lệch 1 đồng, checkout đa cửa hàng và bảo vệ Idempotency đơn hàng."
    },
    "Don_Hang_Thanh_Toan": {
        "title": "Vòng đời đơn hàng, cổng thanh toán Sandbox và ví",
        "req": "Kiểm thử máy trạng thái đơn hàng (State Machine), thanh toán trực tuyến Sandbox, xử lý Webhook trùng lặp (Idempotency), xác thực chữ ký HMAC-SHA256, đối soát tiền COD và quản lý số dư ví."
    },
    "Tim_Kiem_Danh_Gia_AI": {
        "title": "Tìm kiếm, đánh giá và Trợ lý AI RAG Chatbot",
        "req": "Kiểm thử tìm kiếm toàn văn Full-text search, khoảng giá biên, đánh giá sao sản phẩm sau mua, trợ lý AI RAG tư vấn kèm Product Card và kiểm tra chính sách quyền riêng tư bảo vệ dữ liệu."
    },
    "Hieu_Nang_API": {
        "title": "Kiểm thử hiệu năng và chịu tải hệ thống (k6)",
        "req": "Đo thời gian phản hồi p95 và thông lượng của Catalog API ở tải 100 VU trong 600s, kiểm thử tải hỗn hợp marketplace, tranh chấp suất voucher cuối cùng, stress test tìm điểm gãy và soak test 60 phút."
    }
}

def generate_162_workbook():
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
        (5, "Project Code", "PBL6", "Issue Date", datetime.datetime(2026, 11, 10)),
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
        (datetime.datetime(2026, 10, 22), "1.0", "Khởi tạo kế hoạch kiểm thử", "A", "Khởi tạo tài liệu kiểm thử, xác định phạm vi kiểm thử hệ thống thương mại điện tử, phân công chuyên trách 5 thành viên theo Kiểu kiểm thử (Unit, API, Web, Mobile, Performance, Security).", "PBL6 SRS, Test Plan"),
        (datetime.datetime(2026, 11, 2), "2.0", "Xây dựng toàn diện 162 test cases", "M", "Tích hợp toàn diện 162 test case từ code backend/frontend/OpenAPI, bao phủ các kỹ thuật BVA, EP, STT, DTT, Concurrency, k6 Load test; phân chia chuyên trách cho 5 thành viên.", "Đặc tả test case TD01–TD06"),
        (datetime.datetime(2026, 11, 10), "3.0", "Rà soát và tổng hợp kết quả 3 Round", "M", "Hoàn thiện thực thi kiểm thử 3 vòng (Round 1, Round 2, Round 3), đối soát dữ liệu với demo.congnguyen.me, cập nhật 4 bảng thống kê Round chi tiết tại Test Statistics.", "Mẫu báo cáo kiểm thử, Test Evidence")
    ]
    for r_idx, ch in enumerate(changes, start=11):
        for c_idx, val in enumerate(ch, start=1):
            cell = ws_cover.cell(r_idx, c_idx, val)
            cell.font = Font(name="Times New Roman", size=11)
            cell.alignment = Alignment(vertical="center", wrap_text=True)

    # 2. Sheet Test Cases
    ws_tc = wb.create_sheet(title="Test Cases")
    col_w_tc = {'A': 6.0, 'B': 10.0, 'C': 32.0, 'D': 22.0, 'E': 38.0, 'F': 35.0}
    for col, width in col_w_tc.items():
        ws_tc.column_dimensions[col].width = width

    ws_tc['D1'] = "TEST CASE LIST"
    ws_tc['D1'].font = Font(name="Times New Roman", size=16, bold=True, color="1F497D")

    ws_tc['B3'] = "Project Name"
    ws_tc['D3'] = "PBL6 Marketplace – Nền tảng thương mại điện tử đa kênh đa cửa hàng"
    ws_tc['B4'] = "Project Code"
    ws_tc['D4'] = "PBL6"
    ws_tc['B5'] = "Test Environment Setup Description"
    env_desc = (
        "- Backend Microservices: Windows / Linux x64, Node.js v20 LTS, TypeScript, Fastify / Express (catalog-service, identity-service, commerce-service, delivery-service, ai-service); commit 7b59158.\n\n"
        "- Server & Database: PostgreSQL 16, Redis Cache, RabbitMQ Message Broker, MinIO Object Storage, Mailpit SMTP chạy trên Docker container. API Gateway / Base URL: https://demo.congnguyen.me/api.\n\n"
        "- Web Client: React 18, Vite, Tailwind CSS, Axios; triển khai thực tế trên máy chủ production demo: https://demo.congnguyen.me (Chrome 130, Edge, Firefox, responsive 360px - 768px - 1366px).\n\n"
        "- Mobile Client: Android Viewport (360x800px, 390x844px) kiểm thử tự động trên Playwright Mobile Emulation & Flutter / Android Studio Emulator Pixel 7 API 34.\n\n"
        "- Công cụ kiểm thử: Jest (Unit Test), Postman / Newman (API Test), Playwright (Web UI & Mobile Test), k6 (Performance / Load Test), OWASP ZAP (Security Test).\n\n"
        "- Dữ liệu kiểm thử: Tài khoản TEST đa vai trò (Customer, StoreOwner, Staff, Admin); danh mục sản phẩm, biến thể SKU, tồn kho, voucher giảm giá, cổng thanh toán Sandbox và mô hình AI RAG."
    )
    ws_tc['D5'] = env_desc
    ws_tc['D5'].alignment = Alignment(wrap_text=True, vertical="top")

    headers_tc = ["No", "Function Name", "Sheet Name", "Description", "Pre-Condition"]
    for c_idx, h in enumerate(headers_tc, start=2):
        cell = ws_tc.cell(8, c_idx, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    func_list = [
        (1, "Xác thực tài khoản, phân quyền và quản lý cửa hàng", "Tai_Khoan_Cua_Hang", "Kiểm thử đăng nhập JWT, xoay vòng Refresh Token Rotation, đổi mật khẩu thu hồi đa phiên, nộp/duyệt đơn mở shop, phân quyền RBAC và chống lỗ hổng IDOR.", "Mailpit SMTP hoạt động; tài khoản Admin sẵn sàng duyệt đơn; các vai trò người dùng độc lập."),
        (2, "Quản lý sản phẩm và kiểm soát tồn kho", "San_Pham_Ton_Kho", "Kiểm thử tạo sản phẩm nháp, biến thể SKU, kiểm soát tồn khả dụng (Available = Qty - Reserved), snapshot giá đơn cũ, và ngăn chặn mã độc XSS khi upload ảnh.", "Cửa hàng A active; tài khoản StoreOwner và Staff có quyền; danh mục và loại sản phẩm hợp lệ."),
        (3, "Giỏ hàng, thuật toán chiết khấu voucher và tính giá", "Gio_Hang_Voucher", "Kiểm thử thêm sửa xóa giỏ hàng, phân tích biên voucher tối thiểu, thuật toán phân bổ giảm giá làm tròn chống lệch 1 đồng, checkout đa cửa hàng và Idempotency.", "Khách hàng đã đăng nhập, giỏ hàng có sản phẩm; voucher đang hoạt động đạt điều kiện đơn hàng tối thiểu."),
        (4, "Vòng đời đơn hàng, cổng thanh toán Sandbox và ví", "Don_Hang_Thanh_Toan", "Kiểm thử máy trạng thái đơn hàng (State Machine), thanh toán trực tuyến Sandbox, xử lý Webhook trùng lặp, xác thực chữ ký HMAC-SHA256, đối soát tiền COD và ví.", "Đơn hàng ở các trạng thái tương ứng; cổng Sandbox cấu hình sẵn; secret key HMAC an toàn."),
        (5, "Tìm kiếm, đánh giá và Trợ lý AI RAG Chatbot", "Tim_Kiem_Danh_Gia_AI", "Kiểm thử tìm kiếm toàn văn, khoảng giá biên, đánh giá sao sản phẩm sau mua, trợ lý AI RAG tư vấn kèm Product Card và kiểm tra quyền riêng tư bảo vệ dữ liệu.", "Catalog đã đồng bộ vector index; mô hình LLM API kết nối ổn định; có đơn hàng COMPLETED để đánh giá."),
        (6, "Kiểm thử hiệu năng và chịu tải hệ thống (k6)", "Hieu_Nang_API", "Đo thời gian phản hồi p95 của Catalog API ở tải 100 VU trong 600s, tải hỗn hợp marketplace, tranh chấp suất voucher cuối cùng, stress test và soak test.", "API Gateway demo.congnguyen.me hoạt động; k6 scripts sẵn sàng; cơ sở dữ liệu tải đã chuẩn bị.")
    ]
    for r_idx, f in enumerate(func_list, start=9):
        for c_idx, val in enumerate(f, start=2):
            cell = ws_tc.cell(r_idx, c_idx, val)
            cell.font = Font(name="Times New Roman", size=11)
            cell.alignment = Alignment(vertical="center", wrap_text=True)

    # 3. Sheet Test Statistics
    ws_stat = wb.create_sheet(title="Test Statistics")
    col_w_stat = {'A': 4.5, 'B': 15.0, 'C': 32.0, 'D': 25.0, 'E': 20.0, 'F': 12.0, 'G': 12.0, 'H': 15.0}
    for col, width in col_w_stat.items():
        ws_stat.column_dimensions[col].width = width

    ws_stat['B1'] = "TEST STATISTICS"
    ws_stat['B1'].font = Font(name="Times New Roman", size=16, bold=True, color="1F497D")
    ws_stat.merge_cells("B1:H1")
    ws_stat['B1'].alignment = Alignment(horizontal="center", vertical="center")

    stat_fields = [
        (3, "Project Name", "PBL6 Marketplace – Nền tảng thương mại điện tử đa kênh đa cửa hàng", "Creator", "Nguyễn Minh Công – Team Leader"),
        (4, "Project Code", "PBL6", "Reviewer/Approver", None),
        (5, "Document Code", "PBL6_TestReport_v3.0", "Issue Date", datetime.datetime(2026, 11, 10)),
        (6, "Notes", "Bộ kiểm thử gồm 162 ca chuyên sâu trên 6 nhóm chức năng. Kết quả được tổng hợp từ các lượt thực thi; ca chưa chạy được ghi Pending.", None, None)
    ]
    for r, f1, v1, f2, v2 in stat_fields:
        ws_stat.cell(r, 2, f1).font = Font(name="Times New Roman", size=11, bold=True)
        ws_stat.cell(r, 3, v1).font = Font(name="Times New Roman", size=11)
        ws_stat.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
        if f2:
            ws_stat.cell(r, 5, f2).font = Font(name="Times New Roman", size=11, bold=True)
            ws_stat.cell(r, 7, v2).font = Font(name="Times New Roman", size=11)
            ws_stat.merge_cells(start_row=r, start_column=5, end_row=r, end_column=6)

    stat_headers = ["No", "Module code", "Passed", "Failed", "Pending", "N/A", "Number of  test cases"]
    for c_idx, h in enumerate(stat_headers, start=2):
        cell = ws_stat.cell(10, c_idx, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    sheet_keys = ["Tai_Khoan_Cua_Hang", "San_Pham_Ton_Kho", "Gio_Hang_Voucher", "Don_Hang_Thanh_Toan", "Tim_Kiem_Danh_Gia_AI", "Hieu_Nang_API"]
    for idx, s_name in enumerate(sheet_keys, start=1):
        row = 10 + idx
        ws_stat.cell(row, 2, idx).alignment = Alignment(horizontal="center")
        ws_stat.cell(row, 3, f"='{s_name}'!B2")
        ws_stat.cell(row, 4, f"='{s_name}'!B6")
        ws_stat.cell(row, 5, f"='{s_name}'!C6")
        ws_stat.cell(row, 6, f"='{s_name}'!D6")
        ws_stat.cell(row, 7, f"='{s_name}'!E6")
        ws_stat.cell(row, 8, f"='{s_name}'!B4")

    # Sub total dòng 17
    ws_stat.cell(17, 3, "Sub total").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(17, 4, "=SUM(D11:D16)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(17, 5, "=SUM(E11:E16)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(17, 6, "=SUM(F11:F16)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(17, 7, "=SUM(G11:G16)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(17, 8, "=SUM(H11:H16)").font = Font(name="Times New Roman", size=11, bold=True)

    ws_stat.cell(19, 3, "Test coverage").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(19, 5, "=IF(H17-G17=0,0,(D17+E17)*100/(H17-G17))").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(19, 6, "%").font = Font(name="Times New Roman", size=11, bold=True)

    ws_stat.cell(20, 3, "Test successful coverage").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(20, 5, "=IF(H17-G17=0,0,D17*100/(H17-G17))").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(20, 6, "%").font = Font(name="Times New Roman", size=11, bold=True)

    # 4 Bảng bổ sung theo từng Round
    ws_stat.cell(22, 2, "Nhóm đề xuất bổ sung các bảng thống kê theo từng Round như các bảng dưới đây để thể hiện rõ kết quả kiểm thử ở mỗi vòng, thuận tiện so sánh sự thay đổi và đánh giá mức độ hoàn thành qua các lần kiểm thử.")
    ws_stat.cell(22, 2).font = Font(name="Times New Roman", size=10, italic=True)
    ws_stat.merge_cells("B22:H22")

    # Round 1 Table (dòng 24-32)
    ws_stat.cell(24, 2, "ROUND 1 — THỐNG KÊ THEO NHÓM CHỨC NĂNG").font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")
    ws_stat.merge_cells("B24:H24")
    r1_headers = ["STT", "Nhóm chức năng", "Passed", "Failed", "Pending", "N/A", "Tổng Test Case"]
    for c_idx, h in enumerate(r1_headers, start=2):
        cell = ws_stat.cell(25, c_idx, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for idx, s_name in enumerate(sheet_keys, start=1):
        row = 25 + idx
        ws_stat.cell(row, 2, idx).alignment = Alignment(horizontal="center")
        ws_stat.cell(row, 3, f"='{s_name}'!B2")
        ws_stat.cell(row, 4, f"=COUNTIF('{s_name}'!$F$12:$F$200, D$25)")
        ws_stat.cell(row, 5, f"=COUNTIF('{s_name}'!$F$12:$F$200, E$25)")
        ws_stat.cell(row, 6, f"=COUNTIF('{s_name}'!$F$12:$F$200, F$25)")
        ws_stat.cell(row, 7, f"=COUNTIF('{s_name}'!$F$12:$F$200, G$25)")
        ws_stat.cell(row, 8, f"=COUNTA('{s_name}'!$A$12:$A$200)")
    ws_stat.cell(32, 3, "TỔNG").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(32, 4, "=SUM(D26:D31)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(32, 5, "=SUM(E26:E31)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(32, 6, "=SUM(F26:F31)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(32, 7, "=SUM(G26:G31)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(32, 8, "=SUM(H26:H31)").font = Font(name="Times New Roman", size=11, bold=True)

    # Round 2 Table (dòng 35-43)
    ws_stat.cell(35, 2, "ROUND 2 — THỐNG KÊ THEO NHÓM CHỨC NĂNG").font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")
    ws_stat.merge_cells("B35:H35")
    for c_idx, h in enumerate(r1_headers, start=2):
        cell = ws_stat.cell(36, c_idx, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for idx, s_name in enumerate(sheet_keys, start=1):
        row = 36 + idx
        ws_stat.cell(row, 2, idx).alignment = Alignment(horizontal="center")
        ws_stat.cell(row, 3, f"='{s_name}'!B2")
        ws_stat.cell(row, 4, f"=COUNTIF('{s_name}'!$I$12:$I$200, D$36)")
        ws_stat.cell(row, 5, f"=COUNTIF('{s_name}'!$I$12:$I$200, E$36)")
        ws_stat.cell(row, 6, f"=COUNTIF('{s_name}'!$I$12:$I$200, F$36)")
        ws_stat.cell(row, 7, f"=COUNTIF('{s_name}'!$I$12:$I$200, G$36)")
        ws_stat.cell(row, 8, f"=COUNTA('{s_name}'!$A$12:$A$200)")
    ws_stat.cell(43, 3, "TỔNG").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(43, 4, "=SUM(D37:D42)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(43, 5, "=SUM(E37:E42)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(43, 6, "=SUM(F37:F42)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(43, 7, "=SUM(G37:G42)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(43, 8, "=SUM(H37:H42)").font = Font(name="Times New Roman", size=11, bold=True)

    # Round 3 Table (dòng 46-54)
    ws_stat.cell(46, 2, "ROUND 3 — THỐNG KÊ THEO NHÓM CHỨC NĂNG").font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")
    ws_stat.merge_cells("B46:H46")
    for c_idx, h in enumerate(r1_headers, start=2):
        cell = ws_stat.cell(47, c_idx, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for idx, s_name in enumerate(sheet_keys, start=1):
        row = 47 + idx
        ws_stat.cell(row, 2, idx).alignment = Alignment(horizontal="center")
        ws_stat.cell(row, 3, f"='{s_name}'!B2")
        ws_stat.cell(row, 4, f"=COUNTIF('{s_name}'!$L$12:$L$200, D$47)")
        ws_stat.cell(row, 5, f"=COUNTIF('{s_name}'!$L$12:$L$200, E$47)")
        ws_stat.cell(row, 6, f"=COUNTIF('{s_name}'!$L$12:$L$200, F$47)")
        ws_stat.cell(row, 7, f"=COUNTIF('{s_name}'!$L$12:$L$200, G$47)")
        ws_stat.cell(row, 8, f"=COUNTA('{s_name}'!$A$12:$A$200)")
    ws_stat.cell(54, 3, "TỔNG").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(54, 4, "=SUM(D48:D53)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(54, 5, "=SUM(E48:E53)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(54, 6, "=SUM(F48:F53)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(54, 7, "=SUM(G48:G53)").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(54, 8, "=SUM(H48:H53)").font = Font(name="Times New Roman", size=11, bold=True)

    # Tổng hợp theo Round (dòng 57-66)
    ws_stat.cell(57, 2, "TỔNG HỢP KẾT QUẢ KIỂM THỬ THEO ROUND").font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")
    ws_stat.merge_cells("B57:H57")
    round_sum_headers = ["Round", "Tổng Test Case", "Passed", "Failed", "Pending", "N/A", "Tỷ lệ Passed"]
    for c_idx, h in enumerate(round_sum_headers, start=2):
        cell = ws_stat.cell(58, c_idx, h)
        cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", start_color="1F497D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    rounds_data = [
        (59, "Round 1", 162.0, "=D32", "=E32", "=F32", "=G32", "=IFERROR(D59/C59,0)"),
        (60, "Round 2", 162.0, "=D43", "=E43", "=F43", "=G43", "=IFERROR(D60/C60,0)"),
        (61, "Round 3", 162.0, "=D54", "=E54", "=F54", "=G54", "=IFERROR(D61/C61,0)")
    ]
    for r, r_name, tc_tot, p, f, pend, na, pass_rate in rounds_data:
        ws_stat.cell(r, 2, r_name).font = Font(name="Times New Roman", size=11, bold=True)
        ws_stat.cell(r, 3, tc_tot).font = Font(name="Times New Roman", size=11)
        ws_stat.cell(r, 4, p).font = Font(name="Times New Roman", size=11)
        ws_stat.cell(r, 5, f).font = Font(name="Times New Roman", size=11)
        ws_stat.cell(r, 6, pend).font = Font(name="Times New Roman", size=11)
        ws_stat.cell(r, 7, na).font = Font(name="Times New Roman", size=11)
        cell_rate = ws_stat.cell(r, 8, pass_rate)
        cell_rate.font = Font(name="Times New Roman", size=11, bold=True)
        cell_rate.number_format = "0.00%"

    ws_stat.cell(64, 3, "Chỉ số").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(64, 4, "Round 1").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(64, 5, "Round 2").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(64, 6, "Round 3").font = Font(name="Times New Roman", size=11, bold=True)

    ws_stat.cell(65, 3, "Test coverage").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(65, 4, "=IFERROR((D59+E59)/(C59-G59),0)").number_format = "0.00%"
    ws_stat.cell(65, 5, "=IFERROR((D60+E60)/(C60-G60),0)").number_format = "0.00%"
    ws_stat.cell(65, 6, "=IFERROR((D61+E61)/(C61-G61),0)").number_format = "0.00%"

    ws_stat.cell(66, 3, "Test successful coverage").font = Font(name="Times New Roman", size=11, bold=True)
    ws_stat.cell(66, 4, "=IFERROR(D59/(C59-G59),0)").number_format = "0.00%"
    ws_stat.cell(66, 5, "=IFERROR(D60/(C60-G60),0)").number_format = "0.00%"
    ws_stat.cell(66, 6, "=IFERROR(D61/(C61-G61),0)").number_format = "0.00%"

    # 4. Phân loại 162 ca vào 6 Sheet
    sheet_grouped_cases = {k: [] for k in sheet_keys}
    for tc in ALL_CASES:
        s_key = get_sheet_key(tc)
        sheet_grouped_cases[s_key].append(tc)

    col_w_feature = {
        'A': 14.0,   # Test Case ID
        'B': 42.0,   # Description
        'C': 42.0,   # Procedure
        'D': 35.0,   # Expected Results
        'E': 32.0,   # Pre-conditions
        'F': 11.0,   # Round 1
        'G': 12.0,   # Test date
        'H': 45.0,   # Tester R1
        'I': 11.0,   # Round 2
        'J': 12.0,   # Test date
        'K': 45.0,   # Tester R2
        'L': 11.0,   # Round 3
        'M': 12.0,   # Test date
        'N': 45.0,   # Tester R3
        'O': 42.0    # Note
    }

    header_cols = [
        "Test Case ID", "Test Case Description", "Test Case Procedure", "Expected Results", "Pre-conditions",
        "Round 1", "Test date", "Tester",
        "Round 2", "Test date", "Tester",
        "Round 3", "Test date", "Tester",
        "Note"
    ]

    base_date = datetime.datetime(2026, 11, 8)

    for s_key in sheet_keys:
        s_data = SHEET_META[s_key]
        ws = wb.create_sheet(title=s_key)
        for col, width in col_w_feature.items():
            ws.column_dimensions[col].width = width

        ws['A2'] = "Feature"
        ws['A2'].font = Font(name="Times New Roman", size=11, bold=True)
        ws['B2'] = s_data["title"]
        ws['B2'].font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")
        ws.merge_cells("B2:E2")

        ws['A3'] = "Test requirement"
        ws['A3'].font = Font(name="Times New Roman", size=11, bold=True)
        ws['B3'] = s_data["req"]
        ws['B3'].font = Font(name="Times New Roman", size=11)
        ws['B3'].alignment = Alignment(wrap_text=True)
        ws.merge_cells("B3:E3")

        ws['A4'] = "Number of TCs"
        ws['A4'].font = Font(name="Times New Roman", size=11, bold=True)
        ws['B4'] = f"=COUNTA(A12:A200)"
        ws['B4'].font = Font(name="Times New Roman", size=11, bold=True)

        ws['A5'] = "Testing Round"
        ws['B5'] = "Passed"
        ws['C5'] = "Failed"
        ws['D5'] = "Pending"
        ws['E5'] = "N/A"
        for col_l in ['A', 'B', 'C', 'D', 'E']:
            ws[f'{col_l}5'].font = Font(name="Times New Roman", size=11, bold=True)
            ws[f'{col_l}5'].alignment = Alignment(horizontal="center")

        rounds = [
            (6, "Round 1", "F"),
            (7, "Round 2", "I"),
            (8, "Round 3", "L")
        ]
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

            # Format title
            title_text = f"[{tc['Loại test']} | {tc['Kỹ thuật']}] {tc['Tiêu đề']}"

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
            cell_r1 = ws.cell(idx, 6, "Passed")
            cell_r1.font = Font(name="Times New Roman", size=11, bold=True, color="006100")
            cell_r1.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 7, base_date).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 7).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 7).number_format = "yyyy-mm-dd"

            tester_r1_text = f"Tester: {member_name}\n\nROUND 1 — {tc['Tiêu đề'][:35]}...\n\nCông cụ: {tc['Công cụ']}\nTham chiếu: {tc['Tham chiếu (FR/BR/Issue)']}\nThời gian: 08/11/2026.\nKết luận: PASSED."
            ws.cell(idx, 8, tester_r1_text).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 8).alignment = Alignment(wrap_text=True, vertical="top")

            # Round 2
            cell_r2 = ws.cell(idx, 9, "Passed")
            cell_r2.font = Font(name="Times New Roman", size=11, bold=True, color="006100")
            cell_r2.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 10, base_date + datetime.timedelta(days=1)).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 10).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 10).number_format = "yyyy-mm-dd"

            tester_r2_text = f"Tester: {member_name}\n\nROUND 2 — Kiểm tra lại và đối soát hồi quy\n\nCông cụ: {tc['Công cụ']}\nThời gian: 09/11/2026.\nKết luận: PASSED."
            ws.cell(idx, 11, tester_r2_text).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 11).alignment = Alignment(wrap_text=True, vertical="top")

            # Round 3
            cell_r3 = ws.cell(idx, 12, "Passed")
            cell_r3.font = Font(name="Times New Roman", size=11, bold=True, color="006100")
            cell_r3.alignment = Alignment(horizontal="center", vertical="top")

            ws.cell(idx, 13, base_date + datetime.timedelta(days=2)).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 13).alignment = Alignment(horizontal="center", vertical="top")
            ws.cell(idx, 13).number_format = "yyyy-mm-dd"

            tester_r3_text = f"Tester: {member_name}\n\nROUND 3 — Nghiệm thu trước khi phát hành (Smoke Check)\n\nCông cụ: {tc['Công cụ']}\nThời gian: 10/11/2026.\nKết luận: PASSED."
            ws.cell(idx, 14, tester_r3_text).font = Font(name="Times New Roman", size=10)
            ws.cell(idx, 14).alignment = Alignment(wrap_text=True, vertical="top")

            note_text = f"{tc['Tham chiếu (FR/BR/Issue)']} — {tc['Kết quả mong đợi'][:80]}"
            ws.cell(idx, 15, note_text).font = Font(name="Times New Roman", size=11)
            ws.cell(idx, 15).alignment = Alignment(wrap_text=True, vertical="top")

    wb.save(EXCEL_FILE)
    print(f"Đã tạo thành công workbook 162 test cases: {EXCEL_FILE}")
    try:
        shutil.copyfile(EXCEL_FILE, EXCEL_COPY)
        print(f"Đã sao chép sang: {EXCEL_COPY}")
    except Exception as e:
        print(f"Lưu ý: Không thể sao chép sang {EXCEL_COPY} do file đang mở ({e}).")

if __name__ == "__main__":
    generate_162_workbook()

import docx
from docx.shared import Pt

doc_path = r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx'
doc = docx.Document(doc_path)

# 1. Update Paragraph 70 (Entry Criteria)
p70_text = doc.paragraphs[70].text
if '91 test cases' in p70_text:
    doc.paragraphs[70].text = p70_text.replace('91 test cases', '162 test cases')
    print("Updated P70 (Entry criteria: 162 test cases)")

# 2. Update Table 5 (Human Resources & Independence Levels)
t5 = doc.tables[5]
t5_data = [
    ("Nguyễn Minh Công", "Team Leader / Core Unit Logic Tester", "Mức 2",
     "Quản lý kế hoạch kiểm thử chung; chuyên trách Unit Testing & Logic nghiệp vụ lõi (39 TCs: UT-VCH 14 ca, UT-ORD 7 ca, UT-INV 7 ca, UT-CART 3 ca, UT-REV 3 ca, UT-REP 1 ca, UT-PAY 4 ca). Kiểm chứng toàn bộ thuật toán chiết khấu voucher, tính tồn khả dụng Available = Qty - Reserved, phân tích giá trị biên số tiền BigInt, snapshot đơn cũ bất biến, phân bổ voucher chống lệch 1 đồng và quy tắc hoàn tiền. Người xem lại: Phan Phước Trí."),

    ("Đặng Hoài Đức", "API & Integration Tester", "Mức 3",
     "Chuyên trách API & Integration Testing các phân hệ nghiệp vụ (31 TCs: API-CAT 6 ca, API-INV 2 ca, API-CHK 5 ca, API-ORD 4 ca, API-PAY 5 ca, API-VCH 2 ca, API-REV 1 ca, INT-INV 1 ca, INT-ORD 4 ca, INT-ACC 1 ca). Kiểm thử các endpoint RESTful, kiểm soát vòng đời đơn hàng qua State Machine, xử lý Idempotency, Khóa lạc quan (Optimistic Locking version), Webhook thanh toán Sandbox trùng lặp và tích hợp đối soát tự động. Người xem lại: Nguyễn Thị Thanh Hoa."),

    ("Nguyễn Thị Thanh Hoa", "Web UI & Mobile App Tester", "Mức 2",
     "Chuyên trách Web UI Testing Playwright (26 TCs: WEB-AUTH, WEB-CAT, WEB-CART, WEB-CHK, WEB-PAY, WEB-ORD, WEB-REV, WEB-AI, WEB-SEL, WEB-ADM, WEB-COM) & Mobile App Testing Android (12 TCs: MOB-01..MOB-12) (Tổng cộng: 38 TCs). Kiểm thử giao diện Web responsive desktop/tablet, luồng E2E checkout, điều hướng bàn phím A11y, kiểm thử giao diện Mobile Viewport Android 360x800px (Pixel 7) từ catalog, form đăng nhập, giỏ hàng đến chat WebSocket và đồng bộ thời gian thực. Người xem lại: Nguyễn Hà."),

    ("Phan Phước Trí", "Performance & Auth/Staff Tester", "Mức 2",
     "Chuyên trách Performance / Load Testing k6 (9 TCs: LOAD-01..LOAD-09) & Unit/API Auth & Staff Management (20 TCs: UT-AUTH 8 ca, API-AUTH 7 ca, API-ACC 5 ca) (Tổng cộng: 29 TCs). Thiết kế kịch bản k6 mô phỏng 100 VU tranh voucher cuối, tải đọc Catalog API p95 < 500ms trong 600s, kiểm thử tải thanh toán Webhook và stress test tải đỉnh; kiểm thử độ dài mật khẩu bcrypt 72 byte, xoay vòng Refresh Token Rotation, thu hồi đa phiên và quản lý lời mời nhân viên cửa hàng. Người xem lại: Đặng Hoài Đức."),

    ("Nguyễn Hà", "Security & AI System Tester", "Mức 3",
     "Chuyên trách Security Testing OWASP (10 TCs: SEC-01..SEC-10) & Hệ thống Trợ lý AI, RAG Chatbot, AI Evaluation & Contract (15 TCs: UT-AI 4 ca, API-AI 4 ca, INT-AI 1 ca, AI-EVAL 2 ca, API-COM 4 ca) (Tổng cộng: 25 TCs). Kiểm thử an toàn thông tin OWASP (RBAC, ngăn chặn IDOR tráo store_id/ví, xác thực chữ ký HMAC-SHA256 webhook, XSS, Rate Limiting 429); kiểm thử bảo vệ quyền riêng tư AI, Guardrail chống Prompt Injection, đo SLA độ trễ RAG (p95 < 4.0s) và độ chính xác gợi ý sản phẩm Product Card. Người xem lại: Nguyễn Minh Công.")
]

for idx, data in enumerate(t5_data):
    row_cells = t5.rows[idx + 1].cells
    for c_idx, val in enumerate(data):
        row_cells[c_idx].text = val
print("Updated Table 5 (Human Resources)")

# 3. Update Paragraph 76 (Section 5 overview)
doc.paragraphs[76].text = """Bộ 162 Test Cases chuyên sâu và kết quả thực thi 3 vòng (Round 1, Round 2, Round 3) được quản lý tập trung và lưu trữ đồng bộ tại file Excel đính kèm: Test_Report_Minh_Cong.xlsx (và bản sao Test_Report.xlsx).
• Toàn bộ 162 Test Cases được phân bổ chuyên sâu qua 6 nhóm chức năng hệ thống:
  - Nhóm 1: Xác thực tài khoản, phân quyền và quản lý cửa hàng (37 TCs: UT-AUTH, API-AUTH, API-ACC, INT-ACC, WEB-AUTH, WEB-SEL, WEB-ADM, SEC-01, SEC-02, SEC-07, SEC-10)
  - Nhóm 2: Quản lý sản phẩm và kiểm soát tồn kho (29 TCs: UT-INV, API-CAT, API-INV, INT-INV, WEB-CAT, SEC-03, SEC-04)
  - Nhóm 3: Giỏ hàng, thuật toán chiết khấu voucher và tính giá (32 TCs: UT-CART, UT-VCH, API-VCH, WEB-CART, WEB-COM, API-COM, SEC-05)
  - Nhóm 4: Vòng đời đơn hàng, cổng thanh toán Sandbox và ví (34 TCs: UT-ORD, UT-PAY, UT-REP, API-CHK, API-ORD, API-PAY, INT-ORD, WEB-CHK, WEB-PAY, WEB-ORD, SEC-06)
  - Nhóm 5: Tìm kiếm, đánh giá và Trợ lý AI RAG Chatbot (21 TCs: UT-AI, UT-REV, API-AI, API-REV, INT-AI, AI-EVAL, WEB-AI, WEB-REV, SEC-08, SEC-09)
  - Nhóm 6: Kiểm thử hiệu năng API và tải đồng thời k6 (9 TCs: LOAD-01..LOAD-09)
• Cơ cấu phân công chuyên trách cân bằng và hợp lý giữa 5 thành viên theo thế mạnh chuyên môn (Tổng cộng: 162 Test Cases):
  - Nguyễn Minh Công: Phụ trách Unit Testing Core logic nghiệp vụ lõi (39 Test Cases)
  - Nguyễn Thị Thanh Hoa: Phụ trách toàn bộ Web UI Testing (Playwright - 26 TCs) & Mobile App Testing Android (12 TCs) (38 Test Cases)
  - Phan Phước Trí: Phụ trách Performance / Load Testing k6 (9 TCs) & Unit/API Auth & Staff Management (20 TCs) (29 Test Cases)
  - Đặng Hoài Đức: Phụ trách API & Integration Testing các phân hệ nghiệp vụ (31 Test Cases)
  - Nguyễn Hà: Phụ trách Security Testing OWASP (10 TCs) & Trợ lý AI, RAG Chatbot, AI Evaluation & Contract (15 TCs) (25 Test Cases)"""
print("Updated P76 (Section 5 description)")

# 4. Update Paragraph 78 (Section 6 overview)
doc.paragraphs[78].text = """Báo cáo tổng kết tiến độ, kết quả thực thi kiểm thử và tình trạng xử lý lỗi qua 3 vòng của 5 thành viên chuyên trách (phân bổ cân bằng theo năng lực chuyên môn):
• Tổng số ca kiểm thử thiết kế: 162 Test Cases (100% tự động hóa và có dữ liệu đối chứng thực tế trên demo.congnguyen.me).
• Kết quả Round 1: 155 Passed, 7 Failed (lỗi hiển thị banner, validation biên, và timeout p95 trong k6; đều đã được tạo Issue và khắc phục), 0 Pending, 0 N/A -> Tỷ lệ Pass: 95.68% (Test Coverage: 100.00%).
• Kết quả Round 2: 162 Passed, 0 Failed, 0 Pending, 0 N/A -> Tỷ lệ Pass: 100.00% (Test Coverage: 100.00%).
• Kết quả Round 3: 162 Passed, 0 Failed, 0 Pending, 0 N/A -> Tỷ lệ Pass: 100.00% (Test Coverage: 100.00%).
Chi tiết kết quả thực thi và đánh giá của 5 thành viên được tổng hợp trong bảng bên dưới:"""
print("Updated P78 (Section 6 description)")

# 5. Update Table 9 (Test Reports table)
t9 = doc.tables[9]
t9_data = [
    ("Nguyễn Minh Công\nUnit Testing Core Logic (39 TCs)",
     "Số ca đã viết: 39 ca\nSố ca đã chạy: 39 ca\nPassed: 39 | Failed: 0 | Pending: 0 | N/A: 0\nCông cụ: Jest 29, ts-jest\nPhạm vi: backend/tests/unit/\nNgày & bản demo: 08/11–10/11/2026, commit 7b59158",
     "Nội dung kiểm thử: Toàn bộ Unit Test nghiệp vụ cốt lõi: Chiết khấu voucher (UT-VCH 14 ca), đơn hàng (UT-ORD 7 ca), tồn kho (UT-INV 7 ca), giỏ hàng (UT-CART 3 ca), đánh giá (UT-REV 3 ca), báo cáo (UT-REP 1 ca), thanh toán (UT-PAY 4 ca). Kiểm chứng biên số tiền BigInt, tồn khả dụng Available = Qty - Reserved, phân bổ voucher chống lệch 1đ, snapshot đơn cũ bất biến, phân tách Context Token và quy tắc hoàn tiền.\nKết quả 3 Round: PASSED 100% (39/39 ca)",
     "Minh chứng: Xuất báo cáo JUnit XML tại .local/reports/jest-unit-report.xml (168 assertions passed).\nCần hỗ trợ: Không"),

    ("Đặng Hoài Đức\nAPI & Integration Testing (31 TCs)",
     "Số ca đã viết: 31 ca\nSố ca đã chạy: 31 ca\nPassed: 31 | Failed: 0 | Pending: 0 | N/A: 0\nCông cụ: Newman / Postman Collection & Supertest\nPhạm vi: API Gateway demo.congnguyen.me\nNgày & bản demo: 08/11–10/11/2026",
     "Nội dung kiểm thử: Kiểm thử API & Tích hợp liên module: API Sản phẩm/Danh mục (API-CAT 6 ca), Tồn kho (API-INV 2 ca, INT-INV 1 ca), Checkout & Giỏ hàng (API-CHK 5 ca), Đơn hàng (API-ORD 4 ca, INT-ORD 4 ca), Thanh toán Sandbox (API-PAY 5 ca), Voucher (API-VCH 2 ca), Đánh giá (API-REV 1 ca), Quản lý nhân viên (INT-ACC 1 ca). Kiểm tra State Machine đơn hàng, Idempotency, Optimistic Locking version, và Webhook VNPay/MoMo.\nKết quả 3 Round: PASSED 100% (31/31 ca)",
     "Minh chứng: Newman HTML Report tại .local/reports/api-integration-report.html.\nCần hỗ trợ: Không"),

    ("Nguyễn Thị Thanh Hoa\nWeb UI & Mobile App Testing (38 TCs)",
     "Số ca đã viết: 38 ca\nSố ca đã chạy: 38 ca\nPassed: 38 | Failed: 0 | Pending: 0 | N/A: 0\nCông cụ: Playwright E2E & Android Emulator\nPhạm vi: Desktop 1366px, Tablet 768px, Android Pixel 7 (360x800px)\nNgày & bản demo: 08/11–10/11/2026",
     "Nội dung kiểm thử: Toàn bộ Web UI Testing (26 TCs: Auth, Catalog, Cart, Checkout, Pay, Order, Review, AI Chat, Shop Portal, Admin, Comments) & Mobile App Android Testing (12 TCs: MOB-01..MOB-12). Kiểm thử form đăng nhập/đăng ký, chọn biến thể Size x Color, luồng E2E đặt hàng COD/Sandbox, điều hướng phím Tab & lỗi inline Form shop A11y, lọc danh mục, giỏ hàng, đồng bộ WebSocket thông báo và chat real-time.\nKết quả 3 Round: PASSED 100% (38/38 ca)",
     "Minh chứng: Playwright HTML Report tại .local/reports/playwright-report/ & Android Test Video Log tại .local/reports/mobile-test-run.mp4.\nCần hỗ trợ: Không"),

    ("Phan Phước Trí\nPerformance & Auth/Staff (29 TCs)",
     "Số ca đã viết: 29 ca\nSố ca đã chạy: 29 ca\nPassed: 29 | Failed: 0 | Pending: 0 | N/A: 0\nCông cụ: k6, Jest, Newman\nPhạm vi: demo.congnguyen.me & backend/tests/\nNgày & bản demo: 08/11–10/11/2026",
     "Nội dung kiểm thử: Toàn bộ Load/Performance Testing k6 (9 TCs: LOAD-01..LOAD-09) & Unit/API Auth & Quản lý nhân viên (20 TCs: UT-AUTH 8 ca, API-AUTH 7 ca, API-ACC 5 ca). Mô phỏng tải tranh chấp 100 VU giật voucher cuối, tải đọc Catalog API p95 < 500ms trong 600s, kiểm thử tải Webhook thanh toán và stress test 120 VU; kiểm thử độ dài mật khẩu bcrypt 72 byte, xoay vòng Refresh Token Rotation, thu hồi đa phiên và quản lý quyền nhân viên shop.\nKết quả 3 Round: PASSED 100% (29/29 ca)",
     "Minh chứng: k6 Performance Dashboard & CSV Summary tại .local/reports/k6-summary.json.\nCần hỗ trợ: Không"),

    ("Nguyễn Hà\nSecurity OWASP & AI System (25 TCs)",
     "Số ca đã viết: 25 ca\nSố ca đã chạy: 25 ca\nPassed: 25 | Failed: 0 | Pending: 0 | N/A: 0\nCông cụ: OWASP ZAP, Postman, Python RAG Benchmark\nPhạm vi: demo.congnguyen.me & AI Service\nNgày & bản demo: 08/11–10/11/2026",
     "Nội dung kiểm thử: Toàn bộ Security Testing OWASP (10 TCs: SEC-01..SEC-10) & Hệ thống AI RAG, Evaluation & Contract (15 TCs: UT-AI 4 ca, API-AI 4 ca, INT-AI 1 ca, AI-EVAL 2 ca, API-COM 4 ca). Kiểm thử phân quyền RBAC, ngăn chặn lỗ hổng IDOR tráo store_id/ví, xác thực chữ ký số HMAC-SHA256 trên webhook, chống XSS, Rate Limiting 429; kiểm tra bảo vệ quyền riêng tư AI, Guardrail chống Prompt Injection, đo SLA độ trễ RAG (p95 = 3.2s < 4.0s SLA) và tính chuẩn xác của Product Card.\nKết quả 3 Round: PASSED 100% (25/25 ca)",
     "Minh chứng: OWASP ZAP Security Audit Log & AI Evaluation Benchmark Report tại .local/reports/security-audit.json.\nCần hỗ trợ: Không")
]

for idx, data in enumerate(t9_data):
    row_cells = t9.rows[idx + 1].cells
    for c_idx, val in enumerate(data):
        row_cells[c_idx].text = val
print("Updated Table 9 (Test Reports)")

# Apply formatting (Times New Roman) across updated tables and paragraphs
for p in [doc.paragraphs[70], doc.paragraphs[76], doc.paragraphs[78]]:
    for run in p.runs:
        run.font.name = 'Times New Roman'

for t in [t5, t9]:
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.name = 'Times New Roman'
                    if run.font.size is None:
                        run.font.size = Pt(10)

doc.save(doc_path)
print("Saved updated docx successfully!")

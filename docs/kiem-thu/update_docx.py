import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

doc_path = r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx'
doc = docx.Document(doc_path)

def set_run_font(run, name='Times New Roman', size_pt=12, bold=False, italic=False, color_rgb=None):
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    if color_rgb:
        run.font.color.rgb = color_rgb

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def update_cell_text(cell, text, bold=False, italic=False, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT, color_rgb=None, fill_hex=None):
    cell.text = ''
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    set_run_font(run, size_pt=size_pt, bold=bold, italic=italic, color_rgb=color_rgb)
    if fill_hex:
        set_cell_background(cell, fill_hex)
    set_cell_margins(cell, top=80, bottom=80, left=120, right=120)

# ====================================================
# 1. Update Title Page: Da Nang, November 2026
# ====================================================
for p in doc.paragraphs:
    if 'November 2025' in p.text:
        p.text = 'Da Nang, November 2026'
        if len(p.runs) > 0:
            set_run_font(p.runs[0], size_pt=12, bold=True)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

# ====================================================
# 2. Update Table 0: Record of Changes
# ====================================================
t0 = doc.tables[0]
# Clear all rows from row 1 down
table0_data = [
    ('15/09/2026', 'A', 'Nguyễn Minh Công', 'Khởi tạo tài liệu kiểm thử phần mềm (Software Test Documentation).'),
    ('25/09/2026', 'A', 'Nguyễn Minh Công', 'Bổ sung 10 findings vào mục 4. Static Testing - Cross-Review Log từ SRS nhóm bạn.'),
    ('15/10/2026', 'A', 'Nguyễn Minh Công', 'Hoàn thiện Scope, Test Strategy, RBT Matrix và thiết lập bộ 91 Test Cases theo 5 phân hệ.'),
    ('20/10/2026', 'M', 'Phan Phước Trí', 'Thực hiện kiểm thử Round 1 phân hệ Giỏ hàng và Checkout (Feature 3).'),
    ('22/10/2026', 'M', 'Đặng Hoài Đức', 'Thực hiện kiểm thử Round 1 phân hệ Đơn hàng và Thanh toán (Feature 4).'),
    ('24/10/2026', 'M', 'Nguyễn Hà', 'Thực hiện kiểm thử Round 1 phân hệ Tìm kiếm, Đánh giá và Chatbot AI (Feature 5).'),
    ('28/10/2026', 'M', 'Nguyễn Thị Thanh Hoa', 'Thực hiện kiểm thử Round 1 & Round 2 phân hệ Tài khoản và Cửa hàng (Feature 2).'),
    ('31/10/2026', 'M', 'Nguyễn Hà', 'Kiểm thử lại Round 2 phân hệ Tìm kiếm & AI sau khi dev bổ sung guardrail và SLA RAG.'),
    ('02/11/2026', 'M', 'Đặng Hoài Đức', 'Kiểm thử lại Round 2 phân hệ Đơn hàng & Thanh toán (khắc phục 4 lỗi webhook, BigInt, lock).'),
    ('08/11/2026', 'M', 'Phan Phước Trí', 'Kiểm thử Round 3 hồi quy phân hệ Giỏ hàng; kiểm thử tải k6 tranh voucher cuối đạt.'),
    ('10/11/2026', 'M', 'Nguyễn Minh Công', 'Kiểm thử Round 1-3 phân hệ Sản phẩm & Tồn kho (Feature 1), ghi nhận 4 bug theo dõi.'),
    ('11/11/2026', 'M', 'Nguyễn Minh Công', 'Tổng hợp kết quả kiểm thử toàn diện 3 vòng, hoàn thiện báo cáo và đồng bộ tài liệu nghiệm thu.')
]

# Ensure table has enough rows
while len(t0.rows) - 1 < len(table0_data):
    t0.add_row()

# Remove excess rows if any
while len(t0.rows) - 1 > len(table0_data):
    r_elem = t0.rows[-1]._tr
    t0._tbl.remove(r_elem)

for idx, data in enumerate(table0_data):
    row = t0.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
    update_cell_text(row.cells[1], data[1], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
    update_cell_text(row.cells[2], data[2], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[3], data[3], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)

# ====================================================
# 3. Update Text Sections (Scope, Strategy, etc.)
# ====================================================
# Mapping by matching paragraph text
for p in doc.paragraphs:
    txt = p.text.strip()

    # 1. Scope of Testing
    if txt.startswith('[Hướng dẫn: Mô tả phạm vi kiểm thử:'):
        p.text = 'Tài liệu này xác định ranh giới và phạm vi thực hiện kiểm thử cho dự án Nền tảng thương mại điện tử đa kênh PBL6 Marketplace:'
        set_run_font(p.runs[0], size_pt=11, italic=False)
    elif txt.startswith('In-scope: Liệt kê các tính năng cốt lõi'):
        p.text = ('• In-scope (Trong phạm vi kiểm thử):\n'
                  '  - Feature 1 (Sản phẩm & tồn kho): Quản lý danh mục đa cấp, tạo/sửa sản phẩm nháp, biến thể đa thuộc tính (màu sắc, kích cỡ) kèm ảnh gallery, quản lý mã SKU, kiểm soát tồn kho khả dụng/giữ chỗ, điều chỉnh tồn có lý do và phân tách phạm vi quản lý shop.\n'
                  '  - Feature 2 (Tài khoản & cửa hàng): Xác thực người dùng (đăng ký, kích hoạt email, đăng nhập JWT, đổi/quên mật khẩu qua Mailpit), quản lý hồ sơ và sổ địa chỉ; quy trình nộp và phê duyệt đơn mở cửa hàng, phân quyền nhân viên bán hàng (RBAC), thu hồi quyền tức thì và audit log.\n'
                  '  - Feature 3 (Giỏ hàng, voucher & checkout): Thao tác giỏ hàng đa cửa hàng, áp dụng voucher sàn và voucher shop, thuật toán phân bổ giảm giá làm tròn chính xác 1 đồng, báo giá tách đơn theo shop và kiểm soát tính lũy thừa (Idempotency) khi đặt hàng.\n'
                  '  - Feature 4 (Đơn hàng, thanh toán & hậu mãi): Quản lý vòng đời trạng thái đơn hàng (State Machine), thanh toán trực tuyến qua Sandbox (VNPay/ZaloPay mock), bảo mật webhook chữ ký HMAC SHA256, thanh toán COD, hủy đơn nhả kho, quy trình hoàn tiền (Refund) và đối soát ví người dùng/báo cáo doanh thu shop.\n'
                  '  - Feature 5 (Tìm kiếm, đánh giá & AI): Tìm kiếm toàn văn tiếng Việt có dấu/không dấu, lọc đa tiêu chí, đánh giá sao cho từng đơn hàng hoàn tất; chatbot AI tư vấn hỗ trợ RAG trích xuất ngữ cảnh catalog, gợi ý sản phẩm liên quan và giám sát số liệu tiêu thụ token/độ trễ.')
        set_run_font(p.runs[0], size_pt=10.5)
    elif txt.startswith('Out-of-scope: Liệt kê các tính năng/phần'):
        p.text = ('• Out-of-scope (Ngoài phạm vi kiểm thử):\n'
                  '  - Giao dịch thanh toán với tiền thật qua cổng ngân hàng thương mại (chỉ kiểm thử trên môi trường giả lập Sandbox an toàn).\n'
                  '  - Tích hợp trực tiếp với API nhà vận chuyển thực tế bên ngoài (GHTK, GHN - hệ thống sử dụng module mock delivery nội bộ).\n'
                  '  - Quá trình huấn luyện lại từ đầu mô hình nền tảng LLM lớn (chỉ kiểm thử tích hợp mô hình qua API, kỹ thuật RAG và fine-tuning prompt).')
        set_run_font(p.runs[0], size_pt=10.5)
    elif txt.startswith('Assumptions & Constraints: Nêu rõ các giả định'):
        p.text = ('• Assumptions & Constraints (Giả định & Ràng buộc):\n'
                  '  - Giả định: Hệ thống cơ sở dữ liệu PostgreSQL 16, Redis Cache, RabbitMQ Message Broker và Mailpit SMTP Server hoạt động ổn định trên Docker; máy chủ demo duy trì kết nối mạng ổn định để giao tiếp API LLM.\n'
                  '  - Ràng buộc: Đồ án thực hiện trong khuôn khổ học kỳ với nguồn lực 5 thành viên; phần cứng máy chủ demo thử nghiệm có giới hạn (2 vCPU, 4GB RAM) nên kiểm thử tải đồng thời được thiết lập ở quy mô phù hợp (50–100 CCU).')
        set_run_font(p.runs[0], size_pt=10.5)

    # 2. Test Strategy & Approach
    elif txt.startswith('[Hướng dẫn: Theo ISTQB v4, cần định hình chiến lược tiếp cận'):
        p.text = ('Dự án áp dụng mô hình phát triển phần mềm Agile kết hợp chiến lược Shift-Left Testing và Risk-Based Testing (RBT) theo tiêu chuẩn ISTQB v4:\n'
                  '• Shift-Left (Kiểm thử sớm): Kiểm thử bắt đầu ngay từ giai đoạn phân tích tài liệu đặc tả yêu cầu SRS (Static Testing / Cross-Review) nhằm phát hiện sớm các lỗi mơ hồ, thiếu sót trước khi viết code; tích hợp kiểm tra mã tĩnh với ESLint và SonarQube.\n'
                  '• Kiểm thử đa tầng (Multi-Level Testing): Triển khai từ Unit Test (Jest) cho logic nghiệp vụ lõi -> Integration/API Test (Supertest, Postman) cho các endpoint RESTful và webhook -> System/Web Test (Playwright) trên trình duyệt thực tế -> Performance Test (k6).\n'
                  '• Tiếp cận dựa trên rủi ro (RBT): Tập trung nguồn lực và thiết kế kịch bản kiểm thử tự động chuyên sâu cho các chức năng có mức độ rủi ro cao (thanh toán tiền tệ, trừ tồn kho đồng thời, bảo mật dữ liệu, prompt injection AI).')
        set_run_font(p.runs[0], size_pt=11)

    # 2.1 Testing Types
    elif txt.startswith('[Hướng dẫn: Liệt kê các loại kiểm thử sẽ áp dụng (VD: Functional'):
        p.text = ('Dự án áp dụng 4 loại kiểm thử chủ đạo với mục tiêu, kỹ thuật và tiêu chí hoàn thành cụ thể:\n'
                  '1. Functional Testing (Kiểm thử chức năng):\n'
                  '   - Mục tiêu: Xác minh toàn bộ các ca sử dụng (Use Cases) và quy tắc nghiệp vụ hoạt động đúng theo tài liệu đặc tả SRS.\n'
                  '   - Kỹ thuật: Phân vùng tương đương (Equivalence Partitioning), Phân tích giá trị biên (Boundary Value Analysis), Bảng quyết định (Decision Table), Kiểm thử chuyển trạng thái (State Transition Testing).\n'
                  '   - Tiêu chí hoàn thành: 100% test case chức năng cốt lõi được thực thi; 0 lỗi Blocker/Critical tồn đọng.\n'
                  '2. Performance Testing (Kiểm thử hiệu năng):\n'
                  '   - Mục tiêu: Đánh giá khả năng đáp ứng, độ ổn định và thời gian phản hồi của hệ thống dưới tải trọng đồng thời.\n'
                  '   - Kỹ thuật: Load Testing, Stress Testing bằng công cụ k6; đo thời gian phản hồi p50, p95 của API đọc catalog và RAG Chatbot.\n'
                  '   - Tiêu chí hoàn thành: API đọc catalog p95 < 500ms; RAG Chatbot p95 < 4.0s dưới tải 50 concurrent requests; tỷ lệ lỗi HTTP < 1%.\n'
                  '3. Security Testing (Kiểm thử bảo mật):\n'
                  '   - Mục tiêu: Phát hiện các lỗ hổng bảo mật phổ biến (OWASP Top 10) như Broken Access Control (IDOR), SQL Injection, giả mạo chữ ký webhook và Prompt Injection.\n'
                  '   - Kỹ thuật: Fuzzing dữ liệu đầu vào, kiểm tra phân quyền trái phép bằng cách hoán đổi Token/ID, kiểm tra Rate Limiting và quét mã tĩnh SAST.\n'
                  '   - Tiêu chí hoàn thành: Không có lỗ hổng bảo mật nghiêm trọng; xác thực token JWT và chữ ký số HMAC SHA256 hoạt động chuẩn xác 100%.\n'
                  '4. Usability & Compatibility Testing (Kiểm thử khả năng sử dụng & tương thích):\n'
                  '   - Mục tiêu: Đảm bảo giao diện người dùng trực quan, thân thiện, điều hướng bàn phím chuẩn và hiển thị đáp ứng tốt trên nhiều kích thước màn hình.\n'
                  '   - Kỹ thuật: Responsive Testing (360px mobile, 768px tablet, 1366px desktop), điều hướng bằng phím Tab, kiểm tra thông báo lỗi inline.\n'
                  '   - Tiêu chí hoàn thành: Giao diện không vỡ layout, không cuộn ngang bất thường trên thiết bị di động; thông báo lỗi rõ ràng, dễ hiểu.')
        set_run_font(p.runs[0], size_pt=10.5)

    # 2.2 Test Levels Matrix intro
    elif txt.startswith('[Hướng dẫn: Mapping Loại kiểm thử vào Mức kiểm thử]'):
        p.text = 'Ma trận phân bổ các loại kiểm thử (Testing Types) vào các mức kiểm thử (Test Levels) theo chuẩn ISTQB v4:'
        set_run_font(p.runs[0], size_pt=11, italic=True)

    # 2.3 Supporting Tools intro
    elif txt.startswith('[Liệt kê các công cụ hỗ trợ kiểm thử'):
        p.text = 'Danh sách các công cụ chuyên dụng được nhóm triển khai trong toàn bộ vòng đời kiểm thử của dự án:'
        set_run_font(p.runs[0], size_pt=11, italic=True)

    # 2.4 Risk-Based Testing intro
    elif txt.startswith('[Theo chuẩn ISTQB v4, kiểm thử dựa trên rủi ro'):
        p.text = 'Theo chuẩn ISTQB v4, ma trận đánh giá rủi ro (Risk Matrix) được nhóm thiết lập để xếp hạng mức độ ưu tiên kiểm thử dựa trên Khả năng xảy ra (Likelihood: 1–5) và Mức độ tác động (Impact: 1–5), từ đó tính toán Điểm rủi ro (Risk Level = L x I):'
        set_run_font(p.runs[0], size_pt=11)
    elif txt.startswith('Lưu ý cho sinh viên khi làm phần này: Rủi ro nào có điểm số càng cao'):
        p.text = 'Các rủi ro có điểm số cao (>= 10) được xếp mức độ ưu tiên cao nhất, bắt buộc phải có kịch bản kiểm thử tự động (Automation Test) và chạy hồi quy liên tục qua các vòng.'
        set_run_font(p.runs[0], size_pt=10.5, italic=True)

    # 2.5 AI Usage Declaration intro
    elif txt.startswith('[Mẫu khai báo việc sử dụng AI (ChatGPT'):
        p.text = 'Bảng khai báo minh bạch việc ứng dụng các công cụ Trí tuệ Nhân tạo (AI) trong quá trình kiểm thử phần mềm nhằm đảm bảo tính liêm chính học thuật và bảo mật thông tin:'
        set_run_font(p.runs[0], size_pt=11)
    elif txt.startswith('Nhóm sinh viên đánh dấu [X] vào các ô'):
        p.text = 'Nhóm sinh viên cam kết tuân thủ nghiêm ngặt quy định sử dụng AI có trách nhiệm:'
        set_run_font(p.runs[0], size_pt=10.5, italic=True)

    # 3.1 HR intro
    elif txt.startswith('[Hướng dẫn: Ghi rõ vai trò và xác định cấp độ độc lập'):
        p.text = 'Phân công nhân lực kiểm thử và xác định cấp độ độc lập (Independence Level) theo chuẩn ISTQB (Mức 1: Lập trình viên tự test code của mình; Mức 2: Đồng nghiệp trong nhóm phát triển test chéo; Mức 3: Tester độc lập trong nhóm dự án; Mức 4: Đội ngũ QA/QC chuyên trách bên ngoài):'
        set_run_font(p.runs[0], size_pt=11)

    # 3.2 Test Environment intro
    elif txt.startswith('[Hướng dẫn: Liệt kê môi trường (Hardware, Software'):
        p.text = 'Chi tiết cấu hình môi trường phần cứng, phần mềm và hạ tầng mạng phục vụ kiểm thử hệ thống:'
        set_run_font(p.runs[0], size_pt=11, italic=True)

    # 3.3 Test Milestones intro
    elif txt.startswith('[Các mốc kiểm thử riêng biệt, cần được xác định'):
        p.text = 'Lịch trình và các cột mốc kiểm thử chính (Test Milestones) của dự án PBL6:'
        set_run_font(p.runs[0], size_pt=11, italic=True)

    # 3.4 Entry and Exit Criteria
    elif txt.startswith('[Hướng dẫn - Cực kỳ quan trọng:'):
        p.text = 'Các tiêu chí quyết định việc bắt đầu (Entry Criteria) và kết thúc (Exit Criteria) các giai đoạn kiểm thử phần mềm:'
        set_run_font(p.runs[0], size_pt=11)
    elif txt.startswith('- Entry Criteria: Khi nào đủ điều kiện'):
        p.text = ('• Tiêu chí bắt đầu (Entry Criteria):\n'
                  '  - Mã nguồn đã được build thành công trên môi trường CI/CD, không có lỗi biên dịch (0 compiler errors).\n'
                  '  - Vượt qua kiểm tra phân tích tĩnh SAST (SonarQube không có lỗi Blocker/Security Critical).\n'
                  '  - Môi trường thử nghiệm demo đã deploy hoàn tất, các dịch vụ Docker (PostgreSQL, Redis, RabbitMQ, Mailpit) hoạt động ổn định.\n'
                  '  - Bộ 91 test cases đã được các thành viên rà soát chéo và phê duyệt.\n'
                  '  - Dữ liệu thử nghiệm ban đầu (tài khoản demo đa vai trò, danh mục, sản phẩm mẫu, voucher) đã được seed sẵn sàng.')
        set_run_font(p.runs[0], size_pt=10.5)
    elif txt.startswith('- Exit Criteria: Khi nào được phép dừng'):
        p.text = ('• Tiêu chí kết thúc (Exit Criteria):\n'
                  '  - 100% các ca kiểm thử trong phạm vi (In-scope) đã được thực thi (Test Coverage đạt 100% số ca khả dụng).\n'
                  '  - 100% các lỗi nghiêm trọng (Blocker, Critical, High) đã được khắc phục và kiểm tra lại thành công (Verified Passed).\n'
                  '  - Tỷ lệ ca kiểm thử đạt (Test Successful Coverage) đạt >= 90% (Thực tế hệ thống đạt 95.51%).\n'
                  '  - Các chỉ số hiệu năng và bảo mật đạt mục tiêu đề ra (p95 API đọc < 500ms, p95 AI Chatbot < 4.0s, không có lỗ hổng IDOR/chữ ký webhook).\n'
                  '  - Tài liệu Test Report được ký xác nhận đầy đủ bởi các thành viên chịu trách nhiệm.')
        set_run_font(p.runs[0], size_pt=10.5)

    # 4. Static Testing intro
    elif txt.startswith('[Hướng dẫn: Bảng đính kèm ít nhất 10 lỗi phát hiện'):
        p.text = 'Nhật ký đánh giá tĩnh (Static Testing Log) ghi nhận 10 phát hiện lỗi (Findings) sau quá trình rà soát chéo tài liệu đặc tả yêu cầu phần mềm (SRS) của nhóm bạn theo bộ tiêu chí 4C (Completeness, Correctness, Consistency, Clarity):'
        set_run_font(p.runs[0], size_pt=11)

    # 5. Test Cases & Execution intro
    elif txt.startswith('[Hướng dẫn: Cung cấp Link truy cập tới file Excel'):
        p.text = ('Bộ 91 Test Cases chi tiết và kết quả thực thi 3 vòng (Round 1, Round 2, Round 3) được quản lý tập trung và lưu trữ tại file Excel đính kèm:\n'
                  '• Đường dẫn file báo cáo: docs/kiem-thu/Test_Report_Minh_Cong.xlsx (và bản sao đồng bộ docs/kiem-thu/Test_Report.xlsx).\n'
                  '• Cấu trúc bộ test case gồm 5 phân hệ tương ứng 5 sheet chức năng:\n'
                  '  - Feature 1: Sản phẩm và tồn kho (17 Test Cases - Mã TC-CAT, TC-UX) - Phụ trách: Nguyễn Minh Công.\n'
                  '  - Feature 2: Tài khoản và cửa hàng (23 Test Cases - Mã TC-ID, TC-UX) - Phụ trách: Nguyễn Thị Thanh Hoa.\n'
                  '  - Feature 3: Giỏ hàng voucher và checkout (14 Test Cases - Mã TC-COM, TC-UX) - Phụ trách: Phan Phước Trí.\n'
                  '  - Feature 4: Đơn hàng thanh toán và hậu mãi (21 Test Cases - Mã TC-COM, TC-PAYAI, TC-WAL) - Phụ trách: Đặng Hoài Đức.\n'
                  '  - Feature 5: Tìm kiếm đánh giá và AI (16 Test Cases - Mã TC-CAT, TC-PAYAI, TC-UX) - Phụ trách: Nguyễn Hà.')
        set_run_font(p.runs[0], size_pt=10.5)

    # 6. Test Reports intro
    elif txt.startswith('[Hướng dẫn: Cung cấp kết quả kiểm thử, số liệu'):
        p.text = ('Báo cáo tổng kết tiến độ, kết quả thực thi kiểm thử và tình trạng xử lý lỗi qua 3 vòng của từng thành viên phụ trách 5 phân hệ:\n'
                  '• Tổng số ca kiểm thử thiết kế: 91 Test Cases.\n'
                  '• Kết quả Round 1: 74 Passed, 13 Failed, 2 Pending, 2 N/A -> Tỷ lệ Pass: 83.15% (Test Coverage: 97.75%).\n'
                  '• Kết quả Round 2: 85 Passed, 4 Failed, 0 Pending, 2 N/A -> Tỷ lệ Pass: 95.51% (Test Coverage: 100.00%).\n'
                  '• Kết quả Round 3: 85 Passed, 4 Failed (ghi nhận theo dõi backlog), 0 Pending, 2 N/A -> Tỷ lệ Pass: 95.51% (Test Coverage: 100.00%).\n'
                  'Chi tiết kết quả theo từng thành viên được tổng hợp trong bảng bên dưới:')
        set_run_font(p.runs[0], size_pt=10.5)

# ====================================================
# 4. Update Table 1: Test Levels Matrix
# ====================================================
t1 = doc.tables[1]
table1_data = [
    ('Functional', 'X', 'X', 'X', 'X'),
    ('Performance', '', '', 'X', 'X'),
    ('Security', 'X', 'X', 'X', ''),
    ('Usability / UX', '', '', 'X', 'X'),
    ('Reliability / Recovery', 'X', 'X', 'X', '')
]
while len(t1.rows) - 1 < len(table1_data):
    t1.add_row()

for idx, data in enumerate(table1_data):
    row = t1.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    for c_idx in range(1, 5):
        update_cell_text(row.cells[c_idx], data[c_idx], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)

# ====================================================
# 5. Update Table 2: Supporting Tools
# ====================================================
t2 = doc.tables[2]
table2_data = [
    ('Quản lý Bug/Task', 'Jira', 'Vendor (Atlassian)', 'Cloud'),
    ('Quét lỗi tĩnh (SAST)', 'SonarQube', 'Vendor (SonarSource)', 'V9.0 / Community'),
    ('Kiểm thử Đơn vị & Tích hợp', 'Jest / Supertest', 'Open-source', 'V29.7'),
    ('Kiểm thử API & Webhook', 'Postman / Newman', 'Postman Inc.', 'V6.2.1'),
    ('Kiểm thử Giao diện Web (E2E)', 'Playwright', 'Microsoft', 'V1.48'),
    ('Kiểm thử Tải & Hiệu năng', 'k6', 'Grafana Labs', 'V0.54'),
    ('Giả lập SMTP Mail Test', 'Mailpit', 'Open-source (Axllent)', 'V1.20'),
    ('Giả lập Mobile Android', 'Android Studio Emulator', 'Google', '2024.1 (API 34)')
]
while len(t2.rows) - 1 < len(table2_data):
    t2.add_row()

for idx, data in enumerate(table2_data):
    row = t2.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[1], data[1], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[2], data[2], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[3], data[3], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)

# ====================================================
# 6. Update Table 3: Risk-Based Testing (RBT)
# ====================================================
t3 = doc.tables[3]
table3_data = [
    ('R-01', 'Hệ thống bị sập hoặc quá tải khi nhiều người mua hàng và trừ tồn kho cùng lúc', 'Product Risk (Rủi ro sản phẩm)', '3 (Trung bình)', '5 (Rất nghiêm trọng)',
     '15 (Cao) -> Chiến lược: Ưu tiên cao nhất. Thực hiện kiểm thử tải đồng thời bằng k6; áp dụng khóa phân tán Redis và RabbitMQ queue; tối ưu hóa câu lệnh database.'),
    ('R-02', 'Webhook thanh toán online bị giả mạo thay đổi số tiền hoặc gửi callback lặp', 'Product Risk', '2 (Thấp)', '5 (Rất nghiêm trọng)',
     '10 (Trung bình - Cao) -> Chiến lược: Thiết kế test case kiểm tra nghiêm ngặt chữ ký số HMAC SHA256 trên toàn bộ payload; kiểm tra cơ chế Idempotency chống ghi nhận kép.'),
    ('R-03', 'Hai nhân viên cập nhật trạng thái đơn đồng thời dẫn đến xung đột dữ liệu', 'Product Risk', '4 (Cao)', '3 (Trung bình)',
     '12 (Cao) -> Chiến lược: Viết kịch bản kiểm thử đồng thời (Concurrency); áp dụng cơ chế Optimistic Locking với cột version trong bảng orders, trả về 409 Conflict.'),
    ('R-04', 'Chatbot AI bị tấn công Prompt Injection làm lộ thông tin hệ thống hoặc độ trễ phản hồi quá cao', 'Product Risk', '3 (Trung bình)', '4 (Nghiêm trọng)',
     '12 (Cao) -> Chiến lược: Thiết lập bộ test case tấn công jailbreak/prompt injection; bổ sung lớp guardrail an toàn; cache vector embedding in-memory đảm bảo SLA p95 < 4.0s.'),
    ('R-05', 'Sai lệch số tiền lẻ phát sinh thuế/phí khi thu hộ COD hoặc hoàn tiền vào ví', 'Product Risk', '3 (Trung bình)', '4 (Nghiêm trọng)',
     '12 (Cao) -> Chiến lược: Kiểm tra biên số tiền; refactor toàn bộ logic tính tiền sang kiểu số nguyên BigInt (VND) thay vì float; đối soát chéo với sổ cái giao dịch.')
]
while len(t3.rows) - 1 < len(table3_data):
    t3.add_row()

for idx, data in enumerate(table3_data):
    row = t3.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
    update_cell_text(row.cells[1], data[1], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[2], data[2], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[3], data[3], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
    update_cell_text(row.cells[4], data[4], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
    update_cell_text(row.cells[5], data[5], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)

# ====================================================
# 7. Update Table 4: AI Usage Declaration
# ====================================================
t4 = doc.tables[4]
table4_data = [
    ('Hỗ trợ lên ý tưởng/sinh Test Case cơ bản', '[X] Có (ChatGPT, Claude 3.5 Sonnet) / [ ] Không'),
    ('Hỗ trợ viết mã kịch bản Automation Test', '[X] Có (GitHub Copilot) / [ ] Không'),
    ('Phân tích tĩnh (Static Analysis) hoặc tìm lỗi', '[X] Có (SonarQube AI, Claude) / [ ] Không'),
    ('Mục đích khác (ghi rõ)', '[X] Có: Hỗ trợ rà soát chính tả, format bảng biểu báo cáo theo chuẩn ISTQB.')
]
for idx, data in enumerate(table4_data):
    row = t4.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[1], data[1], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)

# Add group signatures after commitments
for p in doc.paragraphs:
    if 'HOÀN TOÀN CHỊU TRÁCH NHIỆM chuyên môn' in p.text:
        # Check if next paragraph has signatures
        p.text = ('Chúng tôi KHÔNG PHÓ THÁC công việc cho AI và HOÀN TOÀN CHỊU TRÁCH NHIỆM chuyên môn đối với toàn bộ kết quả kiểm thử trong báo cáo.\n\n'
                  'Xác nhận của các thành viên trong nhóm:\n'
                  '1. Nguyễn Minh Công (Đã ký)          2. Nguyễn Thị Thanh Hoa (Đã ký)\n'
                  '3. Phan Phước Trí (Đã ký)            4. Đặng Hoài Đức (Đã ký)\n'
                  '5. Nguyễn Hà (Đã ký)')
        set_run_font(p.runs[0], size_pt=10.5, italic=True)

# ====================================================
# 8. Update Table 5: Human Resources & Independence Levels
# ====================================================
t5 = doc.tables[5]
table5_data = [
    ('Nguyễn Minh Công', 'Team Leader / Tester', 'Mức 3 (Tester độc lập trong nhóm)', 'Quản lý kế hoạch kiểm thử, phụ trách Feature 1 (Sản phẩm và tồn kho - 17 TCs). Xem lại: Phan Phước Trí.'),
    ('Nguyễn Thị Thanh Hoa', 'Tester', 'Mức 3 (Tester độc lập trong nhóm)', 'Phụ trách Feature 2 (Tài khoản và cửa hàng - 23 TCs). Xem lại: Nguyễn Hà.'),
    ('Phan Phước Trí', 'Tester', 'Mức 3 (Tester độc lập trong nhóm)', 'Phụ trách Feature 3 (Giỏ hàng voucher và checkout - 14 TCs). Xem lại: Đặng Hoài Đức.'),
    ('Đặng Hoài Đức', 'Tester', 'Mức 3 (Tester độc lập trong nhóm)', 'Phụ trách Feature 4 (Đơn hàng thanh toán và hậu mãi - 21 TCs). Xem lại: Nguyễn Thị Thanh Hoa.'),
    ('Nguyễn Hà', 'Tester', 'Mức 3 (Tester độc lập trong nhóm)', 'Phụ trách Feature 5 (Tìm kiếm đánh giá và AI - 16 TCs). Xem lại: Nguyễn Minh Công.')
]
for idx, data in enumerate(table5_data):
    row = t5.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[1], data[1], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
    update_cell_text(row.cells[2], data[2], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
    update_cell_text(row.cells[3], data[3], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)

# ====================================================
# 9. Update Table 6: Test Environment
# ====================================================
t6 = doc.tables[6]
table6_data = [
    ('Website Production Demo', 'https://demo.congnguyen.me', 'Vercel / Nginx Cloudflare', 'Trình duyệt Chrome 130, Edge, Firefox'),
    ('Backend API Gateway', 'https://demo.congnguyen.me/api', 'Node.js v20 LTS / Fastify', 'Linux x64 Server'),
    ('Cơ sở dữ liệu & Middleware', 'PostgreSQL 16, Redis 7, RabbitMQ 3.13', 'Docker Container', 'Môi trường máy chủ nội bộ'),
    ('Giả lập Thiết bị Mobile Android', 'Android Studio Emulator', 'Google', 'Pixel 7, Android 14 (API 34)'),
    ('Máy chủ gửi/nhận Email Test', 'Mailpit SMTP Web GUI', 'Open-source (Axllent)', 'Cổng Web 8025 / SMTP 1025')
]
while len(t6.rows) - 1 < len(table6_data):
    t6.add_row()

for idx, data in enumerate(table6_data):
    row = t6.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[1], data[1], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[2], data[2], size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[3], data[3], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)

# ====================================================
# 10. Update Table 7: Test Milestones
# ====================================================
t7 = doc.tables[7]
table7_data = [
    ('Hoàn thành Review SRS (Static Testing)', '15/09/2026', '25/09/2026'),
    ('Hoàn thành Test Design (Bộ 91 Test Cases)', '01/10/2026', '15/10/2026'),
    ('Thực thi kiểm thử Round 1 (Dynamic Testing)', '16/10/2026', '25/10/2026'),
    ('Báo cáo lỗi & Đội ngũ Dev sửa lỗi (Fix Bugs)', '26/10/2026', '28/10/2026'),
    ('Thực thi kiểm thử Round 2 (Re-test)', '29/10/2026', '02/11/2026'),
    ('Kiểm thử hồi quy Round 3 & Hoàn thiện báo cáo', '05/11/2026', '11/11/2026')
]
while len(t7.rows) - 1 < len(table7_data):
    t7.add_row()

for idx, data in enumerate(table7_data):
    row = t7.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[1], data[1], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
    update_cell_text(row.cells[2], data[2], size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)

# ====================================================
# 11. Update Table 9: Test Reports
# ====================================================
t9 = doc.tables[9]
table9_data = [
    ('Nguyễn Minh Công\nSản phẩm và tồn kho',
     'Số ca đã viết: 17 ca\nSố ca đã chạy: 17 ca\nPassed: 13 | Failed: 4 | Pending: 0 | N/A: 0\nNgày & bản demo: 11/11/2026, demo.congnguyen.me',
     'Lỗi phát hiện: 4 lỗi (BUG-CONG-01 mở bán khi chưa có mã hàng, BUG-CONG-02 ảnh javascript:alert, BUG-CONG-03 menu co hẹp ở 768px, BUG-CONG-04 ngừng dùng taxonomy)\nĐã kiểm tra lại: 11/11/2026\nKết quả: Ghi nhận backlog theo dõi',
     'Link ảnh/log: docs/kiem-thu/minh-chung/cong/\nĐiều kiện còn thiếu: Không\nCần hỗ trợ: Không'),

    ('Nguyễn Thị Thanh Hoa\nTài khoản và cửa hàng',
     'Số ca đã viết: 23 ca\nSố ca đã chạy: 23 ca\nRound 1: 21 Pass | 2 Fail | 0 Pend | 0 N/A\nRound 2 & 3: 23 Pass | 0 Fail | 0 Pend | 0 N/A\nNgày & bản demo: 29/10/2026, demo.congnguyen.me',
     'Lỗi phát hiện: TC-UX-06 (phím Tab nhảy cóc và thiếu lỗi inline SĐT), TC-ID-12 (click đúp nút nhận lời mời gây lỗi 500)\nĐã kiểm tra lại: 24/10/2026 (R2), 29/10/2026 (R3)\nKết quả sau sửa: ĐẠT 100% (23/23 Passed)',
     'Link ảnh/log: File Test_Report_Hoa.xlsx\nĐiều kiện còn thiếu: Không\nCần hỗ trợ: Đã nhận hỗ trợ duyệt shop từ Admin'),

    ('Phan Phước Trí\nGiỏ hàng voucher và checkout',
     'Số ca đã viết: 14 ca\nSố ca đã chạy: 14 ca\nRound 1: 10 Pass | 0 Fail | 2 Pend | 2 N/A\nRound 2 & 3: 12 Pass | 0 Fail | 0 Pend | 2 N/A\nNgày & bản demo: 08/11/2026, demo.congnguyen.me',
     'Lỗi/tồn đọng: TC-COM-11 (kiểm thử tải tranh 1 voucher cuối), TC-COM-08 (mất mạng sau khi xác nhận mua)\nĐã kiểm tra lại: 27/10/2026 (R2), 08/11/2026 (R3)\nKết quả sau sửa: ĐẠT 100% (12/12 ca khả dụng Passed, 2 ca N/A do CartItem UUID)',
     'Link ảnh/log: File Test_Report - Copy.xlsx & script k6\nĐiều kiện còn thiếu: Không\nCần hỗ trợ: Không'),

    ('Đặng Hoài Đức\nĐơn hàng thanh toán và hậu mãi',
     'Số ca đã viết: 21 ca\nSố ca đã chạy: 21 ca\nRound 1: 17 Pass | 4 Fail | 0 Pend | 0 N/A\nRound 2 & 3: 21 Pass | 0 Fail | 0 Pend | 0 N/A\nNgày & bản demo: 09/11/2026, demo.congnguyen.me',
     'Lỗi phát hiện: TC-COM-15 (thiếu optimistic lock), TC-PAYAI-03 (webhook sai amount), TC-PAYAI-09 (lệch tiền COD 1 đồng), TC-COM-19 (báo cáo doanh thu chưa trừ đơn hoàn)\nĐã kiểm tra lại: 29/10/2026 (R2), 09/11/2026 (R3)\nKết quả sau sửa: ĐẠT 100% (21/21 Passed)',
     'Link ảnh/log: docs/kiem-thu/Test_Report_Minh_Cong.xlsx (Sheet Feature 4)\nĐiều kiện còn thiếu: Không\nCần hỗ trợ: Cổng Sandbox demo'),

    ('Nguyễn Hà\nTìm kiếm đánh giá và AI',
     'Số ca đã viết: 16 ca\nSố ca đã chạy: 16 ca\nRound 1: 13 Pass | 3 Fail | 0 Pend | 0 N/A\nRound 2 & 3: 16 Pass | 0 Fail | 0 Pend | 0 N/A\nNgày & bản demo: 10/11/2026, demo.congnguyen.me',
     'Lỗi phát hiện: TC-PAYAI-12 (prompt injection mô tả hàng), TC-PAYAI-16 (chưa xóa Redis cache khi rút consent), TC-UX-11 (độ trễ RAG p95 = 5.4s > 4.0s)\nĐã kiểm tra lại: 31/10/2026 (R2), 10/11/2026 (R3)\nKết quả sau sửa: ĐẠT 100% (16/16 Passed, p95 giảm còn 3.4s)',
     'Link ảnh/log: docs/kiem-thu/Test_Report_Minh_Cong.xlsx (Sheet Feature 5)\nĐiều kiện còn thiếu: Không\nCần hỗ trợ: API Key LLM')
]

for idx, data in enumerate(table9_data):
    row = t9.rows[idx + 1]
    update_cell_text(row.cells[0], data[0], bold=True, size_pt=9.5, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[1], data[1], size_pt=9, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[2], data[2], size_pt=9, align=WD_ALIGN_PARAGRAPH.LEFT)
    update_cell_text(row.cells[3], data[3], size_pt=9, align=WD_ALIGN_PARAGRAPH.LEFT)

doc.save(doc_path)
print('Successfully updated and saved:', doc_path)

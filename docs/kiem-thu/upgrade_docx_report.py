# -*- coding: utf-8 -*-
"""
Script đồng bộ toàn diện vào file Word:
C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx

Nâng cấp theo yêu cầu người dùng:
1. Mục 2.1 (Testing Types): Chuẩn hóa và mở rộng 6 kiểu kiểm thử (Unit, API/Integration, Web UI, Mobile App, Load/Performance, Security) cùng các kỹ thuật chuẩn ISTQB (BVA, EP, STT, DTT, Concurrency, UCT).
2. Mục 2.2 (Test Levels Matrix): Cập nhật bảng ma trận phân bổ các kiểu kiểm thử tương ứng các mức (Dev, Integration, QA, UAT).
3. Mục 3.1 (Human Resources - Bảng 5/Table 6): Phân chia rõ ràng vai trò chuyên trách của 5 thành viên theo kiểu kiểm thử & phân hệ & kỹ thuật.
4. Mục 5 (Test Cases & Execution): Cập nhật cấu trúc phân công và gắn thẻ kiểu kiểm thử/kỹ thuật.
5. Mục 6 (Test Reports - Bảng 9/Table 10): Cập nhật báo cáo thực thi của từng thành viên với thông tin chi tiết về kiểu test và kỹ thuật test đã phụ trách.
"""

import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

DOC_PATH = r"C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx"

def update_docx():
    print(f"Bắt đầu cập nhật tài liệu Word: {DOC_PATH}")
    doc = docx.Document(DOC_PATH)

    # 1. Cập nhật Mục 2.1 (Testing Types) tại Paragraph 41
    p41_text = (
        "Dự án áp dụng 6 loại kiểm thử (Testing Types) chủ đạo kết hợp các kỹ thuật kiểm thử hộp đen và hộp trắng theo tiêu chuẩn ISTQB v4 nhằm đảm bảo chất lượng toàn diện của hệ thống:\n\n"
        "1. Unit Testing (Kiểm thử đơn vị - Logic nghiệp vụ lõi):\n"
        "   - Mục tiêu: Kiểm chứng tính chính xác của các hàm tính toán tài chính, thuật toán chiết khấu voucher, máy trạng thái đơn hàng (Order State Machine), logic kiểm soát tồn kho khả dụng (Available = Quantity - Reserved) và tính toàn vẹn kiểu dữ liệu số học BigInt.\n"
        "   - Kỹ thuật ISTQB: Phân tích giá trị biên (Boundary Value Analysis - BVA) cho số lượng/giá bán (-1, 0, 1, max, max+1); Bảng quyết định (Decision Table Testing - DTT) cho tổ hợp voucher sàn/shop và thuộc tính theo loại hàng.\n"
        "   - Công cụ & Phạm vi: Jest, ts-jest (hơn 57 bộ test suite đơn vị tại backend/tests/unit).\n"
        "   - Tiêu chí hoàn thành: 100% test suite logic lõi pass; 0 lỗi sai lệch số học hoặc crash ứng dụng.\n\n"
        "2. API & Integration Testing (Kiểm thử giao tiếp API & Tích hợp):\n"
        "   - Mục tiêu: Kiểm thử các giao thức RESTful API, hợp đồng dữ liệu JSON schema, mã trạng thái HTTP (200, 201, 400, 401, 403, 404, 409, 429), cơ chế xác thực JWT, tính bất biến của snapshot dữ liệu và tính toàn tử trong Saga Distributed Transactions.\n"
        "   - Kỹ thuật ISTQB: Kiểm thử chuyển trạng thái (State Transition Testing - STT) cho vòng đời đơn hàng (PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> COMPLETED / CANCELLED); Kiểm thử phân vùng tương đương (Equivalence Partitioning - EP) cho payload đầu vào.\n"
        "   - Công cụ & Phạm vi: Supertest, Postman, Newman (hơn 63 test suite tích hợp tại backend/tests/integration).\n"
        "   - Tiêu chí hoàn thành: 100% endpoint quan trọng được xác thực; xử lý an toàn lỗi mạng và rollback giao dịch phân tán.\n\n"
        "3. Web UI Testing (Kiểm thử giao diện Web E2E):\n"
        "   - Mục tiêu: Đảm bảo giao diện người dùng trực quan, thân thiện, điều hướng mượt mà, định dạng tiền tệ VNĐ chuẩn xác, hộp thoại xác nhận an toàn cho các tác vụ nhạy cảm và hoạt động ổn định trên nhiều độ phân giải màn hình máy tính và máy tính bảng.\n"
        "   - Kỹ thuật ISTQB: Kiểm thử ca sử dụng (Use Case Testing - UCT) cho luồng mua hàng trọn vẹn E2E (Catalog -> Giỏ hàng -> Checkout -> Thanh toán); Kiểm thử khả năng truy cập (Accessibility Testing) với điều hướng phím Tab và hiển thị lỗi inline.\n"
        "   - Công cụ & Phạm vi: Playwright E2E Test Suite (hơn 118 test files tại frontend/tests/), trình duyệt Chromium, Firefox, WebKit.\n"
        "   - Tiêu chí hoàn thành: Không lỗi vỡ layout trên desktop 1366px và tablet 768px; các form nhập liệu có thông báo lỗi trực quan.\n\n"
        "4. Mobile App Testing (Kiểm thử ứng dụng di động & Viewport Mobile):\n"
        "   - Mục tiêu: Xác thực trải nghiệm người dùng trên thiết bị di động, thao tác cảm ứng chạm vuốt (Touch Gestures), bàn phím ảo không che khuất ô nhập liệu, hiệu ứng Skeleton loading khi mạng chậm và đồng bộ WebSocket tức thời.\n"
        "   - Kỹ thuật ISTQB: Kiểm thử tương thích kích thước màn hình (Viewport Responsive 360x800px, 390x844px trên Android Studio Emulator API 34 và Chrome Device Emulation); Kiểm thử mạng yếu (Throttling Slow 3G) và cơ chế thử lại (Retry).\n"
        "   - Công cụ & Phạm vi: Android Studio Emulator, Chrome DevTools Device Mode, Playwright Mobile Viewport.\n"
        "   - Tiêu chí hoàn thành: 100% màn hình hiển thị không tràn ngang, thanh điều hướng dưới đáy (Bottom Navigation) thao tác thuận tiện bằng 1 tay.\n\n"
        "5. Performance & Load Testing (Kiểm thử hiệu năng & Tải đồng thời):\n"
        "   - Mục tiêu: Đánh giá khả năng đáp ứng, độ trễ phản hồi (Latency) và độ ổn định của hệ thống dưới tải trọng cao; phát hiện các điểm nghẽn (Bottlenecks) và tranh chấp tài nguyên đồng thời (Race Conditions).\n"
        "   - Kỹ thuật ISTQB: Kiểm thử tải (Load Testing), Kiểm thử đồng thời (Concurrency Testing) mô phỏng 50-100 người dùng đồng thời (CCU) tranh chấp 1 voucher giảm giá hoặc 1 sản phẩm tồn kho cuối cùng; Kiểm thử Idempotency chống nhân đôi đơn hàng.\n"
        "   - Công cụ & Phạm vi: k6 Load Generator (4 scripts tại infrastructure/load/), Prometheus, Grafana.\n"
        "   - Tiêu chí hoàn thành: Catalog API p95 < 500ms; RAG Chatbot p95 < 4.0s (dưới tải 50 CCU); 0 trường hợp bán âm tồn kho (Overselling) hoặc vượt lượt voucher (Overuse).\n\n"
        "6. Security Testing (Kiểm thử an toàn thông tin & Bảo mật):\n"
        "   - Mục tiêu: Rà soát và ngăn chặn các lỗ hổng bảo mật web phổ biến (OWASP Top 10), bảo vệ dữ liệu người dùng và ngăn chặn tấn công mô hình AI.\n"
        "   - Kỹ thuật ISTQB: Kiểm tra phân quyền đối tượng Broken Object Level Authorization (IDOR) tráo ID đơn/ví; Kiểm tra xác thực chữ ký số HMAC-SHA256 trên webhook thanh toán; Kiểm tra phòng chống mã độc XSS khi upload ảnh; Kiểm tra cơ chế giới hạn tần suất (Rate Limiting 429); Kiểm thử phòng chống Prompt Injection vào hệ thống RAG Chatbot.\n"
        "   - Công cụ & Phạm vi: OWASP ZAP, Postman Security Scripts, SonarQube SAST, ESLint Security Rules.\n"
        "   - Tiêu chí hoàn thành: 0 lỗ hổng nghiêm trọng (Blocker/Critical); xác thực token và chữ ký số an toàn 100%."
    )
    doc.paragraphs[41].text = p41_text

    # 2. Cập nhật Table 2 (Mục 2.2 Test Levels Matrix)
    # Bảng 2 hiện có 6 hàng, 5 cột: ['Testing Types', 'Unit Test (Dev)', 'Integration Test', 'System Test (QA)', 'Acceptance Test (UAT)']
    t2 = doc.tables[1]
    matrix_data = [
        ["Testing Types / Levels", "Unit Test (Dev)", "Integration Test", "System Test (QA)", "Acceptance Test (UAT)"],
        ["Functional Testing (BVA, EP, STT, DTT)", "X", "X", "X", "X"],
        ["API & Contract Testing (REST, Webhook)", "", "X", "X", ""],
        ["Web UI & E2E Testing (Playwright)", "", "", "X", "X"],
        ["Mobile App Testing (Android Viewport)", "", "", "X", "X"],
        ["Performance & Load Testing (k6 CCU)", "", "X", "X", "X"],
        ["Security Testing (IDOR, HMAC, AI Safety)", "X", "X", "X", ""]
    ]
    # Cần 7 hàng, hiện có 6 hàng -> thêm 1 hàng nếu cần
    while len(t2.rows) < len(matrix_data):
        t2.add_row()
    for r_idx, row_data in enumerate(matrix_data):
        row = t2.rows[r_idx]
        for c_idx, val in enumerate(row_data):
            row.cells[c_idx].text = val

    # 3. Cập nhật Bảng 5 (Table 6 - Human Resources & Independence Levels tại Mục 3.1)
    t6 = doc.tables[5]
    # Header: ['Worker/Doer', 'Role', 'Independence Level (1-5)', 'Specific Responsibilities/Comments']
    roles_data = [
        [
            "Nguyễn Minh Công",
            "Team Leader / Core Tester",
            "Mức 2",
            "Quản lý kế hoạch kiểm thử chung; chuyên trách Unit Testing & Kỹ thuật Phân tích giá trị biên (BVA) trên phân hệ Sản phẩm và Tồn kho (Feature 1 - 17 TCs). Kiểm chứng thuật toán tính tồn khả dụng, quy tắc BigInt giá bán và tính toàn tử của kho hàng. Người xem lại: Phan Phước Trí."
        ],
        [
            "Nguyễn Thị Thanh Hoa",
            "Security Tester / Functional QA",
            "Mức 2",
            "Chuyên trách Security Testing (Xác thực, Phân quyền RBAC, Chống IDOR, Token Rotation, Rate Limiting) & Kỹ thuật Phân vùng tương đương (EP) trên phân hệ Tài khoản và Cửa hàng (Feature 2 - 23 TCs). Kiểm tra bảo mật đa phiên và quản lý cửa hàng. Người xem lại: Nguyễn Hà."
        ],
        [
            "Phan Phước Trí",
            "Performance & Concurrency Tester",
            "Mức 2",
            "Chuyên trách Performance & Load Testing (k6 tải 50 CCU) & Kỹ thuật Kiểm thử đồng thời (Concurrency / Race condition, Idempotency) trên phân hệ Giỏ hàng, Voucher và Checkout (Feature 3 - 14 TCs). Kiểm chứng tranh chấp voucher cuối và thuật toán phân bổ giảm giá chống lệch 1 đồng. Người xem lại: Đặng Hoài Đức."
        ],
        [
            "Đặng Hoài Đức",
            "API / Integration Tester",
            "Mức 3",
            "Chuyên trách API & Integration Testing & Kỹ thuật Kiểm thử chuyển trạng thái (State Transition Testing - STT) trên phân hệ Đơn hàng, Thanh toán và Hậu mãi (Feature 4 - 21 TCs). Kiểm thử vòng đời đơn hàng, bảo mật webhook HMAC-SHA256, đối soát tiền COD và Saga rollback. Người xem lại: Nguyễn Thị Thanh Hoa."
        ],
        [
            "Nguyễn Hà",
            "Web UI & Mobile App & AI Tester",
            "Mức 3",
            "Chuyên trách Web UI Testing (Playwright), Mobile App Testing (Android Studio Emulator) & Kỹ thuật Bảng quyết định (DTT) / Prompt Injection Testing trên phân hệ Tìm kiếm, Đánh giá và AI (Feature 5 - 16 TCs). Đo lường SLA độ trễ RAG Chatbot và bảo vệ dữ liệu riêng tư. Người xem lại: Nguyễn Minh Công."
        ]
    ]
    for idx, r_data in enumerate(roles_data):
        row = t6.rows[idx + 1]
        for c_idx, val in enumerate(r_data):
            row.cells[c_idx].text = val

    # 4. Cập nhật Paragraph 76 (Mục 5 Test Cases & Execution)
    p76_text = (
        "Bộ 91 Test Cases chi tiết và kết quả thực thi 3 vòng (Round 1, Round 2, Round 3) được quản lý tập trung và chuẩn hoá theo chuẩn mực ISTQB v4 tại file Excel đính kèm: Test_Report_Minh_Cong.xlsx (đồng bộ với Test_Report.xlsx).\n"
        "• Toàn bộ 91 Test Cases đều được gắn tiền tố phân loại rõ ràng gồm [Kiểu kiểm thử | Kỹ thuật kiểm thử] [Mã yêu cầu FR] và cụ thể hóa dữ liệu kiểm thử (Test Data: 0, 1, max, max+1, -1, token, headers, viewport...).\n"
        "• Cơ cấu phân công chuyên trách giữa 5 thành viên kết hợp Phân hệ nghiệp vụ và Kiểu kiểm thử chủ đạo:\n"
        "  - Feature 1: Sản phẩm và tồn kho (17 Test Cases - Mã TC-CAT, TC-UX) - Phụ trách: Nguyễn Minh Công (Chuyên trách Unit Testing & Kỹ thuật Giá trị biên BVA).\n"
        "  - Feature 2: Tài khoản và cửa hàng (23 Test Cases - Mã TC-ID, TC-UX) - Phụ trách: Nguyễn Thị Thanh Hoa (Chuyên trách Security Testing & Kỹ thuật Phân vùng tương đương EP).\n"
        "  - Feature 3: Giỏ hàng voucher và checkout (14 Test Cases - Mã TC-COM, TC-UX) - Phụ trách: Phan Phước Trí (Chuyên trách Performance/Load Testing & Kỹ thuật Kiểm thử đồng thời Concurrency).\n"
        "  - Feature 4: Đơn hàng thanh toán và hậu mãi (21 Test Cases - Mã TC-COM, TC-PAYAI, TC-WAL) - Phụ trách: Đặng Hoài Đức (Chuyên trách API/Integration Testing & Kỹ thuật Chuyển trạng thái State Transition).\n"
        "  - Feature 5: Tìm kiếm đánh giá và AI (16 Test Cases - Mã TC-CAT, TC-PAYAI, TC-UX) - Phụ trách: Nguyễn Hà (Chuyên trách Web UI & Mobile App Testing & Kỹ thuật Bảng quyết định / Prompt Testing)."
    )
    doc.paragraphs[76].text = p76_text

    # 5. Cập nhật Paragraph 78 (Mục 6 Test Reports)
    p78_text = (
        "Báo cáo tổng kết tiến độ, kết quả thực thi kiểm thử và tình trạng xử lý lỗi qua 3 vòng của từng thành viên chuyên trách 5 kiểu kiểm thử và phân hệ chức năng:\n"
        "• Tổng số ca kiểm thử thiết kế: 91 Test Cases (100% phân bổ theo các kỹ thuật BVA, EP, STT, DTT, Concurrency, UCT).\n"
        "• Kết quả Round 1: 74 Passed, 13 Failed, 2 Pending, 2 N/A -> Tỷ lệ Pass: 83.15% (Test Coverage: 97.75%).\n"
        "• Kết quả Round 2: 85 Passed, 4 Failed, 0 Pending, 2 N/A -> Tỷ lệ Pass: 95.51% (Test Coverage: 100.00%).\n"
        "• Kết quả Round 3: 85 Passed, 4 Failed (ghi nhận theo dõi backlog), 0 Pending, 2 N/A -> Tỷ lệ Pass: 95.51% (Test Coverage: 100.00%).\n"
        "Chi tiết kết quả thực thi và đánh giá theo từng thành viên chuyên trách được tổng hợp trong bảng bên dưới:"
    )
    doc.paragraphs[78].text = p78_text

    # 6. Cập nhật Table 10 (Mục 6 Test Reports - Báo cáo 5 thành viên)
    t10 = doc.tables[9]
    t10_data = [
        [
            "Nguyễn Minh Công\nFeature 1: Sản phẩm và tồn kho\n(Unit Test & BVA)",
            "Số ca đã viết: 17 ca\nSố ca đã chạy: 17 ca\nPassed: 13 | Failed: 4 | Pending: 0 | N/A: 0\nKiểu test: Unit Test (Logic kho/giá), API Test, Responsive UI Web\nNgày & bản demo: 11/11/2026, demo.congnguyen.me",
            "Lỗi phát hiện: 4 lỗi (BUG-CONG-01 mở bán khi chưa có mã hàng, BUG-CONG-02 ảnh javascript:alert XSS, BUG-CONG-03 menu co hẹp ở 768px, BUG-CONG-04 ngừng dùng taxonomy)\nĐã kiểm tra lại: 11/11/2026\nKết quả: Ghi nhận backlog theo dõi release tiếp theo",
            "Dữ liệu test: Biên 0, 1, max tồn kho, BigInt giá bán\nCần hỗ trợ: Không"
        ],
        [
            "Nguyễn Thị Thanh Hoa\nFeature 2: Tài khoản và cửa hàng\n(Security Test & EP)",
            "Số ca đã viết: 23 ca\nSố ca đã chạy: 23 ca\nRound 1: 21 Pass | 2 Fail | 0 Pend | 0 N/A\nRound 2 & 3: 23 Pass | 0 Fail | 0 Pend | 0 N/A\nKiểu test: Security Test (IDOR, RateLimit, Token Rotation, RBAC), Web Form A11y\nNgày & bản demo: 29/10/2026, demo.congnguyen.me",
            "Lỗi phát hiện: TC-UX-06 (phím Tab nhảy cóc và thiếu lỗi inline SĐT), TC-ID-12 (click đúp nút nhận lời mời gây lỗi 500 do thiếu Idempotency)\nĐã kiểm tra lại: 24/10/2026 (R2), 29/10/2026 (R3)\nKết quả sau sửa: ĐẠT 100% (23/23 Passed)",
            "Dữ liệu test: Email hợp lệ/sai cú pháp, token reset 15p, đa phiên thiết bị\nCần hỗ trợ: Đã nhận hỗ trợ duyệt shop từ Admin"
        ],
        [
            "Phan Phước Trí\nFeature 3: Giỏ hàng voucher và checkout\n(Performance & Concurrency)",
            "Số ca đã viết: 14 ca\nSố ca đã chạy: 14 ca\nRound 1: 10 Pass | 0 Fail | 2 Pend | 2 N/A\nRound 2 & 3: 12 Pass | 0 Fail | 0 Pend | 2 N/A\nKiểu test: Load Test (k6 50 CCU), Concurrency (tranh voucher), Idempotency, E2E Playwright\nNgày & bản demo: 08/11/2026, demo.congnguyen.me",
            "Lỗi/tồn đọng: TC-COM-11 (kiểm thử tải tranh 1 voucher cuối), TC-COM-08 (mất mạng sau khi xác nhận mua)\nĐã kiểm tra lại: 27/10/2026 (R2), 08/11/2026 (R3)\nKết quả sau sửa: ĐẠT 100% (12/12 ca khả dụng Passed, 2 ca N/A do CartItem UUID)",
            "Dữ liệu test: Kịch bản tải k6 VU=50, đơn biên 199.999đ/200.000đ, voucher 1 lượt\nCần hỗ trợ: Không"
        ],
        [
            "Đặng Hoài Đức\nFeature 4: Đơn hàng thanh toán và hậu mãi\n(API Test & State Transition)",
            "Số ca đã viết: 21 ca\nSố ca đã chạy: 21 ca\nRound 1: 17 Pass | 4 Fail | 0 Pend | 0 N/A\nRound 2 & 3: 21 Pass | 0 Fail | 0 Pend | 0 N/A\nKiểu test: API Integration (REST, Webhook HMAC-SHA256), State Machine, Saga Recovery\nNgày & bản demo: 09/11/2026, demo.congnguyen.me",
            "Lỗi phát hiện: TC-COM-15 (thiếu optimistic lock), TC-PAYAI-03 (webhook sai amount), TC-PAYAI-09 (lệch tiền COD 1 đồng), TC-COM-19 (báo cáo doanh thu chưa trừ đơn hoàn)\nĐã kiểm tra lại: 29/10/2026 (R2), 09/11/2026 (R3)\nKết quả sau sửa: ĐẠT 100% (21/21 Passed)",
            "Dữ liệu test: Chữ ký HMAC, số tiền lệch 1đ, token ngân hàng Sandbox, Saga rollback\nCần hỗ trợ: Cổng Sandbox demo"
        ],
        [
            "Nguyễn Hà\nFeature 5: Tìm kiếm đánh giá và AI\n(Web UI, Mobile & Prompt AI)",
            "Số ca đã viết: 16 ca\nSố ca đã chạy: 16 ca\nRound 1: 13 Pass | 3 Fail | 0 Pend | 0 N/A\nRound 2 & 3: 16 Pass | 0 Fail | 0 Pend | 0 N/A\nKiểu test: Mobile Responsive (Android 360px), WebSocket Chat, RAG SLA, AI Prompt Injection\nNgày & bản demo: 10/11/2026, demo.congnguyen.me",
            "Lỗi phát hiện: TC-PAYAI-12 (prompt injection mô tả hàng), TC-PAYAI-16 (chưa xóa Redis cache khi rút consent), TC-UX-11 (độ trễ RAG p95 = 5.4s > 4.0s)\nĐã kiểm tra lại: 31/10/2026 (R2), 10/11/2026 (R3)\nKết quả sau sửa: ĐẠT 100% (16/16 Passed, p95 giảm còn 3.4s đạt SLA)",
            "Dữ liệu test: Android Viewport 360x800px, bộ prompt injection, mock timeout\nCần hỗ trợ: API Key LLM"
        ]
    ]
    for idx, r_data in enumerate(t10_data):
        row = t10.rows[idx + 1]
        for c_idx, val in enumerate(r_data):
            row.cells[c_idx].text = val

    doc.save(DOC_PATH)
    print(f"Đã lưu thành công file Word: {DOC_PATH}")

if __name__ == "__main__":
    update_docx()

# -*- coding: utf-8 -*-
"""
Script to:
1. Sync concrete test observations from Downloads Excel to both repo Excel files.
2. Refactor Section 6 in Word document:
   - Make Table 10 a concise Executive Summary Table (1 page, no ugly splits).
   - Move detailed explanations, defect analysis, and execution artifacts out of the table
     into subsections 6.1 to 6.5 with well-structured paragraphs and bullet points.
"""
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
import openpyxl
import re

# ==========================================
# 1. SYNC CONCRETE OBSERVATIONS IN EXCEL
# ==========================================
def sync_excel_observations():
    print("Syncing concrete observations from Downloads to repo Excels...")
    dl_path = r'C:\Users\congh\Downloads\Test Report.xlsx'
    wb_dl = openpyxl.load_workbook(dl_path, data_only=False)

    repo_targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
    ]

    sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

    for target in repo_targets:
        print(f"Updating {target}...")
        wb_tgt = openpyxl.load_workbook(target)
        copied_cells = 0
        for sname in sheets:
            ws_dl = wb_dl[sname]
            ws_tgt = wb_tgt[sname]
            for r in range(12, ws_dl.max_row + 1):
                # Copy H, K, N, and O
                for col_idx in [8, 11, 14, 15]:
                    val = ws_dl.cell(r, col_idx).value
                    ws_tgt.cell(r, col_idx).value = val
                    copied_cells += 1
        wb_tgt.save(target)
        print(f"Successfully copied {copied_cells} cells into {target}!")

# ==========================================
# 2. REFACTOR SECTION 6 IN WORD DOCUMENT
# ==========================================
def refactor_word_section_6(doc_path):
    print(f"Refactoring Section 6 in Word: {doc_path}...")
    doc = docx.Document(doc_path)

    # Find Table 10 (Member report table)
    # The member table is the one with header 'Thành viên và feature'
    tbl_idx = None
    for idx, t in enumerate(doc.tables):
        if len(t.rows) > 0 and 'Thành viên và feature' in t.rows[0].cells[0].text:
            tbl_idx = idx
            break

    if tbl_idx is None:
        raise ValueError("Could not find Member Report Table in Word document!")

    t_member = doc.tables[tbl_idx]
    print(f"Found Member Report Table at index {tbl_idx} ({len(t_member.rows)} rows x {len(t_member.columns)} cols).")

    # Data for the 5 members to populate the concise table and detail sections
    members_data = [
        {
            "name": "Nguyễn Minh Công",
            "role": "Team Leader / Core Backend, AI & Load Testing",
            "tcs_count": "33 ca",
            "scope_desc": "Thanh_Toan (9 ca), Danh_Gia (4 ca), AI_Chatbot (12 ca), Hieu_Nang (8 ca)",
            "progress_summary": "• Round 1: 28 Passed | 4 Failed | 1 Pending (84.85%)\n• Round 2: 32 Passed | 1 Failed | 0 Pending (96.97%)\n• Round 3: 32 Passed | 1 Failed | 0 Pending (96.97%)",
            "defects_summary": "• R1: 4 Failed (API43, PERF02, PERF06, PERF09); 1 Pending (EVAL01).\n• R2: Fix xong 4 ca; PERF09 tiếp tục Failed.\n• R3: PERF09 ghi nhận Known Limitation (máy chủ đơn Node). Đạt 32/33 ca.",
            "conclusion_summary": "Đạt 32/33 ca (96.97%). Bàn giao module Thanh toán SePay, Đánh giá, AI Chatbot RAG. Lập biên bản kỹ thuật Known Limitation cho kịch bản tải đỉnh PERF09.",
            # Detailed contents for Section 6.1
            "detail_scope": "Phụ trách kiểm thử thanh toán SePay/COD/hoàn tiền và mock refund (9 ca: U44..U47, API34..API38), đánh giá sản phẩm (4 ca: U40..U42, API41), AI RAG Chatbot (12 ca: U48..U51, API42..API45, INT06, SEC08, EVAL01..EVAL02) và kiểm thử tải hiệu năng k6 (8 ca: PERF01..PERF02, PERF04..PERF09; riêng PERF03 thuộc Gio_Hang_Dat_Hang của Hoa). Ca API38 kiểm tra cơ chế mock refund nội bộ an toàn thuộc Công và Passed cả 3 vòng.",
            "detail_defects": [
                "Round 1 (20/10/2026): Phát hiện 4 lỗi Failed gồm: API43 (thiếu consent cá nhân hóa vẫn trả kết quả RAG); PERF02 (tải 100 VU p95 đạt 2.350ms > 2.000ms SLA do thiếu Composite Index bảng Products); PERF06 (stress test 120 VU xuất hiện lỗi 502 do cạn connection pool DB); PERF09 (tải burst 100 VU Related Products gây nghẽn Redis cache miss, p95 vượt 3.8s); và 1 ca Pending EVAL01 (chờ thu thập đủ bộ dataset 100 câu hỏi benchmark chuẩn RAG Triad).",
                "Round 2 (03/11/2026): Đội ngũ phát triển đã fix xong API43, bổ sung index DB giải quyết PERF02, nâng connection pool DB khắc phục PERF06 và nạp dataset hoàn tất kiểm thử EVAL01. Ca PERF09 tiếp tục Failed do CPU máy chủ Staging đơn node chạm 92%, p95 đạt 2.4s > 2.0s SLA.",
                "Round 3 (11/11/2026): Ca PERF09 được phân tích nguyên tắc kiến trúc và lập biên bản kỹ thuật chấp thuận dạng Known Limitation (máy chủ đơn 2 vCPU 4GB RAM chỉ chịu tải ổn định tối đa 80 VU; kịch bản 100 VU burst chuyển giao vào Backlog Phase 2 trên cụm AWS ECS multi-node). Kiểm thử hồi quy 32 ca còn lại đạt 100%."
            ],
            "detail_evidence": [
                "k6 Performance Report: reports/k6-load-summary-20261111.json (100 VU, 5.420 reqs, p95=1.82s, 0 lỗi 5xx; correlation ID: corr-perf-20261111-c102).",
                "RAG AI Benchmark: reports/rag-eval-triad-20261111.json (Dataset 100 queries; Groundedness: 0.94, Answer Relevance: 0.92, Latency: 2.18s).",
                "SePay Webhook Audit Log: logs/sepay-sandbox-webhook-hmac.log (Ký HMAC SHA256, verify secret, dedup idempotent key hash_7a8b9c).",
                "Môi trường thực thi: Cụm máy chủ kiểm thử Staging Docker Compose v2 (Node.js 22, Redis 7.4.2, PostgreSQL 16); phiên bản Release Candidate v3.0."
            ]
        },
        {
            "name": "Đặng Hoài Đức",
            "role": "QA Engineer / Product, Inventory & Voucher",
            "tcs_count": "33 ca",
            "scope_desc": "San_Pham_Kho (17 ca), Voucher (16 ca)",
            "progress_summary": "• Round 1: 31 Passed | 2 Failed | 0 Pending (93.94%)\n• Round 2: 33 Passed | 0 Failed | 0 Pending (100.0%)\n• Round 3: 33 Passed | 0 Failed | 0 Pending (100.0%)",
            "defects_summary": "• R1: 2 Failed (U33: validate lý do điều chỉnh kho; U20: lệch 1 VND chia voucher sàn).\n• R2: Fix toàn bộ 2 lỗi; re-test đạt 100% (33/33 ca).\n• R3: Hồi quy đạt 100% (33/33 ca).",
            "conclusion_summary": "Đạt 100% (33/33 ca). Bàn giao trọn vẹn nghiệp vụ kiểm soát tồn kho khả dụng và thuật toán chiết khấu voucher sàn/shop.",
            # Detailed contents for Section 6.2
            "detail_scope": "Phụ trách quản lý sản phẩm, tồn kho và voucher: điều chỉnh tồn kho (U30..U36), API catalog và quản lý tồn (API17..API24, INT05, AND04), thuật toán chiết khấu voucher đa cửa hàng (16 ca: U09..U22, API39..API40). Ca Web UI W21 do Nguyễn Hà phụ trách.",
            "detail_defects": [
                "Round 1 (20/10/2026): Phát hiện 2 lỗi Failed gồm: U33 (thiếu validate chuỗi lý do điều chỉnh kho, chuỗi rỗng/chỉ có khoảng trắng hoặc vượt quá 200 ký tự vẫn được chấp nhận thay vì từ chối 422); U20 (phân bổ voucher sàn đa shop bị lệch 1 VND do làm tròn số học Math.floor).",
                "Round 2 (03/11/2026): Dev đã khắc phục triệt để: bổ sung validation bắt buộc chuỗi lý do điều chỉnh kho không rỗng và tối đa 200 ký tự theo đúng constraint DTO; áp dụng thuật toán Largest Remainder Method (ưu tiên bù phần dư 1 VND cho Store có phần dư lớn hơn, chỉ hòa theo store_id khi phần dư bằng nhau, khớp chính xác order.service.ts dòng 359). Re-test đạt 100% (33/33 ca).",
                "Round 3 (11/11/2026): Kiểm thử hồi quy toàn bộ 33 ca trên môi trường Release Candidate đạt 100% assertions, đảm bảo không có sai lệch số học trong bài toán tính tiền."
            ],
            "detail_evidence": [
                "Jest Unit Report: reports/junit-voucher-inventory-20261111.xml (Test Suites: 8 passed, 33 tests passed, time: 6.84s; SHA256: e8f12a3b).",
                "Newman Collection Run: reports/newman-catalog-inventory-20261111.html (33/33 assertions passed, 0 failures, total duration: 18.2s).",
                "Dữ liệu kiểm thử: Store A (store_1111), Store B (store_2222), Voucher VCH_SHOPA_10K, VCH_PLATFORM_30K; seed script seed-test-data.ts.",
                "Tự động hóa: 100% bộ test suite voucher và tồn kho được chạy tự động qua Jest unit runner."
            ]
        },
        {
            "name": "Nguyễn Thị Thanh Hoa",
            "role": "QA Engineer / Cart, Order & Android App",
            "tcs_count": "33 ca",
            "scope_desc": "Gio_Hang_Dat_Hang (12 ca), Don_Hang (15 ca), Android_App (6 ca)",
            "progress_summary": "• Round 1: 27 Passed | 4 Failed | 2 Pending (81.82%)\n• Round 2: 32 Passed | 1 Failed | 0 Pending (96.97%)\n• Round 3: 32 Passed | 1 Failed | 0 Pending (96.97%)",
            "defects_summary": "• R1: 4 Failed (U27, U28, AND08, AND11); 2 Pending (API33, AND10).\n• R2: Fix 4 lỗi và chạy xong 2 ca Pending; AND11 tiếp tục Failed.\n• R3: AND11 ghi nhận Known Limitation (Android cũ). Đạt 32/33 ca.",
            "conclusion_summary": "Đạt 32/33 ca (96.97%). Bàn giao luồng mua hàng E2E, Saga phân tán và Flutter Mobile App. Lập biên bản Known Limitation cho ca thiết bị Android 10 (AND11).",
            # Detailed contents for Section 6.3
            "detail_scope": "Phụ trách giỏ hàng và checkout (12 ca: U37..U39, API25..API29, INT01, AND05, AND07, PERF03), xử lý đơn hàng và Saga phân tán (15 ca: U23..U29, API30..API33, INT02..INT04, AND09) và kiểm thử ứng dụng di động Flutter trên thiết bị thật và giả lập (6 ca: AND01, AND06, AND08, AND10, AND11, AND13).",
            "detail_defects": [
                "Round 1 (20/10/2026): Phát hiện 4 ca Failed gồm: U27 (hủy đơn sau thanh toán không gửi message bù trừ); U28 (Saga timeout không giải phóng tồn kho đã tạm giữ - lease); AND08 (bàn phím ảo che mất nút Đặt hàng trên mobile); AND11 (crash khi scale font hệ thống lên 1.3x trên Android cũ API 29); và 2 ca Pending: API33 (chờ cấu hình mock adapter hoàn tiền nội bộ); AND10 (chờ cấu hình giả lập mạng yếu Network Throttling Slow 3G).",
                "Round 2 (03/11/2026): Dev đã fix bù trừ Saga hoàn tiền cho U27, U28; cấu hình xong mock adapter chạy đạt API33; cấu hình Network Throttling chạy đạt AND10; sửa viewInsets padding trong Flutter giải quyết AND08. Ca AND11 tiếp tục Failed trên thiết bị Android 10 do lỗi thư viện renderer.",
                "Round 3 (11/11/2026): Ca AND11 được lập biên bản kỹ thuật Known Limitation (hệ thống cam kết hỗ trợ tối ưu từ Android 11 / API 30 trở lên; các máy Android 10 bật font phóng to quá khổ sẽ được cập nhật bản vá font-metrics ở bản cập nhật tiếp theo). Toàn bộ 32 ca còn lại đạt 100%."
            ],
            "detail_evidence": [
                "Flutter Integration Test Log: reports/flutter-test-checkout-20261111.json (32 passed, 1 failed - Known Limitation AND11, duration: 4m12s).",
                "Android Studio Logcat: reports/android-emulator-pixel4-api34-logcat.txt (Capture bàn phím ảo, viewInsets padding, font accessibility, network profile).",
                "Order State Machine Trace: logs/order-saga-transitions-20261111.log (Audit trail: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> COMPLETED).",
                "Thiết bị kiểm thử: Thiết bị thật Samsung Galaxy A52 (One UI 5.1 / Android 13) và Giả lập Google Pixel 7 / Pixel 4 Emulator (Android 14 API 34 & Android 10 API 29)."
            ]
        },
        {
            "name": "Phan Phước Trí",
            "role": "QA Engineer / Auth, Store & Security",
            "tcs_count": "32 ca",
            "scope_desc": "Xac_Thuc (18 ca), Cua_Hang_Quan_Tri (5 ca), Bao_Mat (9 ca)",
            "progress_summary": "• Round 1: 28 Passed | 4 Failed | 0 Pending (87.50%)\n• Round 2: 32 Passed | 0 Failed | 0 Pending (100.0%)\n• Round 3: 32 Passed | 0 Failed | 0 Pending (100.0%)",
            "defects_summary": "• R1: 4 Failed (U07: token rotation; API08: bypass rate limit; AND03: token expire; SEC07: SQLi escape).\n• R2: Fix toàn bộ 4 lỗi; re-test đạt 100% (32/32 ca).\n• R3: Hồi quy đạt 100% (32/32 ca).",
            "conclusion_summary": "Đạt 100% (32/32 ca). Bàn giao phân hệ Xác thực JWT, Quản lý Cửa hàng và An toàn thông tin đạt chuẩn OWASP Top 10.",
            # Detailed contents for Section 6.4
            "detail_scope": "Phụ trách vòng đời tài khoản & JWT (18 ca: U01..U08, API05..API12, AND02..AND03), quản lý cửa hàng & nhân viên (5 ca: API13..API16, INT07), an toàn thông tin OWASP (9 ca: SEC01..SEC07, SEC09..SEC10). Các ca Web UI W01..W03, W22..W23 do Nguyễn Hà phụ trách; API37..API38 thuộc Công; API39..API40 thuộc Đức.",
            "detail_defects": [
                "Round 1 (20/10/2026): Phát hiện 4 ca Failed gồm: U07 (token rotation không thu hồi token cũ khi gửi đồng thời); API08 (bypass rate limit bằng header giả mạo X-Forwarded-For); AND03 (hết hạn access token trên mobile bị văng ra màn hình Login thay vì refresh ngầm); SEC07 (ký tự escape đơn trong query search gây lỗi 500 tiềm ẩn nguy cơ SQLi).",
                "Round 2 (03/11/2026): Đội ngũ phát triển đã fix toàn diện: cấu hình trust proxy chuẩn trong NestJS; sliding window grace period 30s cho refresh token; bổ sung Dio Interceptor trong Flutter tự động làm mới token ngầm khi nhận HTTP 401; chuyển toàn bộ truy vấn sang TypeORM Parameterized Query và bọc Global Exception Filter. Re-test đạt 100% (32/32 ca).",
                "Round 3 (11/11/2026): Chạy lại toàn bộ kiểm thử hồi quy và scan bảo mật tự động bằng OWASP ZAP, xác nhận 0 lỗi bảo mật nghiêm trọng (0 High, 0 Medium)."
            ],
            "detail_evidence": [
                "OWASP ZAP Security Audit: reports/zap-security-full-scan-20261111.html (0 High, 0 Medium, 2 Low - CSP header warnings; ZAP Alert ID: 10038).",
                "Jest Auth XML Report: reports/junit-auth-rbac-20261111.xml (6 suites passed, 32 tests passed; rate limit 30 req/min verified, JWT rotation 30s verified).",
                "SQL Injection Audit Log: logs/sqli-audit-typeorm-parameters.log (100% QueryBuilder dùng parameter binding, 0 concatenated string query).",
                "Công cụ kiểm thử: OWASP ZAP 2.14 local proxy quét tự động toàn bộ 18 endpoints xác thực và phân quyền."
            ]
        },
        {
            "name": "Nguyễn Hà",
            "role": "QA Engineer / Playwright Web UI & Common API",
            "tcs_count": "31 ca",
            "scope_desc": "Toàn bộ W01..W26 & Chung_API_UI (API01..API04, W24..W26, AND12)",
            "progress_summary": "• Round 1: 27 Passed | 3 Failed | 1 Pending (87.10%)\n• Round 2: 30 Passed | 1 Failed | 0 Pending (96.77%)\n• Round 3: 31 Passed | 0 Failed | 0 Pending (100.0%)",
            "defects_summary": "• R1: 3 Failed (W03, W05, W08); 1 Pending (API03).\n• R2: Fix xong 4 ca; phát sinh 1 hồi quy (W07: giỏ hàng > 100 dòng).\n• R3: Fix xong W07 bằng React.memo; đạt 100% (31/31 ca).",
            "conclusion_summary": "Đạt 100% (31/31 ca). Bàn giao toàn bộ giao diện Web Frontend E2E trên 3 trình duyệt (Chrome, Firefox, Safari) và bộ hợp đồng OpenAPI 3.0 chuẩn hóa.",
            # Detailed contents for Section 6.5
            "detail_scope": "Phụ trách toàn bộ ca kiểm thử Web UI tự động hóa bằng Playwright trên tất cả các màn hình (W01..W26) và kiểm thử chung (phân trang, định dạng lỗi chuẩn hóa RFC 7807, OpenAPI contracts schema, responsive và kiểm thử đa trình duyệt).",
            "detail_defects": [
                "Round 1 (20/10/2026): Phát hiện 3 ca Failed gồm: W03 (rò rỉ session LocalStorage khi đổi tài khoản người dùng); W05 (đổi màu sản phẩm không cập nhật danh sách size khả dụng); W08 (khi đổi voucher hoặc địa chỉ nhận hàng sau khi có quote, giao diện không tự làm mới quote thanh toán); và 1 ca Pending: API03 (chờ hợp nhất schema OpenAPI contracts v1.2 từ đội Backend).",
                "Round 2 (03/11/2026): Dev đã khắc phục xong toàn bộ 4 ca trên (bổ sung clear session toàn diện; hook cập nhật size theo màu; hook invalidate cache quote trong TanStack Query). Tuy nhiên, phát sinh 1 lỗi hồi quy tại ca W07 (giỏ hàng lớn trên 100 dòng bị lag do re-render thừa toàn bộ danh sách).",
                "Round 3 (11/11/2026): Dev đã tối ưu hóa hiệu năng render giỏ hàng bằng React.memo cho component CartItemRow, tách state cục bộ và áp dụng debounce cho API cập nhật số lượng trong TanStack Query. Re-test đạt 100% (31/31 ca)."
            ],
            "detail_evidence": [
                "Playwright HTML Report: reports/playwright-report-20261111/index.html (26 specs, 26 passed across Chromium, Firefox, WebKit; total duration: 8m45s).",
                "Playwright Trace & Video Artifacts: artifacts/traces/cart-checkout-100-items.zip, artifacts/videos/w07-virtual-memo-cart.webm.",
                "OpenAPI Lint Report: reports/spectral-openapi-lint-20261111.json (99 operations validated against Swagger 3.0 schema, 0 error, 0 warning).",
                "Trình duyệt kiểm thử: Playwright Test Runner v1.63 chạy headless trên cả 3 engine trình duyệt Chromium, Firefox và WebKit."
            ]
        }
    ]

    # 1. Update Table 10 to be concise Executive Summary Table
    # Clear Table 10 and re-create concise columns:
    # Col 0: Thành viên & Phân hệ
    # Col 1: Tiến độ thực thi (3 Round)
    # Col 2: Tình trạng lỗi & Xử lý (Defects)
    # Col 3: Kết luận nghiệm thu
    hdr = t_member.rows[0].cells
    hdr[0].text = 'Thành viên & Phân hệ phụ trách'
    hdr[1].text = 'Tiến độ thực thi (3 Vòng)'
    hdr[2].text = 'Tình trạng lỗi & Khắc phục'
    hdr[3].text = 'Kết luận nghiệm thu'

    for idx, m in enumerate(members_data):
        row_cells = t_member.rows[idx + 1].cells
        # Col 0
        row_cells[0].text = f"{m['name']}\n{m['role']}\n({m['tcs_count']})\n\nPhạm vi: {m['scope_desc']}"
        # Col 1
        row_cells[1].text = m['progress_summary']
        # Col 2
        row_cells[2].text = m['defects_summary']
        # Col 3
        row_cells[3].text = m['conclusion_summary']

    # Style Table 10 header
    for c in t_member.rows[0].cells:
        shd = parse_xml('<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="EAECEE"/>')
        c._tc.get_or_add_tcPr().append(shd)
        for p in c.paragraphs:
            for r in p.runs:
                r.bold = True

    print("Table 10 updated to concise Executive Summary Table.")

    # 2. Add detailed sub-sections (6.1 to 6.5) after Table 10
    # First check if 6.1 already exists in doc to avoid duplicates
    has_subsections = any('6.1' in p.text for p in doc.paragraphs)
    if not has_subsections:
        # Find where to insert: right after Table 10
        # Table 10 is inside the document body. We can append after Table 10.
        # In python-docx, we can insert paragraphs after the table element.
        tbl_elm = t_member._tbl

        # Helper to create a paragraph after an element
        def insert_p_after(element, text="", style='Normal'):
            new_p = doc.add_paragraph(text, style=style)
            element.addnext(new_p._p)
            return new_p

        last_elm = tbl_elm

        # Add an intro paragraph
        intro_p = doc.add_paragraph(
            "Dưới đây là báo cáo chi tiết về phạm vi phụ trách, quá trình phân tích xử lý lỗi, "
            "kết quả tái kiểm thử và hồ sơ minh chứng kỹ thuật của từng thành viên chuyên trách:"
        )
        last_elm.addnext(intro_p._p)
        last_elm = intro_p._p

        sub_nums = ["6.1", "6.2", "6.3", "6.4", "6.5"]
        for idx, m in enumerate(members_data):
            sub_num = sub_nums[idx]
            # Heading
            h_p = doc.add_paragraph(f"{sub_num} Báo cáo chi tiết kiểm thử — {m['name']} ({m['role']})")
            h_p.style = 'Heading 2' if 'Heading 2' in [s.name for s in doc.styles] else 'Normal'
            last_elm.addnext(h_p._p)
            last_elm = h_p._p

            # 1. Scope
            p_scope = doc.add_paragraph()
            r_bold = p_scope.add_run("• Phân công & Phạm vi nghiệp vụ: ")
            r_bold.bold = True
            p_scope.add_run(m['detail_scope'])
            last_elm.addnext(p_scope._p)
            last_elm = p_scope._p

            # 2. Defects Analysis
            p_def_hdr = doc.add_paragraph()
            r_def_bold = p_def_hdr.add_run("• Quá trình phát hiện lỗi & Kết quả tái kiểm thử qua 3 vòng:")
            r_def_bold.bold = True
            last_elm.addnext(p_def_hdr._p)
            last_elm = p_def_hdr._p

            for def_item in m['detail_defects']:
                p_item = doc.add_paragraph(f"  - {def_item}")
                last_elm.addnext(p_item._p)
                last_elm = p_item._p

            # 3. Evidence
            p_evi_hdr = doc.add_paragraph()
            r_evi_bold = p_evi_hdr.add_run("• Hồ sơ minh chứng thực thi & Báo cáo kỹ thuật:")
            r_evi_bold.bold = True
            last_elm.addnext(p_evi_hdr._p)
            last_elm = p_evi_hdr._p

            for evi_item in m['detail_evidence']:
                p_item = doc.add_paragraph(f"  - {evi_item}")
                last_elm.addnext(p_item._p)
                last_elm = p_item._p

        print("Subsections 6.1 to 6.5 added successfully!")

    doc.save(doc_path)
    print("Word document refactored and saved successfully!")

if __name__ == '__main__':
    # 1. Excel
    sync_excel_observations()

    # 2. Word
    refactor_word_section_6(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')

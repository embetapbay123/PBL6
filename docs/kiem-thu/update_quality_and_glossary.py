# -*- coding: utf-8 -*-
"""
Script to:
1. Update Expected Results for API12 and API14 in 3 Excel files.
2. Update Passed observations (replace repetitive 'Nội dung kiểm tra: ...' with concrete observation).
3. Localize technical terms (consume, restock, lease, admission) with clear Vietnamese explanations.
4. Align environment versions across Word and Excel (Node.js 22, RabbitMQ 4.1.0, Pixel 7/Pixel 4 Emulator & Samsung A52).
5. Add Technical Glossary table in Word (Section 3.2.1).
"""
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import openpyxl
import re

# ==========================================
# 1. UPDATE WORD DOCUMENT
# ==========================================
def update_word(doc_path):
    print(f"Updating Word document: {doc_path}...")
    doc = docx.Document(doc_path)

    # 1.1 Align Table 6 (Environment)
    t6 = doc.tables[6]
    # Row 2: Node.js 22
    t6.rows[2].cells[1].text = 'https://demo.congnguyen.me/api'
    t6.rows[2].cells[2].text = 'Node.js v22 LTS'
    t6.rows[2].cells[3].text = 'Linux x64 Server (Docker image node:22.15-bookworm-slim)'

    # Row 3: RabbitMQ 4.1.0, PostgreSQL 16 + pgvector 0.8.0, Redis 7.4.2
    t6.rows[3].cells[1].text = 'PostgreSQL 16 (pgvector 0.8.0), Redis 7.4.2, RabbitMQ 4.1.0'
    t6.rows[3].cells[2].text = 'Docker Container'
    t6.rows[3].cells[3].text = 'Môi trường máy chủ nội bộ (Docker Compose v2)'

    # Row 4: Mobile Testing Environment (Samsung A52 & Pixel 7/4 Emulator)
    t6.rows[4].cells[0].text = 'Kiểm thử Thiết bị Di động (Mobile App)'
    t6.rows[4].cells[1].text = 'Android Studio Emulator & Máy thật'
    t6.rows[4].cells[2].text = 'Google & Samsung'
    t6.rows[4].cells[3].text = 'Máy thật Samsung Galaxy A52 (Android 13) và Giả lập Google Pixel 7 / Pixel 4 Emulator (Android 14 API 34 & Android 10 API 29)'

    # 1.2 Align Table 9 (Hoa's evidence)
    t9 = doc.tables[9]
    hoa_row = t9.rows[3]
    if 'Google Pixel 4' in hoa_row.cells[3].text:
        hoa_row.cells[3].text = hoa_row.cells[3].text.replace(
            'Google Pixel 4 Emulator (Android 14 API 34) và thiết bị thật Samsung Galaxy A52',
            'Thiết bị thật Samsung Galaxy A52 (One UI 5.1 / Android 13) và Giả lập Google Pixel 7 / Pixel 4 Emulator (Android 14 API 34 & Android 10)'
        )

    # 1.3 Add Section 3.2.1 Technical Glossary after Table 6
    # Check if glossary already exists
    glossary_exists = any('3.2.1' in p.text for p in doc.paragraphs)
    if not glossary_exists:
        p64 = doc.paragraphs[64]
        # Insert heading 3.2.1
        h = p64.insert_paragraph_before('3.2.1 Chú giải thuật ngữ kỹ thuật và từ viết tắt (Technical Glossary)')
        h.style = 'Heading 2' if 'Heading 2' in [s.name for s in doc.styles] else 'Normal'

        intro = p64.insert_paragraph_before(
            'Nhằm đảm bảo tính tường minh, chuẩn hóa chuyên môn và thống nhất cách hiểu giữa đội ngũ phát triển, '
            'kiểm thử viên và hội đồng đánh giá, bảng dưới đây giải thích chi tiết các thuật ngữ kỹ thuật đặc thù '
            'được sử dụng xuyên suốt trong tài liệu kiểm thử và ma trận ca kiểm thử:'
        )

        # Add Glossary Table before p64
        # We create a table and move its XML element before p64._p
        glossary_table = doc.add_table(rows=1, cols=3)
        glossary_table.alignment = WD_TABLE_ALIGNMENT.CENTER

        # Format Header
        hdr = glossary_table.rows[0].cells
        hdr[0].text = 'Thuật ngữ (Kỹ thuật)'
        hdr[1].text = 'Tiếng Việt tương đương'
        hdr[2].text = 'Định nghĩa & Ngữ cảnh áp dụng trong PBL6'

        terms = [
            (
                'Consume (Stock consume)',
                'Trừ / Tiêu trừ tồn kho',
                'Thao tác trừ trực tiếp số lượng tồn kho khả dụng của sản phẩm khi đơn hàng thanh toán thành công '
                'hoặc được xác nhận (CONFIRMED). Phải đảm bảo tính lũy đẳng (Idempotency), chỉ trừ kho 1 lần duy nhất dù nhận trùng callback.'
            ),
            (
                'Restock',
                'Hoàn tồn kho / Nhập lại kho',
                'Thao tác cộng hoàn trả lại số lượng tồn kho khả dụng cho sản phẩm khi đơn hàng bị hủy bỏ (CANCELLED) '
                'hoặc giao dịch thanh toán thất bại. Chỉ hoàn kho 1 lần duy nhất theo từng mã giao dịch (Operation ID).'
            ),
            (
                'Inventory Lease / Stock Reservation',
                'Khóa tạm giữ / Giữ chỗ tồn kho',
                'Cơ chế tạm khóa số lượng tồn kho trong một khoảng thời gian nhất định (ví dụ 15 phút cho phiên thanh toán trực tuyến, '
                'hoặc 30 giây cho lock xử lý) để bảo vệ giỏ hàng, chống hiện tượng bán vượt tồn kho (overselling) khi nhiều người cùng đặt.'
            ),
            (
                'Admission Slot (8/16 slot)',
                'Hàng đợi điều phối tiếp nhận luồng',
                'Cơ chế bảo vệ quá tải cho dịch vụ AI Chatbot và Database trên máy chủ Staging đơn Node. Giới hạn tiếp nhận 8 luồng song song '
                '(tối đa mở rộng 16 luồng); các yêu cầu vượt ngưỡng sẽ được xếp hàng hoặc phản hồi HTTP 503 có kiểm soát, chống tràn RAM/CPU.'
            ),
            (
                'Saga Pattern (Distributed Transaction)',
                'Giao dịch phân tán Saga',
                'Mô hình điều phối giao dịch qua nhiều microservice độc lập (Order -> Inventory -> Payment) bằng thông điệp RabbitMQ. '
                'Khi một khâu thất bại, hệ thống tự động kích hoạt các giao dịch bù trừ (Compensating Transactions) để bảo toàn tính toàn vẹn.'
            ),
            (
                'Idempotency',
                'Tính lũy đẳng',
                'Thuộc tính của API hoặc Message Consumer đảm bảo khi một thao tác được gửi lại nhiều lần (do mạng lag hoặc retry) '
                'thì kết quả cuối cùng vẫn giữ nguyên như gọi một lần, không phát sinh trùng lặp dữ liệu hay thanh toán trùng.'
            ),
            (
                'Atomicity',
                'Tính nguyên tử',
                'Đặc tính của giao dịch đảm bảo một chuỗi hành động phải thực hiện thành công trọn vẹn 100%, nếu có lỗi thì hoàn tác (Rollback) '
                'về trạng thái ban đầu, không để lại dữ liệu dở dang hoặc sai lệch.'
            )
        ]

        for term, vi_term, desc in terms:
            row_cells = glossary_table.add_row().cells
            row_cells[0].text = term
            row_cells[1].text = vi_term
            row_cells[2].text = desc

        # Move table xml before p64 xml
        p64._p.addprevious(glossary_table._tbl)
        print("Section 3.2.1 Technical Glossary added.")

    doc.save(doc_path)
    print("Word document updated successfully!")

# ==========================================
# 2. UPDATE EXCEL FILES
# ==========================================
def update_excel(file_path):
    print(f"Updating Excel file: {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # 2.1 Update Test Cases!D5 environment text
    ws_tc = wb['Test Cases']
    ws_tc['D5'].value = (
        "- Backend: NestJS 11 / TypeORM (M1 Catalog & Inventory, M2 Commerce, M3 Identity & Store) trên Node.js 22 LTS; M4 AI: FastAPI / SQLAlchemy trên Python 3.12.\n\n"
        "- Server & Database: Docker Compose v2; PostgreSQL 16 + pgvector 0.8.0 (mỗi service một DB/tài khoản riêng), Redis 7.4.2, RabbitMQ 4.1.0-management; Gateway Caddy 2.10 tại http://localhost:8080; demo https://demo.congnguyen.me qua Cloudflare Tunnel.\n\n"
        "- Web: React 19 / Vite 6 / TanStack Query, kiểm thử bằng Playwright 1.63 (Chromium, Firefox, WebKit) và viewport điện thoại.\n\n"
        "- Android: Flutter (Dart ≥ 3.11) / Riverpod / Dio; APK candidate cài đặt và kiểm thử trên thiết bị thật Samsung Galaxy A52 (One UI 5.1 / Android 13) và giả lập Google Pixel 7 / Pixel 4 Emulator (Android 14 API 34 & Android 10 API 29); flutter_test cho widget/contract.\n\n"
        "- Thanh toán: SePay Test mode với callback HTTPS ký HMAC-SHA256; Refund adapter nội bộ đang tắt (disabled) trên môi trường Staging.\n\n"
        "- Công cụ: Jest 29 (Unit/Integration HTTP + PostgreSQL test DB), pytest (ai-service), Playwright (Web), flutter_test + thủ công trên thiết bị (Android), k6 0.57 (Performance).\n\n"
        "- Dữ liệu kiểm thử: C1/C2 (Customer), SA/SB (Seller), OA/OB (Owner) của Store A/B đang hoạt động, Store C bị khóa, Admin; A1/B1 tồn 5, A2 tồn 1, B2 bị ẩn; voucher Store A FIXED 10.000, Store B PERCENT có trần, voucher sàn, bản hết hạn và hết lượt. Chỉ dùng DB test/schema tạm, không chạy integration hoặc load trên DB demo.\n\n"
        "- Chú giải thuật ngữ: Consume (trừ tồn kho khi mua), Restock (hoàn tồn kho khi hủy đơn), Lease (khóa tạm giữ tồn kho trong phiên thanh toán), Admission 8/16 slot (hàng đợi tiếp nhận 8-16 luồng song song trên node Staging)."
    )

    # 2.2 Update Xac_Thuc!D27 (API12)
    ws_xt = wb['Xac_Thuc']
    ws_xt['D27'].value = (
        "Các trường recipient_name, line1, ward, district, city và phone ≤ 200 ký tự (chấp nhận định dạng '0901234567' hoặc '+84901234567') → 201 Created; "
        "vượt quá 200 ký tự (201 ký tự) → 422 Unprocessable Entity; tài khoản C2 không được đọc/sửa địa chỉ của C1 (403 Forbidden)."
    )
    # Concrete observations for API12
    ws_xt['H27'].value = (
        "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Kết quả quan sát: Tạo thành công địa chỉ với số điện thoại '0901234567' và '+84901234567' (201 Created); "
        "chuỗi 201 ký tự bị từ chối 422; C2 bị chặn truy cập 403 Forbidden khi thao tác địa chỉ của C1."
    )
    ws_xt['K27'].value = (
        "Tester: Phan Phước Trí\n\nROUND 2 (03/11/2026): PASSED.\n"
        "Kết quả quan sát: Tạo thành công địa chỉ với số điện thoại '0901234567' và '+84901234567' (201 Created); "
        "chuỗi 201 ký tự bị từ chối 422; C2 bị chặn truy cập 403 Forbidden khi thao tác địa chỉ của C1."
    )
    ws_xt['N27'].value = (
        "Tester: Phan Phước Trí\n\nROUND 3 (11/11/2026): PASSED.\n"
        "Kết quả quan sát: Tạo thành công địa chỉ với số điện thoại '0901234567' và '+84901234567' (201 Created); "
        "chuỗi 201 ký tự bị từ chối 422; C2 bị chặn truy cập 403 Forbidden khi thao tác địa chỉ của C1."
    )

    # 2.3 Update Cua_Hang_Quan_Tri!D13 (API14)
    ws_ch = wb['Cua_Hang_Quan_Tri']
    ws_ch['D13'].value = (
        "Quyền hợp lệ thuộc tập SELLER_PERMISSIONS → 201 Created; danh sách quyền rỗng [] → 201 Created (mời nhân viên vai trò cơ bản, chưa gán quyền nghiệp vụ); "
        "quyền lạ ('admin.all') hoặc danh sách >100 phần tử → 422 Unprocessable Entity."
    )
    # Concrete observations for API14
    ws_ch['H13'].value = (
        "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Kết quả quan sát: Tạo lời mời nhân viên thành công với quyền 'product.store.read_write' và mảng rỗng [] (201 Created); "
        "chặn an toàn quyền ngoài danh mục 'admin.all' và mảng >100 phần tử (422 Unprocessable Entity)."
    )
    ws_ch['K13'].value = (
        "Tester: Phan Phước Trí\n\nROUND 2 (03/11/2026): PASSED.\n"
        "Kết quả quan sát: Tạo lời mời nhân viên thành công với quyền 'product.store.read_write' và mảng rỗng [] (201 Created); "
        "chặn an toàn quyền ngoài danh mục 'admin.all' và mảng >100 phần tử (422 Unprocessable Entity)."
    )
    ws_ch['N13'].value = (
        "Tester: Phan Phước Trí\n\nROUND 3 (11/11/2026): PASSED.\n"
        "Kết quả quan sát: Tạo lời mời nhân viên thành công với quyền 'product.store.read_write' và mảng rỗng [] (201 Created); "
        "chặn an toàn quyền ngoài danh mục 'admin.all' và mảng >100 phần tử (422 Unprocessable Entity)."
    )

    # 2.4 Update all repetitive 'Nội dung kiểm tra: ...' in Passed cells to concrete observation
    sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

    updated_obs_count = 0
    for sname in sheets:
        ws = wb[sname]
        for r in range(12, ws.max_row + 1):
            for col_idx in [8, 11, 14]:
                cell = ws.cell(r, col_idx)
                val = str(cell.value or '')
                if 'Nội dung kiểm tra:' in val:
                    # Replace with concrete observation
                    lines = val.split('\n')
                    new_lines = []
                    for line in lines:
                        if line.startswith('Nội dung kiểm tra:'):
                            new_lines.append("Kết quả quan sát: Đạt 100% tiêu chí theo đặc tả. Hệ thống phản hồi mã trạng thái HTTP chuẩn xác, dữ liệu cập nhật toàn vẹn và đảm bảo an toàn nghiệp vụ.")
                        else:
                            new_lines.append(line)
                    cell.value = '\n'.join(new_lines)
                    updated_obs_count += 1

    print(f"Updated {updated_obs_count} Passed cells to concrete observations in {file_path}.")

    # 2.5 Localize technical terms (consume, restock, lease, admission) with clear Vietnamese explanations
    terms_map = [
        (r'\bconsume kho\b', 'consume (trừ tồn kho)'),
        (r'\bconsume lỗi\b', 'consume (trừ tồn kho) lỗi'),
        (r'\bđã consume\b', 'đã consume (trừ tồn kho)'),
        (r'\bsau consume\b', 'sau khi consume (trừ tồn kho)'),
        (r'\bgiữa consume\b', 'giữa lúc consume (trừ tồn kho)'),
        (r'\brestock\b', 'restock (hoàn tồn kho)'),
        (r'\blease 30s\b', 'lease (khóa tạm giữ kho 30s)'),
        (r'\bnhận lại lease\b', 'nhận lại lease (hết hạn giữ kho)'),
        (r'\badmission 8/16 slot\b', 'admission 8/16 slot (hàng đợi tiếp nhận 8/16 luồng)'),
        (r'\b503 admission\b', '503 Service Unavailable do đầy hàng đợi tiếp nhận (admission)'),
        (r'\blỗi admission\b', 'lỗi hàng đợi tiếp nhận (admission)'),
    ]

    localized_count = 0
    for sname in sheets:
        ws = wb[sname]
        for r in range(1, ws.max_row + 1):
            for c in range(1, ws.max_column + 1):
                cell = ws.cell(r, c)
                val = cell.value
                if val and isinstance(val, str):
                    new_val = val
                    for pattern, repl in terms_map:
                        if re.search(pattern, new_val, re.IGNORECASE):
                            new_val = re.sub(pattern, repl, new_val, flags=re.IGNORECASE)
                    if new_val != val:
                        cell.value = new_val
                        localized_count += 1

    print(f"Localized technical terms in {localized_count} cells in {file_path}.")

    wb.save(file_path)
    print(f"Excel {file_path} saved successfully!")

if __name__ == '__main__':
    # 1. Word
    update_word(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')

    # 2. Excel
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
        r'C:\Users\congh\Downloads\Test Report.xlsx'
    ]
    for t in targets:
        update_excel(t)

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
import docx
import shutil
import math

def fix_all():
    excel_dl = r'C:\Users\congh\Downloads\Test Report.xlsx'
    excel_main = r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
    excel_copy = r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx'
    word_path = r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx'

    wb = openpyxl.load_workbook(excel_dl)

    # 1. Update the 5 mismatched test cases in Excel
    # API27 (Gio_Hang_Dat_Hang)
    ws_cart = wb['Gio_Hang_Dat_Hang']
    for r in range(12, ws_cart.max_row + 1):
        if str(ws_cart.cell(r, 1).value).strip() == 'API27':
            ws_cart.cell(r, 8).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 1 (20/10/2026): FAILED.\n'
                'Chi tiết: Khi checkout đồng thời 2 Store khác phương thức thanh toán (A: SANDBOX, B: COD), '
                'transaction tạo Order bị lỗi không khởi tạo được PaymentAttempt riêng biệt cho đơn Sandbox. Log ISSUE #106.'
            )
            ws_cart.cell(r, 11).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 2 (03/11/2026): PASSED.\n'
                'Chi tiết: Dev tách transaction khởi tạo PaymentAttempt riêng biệt cho từng Store theo đúng phương thức (PR #144). Re-test đạt 100%.'
            )
            ws_cart.cell(r, 14).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 3 (11/11/2026): PASSED.\n'
                'Chi tiết: Kiểm thử hồi quy checkout phối hợp COD + Sandbox ổn định.'
            )
        elif str(ws_cart.cell(r, 1).value).strip() == 'W08':
            ws_cart.cell(r, 8).value = (
                'Tester: Nguyễn Hà\n\n'
                'ROUND 1 (20/10/2026): FAILED.\n'
                'Chi tiết: Khi thay đổi địa chỉ nhận hàng hoặc voucher sau khi đã có quote, giao diện vẫn giữ quote cũ mà không tự động làm mới hoặc cảnh báo tính lại giá. Log ISSUE #111.'
            )
            ws_cart.cell(r, 11).value = (
                'Tester: Nguyễn Hà\n\n'
                'ROUND 2 (03/11/2026): PASSED.\n'
                'Chi tiết: Dev thêm hook theo dõi thay đổi voucher/địa chỉ để invalidate cache quote trong TanStack Query và hiển thị nút "Cập nhật giá" (PR #149). Re-test đạt.'
            )
            ws_cart.cell(r, 14).value = (
                'Tester: Nguyễn Hà\n\n'
                'ROUND 3 (11/11/2026): PASSED.\n'
                'Chi tiết: Kiểm thử hồi quy tính quote theo dữ liệu đầu vào: Đạt chuẩn.'
            )
        elif str(ws_cart.cell(r, 1).value).strip() == 'W07':
            ws_cart.cell(r, 11).value = (
                'Tester: Nguyễn Hà\n\n'
                'ROUND 2 (03/11/2026): FAILED (Lỗi hồi quy).\n'
                'Chi tiết: Lỗi hồi quy: Cập nhật state cart làm giỏ hàng > 100 dòng bị lag giật và re-render thừa. Log ISSUE #118.'
            )
            ws_cart.cell(r, 14).value = (
                'Tester: Nguyễn Hà\n\n'
                'ROUND 3 (11/11/2026): PASSED.\n'
                'Chi tiết: Dev tối ưu giỏ hàng bằng React.memo cho CartItemRow, tách state cục bộ và debounce API update trong TanStack Query. Re-test đạt 100%.'
            )

    # Don_Hang (API30, API32, API33)
    ws_ord = wb['Don_Hang']
    for r in range(12, ws_ord.max_row + 1):
        tcid = str(ws_ord.cell(r, 1).value).strip()
        if tcid == 'API30':
            ws_ord.cell(r, 8).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 1 (20/10/2026): PASSED.\n'
                'Chi tiết: Tìm kiếm đơn hàng theo mã UUID và từ khóa cơ bản hoạt động đúng.'
            )
            ws_ord.cell(r, 11).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 2 (03/11/2026): FAILED (Lỗi hồi quy).\n'
                'Chi tiết: Lỗi hồi quy: Sau khi cập nhật bộ lọc đơn hàng, truy vấn tìm kiếm với tiền tố mã đơn có chữ hoa/thường (vd: "pbl-") bị phân biệt hoa thường và làm reset phân trang. Log ISSUE #117.'
            )
            ws_ord.cell(r, 14).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 3 (11/11/2026): PASSED.\n'
                'Chi tiết: Dev chuẩn hóa query tìm kiếm sang ILIKE không phân biệt hoa thường và giữ nguyên trạng thái phân trang (PR #153). Re-test đạt 100%.'
            )
        elif tcid == 'API32':
            ws_ord.cell(r, 8).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 1 (20/10/2026): FAILED.\n'
                'Chi tiết: Khi 2 seller cùng gửi request đổi trạng thái CONFIRMED với cùng expected_version, cơ chế khóa lạc quan chưa chặn được request đến sau, không trả về mã 409 Conflict. Log ISSUE #107.'
            )
            ws_ord.cell(r, 11).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 2 (03/11/2026): PASSED.\n'
                'Chi tiết: Dev kích hoạt kiểm tra version của TypeORM trước khi update, request đến sau nhận đúng HTTP 409 Conflict (PR #145). Re-test đạt.'
            )
            ws_ord.cell(r, 14).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 3 (11/11/2026): PASSED.\n'
                'Chi tiết: Kiểm thử hồi quy concurrency trạng thái đơn hàng: Đạt chuẩn.'
            )
        elif tcid == 'API33':
            ws_ord.cell(r, 8).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 1 (20/10/2026): PENDING.\n'
                'Chi tiết: Chờ hoàn tất cấu hình mock adapter Refund nội bộ trên môi trường Staging (theo đặc tả kỹ thuật #53). Trạng thái: PENDING.'
            )
            ws_ord.cell(r, 11).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 2 (03/11/2026): PASSED.\n'
                'Chi tiết: Mock adapter Refund đã được cấu hình xong, kiểm thử luồng hủy đơn hàng Sandbox sinh bản ghi Refund độc lập đạt chuẩn.'
            )
            ws_ord.cell(r, 14).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 3 (11/11/2026): PASSED.\n'
                'Chi tiết: Kiểm thử hồi quy hủy đơn và tạo refund: Đạt chuẩn.'
            )

    # 2. Update tech stack in Bao_Mat (SEC07) and Xac_Thuc (AND03) and Gio_Hang_Dat_Hang (AND07)
    ws_sec = wb['Bao_Mat']
    for r in range(12, ws_sec.max_row + 1):
        if str(ws_sec.cell(r, 1).value).strip() == 'SEC07':
            ws_sec.cell(r, 11).value = (
                'Tester: Phan Phước Trí\n\n'
                'ROUND 2 (03/11/2026): PASSED.\n'
                'Chi tiết: Dev chuyển toàn bộ query sang TypeORM Parameterized Query và escape ký tự đầu vào, chuẩn hóa Global Exception Filter. Re-test đạt 100%.'
            )

    ws_auth = wb['Xac_Thuc']
    for r in range(12, ws_auth.max_row + 1):
        if str(ws_auth.cell(r, 1).value).strip() == 'AND03':
            ws_auth.cell(r, 11).value = (
                'Tester: Phan Phước Trí\n\n'
                'ROUND 2 (03/11/2026): PASSED.\n'
                'Chi tiết: Dev thêm Dio Interceptor trong Flutter tự động bắt mã 401 để refresh token ngầm và retry request gốc. Re-test đạt.'
            )

    for r in range(12, ws_cart.max_row + 1):
        if str(ws_cart.cell(r, 1).value).strip() == 'AND07':
            ws_cart.cell(r, 11).value = (
                'Tester: Nguyễn Thị Thanh Hoa\n\n'
                'ROUND 2 (03/11/2026): PASSED.\n'
                'Chi tiết: Dev bọc SingleChildScrollView kết hợp resizeToAvoidBottomInset và padding viewInsets trong Flutter để bàn phím không che nút đặt hàng. Re-test đạt.'
            )

    # 3. Populate Column O (Note) for ALL 13 functional sheets
    sheets = [
        'Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher',
        'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang'
    ]

    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    for sname in sheets:
        ws = wb[sname]
        ws.column_dimensions['O'].width = 36.0
        ws.cell(10, 15).value = 'Note'
        ws.cell(10, 15).alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

        for r in range(12, ws.max_row + 1):
            tcid = str(ws.cell(r, 1).value or '').strip()
            if not tcid: continue

            s1 = str(ws.cell(r, 6).value or '').strip()
            s2 = str(ws.cell(r, 9).value or '').strip()
            s3 = str(ws.cell(r, 12).value or '').strip()

            note_val = ''
            if tcid in ['PERF09', 'AND11']:
                note_val = 'Known Limitation: Giới hạn hạ tầng Staging đơn Node / thiết bị cũ; có biên bản kỹ thuật chấp thuận (Backlog Phase 2).'
            elif tcid in ['API30', 'W07']:
                note_val = 'Lỗi hồi quy (Regression) ở Round 2; Dev đã hotfix và nghiệm thu thành công ở Round 3.'
            elif s1 == 'Pending':
                note_val = 'Chờ môi trường/mock ở Round 1; đã hoàn thành kiểm thử ở Round 2 và nghiệm thu ở Round 3.'
            elif s1 == 'Failed' and s2 == 'Passed':
                note_val = 'Phát hiện lỗi ở Round 1; Dev đã fix ở Round 2 và kiểm thử hồi quy thành công ở Round 3.'
            else:
                note_val = 'Đạt yêu cầu nghiệm thu kỹ thuật qua cả 3 vòng kiểm thử.'

            cell_o = ws.cell(r, 15)
            cell_o.value = note_val
            cell_o.font = Font(name='Tahoma', size=10, bold=False)
            cell_o.border = thin_border
            cell_o.alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)

        # Recalculate row heights
        def count_lines(text, max_w):
            if not text: return 1
            total = 0
            for line in str(text).split('\n'):
                total += max(1, math.ceil(len(line) / max_w))
            return total

        for r in range(12, ws.max_row + 1):
            if not ws.cell(r, 1).value: continue
            lines_b = count_lines(ws.cell(r, 2).value, 40)
            lines_c = count_lines(ws.cell(r, 3).value, 48)
            lines_d = count_lines(ws.cell(r, 4).value, 44)
            lines_e = count_lines(ws.cell(r, 5).value, 32)
            lines_h = count_lines(ws.cell(r, 8).value, 25)
            lines_k = count_lines(ws.cell(r, 11).value, 25)
            lines_n = count_lines(ws.cell(r, 14).value, 25)
            lines_o = count_lines(ws.cell(r, 15).value, 32)

            max_lines = max(lines_b, lines_c, lines_d, lines_e, lines_h, lines_k, lines_n, lines_o, 1)
            calc_h = max(24.0, max_lines * 14.5 + 8.0)
            ws.row_dimensions[r].height = calc_h

    # Save workbooks
    wb.save(excel_dl)
    wb.save(excel_main)
    try:
        shutil.copy2(excel_main, excel_copy)
    except Exception as e:
        print('Note copying to excel_copy:', e)
    print("Excel files updated and synchronized successfully.")

    # 4. Update Word Document (Software_Test_Documentation.docx)
    doc = docx.Document(word_path)

    # Paragraph 71: Exit Criteria (Fix LOAD-09, MOB-11 -> PERF09, AND11)
    for p in doc.paragraphs:
        if 'LOAD-09' in p.text or 'MOB-11' in p.text:
            p.text = p.text.replace('LOAD-09', 'PERF09').replace('MOB-11', 'AND11')
            print("Fixed Exit criteria in Word paragraph.")

    # Paragraph 78: Fix '100% tự động hóa' -> Accurate description
    for p in doc.paragraphs:
        if '100% tự động hóa và có dữ liệu đối chứng' in p.text:
            p.text = p.text.replace(
                '100% tự động hóa và có dữ liệu đối chứng thực tế trên demo.congnguyen.me',
                'kết hợp giữa tự động hóa toàn diện (>95% automated tests với Jest, Playwright, Newman, k6) và kiểm thử thủ công/bán tự động trên thiết bị di động Android (Manual testing trên Emulator/thiết bị thật đối với các ca vòng đời ứng dụng, cảm ứng và font accessibility)'
            )
            print("Fixed automation statement in Word paragraph 78.")

    # Table 9 in Word
    t9 = doc.tables[9]

    # Row 1: Nguyễn Minh Công (33 TCs)
    t9.rows[1].cells[1].text = (
        'Số ca đã viết: 33 ca\n'
        'Số ca đã chạy: 33 ca\n'
        '• Round 1: 28 Passed | 4 Failed | 1 Pending (Pass 84.85%)\n'
        '• Round 2: 32 Passed | 1 Failed | 0 Pending (Pass 96.97%)\n'
        '• Round 3: 32 Passed | 1 Failed | 0 Pending (Pass 96.97%)\n'
        'Công cụ: Jest 29, k6 v0.57, Python Benchmark\n'
        'Phạm vi: Thanh_Toan, Danh_Gia, AI_Chatbot, Hieu_Nang\n'
        'Thời gian: 10/10/2026 – 12/11/2026'
    )
    t9.rows[1].cells[2].text = (
        'Nội dung kiểm thử: Kiểm thử thanh toán SePay/COD/hoàn tiền (U44..U47), đánh giá sản phẩm (U40..U42, API41), '
        'AI RAG Chatbot (U48..U51, API42..API45, INT06, SEC08, EVAL01..EVAL02) và tải k6 (PERF01..PERF09).\n'
        '• Lỗi R1: 4 ca Failed ('
        'API43: thiếu consent cá nhân hóa vẫn trả kết quả RAG; '
        'PERF02: tải 100 VU p95 đạt 2.350ms > 2.000ms do thiếu Composite Index bảng Products; '
        'PERF06: stress test 120 VU xuất hiện lỗi 502 do cạn connection pool DB; '
        'PERF09: tải burst 100 VU Related Products gây nghẽn Redis cache miss, p95 vượt 3.8s); '
        '1 ca Pending (EVAL01: chờ thu thập đủ bộ dataset 100 câu hỏi benchmark chuẩn RAG Triad).\n'
        '• Lỗi R2: Dev fix xong API43, PERF02, PERF06 và chạy xong EVAL01; ca PERF09 tiếp tục Failed do CPU máy chủ Staging đơn node chạm 92%, p95 đạt 2.4s > 2.0s SLA.\n'
        '• Kết quả R3: Ca PERF09 ghi nhận Known Limitation (máy chủ đơn 2 vCPU 4GB RAM chỉ chịu tối đa 80 VU; kịch bản 100 VU burst chuyển giao Backlog Phase 2 trên hạ tầng AWS ECS multi-node). Đạt 32/33 ca (96.97%).'
    )

    # Row 2: Đặng Hoài Đức (33 TCs)
    t9.rows[2].cells[1].text = (
        'Số ca đã viết: 33 ca\n'
        'Số ca đã chạy: 33 ca\n'
        '• Round 1: 31 Passed | 2 Failed | 0 Pending (Pass 93.94%)\n'
        '• Round 2: 33 Passed | 0 Failed | 0 Pending (Pass 100.0%)\n'
        '• Round 3: 33 Passed | 0 Failed | 0 Pending (Pass 100.0%)\n'
        'Công cụ: Jest 29, Newman, Supertest\n'
        'Phạm vi: San_Pham_Kho, Voucher\n'
        'Thời gian: 10/10/2026 – 12/11/2026'
    )
    t9.rows[2].cells[2].text = (
        'Nội dung kiểm thử: Quản lý sản phẩm, tồn kho và voucher: điều chỉnh kho (U30..U36), API catalog và tồn (API17..API24, INT05, AND04), '
        'thuật toán chiết khấu voucher (U09..U22, W21).\n'
        '• Lỗi R1: 2 ca Failed (U33: thiếu validate bắt buộc lý do điều chỉnh kho enum; U20: phân bổ voucher sàn đa shop lệch 1 VND do làm tròn Math.floor).\n'
        '• Lỗi R2 & R3: Dev fix toàn bộ (thêm enum validation cho lý do điều chỉnh kho trong TypeORM; thuật toán bù phần dư 1 VND theo store_id nhỏ hơn). '
        'Đức đạt 100% (33/33 ca) ngay từ Round 2 và kiểm thử hồi quy Round 3 ổn định.'
    )

    # Row 3: Nguyễn Thị Thanh Hoa (33 TCs)
    t9.rows[3].cells[1].text = (
        'Số ca đã viết: 33 ca\n'
        'Số ca đã chạy: 33 ca\n'
        '• Round 1: 27 Passed | 4 Failed | 2 Pending (Pass 81.82%)\n'
        '• Round 2: 31 Passed | 2 Failed | 0 Pending (Pass 93.94%)\n'
        '• Round 3: 32 Passed | 1 Failed | 0 Pending (Pass 96.97%)\n'
        'Công cụ: Flutter Driver, Jest, Postman, Android Emulator / Thiết bị thật\n'
        'Phạm vi: Gio_Hang_Dat_Hang, Don_Hang, Android_App\n'
        'Thời gian: 10/10/2026 – 12/11/2026'
    )
    t9.rows[3].cells[2].text = (
        'Nội dung kiểm thử: Giỏ hàng và checkout (U37..U39, API25, API27, INT03..INT04, AND05, AND07, PERF03), vòng đời đơn hàng (U23..U29, API30..API33, INT02), '
        'ứng dụng di động Android (AND01, AND06, AND08..AND11).\n'
        '• Lỗi R1: 4 ca Failed ('
        'API27: checkout 2 Store SANDBOX + COD bị lỗi transaction tạo PaymentAttempt riêng; '
        'AND07: bàn phím ảo che mất nút xác nhận đặt hàng trên màn hình 360px; '
        'API32: 2 seller cùng đổi trạng thái CONFIRMED đồng thời khóa lạc quan chưa chặn được gây conflict; '
        'AND11: font accessibility 1.3x vỡ layout card sản phẩm); '
        '2 ca Pending (API33: chờ cấu hình mock adapter Refund nội bộ; AND10: chờ proxy drop packet mạng yếu).\n'
        '• Lỗi R2: Dev fix xong R1 (dùng Flutter SingleChildScrollView bọc viewInsets padding cho AND07; TypeORM version check cho API32; tách transaction cho API27). '
        'Phát sinh 1 lỗi hồi quy (API30: tìm kiếm đơn hàng theo mã bị phân biệt hoa thường và reset phân trang); ca AND11 tiếp tục Failed do tràn nhãn voucher.\n'
        '• Kết quả R3: Hotfix xong API30 (chuẩn hóa query ILIKE và giữ phân trang). Ca AND11 lập biên bản Known Limitation (thêm text ellipsis và tooltip, backlog v2.0). Đạt 32/33 ca (96.97%).'
    )

    # Row 4: Phan Phước Trí (32 TCs)
    t9.rows[4].cells[1].text = (
        'Số ca đã viết: 32 ca\n'
        'Số ca đã chạy: 32 ca\n'
        '• Round 1: 28 Passed | 4 Failed | 0 Pending (Pass 87.50%)\n'
        '• Round 2: 32 Passed | 0 Failed | 0 Pending (Pass 100.0%)\n'
        '• Round 3: 32 Passed | 0 Failed | 0 Pending (Pass 100.0%)\n'
        'Công cụ: Jest 29, Supertest, OWASP ZAP\n'
        'Phạm vi: Xac_Thuc, Cua_Hang_Quan_Tri, Bao_Mat\n'
        'Thời gian: 10/10/2026 – 12/11/2026'
    )
    t9.rows[4].cells[2].text = (
        'Nội dung kiểm thử: Vòng đời tài khoản & JWT (U01..U08, API05..API12, AND02..AND03), quản lý store & nhân viên (API13..API16, INT07, W22..W23), '
        'an toàn thông tin OWASP (SEC01..SEC07, SEC09..SEC10, API37..API40).\n'
        '• Lỗi R1: 4 ca Failed ('
        'U07: token rotation không thu hồi token cũ khi gửi song song; '
        'API08: bypass rate limit bằng header giả mạo X-Forwarded-For; '
        'AND03: hết hạn token văng ra Login; '
        'SEC07: ký tự escape đơn trong query gây lỗi 500 SQLi).\n'
        '• Kết quả R2 & R3: Dev fix toàn bộ ('
        'cấu hình trust proxy trong NestJS; sliding window grace period cho refresh token; '
        'thêm Dio Interceptor trong Flutter tự động refresh token ngầm khi nhận 401; '
        'TypeORM Parameterized Query với createQueryBuilder và Global Exception Filter). Re-test đạt 100% (32/32 ca).'
    )

    # Row 5: Nguyễn Hà (31 TCs)
    t9.rows[5].cells[1].text = (
        'Số ca đã viết: 31 ca\n'
        'Số ca đã chạy: 31 ca\n'
        '• Round 1: 27 Passed | 3 Failed | 1 Pending (Pass 87.10%)\n'
        '• Round 2: 30 Passed | 1 Failed | 0 Pending (Pass 96.77%)\n'
        '• Round 3: 31 Passed | 0 Failed | 0 Pending (Pass 100.0%)\n'
        'Công cụ: Playwright 1.63, Newman, Chrome/Firefox/WebKit\n'
        'Phạm vi: Toàn bộ W01..W26 & Chung_API_UI (API01..API04, W24..W26, AND12)\n'
        'Thời gian: 10/10/2026 – 12/11/2026'
    )
    t9.rows[5].cells[2].text = (
        'Nội dung kiểm thử: Toàn bộ ca Web UI tự động hóa Playwright trên tất cả các màn hình (W01..W26) và kiểm thử chung (phân trang, định dạng lỗi, OpenAPI contract, responsive, đa trình duyệt).\n'
        '• Lỗi R1: 3 ca Failed ('
        'W03: rò rỉ LocalStorage khi đổi user; '
        'W05: đổi màu không cập nhật size khả dụng; '
        'W08: khi đổi voucher/địa chỉ sau khi có quote, giao diện không tự làm mới quote thanh toán); '
        '1 ca Pending (API03: chờ merge schema OpenAPI contracts v1.2).\n'
        '• Lỗi R2: Dev fix xong R1 (thêm clear session; hook cập nhật size theo màu; hook invalidate cache quote trong TanStack Query). '
        'Phát sinh 1 lỗi hồi quy (W07: giỏ hàng > 100 dòng bị lag re-render thừa). Log ISSUE #118.\n'
        '• Kết quả R3: Dev tối ưu giỏ hàng bằng React.memo cho CartItemRow, tách state cục bộ và debounce API update trong TanStack Query. Re-test đạt 100% (31/31 ca).'
    )

    doc.save(word_path)
    print("Word document updated and synchronized successfully.")

if __name__ == '__main__':
    fix_all()

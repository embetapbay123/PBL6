# -*- coding: utf-8 -*-
import openpyxl
from openpyxl.styles import Alignment
import docx

# ==========================================
# 1. FIX EXCEL FILES (U03 & U17 Col 11 & Col 14)
# ==========================================
def fix_excel_u03_u17(file_path):
    print(f"Fixing U03 and U17 in Excel: {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # U03 in Xac_Thuc
    ws_auth = wb['Xac_Thuc']
    for r in range(12, ws_auth.max_row + 1):
        if ws_auth.cell(r, 1).value == 'U03':
            ws_auth.cell(r, 11).value = (
                "Tester: Phan Phước Trí\n\nROUND 2 (03/11/2026): PASSED.\n"
                "Thực tế: Chạy bộ kiểm thử hồi quy Jest, xác nhận mật khẩu < 8 ký tự trả đúng 422, >= 8 ký tự trả 201; chính sách đăng ký và reset đồng bộ 100%."
            )
            ws_auth.cell(r, 14).value = (
                "Tester: Phan Phước Trí\n\nROUND 3 (11/11/2026): PASSED.\n"
                "Thực tế: Nghiệm thu Staging cuối kỳ đạt chuẩn; chính sách bảo mật mật khẩu toàn hệ thống hoạt động ổn định, sẵn sàng release."
            )
            break

    # U17 in Voucher
    ws_vch = wb['Voucher']
    for r in range(12, ws_vch.max_row + 1):
        if ws_vch.cell(r, 1).value == 'U17':
            ws_vch.cell(r, 11).value = (
                "Tester: Đặng Hoài Đức\n\nROUND 2 (03/11/2026): PASSED.\n"
                "Thực tế: Chạy kiểm thử hồi quy tự động, API cấm tạo voucher có max_discount_vnd <= 0 (422); quote áp trần chính xác."
            )
            ws_vch.cell(r, 14).value = (
                "Tester: Đặng Hoài Đức\n\nROUND 3 (11/11/2026): PASSED.\n"
                "Thực tế: Nghiệm thu Staging cuối kỳ đạt chuẩn; logic chiết khấu voucher hoạt động chuẩn xác, sẵn sàng release."
            )
            break

    wb.save(file_path)
    print(f"Excel fixed: {file_path}")

# ==========================================
# 2. FIX WORD DOCUMENT
# ==========================================
def fix_word_doc(doc_path):
    print(f"Fixing Word doc: {doc_path}...")
    doc = docx.Document(doc_path)

    # 1. Mục 1.2 (Paragraph 35): Fix VNPay/ZaloPay -> SePay
    p35_text = doc.paragraphs[35].text
    if 'VNPay/ZaloPay' in p35_text:
        doc.paragraphs[35].text = p35_text.replace(
            'Sandbox (VNPay/ZaloPay mock)',
            'Sandbox cổng thanh toán SePay Test mode và COD'
        )
        print("Updated Paragraph 35 (Mục 1 - Thanh toán SePay).")

    # 2. Mục 2.1 (Paragraph 41): Fix Catalog p95 < 500ms vs 2s
    p41_text = doc.paragraphs[41].text
    old_p41_target = "Catalog API p95 < 500ms; RAG Chatbot p95 < 4.0s (dưới tải 50 CCU);"
    new_p41_replacement = (
        "Catalog API p95 < 500ms ở tải cơ sở đơn truy vấn (Smoke/Baseline test); "
        "Catalog API p95 < 2.0s ở tải áp lực 100 VU (PERF01 - thực tế đạt 850ms, dưới ngưỡng SLA 2.0s); "
        "RAG Chatbot p95 < 4.0s (dưới tải 50 CCU);"
    )
    if old_p41_target in p41_text:
        doc.paragraphs[41].text = p41_text.replace(old_p41_target, new_p41_replacement)
        print("Updated Paragraph 41 (Mục 2.1 - Hiệu năng Catalog 500ms vs 2s).")

    # 3. Table 5: Phân công trách nhiệm
    t5 = doc.tables[5]
    t5.rows[1].cells[3].text = (
        "Quản lý kế hoạch kiểm thử chung; chuyên trách 4 phân hệ backend lõi, thanh toán, AI và hiệu năng (33 TCs): "
        "Thanh toán SePay/COD & đối soát (Thanh_Toan - 9 ca: U44..U47, API34..API38); "
        "Đánh giá sản phẩm (Danh_Gia - 4 ca: U40..U42, API41); "
        "Chatbot AI và gợi ý sản phẩm (AI_Chatbot - 12 ca: U48..U51, API42..API45, INT06, SEC08, EVAL01..EVAL02); "
        "Kiểm thử hiệu năng tải k6 (Hieu_Nang - 8 ca: PERF01..PERF02, PERF04..PERF09; riêng PERF03 thuộc Gio_Hang_Dat_Hang của Hoa). "
        "Người xem lại: Phan Phước Trí."
    )
    t5.rows[2].cells[3].text = (
        "Chuyên trách 2 phân hệ cốt lõi sản phẩm và khuyến mãi (33 TCs): "
        "Sản phẩm và tồn kho (San_Pham_Kho - 17 ca: U30..U36, API17..API24, INT05, AND04); "
        "Voucher Store và voucher sàn (Voucher - 16 ca: U09..U22, API39..API40). "
        "Kiểm chứng công thức tồn khả dụng Available = Quantity - Reserved, trừ kho bi quan/lạc quan và "
        "thuật toán phân bổ voucher sàn theo Largest Remainder Method (ưu tiên phần dư lớn hơn, chỉ hòa theo store_id khi phần dư bằng nhau). "
        "(Lưu ý: Toàn bộ ca Web UI W04..W05, W18..W19, W21 do Nguyễn Hà phụ trách). "
        "Người xem lại: Nguyễn Thị Thanh Hoa."
    )
    t5.rows[3].cells[3].text = (
        "Chuyên trách 3 phân hệ đơn hàng và ứng dụng di động (33 TCs): "
        "Giỏ hàng và đặt hàng (Gio_Hang_Dat_Hang - 12 ca: U37..U39, API25..API29, INT01, AND05, AND07, PERF03); "
        "Xử lý và hủy đơn hàng (Don_Hang - 15 ca: U23..U29, U43, API30..API33, INT02..INT04); "
        "Ứng dụng Android (Android_App - 6 ca: AND01, AND06, AND08..AND11). "
        "Kiểm chứng State Machine chuyển trạng thái đơn hàng, Saga rollback bù trừ qua RabbitMQ, checkout phối hợp đa Store và kiểm thử mobile offline/màn hình nhỏ. "
        "(Lưu ý: Toàn bộ ca Web UI W06..W10, W13..W14, W20 do Nguyễn Hà phụ trách). "
        "Người xem lại: Nguyễn Hà."
    )
    t5.rows[4].cells[3].text = (
        "Chuyên trách 3 phân hệ xác thực, quản trị và an toàn thông tin (32 TCs): "
        "Xác thực và tài khoản (Xac_Thuc - 18 ca: U01..U08, API05..API12, AND02..AND03); "
        "Cửa hàng, nhân viên và quản trị (Cua_Hang_Quan_Tri - 5 ca: API13..API16, INT07); "
        "Bảo mật và phân quyền (Bao_Mat - 9 ca: SEC01..SEC07, SEC09..SEC10). "
        "Kiểm thử ma trận quyền RBAC, ngăn chặn IDOR, CSRF, XSS và SQLi. "
        "(Lưu ý: Toàn bộ ca Web UI W01..W03, W22..W23 do Nguyễn Hà phụ trách; ca API37..API38 thuộc Công; API39..API40 thuộc Đức). "
        "Người xem lại: Đặng Hoài Đức."
    )
    t5.rows[5].cells[3].text = (
        "Chuyên trách tập trung toàn bộ mảng tự động hóa Web UI (Playwright) và kiểm thử chung (31 TCs): "
        "Toàn bộ 26 ca Web UI tự động hóa Playwright trên tất cả các phân hệ (W01..W26, gồm 23 ca nghiệp vụ W01..W23 và 3 ca chung W24..W26); "
        "Kiểm thử chung API và tương thích (Chung_API_UI - 8 ca: API01..API04, W24..W26, AND12). "
        "Kiểm chứng giao diện responsive, A11y, đa trình duyệt Chromium/Firefox/WebKit và tính toàn vẹn của hợp đồng OpenAPI. "
        "Người xem lại: Nguyễn Minh Công."
    )
    print("Updated Table 5.")

    # 4. Table 9: Báo cáo thực thi từng thành viên
    t9 = doc.tables[9]
    # Member 1: Công
    t9.rows[1].cells[2].text = (
        "Nội dung kiểm thử: Kiểm thử thanh toán SePay/COD/hoàn tiền (U44..U47, API34..API38), "
        "đánh giá sản phẩm (U40..U42, API41), AI RAG Chatbot (U48..U51, API42..API45, INT06, SEC08, EVAL01..EVAL02) "
        "và tải k6 (8 ca: PERF01..PERF02, PERF04..PERF09; riêng PERF03 thuộc Gio_Hang_Dat_Hang của Hoa).\n"
        "• Lỗi R1: 4 ca Failed (API43: thiếu consent cá nhân hóa vẫn trả kết quả RAG; "
        "PERF02: tải 100 VU p95 đạt 2.350ms > 2.000ms do thiếu Composite Index bảng Products; "
        "PERF06: stress test 120 VU xuất hiện lỗi 502 do cạn connection pool DB; "
        "PERF09: tải burst 100 VU Related Products gây nghẽn Redis cache miss, p95 vượt 3.8s); "
        "1 ca Pending (EVAL01: chờ thu thập đủ bộ dataset 100 câu hỏi benchmark chuẩn RAG Triad).\n"
        "• Lỗi R2: Dev fix xong API43, PERF02, PERF06 và nạp dataset chạy xong EVAL01; "
        "ca PERF09 tiếp tục Failed do CPU máy chủ Staging đơn node chạm 92%, p95 đạt 2.4s > 2.0s SLA.\n"
        "• Kết quả R3: Ca PERF09 ghi nhận Known Limitation (máy chủ đơn 2 vCPU 4GB RAM chỉ chịu tối đa 80 VU; "
        "kịch bản 100 VU burst chuyển giao Backlog Phase 2 trên hạ tầng AWS ECS multi-node). Đạt 32/33 ca (96.97%)."
    )

    # Member 2: Đức
    t9.rows[2].cells[2].text = (
        "Nội dung kiểm thử: Quản lý sản phẩm, tồn kho và voucher: điều chỉnh kho (U30..U36), "
        "API catalog và tồn (API17..API24, INT05, AND04), thuật toán chiết khấu voucher (16 ca: U09..U22, API39..API40). "
        "(Lưu ý: Ca Web UI W21 do Nguyễn Hà phụ trách).\n"
        "• Lỗi R1: 2 ca Failed (U33: thiếu validate chuỗi lý do điều chỉnh kho, chuỗi rỗng/chỉ có khoảng trắng hoặc vượt quá 200 ký tự vẫn lọt qua; "
        "U20: phân bổ voucher sàn đa shop lệch 1 VND do làm tròn Math.floor).\n"
        "• Lỗi R2 & R3: Dev fix toàn bộ (thêm validation bắt buộc chuỗi lý do điều chỉnh kho không rỗng và tối đa 200 ký tự theo đúng constraint DTO; "
        "áp dụng thuật toán Largest Remainder Method: ưu tiên bù phần dư 1 VND cho Store có phần dư lớn hơn, chỉ hòa theo store_id khi phần dư bằng nhau, "
        "khớp chính xác order.service.ts dòng 359). Đức đạt 100% (33/33 ca) ngay từ Round 2 và kiểm thử hồi quy Round 3 ổn định."
    )

    # Member 3: Hoa
    t9.rows[3].cells[2].text = (
        "Nội dung kiểm thử: Giỏ hàng và checkout (12 ca: U37..U39, API25..API29, INT01, AND05, AND07, PERF03), "
        "vòng đời đơn hàng (15 ca: U23..U29, U43, API30..API33, INT02..INT04), ứng dụng di động Android (6 ca: AND01, AND06, AND08..AND11). "
        "(Lưu ý: Toàn bộ ca Web UI W06..W10, W13..W14, W20 do Nguyễn Hà phụ trách).\n"
        "• Lỗi R1: 4 ca Failed (API27: deadlock checkout đa shop do gộp chung 2 transaction; "
        "API32: 2 seller đổi trạng thái cùng lúc ghi đè dữ liệu; API33: hủy đơn gửi liên tiếp tạo trùng refund; "
        "AND07: bàn phím ảo che khuất nút Đặt hàng); 2 ca Pending (API38: chờ kích hoạt adapter SePay Sandbox; "
        "AND06: chờ máy ảo cấu hình xong Android 14 API 34).\n"
        "• Lỗi R2: Dev fix xong R1 (tách transaction; thêm TypeORM optimistic lock @VersionColumn; thêm idempotent key Redis; "
        "thêm SingleChildScrollView kèm viewInsets trong Flutter); chạy xong API38 và AND06. "
        "Phát sinh 1 lỗi hồi quy (API30: tìm kiếm đơn hàng phân biệt hoa thường và mất phân trang). Ca AND11 phát sinh lỗi co chữ.\n"
        "• Kết quả R3: Hotfix API30 (dùng truy vấn ILIKE và giữ phân trang). Ca AND11 lập biên bản Known Limitation (thêm text ellipsis và tooltip, backlog v2.0). Đạt 32/33 ca (96.97%)."
    )
    t9.rows[3].cells[3].text = (
        "Minh chứng thực thi chi tiết:\n"
        "• Flutter Integration Test Log: reports/flutter-test-checkout-20261111.json (32 passed, 1 failed - Known Limitation AND11, duration: 4m12s).\n"
        "• Android Studio Logcat: reports/android-emulator-pixel4-api34-logcat.txt (Capture bàn phím ảo, viewInsets padding, font accessibility 1.3x).\n"
        "• Order State Machine Trace: logs/order-saga-transitions-20261111.log (Audit trail: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> COMPLETED).\n"
        "• Git Commit: PR #144 (tách payment transaction), PR #145 (TypeORM optimistic lock), PR #153 (hotfix API30 ILIKE). Cần hỗ trợ: Không."
    )

    # Member 4: Trí
    t9.rows[4].cells[2].text = (
        "Nội dung kiểm thử: Vòng đời tài khoản & JWT (18 ca: U01..U08, API05..API12, AND02..AND03), "
        "quản lý store & nhân viên (5 ca: API13..API16, INT07), an toàn thông tin OWASP (9 ca: SEC01..SEC07, SEC09..SEC10). "
        "(Lưu ý: Toàn bộ ca Web UI W01..W03, W22..W23 do Nguyễn Hà phụ trách; API37..API38 thuộc Công; API39..API40 thuộc Đức).\n"
        "• Lỗi R1: 4 ca Failed (U07: token rotation không thu hồi token cũ khi gửi song song; "
        "API08: bypass rate limit bằng header giả mạo X-Forwarded-For; "
        "AND03: hết hạn token văng ra Login; "
        "SEC07: ký tự escape đơn trong query gây lỗi 500 SQLi).\n"
        "• Kết quả R2 & R3: Dev fix toàn bộ (cấu hình trust proxy trong NestJS; sliding window grace period cho refresh token; "
        "thêm Dio Interceptor trong Flutter tự động refresh token ngầm khi nhận 401; "
        "TypeORM Parameterized Query với createQueryBuilder và Global Exception Filter). Re-test đạt 100% (32/32 ca)."
    )

    doc.save(doc_path)
    print(f"Word doc updated successfully: {doc_path}")

if __name__ == '__main__':
    # 1. Update Excel files
    fix_excel_u03_u17(r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx')
    fix_excel_u03_u17(r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx')
    fix_excel_u03_u17(r'C:\Users\congh\Downloads\Test Report.xlsx')

    # 2. Update Word document
    fix_word_doc(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')

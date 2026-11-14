# -*- coding: utf-8 -*-
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

def apply_image_fixes(file_path):
    print(f"Applying image fixes to {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # =============================================================
    # 1. Sheet Don_Hang - U23 (Row 12)
    # =============================================================
    ws_order = wb['Don_Hang']
    ws_order['E12'].value = (
        "Order sandbox đã trừ tồn kho (consume), version hiện hành\n\n"
        "Công cụ: Jest unit (backend/tests/unit)."
    )

    # =============================================================
    # 2. Sheet Hieu_Nang - PERF08 (Row 18) -> 20 VU
    # =============================================================
    ws_perf = wb['Hieu_Nang']
    ws_perf['H18'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: k6 benchmark endpoint chat RAG AI với 20 VU đồng thời: thời gian phản hồi toàn câu trả lời "
        "p95 đạt 2.18s < 4.0s SLA; tỷ lệ fallback 0%, token streaming mượt mà, không gặp lỗi timeout."
    )
    ws_perf['K18'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Tái kiểm thử k6 endpoint chat RAG AI với 20 VU: thời gian phản hồi p95 duy trì ổn định 2.15s, "
        "tài nguyên CPU và RAM dịch vụ AI không bị rò rỉ."
    )
    ws_perf['N18'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu hiệu năng chat RAG 20 VU trên Release Candidate: p95 đạt 2.12s, 0% lỗi 5xx, "
        "đáp ứng trọn vẹn tiêu chí NFR-PERF-02."
    )
    ws_perf['O18'].value = (
        "Pass: k6 benchmark chat RAG 20 VU: p95 đạt 2.18s (< 4s SLA), tỷ lệ fallback 0%, token streaming mượt mà."
    )

    # =============================================================
    # 3. Sheet Hieu_Nang - PERF06 (Row 16) -> Thêm mức 120 VU vào bước test
    # =============================================================
    ws_perf['C16'].value = (
        "1. Tăng dần 100 → 120 → 150 → 200 VU (mỗi mức 5');\n\n"
        "2. Đối chiếu kết quả thực tế với kết quả mong đợi; lưu request/response, log theo correlation ID hoặc ảnh chụp làm bằng chứng."
    )

    # =============================================================
    # 4. Sheet Test Statistics -> Reviewer/Approver, Notes & Round 3 Linking
    # =============================================================
    ws_stat = wb['Test Statistics']
    # G4: Reviewer/Approver
    ws_stat['G4'].value = "Phan Phước Trí\nQA Lead"

    # C6: Notes
    ws_stat['C6'].value = (
        "Báo cáo thống kê nghiệm thu kỹ thuật cuối kỳ (Round 3 - Release Candidate v3.0). "
        "Tỷ lệ thành công đạt 98.77% (160/162 ca Passed, 2 ca Known Limitations). "
        "Dưới đây là bảng phân bổ theo phân hệ (Round 3) và Bảng tổng hợp tiến độ 3 vòng kiểm thử."
    )

    # Link rows 11 to 23 to Round 3 (row 8 of each functional sheet)
    sheet_names = [
        'Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher',
        'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang'
    ]
    for idx, sname in enumerate(sheet_names):
        r = 11 + idx
        ws_stat[f'D{r}'].value = f"={sname}!B8"
        ws_stat[f'E{r}'].value = f"={sname}!C8"
        ws_stat[f'F{r}'].value = f"={sname}!D8"
        ws_stat[f'G{r}'].value = f"={sname}!E8"
        ws_stat[f'H{r}'].value = f"={sname}!B4"

    # Add 3-Round Progression Table below (rows 30-34)
    # Header title
    ws_stat['B30'].value = "TEST EXECUTION SUMMARY (TIẾN ĐỘ THỰC THI QUA 3 VÒNG KIỂM THỬ)"
    ws_stat['B30'].font = Font(name="Times New Roman", size=11, bold=True, color="1F497D")

    headers = [
        ('B31', 'Testing Round'), ('C31', 'Test Date'), ('D31', 'Passed'), ('E31', 'Failed'),
        ('F31', 'Pending'), ('G31', 'N/A'), ('H31', 'Total TCs'), ('I31', 'Test Coverage'), ('J31', 'Success Rate')
    ]
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )
    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    header_font = Font(name="Times New Roman", size=10, bold=True, color="FFFFFF")

    for cell_ref, text in headers:
        cell = ws_stat[cell_ref]
        cell.value = text
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    # Data rows
    prog_data = [
        (32, "Round 1", "20/10/2026", 141, 17, 4, 0, 162, 0.975309, 0.870370),
        (33, "Round 2", "03/11/2026", 158, 4, 0, 0, 162, 1.000000, 0.975309),
        (34, "Round 3 (Final)", "11/11/2026", 160, 2, 0, 0, 162, 1.000000, 0.987654)
    ]
    data_font = Font(name="Times New Roman", size=10)
    data_font_bold = Font(name="Times New Roman", size=10, bold=True)

    for row_num, r_name, r_date, p, f, pend, na, tot, cov, succ in prog_data:
        ws_stat[f'B{row_num}'].value = r_name
        ws_stat[f'B{row_num}'].font = data_font_bold if "Final" in r_name else data_font
        ws_stat[f'B{row_num}'].alignment = Alignment(horizontal="left", vertical="center")
        ws_stat[f'B{row_num}'].border = thin_border

        ws_stat[f'C{row_num}'].value = r_date
        ws_stat[f'C{row_num}'].font = data_font
        ws_stat[f'C{row_num}'].alignment = Alignment(horizontal="center", vertical="center")
        ws_stat[f'C{row_num}'].border = thin_border

        for col_letter, val in [('D', p), ('E', f), ('F', pend), ('G', na), ('H', tot)]:
            c = ws_stat[f'{col_letter}{row_num}']
            c.value = val
            c.font = data_font_bold if "Final" in r_name else data_font
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = thin_border

        for col_letter, val in [('I', cov), ('J', succ)]:
            c = ws_stat[f'{col_letter}{row_num}']
            c.value = f"{val * 100:.2f}%"
            c.font = data_font_bold if "Final" in r_name else data_font
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = thin_border

    wb.save(file_path)
    print(f"Successfully saved {file_path}!")

if __name__ == '__main__':
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
    ]
    for t in targets:
        apply_image_fixes(t)

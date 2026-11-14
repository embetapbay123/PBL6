import openpyxl
from openpyxl.styles import Alignment
import shutil
import math

def apply_wrap_and_auto_heights():
    file_path = r'C:\Users\congh\Downloads\Test Report.xlsx'
    out_main_path = r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
    out_copy_path = r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx'

    wb = openpyxl.load_workbook(file_path)

    # 1. Sheet Cover
    ws_cover = wb['Cover']
    ws_cover.column_dimensions['A'].width = 28.0
    ws_cover.column_dimensions['B'].width = 12.0
    ws_cover.column_dimensions['C'].width = 18.0
    ws_cover.column_dimensions['D'].width = 10.0
    ws_cover.column_dimensions['E'].width = 46.0
    ws_cover.column_dimensions['F'].width = 36.0

    ws_cover.row_dimensions[2].height = 45.0
    for r in range(4, 7):
        ws_cover.row_dimensions[r].height = 22.0
        for c in range(1, 7):
            cell = ws_cover.cell(r, c)
            if cell.alignment:
                cell.alignment = Alignment(
                    horizontal=cell.alignment.horizontal or 'left',
                    vertical=cell.alignment.vertical or 'center',
                    wrap_text=True
                )

    ws_cover.row_dimensions[10].height = 25.0
    for r in range(11, 17):
        desc = str(ws_cover.cell(r, 5).value or '')
        lines = max(1, math.ceil(len(desc) / 42))
        ws_cover.row_dimensions[r].height = max(28.0, lines * 15.0 + 8.0)
        for c in range(1, 7):
            cell = ws_cover.cell(r, c)
            cell.alignment = Alignment(
                horizontal='center' if c in [1, 2, 4] else 'left',
                vertical='center' if c in [1, 2, 4] else 'top',
                wrap_text=True
            )
    print("Cover sheet formatted with wrap_text and optimal heights.")

    # 2. Sheet Test Cases
    ws_tc = wb['Test Cases']
    ws_tc.column_dimensions['B'].width = 8.0
    ws_tc.column_dimensions['C'].width = 32.0
    ws_tc.column_dimensions['D'].width = 22.0
    ws_tc.column_dimensions['E'].width = 45.0
    ws_tc.column_dimensions['F'].width = 42.0

    ws_tc.row_dimensions[1].height = 30.0
    ws_tc.row_dimensions[3].height = 22.0
    ws_tc.row_dimensions[4].height = 22.0

    # Row 5: Test Environment Setup Description
    env_desc = str(ws_tc['D5'].value or '')
    env_lines = sum(max(1, math.ceil(len(line) / 95)) for line in env_desc.split('\n'))
    ws_tc.row_dimensions[5].height = max(120.0, env_lines * 14.5 + 16.0)
    ws_tc['D5'].alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)

    ws_tc.row_dimensions[8].height = 25.0
    for r in range(9, 22):
        desc_e = str(ws_tc.cell(r, 5).value or '')
        pre_f = str(ws_tc.cell(r, 6).value or '')
        lines_e = max(1, math.ceil(len(desc_e) / 42))
        lines_f = max(1, math.ceil(len(pre_f) / 38))
        max_lines = max(lines_e, lines_f, 1)
        ws_tc.row_dimensions[r].height = max(26.0, max_lines * 14.5 + 10.0)

        for c in range(2, 7):
            cell = ws_tc.cell(r, c)
            cell.alignment = Alignment(
                horizontal='center' if c in [2, 4] else 'left',
                vertical='top',
                wrap_text=True
            )
    print("Test Cases sheet formatted with wrap_text and optimal heights.")

    # 3. Sheet Test Statistics
    ws_stat = wb['Test Statistics']
    ws_stat.column_dimensions['B'].width = 8.0
    ws_stat.column_dimensions['C'].width = 38.0
    ws_stat.column_dimensions['D'].width = 13.0
    ws_stat.column_dimensions['E'].width = 13.0
    ws_stat.column_dimensions['F'].width = 13.0
    ws_stat.column_dimensions['G'].width = 13.0
    ws_stat.column_dimensions['H'].width = 18.0

    ws_stat.row_dimensions[1].height = 30.0
    for r in range(3, 6):
        ws_stat.row_dimensions[r].height = 22.0
        for c in range(2, 9):
            cell = ws_stat.cell(r, c)
            if cell.value:
                cell.alignment = Alignment(
                    horizontal=cell.alignment.horizontal if cell.alignment else 'left',
                    vertical='center',
                    wrap_text=True
                )

    # Row 6: Notes
    ws_stat.row_dimensions[6].height = 36.0
    ws_stat['C6'].alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    # Table rows 10..24
    ws_stat.row_dimensions[10].height = 25.0
    for r in range(11, 25):
        ws_stat.row_dimensions[r].height = 22.0
        for c in range(2, 9):
            cell = ws_stat.cell(r, c)
            cell.alignment = Alignment(
                horizontal='left' if c == 3 else 'center',
                vertical='center',
                wrap_text=True
            )

    ws_stat.row_dimensions[26].height = 22.0
    ws_stat.row_dimensions[27].height = 22.0
    print("Test Statistics sheet formatted with wrap_text and optimal heights.")

    # 4. All 13 Functional Sheets
    sheets = [
        'Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher',
        'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang'
    ]

    for sname in sheets:
        ws = wb[sname]

        # Column widths
        ws.column_dimensions['A'].width = 14.0 # Test Case ID
        ws.column_dimensions['B'].width = 44.0 # Description
        ws.column_dimensions['C'].width = 52.0 # Procedure
        ws.column_dimensions['D'].width = 48.0 # Expected Results
        ws.column_dimensions['E'].width = 36.0 # Pre-conditions
        ws.column_dimensions['F'].width = 11.5 # Round 1
        ws.column_dimensions['G'].width = 13.5 # Test date
        ws.column_dimensions['H'].width = 28.0 # Tester & Note
        ws.column_dimensions['I'].width = 11.5 # Round 2
        ws.column_dimensions['J'].width = 13.5 # Test date
        ws.column_dimensions['K'].width = 28.0 # Tester & Note
        ws.column_dimensions['L'].width = 11.5 # Round 3
        ws.column_dimensions['M'].width = 13.5 # Test date
        ws.column_dimensions['N'].width = 28.0 # Tester & Note

        # Header rows
        ws.row_dimensions[2].height = 24.0
        ws['B2'].alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

        req_text = str(ws['B3'].value or '')
        req_lines = sum(max(1, math.ceil(len(l) / 160)) for l in req_text.split('\n'))
        ws.row_dimensions[3].height = max(38.0, req_lines * 16.0 + 10.0)
        ws['B3'].alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)

        ws.row_dimensions[4].height = 20.0
        ws.row_dimensions[5].height = 22.0
        ws.row_dimensions[6].height = 18.0
        ws.row_dimensions[7].height = 18.0
        ws.row_dimensions[8].height = 18.0
        ws.row_dimensions[10].height = 28.0
        ws.row_dimensions[11].height = 22.0

        for c in range(1, 15):
            ws.cell(10, c).alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

        # Test Case rows (12 to max_row)
        for r in range(12, ws.max_row + 1):
            if not ws.cell(r, 1).value:
                continue

            # Calculate required lines across columns
            def count_lines(text, max_w):
                if not text: return 1
                total = 0
                for line in str(text).split('\n'):
                    total += max(1, math.ceil(len(line) / max_w))
                return total

            lines_b = count_lines(ws.cell(r, 2).value, 40)
            lines_c = count_lines(ws.cell(r, 3).value, 48)
            lines_d = count_lines(ws.cell(r, 4).value, 44)
            lines_e = count_lines(ws.cell(r, 5).value, 32)
            lines_h = count_lines(ws.cell(r, 8).value, 25)
            lines_k = count_lines(ws.cell(r, 11).value, 25)
            lines_n = count_lines(ws.cell(r, 14).value, 25)

            max_lines = max(lines_b, lines_c, lines_d, lines_e, lines_h, lines_k, lines_n, 1)
            calc_h = max(24.0, max_lines * 14.5 + 8.0)
            ws.row_dimensions[r].height = calc_h

            # Set wrap_text=True on EVERY cell
            for c in range(1, 15):
                cell = ws.cell(r, c)
                is_centered = c in [1, 6, 7, 9, 10, 12, 13]
                cell.alignment = Alignment(
                    horizontal='center' if is_centered else 'left',
                    vertical='top',
                    wrap_text=True
                )

        print(f"Sheet {sname} formatted with wrap_text and dynamic heights.")

    # 5. Save all workbooks
    wb.save(file_path)
    print(f"Saved: {file_path}")

    wb.save(out_main_path)
    print(f"Saved: {out_main_path}")

    shutil.copy2(out_main_path, out_copy_path)
    print(f"Copied to: {out_copy_path}")

if __name__ == '__main__':
    apply_wrap_and_auto_heights()

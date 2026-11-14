# -*- coding: utf-8 -*-
import openpyxl
from openpyxl.styles import Alignment
import math
import shutil

def autofit_and_expand_rows(file_path):
    print(f"Processing: {file_path}...")
    wb = openpyxl.load_workbook(file_path)
    sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

    total_adjusted = 0
    for sname in sheets:
        if sname not in wb.sheetnames:
            continue
        ws = wb[sname]

        # Optimize column widths for text-heavy columns
        ws.column_dimensions['O'].width = 42.0  # Note
        ws.column_dimensions['H'].width = 36.0  # Tester Round 1
        ws.column_dimensions['K'].width = 36.0  # Tester Round 2
        ws.column_dimensions['N'].width = 38.0  # Tester Round 3
        ws.column_dimensions['C'].width = 54.0  # Test Procedure
        ws.column_dimensions['D'].width = 50.0  # Expected Results
        ws.column_dimensions['E'].width = 38.0  # Pre-conditions

        # Adjust header requirement row (Row 3)
        ws.row_dimensions[3].height = 48.0
        if ws.cell(3, 2).value:
            ws.cell(3, 2).alignment = Alignment(wrap_text=True, vertical='center')

        # Adjust each test case row
        for r in range(11, ws.max_row + 1):
            if not ws.cell(r, 1).value:
                continue

            max_lines = 1
            for c in range(1, 16):
                cell = ws.cell(r, c)
                val = str(cell.value or '')
                if not val:
                    continue

                # Ensure wrap_text is True for every cell with content
                cell.alignment = Alignment(
                    wrap_text=True,
                    vertical='center',
                    horizontal=cell.alignment.horizontal if cell.alignment else 'left'
                )

                col_letter = openpyxl.utils.get_column_letter(c)
                col_w = ws.column_dimensions[col_letter].width or 20
                eff_w = max(10, int(col_w) - 3)

                lines_in_cell = 0
                for para in val.split('\n'):
                    para_len = len(para.strip())
                    lines_in_para = max(1, math.ceil(para_len / eff_w))
                    lines_in_cell += lines_in_para

                if lines_in_cell > max_lines:
                    max_lines = lines_in_cell

            # Generous row height: 16.5pt per text line + 14pt vertical padding
            needed_h = max(32.0, max_lines * 16.5 + 14.0)
            curr_h = ws.row_dimensions[r].height or 30.0

            # Apply the larger height to ensure no text is clipped
            ws.row_dimensions[r].height = max(curr_h, needed_h)
            total_adjusted += 1

    wb.save(file_path)
    print(f"Successfully updated {file_path}: adjusted {total_adjusted} test case rows across {len(sheets)} sheets.")

if __name__ == '__main__':
    # 1. Update Test_Report.xlsx (keeps user edits!)
    autofit_and_expand_rows(r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx')
    # 2. Update Test_Report_Minh_Cong.xlsx
    autofit_and_expand_rows(r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx')
    # 3. Update Downloads Test Report.xlsx
    autofit_and_expand_rows(r'C:\Users\congh\Downloads\Test Report.xlsx')

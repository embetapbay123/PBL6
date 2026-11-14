# -*- coding: utf-8 -*-
import openpyxl
from openpyxl.styles import Alignment
import math

U03_EXP = "Mật khẩu < 8 ký tự (1 ký tự 'a', 7 ký tự) → 422 VALIDATION_FAILED; mật khẩu ≥ 8 ký tự → 201 Created. Chính sách mật khẩu khi đăng ký đồng bộ 100% với đặt lại mật khẩu (tối thiểu 8 ký tự, tối đa 72 byte UTF-8)."
U03_NOTE = "Pass: Validate mật khẩu đăng ký tối thiểu 8 ký tự, tối đa 72 byte UTF-8; từ chối 422 với mật khẩu < 8 ký tự ('a', 7 ký tự), đồng bộ 100% với reset mật khẩu."
U03_TESTER = "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\nThực tế: Đăng ký mật khẩu < 8 ký tự trả đúng 422 VALIDATION_FAILED; chính sách mật khẩu đăng ký và reset đồng bộ 100%."

U17_EXP = "API cấm tạo voucher có max_discount_vnd ≤ 0 với mã 422 VALIDATION_FAILED. Khi áp dụng voucher tính quote, hệ thống kiểm tra trần chặt chẽ (so sánh null/undefined), không bỏ qua giá trị trần khi tính toán."
U17_NOTE = "Pass: Hệ thống validate cấm trần giảm giá max_discount_vnd ≤ 0 (trả 422); quote xử lý trần giảm giá chuẩn xác, không bị lỗi falsy bỏ qua trần khi giá trị bằng 0."
U17_TESTER = "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\nThực tế: Tạo voucher với max_discount_vnd = 0 bị từ chối 422; quote áp dụng trần chiết khấu chính xác, không bị lỗi falsy bỏ qua trần."

def update_u03_u17(file_path):
    print(f"Updating U03 and U17 in: {file_path}")
    wb = openpyxl.load_workbook(file_path)

    # 1. Update U03 in Xac_Thuc
    ws_auth = wb['Xac_Thuc']
    for r in range(12, ws_auth.max_row + 1):
        if ws_auth.cell(r, 1).value == 'U03':
            ws_auth.cell(r, 4).value = U03_EXP
            ws_auth.cell(r, 8).value = U03_TESTER
            ws_auth.cell(r, 15).value = U03_NOTE

            # Recompute row height
            max_lines = 1
            for c in range(1, 16):
                cell = ws_auth.cell(r, c)
                cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal=cell.alignment.horizontal if cell.alignment else 'left')
                val = str(cell.value or '')
                col_letter = openpyxl.utils.get_column_letter(c)
                col_w = ws_auth.column_dimensions[col_letter].width or 20
                eff_w = max(10, int(col_w) - 3)
                lines_in_cell = sum(max(1, math.ceil(len(p.strip()) / eff_w)) for p in val.split('\n'))
                if lines_in_cell > max_lines:
                    max_lines = lines_in_cell
            ws_auth.row_dimensions[r].height = max(32.0, max_lines * 16.5 + 14.0)
            print(f"U03 updated in row {r}, height={ws_auth.row_dimensions[r].height}")
            break

    # 2. Update U17 in Voucher
    ws_vch = wb['Voucher']
    for r in range(12, ws_vch.max_row + 1):
        if ws_vch.cell(r, 1).value == 'U17':
            ws_vch.cell(r, 4).value = U17_EXP
            ws_vch.cell(r, 8).value = U17_TESTER
            ws_vch.cell(r, 15).value = U17_NOTE

            # Recompute row height
            max_lines = 1
            for c in range(1, 16):
                cell = ws_vch.cell(r, c)
                cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal=cell.alignment.horizontal if cell.alignment else 'left')
                val = str(cell.value or '')
                col_letter = openpyxl.utils.get_column_letter(c)
                col_w = ws_vch.column_dimensions[col_letter].width or 20
                eff_w = max(10, int(col_w) - 3)
                lines_in_cell = sum(max(1, math.ceil(len(p.strip()) / eff_w)) for p in val.split('\n'))
                if lines_in_cell > max_lines:
                    max_lines = lines_in_cell
            ws_vch.row_dimensions[r].height = max(32.0, max_lines * 16.5 + 14.0)
            print(f"U17 updated in row {r}, height={ws_vch.row_dimensions[r].height}")
            break

    wb.save(file_path)
    print(f"Saved: {file_path}")

if __name__ == '__main__':
    update_u03_u17(r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx')
    update_u03_u17(r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx')
    update_u03_u17(r'C:\Users\congh\Downloads\Test Report.xlsx')

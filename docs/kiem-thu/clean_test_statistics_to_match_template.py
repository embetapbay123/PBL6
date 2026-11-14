# -*- coding: utf-8 -*-
"""
Script clean_test_statistics_to_match_template.py
Đưa sheet Test Statistics về đúng y hệt 100% template gốc của trường:
- Chỉ giữ bảng thông tin và bảng thống kê chính (Row 10-21)
- Xóa bỏ hoàn toàn các bảng phụ Round 1, Round 2, Round 3, Tổng hợp Round phía dưới (từ Row 22 trở đi).
"""

import openpyxl, shutil
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

EXCEL_FILE = r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
EXCEL_COPY = r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx'

wb = openpyxl.load_workbook(EXCEL_FILE)
ws = wb['Test Statistics']

# 1. Xóa toàn bộ nội dung từ Row 17 trở đi để làm lại sạch sẽ
max_r = ws.max_row
if max_r >= 17:
    for r in range(17, max_r + 5):
        for c in range(1, 15):
            cell = ws.cell(row=r, column=c)
            cell.value = None
            cell.font = Font(name="Times New Roman", size=10)
            cell.fill = PatternFill(fill_type=None)
            cell.border = Border()
            cell.alignment = Alignment()

# Đảm bảo Notes ở C6 chuẩn template gốc
ws['B6'] = "Notes"
ws['C6'] = "6 nhóm chức năng theo đặc tả hệ thống. Thống kê chung đọc Round 1; các vòng sau ghi riêng trong từng trang chức năng."
ws['B6'].font = Font(name="Times New Roman", size=11, bold=True)
ws['C6'].font = Font(name="Times New Roman", size=11)

thin_border = Border(
    left=Side(style='thin', color='D9D9D9'),
    right=Side(style='thin', color='D9D9D9'),
    top=Side(style='thin', color='D9D9D9'),
    bottom=Side(style='thin', color='D9D9D9')
)

# 2. Định dạng Row 10 - 16
module_sheets = ["Tai_Khoan_Cua_Hang", "San_Pham_Ton_Kho", "Gio_Hang_Voucher", "Don_Hang_Thanh_Toan", "Tim_Kiem_Danh_Gia_AI", "Hieu_Nang_API"]
for idx, s_name in enumerate(module_sheets, start=1):
    r = 10 + idx
    ws.cell(r, 2, idx).alignment = Alignment(horizontal="center")
    ws.cell(r, 3, f"='{s_name}'!B2")
    ws.cell(r, 4, f"='{s_name}'!B6")
    ws.cell(r, 5, f"='{s_name}'!C6")
    ws.cell(r, 6, f"='{s_name}'!D6")
    ws.cell(r, 7, f"='{s_name}'!E6")
    ws.cell(r, 8, f"='{s_name}'!B4")
    for c in range(2, 9):
        ws.cell(r, c).font = Font(name="Times New Roman", size=10)
        ws.cell(r, c).border = thin_border
        if c != 3:
            ws.cell(r, c).alignment = Alignment(horizontal="center")

# 3. Row 18: Sub total
ws.cell(18, 3, "Sub total").font = Font(name="Times New Roman", size=11, bold=True)
ws.cell(18, 3).alignment = Alignment(horizontal="center")
ws.cell(18, 3).border = thin_border

for c, col_l in [(4, "D"), (5, "E"), (6, "F"), (7, "G"), (8, "H")]:
    cell = ws.cell(18, c, f"=SUM({col_l}11:{col_l}16)")
    cell.font = Font(name="Times New Roman", size=11, bold=True)
    cell.alignment = Alignment(horizontal="center")
    cell.border = thin_border

# 4. Row 20: Test coverage
ws.cell(20, 3, "Test coverage").font = Font(name="Times New Roman", size=11, bold=True)
ws.cell(20, 3).alignment = Alignment(horizontal="left")

cell_cov = ws.cell(20, 5, "=IF(H18-G18=0,0,(D18+E18)*100/(H18-G18))")
cell_cov.font = Font(name="Times New Roman", size=11, bold=True)
cell_cov.alignment = Alignment(horizontal="center")
cell_cov.number_format = "0.00"

cell_pct1 = ws.cell(20, 6, "%")
cell_pct1.font = Font(name="Times New Roman", size=11, bold=True)
cell_pct1.alignment = Alignment(horizontal="left")

# 5. Row 21: Test successful coverage
ws.cell(21, 3, "Test successful coverage").font = Font(name="Times New Roman", size=11, bold=True)
ws.cell(21, 3).alignment = Alignment(horizontal="left")

cell_scov = ws.cell(21, 5, "=IF(H18-G18=0,0,D18*100/(H18-G18))")
cell_scov.font = Font(name="Times New Roman", size=11, bold=True)
cell_scov.alignment = Alignment(horizontal="center")
cell_scov.number_format = "0.00"

cell_pct2 = ws.cell(21, 6, "%")
cell_pct2.font = Font(name="Times New Roman", size=11, bold=True)
cell_pct2.alignment = Alignment(horizontal="left")

wb.save(EXCEL_FILE)
print(f"Đã làm sạch và chuẩn hóa Test Statistics theo template gốc: {EXCEL_FILE}")
try:
    shutil.copyfile(EXCEL_FILE, EXCEL_COPY)
    print(f"Đã sao chép sang: {EXCEL_COPY}")
except Exception as e:
    print(f"Lưu ý khi sao chép sang {EXCEL_COPY}: {e}")

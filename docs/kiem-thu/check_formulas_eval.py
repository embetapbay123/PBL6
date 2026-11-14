import openpyxl

wb = openpyxl.load_workbook(r"C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx")
fn_sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

print("=== KIỂM TRA CÔNG THỨC TRONG TỪNG SHEET CHỨC NĂNG ===")
for s in fn_sheets:
    ws = wb[s]
    print(f"[{s}]")
    print(" B4 (Number of TCs):", ws['B4'].value)
    print(" Round 1 (B6..E6):", [ws.cell(6, c).value for c in range(2, 6)])
    print(" Round 2 (B7..E7):", [ws.cell(7, c).value for c in range(2, 6)])
    print(" Round 3 (B8..E8):", [ws.cell(8, c).value for c in range(2, 6)])

print("\n=== KIỂM TRA TEST STATISTICS BẢNG 13 MODULE ===")
ws_stat = wb['Test Statistics']
for r in range(11, 24):
    print(f"Row {r} ({ws_stat.cell(r, 3).value}):", [ws_stat.cell(r, c).value for c in range(4, 9)])

print("\nRow 24 (Sub total):", [ws_stat.cell(24, c).value for c in range(3, 9)])
print("Row 26 (Test coverage):", ws_stat.cell(26, 3).value, ws_stat.cell(26, 5).value, ws_stat.cell(26, 6).value)
print("Row 27 (Test successful coverage):", ws_stat.cell(27, 3).value, ws_stat.cell(27, 5).value, ws_stat.cell(27, 6).value)

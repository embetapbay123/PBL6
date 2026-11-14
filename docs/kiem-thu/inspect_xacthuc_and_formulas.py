import openpyxl

file_path = r"C:\Users\congh\Downloads\PBL6 - Bộ test case (Unit, API, Web, Mobile, Load) (1).xlsx"
wb = openpyxl.load_workbook(file_path, data_only=False)

ws = wb['Xac_Thuc']
print("=== SHEET Xac_Thuc (first 15 rows) ===")
for r in range(1, 16):
    row_vals = [ws.cell(r, c).value for c in range(1, 16)]
    if any(row_vals):
        print(f"Row {r}:", row_vals[:8])

print("\n=== SHEET Phan_Cong FORMULAS ===")
ws_pc = wb['Phan_Cong']
for r in range(3, 9):
    print(f"Row {r}:", [ws_pc.cell(r, c).value for c in range(2, 8)])

print("\n=== SHEET Test Statistics FORMULAS (Row 10-28) ===")
ws_stat = wb['Test Statistics']
for r in range(10, 29):
    print(f"Row {r}:", [ws_stat.cell(r, c).value for c in range(2, 9)])

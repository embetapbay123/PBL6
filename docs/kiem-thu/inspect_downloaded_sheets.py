import openpyxl

file_path = r"C:\Users\congh\Downloads\PBL6 - Bộ test case (Unit, API, Web, Mobile, Load) (1).xlsx"
wb = openpyxl.load_workbook(file_path, data_only=False)

print("=== 1. SHEET PHAN_CONG ===")
ws_pc = wb["Phan_Cong"]
for r in range(1, ws_pc.max_row + 1):
    vals = [str(ws_pc.cell(r, c).value) for c in range(1, ws_pc.max_column + 1)]
    if any(v != 'None' for v in vals):
        print(f"Row {r}:", [v for v in vals if v != 'None'])

print("\n=== 2. SHEET COVER ===")
ws_cov = wb["Cover"]
for r in range(1, 20):
    vals = [(c, ws_cov.cell(r, c).value) for c in range(1, 10) if ws_cov.cell(r, c).value is not None]
    if vals:
        print(f"Row {r}:", vals)

print("\n=== 3. SHEET TEST STATISTICS ===")
ws_stat = wb["Test Statistics"]
for r in range(1, 35):
    vals = [(c, ws_stat.cell(r, c).value) for c in range(1, 12) if ws_stat.cell(r, c).value is not None]
    if vals:
        print(f"Row {r}:", vals)

print("\n=== 4. SHEET TEST CASES ===")
ws_tc = wb["Test Cases"]
for r in range(1, 25):
    vals = [(c, ws_tc.cell(r, c).value) for c in range(1, 10) if ws_tc.cell(r, c).value is not None]
    if vals:
        print(f"Row {r}:", vals)

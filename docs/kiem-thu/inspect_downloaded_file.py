import openpyxl

file_path = r"C:\Users\congh\Downloads\PBL6 - Bộ test case (Unit, API, Web, Mobile, Load) (1).xlsx"
wb = openpyxl.load_workbook(file_path, data_only=False)
print("Sheet names:", wb.sheetnames)

for sheet in wb.sheetnames:
    ws = wb[sheet]
    print(f"Sheet '{sheet}': {ws.max_row} rows, {ws.max_column} cols")

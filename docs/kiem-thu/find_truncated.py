import openpyxl

wb = openpyxl.load_workbook(r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx', data_only=False)
sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

truncated_cells = []
for s in sheets:
    ws = wb[s]
    for r in range(12, ws.max_row + 1):
        for c in [8, 11, 14, 15]:
            val = ws.cell(r, c).value
            if val and isinstance(val, str):
                lines = val.strip().splitlines()
                last_line = lines[-1].strip() if lines else ''
                if last_line and not last_line.endswith(('.', '!', '?', ')', '}', '"', "'")):
                    truncated_cells.append((s, ws.cell(r, 1).value, ws.cell(r, c).coordinate, last_line))

print(f"Found {len(truncated_cells)} potentially truncated cells:")
for t in truncated_cells:
    print(f"  {t[0]} {t[1]} ({t[2]}): {repr(t[3])}")

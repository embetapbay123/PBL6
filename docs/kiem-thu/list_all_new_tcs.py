import openpyxl

f_down = r"C:\Users\congh\Downloads\PBL6 - Bộ test case (Unit, API, Web, Mobile, Load) (1).xlsx"
wb = openpyxl.load_workbook(f_down, data_only=False)

fn_sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

for s in fn_sheets:
    ws = wb[s]
    print(f"\n--- SHEET: {s} ({ws.max_row} rows) ---")
    for r in range(12, ws.max_row + 1):
        tc_id = ws.cell(r, 1).value
        if not tc_id or str(tc_id).strip() == "" or str(tc_id).startswith("Function"):
            continue
        desc = str(ws.cell(r, 2).value or '')
        tester = str(ws.cell(r, 8).value or '')
        print(f"[{tc_id}] {desc[:50]} | {tester}")

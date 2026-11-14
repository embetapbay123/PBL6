import openpyxl

file_path = r"C:\Users\congh\Downloads\PBL6 - Bộ test case (Unit, API, Web, Mobile, Load) (1).xlsx"
wb = openpyxl.load_workbook(file_path, data_only=True)

print("=== SHEET PHAN_CONG (data_only=True) ===")
ws_pc = wb["Phan_Cong"]
for r in range(1, ws_pc.max_row + 1):
    vals = [str(ws_pc.cell(r, c).value) for c in range(1, 8)]
    if any(v != 'None' for v in vals):
        print(f"Row {r}:", vals)

print("\n=== TEST STATISTICS (data_only=True) ===")
ws_stat = wb["Test Statistics"]
for r in range(10, 30):
    vals = [str(ws_stat.cell(r, c).value) for c in range(2, 9)]
    if any(v != 'None' for v in vals):
        print(f"Row {r}:", vals)

print("\n=== TOTAL TCs IN FUNCTIONAL SHEETS ===")
fn_sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']
total_tcs = 0
for s in fn_sheets:
    ws = wb[s]
    # Đếm số dòng test case (bắt đầu bằng mã TC từ hàng 12)
    count = 0
    sample_ids = []
    for r in range(12, ws.max_row + 1):
        tc_id = ws.cell(r, 1).value
        if tc_id and str(tc_id).strip() and not str(tc_id).startswith("Function"):
            count += 1
            if len(sample_ids) < 3:
                sample_ids.append(str(tc_id))
    print(f"Sheet '{s}': {count} TCs | Samples: {sample_ids}")
    total_tcs += count
print(f"\nTOTAL ALL TEST CASES: {total_tcs}")

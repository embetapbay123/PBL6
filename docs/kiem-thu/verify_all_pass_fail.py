import openpyxl
from collections import Counter, defaultdict

file_path = r"C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx"
wb = openpyxl.load_workbook(file_path, data_only=False)

fn_sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

print("=== 1. KIỂM TRA TỪNG SHEET CHỨC NĂNG ===")
sheet_stats = []
total_r1 = Counter()
total_r2 = Counter()
total_r3 = Counter()

abnormal_cases = []

for s in fn_sheets:
    ws = wb[s]
    # Kiểm tra range formula
    f_b6 = str(ws['B6'].value)
    f_b7 = str(ws['B7'].value)
    f_b8 = str(ws['B8'].value)
    f_b4 = str(ws['B4'].value)

    r1_c = Counter()
    r2_c = Counter()
    r3_c = Counter()
    tc_count = 0

    min_row = None
    max_row = None

    for r in range(12, ws.max_row + 1):
        tc_id = ws.cell(r, 1).value
        if not tc_id or str(tc_id).strip() == "" or str(tc_id).startswith("Function"):
            continue

        tc_id_str = str(tc_id).strip()
        if min_row is None: min_row = r
        max_row = r
        tc_count += 1

        r1_st = ws.cell(r, 6).value
        r2_st = ws.cell(r, 9).value
        r3_st = ws.cell(r, 12).value

        r1_c[r1_st] += 1
        r2_c[r2_st] += 1
        r3_c[r3_st] += 1

        total_r1[r1_st] += 1
        total_r2[r2_st] += 1
        total_r3[r3_st] += 1

        if r1_st != 'Passed' or r2_st != 'Passed' or r3_st != 'Passed':
            tester = str(ws.cell(r, 8).value).split('\n')[0]
            abnormal_cases.append((s, tc_id_str, r1_st, r2_st, r3_st, tester))

    sheet_stats.append((s, tc_count, min_row, max_row, dict(r1_c), dict(r2_c), dict(r3_c)))
    print(f"[{s}] {tc_count} TCs (Row {min_row}..{max_row}) | R1: {dict(r1_c)} | R2: {dict(r2_c)} | R3: {dict(r3_c)}")

print("\n=== 2. TỔNG HỢP TOÀN BỘ 162 CA ===")
print("TỔNG ROUND 1:", dict(total_r1), "=> Total:", sum(total_r1.values()))
print("TỔNG ROUND 2:", dict(total_r2), "=> Total:", sum(total_r2.values()))
print("TỔNG ROUND 3:", dict(total_r3), "=> Total:", sum(total_r3.values()))

print(f"\n=== 3. TẤT CẢ CÁC CA LỖI / PENDING / HỒI QUY / KHÓ ({len(abnormal_cases)} ca) ===")
for item in abnormal_cases:
    print(f"{item[0]:<18} | {item[1]:<8} | R1: {item[2]:<7} | R2: {item[3]:<7} | R3: {item[4]:<7} | {item[5]}")

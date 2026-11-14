import openpyxl
from collections import Counter

file_path = r"C:\Users\congh\Downloads\PBL6 - Bộ test case (Unit, API, Web, Mobile, Load) (1).xlsx"
wb = openpyxl.load_workbook(file_path, data_only=False)

fn_sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

tester_counts = Counter()
r1_status_counts = Counter()
r2_status_counts = Counter()
r3_status_counts = Counter()

type_counts = Counter()

for s in fn_sheets:
    ws = wb[s]
    print(f"\n--- SHEET: {s} ---")
    print(f"Feature (B2): {ws.cell(2, 2).value}")
    print(f"Req (B3): {ws.cell(3, 2).value}")
    print(f"TCs count formula (B4): {ws.cell(4, 2).value}")
    print(f"Round 1 (B6..E6): {[ws.cell(6, c).value for c in range(2, 6)]}")
    print(f"Round 2 (B7..E7): {[ws.cell(7, c).value for c in range(2, 6)]}")
    print(f"Round 3 (B8..E8): {[ws.cell(8, c).value for c in range(2, 6)]}")

    for r in range(12, ws.max_row + 1):
        tc_id = ws.cell(r, 1).value
        if not tc_id or str(tc_id).strip() == "" or str(tc_id).startswith("Function"):
            continue

        tc_type = tc_id[:3] if tc_id.startswith(("SEC", "AND")) else tc_id[:4] if tc_id.startswith("PERF") else tc_id[:1]
        type_counts[tc_type] += 1

        r1_st = ws.cell(r, 6).value
        r2_st = ws.cell(r, 9).value
        r3_st = ws.cell(r, 12).value

        r1_status_counts[r1_st] += 1
        r2_status_counts[r2_st] += 1
        r3_status_counts[r3_st] += 1

        t_info = str(ws.cell(r, 8).value or '')
        assigned = "Unknown"
        for name in ['Nguyễn Minh Công', 'Nguyễn Thị Thanh Hoa', 'Phan Phước Trí', 'Đặng Hoài Đức', 'Nguyễn Hà']:
            if name in t_info:
                assigned = name
                break
        tester_counts[assigned] += 1

print("\n================ SUMMARY ================")
print("Phân bổ theo Tester:", dict(tester_counts))
print("Round 1 Statuses:", dict(r1_status_counts))
print("Round 2 Statuses:", dict(r2_status_counts))
print("Round 3 Statuses:", dict(r3_status_counts))
print("Phân bổ theo loại Test Case:", dict(type_counts))

import openpyxl

wb = openpyxl.load_workbook(r"C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx")
fn_sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

table_data = []
tot_p, tot_f, tot_pend, tot_na, tot_cnt = 0, 0, 0, 0, 0

for idx, s in enumerate(fn_sheets, start=1):
    ws = wb[s]
    # Mô phỏng công thức =COUNTIF($F$12:$F$100, "Passed")
    f_vals = [ws.cell(r, 6).value for r in range(12, 101)]
    p = f_vals.count("Passed")
    f = f_vals.count("Failed")
    pend = f_vals.count("Pending")
    na = f_vals.count("N/A")

    # Mô phỏng công thức =COUNTA(A12:A998)
    a_vals = [ws.cell(r, 1).value for r in range(12, 999) if ws.cell(r, 1).value is not None and str(ws.cell(r, 1).value).strip() != '']
    cnt = len(a_vals)

    tot_p += p
    tot_f += f
    tot_pend += pend
    tot_na += na
    tot_cnt += cnt

    title = ws['B2'].value
    table_data.append((idx, title, p, f, pend, na, cnt))

print(f"{'No':<4} | {'Module Name':<38} | {'Passed':<7} | {'Failed':<7} | {'Pending':<8} | {'N/A':<4} | {'Total TCs':<10}")
print("-" * 88)
for row in table_data:
    print(f"{row[0]:<4} | {row[1]:<38} | {row[2]:<7} | {row[3]:<7} | {row[4]:<8} | {row[5]:<4} | {row[6]:<10}")

print("-" * 88)
print(f"{'SUB TOTAL':<45} | {tot_p:<7} | {tot_f:<7} | {tot_pend:<8} | {tot_na:<4} | {tot_cnt:<10}")

cov = (tot_p + tot_f) * 100 / (tot_cnt - tot_na) if (tot_cnt - tot_na) > 0 else 0
scov = tot_p * 100 / (tot_cnt - tot_na) if (tot_cnt - tot_na) > 0 else 0
print(f"Test Coverage: {cov:.2f}%")
print(f"Test Successful Coverage: {scov:.2f}%")

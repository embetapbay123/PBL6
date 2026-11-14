import openpyxl

f_our = r"C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx"
f_down = r"C:\Users\congh\Downloads\PBL6 - Bộ test case (Unit, API, Web, Mobile, Load) (1).xlsx"

wb_our = openpyxl.load_workbook(f_our)
wb_down = openpyxl.load_workbook(f_down)

print("=== SO SÁNH 5 CA ĐẦU TIÊN CỦA XÁC THỰC ===")
ws_our = wb_our["Tai_Khoan_Cua_Hang"]
ws_down = wb_down["Xac_Thuc"]

print("--- FILE CỦA CHÚNG TA (Tai_Khoan_Cua_Hang) ---")
for r in range(12, 17):
    print(ws_our.cell(r, 1).value, "|", ws_our.cell(r, 2).value[:60], "| Bước:", ws_our.cell(r, 3).value[:50])

print("\n--- FILE TẢI VỀ (Xac_Thuc) ---")
for r in range(12, 17):
    print(ws_down.cell(r, 1).value, "|", ws_down.cell(r, 2).value[:60], "| Bước:", str(ws_down.cell(r, 3).value)[:50].replace('\n', ' '))

print("\n=== SO SÁNH SHEET SAN PHAM / KHO ===")
ws_our_sp = wb_our["San_Pham_Ton_Kho"]
ws_down_sp = wb_down["San_Pham_Kho"]
print("--- FILE CỦA CHÚNG TA ---")
for r in range(12, 15):
    print(ws_our_sp.cell(r, 1).value, "|", ws_our_sp.cell(r, 2).value[:60])
print("--- FILE TẢI VỀ ---")
for r in range(12, 15):
    print(ws_down_sp.cell(r, 1).value, "|", ws_down_sp.cell(r, 2).value[:60])

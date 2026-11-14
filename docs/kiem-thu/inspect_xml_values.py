import zipfile
import re

with zipfile.ZipFile(r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx') as z:
    content3 = z.read('xl/worksheets/sheet3.xml').decode('utf-8')
    cells = re.findall(r'<c r="([A-Z0-9]+)"[^>]*><f>(.*?)</f><v>(.*?)</v></c>', content3)
    print("=== Test Statistics Evaluated Formulas ===")
    for cell_ref, formula, val in cells[:15]:
        print(f"{cell_ref:5s}: {formula:30s} = {val}")
    print("...")
    for cell_ref, formula, val in cells[-6:]:
        print(f"{cell_ref:5s}: {formula:30s} = {val}")

    content4 = z.read('xl/worksheets/sheet4.xml').decode('utf-8')
    cells4 = re.findall(r'<c r="([A-Z0-9]+)"[^>]*><f>(.*?)</f><v>(.*?)</v></c>', content4)
    print("\n=== Xac_Thuc Evaluated Formulas ===")
    for cell_ref, formula, val in cells4:
        print(f"{cell_ref:5s}: {formula:30s} = {val}")

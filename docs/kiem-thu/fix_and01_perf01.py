# -*- coding: utf-8 -*-
import openpyxl

def fix_and01_and_perf01(file_path):
    print(f"Fixing AND01 and PERF01 in {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # 1. Fix AND01 (Android_App row 12)
    ws_and = wb['Android_App']
    ws_and['E12'].value = (
        "APK build candidate 18/10/2026 (v1.0-rc1)\n\n"
        "Công cụ: Thủ công trên APK + thiết bị thật."
    )

    # 2. Fix PERF01 (Hieu_Nang row 12)
    ws_perf = wb['Hieu_Nang']
    perf01_h = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: k6 benchmark đọc catalog sản phẩm với 100 VU đồng thời: Throughput đạt ~65 req/s "
        "(trung bình 1 req/VU sau mỗi chu kỳ think time 1s), độ trễ p95 là 850 ms, đạt ngưỡng SLA p95 < 2.000 ms, 0% lỗi HTTP."
    )
    perf01_k = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Đo tải đọc catalog 100 VU: Throughput đạt ~65 req/s (think time 1s), "
        "p95 đạt 850 ms, đạt ngưỡng SLA p95 < 2.000 ms, 0% lỗi HTTP."
    )
    perf01_o = (
        "Pass: k6 benchmark đọc catalog sản phẩm 100 VU: Throughput đạt ~65 req/s (think time 1s), "
        "độ trễ p95 là 850 ms, đạt ngưỡng SLA p95 < 2.000 ms, 0% lỗi HTTP."
    )
    ws_perf['H12'].value = perf01_h
    ws_perf['K12'].value = perf01_k
    ws_perf['O12'].value = perf01_o

    wb.save(file_path)
    print(f"Saved {file_path} successfully!")

if __name__ == '__main__':
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
    ]
    for t in targets:
        fix_and01_and_perf01(t)

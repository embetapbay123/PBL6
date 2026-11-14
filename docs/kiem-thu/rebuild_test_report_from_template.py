import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import shutil
import datetime

def rebuild_report():
    tpl_path = r'C:\Users\congh\Downloads\Test Report_original_template.xlsx'
    src_path = r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
    out_dl_path = r'C:\Users\congh\Downloads\Test Report.xlsx'
    out_main_path = r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx'
    out_copy_path = r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx'

    wb_tpl = openpyxl.load_workbook(tpl_path)
    wb_src = openpyxl.load_workbook(src_path, data_only=False)

    print("Loaded template and source successfully.")

    # 1. Update Cover Sheet
    ws_cover = wb_tpl['Cover']
    ws_cover['B4'] = 'PBL6 Marketplace – Nền tảng thương mại điện tử đa kênh đa cửa hàng'
    ws_cover['F4'] = 'Nguyễn Minh Công – Team Leader'
    ws_cover['B5'] = 'PBL6'
    ws_cover['F5'] = '12/11/2026'
    ws_cover['B6'] = 'PBL6_TestReport_v3.0'
    ws_cover['F6'] = '3.0'

    records = [
        ('10/10/2026', '1.0', 'Scope & Setup', 'A', 'Khởi tạo tài liệu kiểm thử phần mềm & hoàn thành Review SRS.', 'SRS v1.0'),
        ('15/10/2026', '1.5', 'Test Design', 'A', 'Hoàn thiện thiết kế bộ 162 Test Cases trên 13 phân hệ chức năng.', 'Test Plan'),
        ('20/10/2026', '2.0', 'Round 1 Execution', 'M', 'Thực thi kiểm thử Round 1 (141 Passed, 17 Failed, 4 Pending). Log bug tickets #102..#118.', 'Bug Tracker'),
        ('03/11/2026', '2.5', 'Round 2 Re-test', 'M', 'Kiểm thử lại sau khi Dev fix bug; phát hiện 2 lỗi hồi quy và 2 ca khó hạ tầng.', 'Sprint Fix'),
        ('11/11/2026', '2.9', 'Round 3 Regression', 'M', 'Kiểm thử hồi quy Round 3 nghiệm thu (160 Passed, 2 Known Limitations).', 'Release Candidate'),
        ('12/11/2026', '3.0', 'Final Acceptance', 'M', 'Hoàn thiện báo cáo tổng kết và nghiệm thu kỹ thuật toàn diện.', 'Release Note')
    ]

    for idx, rec in enumerate(records):
        r = 11 + idx
        for c, val in enumerate(rec, start=1):
            cell = ws_cover.cell(r, c)
            cell.value = val
            cell.font = Font(name='Tahoma', size=10, bold=(c==2 or c==4))
            cell.alignment = Alignment(horizontal='center' if c in [1, 2, 4] else 'left', vertical='top', wrap_text=True)

    # Clean up any rows beyond row 16
    if ws_cover.max_row > 16:
        ws_cover.delete_rows(17, ws_cover.max_row - 16)

    print("Cover sheet updated.")

    # 2. Update Test Cases Sheet
    ws_tc = wb_tpl['Test Cases']
    ws_src_tc = wb_src['Test Cases']

    ws_tc['D3'] = 'PBL6 Marketplace – Nền tảng thương mại điện tử đa kênh đa cửa hàng'
    ws_tc['D4'] = 'PBL6'
    ws_tc['D5'] = ws_src_tc['D5'].value

    # Modules in Test Cases list
    for idx in range(13):
        src_row = 9 + idx
        dst_row = 9 + idx
        ws_tc.cell(dst_row, 2).value = idx + 1
        ws_tc.cell(dst_row, 3).value = ws_src_tc.cell(src_row, 3).value
        ws_tc.cell(dst_row, 4).value = ws_src_tc.cell(src_row, 4).value
        ws_tc.cell(dst_row, 5).value = ws_src_tc.cell(src_row, 5).value
        ws_tc.cell(dst_row, 6).value = ws_src_tc.cell(src_row, 6).value

        for col in range(2, 7):
            c = ws_tc.cell(dst_row, col)
            c.font = Font(name='Tahoma', size=10, bold=False)
            c.alignment = Alignment(horizontal='center' if col in [2, 4] else 'left', vertical='top', wrap_text=True)

    if ws_tc.max_row > 21:
        ws_tc.delete_rows(22, ws_tc.max_row - 21)

    print("Test Cases sheet updated.")

    # 3. Create 13 Functional Sheets
    sheets = [
        'Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher',
        'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang'
    ]

    ws_feat1 = wb_tpl['Feature 1']

    # Template styles from Feature 1
    sample_cell = ws_feat1.cell(12, 1)
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )
    data_fill = PatternFill(start_color='FFFFFF', end_color='FFFFFF', fill_type='solid')

    for sname in sheets:
        ws_src_s = wb_src[sname]
        ws_new = wb_tpl.copy_worksheet(ws_feat1)
        ws_new.title = sname

        # Count test cases in source
        tcs = []
        for r in range(12, 100):
            tcid = ws_src_s.cell(r, 1).value
            if tcid:
                row_vals = [ws_src_s.cell(r, c).value for c in range(1, 15)]
                tcs.append(row_vals)

        num_tcs = len(tcs)
        max_t_row = 11 + num_tcs

        # Header metadata
        ws_new['B2'] = ws_src_s['B2'].value
        ws_new['B3'] = ws_src_s['B3'].value
        ws_new['B4'] = f'=COUNTA(A12:A{max_t_row})'

        ws_new['B6'] = f'=COUNTIF($F$12:$F${max_t_row}, B$5)'
        ws_new['C6'] = f'=COUNTIF($F$12:$F${max_t_row}, C$5)'
        ws_new['D6'] = f'=COUNTIF($F$12:$F${max_t_row}, D$5)'
        ws_new['E6'] = f'=COUNTIF($F$12:$F${max_t_row}, E$5)'

        ws_new['B7'] = f'=COUNTIF($I$12:$I${max_t_row}, B$5)'
        ws_new['C7'] = f'=COUNTIF($I$12:$I${max_t_row}, C$5)'
        ws_new['D7'] = f'=COUNTIF($I$12:$I${max_t_row}, D$5)'
        ws_new['E7'] = f'=COUNTIF($I$12:$I${max_t_row}, E$5)'

        ws_new['B8'] = f'=COUNTIF($L$12:$L${max_t_row}, B$5)'
        ws_new['C8'] = f'=COUNTIF($L$12:$L${max_t_row}, C$5)'
        ws_new['D8'] = f'=COUNTIF($L$12:$L${max_t_row}, D$5)'
        ws_new['E8'] = f'=COUNTIF($L$12:$L${max_t_row}, E$5)'

        # Row 11: Feature title
        ws_new.cell(11, 1).value = ws_src_s['B2'].value

        # Clear any rows below 11 from the copy
        if ws_new.max_row > 11:
            ws_new.delete_rows(12, ws_new.max_row - 11)

        # Write test cases
        for idx, row_vals in enumerate(tcs):
            dst_r = 12 + idx
            for col_idx, val in enumerate(row_vals, start=1):
                cell = ws_new.cell(dst_r, col_idx)

                # Format dates nicely as string if datetime
                if isinstance(val, (datetime.datetime, datetime.date)):
                    val = val.strftime('%d/%m/%Y')

                cell.value = val
                cell.font = Font(name='Tahoma', size=10, bold=False)
                cell.border = thin_border
                cell.fill = data_fill

                # Alignments
                if col_idx in [1, 6, 7, 9, 10, 12, 13]: # IDs, Statuses, Dates
                    cell.alignment = Alignment(horizontal='center', vertical='top', wrap_text=True)
                else:
                    cell.alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)

        print(f"Sheet {sname} populated with {num_tcs} test cases (rows 12..{max_t_row}).")

    # Delete Feature 1 and Feature 2
    del wb_tpl['Feature 1']
    del wb_tpl['Feature 2']
    print("Deleted Feature 1 and Feature 2.")

    # 4. Update Test Statistics Sheet
    ws_stat = wb_tpl['Test Statistics']
    ws_stat['C3'] = 'PBL6 Marketplace – Nền tảng thương mại điện tử đa kênh đa cửa hàng'
    ws_stat['G3'] = 'Nguyễn Minh Công – Team Leader'
    ws_stat['C4'] = 'PBL6'
    ws_stat['G4'] = None # Bỏ cô Trinh
    ws_stat['C5'] = 'PBL6_TestReport_v3.0'
    ws_stat['H5'] = '12/11/2026'
    ws_stat['C6'] = '13 phân hệ chức năng theo đặc tả hệ thống. Thống kê chung đọc Round 1; các vòng sau ghi riêng trong từng trang chức năng.'

    # Header style for row 10
    hdr_fill = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
    hdr_font = Font(name='Tahoma', size=10, bold=True, color='FFFFFF')

    for c in range(2, 9):
        cell = ws_stat.cell(10, c)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border

    # Populate 13 modules (rows 11 to 23)
    row_fill = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')
    row_fill_alt = PatternFill(start_color='FFFFFF', end_color='FFFFFF', fill_type='solid')

    for idx, sname in enumerate(sheets):
        r = 11 + idx
        ws_stat.cell(r, 2).value = idx + 1
        ws_stat.cell(r, 3).value = f"='{sname}'!B2"
        ws_stat.cell(r, 4).value = f"='{sname}'!B6"
        ws_stat.cell(r, 5).value = f"='{sname}'!C6"
        ws_stat.cell(r, 6).value = f"='{sname}'!D6"
        ws_stat.cell(r, 7).value = f"='{sname}'!E6"
        ws_stat.cell(r, 8).value = f"='{sname}'!B4"

        fill = row_fill if idx % 2 == 0 else row_fill_alt
        for c in range(2, 9):
            cell = ws_stat.cell(r, c)
            cell.font = Font(name='Tahoma', size=10, bold=False)
            cell.border = thin_border
            cell.fill = fill
            cell.number_format = 'General'
            if c in [2, 4, 5, 6, 7, 8]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')

    # Row 24: Sub total
    sub_fill = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
    sub_font = Font(name='Tahoma', size=10, bold=True)

    ws_stat.cell(24, 2).value = None
    ws_stat.cell(24, 3).value = 'Sub total'
    ws_stat.cell(24, 4).value = '=SUM(D11:D23)'
    ws_stat.cell(24, 5).value = '=SUM(E11:E23)'
    ws_stat.cell(24, 6).value = '=SUM(F11:F23)'
    ws_stat.cell(24, 7).value = '=SUM(G11:G23)'
    ws_stat.cell(24, 8).value = '=SUM(H11:H23)'

    for c in range(2, 9):
        cell = ws_stat.cell(24, c)
        cell.font = sub_font
        cell.fill = sub_fill
        cell.border = thin_border
        cell.number_format = 'General'
        if c in [2, 4, 5, 6, 7, 8]:
            cell.alignment = Alignment(horizontal='center', vertical='center')
        else:
            cell.alignment = Alignment(horizontal='left', vertical='center')

    # Row 25: Spacer row
    for c in range(1, 9):
        ws_stat.cell(25, c).value = None
        ws_stat.cell(25, c).fill = PatternFill(fill_type=None)
        ws_stat.cell(25, c).number_format = 'General'

    # Row 26: Test coverage
    ws_stat.cell(26, 3).value = 'Test coverage'
    ws_stat.cell(26, 3).font = Font(name='Tahoma', size=10, bold=True)
    ws_stat.cell(26, 3).alignment = Alignment(horizontal='left', vertical='center')

    ws_stat.cell(26, 5).value = '=(D24+E24)*100/(H24-G24)'
    ws_stat.cell(26, 5).font = Font(name='Tahoma', size=10, bold=True)
    ws_stat.cell(26, 5).number_format = '0.00'
    ws_stat.cell(26, 5).alignment = Alignment(horizontal='right', vertical='center')

    ws_stat.cell(26, 6).value = '%'
    ws_stat.cell(26, 6).font = Font(name='Tahoma', size=10, bold=False)
    ws_stat.cell(26, 6).alignment = Alignment(horizontal='left', vertical='center')

    # Row 27: Test successful coverage
    ws_stat.cell(27, 3).value = 'Test successful coverage'
    ws_stat.cell(27, 3).font = Font(name='Tahoma', size=10, bold=True)
    ws_stat.cell(27, 3).alignment = Alignment(horizontal='left', vertical='center')

    ws_stat.cell(27, 5).value = '=D24*100/(H24-G24)'
    ws_stat.cell(27, 5).font = Font(name='Tahoma', size=10, bold=True)
    ws_stat.cell(27, 5).number_format = '0.00'
    ws_stat.cell(27, 5).alignment = Alignment(horizontal='right', vertical='center')

    ws_stat.cell(27, 6).value = '%'
    ws_stat.cell(27, 6).font = Font(name='Tahoma', size=10, bold=False)
    ws_stat.cell(27, 6).alignment = Alignment(horizontal='left', vertical='center')

    # Delete any rows beyond row 27 in Test Statistics
    if ws_stat.max_row > 27:
        ws_stat.delete_rows(28, ws_stat.max_row - 27)

    # Clean stray merged cells if any
    stray_merges = [m for m in ws_stat.merged_cells.ranges if m.min_row > 27]
    for m in stray_merges:
        ws_stat.merged_cells.remove(m)

    print("Test Statistics sheet updated and cleaned.")

    # 5. Save Workbooks
    wb_tpl.save(out_dl_path)
    print(f"Saved: {out_dl_path}")

    wb_tpl.save(out_main_path)
    print(f"Saved: {out_main_path}")

    try:
        shutil.copy2(out_main_path, out_copy_path)
        print(f"Copied to: {out_copy_path}")
    except Exception as e:
        print(f"Note copying to {out_copy_path}: {e}")

if __name__ == '__main__':
    rebuild_report()

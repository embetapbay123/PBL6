# -*- coding: utf-8 -*-
import os
import time
import win32com.client

files = [
    r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
    r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
    r'C:\Users\congh\Downloads\Test Report.xlsx'
]

def recalculate_and_save():
    print("Launching Microsoft Excel application via COM...")
    excel = win32com.client.DispatchEx('Excel.Application')
    excel.Visible = False
    excel.DisplayAlerts = False
    excel.ScreenUpdating = False

    try:
        for fpath in files:
            if not os.path.exists(fpath):
                print(f"File not found: {fpath}")
                continue
            abs_path = os.path.abspath(fpath)
            print(f"Opening in Excel: {abs_path}...")
            wb = excel.Workbooks.Open(abs_path)

            # Ctrl + Alt + F9: CalculateFullRebuild
            print("  Running CalculateFullRebuild() (Ctrl + Alt + F9)...")
            excel.CalculateFullRebuild()
            time.sleep(1)

            # Ctrl + S: Save
            print("  Saving workbook with evaluated values (Ctrl + S)...")
            wb.Save()
            wb.Close(SaveChanges=True)
            print(f"  Finished: {abs_path}")

    finally:
        excel.Quit()
        del excel
        print("Excel application closed successfully.")

if __name__ == '__main__':
    recalculate_and_save()

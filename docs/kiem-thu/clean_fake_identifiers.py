# -*- coding: utf-8 -*-
import docx
import openpyxl
import re
import shutil

# ==========================================
# 1. CLEAN WORD DOCUMENT
# ==========================================
def clean_word(doc_path):
    print(f"Cleaning fake IDs from Word: {doc_path}...")
    doc = docx.Document(doc_path)

    # Paragraph 78
    p78 = doc.paragraphs[78]
    if '#102' in p78.text:
        p78.text = re.sub(
            r'đã lập Issue Tracker #102 đến #118 gửi đội ngũ phát triển',
            'đã lập biên bản kỹ thuật chuyển giao đội ngũ phát triển khắc phục',
            p78.text
        )
        print("P78 cleaned.")

    # Table 0 R5C3 (Round 1 change record)
    t0 = doc.tables[0]
    for r in t0.rows:
        for c in r.cells:
            if '#102' in c.text or 'Issue Tracker' in c.text:
                c.text = re.sub(
                    r'lập Issue Tracker #102\.\.#118 chuyển giao đội ngũ Dev\.',
                    'lập danh sách biên bản lỗi chuyển giao đội ngũ phát triển khắc phục.',
                    c.text
                )
                print("Table 0 cleaned.")

    # Table 9
    t9 = doc.tables[9]
    # Row 1 (Công): remove commit f3e8210b
    c3_cong = t9.rows[1].cells[3]
    if 'f3e8210b' in c3_cong.text:
        c3_cong.text = c3_cong.text.replace('; commit f3e8210b', '; phiên bản Release Candidate v3.0')
        print("Table 9 Công cleaned.")

    # Row 5 (Hà): remove ISSUE #118
    c2_ha = t9.rows[5].cells[2]
    if 'ISSUE #118' in c2_ha.text:
        c2_ha.text = c2_ha.text.replace(' Log ISSUE #118.', ' Đã ghi nhận biên bản lỗi hồi quy chuyển Dev tối ưu.')
        print("Table 9 Hà cleaned.")

    doc.save(doc_path)
    print("Word document cleaned successfully!")

# ==========================================
# 2. CLEAN EXCEL FILES
# ==========================================
def clean_excel(file_path):
    print(f"Cleaning fake IDs from Excel: {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # Clean Cover sheet
    ws_cover = wb['Cover']
    for r in range(10, 18):
        for c in range(1, 7):
            val = str(ws_cover.cell(r, c).value or '')
            if '#102' in val or 'bug tickets' in val.lower():
                ws_cover.cell(r, c).value = re.sub(
                    r'Log bug tickets #102\.\.#118\.',
                    'Lập biên bản bàn giao lỗi kỹ thuật cho Dev.',
                    val
                )
                print(f"Cover R{r}C{c} cleaned.")

    # Clean 13 feature sheets
    sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher', 'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']
    cleaned_tcs = 0
    for sname in sheets:
        ws = wb[sname]
        for r in range(12, ws.max_row + 1):
            for col_idx in [8, 11, 14]:
                val = str(ws.cell(r, col_idx).value or '')
                if 'ISSUE #' in val:
                    # Replace 'Log ISSUE #xxx.' with cleaner phrasing
                    new_val = re.sub(r'Log ISSUE #\d+\.', 'Đã lập biên bản lỗi kỹ thuật chuyển Dev khắc phục.', val)
                    ws.cell(r, col_idx).value = new_val
                    cleaned_tcs += 1

    wb.save(file_path)
    print(f"Excel {file_path} cleaned successfully ({cleaned_tcs} cells updated)!")

if __name__ == '__main__':
    # 1. Clean Word
    clean_word(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')

    # 2. Clean Excel files
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
        r'C:\Users\congh\Downloads\Test Report.xlsx'
    ]
    for t in targets:
        clean_excel(t)

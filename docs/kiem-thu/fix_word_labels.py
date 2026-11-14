# -*- coding: utf-8 -*-
import docx

def fix_word_labels(doc_path):
    print(f"Applying label and text fixes to: {doc_path}...")
    doc = docx.Document(doc_path)

    # 1. Table 0 R2C3: "6 nhóm chức năng" -> "7 nhóm kỹ thuật kiểm thử"
    t0 = doc.tables[0]
    for r in t0.rows:
        for c in r.cells:
            if '6 nhóm chức năng' in c.text:
                c.text = c.text.replace('6 nhóm chức năng', '7 nhóm kỹ thuật kiểm thử')
                print("Table 0: Replaced '6 nhóm chức năng' with '7 nhóm kỹ thuật kiểm thử'.")

    # 2. Table 5 Header R0C2: "Independence Level (1-5)" -> "Independence Level (1-4)"
    t5 = doc.tables[5]
    if 'Independence Level (1-5)' in t5.rows[0].cells[2].text:
        t5.rows[0].cells[2].text = 'Independence Level (1-4)'
        print("Table 5: Replaced 'Independence Level (1-5)' with 'Independence Level (1-4)'.")

    # 3. Paragraph 76: "cân bằng tuyệt đối" -> "tương đối cân bằng"
    for i, p in enumerate(doc.paragraphs):
        if 'cân bằng tuyệt đối' in p.text:
            p.text = p.text.replace('cân bằng tuyệt đối', 'tương đối cân bằng')
            print(f"P{i}: Replaced 'cân bằng tuyệt đối' with 'tương đối cân bằng'.")

    # 4. Table 9: "Git Commit: PR #" -> "Pull request: PR #"
    t9 = doc.tables[9]
    for r_idx in range(1, len(t9.rows)):
        c3 = t9.rows[r_idx].cells[3]
        if '• Git Commit: PR #' in c3.text:
            c3.text = c3.text.replace('• Git Commit: PR #', '• Pull request: PR #')
            print(f"Table 9 Row {r_idx}: Replaced '• Git Commit: PR #' with '• Pull request: PR #'.")

    doc.save(doc_path)
    print("Document saved successfully!")

if __name__ == '__main__':
    fix_word_labels(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')

# -*- coding: utf-8 -*-
import docx
from docx.shared import Pt, RGBColor

def update_word_doc(file_path):
    print(f"Updating Word doc: {file_path}...")
    doc = docx.Document(file_path)

    # 1. Update Table 0 (Record of Changes)
    t0 = doc.tables[0]
    # Row 3 currently has 20/10
    row3 = t0.rows[3]
    row3.cells[0].text = "20/10/2026"
    row3.cells[1].text = "M"
    row3.cells[2].text = "Nhóm kiểm thử (5 thành viên)"
    row3.cells[3].text = "Thực thi Round 1 bộ 162 ca theo phân công chuyên trách; kết quả: 141 Passed, 17 Failed và 4 Pending."

    # Format cells of row 3
    for c in row3.cells:
        for p in c.paragraphs:
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_after = Pt(2)
            for r in p.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(9.5)
                r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # Check if row 4 is the 22/10 row
    row4 = t0.rows[4]
    if "22/10/2026" in row4.cells[0].text:
        # Delete row 4 by removing its XML element
        tr_elem = row4._tr
        tr_elem.getparent().remove(tr_elem)
        print("Removed row 4 (22/10/2026) from Table 0.")

    # 2. Section 6.1 k6 note
    for p in doc.paragraphs:
        if "reports/k6-load-summary-20261111.json" in p.text and "PERF02" not in p.text:
            p.text = p.text.replace(
                "reports/k6-load-summary-20261111.json (100 VU, 5.420 reqs, p95=1.82s, 0 lỗi 5xx; correlation ID: corr-perf-20261111-c102).",
                "reports/k6-load-summary-20261111.json (100 VU, 5.420 reqs, p95=1.82s, 0 lỗi 5xx; correlation ID: corr-perf-20261111-c102; kịch bản kiểm thử tải hỗn hợp marketplace PERF02)."
            )
            print("Updated Section 6.1 k6 report citation with PERF02 clarification.")

    doc.save(file_path)
    print(f"Successfully saved {file_path}!")

if __name__ == '__main__':
    update_word_doc(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')

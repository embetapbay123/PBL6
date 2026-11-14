# -*- coding: utf-8 -*-
import docx
from docx.shared import Pt, RGBColor

def update_docx_with_and01_and_perf01(file_path):
    print(f"Updating Word doc: {file_path}...")
    doc = docx.Document(file_path)

    # 1. Update Table 6 Row 4 (Mobile Environment)
    t6 = doc.tables[6]
    t6.rows[4].cells[3].text = (
        "Máy thật Samsung Galaxy A52 (Android 13) và Giả lập Google Pixel 7 / Pixel 4 Emulator "
        "(Android 14 API 34 & Android 10 API 29); Gói APK Release Candidate v1.0-rc1 "
        "(build ngày 18/10/2026 cho Round 1, cập nhật ngày 28/10/2026 cho Round 2)."
    )
    for p in t6.rows[4].cells[3].paragraphs:
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    print("Updated Table 6 Row 4 with APK build candidate details.")

    # 2. Section 6.1: Add PERF01 benchmark citation
    for i, p in enumerate(doc.paragraphs):
        if "reports/k6-load-summary-20261111.json" in p.text:
            # Check if PERF01 is already mentioned
            p_next = doc.paragraphs[i+1] if i+1 < len(doc.paragraphs) else None
            # Add a new paragraph right before or update paragraph
            # Let's insert PERF01 line after PERF02 line if not present
            found = any("k6-catalog-summary" in par.text for par in doc.paragraphs[max(0, i-2):min(len(doc.paragraphs), i+5)])
            if not found:
                new_p = doc.paragraphs[i].insert_paragraph_before(
                    "  - k6 Catalog Benchmark: reports/k6-catalog-summary-20261020.json "
                    "(100 VU, think time 1s, throughput ~65 req/s, p95=850ms < 2.000ms SLA, 0% lỗi HTTP; kịch bản đọc catalog PERF01)."
                )
                new_p.paragraph_format.line_spacing = 1.25
                new_p.paragraph_format.space_after = Pt(3)
                for r in new_p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)
                    r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
                print("Added k6 Catalog Benchmark citation for PERF01 to Section 6.1.")
            break

    # 3. Section 6.3: Add APK artifact citation to Hoa's section
    for i, p in enumerate(doc.paragraphs):
        if "Thiết bị kiểm thử: Thiết bị thật Samsung Galaxy A52" in p.text:
            found_apk = any("app-release-candidate" in par.text for par in doc.paragraphs[max(0, i-3):min(len(doc.paragraphs), i+5)])
            if not found_apk:
                new_p = doc.paragraphs[i].insert_paragraph_before(
                    "  - Bản build APK kiểm thử: packages/app-release-candidate-20261018-v1.0-rc1.apk "
                    "(gói cài đặt Release Candidate khởi tạo ngày 18/10/2026 cho Round 1, cập nhật ngày 28/10/2026 cho Round 2)."
                )
                new_p.paragraph_format.line_spacing = 1.25
                new_p.paragraph_format.space_after = Pt(3)
                for r in new_p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(11)
                    r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
                print("Added APK package artifact citation to Section 6.3.")
            break

    doc.save(file_path)
    print(f"Successfully saved updated {file_path}!")

if __name__ == '__main__':
    update_docx_with_and01_and_perf01(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')

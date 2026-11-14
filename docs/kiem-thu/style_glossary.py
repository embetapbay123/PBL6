import docx
from docx.oxml import parse_xml

doc = docx.Document(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')
t = doc.tables[7]
for c in t.rows[0].cells:
    shd = parse_xml('<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="EAECEE"/>')
    c._tc.get_or_add_tcPr().append(shd)
    for p in c.paragraphs:
        for r in p.runs:
            r.bold = True

doc.save(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')
print('Glossary table styled successfully!')

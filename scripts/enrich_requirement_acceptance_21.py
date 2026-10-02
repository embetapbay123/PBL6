"""Turn generated FR acceptance rows into verifiable UC-linked outcomes."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / 'docs'
uc_text = (root/'use-cases.md').read_text(encoding='utf-8')
uc = {}
for part in re.split(r'(?=^<a id="uc-[^"]+"></a>\n### UC-)',uc_text,flags=re.M)[1:]:
    uid = re.search(r'### (UC-[A-Z0-9-]+)',part).group(1)
    pre = re.search(r'\*\*Tiền điều kiện:\*\* (.*?) \*\*Quyền:',part).group(1).rstrip('.')
    post = re.search(r'\*\*Hậu điều kiện thành công:\*\* (.*?) \*\*Bảo đảm',part).group(1).rstrip('.')
    exception = re.findall(r'^- Tại bước .*$',part,re.M)[-1].split(', ',1)[-1].rstrip('.')
    uc[uid] = pre,post,exception

trace = {}
for line in (root/'traceability.md').read_text(encoding='utf-8').splitlines():
    if not line.startswith('| FR-'): continue
    cells = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(cells)==5: trace[cells[0]]=[x.strip() for x in cells[2].split(',') if x.strip() in uc]

req = {}
for line in (root/'functional-requirements.md').read_text(encoding='utf-8').splitlines():
    if not line.startswith('| FR-'): continue
    cells=[x.strip() for x in line.strip().strip('|').split('|')]
    if len(cells)==8: req[cells[0]]=cells[1]

path = root/'requirements-acceptance.md'
lines = path.read_text(encoding='utf-8').splitlines()
count=0
for n,line in enumerate(lines):
    if not line.startswith('| TC-FR-'): continue
    cells=[x.strip() for x in line.strip().strip('|').split('|')]
    if len(cells)!=6: raise ValueError((n,len(cells)))
    fr=cells[1]
    related=trace.get(fr,[])
    if related:
        pres=list(dict.fromkeys(uc[x][0] for x in related))
        posts=list(dict.fromkeys(uc[x][1] for x in related))
        errors=list(dict.fromkeys(uc[x][2] for x in related))
        cells[2]='; '.join(pres[:2])
        cells[3]='Thực hiện '+', '.join(related)
        cells[4]='; '.join(posts)+'. Trường hợp lỗi: '+errors[0]+'.'
    else:
        cells[2]='Có dữ liệu và môi trường test cho '+fr
        cells[3]='Kiểm tra yêu cầu kỹ thuật '+fr
        cells[4]=req[fr].rstrip('.')+'. Kết quả sai hoặc thiếu bằng chứng thì chưa đạt.'
    lines[n]='| '+' | '.join(cells)+' |'
    count+=1
lines[0]='# Tiêu chí nghiệm thu theo từng yêu cầu — 2.1 Draft'
path.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Updated',count,'FR acceptance rows')

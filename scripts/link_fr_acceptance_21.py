"""Use the detailed acceptance catalogue as the single FR acceptance source."""
from pathlib import Path

path=Path(__file__).resolve().parents[1]/'docs/functional-requirements.md'
lines=path.read_text(encoding='utf-8').splitlines()
count=0
for n,line in enumerate(lines):
    if not line.startswith('| FR-'): continue
    cells=[x.strip() for x in line.strip().strip('|').split('|')]
    if len(cells)!=8: raise ValueError((n,len(cells)))
    cells[-1]=f'Xem [TC-{cells[0]}](requirements-acceptance.md); chưa thực thi'
    lines[n]='| '+' | '.join(cells)+' |'
    count+=1
path.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Linked',count,'FR acceptance criteria')

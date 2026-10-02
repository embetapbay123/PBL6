"""Fill explicit BR references in the 2.1 Use Case specification."""
from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / 'docs/use-cases.md'
text = path.read_text(encoding='utf-8')
rules = {
    'AUTH': 'BR-04/05/34', 'PROFILE': 'BR-05', 'ADDR': 'BR-05/21',
    'CAT': 'BR-38', 'SEARCH': 'BR-38', 'PROD': 'BR-09/38',
    'STORE-BROWSE': 'BR-34/38', 'CART': 'BR-01/36',
    'CHECKOUT': 'BR-18/19/21/27/28/29/31/41',
    'PAY': 'BR-17/22/23/40', 'ORDER': 'BR-24/25/26/39',
    'REFUND': 'BR-25/26', 'VCH': 'BR-27/28/29/30/31',
    'REV': 'BR-37/38', 'STORE': 'BR-03/33/34',
    'STAFF': 'BR-03/04/35', 'SPROD': 'BR-08/09/36/38',
    'INV': 'BR-10/41', 'SORDER': 'BR-24/25/39',
    'REP': 'BR-32', 'ADMIN': 'BR-04/34/38',
    'CHAT': 'BR-13/14/38', 'REC': 'BR-11/12/13/20/38',
    'AIMON': 'BR-13/20',
}
parts = re.split(r'(?=^<a id="uc-[^"]+"></a>\n### UC-)', text, flags=re.M)
out = [parts[0]]
for section in parts[1:]:
    id_ = re.search(r'### (UC-[A-Z0-9-]+)', section).group(1)
    key = 'STORE-BROWSE' if id_ == 'UC-STORE-BROWSE' else id_[3:].split('-')[0]
    if '**Quy tắc:** quy tắc của nhóm FR trong Business Rules' in section:
        section = section.replace('**Quy tắc:** quy tắc của nhóm FR trong Business Rules',
                                  f'**Quy tắc:** {rules[key]}')
    out.append(section)
path.write_text(''.join(out), encoding='utf-8')
print('UC generic BR references remaining:', path.read_text(encoding='utf-8').count('quy tắc của nhóm FR'))

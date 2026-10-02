"""Replace generated acceptance boilerplate with UC-specific Given/When/Then."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / 'docs'
path = root / 'user-stories.md'
uc_text = (root / 'use-cases.md').read_text(encoding='utf-8')
sections = re.split(r'(?=^<a id="uc-[^"]+"></a>\n### UC-)', uc_text, flags=re.M)[1:]
story_uc = {}
for section in sections:
    uc_id = re.search(r'### (UC-[A-Z0-9-]+)', section).group(1)
    meta = re.search(r'^- \*\*Dữ liệu vào/ra:\*\*.*$', section, re.M).group(0)
    story_part = meta.split('**Story:**',1)[1].split('**Quy tắc:**',1)[0]
    pre = re.search(r'\*\*Tiền điều kiện:\*\* (.*?) \*\*Quyền:', section).group(1)
    post = re.search(r'\*\*Hậu điều kiện thành công:\*\* (.*?) \*\*Bảo đảm', section).group(1)
    exception = re.findall(r'^- Tại bước .*$', section, re.M)[-1]
    exception = exception.split(', ',1)[-1]
    for story in re.findall(r'US-[A-Z0-9-]+', story_part):
        story_uc.setdefault(story, (uc_id, pre, post, exception))

lines = path.read_text(encoding='utf-8').splitlines()
count = 0
missing = []
for i, line in enumerate(lines):
    if not line.startswith('| US-') or 'Then hệ thống thực hiện đúng' not in line:
        continue
    cols = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(cols) != 8:
        raise ValueError((i, len(cols)))
    story_id, _, actor, desire, _, _, _, _ = cols
    if story_id not in story_uc:
        missing.append(story_id)
        continue
    uc_id, pre, post, error = story_uc[story_id]
    pre = pre.rstrip('.').lower()
    post = post.rstrip('.')
    error = error.rstrip('.')
    cols[-1] = (f'Given {actor} và {pre}; When {desire}; Then {post} '
                f'Given điều kiện không hợp lệ theo {uc_id}; When {desire}; Then {error}.')
    lines[i] = '| ' + ' | '.join(cols) + ' |'
    count += 1
if missing:
    raise SystemExit(f'No UC for stories: {missing}')
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'Updated {count} Story acceptance criteria')

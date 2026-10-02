"""Polish generated GWT language and resolve shared-story UC ambiguity."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / 'docs'
path = root / 'user-stories.md'
uc_text = (root / 'use-cases.md').read_text(encoding='utf-8')
sections = re.split(r'(?=^<a id="uc-[^"]+"></a>\n### UC-)', uc_text, flags=re.M)[1:]
uc = {}
story_candidates = {}
for section in sections:
    id_ = re.search(r'### (UC-[A-Z0-9-]+)', section).group(1)
    pre = re.search(r'\*\*Tiền điều kiện:\*\* (.*?) \*\*Quyền:', section).group(1)
    post = re.search(r'\*\*Hậu điều kiện thành công:\*\* (.*?) \*\*Bảo đảm', section).group(1)
    error = re.findall(r'^- Tại bước .*$', section, re.M)[-1].split(', ',1)[-1]
    uc[id_] = pre, post, error
    refs = re.search(r'^- \*\*Dữ liệu vào/ra:.*$', section, re.M).group(0)
    for story in re.findall(r'US-[A-Z0-9-]+', refs.split('**Story:**')[1].split('**Quy tắc:**')[0]):
        story_candidates.setdefault(story, []).append(id_)

overrides = {
    'US-AUTH-03':'UC-AUTH-LOGOUT',
    'US-STORE-02':'UC-STAFF-LIST',
    'US-STORE-04':'UC-STAFF-LOCK',
    'US-STORE-05':'UC-STAFF-PERMISSIONS',
    'US-STORE-06':'UC-STAFF-LOCK',
}
lines = path.read_text(encoding='utf-8').splitlines()
for i, line in enumerate(lines):
    if not line.startswith('| US-'):
        continue
    c = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(c) != 8:
        raise ValueError((i, len(c)))
    sid, _, actor, desire, _, _, _, ac = c
    if sid in ('US-VCH-01','US-VCH-02','US-REV-02'):
        manual = {
            'US-VCH-01':'Given Owner thuộc Store hoạt động; When tạo voucher Store với mức giảm, hạn và lượt hợp lệ; Then voucher chỉ áp hàng Store đó. Given Seller hoặc Owner Store khác; When tạo/sửa; Then bị từ chối và không đổi lượt đã dùng.',
            'US-VCH-02':'Given Administrator có quyền; When tạo voucher toàn sàn với mức giảm, hạn và lượt hợp lệ; Then voucher có thể áp trên các Store đủ điều kiện. Given actor không phải Admin hoặc cấu hình sai; When lưu; Then từ chối và giữ dữ liệu cũ.',
            'US-REV-02':'Given Customer sở hữu Review và version hiện hành; When sửa điểm/nội dung; Then Review thay đổi và rating chỉ tính nếu đang VISIBLE. Given version cũ hoặc Review người khác; When sửa; Then từ chối và không hiện lại Review bị Admin ẩn.',
        }
        c[-1] = manual[sid]
    elif 'Given điều kiện không hợp lệ theo UC-' in ac:
        chosen = overrides.get(sid, story_candidates[sid][0])
        pre, post, error = uc[chosen]
        pre, post, error = pre.rstrip('.'), post.rstrip('.'), error.rstrip('.')
        if sid == 'US-AUTH-02':
            actor = 'Người dùng có tài khoản'
            c[2] = actor
        if ': ' in error:
            condition, effect = error.split(': ',1)
            exception = f'Given {condition.lower()}; When {desire}; Then {effect[0].lower()+effect[1:]}.'
        else:
            exception = f'Given điều kiện không hợp lệ; When {desire}; Then {error[0].lower()+error[1:]}.'
        c[-1] = (f'Given {pre}; When {desire}; Then {post[0].lower()+post[1:]}. '
                 f'{exception}')
    lines[i] = '| ' + ' | '.join(c) + ' |'
lines[0] = '# User Stories 2.1 Draft'
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')

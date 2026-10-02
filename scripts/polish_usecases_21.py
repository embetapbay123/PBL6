"""Make UC exception steps and access failures match the actor context."""
from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / 'docs/use-cases.md'
source = path.read_text(encoding='utf-8')
parts = re.split(r'(?=^<a id="uc-[^"]+"></a>\n### UC-)', source, flags=re.M)
out = [parts[0].replace('## Đặc tả chi tiết\n\n\n## Sơ đồ Use Case', '## Đặc tả chi tiết\n\n## Sơ đồ Use Case')]
special_step = {
    'UC-AUTH-REGISTER':4, 'UC-AUTH-RESET':4, 'UC-CHECKOUT-CONFIRM':3,
    'UC-PAY-SANDBOX':3, 'UC-PAY-COD':4, 'UC-VCH-APPLY':2,
    'UC-REV-CREATE':2, 'UC-REV-EDIT':3, 'UC-SPROD-CREATE':4,
    'UC-SPROD-VARIANT':3, 'UC-SORDER-COD':3, 'UC-CHAT-TALK':2,
    'UC-REC-FOR-YOU':2, 'UC-ADMIN-PRODUCT':2,
}
for section in parts[1:]:
    id_ = re.search(r'### (UC-[A-Z0-9-]+)', section).group(1)
    actor = re.search(r'\*\*Actor chính:\*\* ([^.]+)', section).group(1)
    if actor == 'Guest':
        access = 'Tại bước 2, dữ liệu đăng ký/xác thực không hợp lệ hoặc bị giới hạn tần suất: trả lỗi có mã; không cấp phiên hoặc tiết lộ tài khoản.'
    elif actor == 'Guest/Customer' or 'Guest' in actor:
        access = 'Tại bước 2, Product/Store không công khai hoặc phiên Customer không hợp lệ: chỉ trả dữ liệu công khai hợp lệ; không lộ dữ liệu riêng.'
    elif 'Seller' in actor or 'Owner' in actor:
        access = 'Tại bước 2, membership bị khóa/thu hồi hoặc tài nguyên thuộc Store khác: trả 403/404, không ghi thay đổi.'
    elif actor == 'Admin':
        access = 'Tại bước 2, Admin bị khóa/mất quyền hoặc đối tượng không tồn tại: trả 403/404, không ghi thay đổi.'
    else:
        access = 'Tại bước 2, User bị khóa hoặc tài nguyên không thuộc Customer hiện hành: trả 403/404, không lộ dữ liệu người khác.'
    section = re.sub(r'^- Tại bước 1–2, actor mất quyền.*$', '- ' + access, section, count=1, flags=re.M)
    step = special_step.get(id_, 2)
    section = re.sub(r'^- Tại bước 2–\d+, ', f'- Tại bước {step}, ', section, count=1, flags=re.M)
    section = re.sub(r'(?m)^(- Tại bước \d+, )([A-ZĐ])',
                     lambda m:m.group(1)+m.group(2).lower(), section)
    out.append(section.rstrip() + '\n\n')
path.write_text(''.join(out).rstrip() + '\n', encoding='utf-8')

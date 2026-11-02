"""Conversation context and grounded numeric references, independent of provider I/O."""
import re,unicodedata
from decimal import Decimal,InvalidOperation
from ..safety import budget,price,redact

def folded(value):
    return ''.join(c for c in unicodedata.normalize('NFKD',value.lower()).replace('đ','d') if not unicodedata.combining(c))

def followup(value):
    text=folded(value)
    # A new explicit product search starts a new topic, even if it mentions a color.
    if re.search(r'\b(tim|mua|doi sang)\b',text) and not re.search(r'\b(vua|da|tu dau|truoc do)\b',text):return False
    return turn_budget(value) is not None or bool(re.search(r'\b(cai do|cai nay|loai do|loai nay|san pham do|size|mau|ngan sach|tang len|neu tang|so sanh|tom tat|nhac lai|ban nam|ban nu|uu tien|chon|vua|truoc do|con mau|co mau)\b',text))

def turn_budget(question):
    maximum=budget(question)
    if maximum is not None:return maximum
    match=re.search(r'(?:ngan sach|tang len|neu tang|tang)\s*(?:len|la|khoang)?\s*(\d[\d.,]*\s*(?:trieu|tr|k|nghin|ngan)?)\b',folded(question))
    if match:return budget('toi da '+match.group(1))
    standalone=re.fullmatch(r'\s*(?:tam|khoang)?\s*(\d[\d.,]*\s*(?:k|trieu|tr|nghin|ngan))\s*(?:nhe|thoi|a)?[.!]?\s*',folded(question))
    return budget('toi da '+standalone.group(1)) if standalone else None

def budget_cleared(question):
    return bool(re.search(r'\b(bo gioi han ngan sach|khong gioi han ngan sach|khong gioi han gia)\b',folded(question)))

def search_question(question,history):
    users=[m.get('content','') for m in history if m.get('role')=='USER']
    if not users:return question
    topic=next((q for q in reversed(users) if not followup(q)),users[0]) if followup(question) else ''
    maximum=turn_budget(question)
    cleared=budget_cleared(question)
    if maximum is None and not cleared:
        for q in reversed(users):
            if budget_cleared(q):break
            if turn_budget(q) is not None:
                maximum=turn_budget(q);break
    topic=re.sub(r'(duoi|toi da|khong qua)\s+\d[\d.,]*(?:\s*(?:trieu|tr|k|nghin|ngan))?\b','',folded(topic))
    # Put the effective budget first: an old topic must not override a new amount.
    return (f'toi da {maximum} VND; ' if maximum is not None else '')+question+' '+topic

MONEY=re.compile(r'(?<![\w\d])(-?\d[\d.,]*)(?:\s*)(triệu|trieu|nghìn|nghin|ngàn|ngan|đồng|dong|vnd|₫|đ|k|tr)(?!\w)',re.I)
NUMBER=re.compile(r'\d[\d.,]*')

def amount(number,unit):
    try:
        unit=folded(unit)
        if unit in ('k','nghin','ngan','trieu','tr'):
            result=Decimal(number.replace(',','.'))*(1000000 if unit in ('trieu','tr') else 1000)
        else:result=Decimal(number.replace('.','').replace(',',''))
        return int(result) if result>=0 and result==result.to_integral_value() else None
    except (InvalidOperation,ValueError):return None

def grounded_numbers(prose,question,products,history,ids):
    """Allow source prices, the user's budget, sizes and verifiable selection counts.

    Cards remain the authoritative live price; arbitrary new numeric claims fail.
    """
    user_text=' '.join([question]+[m.get('content','') for m in history if m.get('role')=='USER'])
    money={price(p) for p in products}|{amount(*m.groups()) for m in MONEY.finditer(user_text)}
    maximum=turn_budget(question)
    if maximum is not None:money.add(maximum)
    money.discard(None)
    valid=True
    def remove_money(match):
        nonlocal valid
        if amount(*match.groups()) not in money:valid=False
        return ''
    check=prose
    for p in sorted(products,key=lambda p:len(p.get('title') or ''),reverse=True):
        title=redact(p.get('title'),200)
        if title:check=check.replace(title,'')
    check=MONEY.sub(remove_money,check)
    check=re.sub(r'(?m)^\s*\d{1,2}[.)]\s+','',check)
    check=re.sub(r'\b[1-9]\s+(?:cách|bước|lưu ý|điểm|hướng)\b','',check,flags=re.I)
    check=re.sub(r'\b([1-3])\s+(?:mẫu|lựa chọn|sản phẩm|gợi ý)\b',lambda m:'' if int(m.group(1))<=len(ids) else m.group(),check,flags=re.I)
    supplied=set(NUMBER.findall(user_text))
    for p in products:
        for v in p.get('variants',[]):
            supplied.update(NUMBER.findall(str(v.get('variant_values',{}))))
    return valid and all(m.group() in supplied or amount(m.group(),'vnd') in money for m in NUMBER.finditer(check))

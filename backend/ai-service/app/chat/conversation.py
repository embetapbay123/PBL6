"""Conversation context and grounded numeric references, independent of provider I/O."""
import re,unicodedata
from decimal import Decimal,InvalidOperation
from ..safety import budget,price,redact

def folded(value):
    return ''.join(c for c in unicodedata.normalize('NFKD',value.lower()).replace('đ','d') if not unicodedata.combining(c))

def followup(value):
    text=folded(value)
    # A new explicit product search starts a new topic, even if it mentions a color.
    search_text=re.sub(r'\bkhong(?: can| muon)? mua\b','',text)
    if re.search(r'\b(tim|muon mua|can mua|doi sang|quay lai)\b',search_text) and not re.search(r'\b(tom tat|nhac lai|vua|da|tu dau|truoc do)\b',text):return False
    return turn_budget(value) is not None or bool(re.search(r'\b(cai do|cai nay|loai do|loai nay|san pham do|size|mau|ngan sach|tang len|neu tang|so sanh|tom tat|nhac lai|ban nam|ban nu|uu tien|chon|vua|truoc do|con mau|co mau|cach|truoc khi|nguoi nhan|goi qua)\b',text))

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

def amount(number,unit):
    try:
        unit=folded(unit)
        if unit in ('k','nghin','ngan','trieu','tr'):
            result=Decimal(number.replace(',','.'))*(1000000 if unit in ('trieu','tr') else 1000)
        else:result=Decimal(number.replace('.','').replace(',',''))
        return int(result) if result>=0 and result==result.to_integral_value() else None
    except (InvalidOperation,ValueError):return None

def grounded_numbers(prose,question,products,history,ids):
    """Check monetary references without rejecting ordinary narrative numbers.

    A numbered list or a summary of earlier choices is not a current SKU count.
    Cards remain the authoritative live prices and selectable product IDs.
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
    return valid

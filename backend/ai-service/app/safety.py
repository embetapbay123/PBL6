import re, hashlib, unicodedata
import numpy as np

def redact(value,limit=2000):
    value=str(value or '')[:limit]
    value=re.sub(r'(?i)(password|api[_ -]?key|secret|bearer|token)\s*[:= ]\s*\S+',r'\1 [redacted]',value)
    value=re.sub(r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b','[redacted]',value)
    value=re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}','[redacted]',value)
    value=re.sub(r'(?<!\d)(?:\+84|0)[\d .-]{8,14}(?!\d)','[redacted]',value)
    return value

def tokens(value):
    value=unicodedata.normalize('NFKD',redact(value)).lower().replace('đ','d')
    value=''.join(c for c in value if not unicodedata.combining(c))
    stop={'toi','muon','hay','cho','va','la','cua','the','a','an','tim','san','pham','goi','y','duoi','dong'}
    return [t for t in re.findall(r'[a-z0-9]+',value) if len(t)>1 and t not in stop][:300]

def embedding(value):
    # Explicit lexical hashing baseline, not a pretrained semantic encoder.
    vector=np.zeros(1536)
    for token in tokens(value):
        digest=hashlib.sha256(token.encode()).digest()
        vector[int.from_bytes(digest[:4],'big')%1536]+=1 if digest[4]%2 else -1
    norm=np.linalg.norm(vector)
    return vector/norm if norm else vector

def public_text(product):
    return redact(product.get('title',''),200)+' '+redact(product.get('description',''),1500)

def price(product):
    values=[v.get('price_vnd') for v in product.get('variants',[]) if v.get('status')=='ACTIVE']
    values=[v for v in values if type(v) is int and 0<=v<=9007199254740991]
    return min(values) if values else None

def budget(value):
    """Bounded Vietnamese maximum-price baseline; unsupported phrasing stays unparsed."""
    folded=unicodedata.normalize('NFKD',value.lower()).replace('đ','d')
    folded=''.join(c for c in folded if not unicodedata.combining(c))
    match=re.search(r'(duoi|toi da|khong qua)\s+(\d[\d.,]*)(?:\s*(trieu|tr|k))?\b',folded)
    if not match:return None
    amount=match.group(2);unit=match.group(3)
    try:
        if unit:
            from decimal import Decimal
            result=Decimal(amount.replace(',','.'))*(1000 if unit=='k' else 1000000)
            if result!=result.to_integral_value():return None
            result=int(result)
        else:result=int(amount.replace('.','').replace(',',''))
        return (result-1 if match.group(1)=='duoi' else result) if 0<=result<=9007199254740991 else None
    except (ValueError,ArithmeticError):return None

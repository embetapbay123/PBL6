import asyncio
from app.evaluation import live
from app.chat.provider import Selection

class Selector:
    provider='openai_compatible';model='test-model'
    async def select(self,q,products,**kwargs):return Selection(tuple(p['id'] for p in products[:1]),False,'MODEL_GENERATED',self.provider,40,'Tham khảo sản phẩm này.',self.model)

class Catalog:
    def __init__(self):self.calls=0;self.p={'id':'p','title':'Camera','description':'Nhỏ gọn','store_id':'s','version':1,'status':'ACTIVE','moderation_status':'VISIBLE','variants':[{'status':'ACTIVE','price_vnd':100}]}
    async def snapshot(self,*args):self.calls+=1;return [self.p]
    async def product(self,*args):return self.p

def test_live_evaluation_requires_explicit_provider_opt_in():
    c=Catalog();result=asyncio.run(live.evaluate(None,c,Selector()))
    assert result['status']=='NOT_RUN' and c.calls==0

def test_live_evaluation_records_sources_without_claiming_human_quality(monkeypatch):
    monkeypatch.setattr(live,'retrieve',lambda engine,q,products:products)
    report=asyncio.run(live.evaluate(None,Catalog(),Selector(),True))
    assert report['status']=='PASS' and report['generation_status']=='PASS'
    assert report['human_review_status']=='REQUIRED' and report['cost_usd'] is None
    assert report['catalog_sha256'] and report['metrics']['cases']==4
    assert 'source' in report['raw'][0] and 'anonymous_key' not in str(report)

def test_live_source_change_is_failed_evidence(monkeypatch):
    monkeypatch.setattr(live,'retrieve',lambda engine,q,products:products)
    class Changed(Catalog):
        async def product(self,*args):return dict(self.p,version=2)
    report=asyncio.run(live.evaluate(None,Changed(),Selector(),True))
    assert report['status']=='FAIL' and all(not r['checks']['fresh_source'] for r in report['raw'])

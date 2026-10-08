import asyncio,uuid,os
import httpx
import pytest
from app.catalog import LiveCatalog
from app.internal_client import InternalError

def test_live_catalog_filters_and_preserves_correlation(monkeypatch):
    monkeypatch.setenv('CATALOG_URL','http://catalog')
    store=str(uuid.uuid4());other=str(uuid.uuid4())
    class Identity:
        async def call(self,op,body,correlation):
            assert op=='ActiveStores' and correlation=='flow-test';return {'ids':[store]}
    def product(s,status='ACTIVE'):
        return {'id':str(uuid.uuid4()),'store_id':s,'product_type_id':str(uuid.uuid4()),'title':'Camera','attributes':{},'status':status,'moderation_status':'VISIBLE','variants':[{'sku':'test','variant_values':{},'price_vnd':100,'status':'ACTIVE'}],'version':1}
    items=[product(store),product(other),product(store,'STOPPED')]
    def handler(request):
        assert request.headers['X-Correlation-Id']=='flow-test'
        return httpx.Response(200,json={'items':items,'total':3,'page':1,'size':100})
    catalog=LiveCatalog(transport=httpx.MockTransport(handler),internal=Identity())
    assert asyncio.run(catalog.snapshot('flow-test'))==[items[0]]

@pytest.mark.parametrize('status',[404,500])
def test_catalog_business_error_or_unavailable(monkeypatch,status):
    monkeypatch.setenv('CATALOG_URL','http://catalog')
    class Identity:
        async def call(self,*args):return {'ids':[]}
    catalog=LiveCatalog(transport=httpx.MockTransport(lambda r:httpx.Response(status,json={})),internal=Identity())
    with pytest.raises(InternalError) as caught:asyncio.run(catalog.product(str(uuid.uuid4()),'flow'))
    assert caught.value.status==(404 if status==404 else 503)

@pytest.mark.parametrize('in_page',[True,False])
def test_related_context_reuses_verified_page_and_fetches_missing_reference(monkeypatch,in_page):
    monkeypatch.setenv('CATALOG_URL','http://catalog')
    store=str(uuid.uuid4());calls=[]
    reference={'id':str(uuid.uuid4()),'store_id':store,'product_type_id':str(uuid.uuid4()),'title':'Camera','attributes':{},'status':'ACTIVE','moderation_status':'VISIBLE','variants':[{'sku':'camera','variant_values':{},'price_vnd':100,'status':'ACTIVE'}],'version':1}
    hidden={**reference,'id':str(uuid.uuid4()),'moderation_status':'HIDDEN'}
    class Identity:
        async def call(self,op,body,correlation):
            calls.append('stores');assert correlation=='related-flow';return {'ids':[store]}
    def handler(request):
        calls.append(request.url.path);assert request.headers['x-correlation-id']=='related-flow'
        if request.url.path.endswith('/'+reference['id']):return httpx.Response(200,json=reference)
        items=[reference,hidden] if in_page else [hidden]
        return httpx.Response(200,json={'items':items,'total':len(items),'page':1,'size':100})
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as pool:
            catalog=LiveCatalog(internal=Identity(),http_client=pool)
            product,candidates=await catalog.related_context(reference['id'],'related-flow')
            assert product==reference and candidates==([reference] if in_page else [])
            assert not pool.is_closed
    asyncio.run(run())
    assert calls.count('stores')==1
    assert len(calls)==(2 if in_page else 3)

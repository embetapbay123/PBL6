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

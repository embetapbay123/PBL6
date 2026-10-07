import asyncio,httpx,uuid
from app.internal_client import InternalClient
from app.chat.provider import CatalogSelector

def test_injected_pool_is_reused_without_closing_or_leaking_request_headers():
    seen=[];store=str(uuid.uuid4())
    async def handler(request):
        seen.append(dict(request.headers));assert request.extensions['timeout']['read']==1
        return httpx.Response(200,json={'ids':[store]})
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as pool:
            client=InternalClient('M4','test-key',{'M3':'http://identity'},http_client=pool)
            results=await asyncio.gather(client.call('ActiveStores',None,'flow-a'),client.call('ActiveStores',None,'flow-b'))
            assert results==[{'ids':[store]},{'ids':[store]}]
            assert not pool.is_closed
            assert 'x-service-key' not in pool.headers and 'x-correlation-id' not in pool.headers
        assert pool.is_closed
    asyncio.run(run())
    assert {h['x-correlation-id'] for h in seen}=={'flow-a','flow-b'}

def test_model_uses_own_timeout_and_stream_does_not_close_shared_pool():
    def handler(request):
        assert request.extensions['timeout']['read']==2
        assert request.headers['x-correlation-id']=='chat-flow'
        return httpx.Response(200,json={'message':{'content':'{"product_ids":["p"]}'}})
    async def run():
        async with httpx.AsyncClient(timeout=1,transport=httpx.MockTransport(handler)) as pool:
            selector=CatalogSelector(provider='ollama',url='http://model',model='test',http_client=pool)
            selection=await selector.select('camera',[{'id':'p','title':'Camera','variants':[{'status':'ACTIVE','price_vnd':100}]}],correlation='chat-flow')
            assert not selection.fallback and not pool.is_closed
    asyncio.run(run())

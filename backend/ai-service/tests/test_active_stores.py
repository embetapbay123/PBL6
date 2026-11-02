import asyncio,uuid,httpx,pytest
from app.internal_client import InternalClient,InternalError

def ids(count):return [str(uuid.UUID(int=i+1)) for i in range(count)]

def test_all_pages_and_legacy_unpaged_server_reuse_pool_and_keep_request_identity():
    async def run(legacy):
        expected=ids(205);seen=[]
        def handler(request):
            assert request.url.params['size']=='100'
            assert request.headers['x-correlation-id']=='store-pages'
            assert request.headers['x-service-id']=='M4'
            seen.append(str(request.url))
            if legacy:return httpx.Response(200,json={'ids':expected})
            after=request.url.params.get('after');offset=expected.index(after)+1 if after else 0
            page=expected[offset:offset+100]
            return httpx.Response(200,json={'ids':page,'next_after':page[-1] if offset+100<len(expected) else None})
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as pool:
            client=InternalClient('M4','test-only',{'M3':'http://identity'},http_client=pool)
            assert await client.call('ActiveStores',None,'store-pages')=={'ids':expected}
            assert not pool.is_closed
        assert len(seen)==(1 if legacy else 3)
    asyncio.run(run(False));asyncio.run(run(True))

def test_strict_old_server_negotiates_the_first_read_once_without_truncating():
    async def run():
        expected=ids(102);calls=[]
        def handler(request):
            calls.append(request)
            if request.url.params:return httpx.Response(422,json={'code':'VALIDATION_FAILED','message':'legacy','details':[{'field':'$','reason':'unknown field: size'}]})
            return httpx.Response(200,json={'ids':expected})
        client=InternalClient('M4','test-only',{'M3':'http://identity'},transport=httpx.MockTransport(handler))
        assert await client.call('ActiveStores',None,'strict-old')=={'ids':expected}
        assert len(calls)==2 and not calls[1].url.params
    asyncio.run(run())

@pytest.mark.parametrize('mode',['offline','repeat','wrong_cursor','empty','duplicate'])
def test_bad_later_page_or_cursor_never_yields_partial_allowlist(mode):
    async def run():
        calls=[];value=ids(2)
        def handler(request):
            calls.append(request)
            if mode=='empty':return httpx.Response(200,json={'ids':[],'next_after':value[0]})
            if mode=='wrong_cursor':return httpx.Response(200,json={'ids':[value[0]],'next_after':value[1]})
            if mode=='duplicate':return httpx.Response(200,json={'ids':[value[0],value[0]],'next_after':value[0]})
            if len(calls)==2 and mode=='offline':return httpx.Response(503,json={'code':'UNAVAILABLE'})
            return httpx.Response(200,json={'ids':[value[0]],'next_after':value[0]})
        client=InternalClient('M4','test-only',{'M3':'http://identity'},transport=httpx.MockTransport(handler))
        with pytest.raises(InternalError) as result:await client.call('ActiveStores',None,'cursor-error')
        assert result.value.status==503
        assert len(calls)==(2 if mode in ['offline','repeat'] else 1)
    asyncio.run(run())

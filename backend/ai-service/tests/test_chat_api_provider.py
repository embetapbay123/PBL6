import asyncio,json
import httpx,pytest
from app.chat.provider import CatalogSelector,compose,PROMPT_VERSION

PRODUCTS=[{'id':'p','title':'Camera','description':'Camera nhỏ gọn','version':1,'status':'ACTIVE','variants':[{'status':'ACTIVE','price_vnd':100}]}]

def selector(handler):
    return CatalogSelector(provider='openai_compatible',url='https://opencode.ai/inference/openai/v1',model='account-model',api_key='test-only-key',transport=httpx.MockTransport(handler))

def envelope(answer='Camera nhỏ gọn để bạn tham khảo.',ids=None,**choice):
    return {'choices':[{'finish_reason':'stop','message':{'content':json.dumps({'product_ids':['p'] if ids is None else ids,'answer':answer})},**choice}],'usage':{'total_tokens':80}}

def test_compatible_api_generates_prose_and_keeps_key_out_of_payload_and_shared_headers():
    def handler(request):
        assert str(request.url)=='https://opencode.ai/inference/openai/v1/chat/completions'
        assert request.headers['authorization']=='Bearer test-only-key'
        assert request.headers['x-correlation-id']=='trace'
        body=json.loads(request.content)
        assert body['model']=='account-model' and body['response_format']=={'type':'json_object'}
        assert body['max_tokens']==512 and 'test-only-key' not in request.content.decode()
        return httpx.Response(200,json=envelope())
    result=asyncio.run(selector(handler).select('camera',PRODUCTS,correlation='trace'))
    assert not result.fallback and result.reason=='MODEL_GENERATED'
    assert result.actual_tokens==80 and result.model=='account-model'
    content,cards=compose(result,PRODUCTS)
    assert content.startswith(result.answer) and cards[0]['current_price_vnd']==100
    assert PROMPT_VERSION=='catalog-answer-v4'

@pytest.mark.parametrize('answer',['Giá chỉ 1 VND','<script>alert()</script>','https://evil.invalid','[click](evil)','api_key=private','', 'x'*901])
def test_unsafe_or_unbounded_prose_is_rejected(answer):
    result=asyncio.run(selector(lambda r:httpx.Response(200,json=envelope(answer))).select('camera',PRODUCTS))
    assert result.fallback and result.answer is None

@pytest.mark.parametrize('body',[{'choices':[]},envelope(finish_reason='length'),{'choices':None},envelope(ids=['foreign'])])
def test_truncated_malformed_or_foreign_response_falls_back(body):
    result=asyncio.run(selector(lambda r:httpx.Response(200,json=body)).select('camera',PRODUCTS))
    assert result.fallback and result.reason=='PROVIDER_INVALID_RESPONSE'


@pytest.mark.parametrize('body',[envelope(answer='Giá chỉ 1 VND'),envelope(finish_reason='length'),envelope(ids=['foreign']),
    {'choices':[{'finish_reason':'stop','message':{'content':'not-json'}}],'usage':{'total_tokens':80}}])
def test_rejected_provider_content_retains_known_billable_token_usage(body):
    result=asyncio.run(selector(lambda r:httpx.Response(200,json=body)).select('camera',PRODUCTS))
    assert result.fallback and result.answer is None and result.actual_tokens==80


@pytest.mark.parametrize('usage',[None,{},True,-1,100001,'80'])
def test_missing_or_invalid_usage_does_not_invalidate_an_otherwise_valid_answer(usage):
    body=envelope();body['usage']={'total_tokens':usage} if usage is not None else None
    result=asyncio.run(selector(lambda r:httpx.Response(200,json=body)).select('camera',PRODUCTS))
    assert not result.fallback and result.actual_tokens is None

@pytest.mark.parametrize('status',[301,401,402,429,500])
def test_no_retry_or_redirect_on_provider_error(status):
    calls=[]
    def handler(request):calls.append(request);return httpx.Response(status,headers={'location':'https://evil.invalid'},json={})
    result=asyncio.run(selector(handler).select('camera',PRODUCTS))
    assert result.fallback and result.provider=='openai_compatible' and len(calls)==1

@pytest.mark.parametrize('url,key',[('http://model','key'),('https://user:key@model','key'),('https://model?token=key','key'),('https://model',''),('https://model','bad\nkey')])
def test_api_config_requires_safe_https_endpoint_and_key(url,key):
    with pytest.raises(ValueError):CatalogSelector(provider='openai_compatible',url=url,model='m',api_key=key)


def test_provider_identifies_client_and_keeps_session_context_private():
    from app.chat.provider import CHAT_SESSION
    def handler(request):
        assert request.headers['user-agent']=='pbl6-shopping-assistant/1.0'
        assert request.headers['x-opencode-session']=='hashed-session'
        assert 'hashed-session' not in request.content.decode()
        return httpx.Response(200,json=envelope())
    token=CHAT_SESSION.set('hashed-session')
    try:assert not asyncio.run(selector(handler).select('camera',PRODUCTS)).fallback
    finally:CHAT_SESSION.reset(token)
    assert CHAT_SESSION.get() is None

@pytest.mark.parametrize('value',['0','-1','31','nan','inf','bad'])
def test_provider_rejects_invalid_deadline(monkeypatch,value):
    monkeypatch.setenv('CHAT_TIMEOUT_SECONDS',value)
    with pytest.raises(ValueError):selector(lambda r:httpx.Response(200,json=envelope()))

def test_configured_deadline_reaches_http_client(monkeypatch):
    monkeypatch.setenv('CHAT_TIMEOUT_SECONDS','15')
    def handler(request):
        assert request.extensions['timeout']['read']==15
        return httpx.Response(200,json=envelope())
    assert not asyncio.run(selector(handler).select('camera',PRODUCTS)).fallback


def test_numbers_in_exact_catalog_title_are_allowed_but_invented_prices_are_not():
    products=[dict(PRODUCTS[0],title='Camera X100')]
    ok=selector(lambda r:httpx.Response(200,json=envelope(answer='Camera X100 nhỏ gọn để bạn tham khảo.')))
    assert not asyncio.run(ok.select('camera',products)).fallback
    bad=selector(lambda r:httpx.Response(200,json=envelope(answer='Camera X100 có giá 100 đồng.')))
    assert asyncio.run(bad.select('camera',products)).fallback


def test_standalone_selector_has_stable_session_without_user_credentials():
    sessions=[]
    def handler(request):
        sessions.append(request.headers['x-opencode-session'])
        return httpx.Response(200,json=envelope())
    client=selector(handler)
    asyncio.run(client.select('camera',PRODUCTS))
    asyncio.run(client.select('camera',PRODUCTS))
    assert len(sessions[0])==32 and sessions[0]==sessions[1]

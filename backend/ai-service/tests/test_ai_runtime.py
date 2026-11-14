import os, asyncio, uuid, json
from datetime import datetime,timezone,timedelta
import pytest
from fastapi.testclient import TestClient
import app.main as main
from sqlalchemy import text
from test_consent_tracking import engine,grant,event
from app.chat.runtime import ChatRuntime,digest
from app.chat.provider import CatalogSelector
from app.internal_client import InternalError
from app.recommendation.runtime import RecommendationRuntime
from app.evaluation.metrics import read_metrics
from app.evaluation.job import train
from app.consent.service import ConsentService
from app.tracking.service import TrackingService
from app.runtime_contracts import OPERATIONS,schema_errors
from app.chat.retrieval import index,retrieve
from app.chat.retention import retain

pytestmark=pytest.mark.skipif(not os.getenv('M4_DATABASE_URL'),reason='Requires PostgreSQL M4 test database')

class Catalog:
    def __init__(self):
        self.items=[{'id':str(uuid.uuid4()),'store_id':str(uuid.uuid4()),'product_type_id':str(uuid.uuid4()),'title':'Máy ảnh '+str(i),'description':None,'attributes':{},'status':'ACTIVE','moderation_status':'VISIBLE','version':1,'variants':[{'id':str(uuid.uuid4()),'sku':'camera-'+str(i),'variant_values':{},'price_vnd':100000,'status':'ACTIVE'}]} for i in range(20)]
        self.down=False;self.hidden=False
    async def snapshot(self,correlation,**kwargs):
        if self.down:raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Unavailable')
        return self.items
    async def product(self,id,correlation):
        if self.hidden:raise InternalError(404,'NOT_FOUND','Hidden')
        return next(p for p in self.items if p['id']==id)

def service(engine,catalog=None):return ChatRuntime(engine,catalog or Catalog(),CatalogSelector(provider='none'))


def test_delete_chat_history_is_owned_removes_messages_and_never_refunds_usage(engine):
    s=service(engine);user,other=str(uuid.uuid4()),str(uuid.uuid4())
    own=s.create(user,'delete-test');foreign=s.create(other,'delete-test');guest=s.create(None,'delete-test')
    with engine.begin() as db:
        for session in (own,foreign,guest):
            db.execute(text("INSERT INTO chat_message(session_id,role,content) VALUES(:id,'USER','private fixture')"),{'id':session['id']})
        before=db.execute(text('SELECT sum(requests) FROM ai_usage_budget')).scalar_one()
    with pytest.raises(InternalError) as rejected:s.delete(other,own['id'])
    assert rejected.value.status==404
    assert s.delete(user,own['id'])=={'deleted_count':1}
    with pytest.raises(InternalError):s.load(own['id'],user,None)
    with engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM chat_message')).scalar_one()==2
        assert db.execute(text('SELECT sum(requests) FROM ai_usage_budget')).scalar_one()==before
    assert s.list(other,{})['total']==1
    assert s.load(guest['id'],None,guest['anonymous_key'])


def test_delete_all_covers_every_page_and_cannot_resurrect_a_deleted_session(engine):
    s=service(engine);user,other=str(uuid.uuid4()),str(uuid.uuid4())
    sessions=[s.create(user,'delete-all') for _ in range(25)]
    foreign=s.create(other,'delete-all')
    assert len(s.list(user,{'page':1,'size':20})['items'])==20
    assert s.delete(user)=={'deleted_count':25}
    assert s.list(user,{})['total']==0
    assert s.delete(user)=={'deleted_count':0}
    with pytest.raises(InternalError) as stale:
        s.save(sessions[0]['id'],0,'late reply',{},None,1,[])
    assert stale.value.status==409
    assert s.list(other,{})['items'][0]['id']==foreign['id']


def test_delete_chat_http_auth_scope_and_validation(engine,monkeypatch):
    user,other=str(uuid.uuid4()),str(uuid.uuid4());s=service(engine);session=s.create(user,'http-delete')
    class Limiter:
        async def eval(self,*args):return 1
    async def resolve(self,operation,body,correlation):
        return {'user_id':other if body['token']=='other' else user,'roles':['SELLER'] if body['token']=='seller' else ['CUSTOMER']}
    monkeypatch.setattr(main,'engine',engine);monkeypatch.setattr(main,'limiter',Limiter())
    monkeypatch.setattr(main.InternalClient,'call',resolve)
    client=TestClient(main.app);url='/api/v1/me/chat/sessions/'+session['id']
    assert client.delete(url).status_code==401
    assert client.delete(url,headers={'Authorization':'Bearer seller'}).status_code==403
    assert client.delete(url,headers={'Authorization':'Bearer other'}).status_code==404
    assert client.delete('/api/v1/me/chat/sessions/not-a-uuid',headers={'Authorization':'Bearer own'}).status_code==422
    response=client.delete(url,headers={'Authorization':'Bearer own'})
    assert response.status_code==200 and response.json()=={'deleted_count':1}
    assert client.delete('/api/v1/me/chat/sessions',headers={'Authorization':'Bearer own'}).json()=={'deleted_count':0}

def test_guest_secret_only_returned_once_and_other_session_rejected(engine):
    s=service(engine);created=s.create(None,'127.0.0.1')
    key=created['anonymous_key'];assert len(key)==64
    with engine.connect() as db:assert db.execute(text('SELECT anonymous_key FROM chat_session')).scalar_one()==digest(key)
    for user,bad in [(str(uuid.uuid4()),key),(None,'b'*64),(None,None)]:
        with pytest.raises(InternalError) as caught:s.load(created['id'],user,bad)
        assert caught.value.status==404
    assert s.load(created['id'],None,key)==(0,[])

def test_owned_chat_round_trip_history_response_contract_and_version_conflict(engine):
    s=service(engine);user=str(uuid.uuid4());created=s.create(user,'ip')
    reply=asyncio.run(s.answer(created['id'],user,None,'tìm máy ảnh','test-correlation'))
    assert reply['fallback'] and reply['fallback_reason']=='PROVIDER_NOT_CONFIGURED'
    assert not schema_errors(reply,OPERATIONS['sendChatMessage']['responses']['200'])
    history=s.list(user,{'session_id':created['id'],'message_size':1})
    assert history['items'][0]['messages']['total']==2
    assert len(history['items'][0]['messages']['items'])==1
    assert 'anonymous_key' not in json.dumps(history)
    with pytest.raises(InternalError):s.list(str(uuid.uuid4()),{'session_id':created['id']})
    with pytest.raises(InternalError) as caught:s.save(created['id'],0,'retry',reply,type('S',(),{'fallback':True,'reason':'NO_MATCH','provider':'none','actual_tokens':None})(),1,[])
    assert caught.value.status==409
    with engine.connect() as db:assert db.execute(text('SELECT count(*) FROM chat_message')).scalar_one()==2

@pytest.mark.parametrize('state', ['down','hidden'])
def test_catalog_failure_never_saves_fake_assistant(engine,state):
    c=Catalog();setattr(c,state,True);s=service(engine,c);user=str(uuid.uuid4());created=s.create(user,'ip')
    with pytest.raises(InternalError):asyncio.run(s.answer(created['id'],user,None,'máy ảnh','test'))
    with engine.connect() as db:assert db.execute(text('SELECT count(*) FROM chat_message')).scalar_one()==0

def test_chat_daily_budget_fails_closed(engine):
    s=service(engine)
    for _ in range(100):s.budget('scope')
    with pytest.raises(InternalError) as caught:s.budget('scope')
    assert caught.value.status==429

def test_generation_budget_reserves_context_once_and_refuses_excess(engine):
    s=service(engine);scope='context'
    s.budget(scope);s.budget(scope,99999,False)
    with engine.connect() as db:
        assert tuple(db.execute(text('SELECT requests,tokens FROM ai_usage_budget WHERE scope_hash=:s'),{'s':digest(scope)}).one())==(1,99999)
    with pytest.raises(InternalError):s.budget(scope,2,False)


def test_known_usage_replaces_reserved_estimate_but_unknown_usage_is_retained(engine):
    s=service(engine);scope='conversation-usage';s.budget(scope)
    day=s.budget(scope,20000,False);s.settle_budget(scope,20000,80,day)
    with engine.connect() as db:
        assert db.execute(text('SELECT tokens FROM ai_usage_budget WHERE scope_hash=:s'),{'s':digest(scope)}).scalar_one()==80
    day=s.budget(scope,30000,False);s.settle_budget(scope,30000,None,day)
    with engine.connect() as db:
        assert db.execute(text('SELECT tokens FROM ai_usage_budget WHERE scope_hash=:s'),{'s':digest(scope)}).scalar_one()==30080


def test_chat_provider_continues_empty_results_and_budgeted_followups(engine):
    import httpx
    from app.safety import budget as price_budget
    catalog=Catalog()
    for p in catalog.items:p['title']='Áo thun Everyday';p['variants'][0]['price_vnd']=149000
    calls=[]
    def handler(request):
        body=json.loads(request.content);context=json.loads(body['messages'][-1]['content']);calls.append(context)
        ids=[context['catalog'][0]['id']] if context['catalog'] else []
        answer='Mình chưa tìm thấy áo dưới 100k. Bạn muốn tăng ngân sách không?' if not ids else 'Bạn có thể cân nhắc mẫu áo này theo ngân sách vừa điều chỉnh.'
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':json.dumps({'product_ids':ids,'answer':answer})}}],'usage':{'total_tokens':100}})
    selector=CatalogSelector(provider='openai_compatible',url='https://provider.invalid/v1',model='deepseek-demo',api_key='fixture',thinking_mode='disabled',transport=httpx.MockTransport(handler))
    s=ChatRuntime(engine,catalog,selector);user=str(uuid.uuid4());session=s.create(user,'test')
    for question in ['Tôi muốn tìm quà tặng áo thun dưới 100k','Tặng bạn nam, size M, ưu tiên màu đen.','Nếu tăng ngân sách lên tối đa 200k thì sao?']:
        result=asyncio.run(s.answer(session['id'],user,None,question,'conversation-test'))
        assert not result['fallback']
    assert calls[0]['catalog']==calls[1]['catalog']==[]
    assert calls[0]['budget_max_vnd']==calls[1]['budget_max_vnd']==99999
    assert calls[2]['budget_max_vnd']==200000 and result['product_cards'][0]['current_price_vnd']==149000
    with engine.connect() as db:
        assert db.execute(text('SELECT tokens FROM ai_usage_budget WHERE scope_hash=:s'),{'s':digest('turn:'+user)}).scalar_one()==300


def test_twelve_turns_keep_role_history_and_charge_reported_usage(engine):
    import httpx
    lengths=[]
    def handler(request):
        messages=json.loads(request.content)['messages'];lengths.append(len(messages))
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':json.dumps({'product_ids':[],'answer':'Mình vẫn nhớ bạn đang tìm áo thun làm quà trong ngân sách đã trao đổi.'})}}],'usage':{'total_tokens':100}})
    selector=CatalogSelector(provider='openai_compatible',url='https://provider.invalid/v1',model='deepseek-demo',api_key='fixture',thinking_mode='disabled',transport=httpx.MockTransport(handler))
    s=ChatRuntime(engine,Catalog(),selector);user=str(uuid.uuid4());session=s.create(user,'test')
    for i in range(12):
        result=asyncio.run(s.answer(session['id'],user,None,'Tôi muốn tìm áo thun dưới 100k' if i==0 else 'Tóm tắt yêu cầu lúc đầu giúp tôi','long-conversation'))
        assert not result['fallback']
    assert lengths[-1]==24 and len(s.load(session['id'],user,None)[1])==24
    with engine.connect() as db:
        assert db.execute(text('SELECT tokens FROM ai_usage_budget WHERE scope_hash=:s'),{'s':digest('turn:'+user)}).scalar_one()==1200

def test_chat_trace_failure_rolls_back_both_messages_and_version(engine):
    s=service(engine);user=str(uuid.uuid4());created=s.create(user,'ip')
    with engine.begin() as db:
        db.execute(text("CREATE FUNCTION reject_trace() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'trace failure'; END $$"))
        db.execute(text('CREATE TRIGGER reject_trace BEFORE INSERT ON ai_request_trace FOR EACH ROW EXECUTE FUNCTION reject_trace()'))
    with pytest.raises(Exception):asyncio.run(s.answer(created['id'],user,None,'máy ảnh','test'))
    assert s.load(created['id'],user,None)==(0,[])

def test_expired_session_is_unreadable(engine):
    s=service(engine);user=str(uuid.uuid4());created=s.create(user,'ip')
    with engine.begin() as db:db.execute(text("UPDATE chat_session SET created_at=now()-interval '31 days'"))
    with pytest.raises(InternalError):s.load(created['id'],user,None)
    assert s.list(user,{})['total']==0
    assert retain(engine)['sessions']==1

def test_index_version_invalidation_and_live_catalog_filter(engine):
    c=Catalog();assert index(engine,c.items)==20
    assert len(retrieve(engine,'máy ảnh',c.items))==8
    p=c.items[0]
    with engine.begin() as db:
        db.execute(text("INSERT INTO event_entity_state(kind,entity_id,version,payload) VALUES('ProductChanged',:p,2,'{}'::jsonb)"),{'p':p['id']})
    p['version']=2;p['title']='Laptop mới';p['description']=None
    assert p['id'] not in [r['id'] for r in retrieve(engine,'máy ảnh',c.items)]
    assert index(engine,[p])==1
    assert retrieve(engine,'laptop',[p])[0]['version']==2
    assert retrieve(engine,'laptop dưới 50k',[p])==[]
    assert retrieve(engine,'laptop tối đa 100000',[p])[0]['id']==p['id']

def test_metrics_owner_does_not_receive_global_evaluation_or_mixed_trace(engine):
    store=str(uuid.uuid4());other=str(uuid.uuid4())
    with engine.begin() as db:
        for stores in [[store],[other],[store,other],[]]:
            db.execute(text("INSERT INTO ai_request_trace(operation,store_ids,latency_ms,fallback,provider,prompt_version,index_version,estimated_tokens) VALUES('chat',CAST(:stores AS jsonb),10,true,'none','v1','v1',1)"),{'stores':json.dumps(stores)})
    owner=read_metrics(engine,{'scope':'STORE','store_id':store})
    admin=read_metrics(engine,{'scope':'PLATFORM'})
    assert owner['metrics']['requests']==1 and admin['metrics']['requests']==4
    assert owner['metrics']['cost_usd'] is None
    assert 'model_version' not in owner

def test_consent_recently_viewed_and_related_shape(engine):
    c=Catalog();user=str(uuid.uuid4());grant(engine,user)
    p=c.items[0]['id'];TrackingService(engine).ingest(event('InteractionRecorded',user,product_id=p,event_type='VIEW'))
    runtime=RecommendationRuntime(engine,c)
    result=asyncio.run(runtime.recommend(user,'test'));assert result['recently_viewed_product_ids']==[p]
    assert result['source']=='BASELINE'
    assert not schema_errors(result,OPERATIONS['getForYou']['responses']['200'])
    ConsentService(engine).update(user,{'status':'WITHDRAWN','expected_version':1})
    result=asyncio.run(runtime.recommend(user,'test'));assert result['recently_viewed_product_ids']==[]
    page=asyncio.run(runtime.related(p,{'page':1,'size':3},'test'))
    assert len(page['items'])==3 and page['total']==19
    assert all(item['id']!=p for item in page['items'])
    assert not schema_errors(page,OPERATIONS['getRelatedProducts']['responses']['200'])

def test_training_restart_durable_and_withdrawal_erases_artifact(engine):
    c=Catalog();user=str(uuid.uuid4());grant(engine,user)
    with engine.connect() as db:at=db.execute(text('SELECT changed_at FROM personalization_consent')).scalar_one()
    with engine.begin() as db:
        for i,p in enumerate(c.items):
            db.execute(text("INSERT INTO recommendation_interaction(user_id,product_id,event_id,event_type,weight,occurred_at) VALUES(:u,:p,:e,'VIEW',1,:at)"),{'u':user,'p':p['id'],'e':str(i),'at':at+timedelta(milliseconds=i+1)})
    result=train(engine,[p['id'] for p in c.items],c.items);assert result['train_events']<20
    assert result['content_baseline_status']=='COMPLETED'
    with engine.connect() as db:
        artifact=db.execute(text('SELECT artifact_json FROM model_version')).scalar_one()
        assert user in artifact['users']
        stored=db.execute(text('SELECT raw_result FROM model_evaluation')).scalar_one()
        assert stored['data_source']=='CONSENTED_DATABASE' and stored['content_baseline']==result['content_baseline']
    ConsentService(engine).update(user,{'status':'WITHDRAWN','expected_version':1})
    with engine.connect() as db:
        row=db.execute(text('SELECT status,artifact_json FROM model_version')).first()
        assert row==('STALE',None)

def test_real_http_guest_guard_precedes_dto_and_customer_scope(engine,monkeypatch):
    user,other=str(uuid.uuid4()),str(uuid.uuid4())
    class Redis:
        async def eval(self,*a):return 1
    async def resolve(self,name,payload,correlation):
        if name=='ResolveAiMetricsScope':return {'scope':'STORE','store_id':str(uuid.uuid4())}
        return {'user_id':other if payload['token']=='other' else user,'roles':['OWNER'] if payload['token']=='owner' else ['CUSTOMER']}
    monkeypatch.setattr(main,'engine',engine);monkeypatch.setattr(main,'limiter',Redis())
    monkeypatch.setenv('AI_MODE','real');monkeypatch.setenv('CHAT_PROVIDER','none')
    monkeypatch.setenv('M4_INTERNAL_KEY','fixture');monkeypatch.setenv('IDENTITY_URL','http://fixture')
    monkeypatch.setattr(main.InternalClient,'call',resolve)
    monkeypatch.setattr(main,'LiveCatalog',Catalog)
    c=TestClient(main.app);url='/api/v1/chat/sessions'
    assert c.post(url,headers={'Authorization':'Bearer owner'},json={}).status_code==403
    created=c.post(url,json={});assert created.status_code==201
    row=created.json();send=url+'/'+row['id']+'/messages'
    assert c.post(send,json={}).status_code==401
    oversized={'content':'x'*65536}
    assert c.post(send,json=oversized).status_code==401
    assert c.post(send,headers={'X-Chat-Key':row['anonymous_key']},json=oversized).status_code==413
    assert c.post(send,headers={'X-Chat-Key':row['anonymous_key']},json={}).status_code==422
    answer=c.post(send,headers={'X-Chat-Key':row['anonymous_key']},json={'content':'máy ảnh'})
    assert answer.status_code==200 and answer.json()['fallback_reason']=='PROVIDER_NOT_CONFIGURED'
    assert c.post(send,headers={'Authorization':'Bearer other'},json={'content':'máy ảnh'}).status_code==404
    own=c.post(url,headers={'Authorization':'Bearer own'},json={}).json()
    history=c.get('/api/v1/me/chat/sessions',headers={'Authorization':'Bearer own'},params={'session_id':own['id']})
    assert history.status_code==200 and history.json()['items'][0]['messages']['total']==0

def test_generated_explanation_is_discarded_after_source_change(engine):
    from app.chat.provider import Selection, PROMPT_VERSION
    c=Catalog()
    class Selector:
        async def select(self,q,products,*args):
            selected=products[0]
            c.items=[dict(p,title='Sản phẩm thay đổi',version=2) if p['id']==selected['id'] else p for p in c.items]
            return Selection((selected['id'],),False,'MODEL_GENERATED','openai_compatible',50,'Lời giải thích cũ.', 'test-model','disabled')
    s=ChatRuntime(engine,c,Selector());user=str(uuid.uuid4());session=s.create(user,'ip')
    response=asyncio.run(s.answer(session['id'],user,None,'máy ảnh','test'))
    assert response['fallback_reason']=='CATALOG_CHANGED' and 'Lời giải thích cũ' not in response['content']
    assert not schema_errors(response,OPERATIONS['sendChatMessage']['responses']['200'])
    with engine.connect() as db:
        row=db.execute(text('SELECT model_name,prompt_version,fallback_reason,thinking_mode FROM ai_request_trace')).one()
        assert tuple(row)==('test-model',PROMPT_VERSION,'CATALOG_CHANGED','disabled')


def test_generated_answer_matches_public_response_contract(engine):
    from app.chat.provider import Selection
    class Selector:
        async def select(self,q,products,*args):
            return Selection((products[0]['id'],),False,'MODEL_GENERATED','openai_compatible',50,
                             'Sản phẩm phù hợp từ Catalog.', 'test-model')
    service=ChatRuntime(engine,Catalog(),Selector());user=str(uuid.uuid4());session=service.create(user,'ip')
    response=asyncio.run(service.answer(session['id'],user,None,'máy ảnh','contract-generation'))
    assert response['fallback_reason']=='MODEL_GENERATED' and response['fallback'] is False
    assert not schema_errors(response,OPERATIONS['sendChatMessage']['responses']['200'])

def test_metrics_partial_tokens_and_cost_are_unknown(engine):
    with engine.begin() as db:
        for tokens,cost in [(80,.01),(None,None)]:
            db.execute(text("INSERT INTO ai_request_trace(operation,store_ids,latency_ms,fallback,provider,prompt_version,index_version,estimated_tokens,actual_tokens,cost_usd) VALUES('chat','[]',100,false,'api','v2','v1',100,:t,:c)"),{'t':tokens,'c':cost})
    result=read_metrics(engine,{'scope':'PLATFORM'})['metrics']
    assert result['requests']==2 and result['actual_tokens'] is None and result['cost_usd'] is None
    assert result['token_samples']==1 and result['cost_samples']==1 and result['latency_p95_ms']==100

def test_chat_retention_removes_old_trace_and_budget(engine):
    with engine.begin() as db:
        db.execute(text("INSERT INTO ai_request_trace(operation,store_ids,latency_ms,fallback,provider,prompt_version,index_version,estimated_tokens,created_at) VALUES('chat','[]',1,true,'none','v1','v1',1,now()-interval '8 days')"))
        db.execute(text("INSERT INTO ai_usage_budget(scope_hash,day,requests,tokens) VALUES('test',current_date-3,1,1)"))
    result=retain(engine)
    assert result['traces']==1 and result['budgets']==1

def test_explicit_followup_uses_own_session_topic_and_current_budget(engine):
    s=service(engine);user=str(uuid.uuid4());session=s.create(user,'ip')
    first=asyncio.run(s.answer(session['id'],user,None,'tìm máy ảnh','test'))
    second=asyncio.run(s.answer(session['id'],user,None,'loại đó tối đa 100000','test'))
    assert first['product_cards'] and second['product_cards']
    third=asyncio.run(s.answer(session['id'],user,None,'loại đó dưới 50k','test'))
    assert not third['product_cards']
    # New topic must not retrieve the prior topic implicitly.
    fourth=asyncio.run(s.answer(session['id'],user,None,'kính thiên văn','test'))
    assert not fourth['product_cards']

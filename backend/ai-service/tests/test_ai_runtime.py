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
    result=train(engine,[p['id'] for p in c.items]);assert result['train_events']<20
    with engine.connect() as db:
        artifact=db.execute(text('SELECT artifact_json FROM model_version')).scalar_one()
        assert user in artifact['users']
        assert db.execute(text('SELECT raw_result FROM model_evaluation')).scalar_one()['data_source']=='CONSENTED_DATABASE'
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
    assert c.post(send,headers={'X-Chat-Key':row['anonymous_key']},json={}).status_code==422
    answer=c.post(send,headers={'X-Chat-Key':row['anonymous_key']},json={'content':'máy ảnh'})
    assert answer.status_code==200 and answer.json()['fallback_reason']=='PROVIDER_NOT_CONFIGURED'
    assert c.post(send,headers={'Authorization':'Bearer other'},json={'content':'máy ảnh'}).status_code==404
    own=c.post(url,headers={'Authorization':'Bearer own'},json={}).json()
    history=c.get('/api/v1/me/chat/sessions',headers={'Authorization':'Bearer own'},params={'session_id':own['id']})
    assert history.status_code==200 and history.json()['items'][0]['messages']['total']==0

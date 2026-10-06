import json, os, uuid, copy, time
from pathlib import Path
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import create_engine, text
from fastapi.testclient import TestClient
from app.consent.service import ConsentService
from app.consent.domain import ConsentConflict, retain_recent
from app.tracking.service import TrackingService, InvalidEvent
from app.runtime_contracts import BUNDLE, schema_errors
import app.main as main

pytestmark=pytest.mark.skipif(not os.getenv('M4_DATABASE_URL'),reason='Requires PostgreSQL M4 test database')

@pytest.fixture
def engine():
    url=os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1)
    root=create_engine(url);schema='test_consent_'+uuid.uuid4().hex
    with root.begin() as db:
        db.execute(text('CREATE SCHEMA '+schema))
        db.execute(text('SET LOCAL search_path TO '+schema+',public'))
        for f in sorted((Path(__file__).resolve().parents[1]/'migrations').glob('*.sql')):db.exec_driver_sql(f.read_text())
    scoped=create_engine(url,connect_args={'options':'-csearch_path='+schema+',public'})
    try:yield scoped
    finally:
        scoped.dispose()
        with root.begin() as db:db.execute(text('DROP SCHEMA '+schema+' CASCADE'))
        root.dispose()

def event(kind,user,**payload):
    return {'event_id':str(uuid.uuid4()),'event_type':kind,'schema_version':'1.0','producer':'M1' if kind in ('SearchRecorded','InteractionRecorded','ProductChanged') else 'M2','occurred_at':datetime.now(timezone.utc).isoformat(),'correlation_id':'tracking-test','payload':dict(user_id=user,**payload)}

def grant(engine,user):return ConsentService(engine).update(user,{'status':'GRANTED','expected_version':0})
def count(engine,table):
    with engine.connect() as db:return db.execute(text('SELECT count(*) FROM '+table)).scalar_one()

def test_default_version_conflict_and_concurrent_grants(engine):
    user=str(uuid.uuid4());s=ConsentService(engine)
    assert s.get(user)=={'status':'WITHDRAWN','version':0}
    def update():
        try:return s.update(user,{'status':'GRANTED','expected_version':0})
        except ConsentConflict:return 'CONFLICT'
    with ThreadPoolExecutor(2) as pool:results=list(pool.map(lambda _:update(),range(2)))
    assert results.count('CONFLICT')==1
    assert s.get(user)['version']==1
    assert count(engine,'personalization_consent')==1
    assert count(engine,'consent_audit')==1

def test_consent_dedup_producer_and_purchase_multiple_items(engine):
    user=str(uuid.uuid4());product=str(uuid.uuid4());s=TrackingService(engine)
    skipped=event('InteractionRecorded',user,product_id=product,event_type='VIEW')
    assert s.ingest(skipped)=='SKIPPED_CONSENT';grant(engine,user)
    assert s.ingest(skipped)=='DUPLICATE' # skipped signals cannot be replayed after opt-in
    view=event('InteractionRecorded',user,product_id=product,event_type='VIEW')
    assert s.ingest(view)=='RECORDED';assert s.ingest(view)=='DUPLICATE'
    bad=copy.deepcopy(view);bad['event_id']=str(uuid.uuid4());bad['producer']='M2'
    with pytest.raises(InvalidEvent):s.ingest(bad)
    purchase=event('OrderCompleted',user,order_id=str(uuid.uuid4()),store_id=str(uuid.uuid4()),version=3,items=[{'product_id':product,'variant_id':str(uuid.uuid4()),'quantity':1},{'product_id':str(uuid.uuid4()),'variant_id':str(uuid.uuid4()),'quantity':2}])
    assert s.ingest(purchase)=='RECORDED'
    with engine.connect() as db:assert db.execute(text("SELECT payload FROM event_entity_state WHERE kind='OrderCompleted'")).scalar_one()=={}
    replay=copy.deepcopy(purchase);replay['event_id']=str(uuid.uuid4());replay['payload']['version']=2
    assert s.ingest(replay)=='STALE';assert count(engine,'recommendation_interaction')==3
    replay['event_id']=str(uuid.uuid4());replay['payload']['version']=4
    assert s.ingest(replay)=='STALE';assert count(engine,'recommendation_interaction')==3

def test_withdrawal_purges_and_old_events_cannot_repopulate_on_regrant(engine):
    user=str(uuid.uuid4());grant(engine,user);s=TrackingService(engine)
    old=event('SearchRecorded',user,query='product query');assert s.ingest(old)=='RECORDED'
    view=event('InteractionRecorded',user,product_id=str(uuid.uuid4()),event_type='CART');view['producer']='M2';assert s.ingest(view)=='RECORDED'
    c=ConsentService(engine).update(user,{'status':'WITHDRAWN','expected_version':1})
    assert c['version']==2;assert count(engine,'search_history')==count(engine,'recommendation_interaction')==0
    assert s.ingest(event('SearchRecorded',user,query='ignored'))=='SKIPPED_CONSENT'
    ConsentService(engine).update(user,{'status':'GRANTED','expected_version':2})
    old['event_id']=str(uuid.uuid4());assert s.ingest(old)=='SKIPPED_CONSENT'
    assert count(engine,'search_history')==0

def test_retention_and_user_locked_invalidate_behavior(engine):
    user=str(uuid.uuid4());grant(engine,user)
    with engine.begin() as db:
        db.execute(text("INSERT INTO search_history(user_id,query,created_at) VALUES(:u,'old',now()-interval '31 days')"),{'u':user})
        db.execute(text("INSERT INTO model_version(algorithm,version,artifact_uri,status,trained_at) VALUES('ALS','test','fixture','ACTIVE',now())"))
        retain_recent(db)
    assert count(engine,'search_history')==0
    with engine.connect() as db:assert db.execute(text('SELECT status FROM model_version')).scalar_one()=='STALE'
    locked=event('UserLocked',user,version=2);locked['producer']='M3'
    assert TrackingService(engine).ingest(locked)=='INVALIDATED'
    assert ConsentService(engine).get(user)['status']=='WITHDRAWN'

def test_inbox_and_effect_roll_back_together(engine):
    user=str(uuid.uuid4());grant(engine,user);s=TrackingService(engine)
    with engine.begin() as db:
        db.execute(text("CREATE FUNCTION reject_search() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$"))
        db.execute(text('CREATE TRIGGER reject_search BEFORE INSERT ON search_history FOR EACH ROW EXECUTE FUNCTION reject_search()'))
    e=event('SearchRecorded',user,query='fixture')
    with pytest.raises(Exception):s.ingest(e)
    assert count(engine,'inbox')==count(engine,'search_history')==0
    with engine.begin() as db:db.execute(text('DROP TRIGGER reject_search ON search_history'))
    assert s.ingest(e)=='RECORDED'

def test_product_stale_version_and_bad_payload(engine):
    s=TrackingService(engine);product=str(uuid.uuid4())
    e={'event_id':str(uuid.uuid4()),'event_type':'ProductChanged','schema_version':'1.0','producer':'M1','occurred_at':datetime.now(timezone.utc).isoformat(),'correlation_id':'version-test','payload':{'product_id':product,'store_id':str(uuid.uuid4()),'version':4,'sale_status':'ACTIVE','moderation_status':'VISIBLE'}}
    assert s.ingest(e)=='INVALIDATED';e['event_id']=str(uuid.uuid4());e['payload']['version']=3;assert s.ingest(e)=='STALE'
    e['payload']['secret']='not allowed'
    with pytest.raises(InvalidEvent):s.ingest(e)

def test_consent_audit_failure_rolls_back_withdrawal_and_deletion(engine):
    user=str(uuid.uuid4());grant(engine,user)
    TrackingService(engine).ingest(event('SearchRecorded',user,query='fixture'))
    with engine.begin() as db:
        db.execute(text("CREATE FUNCTION reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit failure'; END $$"))
        db.execute(text('CREATE TRIGGER reject_audit BEFORE INSERT ON consent_audit FOR EACH ROW EXECUTE FUNCTION reject_audit()'))
    with pytest.raises(Exception):ConsentService(engine).update(user,{'status':'WITHDRAWN','expected_version':1})
    assert ConsentService(engine).get(user)['status']=='GRANTED'
    assert ConsentService(engine).get(user)['version']==1
    assert count(engine,'search_history')==1
    assert count(engine,'consent_audit')==1

def test_queued_lock_before_fresh_live_grant_does_not_erase_new_consent(engine):
    user=str(uuid.uuid4());old=datetime.now(timezone.utc)-timedelta(seconds=1);grant(engine,user)
    e=event('UserLocked',user,version=4);e['producer']='M3';e['occurred_at']=old.isoformat()
    assert TrackingService(engine).ingest(e)=='STALE'
    assert ConsentService(engine).get(user)['status']=='GRANTED'

def test_http_guards_dto_and_response_schema(engine,monkeypatch):
    user=str(uuid.uuid4());other=str(uuid.uuid4())
    class Redis:
        async def eval(self,*a):return 1
    async def resolve(self,name,payload,correlation):
        return {'user_id':other if payload['token']=='other' else user,'roles':['CUSTOMER']}
    monkeypatch.setattr(main,'engine',engine);monkeypatch.setattr(main,'limiter',Redis())
    monkeypatch.setenv('M4_INTERNAL_KEY','fixture');monkeypatch.setenv('IDENTITY_URL','http://fixture')
    monkeypatch.setattr(main.InternalClient,'call',resolve)
    c=TestClient(main.app);url='/api/v1/me/personalization-consent';h={'Authorization':'Bearer own'}
    assert c.patch(url,json={}).status_code==401
    assert c.patch(url,headers=h,json={'status':'GRANTED','expected_version':'0'}).status_code==422
    response=c.patch(url,headers=h,json={'status':'GRANTED','expected_version':0});assert response.status_code==200
    assert not schema_errors(response.json(),BUNDLE['operations']['updatePersonalizationConsent']['responses']['200'])
    assert c.get(url,headers={'Authorization':'Bearer other'}).json()=={'status':'WITHDRAWN','version':0}
    assert c.patch(url,headers=h,json={'status':'WITHDRAWN','expected_version':0}).status_code==409
    assert c.patch(url,headers=h,json={'status':'WITHDRAWN','expected_version':1,'user_id':other}).status_code==422

@pytest.mark.skipif(not os.getenv('RABBITMQ_URL'),reason='Requires running tracking worker and RabbitMQ')
def test_durable_worker_consumes_and_deduplicates_broker_fixture():
    # Transport fixture proves routing/ACK/inbox, not the unfinished M1 search/view producer.
    import pika
    db_engine=create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1))
    user=str(uuid.uuid4());connection=None;e=None
    try:
        grant(db_engine,user)
        e=event('InteractionRecorded',user,product_id=str(uuid.uuid4()),event_type='CART');e['producer']='M2'
        connection=pika.BlockingConnection(pika.URLParameters(os.environ['RABBITMQ_URL']));channel=connection.channel();channel.confirm_delivery()
        deadline=time.monotonic()+15
        while time.monotonic()<deadline:
            try:
                channel.basic_publish(exchange='pbl6.events',routing_key='InteractionRecorded',body=json.dumps(e),properties=pika.BasicProperties(delivery_mode=2),mandatory=True)
                break
            except pika.exceptions.UnroutableError:time.sleep(.2)
        else:pytest.fail('Tracking queue not routed')
        channel.basic_publish(exchange='pbl6.events',routing_key='InteractionRecorded',body=json.dumps(e),properties=pika.BasicProperties(delivery_mode=2),mandatory=True)
        while time.monotonic()<deadline:
            with db_engine.connect() as db:
                count_rows=db.execute(text('SELECT count(*) FROM recommendation_interaction WHERE user_id=:u'),{'u':user}).scalar_one()
            if count_rows==1:break
            time.sleep(.1)
        else:pytest.fail('Tracking worker did not persist fixture')
        with db_engine.connect() as db:
            assert db.execute(text('SELECT count(*) FROM inbox WHERE producer=:p AND event_id=:id'),{'p':'M2','id':e['event_id']}).scalar_one()==1
    finally:
        if connection and connection.is_open:connection.close()
        with db_engine.begin() as db:
            db.execute(text('DELETE FROM recommendation_interaction WHERE user_id=:u'),{'u':user})
            db.execute(text('DELETE FROM personalization_consent WHERE user_id=:u'),{'u':user})
            db.execute(text('DELETE FROM consent_audit WHERE user_id=:u'),{'u':user})
            if e:db.execute(text('DELETE FROM inbox WHERE producer=:p AND event_id=:id'),{'p':'M2','id':e['event_id']})
        db_engine.dispose()

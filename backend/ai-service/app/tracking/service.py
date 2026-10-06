from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from ..runtime_contracts import BUNDLE, schema_errors
from ..consent.domain import lock_user, current, set_consent, invalidate_dataset, retain_recent

class InvalidEvent(Exception): pass

def validate_event(event):
    if not isinstance(event,dict): raise InvalidEvent()
    spec=BUNDLE['events'].get(event.get('event_type'))
    if not spec or schema_errors(event,spec['schema']): raise InvalidEvent()
    if event['event_type']=='InteractionRecorded':
        required='M1' if event['payload']['event_type']=='VIEW' else 'M2'
        if event['producer']!=required: raise InvalidEvent()

class TrackingService:
    def __init__(self,engine): self.engine=engine
    def ingest(self,event):
        validate_event(event)
        kind=event['event_type'];p=event['payload'];user=p.get('user_id')
        occurred=datetime.fromisoformat(event['occurred_at'].replace('Z','+00:00'))
        if occurred>datetime.now(timezone.utc)+timedelta(minutes=5): raise InvalidEvent()
        with self.engine.begin() as db:
            if user:lock_user(db,user)
            seen=db.execute(text('INSERT INTO inbox(producer,event_id) VALUES(:producer,:id) ON CONFLICT DO NOTHING RETURNING event_id'),{'producer':event['producer'],'id':event['event_id']}).first()
            if not seen:return 'DUPLICATE'
            retain_recent(db)
            if kind in ('ProductChanged','StoreStatusChanged','UserLocked','MembershipChanged','OrderCompleted'):
                entity=p['product_id'] if kind=='ProductChanged' else p['store_id'] if kind=='StoreStatusChanged' else p['order_id'] if kind=='OrderCompleted' else user
                state_kind=kind+(':'+p['store_id'] if kind=='MembershipChanged' else '')
                import json
                conflict='DO NOTHING' if kind=='OrderCompleted' else 'DO UPDATE SET version=EXCLUDED.version,payload=EXCLUDED.payload WHERE event_entity_state.version<EXCLUDED.version'
                state_payload={} if kind=='OrderCompleted' else p
                updated=db.execute(text('INSERT INTO event_entity_state(kind,entity_id,version,payload) VALUES(:kind,:entity,:version,CAST(:payload AS jsonb)) ON CONFLICT(kind,entity_id) '+conflict+' RETURNING version'),{'kind':state_kind,'entity':entity,'version':p['version'],'payload':json.dumps(state_payload)}).first()
                if not updated:return 'STALE'
                if kind=='ProductChanged':
                    db.execute(text("UPDATE product_embedding SET status='STALE' WHERE product_id=:id AND source_version<=:version"),{'id':entity,'version':p['version']})
                    return 'INVALIDATED'
                if kind=='UserLocked':
                    c=current(db,user)
                    # A fresh grant requires a live unlocked M3 session; an older queued lock must not erase it.
                    if c and c['status']=='GRANTED' and occurred<c['changed_at']:return 'STALE'
                    set_consent(db,user,'WITHDRAWN',c['version'] if c else 0,'USER_LOCKED');return 'INVALIDATED'
                if kind in ('StoreStatusChanged','MembershipChanged'):return 'INVALIDATED'
            consent=current(db,user)
            if not consent or consent['status']!='GRANTED' or occurred<consent['changed_at'] or occurred<datetime.now(timezone.utc)-timedelta(days=30):return 'SKIPPED_CONSENT'
            key=event['producer']+':'+event['event_id']
            if kind=='SearchRecorded':
                db.execute(text('INSERT INTO search_history(user_id,query,created_at) VALUES(:u,:q,:at)'),{'u':user,'q':p['query'],'at':occurred})
            else:
                items=p['items'] if kind=='OrderCompleted' else [p]
                event_type='PURCHASE' if kind=='OrderCompleted' else p['event_type']
                weight={'VIEW':1,'CART':3,'PURCHASE':5}[event_type]
                for i,item in enumerate(items):
                    db.execute(text('INSERT INTO recommendation_interaction(user_id,product_id,event_id,event_type,weight,occurred_at) VALUES(:u,:product,:id,:type,:weight,:at)'),{'u':user,'product':item['product_id'],'id':key+':'+str(i),'type':event_type,'weight':weight,'at':occurred})
            invalidate_dataset(db)
            return 'RECORDED'

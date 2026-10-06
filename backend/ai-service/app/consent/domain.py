from sqlalchemy import text
from datetime import datetime, timezone
import uuid

class ConsentConflict(Exception):
    pass

def lock_user(db, user_id):
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"), {'key':'consent:'+user_id})

def current(db, user_id):
    return db.execute(text('SELECT * FROM personalization_consent WHERE user_id=:u'), {'u':user_id}).mappings().first()

def response(row):
    if row is None: return {'status':'WITHDRAWN','version':0}
    return {'status':row['status'],'version':row['version'],'changed_at':row['changed_at'].isoformat()}

def invalidate_dataset(db,erase=False):
    db.execute(text('UPDATE behavior_dataset_revision SET version=version+1'))
    # Already-trained artifacts may contain withdrawn behavior: serving them is unsafe.
    if erase:db.execute(text("UPDATE model_version SET status='STALE' WHERE status='ACTIVE'"))

def purge_user(db,user_id):
    for table in ('search_history','recommendation_interaction','user_preference'):
        db.execute(text(f'DELETE FROM {table} WHERE user_id=:u'),{'u':user_id})
    invalidate_dataset(db,erase=True)

def set_consent(db,user_id,status,expected_version,source='SELF'):
    lock_user(db,user_id)
    row=current(db,user_id)
    if (row['version'] if row else 0)!=expected_version: raise ConsentConflict()
    now=datetime.now(timezone.utc)
    if row:
        updated=db.execute(text('UPDATE personalization_consent SET status=:s,source=:source,version=version+1,changed_at=:now WHERE user_id=:u RETURNING *'),{'s':status,'source':source,'now':now,'u':user_id}).mappings().one()
    else:
        updated=db.execute(text('INSERT INTO personalization_consent(id,user_id,status,source,changed_at,version) VALUES(:id,:u,:s,:source,:now,1) RETURNING *'),{'id':str(uuid.uuid4()),'u':user_id,'s':status,'source':source,'now':now}).mappings().one()
    db.execute(text('INSERT INTO consent_audit(user_id,version,previous_status,status,source,changed_at) VALUES(:u,:version,:previous,:status,:source,:at)'),{'u':user_id,'version':updated['version'],'previous':row['status'] if row else None,'status':status,'source':source,'at':now})
    if status=='WITHDRAWN':purge_user(db,user_id)
    return response(updated)

def retain_recent(db):
    # Demo policy: at most 30 days; immediate deletion on withdrawal.
    deleted=0
    for table,column in [('search_history','created_at'),('recommendation_interaction','occurred_at')]:
        deleted+=db.execute(text(f"DELETE FROM {table} WHERE {column}<now()-interval '30 days'")).rowcount
    if deleted: invalidate_dataset(db,erase=True)

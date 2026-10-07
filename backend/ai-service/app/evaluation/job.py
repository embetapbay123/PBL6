"""Offline bounded training. Run: python -m app.evaluation.job; never runs in HTTP."""
import os, uuid, json, hashlib, asyncio
from datetime import datetime,timezone
from sqlalchemy import create_engine,text
from ..catalog import LiveCatalog
from ..recommendation.als import fit
from .ranking import split_temporal,evaluate

def train(engine,candidates):
    started=datetime.now(timezone.utc)
    with engine.connect() as db:
        revision=db.execute(text('SELECT version FROM behavior_dataset_revision')).scalar_one()
        rows=[dict(r) for r in db.execute(text("SELECT i.user_id::text,i.product_id::text,i.event_id,i.weight,i.occurred_at FROM recommendation_interaction i JOIN personalization_consent c ON c.user_id=i.user_id AND c.status='GRANTED' WHERE i.occurred_at>=c.changed_at AND i.occurred_at>now()-interval '30 days' ORDER BY i.occurred_at,i.event_id LIMIT 50001")).mappings()]
    if len(rows)>50000:raise ValueError('Dataset exceeds 50000-event budget')
    eligible=set(candidates);rows=[r for r in rows if r['product_id'] in eligible]
    if not rows:raise ValueError('No consented eligible training data')
    training,validation,test=split_temporal(rows)
    # Select configuration on validation only. The test fold is consulted once.
    choices=[]
    for regularization in (.1,1):
        config={'regularization':regularization,'seed':17}
        model=fit(training,**config)
        quality=evaluate(model,training,validation,eligible)
        choices.append((quality['model']['ndcg_at_k'],config,model))
    _,config,artifact=max(choices,key=lambda c:c[0])
    result=evaluate(artifact,training,test,eligible)
    result.update({'data_source':'CONSENTED_DATABASE','split':'per-user timestamp 60/20/20; ties grouped','validation_events':len(validation),'train_events':len(training),'test_events':len(test),'config':config})
    dataset=hashlib.sha256(json.dumps(rows,default=str,sort_keys=True).encode()).hexdigest()
    mid,rid=str(uuid.uuid4()),str(uuid.uuid4());version='als-'+mid
    with engine.begin() as db:
        # Withdrawal/retention increments and locks this same row before clearing artifacts.
        actual=db.execute(text('SELECT version FROM behavior_dataset_revision FOR UPDATE')).scalar_one()
        if actual!=revision:raise ValueError('Dataset changed; rerun training')
        db.execute(text("UPDATE model_version SET status='STALE',artifact_json=NULL WHERE status='ACTIVE'"))
        db.execute(text("INSERT INTO model_version(id,algorithm,version,artifact_uri,status,trained_at,artifact_json,dataset_revision,config_json) VALUES(:id,'implicit-als-v1',:v,'postgres-json','ACTIVE',now(),CAST(:artifact AS jsonb),:revision,CAST(:config AS jsonb))"),{'id':mid,'v':version,'artifact':json.dumps(artifact),'revision':revision,'config':json.dumps(config)})
        db.execute(text("INSERT INTO training_run(id,model_version_id,dataset_version,split_spec,status,started_at,finished_at) VALUES(:id,:m,:dataset,CAST(:spec AS jsonb),'COMPLETED',:started,now())"),{'id':rid,'m':mid,'dataset':dataset,'started':started,'spec':json.dumps({'train':.6,'validation':.2,'test':.2,'seed':17,'per_user':True,'equal_timestamps':'same_fold'})})
        db.execute(text("INSERT INTO model_evaluation(training_run_id,baseline_name,k,precision_at_k,recall_at_k,ndcg_at_k,evaluated_at,raw_result) VALUES(:run,'train-popularity',10,:p,:r,:n,now(),CAST(:raw AS jsonb))"),{'run':rid,'p':result['model']['precision_at_k'],'r':result['model']['recall_at_k'],'n':result['model']['ndcg_at_k'],'raw':json.dumps(result)})
    return {'model_version':version,**result}

async def main():
    engine=create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1))
    try:
        candidates=await LiveCatalog().snapshot(str(uuid.uuid4()),pages=50)
        print(json.dumps(train(engine,[p['id'] for p in candidates])))
    finally:engine.dispose()

if __name__=='__main__':asyncio.run(main())

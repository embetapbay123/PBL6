from sqlalchemy import text
from starlette.concurrency import run_in_threadpool
from ..consent.domain import lock_user, current
from ..safety import tokens, public_text, price
from .als import rank

class RecommendationRuntime:
    def __init__(self,engine,catalog):self.engine,self.catalog=engine,catalog
    def personal(self,user,candidates):
        if not user:return [],[],None
        with self.engine.begin() as db:
            lock_user(db,user);consent=current(db,user)
            if not consent or consent['status']!='GRANTED':return [],[],None
            rows=db.execute(text("SELECT product_id,event_type,occurred_at FROM recommendation_interaction WHERE user_id=:u AND occurred_at>=:since AND occurred_at>now()-interval '30 days' ORDER BY occurred_at DESC,id DESC LIMIT 1000"),{'u':user,'since':consent['changed_at']}).mappings().all()
            recent=list(dict.fromkeys(str(r['product_id']) for r in rows if r['event_type']=='VIEW'))
            revision=db.execute(text('SELECT version FROM behavior_dataset_revision')).scalar_one()
            model=db.execute(text("SELECT artifact_json,version FROM model_version WHERE status='ACTIVE' AND dataset_revision=:r AND artifact_json IS NOT NULL ORDER BY trained_at DESC LIMIT 1"),{'r':revision}).mappings().first()
            eligible={p['id'] for p in candidates}
            prediction=rank(model['artifact_json'],user,eligible) if model else []
            if prediction:return prediction,[p for p in recent if p in eligible][:20],model['version']
            seeds=[p for p in candidates if p['id'] in set(recent[:10])]
            if seeds:
                terms=set(t for p in seeds for t in tokens(public_text(p)))
                types={p.get('product_type_id') for p in seeds}
                prediction=[p['id'] for p in sorted(candidates,key=lambda p:(-(10*(p.get('product_type_id') in types)+len(terms.intersection(tokens(public_text(p))))),p['id'])) if p['id'] not in set(recent)]
            return prediction,[p for p in recent if p in eligible][:20],None

    async def recommend(self,user,correlation):
        candidates=await self.catalog.snapshot(correlation)
        ids,recent,version=await run_in_threadpool(self.personal,user,candidates)
        result={'source':'MODEL' if version else 'BASELINE' if ids else 'FALLBACK','product_ids':ids[:20] if ids else [p['id'] for p in sorted(candidates,key=lambda p:p['id'])[:20]],'recently_viewed_product_ids':recent,'mode':'real','evaluation_status':'COMPLETED' if version else 'NOT_RUN'}
        if version:result['model_version']=version
        return result

    async def related(self,id,query,correlation):
        if hasattr(self.catalog,'related_context'):
            reference,candidates=await self.catalog.related_context(id,correlation)
        else:
            reference=await self.catalog.product(id,correlation)
            candidates=await self.catalog.snapshot(correlation)
        terms=set(tokens(public_text(reference)));refprice=price(reference)
        score=lambda p:(-(10*(p.get('product_type_id')==reference.get('product_type_id'))+len(terms.intersection(tokens(public_text(p))))),abs(price(p)-refprice),p['id'])
        ordered=sorted([p for p in candidates if p['id']!=id],key=score)
        page,size=query.get('page',1),query.get('size',20)
        return {'items':ordered[(page-1)*size:page*size],'total':len(ordered),'page':page,'size':size}

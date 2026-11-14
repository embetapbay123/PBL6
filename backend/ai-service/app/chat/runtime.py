import asyncio, hashlib, secrets, json, time, uuid, hmac, unicodedata
from dataclasses import replace
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool
from ..internal_client import InternalError
from ..safety import redact,budget,price
from .provider import CatalogSelector, compose, PROMPT_VERSION,request_estimate,CHAT_SESSION
from .retrieval import retrieve,contextual_question

def digest(value):return hashlib.sha256(value.encode()).hexdigest()

def history_search_pattern(value):
    value=unicodedata.normalize('NFD',str(value or '').strip().lower()).replace('đ','d')
    value=''.join(c for c in value if not '\u0300'<=c<='\u036f')
    return '%'+value.replace('\\','\\\\').replace('%','\\%').replace('_','\\_')+'%' if value else None

class ChatRuntime:
    def __init__(self,engine,catalog,selector=None):
        self.engine,self.catalog,self.selector=engine,catalog,selector or CatalogSelector()
        import os
        self.request_limit=int(os.getenv('CHAT_DAILY_REQUEST_LIMIT','100'))
        self.token_limit=int(os.getenv('CHAT_DAILY_TOKEN_LIMIT','100000'))
        if not 1<=self.request_limit<=10000 or not 1<=self.token_limit<=10000000:raise ValueError('Invalid daily chat allowance')

    def budget(self,scope,estimated=0,request=True):
        with self.engine.begin() as db:
            row=db.execute(text('INSERT INTO ai_usage_budget(scope_hash,day,requests,tokens) VALUES(:s,current_date,:n,:t) ON CONFLICT(scope_hash,day) DO UPDATE SET requests=ai_usage_budget.requests+:n,tokens=ai_usage_budget.tokens+EXCLUDED.tokens WHERE ai_usage_budget.requests+:n<=:request_limit AND ai_usage_budget.tokens+:t<=:token_limit RETURNING requests,day'),{'s':digest(scope),'t':estimated,'n':int(request),'request_limit':self.request_limit,'token_limit':self.token_limit}).first()
            if not row:raise InternalError(429,'CHAT_BUDGET_EXCEEDED','Đã hết ngân sách chat trong ngày.')
            return row[1]

    def settle_budget(self,scope,reserved,actual,day):
        # A known provider usage replaces its conservative reservation exactly once.
        # Unknown outcomes retain the reservation; never auto-repeat the paid request.
        if not reserved or type(actual) is not int or not 0<=actual<=100000:return
        with self.engine.begin() as db:
            db.execute(text('UPDATE ai_usage_budget SET tokens=GREATEST(0,tokens+:delta) WHERE scope_hash=:s AND day=:day'),{'s':digest(scope),'day':day,'delta':actual-reserved})

    def create(self,user,ip,first=None):
        self.budget('create:'+ip)
        key=secrets.token_hex(32) if not user else None
        with self.engine.begin() as db:
            row=db.execute(text("INSERT INTO chat_session(user_id,anonymous_key,status) VALUES(:u,:key,'ACTIVE') RETURNING id,created_at"),{'u':user,'key':digest(key) if key else None}).mappings().one()
            if first:db.execute(text("INSERT INTO chat_message(session_id,role,content) VALUES(:s,'USER',:c)"),{'s':row['id'],'c':redact(first)})
        result={'id':str(row['id']),'created_at':row['created_at'].isoformat()}
        if user:result['user_id']=user
        if key:result['anonymous_key']=key
        return result

    def load(self,id,user,key):
        with self.engine.connect() as db:
            row=db.execute(text("SELECT * FROM chat_session WHERE id=:s AND status='ACTIVE' AND created_at>now()-interval '30 days'"),{'s':id}).mappings().first()
            owned=row and (str(row['user_id'])==user if user else row['user_id'] is None and key and hmac.compare_digest(row['anonymous_key'],digest(key)))
            if not owned:raise InternalError(404,'NOT_FOUND','Không tìm thấy phiên chat của bạn.')
            history=db.execute(text('SELECT role,content FROM chat_message WHERE session_id=:s ORDER BY created_at DESC,id DESC LIMIT 40'),{'s':id}).mappings().all()
            return row['version'],list(reversed([dict(r) for r in history]))

    def list(self,user,query):
        page,size=query.get('page',1),query.get('size',20);id=query.get('session_id')
        pattern=history_search_pattern(query.get('q')) if not id else None
        params={'u':user,'s':id,'offset':(page-1)*size,'size':size,'q':pattern}
        condition="s.user_id=:u AND s.created_at>now()-interval '30 days'"+(' AND s.id=:s' if id else '')
        if pattern:
            condition+=r" AND EXISTS(SELECT 1 FROM chat_message m WHERE m.session_id=s.id AND translate(regexp_replace(lower(normalize(m.content,NFD)),U&'[\0300-\036f]','','g'),'đ','d') LIKE :q)"
        with self.engine.connect() as db:
            total=db.execute(text('SELECT count(*) FROM chat_session s WHERE '+condition),params).scalar_one()
            if id and not total:raise InternalError(404,'NOT_FOUND','Không tìm thấy phiên chat của bạn.')
            rows=db.execute(text("SELECT s.id,s.user_id,s.created_at,(SELECT left(content,200) FROM chat_message WHERE session_id=s.id AND role='USER' ORDER BY created_at,id LIMIT 1) AS title FROM chat_session s WHERE "+condition+' ORDER BY s.created_at DESC,s.id DESC LIMIT :size OFFSET :offset'),params).mappings().all()
            items=[{'id':str(r['id']),'user_id':str(r['user_id']),'created_at':r['created_at'].isoformat(),**({'title':redact(r['title'],120)[:140]} if r['title'] else {})} for r in rows]
            if id and items:
                mp,ms=query.get('message_page',1),query.get('message_size',20)
                count=db.execute(text('SELECT count(*) FROM chat_message WHERE session_id=:s'),params).scalar_one()
                messages=db.execute(text('SELECT id,session_id,role,content,response_meta FROM chat_message WHERE session_id=:s ORDER BY created_at,id LIMIT :limit OFFSET :skip'),dict(params,limit=ms,skip=(mp-1)*ms)).mappings().all()
                # History is text only: historical cards/prices must never masquerade as current quotes.
                items[0]['messages']={'items':[{'id':str(m['id']),'session_id':str(m['session_id']),'role':m['role'],'content':m['content']} for m in messages],'total':count,'page':mp,'size':ms}
        return {'items':items,'total':total,'page':page,'size':size}

    def delete(self,user,id=None):
        if not user:raise InternalError(404,'NOT_FOUND','Không tìm thấy phiên chat của bạn.')
        with self.engine.begin() as db:
            # Lock the same parent rows used by save(), then remove children first (the FK is restrictive).
            rows=db.execute(text('SELECT id FROM chat_session WHERE user_id=:user'+(' AND id=:id' if id else '')+' ORDER BY id FOR UPDATE'),{'user':user,'id':id}).all()
            if id and not rows:raise InternalError(404,'NOT_FOUND','Không tìm thấy phiên chat của bạn.')
            ids=[str(row[0]) for row in rows]
            if ids:
                db.execute(text('DELETE FROM chat_message WHERE session_id=ANY(CAST(:ids AS uuid[]))'),{'ids':ids})
                db.execute(text('DELETE FROM chat_session WHERE user_id=:user AND id=ANY(CAST(:ids AS uuid[]))'),{'user':user,'ids':ids})
            return {'deleted_count':len(ids)}

    def save(self,id,version,question,response,selection,elapsed,stores,estimated=0):
        with self.engine.begin() as db:
            changed=db.execute(text("UPDATE chat_session SET version=version+1 WHERE id=:s AND version=:v AND status='ACTIVE' AND created_at>now()-interval '30 days' RETURNING id"),{'s':id,'v':version}).first()
            if not changed:raise InternalError(409,'VERSION_CONFLICT','Phiên chat đã thay đổi; tải lại rồi gửi lại.')
            db.execute(text("INSERT INTO chat_message(session_id,role,content) VALUES(:s,'USER',:c)"),{'s':id,'c':redact(question)})
            db.execute(text("INSERT INTO chat_message(id,session_id,role,content,product_refs,response_meta) VALUES(:id,:s,'ASSISTANT',:c,CAST(:refs AS jsonb),CAST(:meta AS jsonb))"),{'id':response['id'],'s':id,'c':response['content'],'refs':json.dumps(response['product_cards']),'meta':json.dumps({'fallback':selection.fallback,'reason':selection.reason})})
            db.execute(text("INSERT INTO ai_request_trace(operation,store_ids,latency_ms,fallback,provider,prompt_version,index_version,estimated_tokens,actual_tokens,model_name,fallback_reason,thinking_mode) VALUES('chat',CAST(:stores AS jsonb),:ms,:fallback,:provider,:prompt,'live-lexical-v1',:estimate,:actual,:model,:reason,:thinking)"),{'stores':json.dumps(stores),'ms':elapsed,'fallback':selection.fallback,'provider':selection.provider,'prompt':PROMPT_VERSION,'estimate':estimated,'actual':selection.actual_tokens,'model':getattr(selection,'model',None),'reason':selection.reason,'thinking':getattr(selection,'thinking_mode',None)})

    async def answer(self,id,user,key,question,correlation):
        started=time.monotonic()
        version,history=await run_in_threadpool(self.load,id,user,key)
        scope='turn:'+str(user or digest(key))
        await run_in_threadpool(self.budget,scope)
        try:
            async with asyncio.timeout(max(4,getattr(self.selector,'timeout',2)+2)):
                candidates=await self.catalog.snapshot(correlation)
                search=contextual_question(question,history)
                retrieved=await run_in_threadpool(retrieve,self.engine,search,candidates)
                if user:
                    from ..recommendation.runtime import RecommendationRuntime
                    personalized,_,_=await run_in_threadpool(RecommendationRuntime(self.engine,self.catalog).personal,user,retrieved)
                    order={p:i for i,p in enumerate(personalized)}
                    retrieved.sort(key=lambda p:order.get(p['id'],len(order)))
                estimated=request_estimate(question,retrieved,history,output_tokens=getattr(self.selector,'max_output_tokens',512)) if getattr(self.selector,'provider','none')!='none' else 0
                reservation_day=await run_in_threadpool(self.budget,scope,estimated,False)
                session_token=CHAT_SESSION.set(digest('session:'+str(id)))
                try:selection=await self.selector.select(question,retrieved,history,correlation)
                finally:CHAT_SESSION.reset(session_token)
                await run_in_threadpool(self.settle_budget,scope,estimated,selection.actual_tokens,reservation_day)
                # Resolve selected cards again after generation; no stale cached price or hidden card.
                current=await asyncio.gather(*(self.catalog.product(p,correlation) for p in selection.ids))
                maximum=budget(search)
                if maximum is not None:current=[p for p in current if price(p)<=maximum]
                # A model explanation belongs to the exact source snapshot, not merely its IDs.
                before={p['id']:p for p in retrieved}
                changed=len(current)!=len(selection.ids) or any(any(p.get(k)!=before[p['id']].get(k) for k in ('title','description','version','store_id')) for p in current)
                if changed and not selection.fallback:selection=replace(selection,ids=tuple(p['id'] for p in current),fallback=True,reason='CATALOG_CHANGED',answer=None)
        except TimeoutError:raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Catalog chưa sẵn sàng; vui lòng thử lại.')
        content,cards=compose(selection,current)
        response={'id':str(uuid.uuid4()),'session_id':id,'role':'ASSISTANT','content':content,'product_cards':cards,'fallback':selection.fallback,'fallback_reason':selection.reason,'mode':'real'}
        await run_in_threadpool(self.save,id,version,question,response,selection,round((time.monotonic()-started)*1000),sorted({p['store_id'] for p in current}),estimated)
        return response

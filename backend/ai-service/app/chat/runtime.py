import asyncio, hashlib, secrets, json, time, uuid, hmac
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool
from ..internal_client import InternalError
from ..safety import redact,budget,price
from .provider import CatalogSelector, compose
from .retrieval import retrieve

def digest(value):return hashlib.sha256(value.encode()).hexdigest()

class ChatRuntime:
    def __init__(self,engine,catalog,selector=None):
        self.engine,self.catalog,self.selector=engine,catalog,selector or CatalogSelector()

    def budget(self,scope,estimated=0):
        with self.engine.begin() as db:
            row=db.execute(text('INSERT INTO ai_usage_budget(scope_hash,day,requests,tokens) VALUES(:s,current_date,1,:t) ON CONFLICT(scope_hash,day) DO UPDATE SET requests=ai_usage_budget.requests+1,tokens=ai_usage_budget.tokens+EXCLUDED.tokens WHERE ai_usage_budget.requests<100 AND ai_usage_budget.tokens+:t<=100000 RETURNING requests'),{'s':digest(scope),'t':estimated}).first()
            if not row:raise InternalError(429,'CHAT_BUDGET_EXCEEDED','Đã hết ngân sách chat trong ngày.')

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
            history=db.execute(text('SELECT role,content FROM chat_message WHERE session_id=:s ORDER BY created_at DESC,id DESC LIMIT 20'),{'s':id}).mappings().all()
            return row['version'],list(reversed([dict(r) for r in history]))

    def list(self,user,query):
        page,size=query.get('page',1),query.get('size',20);id=query.get('session_id')
        params={'u':user,'s':id,'offset':(page-1)*size,'size':size}
        condition="user_id=:u AND created_at>now()-interval '30 days'"+(' AND id=:s' if id else '')
        with self.engine.connect() as db:
            total=db.execute(text('SELECT count(*) FROM chat_session WHERE '+condition),params).scalar_one()
            if id and not total:raise InternalError(404,'NOT_FOUND','Không tìm thấy phiên chat của bạn.')
            rows=db.execute(text('SELECT id,user_id,created_at FROM chat_session WHERE '+condition+' ORDER BY created_at DESC,id DESC LIMIT :size OFFSET :offset'),params).mappings().all()
            items=[{'id':str(r['id']),'user_id':str(r['user_id']),'created_at':r['created_at'].isoformat()} for r in rows]
            if id and items:
                mp,ms=query.get('message_page',1),query.get('message_size',20)
                count=db.execute(text('SELECT count(*) FROM chat_message WHERE session_id=:s'),params).scalar_one()
                messages=db.execute(text('SELECT id,session_id,role,content,response_meta FROM chat_message WHERE session_id=:s ORDER BY created_at,id LIMIT :limit OFFSET :skip'),dict(params,limit=ms,skip=(mp-1)*ms)).mappings().all()
                # History is text only: historical cards/prices must never masquerade as current quotes.
                items[0]['messages']={'items':[{'id':str(m['id']),'session_id':str(m['session_id']),'role':m['role'],'content':m['content']} for m in messages],'total':count,'page':mp,'size':ms}
        return {'items':items,'total':total,'page':page,'size':size}

    def save(self,id,version,question,response,selection,elapsed,stores):
        with self.engine.begin() as db:
            changed=db.execute(text("UPDATE chat_session SET version=version+1 WHERE id=:s AND version=:v AND status='ACTIVE' AND created_at>now()-interval '30 days' RETURNING id"),{'s':id,'v':version}).first()
            if not changed:raise InternalError(409,'VERSION_CONFLICT','Phiên chat đã thay đổi; tải lại rồi gửi lại.')
            db.execute(text("INSERT INTO chat_message(session_id,role,content) VALUES(:s,'USER',:c)"),{'s':id,'c':redact(question)})
            db.execute(text("INSERT INTO chat_message(id,session_id,role,content,product_refs,response_meta) VALUES(:id,:s,'ASSISTANT',:c,CAST(:refs AS jsonb),CAST(:meta AS jsonb))"),{'id':response['id'],'s':id,'c':response['content'],'refs':json.dumps(response['product_cards']),'meta':json.dumps({'fallback':selection.fallback,'reason':selection.reason})})
            db.execute(text("INSERT INTO ai_request_trace(operation,store_ids,latency_ms,fallback,provider,prompt_version,index_version,estimated_tokens,actual_tokens) VALUES('chat',CAST(:stores AS jsonb),:ms,:fallback,:provider,'catalog-selector-v1','live-lexical-v1',:estimate,:actual)"),{'stores':json.dumps(stores),'ms':elapsed,'fallback':selection.fallback,'provider':selection.provider,'estimate':len(question)//3+1000,'actual':selection.actual_tokens})

    async def answer(self,id,user,key,question,correlation):
        started=time.monotonic()
        version,history=await run_in_threadpool(self.load,id,user,key)
        await run_in_threadpool(self.budget,'turn:'+str(user or digest(key)),len(question)//3+1000)
        try:
            async with asyncio.timeout(4):
                candidates=await self.catalog.snapshot(correlation)
                retrieved=await run_in_threadpool(retrieve,self.engine,question,candidates)
                if user:
                    from ..recommendation.runtime import RecommendationRuntime
                    personalized,_,_=await run_in_threadpool(RecommendationRuntime(self.engine,self.catalog).personal,user,retrieved)
                    order={p:i for i,p in enumerate(personalized)}
                    retrieved.sort(key=lambda p:order.get(p['id'],len(order)))
                selection=await self.selector.select(question,retrieved,history,correlation)
                # Resolve selected cards again after generation; no stale cached price or hidden card.
                current=await asyncio.gather(*(self.catalog.product(p,correlation) for p in selection.ids))
                maximum=budget(question)
                if maximum is not None:current=[p for p in current if price(p)<=maximum]
        except TimeoutError:raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Catalog chưa sẵn sàng; vui lòng thử lại.')
        content,cards=compose(selection,current)
        response={'id':str(uuid.uuid4()),'session_id':id,'role':'ASSISTANT','content':content,'product_cards':cards,'fallback':selection.fallback,'fallback_reason':selection.reason,'mode':'real'}
        await run_in_threadpool(self.save,id,version,question,response,selection,round((time.monotonic()-started)*1000),sorted({p['store_id'] for p in current}))
        return response

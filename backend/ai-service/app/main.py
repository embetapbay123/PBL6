import json, os, time, uuid, logging
from pathlib import Path
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import create_engine, text
from pydantic import ValidationError
from .chat.schemas import ChatMessageInput
from .runtime_contracts import validate_operation, MISSING
from .internal_client import InternalClient, InternalError
from .chat.service import MockChatService
from .recommendation.service import MockRecommendationService
from .consent.service import ConsentService
from .consent.domain import ConsentConflict
from starlette.concurrency import run_in_threadpool

log = logging.getLogger('pbl6.ai')
logging.basicConfig(level=logging.INFO, format='%(message)s')
engine = None
limiter = None

class ApiError(Exception):
    def __init__(self, status, code, message): self.status,self.code,self.message=status,code,message

@asynccontextmanager
async def lifespan(app):
    global engine, limiter
    required=['M4_DATABASE_URL','IDENTITY_URL','CATALOG_URL','M4_INTERNAL_KEY','AI_MODE','REDIS_URL']
    if any(not os.getenv(key) for key in required): raise RuntimeError('Missing AI configuration')
    if os.environ['AI_MODE'] != 'mock': raise RuntimeError('Real AI provider is not implemented yet')
    engine=create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1),pool_size=5,max_overflow=0)
    with engine.connect() as db: db.execute(text('SELECT 1'))
    limiter=Redis.from_url(os.environ['REDIS_URL'],socket_timeout=1,socket_connect_timeout=1)
    yield
    await limiter.aclose()
    engine.dispose()

app=FastAPI(title='PBL6 M4 skeleton',lifespan=lifespan)

@app.middleware('http')
async def correlation(request: Request, call_next):
    value=request.headers.get('x-correlation-id','')
    request.state.correlation_id=value if 0<len(value)<=64 and value.replace('-','').isalnum() else str(uuid.uuid4())
    started=time.monotonic()
    if request.url.path.startswith('/api/v1'):
        try:
            count=await limiter.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",1,f"rate:M4:api:{request.client.host}:{int(time.time()//60)}")
            if count>600:
                response=JSONResponse(status_code=429,headers={'Retry-After':'60'},content={'code':'RATE_LIMITED','message':'Vui lòng thử lại sau.','correlation_id':request.state.correlation_id,'details':[]})
            else: response=await call_next(request)
        except RedisError:
            response=JSONResponse(status_code=503,content={'code':'DEPENDENCY_UNAVAILABLE','message':'Bộ giới hạn truy cập chưa sẵn sàng.','correlation_id':request.state.correlation_id,'details':[]})
    else: response=await call_next(request)
    response.headers['X-Correlation-Id']=request.state.correlation_id
    log.info(json.dumps({'service':'M4','status':response.status_code,'route':getattr(request.scope.get('route'),'path','unmatched'),'correlation_id':request.state.correlation_id,'duration_ms':round((time.monotonic()-started)*1000)}))
    return response

@app.exception_handler(ApiError)
async def api_error(request, error):
    return JSONResponse(status_code=error.status,content={'code':error.code,'message':error.message,'correlation_id':request.state.correlation_id,'details':[]})

@app.exception_handler(RequestValidationError)
async def validation_error(request,error):
    return await api_error(request,ApiError(422,'VALIDATION_FAILED','Dữ liệu không hợp lệ.'))

@app.exception_handler(HTTPException)
async def http_error(request,error):
    return await api_error(request,ApiError(error.status_code,'NOT_FOUND' if error.status_code==404 else 'HTTP_ERROR','Yêu cầu không hợp lệ.'))

@app.exception_handler(Exception)
async def unexpected_error(request,error):
    log.error(json.dumps({'service':'M4','code':'INTERNAL_ERROR','correlation_id':request.state.correlation_id}))
    return await api_error(request,ApiError(500,'INTERNAL_ERROR','Có lỗi hệ thống.'))

async def context(request: Request, roles: list[str]):
    token=request.headers.get('authorization','')
    if 'GUEST' in roles and not token: return None
    if not token.startswith('Bearer '): raise ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.')
    try:
        result=await InternalClient('M4',os.environ['M4_INTERNAL_KEY'],{'M3':os.environ['IDENTITY_URL']}).call('ResolveContext',{'token':token[7:]},request.state.correlation_id)
        if roles and 'GUEST' not in roles and not set(roles).intersection(result['roles']): raise ApiError(403,'FORBIDDEN','Không có quyền.')
        return result
    except InternalError as error: raise ApiError(error.status,error.code,error.message)

@app.get('/health/live')
def live(): return {'status':'alive','service':'M4'}

@app.get('/health/ready')
def ready():
    if engine is None: raise ApiError(503,'DEPENDENCY_UNAVAILABLE','Database chưa sẵn sàng.')
    with engine.connect() as db:
        row=db.execute(text("SELECT version FROM schema_migration WHERE version='001_initial.sql'")).first()
        if not row: raise ApiError(503,'SCHEMA_NOT_READY','Chưa chạy migration.')
    return {'status':'ready','service':'M4','mode':'mock'}

contract_file=Path('/app/contracts/endpoint-status.json')
if not contract_file.exists(): contract_file=Path(__file__).resolve().parents[3]/'docs/contracts/endpoint-status.json'
# Local layout is backend/ai-service/app: parents[3] is repository root.

def register(record):
    async def endpoint(request: Request):
        identity=await context(request,record['roles'])
        op=record['operation_id']
        try:
            raw=await request.body()
            payload=json.loads(raw) if raw else MISSING
            query={key:request.query_params.getlist(key) if len(request.query_params.getlist(key))>1 else value for key,value in request.query_params.items()}
            request.state.contract=validate_operation(op,body=payload,path=request.path_params,query=query,headers=dict(request.headers))
        except (ValueError,ValidationError): raise ApiError(422,'VALIDATION_FAILED','Dữ liệu không hợp lệ.')
        if op in ['getPersonalizationConsent','updatePersonalizationConsent']:
            if engine is None: raise ApiError(503,'DEPENDENCY_UNAVAILABLE','Database chưa sẵn sàng.')
            service=ConsentService(engine)
            try:
                if op=='getPersonalizationConsent': return await run_in_threadpool(service.get,identity['user_id'])
                return await run_in_threadpool(service.update,identity['user_id'],request.state.contract['body'])
            except ConsentConflict: raise ApiError(409,'VERSION_CONFLICT','Consent đã thay đổi.')
        if op in ['getForYou','getRelatedProducts']:
            try:
                async with httpx.AsyncClient(timeout=2) as client:
                    response=await client.get(os.environ['CATALOG_URL']+'/api/v1/products',headers={'X-Correlation-Id':request.state.correlation_id})
                if response.status_code!=200: raise ApiError(503,'DEPENDENCY_UNAVAILABLE','Không xác minh được sản phẩm.')
                return await MockRecommendationService().recommend(identity['user_id'] if identity else None,response.json()['items'])
            except httpx.HTTPError: raise ApiError(503,'DEPENDENCY_UNAVAILABLE','Catalog chưa sẵn sàng.')
        if op=='getAiMetrics': return {'index_status':'MOCK','model_version':'mock','evaluation_status':'NOT_RUN','metrics':{},'mode':'mock'}
        if op=='sendChatMessage':
            try: payload=await request.json()
            except ValueError: raise ApiError(422,'VALIDATION_FAILED','JSON không hợp lệ.')
            try: input=ChatMessageInput.model_validate(payload)
            except ValidationError: raise ApiError(422,'VALIDATION_FAILED','content cần từ 1 đến 2000 ký tự, không nhận trường ngoài contract.')
            return await MockChatService().answer(request.path_params.get('id'),input)
        raise ApiError(501,'FEATURE_NOT_IMPLEMENTED',f'Chức năng {op} đang chờ triển khai.')
    app.add_api_route('/api/v1'+record['path'],endpoint,methods=[record['method']],name=record['operation_id'])

for record in json.loads(contract_file.read_text(encoding='utf-8')):
    if record['service']=='M4': register(record)

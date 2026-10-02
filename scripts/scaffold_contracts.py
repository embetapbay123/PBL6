"""Generate owned schema/model/placeholder files from the reviewed design contract.

Initial generator: controllers/migrations are overwritten only with --force-overwrite.
Existing hand-written service/repository extension files are preserved.
Run only after reviewing changes to OpenAPI/data dictionary; review generated diffs.
"""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
SERVICE = {'M1':'catalog-service','M2':'commerce-service','M3':'identity-store-service','M4':'ai-service'}
MODULES = {
 'M1': ['catalog','inventory','review','moderation'],
 'M2': ['cart','order','voucher','payment','report'],
 'M3': ['auth','profile','store','staff','administration'],
 'M4': ['chat','recommendation','tracking','consent','evaluation'],
}
IMPLEMENTED = {'login','refresh','logout','getProfile','getAuthContext','listProducts','getProduct','updateProduct'}

def write(path, content):
 p=ROOT/path; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(content,encoding='utf-8')

def snake(name): return re.sub(r'(?<!^)(?=[A-Z])','_',name).lower()

def ownership(op):
 name=op['operationId']; tag=op['tags'][0]
 if tag=='Admin':
  if any(word in name.lower() for word in ['product','category','attribute']): return 'M1','moderation','Thịnh'
  if name in ['listAllOrders','getPlatformDashboard']: return 'M2','report','Hoa'
  return 'M3','administration','Trí'
 if tag=='AI': return 'M4',('chat' if 'Chat' in name else 'evaluation' if 'Metrics' in name else 'consent' if 'Consent' in name else 'recommendation'),'Công'
 return {'Auth':('M3','auth','Trí'),'Profile':('M3','profile','Trí'),'Store':('M3','staff' if any(w in name.lower() for w in ['staff','invitation']) else 'store','Trí'),
  'Catalog':('M1','catalog','Thịnh'),'Inventory':('M1','inventory','Thịnh'),'Review':('M1','review','Thịnh'),
  'Cart':('M2','cart','Hoa'),'Checkout':('M2','order','Hoa'),'Order':('M2','report' if 'Report' in name else 'order','Hoa'),
  'Payment':('M2','payment','Công'),'Voucher':('M2','voucher','Hoa')}[tag]

def contracts():
 path=DOCS/'contracts/openapi.json'; api=json.loads(path.read_text(encoding='utf-8'))
 schemas=api['components']['schemas']
 schemas['LoginRequest']['properties']['client_type']={'type':'string','enum':['WEB','MOBILE'],'default':'MOBILE'}
 schemas['AuthTokens']['required']=[x for x in schemas['AuthTokens']['required'] if x!='refresh_token']
 schemas['RefreshRequest'].pop('required',None)
 schemas['RefreshRequest']['description']='Web uses HttpOnly cookie + Origin/X-CSRF-Token. Mobile supplies refresh_token.'
 for endpoint in ['/auth/login','/auth/refresh','/auth/logout']:
  api['paths'][endpoint]['post']['x-session-transport']='WEB cookie / MOBILE body; client_type on login'
  for response in api['paths'][endpoint]['post']['responses'].values():
   if 'content' in response: continue
 schemas['PersonalizationConsentView']={'type':'object','properties':{'status':{'type':'string','enum':['GRANTED','WITHDRAWN']},'version':{'type':'integer'},'changed_at':{'type':'string','format':'date-time'}},'required':['status','version']}
 schemas['PersonalizationConsentUpdate']={'type':'object','properties':{'status':{'type':'string','enum':['GRANTED','WITHDRAWN']},'expected_version':{'type':'integer','minimum':0}},'required':['status','expected_version']}
 schemas['SePayWebhook']={'type':'object','properties':{'id':{'type':'integer'},'transferType':{'type':'string','enum':['in','out']},'transferAmount':{'type':'integer','minimum':0},'accountNumber':{'type':'string'},'code':{'type':'string','nullable':True},'content':{'type':'string'},'referenceCode':{'type':'string'}},'required':['id','transferType','transferAmount','accountNumber','content']}
 additions=[('/me/personalization-consent','get','getPersonalizationConsent','AI','PersonalizationConsentView',None),('/me/personalization-consent','patch','updatePersonalizationConsent','AI','PersonalizationConsentView','PersonalizationConsentUpdate'),('/payment-callbacks/sepay','post','sepayCallback','Payment',None,'SePayWebhook')]
 for route,method,name,tag,result,request in additions:
  op={'operationId':name,'tags':[tag],'summary':name,'parameters':[], 'responses':{'200':{'description':'Result'}}, 'security':[{'BearerAuth':[]}], 'x-required-roles':['CUSTOMER'],'x-data-scope':'OWN_USER'}
  if result: op['responses']['200']['content']={'application/json':{'schema':{'$ref':f'#/components/schemas/{result}'}}}
  if request: op['requestBody']={'required':True,'content':{'application/json':{'schema':{'$ref':f'#/components/schemas/{request}'}}}}
  if name=='sepayCallback':
   op.update(security=[], **{'x-required-roles':['SEPAY_TEST'],'x-data-scope':'SIGNED_CALLBACK','description':'HMAC SHA256(timestamp.raw_body), timestamp window 300s; Test Mode only. No business processing in skeleton.'})
   op['parameters']=[{'in':'header','name':h,'required':True,'schema':{'type':'string'}} for h in ['X-SePay-Signature','X-SePay-Timestamp']]
   op['responses']['200']['content']={'application/json':{'schema':{'type':'object','properties':{'success':{'type':'boolean'}},'required':['success']}}}
  api['paths'].setdefault(route,{})[method]=op
 # Provider-specific fields belong to the existing Attempt response.
 attempt=schemas.get('PaymentAttempt',{})
 attempt.setdefault('properties',{}).update({'provider':{'type':'string','enum':['SEPAY_TEST']},'payment_code':{'type':'string'},'qr_url':{'type':'string','format':'uri'},'expires_at':{'type':'string','format':'date-time'}})
 records=[]
 for route,methods in api['paths'].items():
  for method,op in methods.items():
   sid,module,owner=ownership(op)
   state='IMPLEMENTED_SAMPLE' if op['operationId'] in IMPLEMENTED else 'MOCK_ONLY' if sid=='M4' and op['operationId'] in ['getForYou','getRelatedProducts','sendChatMessage','getAiMetrics'] else 'NOT_IMPLEMENTED'
   op.update(**{'x-service-owner':sid,'x-module':module,'x-member-owner':owner,'x-implementation-status':state})
   op['responses']['501']={'description':'FEATURE_NOT_IMPLEMENTED: skeleton only','content':{'application/json':{'schema':{'$ref':'#/components/schemas/Error'}}}}
   records.append({'method':method.upper(),'path':route,'operation_id':op['operationId'],'service':sid,'module':module,'owner':owner,'status':state,'roles':op.get('x-required-roles',[])})
 api['info']['version']='2.2.0-skeleton'; api['info']['description']='Four-service SOA skeleton. See x-implementation-status; schema is not proof of business implementation.'
 write('docs/contracts/openapi.json',json.dumps(api,ensure_ascii=False,indent=2)+'\n')
 write('docs/contracts/endpoint-status.json',json.dumps(records,ensure_ascii=False,indent=2)+'\n')
 for sid,service in SERVICE.items():
  for module in MODULES[sid]:
   subset=[r for r in records if r['service']==sid and r['module']==module]
   folder=f'backend/{service}/src/{module}' if sid!='M4' else f'backend/{service}/app/{module}'
   write(folder+'/README.md',f'# {sid} / {module}\n\nOwner: '+(', '.join(sorted(set(r['owner'] for r in subset))) or 'Công')+'\n\n'+ '\n'.join(f"- `{r['method']} {r['path']}` — {r['operation_id']}: **{r['status']}**" for r in subset)+'\n\nXem [backlog](../../../../docs/implementation/member-backlog.md). Implement service logic, migrations, ownership, audit, timeout/recovery and tests before changing endpoint status.\n')
   if sid=='M4': continue
   stubs=[r for r in subset if r['status']=='NOT_IMPLEMENTED' and r['operation_id']!='sepayCallback']
   klass=''.join(x.capitalize() for x in module.split('-'))+'SkeletonController'
   lines=["// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.","import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';","import { AuthGuard, Public, Roles } from '../../../shared/src/auth';","import { notImplemented } from '../../../shared/src/errors';","@Controller() @UseGuards(AuthGuard)",f'export class {klass} {{']
   for r in sorted(stubs,key=lambda x:x['path'].count('{')):
    decorator=r['method'].capitalize(); endpoint=re.sub(r'\{([^}]+)\}',r':\1',r['path']).lstrip('/')
    public='GUEST' in r['roles'] or 'SANDBOX_PROVIDER' in r['roles'] or not r['roles']
    meta='@Public()' if public else '@Roles('+','.join(json.dumps(x) for x in r['roles'])+')'
    lines.extend([f"  @{decorator}('{endpoint}') {meta}",f"  {r['operation_id']}(): never {{ return notImplemented('{r['operation_id']}'); }}"])
   lines.append('}')
   write(folder+f'/{module}.skeleton.controller.ts','\n'.join(lines)+'\n')
   # Named service/repository extension points, no fake persistence.
   target=ROOT/folder/f'{module}.service.ts'
   if not target.exists(): write(str(target.relative_to(ROOT)),f"// Extension point for {module}; controller must delegate here after implementation.\nexport class {module.capitalize()}Service {{}}\n")
   target=ROOT/folder/f'{module}.repository.ts'
   if not target.exists(): write(str(target.relative_to(ROOT)),f"// Use only this service database; parameterize queries and pass transaction managers explicitly.\nexport class {module.capitalize()}Repository {{}}\n")
  if sid!='M4':
   imports=[]; names=[]
   for module in MODULES[sid]:
    name=module.capitalize()+'SkeletonController'; imports.append(f"import {{ {name} }} from './{module}/{module}.skeleton.controller';"); names.append(name)
   if sid=='M1': imports.append("import { CatalogController } from './catalog/catalog.controller';"); names.insert(0,'CatalogController')
   if sid=='M3': imports.append("import { AuthController } from './auth/auth.controller';"); names.insert(0,'AuthController')
   if sid=='M2': imports.append("import { SePayController } from './payment/sepay.controller';"); names.insert(0,'SePayController')
   write(f'backend/{service}/src/main.ts',f"process.env.SERVICE_ID = '{sid}';\nimport {{ bootstrap }} from '../../shared/src/bootstrap';\n"+'\n'.join(imports)+f"\nbootstrap('{sid}',[{','.join(names)}]).catch(()=>{{ console.error('Startup failed: check service configuration and dependencies.'); process.exit(1); }});\n")
   write(f'backend/{service}/package.json',json.dumps({'name':f'pbl6-{sid.lower()}','private':True,'scripts':{'build':'npm --prefix .. run build','dev':f'npm --prefix .. run dev:{sid.lower()}','test':'npm --prefix .. test'}},indent=2)+'\n')
 status='| Method | Path | Operation | Service/module | Owner | Status |\n| --- | --- | --- | --- | --- | --- |\n'
 status+='\n'.join(f"| {r['method']} | `{r['path']}` | {r['operation_id']} | {r['service']}/{r['module']} | {r['owner']} | {r['status']} |" for r in records)
 write('docs/implementation/endpoint-status.md','# Endpoint status\n\nGenerated from OpenAPI. IMPLEMENTED_SAMPLE = limited starter behavior; MOCK_ONLY is not MVP acceptance. Protected placeholders require a valid session/role before returning 501.\n\n'+status+'\n')
 return records

def schema():
 dictionary=(DOCS/'data-dictionary.md').read_text(encoding='utf-8'); fields={}
 for line in dictionary.splitlines():
  cells=[x.strip() for x in line.split('|')[1:-1]]
  if len(cells)>=5 and re.match(r'^\w+\.\w+$',cells[0]): fields[cells[0]]=cells
 entities={}; sid_by={}
 for file in sorted((DOCS/'diagrams/erd').glob('*.mmd')):
  if file.name.startswith('00'): continue
  sid='M3' if file.name[:2] in ['01','02'] else 'M1' if file.name[:2] in ['03','04'] else 'M2' if file.name[:2] in ['05','06','07'] else 'M4'
  for name,body in re.findall(r'^  (\w+) \{\n(.*?)^  \}',file.read_text(encoding='utf-8'),re.M|re.S):
   cols=[]
   for typ,col,marker in re.findall(r'^    (\w+) (\w+)(?: (PK|FK))?$',body,re.M):
    info=fields.get(name+'.'+col); nullable=(info[2]=='Có') if info else marker!='PK'
    default=info[3] if info else '—'; cols.append((typ,col,marker,nullable,default))
   entities[name]=cols; sid_by[name]=sid
 known={'user_id':'User','customer_user_id':'User','applicant_user_id':'User','decided_by_user_id':'User','invited_user_id':'User','invited_by_user_id':'User','actor_user_id':'User','store_id':'Store','application_id':'StoreApplication','membership_id':'StoreMembership','permission_id':'Permission','role_id':'Role','category_id':'Category','parent_id':'Category','product_type_id':'ProductType','product_id':'Product','variant_id':'ProductVariant','review_id':'Review','cart_id':'Cart','order_id':'Order','order_item_id':'OrderItem','payment_id':'Payment','attempt_id':'PaymentAttempt','voucher_id':'Voucher','reservation_id':'InventoryReservation','inventory_id':'Inventory','reservation_item_id':'ReservationItem','session_id':'ChatSession','model_version_id':'ModelVersion','training_run_id':'TrainingRun'}
 for sid,service in SERVICE.items():
  names=[n for n in entities if sid_by[n]==sid]; sql=['-- GENERATED schema foundation from ERD + data dictionary; review migrations before evolving.','CREATE EXTENSION IF NOT EXISTS pgcrypto;']
  if sid=='M4': sql.append('CREATE EXTENSION IF NOT EXISTS vector;')
  for name in names:
   cols=entities[name]; declarations=[]; props=[]
   for typ,col,marker,nullable,default in cols:
    pgtyp={'int':'integer','vector':'vector(1536)'}.get(typ,typ)
    literal=''
    if marker=='PK' and typ=='uuid' and col=='id': literal=' DEFAULT gen_random_uuid()'
    elif default in ['now()','gen_random_uuid()']: literal=' DEFAULT '+default
    elif re.fullmatch(r'\d+|true|false',default): literal=' DEFAULT '+default
    elif typ=='jsonb': literal=" DEFAULT '{}'::jsonb" if col not in ['allowed_values'] else " DEFAULT '[]'::jsonb"
    elif col=='version' and typ=='int': literal=' DEFAULT 0'
    declarations.append(f'  "{col}" {pgtyp}'+(' NOT NULL' if not nullable or marker=='PK' else '')+literal)
    if sid!='M4':
     deco='PrimaryColumn' if marker=='PK' else 'Column'; tstyp='string' if typ in ['uuid','varchar','text','bigint'] else 'number' if typ in ['int','numeric'] else 'boolean' if typ=='boolean' else 'Date' if typ=='timestamptz' else 'Record<string, unknown>'
     options={'type':{'int':'integer'}.get(typ,typ),'nullable':nullable and marker!='PK'}
     props.append(f'  @{deco}({json.dumps(options)})\n  {col}!: {tstyp}'+(' | null' if nullable and marker!='PK' else '')+';')
   pk=[f'"{col}"' for _,col,m,_,_ in cols if m=='PK']; declarations.append('  PRIMARY KEY ('+','.join(pk)+')')
   sql.append(f'CREATE TABLE "{snake(name)}" (\n'+',\n'.join(declarations)+'\n);')
   if sid!='M4': write(f'backend/{service}/src/entities/{snake(name)}.entity.ts',"// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.\nimport { Entity, Column, PrimaryColumn } from 'typeorm';\n"+f"@Entity('{snake(name)}')\nexport class {name} {{\n"+'\n'.join(props)+'\n}\n')
  for name in names:
   for typ,col,marker,nullable,default in entities[name]:
    target=known.get(col)
    if (marker=='FK' or marker=='PK' and col!='id') and target and sid_by.get(target)==sid:
     sql.append(f'ALTER TABLE "{snake(name)}" ADD FOREIGN KEY ("{col}") REFERENCES "{snake(target)}"(id);')
  extra={
   'M1':["CREATE UNIQUE INDEX sku_store_unique ON product_variant(store_id,sku);","CREATE UNIQUE INDEX variant_signature_unique ON product_variant(product_id,variant_signature);","CREATE UNIQUE INDEX inventory_variant_unique ON inventory(variant_id);","CREATE UNIQUE INDEX review_item_unique ON review(order_item_id);","ALTER TABLE review ADD CHECK(rating BETWEEN 1 AND 5);","ALTER TABLE inventory ADD CHECK(quantity>=reserved_quantity AND reserved_quantity>=0);","ALTER TABLE product_variant ADD CHECK(price_vnd>=0);","CREATE INDEX product_public_filter ON product(store_id,status,moderation_status);","CREATE INDEX product_attribute_gin ON product USING gin(attributes_json);"],
   'M2':["CREATE UNIQUE INDEX order_group_store_unique ON \"order\"(purchase_group_id,store_id);","CREATE UNIQUE INDEX payment_order_unique ON payment(order_id);","CREATE UNIQUE INDEX attempt_success_unique ON payment_attempt(payment_id) WHERE status='SUCCEEDED';","CREATE UNIQUE INDEX provider_reference_unique ON payment_attempt(provider_reference);","CREATE UNIQUE INDEX provider_event_unique ON payment_event(provider_event_id);","CREATE UNIQUE INDEX refund_operation_unique ON refund(operation_id);","CREATE UNIQUE INDEX cart_user_unique ON cart(customer_user_id);","CREATE INDEX order_customer_status ON \"order\"(customer_user_id,status);"],
   'M3':["CREATE UNIQUE INDEX user_email_unique ON \"user\"(lower(email));","CREATE UNIQUE INDEX profile_user_unique ON customer_profile(user_id);","CREATE UNIQUE INDEX role_code_unique ON role(code);","CREATE UNIQUE INDEX permission_code_unique ON permission(code);","CREATE UNIQUE INDEX membership_user_active ON store_membership(user_id) WHERE status='ACTIVE';","CREATE UNIQUE INDEX owner_store_active ON store_membership(store_id) WHERE status='ACTIVE' AND role='OWNER';","ALTER TABLE refresh_session ADD family_id uuid NOT NULL;","CREATE UNIQUE INDEX refresh_token_unique ON refresh_session(token_hash);"],
   'M4':["CREATE UNIQUE INDEX consent_user_unique ON personalization_consent(user_id);"],
  }
  sql.extend(extra[sid])
  sql.extend(["CREATE TABLE outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, payload jsonb NOT NULL, correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts int NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now());", "CREATE TABLE inbox(producer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(producer,event_id));", "CREATE TABLE operation_result(caller text NOT NULL, operation_id uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(caller,operation_id));","CREATE INDEX outbox_pending ON outbox(next_attempt_at) WHERE published_at IS NULL;","CREATE TABLE bootstrap_effect(event_id uuid PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());"])
  write(f'backend/{service}/migrations/001_initial.sql','\n'.join(sql)+'\n')
  if sid=='M4':
   # Alembic reads the SQL foundation; model metadata belongs only to M4.
   lines=['# GENERATED baseline SQLAlchemy models; retain bigint as Python int.','from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean, DateTime, Numeric','from sqlalchemy.dialects.postgresql import UUID, JSONB','from sqlalchemy.orm import declarative_base','from pgvector.sqlalchemy import Vector','Base = declarative_base()']
   for name in names:
    lines.extend([f'class {name}(Base):',f'    __tablename__ = "{snake(name)}"'])
    for typ,col,marker,nullable,_ in entities[name]:
     pytype={'uuid':'UUID(as_uuid=True)','varchar':'String','text':'Text','int':'Integer','bigint':'BigInteger','jsonb':'JSONB','boolean':'Boolean','timestamptz':'DateTime(timezone=True)','vector':'Vector(1536)','numeric':'Numeric'}.get(typ,'String')
     lines.append(f'    {col} = Column({pytype}, primary_key={marker=="PK"}, nullable={nullable and marker!="PK"})')
   write('backend/ai-service/app/models.py','\n'.join(lines)+'\n')
 print('Generated',len(entities),'domain entities across four owned databases')

if __name__=='__main__':
 import sys
 if '--force-overwrite' not in sys.argv and (ROOT/'backend/catalog-service/src/main.ts').exists():
  raise SystemExit('Initial scaffold already exists. This generator overwrites controllers/migrations. Update contracts and modules manually; use --force-overwrite only in a disposable checkout after review.')
 records=contracts(); schema(); print('Mapped',len(records),'operations')

"""Targeted Debian2 storefront overlay. Preserve every active API/worker environment."""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

stage=Path(sys.argv[1]);ident=sys.argv[2];mode=sys.argv[3]
assert re.fullmatch('[a-f0-9]{32}',ident) and mode in ('inspect','deploy')
root=Path.home()/'pbl6-demo';os.chdir(root)
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml','-f','infrastructure/secrets/tunnel.compose.yaml']
manifest=json.loads((stage/'manifest.json').read_text())
groups={'m1':['m1','worker-m1'],'m2':['m2','worker-m2','worker-refund'],'m3':['m3','worker-m3']}
runtime={};candidates={};changed=False;gateway_changed=False;persisted=[]
backup=root/'backups'/('storefront-'+ident)
def run(args,**kw):return subprocess.run(args,check=True,**kw)
def private(path,value):path.write_text(json.dumps(value));path.chmod(0o600)
def compose(*extra,override=None):return base+(['-f',str(override)] if override else [])+list(extra)
def inspect(service):
 container=subprocess.check_output(compose('ps','-q',service)).decode().strip()
 data=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
 if not data['State']['Running'] or data['Config']['Labels'].get('com.docker.compose.project')!='pbl6-demo':raise ValueError('Review inactive or unexpected service '+service)
 return data
def sha(data):return hashlib.sha256(data.replace(b'\r\n',b'\n')).hexdigest()
def override(path,rollback=False):
 services={}
 for service,data in runtime.items():
  group=next(g for g,names in groups.items() if service in names)
  services[service]={'image':data['Image'] if rollback else 'pbl6-demo-storefront-'+group+':latest','environment':{k:v.replace('$','$$') for k,v in dict(v.split('=',1) for v in data['Config']['Env']).items()},'command':data['Config']['Cmd'],'user':data['Config']['User']}
 # Mounts and networks are unchanged in the existing Compose definitions.
 private(path,{'services':services})
def database_vars():
 return {g.upper()+'_DATABASE_URL':dict(v.split('=',1) for v in runtime[g]['Config']['Env'])[g.upper()+'_DATABASE_URL'] for g in groups}
try:
 configured=json.loads(subprocess.check_output(compose('config','--format','json')))
 source=(root/'infrastructure/compose.yaml').read_text()
 for service in [s for names in groups.values() for s in names]:
  if not re.search(r'^  '+re.escape(service)+r':\n.*?(?=^  [A-Za-z0-9_-]+:\n|^[a-zA-Z][a-zA-Z_-]*:\n|\Z)',source,re.M|re.S):raise ValueError('Review Compose service block '+service)
 for group,names in groups.items():
  for service in names:
   data=inspect(service);runtime[service]=data
   actual=dict(v.split('=',1) for v in data['Config']['Env'])
   expected=configured['services'][service].get('environment',{})
   if any(str(value)!=actual.get(key) for key,value in expected.items()):raise ValueError('Compose and active environment differ in '+service+'; no deployment made')
  for name,expected in manifest['sources'].items():
   if not name.startswith(group.replace('m1','catalog-service').replace('m2','commerce-service').replace('m3','identity-store-service')+'/src/') and name not in ('shared/src/internal-clients.ts','shared/src/request-contract.ts'):continue
   result=subprocess.run(['docker','exec',runtime[group]['Id'],'cat',name],capture_output=True)
   if result.returncode:
    if expected['before'] is not None:raise ValueError('Missing active baseline source '+name)
   elif sha(result.stdout) not in (expected['before'],expected['after']):raise ValueError('Active baseline changed: '+group+':'+name)
  print(group+': active source and API/worker environments verified.',flush=True)
 print('STOREFRONT_PREFLIGHT_OK',flush=True)
 if mode=='inspect':raise SystemExit(0)
 codec='pbl6-storefront-test-codecs:base-'+runtime['m3']['Image'].removeprefix('sha256:')
 run(['docker','image','inspect',codec],stdout=subprocess.DEVNULL)
 backup.mkdir(parents=True,mode=0o700)
 if shutil.disk_usage(backup).free<1024**3:raise ValueError('Insufficient free space for database backups')
 private(backup/'runtime.before.json',runtime)
 shutil.copyfile(root/'infrastructure/compose.yaml',backup/'compose.before.yaml');(backup/'compose.before.yaml').chmod(0o600)
 gateway=root/'infrastructure/Caddyfile'
 shutil.copyfile(gateway,backup/'Caddyfile.before')
 gateway_source=gateway.read_text()
 public_before='@publicStore path_regexp publicStore ^/api/v1/stores/[^/]+$'
 public_after='@publicStore path_regexp publicStore ^/api/v1/stores/[^/]+(?:/storefront(?:/banners/[^/]+/content)?)?$'
 if public_before not in gateway_source and public_after not in gateway_source:raise ValueError('Review public store gateway matcher')
 gateway_source=gateway_source.replace(public_before,public_after)
 if '/api/v1/store/storefront ' not in gateway_source:
  marker='/api/v1/store /api/v1/store/staff*'
  if gateway_source.count(marker)!=1:raise ValueError('Review owner gateway matcher')
  gateway_source=gateway_source.replace(marker,'/api/v1/store /api/v1/store/storefront /api/v1/store/storefront/* /api/v1/store/staff*')
 for key,url in database_vars().items():
  parsed=urlparse(url)
  if parsed.hostname!='postgres' or not re.fullmatch('[a-zA-Z0-9_]+',parsed.path.strip('/')):raise ValueError('Unexpected database location')
  path=backup/(key[:2].lower()+'.dump')
  with path.open('wb') as stream:run(compose('exec','-T','postgres','sh','-c','exec pg_dump -U "${POSTGRES_USER:-postgres}" -d "$1" -Fc','sh',parsed.path.strip('/')),stdout=stream)
  path.chmod(0o600)
  with path.open('rb') as stream:run(compose('exec','-T','postgres','pg_restore','--list'),stdin=stream,stdout=subprocess.DEVNULL)
 print('Three database dumps verified; active data and credentials retained.',flush=True)
 for file in (stage/'overlay').rglob('*'):
  file.chmod(0o755 if file.is_dir() else 0o644)
 for group in groups:
  parent=codec if group=='m3' else 'pbl6-storefront-base-'+group+':'+ident
  if group!='m3':run(['docker','tag',runtime[group]['Image'],parent])
  dockerfile=stage/('Dockerfile.'+group)
  dockerfile.write_text('FROM '+parent+'\nUSER root\nCOPY overlay/backend/ /app/backend/\nUSER node\n')
  tag='pbl6-demo-storefront-'+group+':deploy-'+ident
  run(['docker','build','-f',str(dockerfile),'-t',tag,str(stage)])
  candidates[group]=tag
 envfile=stage/'database.env';envfile.write_text(''.join(k+'='+v+'\n' for k,v in database_vars().items()));envfile.chmod(0o600)
 network=next(iter(runtime['m3']['NetworkSettings']['Networks']))
 migrations={'M1':'catalog-service/migrations/017_product_publication.sql','M2':'commerce-service/migrations/028_storefront_sales_lookup.sql','M3':'identity-store-service/migrations/016_storefront.sql'}
 code="""const{Client}=require('pg'),fs=require('fs');(async()=>{const migrations=JSON.parse(fs.readFileSync(0,'utf8'));for(const[id,file]of Object.entries(migrations)){const c=new Client({connectionString:process.env[id+'_DATABASE_URL']});await c.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(721621)');const version=file.split('/').pop();if(!(await c.query('SELECT 1 FROM schema_migration WHERE version=$1',[version])).rowCount){await c.query(fs.readFileSync(file,'utf8'));await c.query('INSERT INTO schema_migration(version) VALUES($1)',[version]);}await c.query('COMMIT');console.log(id+': reviewed storefront migration ready.');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}}})().catch(()=>{console.error('Reviewed migration failed; additive schema retained for inspection.');process.exitCode=1});"""
 run(['docker','run','--rm','-i','--network',network,'--env-file',str(envfile),candidates['m3'],'node','-e',code],input=json.dumps(migrations).encode())
 for group,tag in candidates.items():run(['docker','tag',tag,'pbl6-demo-storefront-'+group+':latest'])
 path=stage/'override.json';override(path)
 changed=True
 run(compose('up','-d','--no-deps','--no-build','--pull','never',*runtime,override=path))
 for group in groups:
  ready=False
  for _ in range(15):
   cmd=compose('exec','-T',group,'node','-e',"fetch('http://127.0.0.1:310"+group[1]+"/health/ready',{signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>process.exitCode=1)",override=path)
   if subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:ready=True;break
   time.sleep(2)
  if not ready:raise ValueError('Readiness failed for '+group)
 for service,old in runtime.items():
  current=inspect(service);group=next(g for g,names in groups.items() if service in names)
  candidate_id=subprocess.check_output(['docker','image','inspect','--format','{{.Id}}',candidates[group]]).decode().strip()
  if current['Image']!=candidate_id or sorted(current['Config']['Env'])!=sorted(old['Config']['Env']):raise ValueError('Image/environment verification failed in '+service)
  key=lambda m:(m['Destination'],m['Type'],m['Source'],m['RW'])
  if sorted(map(key,current['Mounts']))!=sorted(map(key,old['Mounts'])):raise ValueError('Private mounts changed in '+service)
 gateway_changed=True
 gateway.write_text(gateway_source)
 run(compose('exec','-T','gateway','caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'),stdout=subprocess.DEVNULL)
 run(compose('exec','-T','gateway','caddy','reload','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'),stdout=subprocess.DEVNULL)
 for attempt in range(5):
  result=subprocess.run(['curl','-sS','--max-time','20','-o','/dev/null','-w','%{http_code}','https://demo.congnguyen.me/api/v1/store/storefront'],capture_output=True)
  status=result.stdout.decode()
  if result.returncode==0 and status=='401':break
  if status not in ('000','502','503','504'):break
  time.sleep(2)
 if status!='401':raise ValueError('Public owner authentication smoke failed, HTTP '+status)
 # Persist only reviewed source/compiled files and service image references.
 for name in manifest['files']:
  target=root/name;old=backup/'source'/name
  if target.exists():old.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(target,old)
  persisted.append((target,old if old.exists() else None));target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(stage/'overlay'/name,target)
 source=(root/'infrastructure/compose.yaml').read_text()
 for service in runtime:
  group=next(g for g,names in groups.items() if service in names)
  match=re.search(r'^  '+re.escape(service)+r':\n.*?(?=^  [A-Za-z0-9_-]+:\n|^[a-zA-Z][a-zA-Z_-]*:\n|\Z)',source,re.M|re.S)
  if not match:raise ValueError('Review Compose service block '+service)
  block=re.sub(r'^    image:.*\n','',match.group(0),flags=re.M)
  block=block.replace('  '+service+':\n','  '+service+':\n    image: pbl6-demo-storefront-'+group+':latest\n',1)
  source=source[:match.start()]+block+source[match.end():]
 (root/'infrastructure/compose.yaml').write_text(source);(root/'infrastructure/compose.yaml').chmod(0o600)
 run(compose('config','--quiet'))
 print('STOREFRONT_DEPLOY_OK: seven matching Node APIs/workers ready, three reviewed migrations applied, active environments and mounts preserved.',flush=True)
except Exception as error:
 print('Storefront rollout stopped: '+str(error),file=sys.stderr,flush=True)
 if changed:
  shutil.copyfile(backup/'compose.before.yaml',root/'infrastructure/compose.yaml')
  for target,old in reversed(persisted):
   if old:shutil.copyfile(old,target)
   else:target.unlink(missing_ok=True)
  path=stage/'rollback.json';override(path,rollback=True)
  run(compose('up','-d','--no-deps','--no-build','--pull','never',*runtime,override=path))
  if gateway_changed:
   gateway.write_text((backup/'Caddyfile.before').read_text())
   run(compose('exec','-T','gateway','caddy','reload','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'),stdout=subprocess.DEVNULL)
  print('Previous Node runtimes restored; additive schema and database backups retained.',flush=True)
 raise SystemExit(1)

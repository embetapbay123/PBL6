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
all_groups={'m1':['m1','worker-m1'],'m2':['m2','worker-m2','worker-refund'],'m3':['m3','worker-m3']}
scope=manifest.get('scope','storefront')
if scope not in ('storefront','vouchers','chat'):raise ValueError('Unexpected reviewed deployment scope')
groups={'m2':all_groups['m2']} if scope=='vouchers' else {'m3':all_groups['m3']} if scope=='chat' else all_groups
image_prefix='pbl6-demo-'+scope+'-'
media_volume='pbl6_demo_chat_media';media_target='/var/lib/pbl6/chat-media'
runtime={};candidates={};changed=False;gateway_changed=False;persisted=[]
backup=root/'backups'/(scope+'-'+ident)
def run(args,**kw):return subprocess.run(args,check=True,**kw)
def private(path,value):path.write_text(json.dumps(value));path.chmod(0o600)
def compose(*extra,override=None):return base+(['-f',str(override)] if override else [])+list(extra)
def inspect(service):
 container=subprocess.check_output(compose('ps','-q',service)).decode().strip()
 data=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
 if not data['State']['Running'] or data['Config']['Labels'].get('com.docker.compose.project')!='pbl6-demo':raise ValueError('Review inactive or unexpected service '+service)
 return data
def sha(data):return hashlib.sha256(data.replace(b'\r\n',b'\n')).hexdigest()

def expected_env(service,data):
 env=dict(v.split('=',1) for v in data['Config']['Env'])
 if scope=='chat' and service=='m3':env.update(CHAT_MEDIA_ENABLED='1',CHAT_MEDIA_STORAGE_DIR=media_target)
 return env
def override(path,rollback=False):
 services={}
 for service,data in runtime.items():
  group=next(g for g,names in groups.items() if service in names)
  env=dict(v.split('=',1) for v in data['Config']['Env']) if rollback else expected_env(service,data)
  services[service]={'image':data['Image'] if rollback else image_prefix+group+':latest','environment':{k:v.replace('$','$$') for k,v in env.items()},'command':data['Config']['Cmd'],'user':data['Config']['User']}
  if scope=='chat' and service=='m3' and not rollback:services[service]['volumes']=[{'type':'volume','source':'chatmedia','target':media_target}]
 # Mounts and networks are unchanged in the existing Compose definitions.
 result={'services':services}
 if scope=='chat' and not rollback:result['volumes']={'chatmedia':{'external':True,'name':media_volume}}
 private(path,result)
def database_vars():
 return {g.upper()+'_DATABASE_URL':dict(v.split('=',1) for v in runtime[g]['Config']['Env'])[g.upper()+'_DATABASE_URL'] for g in groups}
def proposed_compose(source):
 for service in runtime:
  group=next(g for g,names in groups.items() if service in names)
  match=re.search(r'^  '+re.escape(service)+r':\n.*?(?=^  [A-Za-z0-9_-]+:\n|^[a-zA-Z][a-zA-Z_-]*:\n|\Z)',source,re.M|re.S)
  if not match:raise ValueError('Review Compose service block '+service)
  block=re.sub(r'^    image:.*\n','',match.group(0),flags=re.M)
  block=block.replace('  '+service+':\n','  '+service+':\n    image: '+image_prefix+group+':latest\n',1)
  if scope=='chat' and service=='m3':
   if not re.search(r'^    build:',block,re.M):
    build=configured['services']['m3'].get('build',{})
    if set(build)-{'context','dockerfile','args'} or Path(build.get('context','')).resolve()!=root or build.get('dockerfile')!='backend/Dockerfile':raise ValueError('Review inherited M3 build configuration')
    args=dict(build.get('args',{}));args['INSTALL_CHAT_MEDIA']='1'
    explicit={'context':'..','dockerfile':build['dockerfile'],'args':args}
    block=block.replace('  m3:\n','  m3:\n    build: '+json.dumps(explicit)+'\n',1)
   if 'INSTALL_CHAT_MEDIA' not in block:
    if '    build:\n' in block and not re.search(r'^      args:',block,re.M):block=block.replace('    build:\n',"    build:\n      args: {INSTALL_CHAT_MEDIA: '1'}\n",1)
    else:
     build=re.search(r'^    build: \{.*\}$',block,re.M)
     if not build or 'args:' in build.group(0):raise ValueError('Review M3 build arguments')
     block=block[:build.start()]+build.group(0)[:-1]+", args: {INSTALL_CHAT_MEDIA: '1'}}"+block[build.end():]
   elif not re.search(r"['\"]?INSTALL_CHAT_MEDIA['\"]?:\s*['\"]?1['\"]?",block):raise ValueError('Review existing M3 codec build argument')
   for name,value in [('CHAT_MEDIA_ENABLED',"'1'"),('CHAT_MEDIA_STORAGE_DIR',media_target)]:
    pattern=r'^      '+name+r':.*$'
    if re.search(pattern,block,re.M):block=re.sub(pattern,'      '+name+': '+value,block,flags=re.M)
    elif '    environment:\n' in block:block=block.replace('    environment:\n','    environment:\n      '+name+': '+value+'\n',1)
    else:
     match_env=re.search(r'^    environment: \{.*\}$',block,re.M)
     if not match_env:raise ValueError('Review M3 environment declaration')
     if re.search(r'\b'+name+':',match_env.group(0)):raise ValueError('Review existing inline chat environment')
     block=block[:match_env.start()]+match_env.group(0)[:-1]+', '+name+': '+value+'}'+block[match_env.end():]
   if media_target not in block:
    lines=block.splitlines();index=next(i for i,line in enumerate(lines) if line.startswith('    volumes:'))
    if lines[index].strip().endswith(']'):lines[index]=lines[index][:-1]+', chatmedia:'+media_target+']'
    elif lines[index].strip()=='volumes:':
     end=index+1
     while end<len(lines) and (not lines[end].strip() or re.match(r'^\s+- ',lines[end]) or len(lines[end])-len(lines[end].lstrip())>4):end+=1
     first=next((line for line in lines[index+1:end] if re.match(r'^\s+- ',line)),None)
     if first is None:raise ValueError('Review M3 volume list')
     indent=first[:len(first)-len(first.lstrip())];lines.insert(end,indent+'- chatmedia:'+media_target)
    else:raise ValueError('Review M3 volume declaration')
    block='\n'.join(lines)+'\n'
  source=source[:match.start()]+block+source[match.end():]
 if scope=='chat' and not re.search(r'^  chatmedia:',source,re.M):
  if source.count('\nvolumes:\n')!=1:raise ValueError('Review named volumes declaration')
  source=source.replace('\nvolumes:\n','\nvolumes:\n  chatmedia: {external: true, name: '+media_volume+'}\n',1)
 return source


try:
 configured=json.loads(subprocess.check_output(compose('config','--format','json')))
 for name,expected in manifest.get('host_sources',{}).items():
  if name!='backend/Dockerfile' or not (root/name).is_file() or sha((root/name).read_bytes()) not in (expected['before'],expected['after']):raise ValueError('Review active host build source '+name)
 source=(root/'infrastructure/compose.yaml').read_text()
 for service in [s for names in groups.values() for s in names]:
  if not re.search(r'^  '+re.escape(service)+r':\n.*?(?=^  [A-Za-z0-9_-]+:\n|^[a-zA-Z][a-zA-Z_-]*:\n|\Z)',source,re.M|re.S):raise ValueError('Review Compose service block '+service)
 for group,names in groups.items():
  for service in names:
   data=inspect(service);runtime[service]=data
   actual=dict(v.split('=',1) for v in data['Config']['Env'])
   expected=configured['services'][service].get('environment',{})
   if any(str(value).replace('$$','$')!=actual.get(key) for key,value in expected.items()):raise ValueError('Compose and active environment differ in '+service+'; no deployment made')
  for name,expected in manifest['sources'].items():
   if not name.startswith(group.replace('m1','catalog-service').replace('m2','commerce-service').replace('m3','identity-store-service')+'/src/') and name not in ('shared/src/internal-clients.ts','shared/src/request-contract.ts'):continue
   result=subprocess.run(['docker','exec',runtime[group]['Id'],'cat',name],capture_output=True)
   if result.returncode:
    if expected['before'] is not None:raise ValueError('Missing active baseline source '+name)
   elif sha(result.stdout) not in (expected['before'],expected['after']):raise ValueError('Active baseline changed: '+group+':'+name)
  print(group+': active source and API/worker environments verified.',flush=True)
 proposal=stage/'compose.reviewed.yaml';proposal.write_text(proposed_compose(source));proposal.chmod(0o600)
 run(compose('config','--quiet',override=proposal))
 print('STOREFRONT_PREFLIGHT_OK',flush=True)
 if mode=='inspect':raise SystemExit(0)
 codec=None
 if 'm3' in groups:
  native=subprocess.run(['docker','exec',runtime['m3']['Id'],'sh','-c','test -x /usr/bin/ffmpeg && test -x /usr/bin/prlimit']).returncode==0
  codec='pbl6-storefront-base-m3:'+ident if native else 'pbl6-storefront-test-codecs:base-'+runtime['m3']['Image'].removeprefix('sha256:')
  if native:run(['docker','tag',runtime['m3']['Image'],codec])
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
 print(str(len(groups))+' database dumps verified; active data and credentials retained.',flush=True)
 for file in (stage/'overlay').rglob('*'):
  file.chmod(0o755 if file.is_dir() else 0o644)
 for group in groups:
  parent=codec if group=='m3' else 'pbl6-storefront-base-'+group+':'+ident
  if group!='m3':run(['docker','tag',runtime[group]['Image'],parent])
  dockerfile=stage/('Dockerfile.'+group)
  dockerfile.write_text('FROM '+parent+'\nUSER root\nCOPY overlay/backend/ /app/backend/\nUSER node\n')
  tag=image_prefix+group+':deploy-'+ident
  run(['docker','build','-f',str(dockerfile),'-t',tag,str(stage)])
  candidates[group]=tag
 if scope=='chat':
  found=subprocess.run(['docker','volume','inspect',media_volume],capture_output=True)
  if found.returncode:run(['docker','volume','create','--label','com.pbl6.purpose=chat-media',media_volume],stdout=subprocess.DEVNULL)
  else:
   volume=json.loads(found.stdout)[0]
   if volume.get('Labels',{}).get('com.pbl6.purpose')!='chat-media':raise ValueError('Review existing private chat volume owner')
   with (backup/'chat-media.tar').open('wb') as stream:run(['docker','run','--rm','--network','none','--user','0','--mount','type=volume,source='+media_volume+',target=/private,readonly',candidates['m3'],'tar','-C','/private','-cf','-','.'],stdout=stream)
   (backup/'chat-media.tar').chmod(0o600)
  uid=subprocess.check_output(['docker','exec',runtime['m3']['Id'],'id','-u']).decode().strip()
  gid=subprocess.check_output(['docker','exec',runtime['m3']['Id'],'id','-g']).decode().strip()
  if not uid.isdigit() or not gid.isdigit():raise ValueError('Review private chat storage owner')
  run(['docker','run','--rm','--network','none','--user','0','--mount','type=volume,source='+media_volume+',target=/private',candidates['m3'],'sh','-c','chown "$1:$2" /private && chmod 700 /private','sh',uid,gid])
 envfile=stage/'database.env';envfile.write_text(''.join(k+'='+v+'\n' for k,v in database_vars().items()));envfile.chmod(0o600)
 primary=next(iter(groups))
 network=next(iter(runtime[primary]['NetworkSettings']['Networks']))
 migrations={} if scope=='vouchers' else {'M3':'identity-store-service/migrations/015_chat_attachments.sql'} if scope=='chat' else {'M1':'catalog-service/migrations/017_product_publication.sql','M2':'commerce-service/migrations/028_storefront_sales_lookup.sql','M3':'identity-store-service/migrations/016_storefront.sql'}
 code="""const{Client}=require('pg'),fs=require('fs');(async()=>{const migrations=JSON.parse(fs.readFileSync(0,'utf8'));for(const[id,file]of Object.entries(migrations)){const c=new Client({connectionString:process.env[id+'_DATABASE_URL']});await c.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(721621)');const version=file.split('/').pop();if(!(await c.query('SELECT 1 FROM schema_migration WHERE version=$1',[version])).rowCount){await c.query(fs.readFileSync(file,'utf8'));await c.query('INSERT INTO schema_migration(version) VALUES($1)',[version]);}await c.query('COMMIT');console.log(id+': reviewed storefront migration ready.');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}}})().catch(()=>{console.error('Reviewed migration failed; additive schema retained for inspection.');process.exitCode=1});"""
 if migrations:run(['docker','run','--rm','-i','--network',network,'--env-file',str(envfile),candidates[primary],'node','-e',code],input=json.dumps(migrations).encode())
 for group,tag in candidates.items():run(['docker','tag',tag,image_prefix+group+':latest'])
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
  if current['Image']!=candidate_id or dict(v.split('=',1) for v in current['Config']['Env'])!=expected_env(service,old):raise ValueError('Image/environment verification failed in '+service)
  key=lambda m:(m['Destination'],m['Type'],m['Source'],m['RW'])
  if scope=='chat' and service=='m3':
   new=[m for m in current['Mounts'] if m['Destination']==media_target]
   if len(new)!=1 or new[0]['Type']!='volume' or new[0].get('Name')!=media_volume or not new[0]['RW']:raise ValueError('Private chat volume verification failed')
   if sorted(key(m) for m in current['Mounts'] if m['Destination']!=media_target)!=sorted(key(m) for m in old['Mounts'] if m['Destination']!=media_target):raise ValueError('Existing secret mounts changed in '+service)
  elif sorted(map(key,current['Mounts']))!=sorted(map(key,old['Mounts'])):raise ValueError('Private mounts changed in '+service)
 if gateway_source!=gateway.read_text():
  gateway_changed=True
  gateway.write_text(gateway_source)
  run(compose('exec','-T','gateway','caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'),stdout=subprocess.DEVNULL)
  run(compose('exec','-T','gateway','caddy','reload','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'),stdout=subprocess.DEVNULL)
 smoke='/api/v1/checkout/voucher-suggestions' if scope=='vouchers' else '/api/v1/store/storefront'
 if scope=='chat':smoke='/api/v1/me/conversations/00000000-0000-4000-8000-000000000001/attachments/capabilities'
 for attempt in range(5):
  args=['curl','-sS','--max-time','20','-o','/dev/null','-w','%{http_code}']
  if scope=='vouchers':args+=['-X','POST','-H','Content-Type: application/json','--data','{}']
  result=subprocess.run(args+['https://demo.congnguyen.me'+smoke],capture_output=True)
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
 source=proposed_compose((root/'infrastructure/compose.yaml').read_text())
 (root/'infrastructure/compose.yaml').write_text(source);(root/'infrastructure/compose.yaml').chmod(0o600)
 run(compose('config','--quiet'))
 print(scope.upper()+'_DEPLOY_OK: '+str(len(runtime))+' matching Node APIs/workers ready, '+str(len(migrations))+' reviewed migrations applied, active environments and mounts preserved.',flush=True)
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

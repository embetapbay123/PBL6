#!/usr/bin/env bash
set -euo pipefail
deploy_id=${1:?Missing deployment ID}
[[ $deploy_id =~ ^[0-9a-f]{32}$ ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-chat-media-$deploy_id.tgz"
manifest="$HOME/.pbl6-chat-media-$deploy_id-manifest.tgz"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$manifest" "$HOME/.pbl6-chat-media-$deploy_id.sh"' EXIT
exec 9>"$HOME/.pbl6-demo-chat-media-deploy.lock"
flock -w 60 9
tar -xzf "$archive" -C "$stage"
tar -xzf "$manifest" -C "$stage"
cd "$HOME/pbl6-demo"
base=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml)
export CHAT_MEDIA_STAGE="$stage" CHAT_MEDIA_DEPLOY_ID="$deploy_id"
python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import hashlib,json,os,subprocess,re
p=Path(os.environ['CHAT_MEDIA_STAGE']); ident=os.environ['CHAT_MEDIA_DEPLOY_ID']
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
running=subprocess.check_output(base+['ps','-q','m3']).decode().strip();data=json.loads(subprocess.check_output(['docker','inspect',running]))[0]
for source,hashes in json.loads((p/'manifest.json').read_text())['sources'].items():
 actual=subprocess.check_output(['docker','exec',running,'cat',source.removeprefix('backend/')]).replace(b'\r\n',b'\n')
 if hashlib.sha256(actual).hexdigest() not in hashes.values():raise SystemExit('Active source differs from reviewed baseline: '+source)
env=dict(v.split('=',1) for v in data['Config']['Env']);url=urlparse(env['M3_DATABASE_URL'])
if url.hostname!='postgres' or not url.path.strip('/'):raise SystemExit('Unsupported active database location')
if any(m['Destination'] not in ['/run/secrets/jwt-public.pem','/run/secrets/jwt-private.pem','/var/lib/pbl6/chat-media'] for m in data['Mounts']):raise SystemExit('Review unexpected M3 mount before rollout')
compose_source=Path('infrastructure/compose.yaml').read_text()
compose_block=re.search(r'^  m3:\n(.*?)(?=^  [a-zA-Z0-9_-]+:\n)',compose_source,re.M|re.S).group(1)
expected_volumes='    volumes: [./secrets/jwt-public.pem:/run/secrets/jwt-public.pem:ro, ./secrets/jwt-private.pem:/run/secrets/jwt-private.pem:ro]'
expected_list='    volumes:\n    - ./secrets/jwt-public.pem:/run/secrets/jwt-public.pem:ro\n    - ./secrets/jwt-private.pem:/run/secrets/jwt-private.pem:ro'
if '/var/lib/pbl6/chat-media' not in compose_block and expected_volumes not in compose_block and expected_list not in compose_block:
 raise SystemExit('M3 volume preflight stopped before backup/migration/service changes')
if '    environment: {' not in compose_block and '    environment:\n' not in compose_block:raise SystemExit('Review M3 environment syntax before rollout')
backup=Path.home()/'pbl6-demo'/'backups'/('chat-media-'+ident);backup.mkdir(mode=0o700,parents=True,exist_ok=True)
with (backup/'m3.dump').open('wb') as out:subprocess.run(base+['exec','-T','postgres','sh','-c','exec pg_dump -U "${POSTGRES_USER:-postgres}" -d "$1" -Fc','sh',url.path.strip('/')],stdout=out,check=True)
with (backup/'m3.dump').open('rb') as src:subprocess.run(base+['exec','-T','postgres','pg_restore','--list'],stdin=src,stdout=subprocess.DEVNULL,check=True)
(backup/'m3.dump').chmod(0o600)
(p/'runtime.json').write_text(json.dumps({'image':data['Image'],'env':env,'mounts':data['Mounts'],'network':next(iter(data['NetworkSettings']['Networks'])),'backup':str(backup)}));(p/'runtime.json').chmod(0o600)
(p/'test.env').write_text('M3_DATABASE_URL='+env['M3_DATABASE_URL']+'\nCHAT_MEDIA_NATIVE_TEST=1\n');(p/'test.env').chmod(0o600)
(backup/'compose.before.yaml').write_bytes(Path('infrastructure/compose.yaml').read_bytes());(backup/'compose.before.yaml').chmod(0o600)
subprocess.run(['docker','tag',data['Image'],'pbl6-chat-media-base:'+ident],check=True)
print('Reviewed M3 baseline and verified database backup; existing environment and mounts captured privately.')
PY
cat > "$stage/Dockerfile" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux && rm -rf /var/lib/apt/lists/*
COPY backend/dist/identity-store-service/src/main.js* /app/backend/dist/identity-store-service/src/
COPY backend/identity-store-service/src/main.ts /app/backend/identity-store-service/src/main.ts
COPY backend/dist/identity-store-service/src/messaging/ /app/backend/dist/identity-store-service/src/messaging/
COPY backend/identity-store-service/src/messaging/ /app/backend/identity-store-service/src/messaging/
COPY backend/dist/shared/src/ /app/backend/dist/shared/src/
COPY backend/shared/src/ /app/backend/shared/src/
COPY backend/identity-store-service/migrations/ /app/backend/identity-store-service/migrations/
COPY backend/dist/tests/integration/ /app/backend/dist/tests/integration/
COPY backend/tests/integration/ /app/backend/tests/integration/
RUN chmod -R a+rX /app/backend/dist /app/backend/shared/src /app/backend/identity-store-service /app/backend/tests/integration
USER node
DOCKER
candidate="pbl6-demo-chat-media-m3:deploy-$deploy_id"
docker build --build-arg "BASE_IMAGE=pbl6-chat-media-base:$deploy_id" --tag "$candidate" --file "$stage/Dockerfile" "$stage"
docker run --rm --network none --read-only --tmpfs /tmp:rw,nosuid,nodev,size=536870912 --memory 512m --cpus 1 --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges -e CHAT_MEDIA_NATIVE_TEST=1 "$candidate" node node_modules/jest/bin/jest.js --runInBand --config '{"testEnvironment":"node","testMatch":["**/dist/tests/integration/chat-media-processing.test.js"],"testTimeout":60000}'
network=$(python3 -c 'import json,os;print(json.load(open(os.environ["CHAT_MEDIA_STAGE"]+"/runtime.json"))["network"])')
docker run --rm --network "$network" --env-file "$stage/test.env" --read-only --tmpfs /tmp:rw,nosuid,nodev,size=536870912 --memory 512m --cpus 1 --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges "$candidate" node node_modules/jest/bin/jest.js --runInBand --config '{"testEnvironment":"node","testMatch":["**/dist/tests/integration/chat-media-lifecycle.test.js"],"testTimeout":60000}'

# Add only the reviewed, additive M3 migration after candidate checks and backup.
docker run --rm -i --network "$network" --env-file "$stage/test.env" "$candidate" node <<'JS'
const {Client}=require('pg'),fs=require('fs');(async()=>{const c=new Client({connectionString:process.env.M3_DATABASE_URL});await c.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(721602)');const v='015_chat_attachments.sql';if(!(await c.query('SELECT 1 FROM schema_migration WHERE version=$1',[v])).rowCount){await c.query(fs.readFileSync('identity-store-service/migrations/'+v,'utf8'));await c.query('INSERT INTO schema_migration(version) VALUES($1)',[v]);}await c.query('COMMIT');console.log('M3 migration 015 ready.');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}})().catch(e=>{console.error(e.message);process.exitCode=1});
JS
python3 - <<'PY'
from pathlib import Path
import json,os,re,subprocess
p=Path(os.environ['CHAT_MEDIA_STAGE']);r=json.loads((p/'runtime.json').read_text());ident=os.environ['CHAT_MEDIA_DEPLOY_ID'];volume='pbl6_demo_chat_media'
found=subprocess.run(['docker','volume','inspect',volume],capture_output=True)
if found.returncode:
 subprocess.run(['docker','volume','create','--label','com.pbl6.purpose=chat-media',volume],stdout=subprocess.DEVNULL,check=True)
else:
 info=json.loads(found.stdout)[0]
 if info.get('Labels',{}).get('com.pbl6.purpose')!='chat-media':raise SystemExit('Unexpected private media volume owner')
 # Snapshot an existing volume before reusing it. No existing content is deleted.
 with (Path(r['backup'])/'media.tar').open('wb') as out:subprocess.run(['docker','run','--rm','--user','0','--mount','type=volume,source='+volume+',target=/media,readonly','pbl6-chat-media-base:'+ident,'tar','-C','/media','-cf','-','.'],stdout=out,check=True)
 (Path(r['backup'])/'media.tar').chmod(0o600)
# Match active container UID rather than assuming 1000 for the persistent directory.
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
running=subprocess.check_output(base+['ps','-q','m3']).decode().strip()
uid=subprocess.check_output(['docker','exec',running,'id','-u']).decode().strip();gid=subprocess.check_output(['docker','exec',running,'id','-g']).decode().strip()
if not uid.isdigit() or not gid.isdigit():raise SystemExit('Unsupported active M3 owner')
subprocess.run(['docker','run','--rm','--user','0','--mount','type=volume,source='+volume+',target=/media','pbl6-chat-media-base:'+ident,'sh','-c','chown "$1:$2" /media && chmod 700 /media','sh',uid,gid],check=True)
env={**r['env'],'CHAT_MEDIA_ENABLED':'1','CHAT_MEDIA_STORAGE_DIR':'/var/lib/pbl6/chat-media'}
mounts=[{'type':m['Type'],'source':m['Source'],'target':m['Destination'],'read_only':not m['RW']} for m in r['mounts'] if m['Destination']!='/var/lib/pbl6/chat-media']
mounts.append({'type':'volume','source':'chatmedia','target':'/var/lib/pbl6/chat-media'})
override={'services':{'m3':{'image':'pbl6-demo-chat-media-m3:latest','environment':{k:v.replace('$','$$') for k,v in env.items()},'volumes':mounts}},'volumes':{'chatmedia':{'external':True,'name':volume}}}
(p/'override.json').write_text(json.dumps(override));(p/'override.json').chmod(0o600)
# Preserve the new mount on future compose operations without rewriting other runtime settings.
path=Path('infrastructure/compose.yaml');source=path.read_text();match=re.search(r'^  m3:\n(?P<body>.*?)(?=^  [a-zA-Z0-9_-]+:\n)',source,re.M|re.S)
if not match:raise SystemExit('Cannot locate M3 compose block')
block=match.group(0)
if '/var/lib/pbl6/chat-media' not in block:
 old='    volumes: [./secrets/jwt-public.pem:/run/secrets/jwt-public.pem:ro, ./secrets/jwt-private.pem:/run/secrets/jwt-private.pem:ro]'
 if old in block:block=block.replace(old,old[:-1]+', chatmedia:/var/lib/pbl6/chat-media]')
 else:
  old='    - ./secrets/jwt-private.pem:/run/secrets/jwt-private.pem:ro'
  if old not in block:raise SystemExit('Review active M3 volume declaration')
  block=block.replace(old,old+'\n    - chatmedia:/var/lib/pbl6/chat-media')
if 'CHAT_MEDIA_ENABLED:' not in block:
 if '    environment:\n' in block:block=block.replace('    environment:\n',"    environment:\n      CHAT_MEDIA_ENABLED: '${CHAT_MEDIA_ENABLED:-1}'\n      CHAT_MEDIA_STORAGE_DIR: /var/lib/pbl6/chat-media\n",1)
 else:
  lines=block.splitlines();index=next(i for i,v in enumerate(lines) if v.startswith('    environment: {'))
  if not lines[index].endswith('}'):raise SystemExit('Review active M3 environment declaration')
  lines[index]=lines[index][:-1]+", CHAT_MEDIA_ENABLED: '${CHAT_MEDIA_ENABLED:-1}', CHAT_MEDIA_STORAGE_DIR: /var/lib/pbl6/chat-media}";block='\n'.join(lines)+'\n'
if '    build:\n' in block and '      args:' not in block:block=block.replace('    build:\n',"    build:\n      args: {INSTALL_CHAT_MEDIA: '1'}\n",1)
block=re.sub(r'^    image:.*\n','',block,flags=re.M);block=block.replace('  m3:\n','  m3:\n    image: pbl6-demo-chat-media-m3:latest\n',1)
source=source[:match.start()]+block+source[match.end():]
if not re.search(r'^  chatmedia:',source,re.M):
 source=source.replace('\nvolumes:\n','\nvolumes:\n  chatmedia: {external: true, name: pbl6_demo_chat_media}\n')
path.write_text(source)
subprocess.run(['docker','tag','pbl6-demo-chat-media-m3:deploy-'+ident,'pbl6-demo-chat-media-m3:latest'],check=True)
print('Private storage ready; existing credentials and budgets preserved; only M3 will be replaced.')
PY
compose=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f "$stage/override.json")
rollback(){
 echo 'Media smoke failed; restoring previous M3 runtime. Additive schema and private data are retained.' >&2
 python3 - <<'PY'
from pathlib import Path
import json,os
p=Path(os.environ['CHAT_MEDIA_STAGE']);r=json.loads((p/'runtime.json').read_text())
Path('infrastructure/compose.yaml').write_bytes((Path(r['backup'])/'compose.before.yaml').read_bytes())
mounts=[{'type':m['Type'],'source':m['Source'],'target':m['Destination'],'read_only':not m['RW']} for m in r['mounts']]
(p/'rollback.json').write_text(json.dumps({'services':{'m3':{'image':r['image'],'environment':{k:v.replace('$','$$') for k,v in r['env'].items()},'volumes':mounts}}}));(p/'rollback.json').chmod(0o600)
PY
 docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f "$stage/rollback.json" up -d --no-deps --no-build --pull never m3
 exit 1
}
"${compose[@]}" up -d --no-deps --no-build --pull never m3 || rollback
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
 if "${compose[@]}" exec -T m3 node -e 'fetch("http://127.0.0.1:3103/health/ready").then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>process.exitCode=1)'; then ready=1;break;fi
 sleep 2
done
[[ $ready == 1 ]] || rollback
python3 - <<'PY' || rollback
from pathlib import Path
import json,os,subprocess
p=Path(os.environ['CHAT_MEDIA_STAGE']);old=json.loads((p/'runtime.json').read_text())
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
running=subprocess.check_output(base+['ps','-q','m3']).decode().strip();data=json.loads(subprocess.check_output(['docker','inspect',running]))[0]
env=dict(v.split('=',1) for v in data['Config']['Env']);expected={**old['env'],'CHAT_MEDIA_ENABLED':'1','CHAT_MEDIA_STORAGE_DIR':'/var/lib/pbl6/chat-media'}
assert env==expected,'Unexpected runtime environment change'
assert any(m['Type']=='volume' and m['Name']=='pbl6_demo_chat_media' and m['Destination']=='/var/lib/pbl6/chat-media' for m in data['Mounts'])
print('M3 ready with a persistent private volume; credentials, existing limits and other services unchanged.')
PY
for prefix in me store; do
 status=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "https://demo.congnguyen.me/api/v1/$prefix/conversations/00000000-0000-4000-8000-000000000000/attachments/capabilities")
 [[ $status == 401 ]] || rollback
done
cp -a "$stage/backend/identity-store-service/." backend/identity-store-service/
cp -a "$stage/backend/shared/src/." backend/shared/src/
cp -a "$stage/backend/tests/integration/." backend/tests/integration/
cp -a "$stage/backend/Dockerfile" backend/Dockerfile
cp -a "$stage/docs/contracts/openapi.json" docs/contracts/openapi.json
docker image rm "pbl6-chat-media-base:$deploy_id" >/dev/null
echo 'CHAT_MEDIA_DEPLOY_OK: candidate codec/HTTP/lifecycle checks passed; M3 migration backed up; public auth enforced.'

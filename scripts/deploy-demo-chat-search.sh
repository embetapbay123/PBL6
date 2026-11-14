#!/usr/bin/env bash
set -euo pipefail
deploy_id=${1:?Missing deployment ID}
[[ $deploy_id =~ ^[0-9a-f]{32}$ ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-chat-search-$deploy_id.tgz"
manifest="$HOME/.pbl6-chat-search-$deploy_id-manifest.tgz"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$manifest" "$HOME/.pbl6-chat-search-$deploy_id.sh"' EXIT
exec 9>"$HOME/.pbl6-demo-chat-search-deploy.lock"
flock -w 60 9
tar -xzf "$archive" -C "$stage"
tar -xzf "$manifest" -C "$stage"
cd "$HOME/pbl6-demo"
base=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml)
export CHAT_SEARCH_STAGE="$stage" CHAT_SEARCH_DEPLOY_ID="$deploy_id"
python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import hashlib,json,os,subprocess
stage=Path(os.environ['CHAT_SEARCH_STAGE']); deploy_id=os.environ['CHAT_SEARCH_DEPLOY_ID']
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
manifest=json.loads((stage/'manifest.json').read_text()); snapshots={}; overrides={}
for service,files in {'m3':['backend/identity-store-service/src/messaging/messaging.service.ts','backend/identity-store-service/src/messaging/messaging.controller.ts'],'m4':['backend/ai-service/app/chat/runtime.py']}.items():
 running=subprocess.check_output(base+['ps','-q',service]).decode().strip()
 data=json.loads(subprocess.check_output(['docker','inspect',running]))[0]
 for source in files:
  local=source.removeprefix('backend/ai-service/' if service=='m4' else 'backend/')
  actual=subprocess.check_output(['docker','exec',running,'cat',local]).replace(b'\r\n',b'\n')
  if hashlib.sha256(actual).hexdigest() not in manifest['sources'][source].values():raise SystemExit('Active source differs from reviewed baseline: '+source)
 env=dict(item.split('=',1) for item in data['Config']['Env']);image_ref=data['Config']['Image']
 if image_ref.startswith('sha256:') or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_:.-' for c in image_ref):raise SystemExit('Unsupported image reference')
 snapshots[service]={'image':data['Image'],'image_ref':image_ref,'env':env}
 candidate='pbl6-demo-chat-search-'+service+':deploy-'+deploy_id
 overrides[service]={'image':candidate,'environment':{k:v.replace('$','$$') for k,v in env.items()}}
 url=urlparse(env['M3_DATABASE_URL' if service=='m3' else 'M4_DATABASE_URL'])
 if url.hostname!='postgres' or not url.path.strip('/'):raise SystemExit('Unsupported active database location')
 backup=Path.home()/'pbl6-demo'/'backups'/('chat-search-'+deploy_id);backup.mkdir(mode=0o700,parents=True,exist_ok=True)
 with (backup/(service+'.dump')).open('wb') as out:
  subprocess.run(base+['exec','-T','postgres','sh','-c','exec pg_dump -U "${POSTGRES_USER:-postgres}" -d "$1" -Fc','sh',url.path.strip('/')],stdout=out,check=True)
 with (backup/(service+'.dump')).open('rb') as src:
  subprocess.run(base+['exec','-T','postgres','pg_restore','--list'],stdin=src,stdout=subprocess.DEVNULL,check=True)
 subprocess.run(['docker','tag',data['Image'],'pbl6-demo-chat-search-'+service+'-base:'+deploy_id],check=True)
(stage/'runtime.json').write_text(json.dumps(snapshots));(stage/'runtime.json').chmod(0o600)
(stage/'override.json').write_text(json.dumps({'services':overrides}));(stage/'override.json').chmod(0o600)
print('Reviewed M3/M4 baselines and database backups verified; runtime preserved in private snapshots.')
PY
cat > "$stage/Dockerfile.m3" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY backend/dist/identity-store-service/src/messaging/ /app/backend/dist/identity-store-service/src/messaging/
COPY backend/dist/shared/src/ /app/backend/dist/shared/src/
COPY backend/identity-store-service/src/messaging/ /app/backend/identity-store-service/src/messaging/
COPY backend/shared/src/ /app/backend/shared/src/
COPY backend/tests/integration/conversation-search.test.ts /app/backend/tests/integration/conversation-search.test.ts
RUN chmod -R a+rX /app/backend/dist/identity-store-service/src/messaging /app/backend/dist/shared/src /app/backend/identity-store-service/src/messaging /app/backend/shared/src /app/backend/tests/integration/conversation-search.test.ts
USER node
DOCKER
cat > "$stage/Dockerfile.m4" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY backend/ai-service/app/chat/runtime.py /app/app/chat/runtime.py
COPY backend/ai-service/app/contracts.generated.json /app/app/contracts.generated.json
COPY backend/ai-service/app/fixtures.generated.json /app/app/fixtures.generated.json
COPY backend/ai-service/tests/test_chat_search.py /app/tests/test_chat_search.py
RUN chmod a+r /app/app/chat/runtime.py /app/app/contracts.generated.json /app/app/fixtures.generated.json /app/tests/test_chat_search.py
USER app
DOCKER
for service in m3 m4; do
 docker build --build-arg "BASE_IMAGE=pbl6-demo-chat-search-$service-base:$deploy_id" --tag "pbl6-demo-chat-search-$service:deploy-$deploy_id" --file "$stage/Dockerfile.$service" "$stage"
done
compose=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f "$stage/override.json")
# Isolated schemas only; no model calls, worker startup or shared Redis cleanup.
"${compose[@]}" run --rm --no-deps -T -e PBL6_ISOLATED_TEST_REDIS=0 m3 node node_modules/jest/bin/jest.js --runInBand --config jest.integration.cjs tests/integration/conversation-search.test.ts
"${compose[@]}" run --rm --no-deps -T m4 python -m pytest tests/test_chat_search.py -q
python3 - <<'PY'
from pathlib import Path
import json,os,subprocess
p=Path(os.environ['CHAT_SEARCH_STAGE']);runtime=json.loads((p/'runtime.json').read_text());override=json.loads((p/'override.json').read_text())
for service,row in runtime.items():
 subprocess.run(['docker','tag',row['image'],'pbl6-demo-chat-search-'+service+':rollback'],check=True)
 subprocess.run(['docker','tag','pbl6-demo-chat-search-'+service+':deploy-'+os.environ['CHAT_SEARCH_DEPLOY_ID'],row['image_ref']],check=True)
 override['services'][service]['image']=row['image_ref']
(p/'override.json').write_text(json.dumps(override))
PY
rollback(){
 echo 'Chat search smoke failed; restoring previous M3/M4 images.' >&2
 python3 - <<'PY'
from pathlib import Path
import json,os,subprocess
for row in json.loads((Path(os.environ['CHAT_SEARCH_STAGE'])/'runtime.json').read_text()).values():subprocess.run(['docker','tag',row['image'],row['image_ref']],check=True)
PY
 "${compose[@]}" up -d --no-deps --no-build --pull never m3 m4
 exit 1
}
"${compose[@]}" up -d --no-deps --no-build --pull never m3 m4 || rollback
for service in m3 m4; do
 ready=0
 for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if [[ $service == m3 ]]; then
   if "${compose[@]}" exec -T m3 node -e 'fetch("http://127.0.0.1:3103/health/ready").then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>process.exitCode=1)'; then ready=1; break; fi
  else
   if "${compose[@]}" exec -T m4 python -c 'import urllib.request;urllib.request.urlopen("http://127.0.0.1:3104/health/ready",timeout=3)'; then ready=1; break; fi
  fi
  sleep 2
 done
 [[ $ready == 1 ]] || rollback
done
python3 - <<'PY' || rollback
from pathlib import Path
import json,os,subprocess
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
for service,row in json.loads((Path(os.environ['CHAT_SEARCH_STAGE'])/'runtime.json').read_text()).items():
 running=subprocess.check_output(base+['ps','-q',service]).decode().strip();data=json.loads(subprocess.check_output(['docker','inspect',running]))[0]
 assert dict(v.split('=',1) for v in data['Config']['Env'])==row['env'],'Service runtime changed: '+service
print('M3/M4 ready; active database, provider credentials and budgets unchanged.')
PY
for route in '/me/conversations?q=ao' '/me/chat/sessions?q=ao'; do
 status=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "https://demo.congnguyen.me/api/v1$route")
 [[ $status == 401 ]] || rollback
done
cp -a "$stage/backend/identity-store-service/src/messaging/." backend/identity-store-service/src/messaging/
cp -a "$stage/backend/shared/src/." backend/shared/src/
cp -a "$stage/backend/tests/integration/conversation-search.test.ts" backend/tests/integration/
cp -a "$stage/backend/ai-service/app/." backend/ai-service/app/
cp -a "$stage/backend/ai-service/tests/test_chat_search.py" backend/ai-service/tests/
cp -a "$stage/docs/contracts/openapi.json" docs/contracts/openapi.json
for service in m3 m4; do docker image rm "pbl6-demo-chat-search-$service-base:$deploy_id" >/dev/null; done
echo 'CHAT_SEARCH_DEPLOY_OK: isolated M3/M4 search checks passed; public auth enforced; runtime unchanged.'

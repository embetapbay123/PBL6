#!/usr/bin/env bash
set -euo pipefail
id=${1:?Missing deployment ID}
mode=${2:-deploy}
[[ $id =~ ^[0-9a-f]{32}$ && ( $mode == deploy || $mode == inspect ) ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-ai-media-deploy-$id.tgz"
manifest="$HOME/.pbl6-ai-media-deploy-$id-manifest.tgz"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$manifest" "$HOME/.pbl6-ai-media-deploy-$id.sh"' EXIT
exec 9>"$HOME/.pbl6-demo-ai-deploy.lock"
flock -w 60 9
tar -xzf "$archive" -C "$stage"
tar -xzf "$manifest" -C "$stage"
cd "$HOME/pbl6-demo"
export AI_MEDIA_DEPLOY_STAGE="$stage" AI_MEDIA_DEPLOY_ID="$id" AI_MEDIA_DEPLOY_MODE="$mode"
python3 - <<'PY'
from pathlib import Path
import hashlib,json,os,subprocess
p=Path(os.environ['AI_MEDIA_DEPLOY_STAGE']);manifest=json.loads((p/'manifest.json').read_text());snapshots={}
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
for service in ('m4','worker-try-on'):
 running=subprocess.check_output(base+['ps','-q','m4']).decode().strip() if service=='m4' else 'pbl6-demo-worker-try-on-1'
 data=json.loads(subprocess.check_output(['docker','inspect',running]))[0]
 if data['Config'].get('Labels',{}).get('com.docker.compose.project')!='pbl6-demo' or data['Config'].get('Labels',{}).get('com.docker.compose.service')!=service:raise SystemExit('Unexpected service identity')
 if data['Config'].get('WorkingDir')!='/app':raise SystemExit('Unexpected M4 application directory')
 selected=manifest['sources'] if service=='m4' else {k:v for k,v in manifest['sources'].items() if '/try_on/' in k}
 for source,hashes in selected.items():
  actual=subprocess.check_output(['docker','exec',running,'cat',source.removeprefix('backend/ai-service/')]).replace(b'\r\n',b'\n')
  if hashlib.sha256(actual).hexdigest() not in hashes.values():raise SystemExit('Active source differs from reviewed baseline: '+service+':'+source)
 env=dict(v.split('=',1) for v in data['Config']['Env'])
 if env.get('TRY_ON_DAILY_BUDGET_MICRO_USD')!='1000000' or env.get('TRY_ON_MONTHLY_BUDGET_MICRO_USD')!='10000000':raise SystemExit('Review existing AI budgets; rollout does not change them')
 if any(m['Destination'] not in ('/var/lib/pbl6/try-on','/var/lib/pbl6/ai-chat-media') or m['Type']!='volume' for m in data['Mounts']):raise SystemExit('Review unexpected AI storage mount')
 shared=subprocess.check_output(['docker','exec',running,'python','-c',"from app.try_on.repository import Repository;print(int('shared_spend' in Repository.stats.__code__.co_names))"]).decode().strip()=='1'
 snapshots[service]={'container':running,'image':data['Image'],'env':env,'mounts':data['Mounts'],'network':next(iter(data['NetworkSettings']['Networks'])),'user':data['Config'].get('User'),'command':data['Config']['Cmd'],'finance_shared':shared}
 print(service+' reviewed; mount targets='+json.dumps([m['Destination'] for m in data['Mounts']])+'; budget $1/day $10/month preserved.')
 counts=subprocess.check_output(['docker','exec',running,'python','-c',"from pathlib import Path;import json;root=Path('/var/lib/pbl6/try-on');files=[p for p in root.iterdir() if p.is_file()] if root.is_dir() else [];print(json.dumps({'files':len(files),'bytes':sum(p.stat().st_size for p in files)}))"]).decode().strip()
 print(service+' private try-on storage totals='+counts)
if snapshots['m4']['env'].get('OPENAI_API_KEY')!=snapshots['worker-try-on']['env'].get('OPENAI_API_KEY'):raise SystemExit('Review differing AI provider credentials')
if snapshots['m4']['env'].get('M4_DATABASE_URL')!=snapshots['worker-try-on']['env'].get('M4_DATABASE_URL'):raise SystemExit('Review differing active AI databases')
(p/'runtime.json').write_text(json.dumps(snapshots));(p/'runtime.json').chmod(0o600)
print('AI_MEDIA_PREFLIGHT_OK: runtime and source baseline verified without provider calls.')
PY
if [[ $mode == inspect ]]; then exit 0; fi
# Deployment continues only after the read-only runtime preflight.
original=$(python3 -c 'import json,os;print(json.load(open(os.environ["AI_MEDIA_DEPLOY_STAGE"]+"/runtime.json"))["m4"]["image"])')
codecs="pbl6-ai-media-codecs:base-${original#sha256:}"
if ! docker image inspect "$codecs" >/dev/null 2>&1; then
 cat > "$stage/Dockerfile.codecs" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux && rm -rf /var/lib/apt/lists/*
USER app
DOCKER
 docker build --build-arg "BASE_IMAGE=$original" --tag "$codecs" --file "$stage/Dockerfile.codecs" "$stage"
fi
cat > "$stage/Dockerfile.rollout" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY backend/ai-service/app/ /app/app/
COPY backend/ai-service/tests/ /app/tests/
COPY backend/ai-service/migrations/ /app/migrations/
COPY docs/contracts/endpoint-status.json /app/contracts/endpoint-status.json
RUN mkdir -p /var/lib/pbl6/ai-chat-media && chown app:app /var/lib/pbl6/ai-chat-media && chmod -R a+rX /app/app /app/tests /app/migrations /app/contracts
USER app
DOCKER
candidate="pbl6-demo-try-on:deploy-$id"
docker build --build-arg "BASE_IMAGE=$codecs" --tag "$candidate" --file "$stage/Dockerfile.rollout" "$stage"
docker run --rm --network none --read-only --tmpfs /tmp:rw,nosuid,nodev,size=536870912 --memory 512m --cpus 1 --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges -e AI_CHAT_MEDIA_NATIVE_TEST=1 -e PYTHONDONTWRITEBYTECODE=1 "$candidate" python -m pytest -p no:cacheprovider tests/test_chat_media_native.py -q
python3 - <<'PY'
from pathlib import Path
import json,os
p=Path(os.environ['AI_MEDIA_DEPLOY_STAGE']);r=json.loads((p/'runtime.json').read_text())
(p/'test.env').write_text('M4_DATABASE_URL='+r['m4']['env']['M4_DATABASE_URL']+'\nAI_CHAT_MEDIA_NATIVE_TEST=1\nPYTHONDONTWRITEBYTECODE=1\n');(p/'test.env').chmod(0o600)
PY
network=$(python3 -c 'import json,os;print(json.load(open(os.environ["AI_MEDIA_DEPLOY_STAGE"]+"/runtime.json"))["m4"]["network"])')
# Candidate tests use isolated schemas and fake model transports only. No Redis,
# provider credentials, user storage volumes, or production worker starts.
docker run --rm --network "$network" --env-file "$stage/test.env" --read-only --tmpfs /tmp:rw,nosuid,nodev,size=536870912 --memory 512m --cpus 1 --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges "$candidate" python -m pytest -p no:cacheprovider -q
helper="$stage/scripts/ai-chat-media-deploy.py"
python3 "$helper" backup
rollback(){
 trap - ERR
 echo 'AI media stage failed; restoring the previous runtime and retaining private data.' >&2
 python3 "$helper" rollback
 exit 1
}
trap rollback ERR
python3 "$helper" clone-sequence
python3 "$helper" prepare-volumes
python3 "$helper" quiet
# Only the three reviewed, additive M4 migrations may be missing.
docker run --rm --network "$network" --env-file "$stage/database.env" "$candidate" python -c 'import os;from sqlalchemy import create_engine,text;from pathlib import Path;e=create_engine(os.environ["M4_DATABASE_URL"].replace("postgresql://","postgresql+psycopg://",1),hide_parameters=True);c=e.connect();applied=set(c.execute(text("SELECT version FROM schema_migration")).scalars());c.close();e.dispose();missing={p.name for p in Path("migrations").glob("*.sql")}-applied;assert missing<={"010_shared_paid_ai_budget.sql","011_ai_chat_attachments.sql","012_chat_message_sequence.sql"},"Review unplanned M4 migrations"'
docker run --rm --network "$network" --env-file "$stage/database.env" "$candidate" python -m app.migrate
python3 "$helper" stop-and-sync
compose=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f infrastructure/compose.try-on.yaml -f "$stage/override.json")
"${compose[@]}" up -d --no-deps --no-build --pull never m4 worker-try-on
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
 if "${compose[@]}" exec -T m4 python -c 'import urllib.request;urllib.request.urlopen("http://127.0.0.1:3104/health/ready",timeout=3)'; then ready=1;break;fi
 sleep 2
done
[[ $ready == 1 ]]
python3 "$helper" verify
for route in '/chat/media-capabilities' '/me/chat/sessions'; do
 status=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "https://demo.congnguyen.me/api/v1$route")
 [[ $status == 401 ]]
done
python3 "$helper" persist
python3 "$helper" restore-guard
trap - ERR
echo 'AI_MEDIA_DEPLOY_OK: M4 and try-on worker share the existing $1/day, $10/month guard; private storage and public auth verified.'

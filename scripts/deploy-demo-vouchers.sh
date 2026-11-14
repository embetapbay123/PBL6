#!/usr/bin/env bash
set -euo pipefail
deploy_id=${1:?Missing deployment ID}
[[ $deploy_id =~ ^[0-9a-f]{32}$ ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-vouchers-$deploy_id.tgz"
manifest="$HOME/.pbl6-vouchers-$deploy_id-manifest.tgz"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$manifest" "$HOME/.pbl6-vouchers-$deploy_id.sh"' EXIT
exec 9>"$HOME/.pbl6-demo-vouchers-deploy.lock"
flock -w 60 9
tar -xzf "$archive" -C "$stage"
tar -xzf "$manifest" -C "$stage"
cd "$HOME/pbl6-demo"
base=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml)
running=$("${base[@]}" ps -q m2)
previous=$(docker inspect --format '{{.Image}}' "$running")
image_ref=$(docker inspect --format '{{.Config.Image}}' "$running")
[[ $image_ref =~ ^[a-zA-Z0-9/_:.-]+$ ]] && [[ ! $image_ref =~ ^sha256: ]]
candidate="pbl6-demo-vouchers:deploy-$deploy_id"
export VOUCHERS_RUNNING="$running" VOUCHERS_STAGE="$stage" VOUCHERS_IMAGE_REF="$image_ref" VOUCHERS_CANDIDATE="$candidate" VOUCHERS_DEPLOY_ID="$deploy_id"
python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import json,os,subprocess
stage=Path(os.environ['VOUCHERS_STAGE']); running=os.environ['VOUCHERS_RUNNING']
data=json.loads(subprocess.check_output(['docker','inspect',running]))[0]
manifest=json.loads((stage/'manifest.json').read_text())
code="const fs=require('fs'),c=require('crypto');console.log(JSON.stringify(Object.fromEntries(['order.repository','order.service','order.controller'].map(n=>['backend/commerce-service/src/order/'+n+'.ts',c.createHash('sha256').update(fs.readFileSync('commerce-service/src/order/'+n+'.ts','utf8').replace(/\\r\\n/g,'\\n')).digest('hex')]))));"
actual=json.loads(subprocess.check_output(['docker','exec',running,'node','-e',code]))
for path,hashes in manifest['sources'].items():
 # Reviewed 2026-11-15: this demo revision differs from the safe checkout only
 # in the two truthy cap guards and three trailing blank lines. The candidate
 # replaces both guards with the tested shared arithmetic; no other drift allowed.
 reviewed_legacy=['4756f4cdc1b354678b25ee420dac2f228db77644a76c2b97d76de821b41c46d4'] if path.endswith('/order.service.ts') else []
 if actual[path] not in (hashes['before'],hashes['after'],*reviewed_legacy):raise SystemExit('Active M2 source differs from reviewed baseline: '+path)
env=dict(item.split('=',1) for item in data['Config']['Env'])
(stage/'expected-env.json').write_text(json.dumps(env));(stage/'expected-env.json').chmod(0o600)
override={'services':{'m2':{'image':os.environ['VOUCHERS_CANDIDATE'],'environment':{k:v.replace('$','$$') for k,v in env.items()}}}}
(stage/'override.json').write_text(json.dumps(override));(stage/'override.json').chmod(0o600)
url=urlparse(env['M2_DATABASE_URL'])
if url.hostname!='postgres' or not url.path.strip('/'):raise SystemExit('Unsupported active database location; no runtime change made')
backup=Path.home()/'pbl6-demo'/'backups'/('vouchers-'+os.environ['VOUCHERS_DEPLOY_ID'])
backup.mkdir(mode=0o700,parents=True,exist_ok=False)
compose=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
with (backup/'m2.dump').open('wb') as out:
 subprocess.run(compose+['exec','-T','postgres','sh','-c','exec pg_dump -U "${POSTGRES_USER:-postgres}" -d "$1" -Fc','sh',url.path.strip('/')],stdout=out,check=True)
with (backup/'m2.dump').open('rb') as source:
 subprocess.run(compose+['exec','-T','postgres','pg_restore','--list'],stdin=source,stdout=subprocess.DEVNULL,check=True)
print('Reviewed M2 baseline verified; active database backup verified; private runtime snapshot prepared.')
PY
base_tag="pbl6-demo-vouchers-base:$deploy_id"
docker tag "$previous" "$base_tag"
cat > "$stage/Dockerfile" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY backend/dist/commerce-service/src/order/ /app/backend/dist/commerce-service/src/order/
COPY backend/dist/commerce-service/src/voucher/ /app/backend/dist/commerce-service/src/voucher/
COPY backend/dist/shared/src/ /app/backend/dist/shared/src/
COPY backend/commerce-service/src/order/ /app/backend/commerce-service/src/order/
COPY backend/commerce-service/src/voucher/ /app/backend/commerce-service/src/voucher/
COPY backend/shared/src/ /app/backend/shared/src/
COPY backend/tests/integration/voucher-suggestions.test.ts /app/backend/tests/integration/voucher-suggestions.test.ts
RUN chmod -R a+rX /app/backend/dist/commerce-service/src/order /app/backend/dist/commerce-service/src/voucher /app/backend/dist/shared/src /app/backend/commerce-service/src/order /app/backend/commerce-service/src/voucher /app/backend/shared/src /app/backend/tests/integration/voucher-suggestions.test.ts
USER node
DOCKER
docker build --build-arg "BASE_IMAGE=$base_tag" --tag "$candidate" --file "$stage/Dockerfile" "$stage"
compose=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f "$stage/override.json")
# Test the candidate first. Tests create and remove their own UUID-named schemas;
# no application worker starts and no production cart/order/voucher is changed.
"${compose[@]}" run --rm --no-deps -T -e PBL6_ISOLATED_TEST_REDIS=0 m2 node node_modules/jest/bin/jest.js --runInBand --config jest.integration.cjs tests/integration/voucher-suggestions.test.ts tests/integration/voucher-lifecycle.test.ts
docker tag "$previous" pbl6-demo-vouchers:rollback
docker tag "$candidate" "$image_ref"
python3 - <<'PY'
from pathlib import Path
import json,os
p=Path(os.environ['VOUCHERS_STAGE'])/'override.json';v=json.loads(p.read_text());v['services']['m2']['image']=os.environ['VOUCHERS_IMAGE_REF'];p.write_text(json.dumps(v))
PY
rollback() {
  echo 'Voucher smoke failed; restoring previous M2 image.' >&2
  docker tag "$previous" "$image_ref"
  "${compose[@]}" up -d --no-deps --no-build --pull never m2
  exit 1
}
"${compose[@]}" up -d --no-deps --no-build --pull never m2 || rollback
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if "${compose[@]}" exec -T m2 node -e 'fetch("http://127.0.0.1:3102/health/ready").then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>process.exitCode=1)'; then ready=1; break; fi
  sleep 2
done
[[ $ready == 1 ]] || rollback
python3 - <<'PY' || rollback
from pathlib import Path
import json,os,subprocess
running=subprocess.check_output(['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml','ps','-q','m2']).decode().strip()
env=dict(v.split('=',1) for v in json.loads(subprocess.check_output(['docker','inspect',running]))[0]['Config']['Env'])
assert env==json.loads((Path(os.environ['VOUCHERS_STAGE'])/'expected-env.json').read_text()),'M2 environment changed'
print('M2 ready; active database and runtime values preserved.')
PY
status=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' 'https://demo.congnguyen.me/api/v1/checkout/voucher-suggestions')
[[ $status == 401 ]] || rollback
curl -fsS --max-time 20 'https://demo.congnguyen.me/api/v1/products?size=1' -o /dev/null || rollback
cp -a "$stage/backend/commerce-service/src/order/." backend/commerce-service/src/order/
cp -a "$stage/backend/commerce-service/src/voucher/." backend/commerce-service/src/voucher/
cp -a "$stage/backend/shared/src/." backend/shared/src/
cp -a "$stage/backend/tests/integration/voucher-suggestions.test.ts" backend/tests/integration/
cp -a "$stage/docs/contracts/." docs/contracts/
docker image rm "$base_tag" >/dev/null
echo 'VOUCHERS_DEPLOY_OK: isolated PostgreSQL checks passed; M2 ready; public auth enforced; runtime preserved.'

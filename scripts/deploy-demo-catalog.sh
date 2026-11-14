#!/usr/bin/env bash
set -euo pipefail
deploy_id=${1:?Missing deployment ID}
[[ $deploy_id =~ ^[0-9a-f]{32}$ ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-catalog-$deploy_id.tgz"
manifest="$HOME/.pbl6-catalog-$deploy_id-manifest.tgz"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$manifest" "$HOME/.pbl6-catalog-$deploy_id.sh"' EXIT
exec 9>"$HOME/.pbl6-demo-catalog-deploy.lock"
flock -w 60 9
tar -xzf "$archive" -C "$stage"
tar -xzf "$manifest" -C "$stage"
cd "$HOME/pbl6-demo"
base=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml)
running=$("${base[@]}" ps -q m1)
previous=$(docker inspect --format '{{.Image}}' "$running")
image_ref=$(docker inspect --format '{{.Config.Image}}' "$running")
[[ $image_ref =~ ^[a-zA-Z0-9/_:.-]+$ ]] && [[ ! $image_ref =~ ^sha256: ]]
export CATALOG_RUNNING="$running" CATALOG_STAGE="$stage" CATALOG_IMAGE_REF="$image_ref"
python3 - <<'PY'
from pathlib import Path
import json,os,subprocess
stage=Path(os.environ['CATALOG_STAGE']); running=os.environ['CATALOG_RUNNING']
data=json.loads(subprocess.check_output(['docker','inspect',running]))[0]
manifest=json.loads((stage/'manifest.json').read_text())
code="const fs=require('fs'),c=require('crypto');console.log(JSON.stringify(Object.fromEntries(['catalog.repository','catalog.service'].map(n=>['backend/catalog-service/src/catalog/'+n+'.ts',c.createHash('sha256').update(fs.readFileSync('catalog-service/src/catalog/'+n+'.ts','utf8').replace(/\\r\\n/g,'\\n')).digest('hex')]))));"
actual=json.loads(subprocess.check_output(['docker','exec',running,'node','-e',code]))
for path,hashes in manifest['sources'].items():
 if actual[path] not in (hashes['before'],hashes['after']):raise SystemExit('Active catalog source differs from the reviewed baseline: '+path)
env=dict(item.split('=',1) for item in data['Config']['Env'])
(stage/'expected-env.json').write_text(json.dumps(env))
# Compose interpolates dollars in JSON too. Preserve every active runtime value literally.
override={'services':{'m1':{'image':os.environ['CATALOG_IMAGE_REF'],'environment':{k:v.replace('$','$$') for k,v in env.items()}}}}
(stage/'override.json').write_text(json.dumps(override));(stage/'override.json').chmod(0o600)
print('Active catalog baseline verified; private runtime snapshot prepared.')
PY
base_tag="pbl6-demo-catalog-base:$deploy_id"
candidate="pbl6-demo-catalog:deploy-$deploy_id"
docker tag "$previous" "$base_tag"
cat > "$stage/Dockerfile" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY backend/dist/catalog-service/src/catalog/catalog.repository.js* /app/backend/dist/catalog-service/src/catalog/
COPY backend/dist/catalog-service/src/catalog/catalog.service.js* /app/backend/dist/catalog-service/src/catalog/
COPY backend/dist/shared/src/ /app/backend/dist/shared/src/
COPY backend/catalog-service/src/catalog/ /app/backend/catalog-service/src/catalog/
COPY backend/shared/src/ /app/backend/shared/src/
RUN chmod -R a+rX /app/backend/dist/catalog-service/src/catalog /app/backend/dist/shared/src /app/backend/catalog-service/src/catalog /app/backend/shared/src
USER node
DOCKER
# No dependency, migration, worker, M2/M3/M4 or gateway changes: patch the reviewed catalog files only.
docker build --build-arg "BASE_IMAGE=$base_tag" --tag "$candidate" --file "$stage/Dockerfile" "$stage"
docker tag "$previous" pbl6-demo-catalog:rollback
docker tag "$candidate" "$image_ref"
compose=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f "$stage/override.json")
rollback() {
  echo 'Catalog smoke check failed; restoring the previous M1 image.' >&2
  docker tag "$previous" "$image_ref"
  "${compose[@]}" up -d --no-deps --no-build --pull never m1
  exit 1
}
"${compose[@]}" up -d --no-deps --no-build --pull never m1 || rollback
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if "${compose[@]}" exec -T m1 node -e 'fetch("http://127.0.0.1:3101/health/ready").then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>process.exitCode=1)'; then ready=1; break; fi
  sleep 2
done
[[ $ready == 1 ]] || rollback
python3 - <<'PY' || rollback
import json,os,subprocess
from pathlib import Path
running=subprocess.check_output(['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml','ps','-q','m1']).decode().strip()
env=dict(v.split('=',1) for v in json.loads(subprocess.check_output(['docker','inspect',running]))[0]['Config']['Env'])
assert env==json.loads((Path(os.environ['CATALOG_STAGE'])/'expected-env.json').read_text()),'Catalog environment changed'
print('Catalog ready; active database and runtime values preserved.')
PY
curl -fsS --max-time 20 'https://demo.congnguyen.me/api/v1/products?size=1' -o "$stage/products.json" || rollback
store=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["items"][0]["store_id"])' "$stage/products.json")
curl -fsS --max-time 20 "https://demo.congnguyen.me/api/v1/stores/$store/products?sort=rating&size=1" -o /dev/null || rollback
curl -fsS --max-time 20 "https://demo.congnguyen.me/api/v1/stores/$store/products?sort=price_asc&size=1" -o /dev/null || rollback
status=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "https://demo.congnguyen.me/api/v1/stores/$store/products?sort=invalid")
[[ $status == 422 ]] || rollback
# Keep the host checkout consistent for future full builds after the public checks pass.
cp -a "$stage/backend/catalog-service/src/catalog/." backend/catalog-service/src/catalog/
cp -a "$stage/backend/shared/src/." backend/shared/src/
cp -a "$stage/docs/contracts/." docs/contracts/
docker image rm "$base_tag" >/dev/null
echo 'CATALOG_DEPLOY_OK: M1 ready; public price/rating sorts accepted; invalid sort rejected; runtime unchanged.'

#!/usr/bin/env bash
set -euo pipefail
deploy_id=${1:?Missing deployment ID}
[[ $deploy_id =~ ^[0-9a-f]{32}$ ]]
archive="$HOME/.pbl6-ai-$deploy_id.tgz"
stage=$(mktemp -d)
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$HOME/.pbl6-ai-$deploy_id.sh"' EXIT
exec 9>"$HOME/.pbl6-demo-ai-deploy.lock"
flock -w 60 9
tar -xzf "$archive" -C "$stage"
cd "$HOME/pbl6-demo"
base=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml)
running=$("${base[@]}" ps -q m4)
previous=$(docker inspect --format '{{.Image}}' "$running")
export TRY_ON_SOURCE_CONTAINER="$running"
candidate_tag="pbl6-demo-try-on:deploy-$deploy_id"
docker build --tag "$candidate_tag" --file "$stage/backend/ai-service/Dockerfile" "$stage"

# Install only M4/its generated contract and the targeted override; preserve M1/M2/M3 and their deployment files.
mkdir -p backend/ai-service docs/contracts
cp -a "$stage/backend/ai-service/." backend/ai-service/
cp -a "$stage/docs/contracts/." docs/contracts/
cp "$stage/infrastructure/compose.try-on.yaml" infrastructure/compose.try-on.yaml
cp infrastructure/Caddyfile "$stage/Caddyfile.before"

# Configure the user's chosen budgets, create a private signing secret, and keep paid generation off.
# Never print the environment, OpenAI key or signing secret.
python3 - <<'PY'
from pathlib import Path
import secrets
import json, os, subprocess
path=Path('infrastructure/.env')
lines=path.read_text().splitlines()
updates={'TRY_ON_ENABLED':'0','TRY_ON_DAILY_BUDGET_MICRO_USD':'1000000','TRY_ON_MONTHLY_BUDGET_MICRO_USD':'10000000'}
current=dict(line.split('=',1) for line in lines if '=' in line and not line.startswith('#'))
if len(current.get('TRY_ON_SIGNING_KEY',''))<32:updates['TRY_ON_SIGNING_KEY']=secrets.token_hex(32)
seen=set();output=[]
for line in lines:
 key=line.split('=',1)[0]
 if key in updates:output.append(key+'='+updates[key]);seen.add(key)
 else:output.append(line)
output.extend(key+'='+value for key,value in updates.items() if key not in seen)
path.write_text('\n'.join(output)+'\n')
path.chmod(0o600)
# Preserve the actual active database (including an imported database name); never print its URL.
environment=json.loads(subprocess.check_output(['docker','inspect','--format','{{json .Config.Env}}',os.environ['TRY_ON_SOURCE_CONTAINER']]))
source=dict(item.split('=',1) for item in environment if '=' in item)
if not source.get('M4_DATABASE_URL'):raise SystemExit('Current M4 database connection is missing')
private=Path('infrastructure/secrets/try-on-worker.env')
private.parent.mkdir(parents=True,exist_ok=True)
worker=[]
for key in ('M4_DATABASE_URL','PGOPTIONS','PGSSLMODE'):
 value=source.get(key)
 if value:
  if any(c in value for c in "\r\n'"):raise SystemExit('Unsupported database environment encoding')
  worker.append(key+"='"+value+"'")
private.write_text('\n'.join(worker)+'\n');private.chmod(0o600)
PY

compose=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f infrastructure/compose.try-on.yaml)
docker tag "$previous" pbl6-demo-try-on:rollback
docker tag "$candidate_tag" pbl6-demo-try-on:latest
docker image rm "$candidate_tag" >/dev/null

# Additive migrations stay in place if an application rollback is needed.
"${compose[@]}" run --rm --no-deps -T m4 python -m app.migrate

rollback() {
  echo 'M4 smoke check failed; restoring the previous application image and gateway configuration.' >&2
  docker tag "$previous" pbl6-demo-try-on:latest
  "${compose[@]}" stop worker-try-on || true
  "${compose[@]}" up -d --no-deps --no-build --pull never m4
  cat "$stage/Caddyfile.before" > infrastructure/Caddyfile
  "${compose[@]}" exec -T gateway caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || true
  exit 1
}

"${compose[@]}" up -d --no-deps --no-build --pull never m4 worker-try-on || rollback
python3 - <<'PY' || rollback
from pathlib import Path
path=Path('infrastructure/Caddyfile');body=path.read_text()
if not any(header in body for header in ('header_up X-PBL6-Client-IP {remote_host}', 'header_up X-PBL6-Client-IP {client_ip}')):
 target='reverse_proxy m4:3104'
 if body.count(target)!=1:raise SystemExit('Cannot identify the existing M4 gateway route safely')
 body=body.replace(target,target+' {\n      header_up X-PBL6-Client-IP {remote_host}\n    }')
 path.write_text(body)
PY
"${compose[@]}" exec -T gateway caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || rollback
"${compose[@]}" exec -T gateway caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || rollback

ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if "${compose[@]}" exec -T m4 python -c 'import httpx; r=httpx.get("http://127.0.0.1:3104/health/ready"); r.raise_for_status()'; then ready=1; break; fi
  sleep 2
done
[[ $ready == 1 ]] || rollback
uuid=11111111-1111-4111-8111-111111111111
status=$(curl -sS --max-time 20 -o "$stage/public.json" -w '%{http_code}' "https://demo.congnguyen.me/api/v1/ai/try-on/capabilities?product_id=$uuid&variant_id=$uuid")
[[ $status == 401 ]] || rollback
curl -fsS --max-time 20 -o /dev/null "https://demo.congnguyen.me/products/$uuid?deploy=$deploy_id" || rollback
"${compose[@]}" exec -T worker-try-on python -m app.try_on.operator status || rollback
echo 'AI_DEPLOY_OK: M4 ready; worker running; public try-on authentication enforced; $1/day and $10/month; paid generation disabled.'

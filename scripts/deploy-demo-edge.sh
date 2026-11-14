#!/usr/bin/env bash
set -euo pipefail
deploy_id=${1:?Missing deployment ID}
[[ $deploy_id =~ ^[0-9a-f]{32}$ ]]
archive="$HOME/.pbl6-edge-$deploy_id.tgz"
stage=$(mktemp -d)
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$HOME/.pbl6-edge-$deploy_id.sh"' EXIT
exec 9>"$HOME/.pbl6-demo-ai-deploy.lock"
flock -w 60 9
tar -xzf "$archive" -C "$stage"
cd "$HOME/pbl6-demo"
base=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml)
gateway=$("${base[@]}" ps -q gateway)
export EDGE_GATEWAY_CONTAINER="$gateway"
cp infrastructure/Caddyfile "$stage/Caddyfile.before"
cp infrastructure/.env "$stage/env.before"
chmod 600 "$stage/env.before"
had_overlay=0
if [[ -f infrastructure/compose.edge-guard.yaml ]]; then cp infrastructure/compose.edge-guard.yaml "$stage/edge.before.yaml"; had_overlay=1; fi
previous=$(docker image inspect --format '{{.Id}}' pbl6-edge-guard:latest 2>/dev/null || true)
candidate="pbl6-edge-guard:deploy-$deploy_id"
docker build --tag "$candidate" --file "$stage/backend/ai-service/Dockerfile" "$stage"

# Only the host tunnel on a loopback-bound origin can supply the Cloudflare header.
python3 - <<'PY'
import ipaddress,json,os,subprocess
from pathlib import Path
def inspect(format):
 return json.loads(subprocess.check_output(['docker','inspect','--format',format,os.environ['EDGE_GATEWAY_CONTAINER']]))
ports=inspect('{{json .HostConfig.PortBindings}}')
if not ports or any(not ipaddress.ip_address(binding['HostIp']).is_loopback for bindings in ports.values() for binding in bindings or []):
 raise SystemExit('Refusing trusted tunnel headers on a publicly bound origin.')
networks=inspect('{{json .NetworkSettings.Networks}}')
peers={str(ipaddress.ip_network(info['Gateway']+'/32')) for info in networks.values() if info.get('Gateway')}
if len(peers)!=1:raise SystemExit('Expected exactly one gateway bridge peer for the host tunnel.')
value=' '.join(sorted(peers))+' 127.0.0.1/32 ::1/128'
path=Path('infrastructure/.env');lines=path.read_text().splitlines()
lines=[line for line in lines if not line.startswith('EDGE_TRUSTED_PROXY_CIDRS=')]
path.write_text('\n'.join(lines)+"\nEDGE_TRUSTED_PROXY_CIDRS='"+value+"'\n");path.chmod(0o600)
print('Verified loopback-only origin; configured exact host tunnel peer.')
PY
cp "$stage/infrastructure/compose.edge-guard.yaml" infrastructure/compose.edge-guard.yaml
compose=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f infrastructure/compose.edge-guard.yaml)
rollback() {
  echo 'Gateway verification failed; restoring its previous configuration.' >&2
  cat "$stage/Caddyfile.before" > infrastructure/Caddyfile
  python3 - "$stage/env.before" <<'PY'
from pathlib import Path
import sys
key='EDGE_TRUSTED_PROXY_CIDRS='
original=[line for line in Path(sys.argv[1]).read_text().splitlines() if line.startswith(key)]
path=Path('infrastructure/.env');lines=[line for line in path.read_text().splitlines() if not line.startswith(key)]
path.write_text('\n'.join(lines+original)+'\n');path.chmod(0o600)
PY
  if [[ $had_overlay == 1 ]]; then
    cp "$stage/edge.before.yaml" infrastructure/compose.edge-guard.yaml
    [[ -z "$previous" ]] || docker tag "$previous" pbl6-edge-guard:latest
    "${compose[@]}" up -d --no-deps --no-build --pull never edge-guard gateway || true
  else
    "${base[@]}" up -d --no-deps --no-build --pull never gateway || true
    "${compose[@]}" stop edge-guard || true
    rm -f infrastructure/compose.edge-guard.yaml
  fi
  exit 1
}
docker tag "$candidate" pbl6-edge-guard:latest
docker image rm "$candidate" >/dev/null
"${compose[@]}" up -d --no-deps --no-build --pull never edge-guard || rollback
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
 if "${compose[@]}" exec -T edge-guard python -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:3111/health/ready",timeout=2)' 2>/dev/null; then ready=1; break; fi
 sleep 2
done
[[ $ready == 1 ]] || rollback
python3 "$stage/scripts/install_edge_guard.py" infrastructure/Caddyfile || rollback
"${base[@]}" exec -T gateway caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || rollback
"${compose[@]}" up -d --no-deps --no-build --pull never gateway || rollback
sleep 2
mkdir -p outputs/edge-guard
python3 "$stage/scripts/verify_edge_guard.py" --base-url https://demo.congnguyen.me --output outputs/edge-guard/demo-verification.json || rollback
python3 - <<'PY' || rollback
import hashlib,ipaddress,json,subprocess
from pathlib import Path
# Cloudflare's trace and the guard must identify the same visitor. Do not print the address.
trace=subprocess.check_output(['curl','-fsS','--max-time','15','https://demo.congnguyen.me/cdn-cgi/trace'],text=True)
address=ipaddress.ip_address(dict(line.split('=',1) for line in trace.splitlines() if '=' in line)['ip'])
if address.version==6 and address.ipv4_mapped:address=address.ipv4_mapped
canonical=str(ipaddress.ip_network(str(address)+'/64',strict=False)) if address.version==6 else str(address)
digest=hashlib.sha256(canonical.encode()).hexdigest()
redis=subprocess.check_output(['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml','ps','-q','redis'],text=True).strip()
exists=subprocess.check_output(['docker','exec',redis,'redis-cli','EXISTS','edge:v1:'+digest+':api:60'],text=True).strip()
if exists!='1':raise SystemExit('Gateway did not account for the actual Cloudflare visitor IP.')
path=Path('outputs/edge-guard/demo-verification.json');report=json.loads(path.read_text());report['verified_cloudflare_client_ip']=True
path.write_text(json.dumps(report,indent=2)+'\n')
print('Verified actual visitor IP against Cloudflare trace; no address logged.')
PY
cp "$stage/backend/ai-service/app/edge_guard.py" backend/ai-service/app/edge_guard.py
cp "$stage/scripts/install_edge_guard.py" scripts/install_edge_guard.py
cp "$stage/scripts/verify_edge_guard.py" scripts/verify_edge_guard.py
echo 'EDGE_DEPLOY_OK: API/document/login bursts blocked; spoofed headers cannot reset allowance; static assets available; access recovered.'

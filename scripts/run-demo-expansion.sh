#!/usr/bin/env bash
set -euo pipefail
run_id=${1:?Missing run ID}
[[ $run_id =~ ^[0-9a-f]{32}$ ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-expand-$run_id.tgz"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$HOME/.pbl6-expand-$run_id.sh"' EXIT
exec 9>"$HOME/.pbl6-demo-expansion.lock"
flock -w 1 9
if [[ -n $(docker ps -q --filter 'name=pbl6-demo-expansion-') ]]; then echo 'Another expansion container is still running.' >&2; exit 1; fi
tar -xzf "$archive" -C "$stage"
cd "$HOME/pbl6-demo"
report_dir="$PWD/artifacts/demo-expansion-2026-v1"
mkdir -p "$report_dir"
chmod 700 "$report_dir"
export EXPAND_STAGE="$stage" EXPAND_REPORT="$report_dir"
python3 - <<'PY'
from pathlib import Path
import datetime,hashlib,json,os,subprocess
stage=Path(os.environ['EXPAND_STAGE']); compose=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
runtime={}
for service in ('m1','m2','m3','postgres','delivery','delivery-postgres'):
 container=subprocess.check_output(compose+['ps','-q',service]).decode().strip()
 if not container:raise SystemExit('Missing active service '+service)
 runtime[service]=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
envs={s:dict(v.split('=',1) for v in data['Config']['Env']) for s,data in runtime.items()}
if envs['m3'].get('NODE_ENV')=='production' or envs['m3'].get('DEMO_LOGIN_ENABLED')!='1':raise SystemExit('Refuse expansion outside the configured synthetic demo')
network=next((n for n in runtime['m1']['NetworkSettings']['Networks'] if all(n in runtime[s]['NetworkSettings']['Networks'] for s in ('m2','m3','delivery'))),None)
if not network:raise SystemExit('No shared application network')
values={'NODE_ENV':envs['m3'].get('NODE_ENV','development'),'DEMO_SEED_ALLOWED':'1','PBL6_BACKEND_ROOT':'/app/backend','CURATED_CATALOG_FILE':'/seed/data/marketplace-catalog.json','DEMO_PUBLIC_ORIGIN':'https://demo.congnguyen.me','DEMO_MEDIA_ORIGIN':'http://web:3000','SEED_PASSWORD':envs['m3']['SEED_PASSWORD']}
values.update(DELIVERY_API_URL=envs['m2']['DELIVERY_API_URL'],DELIVERY_API_KEY=envs['m2']['DELIVERY_API_KEY'],DELIVERY_OPERATOR_PASSWORD=envs['delivery']['DELIVERY_OPERATOR_PASSWORD'])
from urllib.parse import urlparse
for s in ('m1','m2','m3'):
 key=s.upper()+'_DATABASE_URL';values[key]=envs[s][key]
 if urlparse(values[key]).path!='/import2_'+s:raise SystemExit('Unexpected demo database; refusing a guessed target')
if any('\n' in v or '\r' in v for v in values.values()):raise SystemExit('Unsupported runtime environment encoding')
private=stage/'runtime.env';private.write_text('\n'.join(k+'='+v for k,v in values.items())+'\n');private.chmod(0o600)
(stage/'image').write_text(runtime['m1']['Image']);(stage/'network').write_text(network)
backup=Path('artifacts/backups/demo-expansion-2026-v1')/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');backup.mkdir(parents=True,mode=0o700)
meta={'limit':'Independent PostgreSQL snapshots; no coordinated cross-service restore drill','services':{}}
for s in ('m1','m2','m3'):
 name=urlparse(values[s.upper()+'_DATABASE_URL']).path[1:];target=backup/(s+'.dump')
 with target.open('wb') as out:
  subprocess.run(['docker','exec',runtime['postgres']['Id'],'sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U postgres "$@"','sh','-d',name,'-Fc','--no-owner','--no-acl'],stdout=out,check=True)
 target.chmod(0o600)
 with target.open('rb') as source:subprocess.run(['docker','exec','-i',runtime['postgres']['Id'],'pg_restore','--list'],stdin=source,stdout=subprocess.DEVNULL,check=True)
 meta['services'][s]={'database':name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
name=urlparse(envs['delivery']['DELIVERY_DATABASE_URL']).path[1:];target=backup/'delivery.dump'
with target.open('wb') as out:subprocess.run(['docker','exec',runtime['delivery-postgres']['Id'],'sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U "$POSTGRES_USER" "$@"','sh','-d',name,'-Fc','--no-owner','--no-acl'],stdout=out,check=True)
target.chmod(0o600)
with target.open('rb') as source:subprocess.run(['docker','exec','-i',runtime['delivery-postgres']['Id'],'pg_restore','--list'],stdin=source,stdout=subprocess.DEVNULL,check=True)
meta['services']['delivery']={'database':name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
(backup/'manifest.json').write_text(json.dumps(meta,indent=2));(backup/'manifest.json').chmod(0o600)
(Path(os.environ['EXPAND_REPORT'])/'last-backup.json').write_text(json.dumps({'path':str(backup),'manifest':meta},indent=2))
print('Private backups of M1/M2/M3 and Delivery saved and dump catalogs checked.')
PY
image=$(cat "$stage/image")
network=$(cat "$stage/network")
echo 'Appending linked demo catalog, orders, reviews and vouchers through the service APIs...'
docker run --rm --name "pbl6-demo-expansion-$run_id" --network "$network" \
  --user "$(id -u):$(id -g)" --env-file "$stage/runtime.env" \
  --volume "$stage:/seed:ro" --volume "$report_dir:/report" \
  "$image" node /seed/scripts/seed_demo_expansion.cjs --apply --output /report/report.json
echo 'DEMO_EXPANSION_OK: linked demo records created; existing carts and terminal orders verified; no paid providers called.'

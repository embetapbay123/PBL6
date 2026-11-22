#!/usr/bin/env bash
set -euo pipefail
id=${1:?Missing test ID}
[[ $id =~ ^[0-9a-f]{32}$ ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-storefront-test-$id.tgz"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$HOME/.pbl6-storefront-test-$id.sh"' EXIT
tar -xzf "$archive" -C "$stage"
chmod -R a+rX "$stage/backend"
cd "$HOME/pbl6-demo"
export STOREFRONT_TEST_STAGE="$stage"
python3 - <<'PY'
import json,os,subprocess
from pathlib import Path
stage=Path(os.environ['STOREFRONT_TEST_STAGE'])
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
values={};runtime={}
for service in ('m1','m2','m3'):
 container=subprocess.check_output(base+['ps','-q',service]).decode().strip()
 data=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
 env=dict(v.split('=',1) for v in data['Config']['Env'])
 values[service.upper()+'_DATABASE_URL']=env[service.upper()+'_DATABASE_URL'];runtime[service]=data
path=stage/'test.env';path.write_text(''.join(k+'='+v+'\n' for k,v in values.items()));path.chmod(0o600)
network=next(iter(runtime['m3']['NetworkSettings']['Networks']))
native=subprocess.run(['docker','exec',runtime['m3']['Id'],'sh','-c','test -x /usr/bin/ffmpeg && test -x /usr/bin/prlimit']).returncode==0
image=runtime['m3']['Image']
if not native:
 tag='pbl6-storefront-test-codecs:base-'+image.removeprefix('sha256:')
 if subprocess.run(['docker','image','inspect',tag],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
  dockerfile=stage/'Dockerfile.codecs'
  dockerfile.write_text("""ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
RUN node -e "require('fs').writeFileSync('/tmp/pbl6-ca.pem',require('tls').rootCertificates.join(String.fromCharCode(10)))" && sed -i s,http://deb.debian.org,https://deb.debian.org,g /etc/apt/sources.list.d/debian.sources && apt-get -o Acquire::https::CaInfo=/tmp/pbl6-ca.pem -o Acquire::https::Timeout=30 update && apt-get -o Acquire::https::CaInfo=/tmp/pbl6-ca.pem -o Acquire::https::Timeout=30 install -y --no-install-recommends ffmpeg util-linux && rm -rf /var/lib/apt/lists/* /tmp/pbl6-ca.pem
USER node
""")
  base_tag='pbl6-storefront-test-base:'+image.removeprefix('sha256:')
  subprocess.run(['docker','tag',image,base_tag],check=True)
  subprocess.run(['docker','build','--network','host','--build-arg','BASE_IMAGE='+base_tag,'-t',tag,'-f',str(dockerfile),str(stage)],check=True)
 image=tag
mounts=[]
for source,target in [('backend/dist','/app/backend/dist')]+[('backend/'+s+'/migrations','/app/backend/'+s+'/migrations') for s in ('catalog-service','commerce-service','identity-store-service')]:
 mounts+=['--mount','type=bind,source='+str(stage/source)+',target='+target+',readonly']
config={'testEnvironment':'node','testMatch':['**/dist/tests/integration/storefront-lifecycle.test.js'],'testTimeout':90000}
subprocess.run(['docker','run','--rm','--network',network,'--env-file',str(path),*mounts,'--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=536870912','--memory','768m','--cpus','1','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges',image,'node','node_modules/jest/bin/jest.js','--runInBand','--config',json.dumps(config)],check=True)
PY
echo 'STOREFRONT_ISOLATED_TEST_OK: native banners and three fresh database schemas passed; demo services unchanged.'

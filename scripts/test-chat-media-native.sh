#!/usr/bin/env bash
set -euo pipefail
id=${1:?Missing test ID}
[[ $id =~ ^[0-9a-f]{32}$ ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-media-native-$id.tgz"
candidate="pbl6-media-native:test-$id"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$HOME/.pbl6-media-native-$id.sh"' EXIT
tar -xzf "$archive" -C "$stage"
cd "$HOME/pbl6-demo"
running=$(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml ps -q m3)
base=$(docker inspect --format '{{.Image}}' "$running")
cat > "$stage/Dockerfile" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
RUN if ! test -x /usr/bin/ffmpeg || ! test -x /usr/bin/prlimit; then apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux && rm -rf /var/lib/apt/lists/*; fi
COPY backend/identity-store-service/src/messaging/ /app/backend/identity-store-service/src/messaging/
COPY backend/tests/integration/chat-media-processing.test.ts /app/backend/tests/integration/chat-media-processing.test.ts
COPY backend/dist/identity-store-service/src/messaging/ /app/backend/dist/identity-store-service/src/messaging/
COPY backend/dist/tests/integration/ /app/backend/dist/tests/integration/
COPY backend/identity-store-service/migrations/ /app/backend/identity-store-service/migrations/
COPY backend/dist/shared/src/ /app/backend/dist/shared/src/
COPY backend/shared/src/ /app/backend/shared/src/
RUN chmod -R a+rX /app/backend/identity-store-service/src/messaging /app/backend/tests/integration/chat-media-processing.test.ts
USER node
DOCKER
native_installed=0
if docker exec "$running" sh -c 'test -x /usr/bin/ffmpeg && test -x /usr/bin/ffprobe && test -x /usr/bin/prlimit'; then native_installed=1; fi
if [[ $native_installed == 1 ]]; then
 # Testing new compiled cases needs no image build when codecs already exist.
 # Read-only bind mounts replace only the reviewed test/implementation files.
 candidate="$base"
else
 docker build --no-cache --build-arg "BASE_IMAGE=$base" --tag "$candidate" --file "$stage/Dockerfile" "$stage"
fi
chmod -R a+rX "$stage/backend"
mounts=(--mount "type=bind,source=$stage/backend/dist/tests/integration,target=/app/backend/dist/tests/integration,readonly" --mount "type=bind,source=$stage/backend/dist/identity-store-service/src/messaging,target=/app/backend/dist/identity-store-service/src/messaging,readonly")
# No runtime env, keys, database, network or user volumes enter this test container.
docker run --rm --network none "${mounts[@]}" --read-only --tmpfs /tmp:rw,nosuid,nodev,size=536870912 --memory 512m --cpus 1 --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges -e CHAT_MEDIA_NATIVE_TEST=1 "$candidate" node node_modules/jest/bin/jest.js --runInBand --config '{"testEnvironment":"node","testMatch":["**/dist/tests/integration/chat-media-processing.test.js"],"testTimeout":60000}'

# The second isolated test can access only the existing PostgreSQL URL. It uses
# a fresh schema and removes it afterward; it starts no service or provider calls.
export MEDIA_TEST_STAGE="$stage" MEDIA_TEST_RUNNING="$running" MEDIA_TEST_CANDIDATE="$candidate"
python3 - <<'PY'
import json,os,subprocess
from pathlib import Path
data=json.loads(subprocess.check_output(['docker','inspect',os.environ['MEDIA_TEST_RUNNING']]))[0]
env=dict(v.split('=',1) for v in data['Config']['Env'])
network=next(iter(data['NetworkSettings']['Networks']))
p=Path(os.environ['MEDIA_TEST_STAGE'])/'test.env';p.write_text('M3_DATABASE_URL='+env['M3_DATABASE_URL']+'\nCHAT_MEDIA_NATIVE_TEST=1\n');p.chmod(0o600)
mounts=[]
for source,target in [('backend/dist/tests/integration','/app/backend/dist/tests/integration'),('backend/dist/identity-store-service/src/messaging','/app/backend/dist/identity-store-service/src/messaging')]:mounts+=['--mount','type=bind,source='+str(Path(os.environ['MEDIA_TEST_STAGE'])/source)+',target='+target+',readonly']
subprocess.run(['docker','run','--rm','--network',network,'--env-file',str(p),*mounts,'--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=536870912','--memory','512m','--cpus','1','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges',os.environ['MEDIA_TEST_CANDIDATE'],'node','node_modules/jest/bin/jest.js','--runInBand','--config',json.dumps({'testEnvironment':'node','testMatch':['**/dist/tests/integration/chat-media-lifecycle.test.js'],'testTimeout':60000})],check=True)
PY
if [[ $native_installed == 0 ]]; then docker image rm "$candidate" >/dev/null; fi
echo 'CHAT_MEDIA_NATIVE_TEST_OK: real codecs passed in isolated container; no demo changes.'

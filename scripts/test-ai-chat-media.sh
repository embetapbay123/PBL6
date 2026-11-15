#!/usr/bin/env bash
set -euo pipefail
id=${1:?Missing test ID}
[[ $id =~ ^[0-9a-f]{32}$ ]]
stage=$(mktemp -d)
archive="$HOME/.pbl6-ai-media-check-$id.tgz"
trap 'rm -rf -- "$stage"; rm -f -- "$archive" "$HOME/.pbl6-ai-media-check-$id.sh"' EXIT
tar -xzf "$archive" -C "$stage"
chmod -R a+rX "$stage/backend/ai-service"
cd "$HOME/pbl6-demo"
running=$(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml ps -q m4)
base=$(docker inspect --format '{{.Image}}' "$running")
cat > "$stage/Dockerfile" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux && rm -rf /var/lib/apt/lists/*
USER app
DOCKER
candidate="pbl6-ai-media-check:test-$id"
codecs="pbl6-ai-media-codecs:base-${base#sha256:}"
if docker image inspect "$codecs" >/dev/null 2>&1; then docker tag "$codecs" "$candidate";else
 docker build --build-arg "BASE_IMAGE=$base" --tag "$codecs" --file "$stage/Dockerfile" "$stage"
 docker tag "$codecs" "$candidate"
fi
docker run --rm --network none --mount "type=bind,source=$stage/backend/ai-service/app,target=/app/app,readonly" --mount "type=bind,source=$stage/backend/ai-service/tests,target=/app/tests,readonly" --read-only --tmpfs /tmp:rw,nosuid,nodev,size=536870912 --memory 512m --cpus 1 --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges -e AI_CHAT_MEDIA_NATIVE_TEST=1 -e PYTHONDONTWRITEBYTECODE=1 "$candidate" python -m pytest -p no:cacheprovider tests/test_chat_media_native.py -q
export AI_MEDIA_CHECK_STAGE="$stage" AI_MEDIA_CHECK_RUNNING="$running"
export AI_MEDIA_CHECK_CANDIDATE="$candidate"
python3 - <<'PY'
import json,os,subprocess
from pathlib import Path
p=Path(os.environ['AI_MEDIA_CHECK_STAGE']);data=json.loads(subprocess.check_output(['docker','inspect',os.environ['AI_MEDIA_CHECK_RUNNING']]))[0]
env=dict(v.split('=',1) for v in data['Config']['Env']);network=next(iter(data['NetworkSettings']['Networks']))
private=p/'test.env';private.write_text('M4_DATABASE_URL='+env['M4_DATABASE_URL']+'\nAI_CHAT_MEDIA_NATIVE_TEST=1\n');private.chmod(0o600)
mounts=[]
for name in ('app','tests','migrations'):
 mounts+=['--mount','type=bind,source='+str(p/'backend/ai-service'/name)+',target=/app/'+name+',readonly']
# A read-only fresh container, only one database URL, no OpenAI credentials or Redis.
subprocess.run(['docker','run','--rm','--network',network,'--env-file',str(private),*mounts,'--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=536870912','--memory','512m','--cpus','1','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','-e','PYTHONDONTWRITEBYTECODE=1',os.environ['AI_MEDIA_CHECK_CANDIDATE'],'python','-m','pytest','-p','no:cacheprovider','tests/test_chat_media_budget.py','tests/test_chat_media_pipeline.py','tests/test_try_on_postgres.py','tests/test_chat_vision.py','tests/test_chat_search.py','-q'],check=True)
PY
docker image rm "$candidate" >/dev/null
echo 'AI_MEDIA_CHECK_OK: isolated shared-budget/ownership tests passed; no paid calls or demo changes.'

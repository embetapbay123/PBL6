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
base_tag="pbl6-ai-media-base:${base#sha256:}"
docker tag "$base" "$base_tag"
cat > "$stage/Dockerfile" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
RUN test -s /etc/ssl/certs/ca-certificates.crt && sed -i s,http://deb.debian.org,https://deb.debian.org,g /etc/apt/sources.list.d/debian.sources && apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux && rm -rf /var/lib/apt/lists/*
USER app
DOCKER
candidate="pbl6-ai-media-check:test-$id"
codecs="pbl6-ai-media-codecs:base-${base#sha256:}"
if docker image inspect "$codecs" >/dev/null 2>&1; then docker tag "$codecs" "$candidate";else
 docker build --network host --build-arg "BASE_IMAGE=$base_tag" --tag "$codecs" --file "$stage/Dockerfile" "$stage"
 docker tag "$codecs" "$candidate"
fi
docker run --rm --network none --mount "type=bind,source=$stage/backend/ai-service/app,target=/app/app,readonly" --mount "type=bind,source=$stage/backend/ai-service/tests,target=/app/tests,readonly" --read-only --tmpfs /tmp:rw,nosuid,nodev,size=536870912 --memory 512m --cpus 1 --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges -e AI_CHAT_MEDIA_NATIVE_TEST=1 -e PYTHONDONTWRITEBYTECODE=1 "$candidate" python -m pytest -p no:cacheprovider tests/test_chat_media_native.py -q
export AI_MEDIA_CHECK_STAGE="$stage" AI_MEDIA_CHECK_RUNNING="$running"
export AI_MEDIA_CHECK_CANDIDATE="$candidate"
python3 "$stage/scripts/test-ai-chat-media-isolated.py" "$stage" "$candidate"
docker image rm "$candidate" >/dev/null
echo 'AI_MEDIA_CHECK_OK: isolated shared-budget/ownership tests passed; no paid calls or demo changes.'

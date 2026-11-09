#!/usr/bin/env bash
set -euo pipefail

deploy_id=${1:?Missing deployment ID}
[[ $deploy_id =~ ^[0-9a-f]{32}$ ]]
archive="$HOME/.pbl6-web-$deploy_id.tgz"
stage=$(mktemp -d)
trap 'rm -rf -- "$stage"; rm -f -- "$archive"' EXIT

exec 9>"$HOME/.pbl6-demo-web-deploy.lock"
flock -w 60 9
tar -xzf "$archive" -C "$stage"
cd "$HOME/pbl6-demo"
compose=(docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml)

running=$("${compose[@]}" ps -q web)
previous=$(docker inspect --format '{{.Image}}' "$running")
candidate_tag="pbl6-demo-web:deploy-$deploy_id"
docker build --build-arg VITE_DEMO_LOGIN_ENABLED=1 --tag "$candidate_tag" \
  --file "$stage/frontend/Dockerfile" "$stage"
candidate=$(docker image inspect --format '{{.Id}}' "$candidate_tag")
docker tag "$previous" pbl6-demo-web:rollback
docker tag "$candidate" pbl6-demo-web:latest
docker image rm "$candidate_tag" >/dev/null

if "${compose[@]}" up -d --no-deps --no-build --pull never web; then
  active=$("${compose[@]}" ps -q web)
  if [[ -n $active ]] &&
    [[ $(docker inspect --format '{{.Image}}' "$active") == "$candidate" ]] &&
    curl -fsS --retry 5 --retry-all-errors --max-time 10 -o /dev/null \
      "https://demo.congnguyen.me/customer/returns?deploy=$deploy_id"; then
    echo 'DEPLOY_OK'
    exit 0
  fi
fi

echo 'Demo web verification failed. Restoring previous image.' >&2
docker tag "$previous" pbl6-demo-web:latest
"${compose[@]}" up -d --no-deps --no-build --pull never web
exit 1

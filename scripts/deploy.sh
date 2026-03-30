#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR_DEFAULT="/usr/share/nginx/html/Lighthouse"
DEPLOY_DIR="${LIGHTHOUSE_DEPLOY_DIR:-$DEPLOY_DIR_DEFAULT}"
SITE_URL="${LIGHTHOUSE_SITE_URL:-https://lighthouse.hetaogomoku.uk/Lighthouse/}"

cd "$ROOT_DIR"

echo "[deploy] repo: $ROOT_DIR"
echo "[deploy] target: $DEPLOY_DIR"
echo "[deploy] site: $SITE_URL"

echo "[deploy] git status"
git status --short

echo "[deploy] building site"
npm run build

if [ ! -d dist ]; then
  echo "[deploy] ERROR: dist/ not found after build"
  exit 1
fi

echo "[deploy] checking critical assets"
for path in \
  "dist/index.html" \
  "dist/ai-research/agent/engineering/pi-agent-framework-context/index.html" \
  "dist/card-bg/bg45.png" \
  "dist/favicon.svg"
  do
  if [ ! -e "$path" ]; then
    echo "[deploy] ERROR: missing required artifact: $path"
    exit 1
  fi
done

echo "[deploy] preview of top-level dist files"
find dist -maxdepth 2 -type f | sort | sed -n '1,40p'

echo "[deploy] syncing files"
sudo mkdir -p "$DEPLOY_DIR"
sudo rsync -av --delete dist/ "$DEPLOY_DIR"/

echo "[deploy] validating nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "[deploy] smoke test"
curl -I -s "$SITE_URL" | sed -n '1,8p'
curl -I -s "${SITE_URL}ai-research/agent/engineering/pi-agent-framework-context/" | sed -n '1,8p'
curl -I -s "${SITE_URL}card-bg/bg45.png" | sed -n '1,8p'

echo "[deploy] done"

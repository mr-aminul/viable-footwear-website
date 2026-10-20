#!/usr/bin/env bash
# Deploy Viable storefront on the VPS (run on the server as root).
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/viable}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"
git fetch origin
git reset --hard "origin/${BRANCH}"

npm ci
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
npm run build

systemctl restart viable-web.service
systemctl --no-pager --full status viable-web.service | head -20

curl -fsS -o /dev/null -w "health=%{http_code}\n" http://127.0.0.1:3000/
echo "Deploy complete ($(git rev-parse --short HEAD))."

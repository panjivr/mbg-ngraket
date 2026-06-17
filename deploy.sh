#!/usr/bin/env bash
# One-command deploy on your VM. Run from the project root:  ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env.production"
COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.prod.yml"

# Secrets never live in Git. On a fresh clone, generate them here.
if [ ! -f "$ENV_FILE" ]; then
  echo "==> No $ENV_FILE found — generating one with fresh secrets…"
  cp .env.production.example "$ENV_FILE"
  gen() { openssl rand -hex 32; }
  pw()  { openssl rand -base64 24 | tr -d '/+=' | cut -c1-28; }
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(gen)|"                       "$ENV_FILE"
  sed -i "s|^MBG_INTERNAL_SKIP_AUTH=.*|MBG_INTERNAL_SKIP_AUTH=$(gen)|" "$ENV_FILE"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(pw)|"          "$ENV_FILE"
  echo "    Created $ENV_FILE."
  echo "    >> Edit it now and set DOMAIN=yourdomain.com, then run ./deploy.sh again."
  exit 0
fi

# shellcheck disable=SC1090
set -a; . "./$ENV_FILE"; set +a

if [ "${DOMAIN:-example.com}" = "example.com" ] || [ -z "${DOMAIN:-}" ]; then
  echo "!! Set DOMAIN in $ENV_FILE to your real domain first."; exit 1
fi

echo "==> [1/5] Seeding data (first run only)…"
./scripts/seed-data.sh

echo "==> [2/5] Starting database…"
$COMPOSE up -d db
echo "    waiting for Postgres to be healthy…"
until docker inspect --format '{{.State.Health.Status}}' "$($COMPOSE ps -q db)" 2>/dev/null | grep -q healthy; do
  sleep 3; printf '.'
done; echo " ok"

echo "==> [3/5] Building images (Rust backend compiles against the live DB)…"
$COMPOSE build

echo "==> [4/5] Starting all services…"
$COMPOSE up -d

echo "==> [5/5] Status:"
$COMPOSE ps
echo
echo "Done. Open: https://$DOMAIN  (first HTTPS cert may take ~30s)"
echo "Subscription gating is OFF (MBG_DISABLE_SUBSCRIPTION=${MBG_DISABLE_SUBSCRIPTION:-1}) — attendance/distribution/tools are unlocked."
echo "Logs: $COMPOSE logs -f"

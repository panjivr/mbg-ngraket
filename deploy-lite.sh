#!/usr/bin/env bash
# Deploy versi RINGAN (Node + SQLite saja). Jalankan di server: ./deploy-lite.sh
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE=".env.production"
COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.lite.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "==> Membuat $ENV_FILE + secret..."
  cp .env.production.example "$ENV_FILE"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" "$ENV_FILE"
  echo "   >> Edit $ENV_FILE: set DOMAIN=djati.web.id, lalu jalankan lagi."
  exit 0
fi
set -a; . "./$ENV_FILE"; set +a
[ "${DOMAIN:-example.com}" = "example.com" ] && { echo "!! Set DOMAIN dulu di $ENV_FILE"; exit 1; }

./scripts/seed-data.sh
$COMPOSE up -d --build
$COMPOSE ps
echo
echo "Live (ringan): https://$DOMAIN  — absensi + distribusi siap. Langganan OFF."

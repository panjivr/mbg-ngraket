#!/usr/bin/env bash
# Populate ./data from the bundled export (idempotent; skips if already seeded).
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p data
if [ -z "$(ls -A data 2>/dev/null)" ]; then
  if [ -f data-seed/mbg_data_export_LATEST.tar.gz ]; then
    echo "  extracting SQLite + faces export into ./data …"
    tar xzf data-seed/mbg_data_export_LATEST.tar.gz -C data
  fi
  mkdir -p data/platform_db data/tenant_dbs data/faces data/uploads
  # uploads (attendance photos, etc.)
  if [ -d data-seed/uploads_live ]; then cp -rn data-seed/uploads_live/. data/uploads/ 2>/dev/null || true; fi
  # OPTIONAL: use the newest live platform DB instead of the export snapshot:
  # cp data-seed/platform_db_live.sqlite data/platform_db/database.sqlite
  echo "  data/ ready."
else
  echo "  data/ already populated — leaving it untouched."
fi

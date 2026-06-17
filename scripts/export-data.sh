#!/usr/bin/env bash
# Run on the machine that has your LIVE data to build a fresh data-seed bundle.
# Usage: ./scripts/export-data.sh /path/to/original/Bismillah\ Software\ MBG
set -euo pipefail
SRC="${1:?Pass the path to the original project folder}"
OUT="data-seed/mbg_data_export_LATEST.tar.gz"
TMP="$(mktemp -d)"
mkdir -p "$TMP/platform_db" "$TMP/tenant_dbs" "$TMP/faces"

copy_db() { # checkpoint+compact if sqlite3 exists, else raw copy
  local f="$1" dest="$2"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$f" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null 2>&1 || true
    sqlite3 "$f" "VACUUM INTO '$dest';" 2>/dev/null || cp "$f" "$dest"
  else
    cp "$f" "$dest"
  fi
}

[ -f "$SRC/frontend/database.sqlite" ] && copy_db "$SRC/frontend/database.sqlite" "$TMP/platform_db/database.sqlite"
for f in "$SRC"/frontend/tenant_dbs/*.sqlite; do [ -e "$f" ] && copy_db "$f" "$TMP/tenant_dbs/$(basename "$f")"; done
[ -d "$SRC/face_api/storage/faces" ] && cp -r "$SRC/face_api/storage/faces/." "$TMP/faces/" 2>/dev/null || true

mkdir -p data-seed
tar czf "$OUT" -C "$TMP" platform_db tenant_dbs faces
rm -rf "$TMP"
echo "Wrote $OUT ($(du -h "$OUT" | cut -f1)). Commit/upload it, then re-run deploy."

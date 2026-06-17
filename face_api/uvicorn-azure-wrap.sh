#!/bin/sh
set -e
cd /app
# Azure App Service compose often runs: uvicorn ../main:app --host 0.0.0.0 --port 5000
# That path is invalid for Uvicorn. Normalize before delegating to the real console script.
case "${1-}" in
  ../main:app)
    shift
    set -- main:app "$@"
    ;;
esac
exec /usr/local/bin/uvicorn.installed "$@"

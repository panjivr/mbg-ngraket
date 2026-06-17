#!/bin/sh
set -e
cd /app
# Azure App Service compose often overrides CMD with `uvicorn ../main:app ...`, which crashes
# (TypeError: relative import for '../main'). Ignore injected argv and always start correctly.
export PORT="${PORT:-5000}"
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"

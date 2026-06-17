#!/usr/bin/env bash
# Usage: ./push-to-github.sh https://github.com/USER/REPO.git   (create the EMPTY repo first)
set -euo pipefail
cd "$(dirname "$0")"
REPO="${1:?Pass the new GitHub repo URL}"
echo "NOTE: data-seed/ (real data) WILL be pushed; .env.production (secrets) will NOT."
[ -d .git ] || { git init -q; git branch -M main; }
git add -A
git commit -q -m "MBG deploy-ready: full stack, subscription off, data seeded" || true
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"
git push -u origin main
echo "Done. On the VM:  git clone $REPO mbg && cd mbg && ./deploy.sh"

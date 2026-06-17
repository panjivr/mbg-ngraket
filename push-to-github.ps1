# Push this folder to a NEW GitHub repo. Run on YOUR Windows machine (git + GitHub login required).
# 1) Create an EMPTY repo on github.com (no README/license).
# 2) Copy its URL, then run:
#    powershell -ExecutionPolicy Bypass -File push-to-github.ps1 "https://github.com/USER/REPO.git"
param([Parameter(Mandatory=$true)][string]$RepoUrl)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "WARNING: this repo will include REAL data (attendance/face/finance) in data-seed/." -ForegroundColor Yellow
Write-Host "Secrets (.env.production) are excluded by .gitignore and will NOT be pushed." -ForegroundColor Yellow

if (-not (Test-Path .git)) { git init | Out-Null; git branch -M main }
git add -A
git commit -m "MBG deploy-ready: full stack, subscription off, data seeded" | Out-Null
git remote remove origin 2>$null
git remote add origin $RepoUrl
git push -u origin main
Write-Host "`nDone. Deploy on the VM with:  git clone $RepoUrl mbg && cd mbg && ./deploy.sh" -ForegroundColor Green

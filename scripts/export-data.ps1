# Run on Windows (PowerShell) where your LIVE data lives, to refresh the bundle.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\export-data.ps1 "C:\path\to\Bismillah Software MBG"
param([Parameter(Mandatory=$true)][string]$Src)
$ErrorActionPreference = "Stop"
$tmp = Join-Path $env:TEMP ("mbg_export_" + [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path "$tmp\platform_db","$tmp\tenant_dbs","$tmp\faces" | Out-Null

if (Test-Path "$Src\frontend\database.sqlite") { Copy-Item "$Src\frontend\database.sqlite" "$tmp\platform_db\database.sqlite" }
Get-ChildItem "$Src\frontend\tenant_dbs\*.sqlite" -ErrorAction SilentlyContinue | ForEach-Object { Copy-Item $_.FullName "$tmp\tenant_dbs\" }
if (Test-Path "$Src\face_api\storage\faces") { Copy-Item "$Src\face_api\storage\faces\*" "$tmp\faces\" -Recurse -ErrorAction SilentlyContinue }

New-Item -ItemType Directory -Force -Path "data-seed" | Out-Null
tar czf "data-seed\mbg_data_export_LATEST.tar.gz" -C "$tmp" platform_db tenant_dbs faces
Remove-Item -Recurse -Force $tmp
Write-Host "Wrote data-seed\mbg_data_export_LATEST.tar.gz"

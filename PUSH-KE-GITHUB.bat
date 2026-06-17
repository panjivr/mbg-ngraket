@echo off
setlocal
cd /d "%~dp0"
set "REPO=https://github.com/panjivr/mbg-ngraket.git"
echo ============================================
echo  Push MBG ke %REPO%
echo  (data asli ikut; .env.production TIDAK ikut)
echo ============================================
where git >nul 2>&1
if errorlevel 1 ( echo [X] Git belum terpasang. Install: https://git-scm.com & pause & exit /b 1 )
if exist ".git" rmdir /s /q ".git"
git init
git branch -M main
git config user.email "vatorrohmanpanji@gmail.com"
git config user.name "panjivr"
git add -A
git commit -m "MBG deploy-ready: full stack, subscription off, data seeded"
git remote add origin %REPO%
echo.
echo Mendorong ke GitHub... (kalau muncul jendela login GitHub, setujui)
git push -u origin main
echo.
if errorlevel 1 (echo [X] Push gagal - cek pesan di atas.) else (echo [OK] Selesai: https://github.com/panjivr/mbg-ngraket)
pause

@echo off
setlocal
cd /d "%~dp0"
set "REPO=https://github.com/panjivr/mbg-ngraket.git"
set "WORK=%TEMP%\mbg-ngraket-push"
echo ============================================
echo  Push MBG ke %REPO%
echo  (data asli ikut; .env.production TIDAK ikut)
echo ============================================
where git >nul 2>&1
if errorlevel 1 ( echo [X] Git belum terpasang. Install: https://git-scm.com & pause & exit /b 1 )
if not exist "mbg.bundle" ( echo [X] mbg.bundle tidak ditemukan di folder ini. & pause & exit /b 1 )
if exist "%WORK%" rmdir /s /q "%WORK%"
echo Menyiapkan repo dari bundle (cepat, di folder Temp)...
git clone -b main "mbg.bundle" "%WORK%"
if errorlevel 1 ( echo [X] Gagal menyiapkan repo dari bundle. & pause & exit /b 1 )
cd /d "%WORK%"
git remote remove origin 1>nul 2>nul
git remote add origin %REPO%
echo.
echo Mendorong ke GitHub... (kalau muncul jendela login GitHub, setujui)
git push -u origin main
echo.
if errorlevel 1 (echo [X] Push gagal - cek pesan di atas.) else (echo [OK] BERHASIL: https://github.com/panjivr/mbg-ngraket)
pause

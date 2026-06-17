# Taruh di GitHub + Deploy dari GitHub

Tujuan: kode ada di GitHub, deploy di server tinggal `git clone` → `./deploy.sh`.

> ⚠️ Pilihanmu: repo **Public + data asli ikut**. `data-seed/` (absensi, foto wajah, dump Postgres) AKAN ikut ke GitHub publik dan bisa diunduh siapa pun, permanen. **Secret (`.env.production`) TIDAK ikut** (dikecualikan `.gitignore`). Kalau berubah pikiran, bikin repo Private saja saat membuatnya di langkah 1.

## 1. Buat repo kosong di GitHub
- github.com → New repository → kasih nama (mis. `mbg-ngraket`) → **Public** → **jangan** centang Add README/.gitignore/license → Create.
- Salin URL‑nya, mis. `https://github.com/USER/mbg-ngraket.git`.

## 2. Push (dari komputermu, di folder `_DEPLOY_READY`)
**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File push-to-github.ps1 "https://github.com/USER/mbg-ngraket.git"
```
**Mac/Linux/Git‑Bash:**
```bash
./push-to-github.sh https://github.com/USER/mbg-ngraket.git
```
(Perlu Git terpasang & sudah login GitHub. Script jalan `git init → add → commit → push`.)

## 3. Deploy di server dari GitHub
Di VM (lihat `DEPLOY_ORACLE_FREE.md` untuk siapkan VM + Docker + DNS):
```bash
git clone https://github.com/USER/mbg-ngraket.git mbg
cd mbg
./deploy.sh            # otomatis bikin .env.production + secret; lalu set DOMAIN, jalankan lagi
nano .env.production   # DOMAIN=domainkamu.com
./deploy.sh
```

## 4. Update berikutnya
- Di komputer: ubah kode → `git add -A && git commit -m "..." && git push`.
- Di server: `cd ~/mbg && git pull && ./deploy.sh`.

## (Opsional) Auto‑deploy tiap push
Ada `.github/workflows/deploy.yml`. Aktif kalau kamu isi 3 secret repo (Settings → Secrets → Actions): `VM_HOST`, `VM_USER` (`ubuntu`), `VM_SSH_KEY` (private key VM). Setelah itu setiap `git push` otomatis `git pull && ./deploy.sh` di server. Kalau tidak diisi, workflow diam saja.

## Catatan langganan
Repo ini sudah disetel **tanpa langganan** (`MBG_DISABLE_SUBSCRIPTION=1`): absensi, distribusi, dan semua tools langsung kepakai. Mau aktifkan lagi nanti? Set `MBG_DISABLE_SUBSCRIPTION=0` di `.env.production` lalu `./deploy.sh`.

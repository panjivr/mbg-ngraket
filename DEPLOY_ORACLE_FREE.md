# Deploy MBG — Gratis di Oracle Cloud Always Free

Hasil akhir: seluruh stack (Node + Rust + Postgres + face_api + landing) jalan di **1 VM gratis selamanya**, domain kamu pakai **HTTPS otomatis**.

Estimasi waktu: 30–45 menit (build Rust ~5–15 menit di ARM).

> Kenapa Oracle? Per Juni 2026, **Fly.io free tier sudah tidak ada**, Render/Koyeb free tidak punya disk persisten (data SQLite/Postgres hilang). Oracle **Always Free** memberi 1 VM ARM (2 OCPU / 12 GB RAM / 200 GB disk) yang gratis permanen dan cocok untuk full Docker stack.

---

## Ringkasan alur

```
Akun Oracle  →  Buat VM Ubuntu (ARM)  →  Buka port 80/443  →  Arahkan DNS domain ke IP VM
          →  Upload folder _DEPLOY_READY  →  isi .env.production  →  ./deploy.sh  →  selesai
```

---

## Langkah 1 — Buat akun Oracle Cloud (gratis)

1. Daftar di https://www.oracle.com/cloud/free/ — perlu kartu (untuk verifikasi, **tidak ditagih** di Always Free).
2. Pilih **Home Region** terdekat (mis. Singapore / Jakarta) — instance Always Free terikat ke region ini.

## Langkah 2 — Buat VM (Always Free, ARM)

1. Menu ☰ → **Compute → Instances → Create instance**.
2. **Image**: Canonical **Ubuntu 22.04**.
3. **Shape**: Change shape → **Ampere (ARM)** → `VM.Standard.A1.Flex` → set **2 OCPU / 12 GB** (kuota Always Free).
   - Jika muncul "out of capacity", coba lagi beberapa saat / region lain.
4. **SSH keys**: unduh private key (atau tempel public key kamu).
5. Pastikan **Assign a public IPv4 address** aktif → **Create**.
6. Catat **Public IP** instance.

## Langkah 3 — Buka port 80 & 443

**a) Di Oracle (VCN Security List):**
Networking → Virtual Cloud Networks → (VCN kamu) → Subnet → Security List → **Add Ingress Rules**:
- Source `0.0.0.0/0`, TCP, **port 80**
- Source `0.0.0.0/0`, TCP, **port 443**

**b) Di dalam VM (image Ubuntu Oracle memblok via iptables):**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## Langkah 4 — Arahkan domain ke VM

Di pengelola DNS domain kamu, buat **A record**:

| Type | Name | Value |
|---|---|---|
| A | `@` (atau subdomain, mis. `app`) | **Public IP VM** |
| A | `www` *(opsional, untuk landing)* | **Public IP VM** |

Tunggu propagasi (cek: `ping domainkamu.com` menunjukkan IP VM). Penting: HTTPS (Let's Encrypt) hanya berhasil setelah DNS mengarah ke VM.

## Langkah 5 — Pasang Docker di VM

SSH ke VM (`ssh -i kunci.key ubuntu@IP_VM`), lalu:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker      # atau logout-login
```

## Langkah 6 — Upload folder `_DEPLOY_READY`

Dari komputer kamu (PowerShell di folder ini):
```powershell
scp -i kunci.key -r "_DEPLOY_READY" ubuntu@IP_VM:~/mbg
```
(atau zip → upload → `unzip`). Hasilnya ada di `~/mbg` pada VM.

## Langkah 7 — Konfigurasi & deploy

Di VM:
```bash
cd ~/mbg
nano .env.production      # WAJIB ubah: DOMAIN=domainkamu.com  (ACME_EMAIL sudah terisi)
                          # Secret JWT/Postgres sudah digenerate — biarkan saja.
./deploy.sh
```
`deploy.sh` otomatis: seed data → nyalakan Postgres → build semua image (Rust ikut di‑compile di sini) → start semua → tampilkan status.

Selesai. Buka **https://domainkamu.com** (sertifikat HTTPS pertama muncul ~30 detik).

---

## Verifikasi & operasional

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps      # status
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f # log live
```

**Update kode**: `git pull` / upload ulang → `./deploy.sh`.
**Backup data**: cukup salin folder `~/mbg/data` dan volume `postgres_data`.
**Restart**: `docker compose --env-file .env.production -f docker-compose.prod.yml restart`.

---

## Pakai data PALING BARU (saat go‑live sebenarnya)

Bundel memakai snapshot export (ringkas). Untuk menarik data terbaru dari PC kamu:
```powershell
# di folder _DEPLOY_READY, di komputer yang ada data live:
powershell -ExecutionPolicy Bypass -File scripts\export-data.ps1 "C:\0. GRAPHIC DESIGN\01. EXOTIC VISUAL\Bismillah Software MBG 19 Mei 2026\Bismillah Software MBG"
```
Ini menulis ulang `data-seed/mbg_data_export_LATEST.tar.gz`. Upload ulang folder, hapus `data/` lama di VM, lalu `./deploy.sh`.

---

## Catatan & troubleshooting

- **face_api berat** (TensorFlow/DeepFace, unduh model ~ratusan MB saat pertama). Kalau RAM VM tertekan / tidak butuh absensi wajah, matikan: hapus blok `face_api` dari `docker-compose.prod.yml` (frontend tetap jalan, fitur wajah nonaktif).
- **Build backend lama** (Rust di 2 OCPU). Wajar 5–15 menit, sekali saja.
- **HTTPS gagal?** Pastikan DNS sudah mengarah ke IP VM dan port 80/443 terbuka (Langkah 3) sebelum menjalankan deploy.
- **Backend error koneksi DB saat build** → Postgres belum healthy; `deploy.sh` sudah menunggu, tapi kalau manual, nyalakan `db` dulu.
- **Alternatif** kalau tak mau urus server: lihat `DEPLOY_ALTERNATIVES.md`.

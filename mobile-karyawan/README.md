# MBG Karyawan — Android native

Aplikasi React Native + Expo SDK 55, React 19.2 dan React Native 0.83.10. Tidak memakai WebView. iPhone tetap memakai web Next.js.

## Fitur

- Absensi masuk/pulang, kamera depan, GPS, geofence, mood, sub-shift dan lokasi event.
- Shift lintas hari, termasuk pulang dari event yang sudah berakhir tetapi shift masih terbuka.
- Jadwal per tanggal dan libur; prioritas aturan: event → jadwal tanggal → sub-shift → divisi → dapur.
- Riwayat 180 catatan terakhir dan pengajuan koreksi waktu untuk catatan yang sudah ada.
- Izin, sakit, cuti, lampiran foto, status peninjauan dan pembatalan pengajuan pending.
- Slip sesuai periode/jendela penerbitan HR, rincian harian, kasbon, PDF dan konfirmasi penerimaan.
- Pengumuman, gambar, status dibaca; kotak notifikasi keputusan izin/koreksi.
- Pengingat Android lokal 15 menit sebelum jadwal yang disinkronkan.
- Profil, bio, foto dan logout yang mencabut sesi server.

Koreksi ditinjau HR lewat web di `/admin/hr/corrections`. Persetujuan menyimpan data asli, menolak pengajuan yang sudah berubah, lalu memperbarui catatan dan hitungan slip.

## Backend dan database

Gunakan origin HTTPS aplikasi `absensi-dapur` yang sudah memiliki API mobile dari branch ini. Jangan tambahkan `/api` pada URL dasar. Web dan Android memakai PostgreSQL yang sama melalui API Next.js; aplikasi tidak menyimpan kredensial database.

Backend Rust adalah jalur enterprise terpisah dengan identitas UUID dan skema berbeda; aplikasi ini tidak menghubungkannya ke akun integer `absensi-dapur`.

API baru:

| Endpoint | Kegunaan |
| --- | --- |
| POST /api/mobile/auth | action login, refresh, logout |
| GET/POST /api/me/corrections | Koreksi milik sendiri |
| GET/PATCH /api/hr/corrections | Peninjauan HR dalam SPPG sendiri |
| GET/POST /api/me/notifications | Kotak notifikasi dan tanda dibaca |

API lama dipakai kembali: `attendance/today`, `attendance/check`, `attendance/me`, `jadwal`, `izin`, `slip`, `pengumuman`, dan `me/profile`.

Mobile mengirim Bearer token, tanpa cookie. Access token berlaku 15 menit; refresh token 30 hari dengan batas absolut. Kedua token berupa nilai acak dan hanya hash SHA-256 disimpan di server. Refresh merotasi keduanya; logout mencabut sesi. Role, status aktif dan SPPG diperiksa ulang dari DB. Percobaan login web/mobile berbagi batas 10 per akun per 15 menit. Android menyimpan token di SecureStore.

Permintaan absensi mobile wajib berisi `action`, UUID v4 `request_id`, koordinat numerik, `accuracy` 0–100 m, `mocked: false`, `captured_at` baru (maksimal 2 menit; toleransi masa depan 30 detik), dan selfie bila diwajibkan dapur. Pengiriman ulang ID yang sama mengembalikan hasil tersimpan. Tidak ada antrean absensi offline.

## Menjalankan

Node.js 22 direkomendasikan. Dari folder `mobile-karyawan`:

```powershell
npm ci
Copy-Item .env.example .env
```

Isi `.env` dengan alamat backend HTTPS pengujian yang sudah disetujui:

```dotenv
EXPO_PUBLIC_API_URL=https://alamat-backend-pengujian-anda
```

Lalu:

```powershell
npm run typecheck
npx expo install --check
npm start
```

Gunakan perangkat Android / Expo Go untuk percobaan modul yang didukung, lalu uji APK native. HTTP sengaja ditolak oleh klien. Jangan arahkan uji mutasi ke produksi.

Untuk migrasi database pengujian, jalankan backend dengan DATABASE_URL pengujian dan AUTH_SECRET tersendiri. Runtime `ensureSchema()` memakai transaksi dan advisory lock untuk membuat skema lengkap serta tabel tambahan. `npm run db:init` juga menambahkan tabel mobile jika skema multi-SPPG sudah tersedia; pada DB baru initializer lama harus dilanjutkan dengan runtime aplikasi.

## Menghasilkan APK melalui EAS

Langkah ini belum dijalankan. Pembuatan project/build cloud memerlukan akun Expo, konfigurasi signing, dan persetujuan penggunaan layanan. Dari `mobile-karyawan`:

```powershell
npx eas-cli login
npx eas-cli init
npx eas-cli env:set --name EXPO_PUBLIC_API_URL --value https://alamat-backend-pengujian-anda --environment preview --visibility plaintext
npx eas-cli build --platform android --profile preview
```

Profil `preview` pada `eas.json` memakai environment preview, distribusi internal dan `android.buildType: apk`. Setelah berhasil, unduh APK dari tautan hasil EAS dan pasang di Android. Profil production menghasilkan AAB; tidak ada proses submit Play Store atau publish otomatis.

`eas init` akan menambahkan projectId milik akun Anda. Pilih signing key yang sesuai lewat EAS; jangan commit keystore, password, `credentials.json`, atau token layanan. API URL adalah konfigurasi publik. AUTH_SECRET dan DATABASE_URL hanya boleh berada di backend.

## APK lokal dengan Android SDK

Siapkan Android Studio, SDK/platform-tools, Java 17, serta perangkat/emulator. Dari `mobile-karyawan`:

```powershell
npx expo prebuild --platform android
npx expo run:android --variant release
```

Alternatif untuk menghasilkan file tanpa instalasi perangkat:

```powershell
Set-Location android
.\gradlew.bat assembleRelease
```

Hasil biasanya berada di `android/app/build/outputs/apk/release/`. Periksa signing sebelum distribusi; template lokal dapat memakai debug key. Folder native hasil prebuild dan signing artifacts diabaikan Git. Mesin sesi ini belum memiliki Android SDK sehingga APK lokal belum dihasilkan.

## Tes backend

Dari `absensi-dapur`:

```powershell
npm ci
npm run lint
npm run test:mobile
npm run build
```

Tes integrasi membutuhkan PostgreSQL pengujian baru di loopback dan database bernama persis `mbg_mobile_test`. Contoh Docker:

```powershell
docker run --rm -d --name mbg-mobile-test -p 127.0.0.1:55437:5432 -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=mbg_mobile_test postgres:17-alpine
npm run test:mobile:integration
docker stop mbg-mobile-test
```

Tes menolak database remote atau nama database lain, menjalankan server lokal port 3119, dan menghentikannya sesudah selesai. Kredensial tes dibuat acak saat berjalan. Jangan gunakan database yang berisi data penting. Workflow PR `mobile-karyawan.yml` menjalankan build web, lint, tes PostgreSQL, pemeriksaan Expo/tipe dan bundle Android tanpa deploy.

## Batas yang perlu diuji sebelum rilis

- Belum ada uji fisik kamera, GPS, izin Android, PDF/sharing dan jadwal notifikasi pada APK bertanda tangan.
- Notifikasi keputusan HR/pengumuman adalah inbox saat aplikasi dibuka; belum ada push remote/FCM. Pengingat jadwal lokal perlu disinkronkan ulang bila jadwal berubah.
- Selfie diperiksa format/base64/header/ukuran; tidak ada face recognition atau bukti liveness. Status mock GPS dari perangkat bukan pengganti attestation.
- Koreksi hanya untuk baris absensi yang sudah ada. Hari tanpa catatan sama sekali tetap perlu dibuat admin; tidak ada pembuatan absensi retrospektif otomatis.
- Modul web tambahan seperti SOP, peringkat, kilometer, finansial pribadi, gudang, pengaduan dan People Culture belum dipindahkan ke UI Android ini. Sembilan kategori utama yang diminta sudah memiliki layar native.
- Riwayat memakai batas 180 catatan dan izin/koreksi/notifikasi memakai batas daftar server; belum ada pagination arsip penuh.
- Audit dependensi masih melaporkan temuan non-critical: web 13 (8 high, 5 moderate), mobile 34 (22 high, 12 moderate). Pembaruan aman diterapkan dan temuan critical Next/jsPDF di versi awal sudah hilang. Temuan tersisa memerlukan evaluasi dependency upstream/upgrade kompatibel; jangan anggap audit bersih.

## Deployment

Branch `codex/mobile-karyawan` dinonaktifkan untuk auto-deploy Vercel melalui konfigurasi Git di root repo dan `absensi-dapur/vercel.json`. Workflow deploy lama hanya pada main. PR tetap draft dan tidak di-merge. Deployment pengujian maupun produksi menunggu persetujuan; pastikan DB preview terisolasi sebelum mengaktifkan preview.

## Rujukan resmi

- [Expo SecureStore](https://docs.expo.dev/versions/v55.0.0/sdk/securestore/)
- [Expo Camera](https://docs.expo.dev/versions/v55.0.0/sdk/camera/)
- [Expo Notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/)
- [APK dengan EAS](https://docs.expo.dev/build-reference/apk/)
- [Environment EAS](https://docs.expo.dev/eas/environment-variables/manage/)
- [Vercel Git deploymentEnabled](https://vercel.com/docs/project-configuration/git-configuration)

# MBG Karyawan — Android native

Aplikasi React Native + Expo SDK 55, React 19.2 dan React Native 0.83.10. Layar inti native; modul lengkap yang sudah ada memakai WebView dengan sesi portal utama. iPhone tetap memakai web Next.js.

## APK pengujian dan hubungan dengan repo utama

Target minimum Android 7 / API 24; Xiaomi 11T didukung secara arsitektur arm64. Versi Android sebelum 7 tidak didukung. APK universal mencakup arm64-v8a, armeabi-v7a, x86 dan x86_64. Ini tidak menjamin semua perangkat/vendor tanpa pengujian fisik.

Alamat tetap `https://djati.web.id`, tanpa input server atau konfigurasi `.env`. Data dan aturan mengikuti portal utama; perubahan kode layar native perlu APK baru. Tidak perlu fork/database kedua. Branch fitur dan draft PR tidak mengubah main. Pengaturan server versi 1.0 dihapus saat upgrade; sesi staging lama dibuang sebelum menghubungi portal utama.

Pada 10 Oktober 2026 server utama belum memiliki `/api/mobile/auth` (HTTP 404). Aplikasi memakai login web lama hanya pada origin terverifikasi `https://djati.web.id`; sesi disimpan terenkripsi di SecureStore dan dikirim sebagai cookie lewat HTTPS. Tidak menyimpan password. Sesi server lama tetap mengikuti keamanan/masa berlaku sistem web lama, tanpa rotasi refresh atau pencabutan token mobile baru. Retry absensi otomatis diblokir: muat ulang status sebelum percobaan baru.

Koreksi, inbox keputusan dan pengingat zona waktu belum aktif di server utama sampai API PR #102 dideploy. Fitur tersebut tidak berpura-pura tersedia. Login berikutnya memakai token mobile baru jika endpoint sudah tersedia. Penguatan server di branch ini belum berlaku pada produksi lama.

Workflow PR menghasilkan artifact `MBG-Karyawan-Android-APK`. APK release untuk pengujian ditandatangani debug key template agar dapat diinstal langsung tanpa Metro/Expo Go; bukan signing produksi/Play Store. Jangan membagikannya sebagai rilis publik. Signing produksi tetap harus memakai keystore privat.

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
- Beranda navy, menu layanan berkelompok, lima navigasi bawah, kalender riwayat dan pratinjau GPS.
- Peringkat, SOP, Finansial, Aspirasi, People & Culture, kartu pegawai dan portal lengkap memakai halaman web asli. Sesi web lama staff/admin diteruskan ke cookie native HttpOnly/Secure; URL luar origin diblokir. Hak admin tetap ditentukan server.
- Koreksi/inbox yang belum aktif menampilkan jalur HR dan pengumuman/status izin yang tersedia. Akun token modern tanpa cookie web mungkin perlu masuk web sekali ketika membuka modul web.

Koreksi ditinjau HR lewat web di `/admin/hr/corrections`. Persetujuan menyimpan data asli, menolak pengajuan yang sudah berubah, lalu memperbarui catatan dan hitungan slip.

## Backend dan database

Web dan Android memakai PostgreSQL yang sama melalui API Next.js di portal utama; aplikasi tidak menyimpan kredensial database. API mobile baru belum berlaku di produksi sampai backend branch ini diaktifkan.

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
```

Lalu:

```powershell
npm run typecheck
npx expo install --check
npm start
```

Gunakan development build atau APK native; cookie manager memerlukan native build sehingga Expo Go tidak cukup. Jangan membuat catatan produksi untuk uji otomatis.

Untuk migrasi database pengujian, jalankan backend dengan DATABASE_URL pengujian dan AUTH_SECRET tersendiri. Runtime `ensureSchema()` memakai transaksi dan advisory lock untuk membuat skema lengkap serta tabel tambahan. `npm run db:init` juga menambahkan tabel mobile jika skema multi-SPPG sudah tersedia; pada DB baru initializer lama harus dilanjutkan dengan runtime aplikasi.

## Menghasilkan APK melalui EAS

Langkah ini belum dijalankan. Pembuatan project/build cloud memerlukan akun Expo, konfigurasi signing, dan persetujuan penggunaan layanan. Dari `mobile-karyawan`:

```powershell
npx eas-cli login
npx eas-cli init
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

Hasil biasanya berada di `android/app/build/outputs/apk/release/`. Periksa signing sebelum distribusi; template lokal dapat memakai debug key. Folder native hasil prebuild dan signing artifacts diabaikan Git. APK dibangun di GitHub Actions; SDK lokal digunakan untuk verifikasi instalasi emulator.

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

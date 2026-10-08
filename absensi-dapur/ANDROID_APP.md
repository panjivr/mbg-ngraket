# Aplikasi Karyawan Android — Dapur MBG

Aplikasi karyawan **memakai web yang sama** (`absensi-dapur`) sebagai **PWA
(Progressive Web App)**. Jadi semua fitur karyawan (`/dapur/*`) — absensi
selfie & GPS, jadwal, slip gaji, izin, SOP, gudang, People & Culture, dll —
otomatis ada di aplikasi, **database tetap satu** dengan web utama, dan
responsif di semua ukuran layar Android. Tidak ada kode yang diduplikasi.

Ada **dua cara** memakainya sebagai aplikasi di HP karyawan:

---

## Cara 1 — Pasang langsung (PWA) · paling cepat, tanpa Play Store

Karyawan cukup buka situs di **Chrome Android**, lalu:

1. Login seperti biasa di `https://djati.web.id`.
2. Akan muncul banner **"Pasang Aplikasi Karyawan" → Pasang**
   (atau menu Chrome ⋮ → **Instal aplikasi / Tambahkan ke layar utama**).
3. Ikon **Dapur MBG** muncul di layar HP. Dibuka → tampil **layar penuh tanpa
   address bar**, membuka langsung ke beranda karyawan (`/dapur`).

Untuk **iPhone (Safari)**: tombol **Bagikan** → **Tambah ke Layar Utama**.

Sudah termasuk: ikon maskable, splash/warna tema, mode standalone, dan
service worker (halaman yang pernah dibuka tetap tampil + halaman offline).

> Ini sudah merupakan "aplikasi Android" yang sah dan bisa dibagikan hanya
> dengan link situs — cocok untuk internal 49 karyawan.

---

## Cara 2 — Build file **APK/AAB** untuk dibagikan / Play Store (TWA)

Membungkus PWA menjadi aplikasi Android asli (Trusted Web Activity) sehingga
bisa di-share sebagai file **.apk** atau diunggah ke **Google Play**.

### Opsi A — PWABuilder (paling mudah, tanpa Android SDK)

1. Buka **https://www.pwabuilder.com** → tempel `https://djati.web.id`.
2. Klik **Package For Stores → Android**.
3. Isi **Package ID**: `id.web.djati.karyawan`, App name **Karyawan Dapur MBG**.
4. Download paket. PWABuilder menghasilkan **.aab/.apk** + file
   **`assetlinks.json`** berisi *SHA-256 fingerprint* sertifikat.
5. Salin isi `assetlinks.json` dari PWABuilder ke
   `absensi-dapur/public/.well-known/assetlinks.json` (ganti placeholder),
   commit & deploy — ini yang membuat **address bar hilang** di aplikasi.
6. Install `.apk` ke HP (bagikan file) atau unggah `.aab` ke Play Console.

### Opsi B — Bubblewrap (CLI, butuh JDK + Android SDK)

File **`twa-manifest.json`** di folder ini sudah disiapkan (host `djati.web.id`,
start `/dapur`, warna & ikon). Di komputer dengan Node + JDK 17 + Android SDK:

```bash
npm i -g @bubblewrap/cli
cd absensi-dapur
bubblewrap init --manifest=./twa-manifest.json   # atau: bubblewrap init --manifest https://djati.web.id/manifest.webmanifest
bubblewrap build                                 # hasil: app-release-signed.apk & .aab
```

Saat pertama build, Bubblewrap membuat **keystore**. Ambil fingerprint-nya:

```bash
keytool -list -v -keystore android.keystore -alias android | grep SHA256
```

Tempel nilai SHA-256 itu ke `public/.well-known/assetlinks.json`
(ganti `REPLACE_WITH_YOUR_APP_SIGNING_SHA256_FINGERPRINT`), commit & deploy.

> Jika mengunggah ke Play Store dan memakai **Play App Signing**, pakai
> fingerprint **"App signing key certificate"** dari Play Console (bukan hanya
> upload key), lalu update `assetlinks.json`.

---

## Catatan teknis

- **Satu backend, satu database.** APK/PWA hanyalah "jendela" ke situs yang
  sama; tidak ada DB terpisah dan tidak ada sinkronisasi manual.
- **Update otomatis.** Begitu web di-deploy, aplikasi ikut terbarui (tidak perlu
  update APK), kecuali perubahan ikon/nama paket.
- **Izin perangkat** (kamera untuk selfie, lokasi untuk GPS) tetap berjalan
  lewat izin situs/Chrome — sama seperti di browser.
- Ganti **domain** di `twa-manifest.json`, `assetlinks.json`, dan URL ikon bila
  nanti pindah dari `djati.web.id`.

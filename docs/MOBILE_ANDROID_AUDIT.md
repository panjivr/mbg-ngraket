# Audit dan hasil pengembangan Android MBG
Tanggal: 10 Oktober 2026 (Asia/Jakarta)
Branch: `codex/mobile-karyawan`
Status: siap ditinjau sebagai draft PR; belum dirilis ke produksi.

## Dasar pengerjaan

Repo aktual `panjivr/mbg-ngraket` di-clone dari main, lalu dibuat branch baru. Rujukan percakapan ChatGPT berhasil dibaca, tetapi pesan rencana asistennya hanya berupa penanda konten tanpa isi. Tidak ada attachment yang tersedia. `/mnt/data/MBG_ANDROID_MASTER_PLAN.md` tidak tersedia. Implementasi mengikuti sembilan kategori fitur yang Anda sebutkan dan kode aktif repo.

## Audit implementasi nyata

| Area | Temuan dan tindakan |
| --- | --- |
| Aplikasi aktif | `absensi-dapur`: Next.js 15, React 19, pg/PostgreSQL, jose, bcryptjs. Dipakai sebagai API Android; iPhone tetap web. |
| Backend Rust | Axum memakai tenant/staff UUID, attendance_events dan attendance_daily berbeda dari users/attendance aplikasi aktif. Tidak disambungkan paksa atau dibuat duplikasi database aplikasi. |
| Auth web | Cookie JWT tujuh hari membawa role/SPPG yang dapat basi. Pembacaan sesi sekarang mengambil role, flag dan status aktif terbaru dari DB. |
| Auth mobile | Sebelumnya tidak ada sesi khusus native. Ditambahkan token acak tersimpan hashed di DB, SecureStore di Android, masa access 15 menit, refresh 30 hari absolut, rotasi, revoke/logout. Akun login mobile dibatasi role staff; staff dengan flag HR tetap memakai otorisasi HR dari DB. |
| Percobaan login | Batas persisten per akun, dibagi login web dan mobile sehingga jalur web tidak menjadi bypass pembatasan mobile. |
| Multi-SPPG | SPPG berasal dari akun server, bukan payload klien. Pengumuman dan peninjauan koreksi dibatasi tenant. Relasi divisi juga dibatasi SPPG akun. Pembacaan/tanda dibaca pengumuman lintas dapur ditolak. |
| Shift lintas hari | Alur lama sudah menutup shift terbuka tanpa tergantung tanggal. Tetap dipakai; mobile memilih action eksplisit dan request ID untuk mencegah toggle akibat pengiriman ulang. |
| Jadwal | Jadwal tanggal tersedia untuk tampilan tetapi belum dipakai saat absen. Sekarang dipakai sebagai aturan di atas sub-shift/divisi; libur menolak masuk baru tetapi tetap mengizinkan pulang. |
| Event | Alur lama hanya mencari event tanggal hari ini. Resolver bersama sekarang membaca event malam hari sebelumnya serta event pada shift yang masih terbuka meskipun event sudah berakhir. |
| Selfie | Kamera depan native, validasi JPEG/PNG, base64, header biner dan ukuran server. Tidak diklaim sebagai face recognition/liveness. |
| GPS | Koordinat, rentang, freshness, akurasi dan flag mocked diperiksa; radius dihitung di server. Koordinat/flag perangkat tetap bukan attestation anti-tamper. |
| Izin | Endpoint lama dipakai; tanggal kalender, jenis, panjang alasan dan lampiran diperketat. |
| Riwayat | Milik user yang diautentikasi; parameter limit non-angka diperbaiki. Maksimal 180 catatan. |
| Koreksi | Sebelumnya belum ada alur pengajuan. Ditambahkan request milik sendiri, peninjauan HR, transaksi/kunci user, snapshot asli, penolakan konflik, update waktu/status dan invalidasi cache peringkat. |
| Slip | Penghitungan/aturan penerbitan HR lama dipakai. Konfirmasi kini juga memeriksa slip_show per pegawai. Mobile menyediakan rincian, PDF/share dan konfirmasi. |
| Profil | Endpoint lama dipakai; foto dibatasi JPEG/PNG. Bio/foto dapat diubah di Android. |
| Notifikasi | Inbox tenant/pegawai dari pengumuman dan keputusan izin/koreksi, status baca; pengingat jadwal lokal Android. Belum ada push remote. |
| Errors/dependensi | Pesan error server kepada klien dibuat generik. Pembaruan aman dan upgrade jsPDF diterapkan; temuan critical awal hilang, audit belum bersih. |

Catatan skema lama: attendance bergantung pada user_id tanpa snapshot SPPG historis. Perpindahan pegawai tetap mengikuti model historis yang sudah ada; desain retensi per dapur dan pemindahan historis belum diubah. Mobile hanya membaca catatan milik akun sendiri.

## Fitur Android yang sudah dibuat

| Fitur yang diminta | Implementasi |
| --- | --- |
| Absensi | Kamera depan, GPS, masuk/pulang eksplisit, retry ID sama, geofence, event/sub-shift, mood dan status shift. |
| Jadwal | Daftar jadwal/libur dan pengingat lokal 15 menit sebelum masuk. |
| Riwayat | Catatan masuk/pulang/status dan tautan pengajuan koreksi. |
| Izin | Izin/sakit/cuti, tanggal native picker, alasan, lampiran, status dan batal pending. |
| Koreksi | Pilih catatan, ubah waktu melalui native picker, alasan, status keputusan; halaman review HR di web. |
| Slip gaji | Jendela penerbitan HR, rincian harian/komponen/kasbon, PDF, konfirmasi penerimaan. |
| Pengumuman | Isi/gambar dan penanda dibaca. |
| Notifikasi | Inbox keputusan/pengumuman, status baca dan pengingat lokal Android. |
| Profil | Bio, foto, informasi akun dan logout server. |

Layar memakai komponen React Native, tanpa WebView. Kamera/GPS hanya diminta saat dipakai; lokasi latar belakang tidak diaktifkan.

## Hasil verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| Web lint | Lulus |
| Next.js build + pengecekan tipe | Lulus |
| Validasi/kalender/zona waktu | 20 assertion lulus |
| HTTP + PostgreSQL nyata | 57 assertion lulus pada PostgreSQL 18.4 lokal sementara |
| Tipe React Native | Lulus |
| Kompatibilitas paket Expo | Lulus |
| Bundle Android Hermes | Lulus, 701 modul, sekitar 1,9 MB |
| Android prebuild/config plugin | Lulus |
| Diff whitespace dan pola secret pada perubahan | Tidak ditemukan masalah/pola secret pada scan |
| APK universal release pengujian | Lulus build CI, 83,4 MiB; minimum API 24 dan empat ABI |
| Signature APK | Verifikasi v2 lulus, satu signer debug template |
| Emulator Android 15 | Instalasi dan cold launch lulus; tanpa error AndroidRuntime/ReactNativeJS saat launch |
| Layar kecil | Login 320 × 568 dp, font 140%, scroll vertikal tersedia; tidak melebar horizontal |
| Signing produksi/perangkat fisik | Belum diuji/dibuat |

Tes integrasi menjalankan server hanya di 127.0.0.1:3119 dan PostgreSQL khusus `mbg_mobile_test` di loopback. Database produksi tidak dipakai. Pemeriksaan mencakup role/tenant, akun nonaktif, token invalid/refresh lama/logout, rotasi refresh bersamaan, reset password yang mencabut sesi mobile, pencabutan izin HR langsung, throttling web/mobile, geofence, GPS stale/mock, foto invalid, checkout shift lintas hari, retry idempotent, koreksi HR, larangan HR tenant lain, jadwal libur, event lama, notifikasi dan profil. Coverage persentase tidak diukur; ini 77 assertion, bukan 77 skenario perangkat.

Workflow GitHub PR menjalankan web lint/build, tes PostgreSQL 17, pemeriksaan tipe/kompatibilitas Expo, tes klien, bundle Android dan APK native. Ketiga job lulus pada [run 38064354806](https://github.com/panjivr/mbg-ngraket/actions/runs/38064354806), commit aplikasi `efc281a`. APK selesai dalam 9 menit 14 detik. Tidak dilakukan login atau absensi uji ke database produksi.

## Kendala dan batas sebelum rilis

1. APK pengujian memakai debug signing template. Signing produksi/Play Store belum dibuat. Build Windows mengalami gangguan cache; APK berhasil dibangun di runner Linux. EAS cloud build tidak dijalankan.
2. Kamera, GPS/geofence di lokasi nyata, picker, PDF/share, baterai/Doze, notifikasi dan pergantian akun harus diuji pada APK di perangkat fisik.
3. Notifikasi keputusan/pengumuman belum berupa push remote/FCM; hanya inbox saat aplikasi dibuka. Pengingat lokal perlu disinkronkan ulang setelah jadwal diubah.
4. Koreksi berlaku untuk baris absensi yang ada; belum membuat catatan hari yang sama sekali kosong.
5. Modul web tambahan (SOP, peringkat, kilometer, finansial pribadi, gudang, pengaduan, People Culture) belum dipindahkan ke UI Android. Cakupan native saat ini adalah sembilan kategori utama yang diminta.
6. Audit dependensi belum bersih: web 13 temuan (8 high/5 moderate), mobile 34 (22 high/12 moderate), nol critical pada keduanya. Banyak berasal dari rantai tooling/upstream; belum dilakukan upgrade major Expo/RN/Tailwind atau override transitive paksa.
7. Daftar memiliki batas server, belum pagination arsip lengkap atau mode absensi offline. Tidak ada pembuktian liveness/attestation perangkat.
8. Isi master plan sebelumnya tidak dapat diverifikasi karena rujukan tidak menyediakan teksnya.

## PR, produksi dan APK

APK pengujian berhasil diinstal/dibuka pada emulator Android 15. Metadata minimum Android 7/API 24, target API 36, ABI arm64-v8a/armeabi-v7a/x86/x86_64; signature v2 valid. SHA-256 `986dae5d3dc4cf3830ad46570caae4433c321e300c1218f1112c0f2862a31b0a`. Pengujian login dengan akun nyata, kamera/GPS/PDF di Xiaomi 11T fisik belum dilakukan.

Alamat utama terverifikasi dari Chrome: `https://djati.web.id`; endpoint mobile belum aktif (404). APK menyediakan kompatibilitas sesi web pada origin ini saja, menyimpan sesi di SecureStore tanpa password, dan memblokir retry absensi sebelum reload status. Koreksi, inbox keputusan dan pengingat zona waktu memerlukan API PR #102. Penguatan token server di branch ini belum berlaku pada produksi lama. Data mengikuti backend utama setelah deploy; perubahan layar native memerlukan APK baru. Alamat server bisa diganti sesudah logout. Tidak dibuat fork/database baru dan main tetap tidak berubah.

Branch fitur dinonaktifkan untuk auto-deploy Vercel melalui `git.deploymentEnabled` pada root dan root aplikasi. Workflow deploy lama hanya berjalan di main. Tidak dilakukan merge, deploy, perubahan credential, migrasi produksi atau EAS build.

Panduan lengkap menghasilkan APK, environment backend, database, pengujian dan signing ada di `mobile-karyawan/README.md` serta salinan deliverable `PANDUAN_APK_ANDROID.md`. Setelah backend pengujian disetujui dan URL HTTPS tersedia, langkah utama APK adalah `npx eas-cli build --platform android --profile preview`; profil ini sudah diatur untuk APK internal.

Rujukan: [Vercel git.deploymentEnabled](https://vercel.com/docs/project-configuration/git-configuration), [Expo APK](https://docs.expo.dev/build-reference/apk/), [SecureStore](https://docs.expo.dev/versions/v55.0.0/sdk/securestore/).

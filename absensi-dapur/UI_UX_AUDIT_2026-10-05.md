# Audit Teks, UI, dan UX — 5 Oktober 2026

## Cakupan dan kesimpulan

Audit kode mencakup 115 halaman dan 59 komponen pada aplikasi aktif `absensi-dapur/`: 44 halaman admin, 14 halaman staf, 54 halaman cetak, satu halaman info gizi, beranda, dan login. Folder legacy tidak diubah mengikuti AGENTS.md.

Perbaikan berikut mengatasi masalah yang terlihat dari kode. Status **belum merupakan sertifikasi responsif semua perangkat**: pengujian browser nyata dan alur terautentikasi belum selesai. Tidak tersedia DATABASE_URL atau akun staging. Instalasi browser Playwright gagal karena respons unduhan bukan arsip ZIP yang valid. Tidak ada akses database produksi, pengiriman absensi, perubahan gaji, atau penggabungan ke main.

## Temuan dan tindakan

| Temuan | Dampak | Perbaikan |
|---|---|---|
| Login memakai “Silakan Login”, “Sign In”, dan label berbeda bahasa | Instruksi tidak konsisten | Bahasa Indonesia konsisten, status proses dan tombol tampilkan sandi jelas |
| Login menyiratkan kepemilikan aplikasi oleh BGN | Identitas pengelola membingungkan | Identitas aplikasi menjadi Sistem Dapur MBG; logo BGN tetap sebagai konteks program |
| Testimoni anonim disebut pengalaman nyata; klaim paket terpopuler tanpa sumber | Kepercayaan pengguna | Diganti contoh manfaat per peran; klaim populer dihapus |
| Klaim data terenkripsi dan kapasitas tak terbatas tidak dibuktikan dalam repo | Ekspektasi menyesatkan | Teks dibatasi ke sesi terautentikasi, akses per peran, dan dukungan multi-dapur |
| Navigasi desktop beranda mulai 768px dengan terlalu banyak tautan | Risiko tabrakan di tablet | Navigasi lengkap mulai 1280px; tombol masuk tetap terlihat |
| Dropdown admin selalu mengikuti posisi tombol | Panel bisa keluar sisi layar sempit | Pada mobile panel mengikuti lebar header; tinggi dibatasi dan dapat digulir |
| Menu staf mengunci scroll saat layar berubah ke desktop | Halaman bisa terasa macet | Menu ditutup saat breakpoint desktop; scroll dipulihkan |
| Menu staf tidak menyediakan kontrol tutup terlihat/fokus terkelola | Penggunaan keyboard dan aksesibilitas | Tombol Tutup, Escape, perangkap fokus di panel, dan pemulihan fokus |
| Zoom dibatasi maximumScale: 1 | Teks sulit diperbesar | Batas zoom dihapus; viewport safe-area diaktifkan |
| Input 14px pada mobile | iOS otomatis memperbesar saat mengetik | Input 16px pada layar di bawah 768px |
| Tombol bersama terlalu pendek | Sulit disentuh | Tinggi minimum tombol dan input bersama 44px |
| Kontrol musik menimpa navigasi bawah | Tombol saling menghalangi | Kontrol diangkat di atas bilah mobile dan safe-area |
| Kartu pegawai tetap 340px | Meluber pada layar 320px | Lebar fleksibel maksimum 340px; nama panjang dapat membungkus |
| Gauge berukuran tetap 108px dalam tiga kolom | Meluber pada dasbor sempit | Lebar maksimum mengikuti kolom dan mempertahankan rasio lingkaran |
| Form penerima, SPPG, distribusi, jadwal-menu, register audit memakai 3–4 kolom mobile | Isian terlalu sempit | Satu/dua kolom pada mobile, kembali beberapa kolom pada breakpoint sm |
| Navigasi tanpa tautan lompat | Pengguna keyboard harus melewati header panjang | Tautan Lewati navigasi dan landmark main pada shell admin/staf |
| Lint belum memiliki konfigurasi dan meminta setup interaktif | Pemeriksaan tidak dapat diulang otomatis | ESLint CLI dan konfigurasi Next core-web-vitals; peringatan yang ditemukan diperbaiki |

## Validasi

- `npm run lint`: lulus tanpa kesalahan atau peringatan.
- `npm run build`: lulus, termasuk kompilasi dan pemeriksaan tipe.
- `npx tsc --noEmit`: pemeriksaan tipe tambahan setelah perubahan terakhir.
- `git diff --check`: lulus.
- `npx playwright test --list`: 111 pengujian dikenali. **Daftar pengujian bukan hasil pengujian.**
- Pengujian visual/interaksi browser: belum berjalan; instalasi Chromium gagal.
- Alur login uji, dropdown admin, menu staf, tema gelap/terang, ekspor PDF, dan tampilan cetak: perlu validasi di preview.

## Pemeriksaan sebelum merge

1. Gunakan preview dengan database staging dan akun admin/staf untuk setiap kelompok hak akses.
2. Jalankan `npx playwright install --with-deps`, lalu `npm run test:ui`. Pengujian halaman beranda/login berjalan tanpa akun. Untuk menu terautentikasi, sediakan `UI_STORAGE_STATE` dari akun staging admin yang berwenang. File tersebut berisi sesi; jangan commit.
3. `UI_BASE_URL=https://alamat-preview` memungkinkan suite memakai preview tanpa menyalakan server lokal. Tanpa variabel ini, suite menjalankan server lokal.
4. Periksa 320, 375, 390, 768, 1024, 1440, dan 1920px, portrait/landscape, pembesaran teks, keyboard virtual, serta light/dark. Suite mencakup tiga browser; perangkat fisik tetap perlu spot check.
5. Uji data panjang, data kosong, jaringan lambat, API gagal, izin kamera/GPS ditolak, dan beberapa tabel lebar. Tabel data sengaja memakai scroll horizontal lokal agar kolom tetap terbaca.
6. Periksa slip dan 54 halaman dokumen di layar serta PDF/A4. Tidak ada perubahan ke aturan cetak global; perubahan CSS baru dibatasi media screen.

## Pekerjaan lanjutan yang membutuhkan pengujian aplikasi

- Banyak form lama memakai label visual tanpa htmlFor/id, dan beberapa modal lain belum memiliki pengelolaan fokus lengkap. Perbaikan menu bersama belum menyelesaikan seluruh aksesibilitas form/modal.
- Terjemahan Inggris hanya mencakup sebagian kontrol bersama. Halaman server dan modul khusus masih bahasa Indonesia. Jangan menyebut opsi bahasa sebagai terjemahan penuh.
- Halaman finansial, game, dan informasi budaya memiliki gaya teks edukasi yang berbeda. Kutipan/atribusi tidak diubah otomatis; akurasi atribusi perlu tinjauan konten terpisah.
- Kontras seluruh pasangan warna, terutama teks putih pada permukaan yang berubah di tema terang, perlu pengukuran pada tampilan nyata. Tema terang belum dinyatakan lulus WCAG.
- Keberhasilan build tidak memvalidasi data, otorisasi nyata, penggajian, kamera, GPS, ataupun cetak. Perubahan ini siap direview, bukan dinyatakan telah diuji pada semua device.

## Inventaris halaman

Semua entri di bawah masuk inventaris kode; status pemeriksaan visual tetap belum terverifikasi.

| Rute | Sumber |
|---|---|
| `/admin/divisi` | `src/app/admin/(kelola)/divisi/page.tsx` |
| `/admin/event` | `src/app/admin/(kelola)/event/page.tsx` |
| `/admin/izin` | `src/app/admin/(kelola)/izin/page.tsx` |
| `/admin/jadwal` | `src/app/admin/(kelola)/jadwal/page.tsx` |
| `/admin/leaderboard` | `src/app/admin/(kelola)/leaderboard/page.tsx` |
| `/admin/pegawai/[id]` | `src/app/admin/(kelola)/pegawai/[id]/page.tsx` |
| `/admin/pegawai` | `src/app/admin/(kelola)/pegawai/page.tsx` |
| `/admin/pengaduan` | `src/app/admin/(kelola)/pengaduan/page.tsx` |
| `/admin/pengumuman` | `src/app/admin/(kelola)/pengumuman/page.tsx` |
| `/admin/sop` | `src/app/admin/(kelola)/sop/page.tsx` |
| `/admin/distribusi-bulanan` | `src/app/admin/(rekap)/distribusi-bulanan/page.tsx` |
| `/admin/gaji` | `src/app/admin/(rekap)/gaji/page.tsx` |
| `/admin/rekap` | `src/app/admin/(rekap)/rekap/page.tsx` |
| `/admin/ahli-gizi/arsip` | `src/app/admin/ahli-gizi/arsip/page.tsx` |
| `/admin/ahli-gizi` | `src/app/admin/ahli-gizi/page.tsx` |
| `/admin/akuntan/arsip` | `src/app/admin/akuntan/arsip/page.tsx` |
| `/admin/akuntan` | `src/app/admin/akuntan/page.tsx` |
| `/admin/aslap` | `src/app/admin/aslap/page.tsx` |
| `/admin/audit` | `src/app/admin/audit/page.tsx` |
| `/admin/audit-dapur/laporan` | `src/app/admin/audit-dapur/laporan/page.tsx` |
| `/admin/audit-dapur` | `src/app/admin/audit-dapur/page.tsx` |
| `/admin/audit-dapur/register` | `src/app/admin/audit-dapur/register/page.tsx` |
| `/admin/belanja` | `src/app/admin/belanja/page.tsx` |
| `/admin/chef` | `src/app/admin/chef/page.tsx` |
| `/admin/distribusi` | `src/app/admin/distribusi/page.tsx` |
| `/admin/distribusi/penerima` | `src/app/admin/distribusi/penerima/page.tsx` |
| `/admin/gudang` | `src/app/admin/gudang/page.tsx` |
| `/admin/hr` | `src/app/admin/hr/page.tsx` |
| `/admin/info-gizi` | `src/app/admin/info-gizi/page.tsx` |
| `/admin/jadwal-menu` | `src/app/admin/jadwal-menu/page.tsx` |
| `/admin/kepala-dapur` | `src/app/admin/kepala-dapur/page.tsx` |
| `/admin/laporan/dokumentasi` | `src/app/admin/laporan/dokumentasi/page.tsx` |
| `/admin/laporan/kilometer` | `src/app/admin/laporan/kilometer/page.tsx` |
| `/admin/laporan` | `src/app/admin/laporan/page.tsx` |
| `/admin/menu` | `src/app/admin/menu/page.tsx` |
| `/admin` | `src/app/admin/page.tsx` |
| `/admin/pengaturan` | `src/app/admin/pengaturan/page.tsx` |
| `/admin/purchasing` | `src/app/admin/purchasing/page.tsx` |
| `/admin/pusat/dashboard` | `src/app/admin/pusat/dashboard/page.tsx` |
| `/admin/pusat` | `src/app/admin/pusat/page.tsx` |
| `/admin/pusat/turnamen` | `src/app/admin/pusat/turnamen/page.tsx` |
| `/admin/sppg` | `src/app/admin/sppg/page.tsx` |
| `/admin/statistik` | `src/app/admin/statistik/page.tsx` |
| `/admin/supplier` | `src/app/admin/supplier/page.tsx` |
| `/cetak/ahli-gizi/foodwaste` | `src/app/cetak/ahli-gizi/foodwaste/page.tsx` |
| `/cetak/ahli-gizi/gambaran-ompreng` | `src/app/cetak/ahli-gizi/gambaran-ompreng/page.tsx` |
| `/cetak/ahli-gizi/generator-gizi` | `src/app/cetak/ahli-gizi/generator-gizi/page.tsx` |
| `/cetak/ahli-gizi/haccp` | `src/app/cetak/ahli-gizi/haccp/page.tsx` |
| `/cetak/ahli-gizi/higiene-penjamah` | `src/app/cetak/ahli-gizi/higiene-penjamah/page.tsx` |
| `/cetak/ahli-gizi/kebersihan-area` | `src/app/cetak/ahli-gizi/kebersihan-area/page.tsx` |
| `/cetak/ahli-gizi/kebersihan-ruang` | `src/app/cetak/ahli-gizi/kebersihan-ruang/page.tsx` |
| `/cetak/ahli-gizi/laporan-harian` | `src/app/cetak/ahli-gizi/laporan-harian/page.tsx` |
| `/cetak/ahli-gizi/laporan-mingguan` | `src/app/cetak/ahli-gizi/laporan-mingguan/page.tsx` |
| `/cetak/ahli-gizi/organoleptik` | `src/app/cetak/ahli-gizi/organoleptik/page.tsx` |
| `/cetak/ahli-gizi/penerimaan-bahan` | `src/app/cetak/ahli-gizi/penerimaan-bahan/page.tsx` |
| `/cetak/ahli-gizi/rekap-po` | `src/app/cetak/ahli-gizi/rekap-po/page.tsx` |
| `/cetak/ahli-gizi/retensi-sampel` | `src/app/cetak/ahli-gizi/retensi-sampel/page.tsx` |
| `/cetak/ahli-gizi/suhu-makanan` | `src/app/cetak/ahli-gizi/suhu-makanan/page.tsx` |
| `/cetak/ahli-gizi/suhu-pemorsian` | `src/app/cetak/ahli-gizi/suhu-pemorsian/page.tsx` |
| `/cetak/ahli-gizi/suhu-showcase` | `src/app/cetak/ahli-gizi/suhu-showcase/page.tsx` |
| `/cetak/ahli-gizi/tersimpan/[id]` | `src/app/cetak/ahli-gizi/tersimpan/[id]/page.tsx` |
| `/cetak/akuntan/buku-kas-harian` | `src/app/cetak/akuntan/buku-kas-harian/page.tsx` |
| `/cetak/akuntan/gagal-approval` | `src/app/cetak/akuntan/gagal-approval/page.tsx` |
| `/cetak/akuntan/insentif-pm` | `src/app/cetak/akuntan/insentif-pm/page.tsx` |
| `/cetak/akuntan/kekurangan-transfer` | `src/app/cetak/akuntan/kekurangan-transfer/page.tsx` |
| `/cetak/akuntan/kelebihan-insentif-pic` | `src/app/cetak/akuntan/kelebihan-insentif-pic/page.tsx` |
| `/cetak/akuntan/kelebihan-transfer` | `src/app/cetak/akuntan/kelebihan-transfer/page.tsx` |
| `/cetak/akuntan/lembur-karyawan` | `src/app/cetak/akuntan/lembur-karyawan/page.tsx` |
| `/cetak/akuntan/penggantian-operasional` | `src/app/cetak/akuntan/penggantian-operasional/page.tsx` |
| `/cetak/akuntan/rekap-pengeluaran` | `src/app/cetak/akuntan/rekap-pengeluaran/page.tsx` |
| `/cetak/akuntan/servis-peralatan` | `src/app/cetak/akuntan/servis-peralatan/page.tsx` |
| `/cetak/akuntan/tambahan-bahan-baku` | `src/app/cetak/akuntan/tambahan-bahan-baku/page.tsx` |
| `/cetak/akuntan/tersimpan/[id]` | `src/app/cetak/akuntan/tersimpan/[id]/page.tsx` |
| `/cetak/aslap/bast-sekolah` | `src/app/cetak/aslap/bast-sekolah/page.tsx` |
| `/cetak/aslap/ceklist-kesiapan-distribusi` | `src/app/cetak/aslap/ceklist-kesiapan-distribusi/page.tsx` |
| `/cetak/aslap/monitoring-sekolah` | `src/app/cetak/aslap/monitoring-sekolah/page.tsx` |
| `/cetak/aslap/rekap-penerima` | `src/app/cetak/aslap/rekap-penerima/page.tsx` |
| `/cetak/aslap/retur-sisa` | `src/app/cetak/aslap/retur-sisa/page.tsx` |
| `/cetak/audit` | `src/app/cetak/audit/page.tsx` |
| `/cetak/chef/ceklist-persiapan` | `src/app/cetak/chef/ceklist-persiapan/page.tsx` |
| `/cetak/chef/kartu-porsi` | `src/app/cetak/chef/kartu-porsi/page.tsx` |
| `/cetak/chef/rencana-produksi` | `src/app/cetak/chef/rencana-produksi/page.tsx` |
| `/cetak/chef/serah-terima-pemorsian` | `src/app/cetak/chef/serah-terima-pemorsian/page.tsx` |
| `/cetak/chef/uji-rasa` | `src/app/cetak/chef/uji-rasa/page.tsx` |
| `/cetak/distribusi` | `src/app/cetak/distribusi/page.tsx` |
| `/cetak/dokumentasi` | `src/app/cetak/dokumentasi/page.tsx` |
| `/cetak/kepala-dapur/evaluasi-mingguan` | `src/app/cetak/kepala-dapur/evaluasi-mingguan/page.tsx` |
| `/cetak/kepala-dapur/inspeksi-kebersihan` | `src/app/cetak/kepala-dapur/inspeksi-kebersihan/page.tsx` |
| `/cetak/kepala-dapur/laporan-harian-operasional` | `src/app/cetak/kepala-dapur/laporan-harian-operasional/page.tsx` |
| `/cetak/kepala-dapur/laporan-insiden` | `src/app/cetak/kepala-dapur/laporan-insiden/page.tsx` |
| `/cetak/kepala-dapur/notulen-briefing` | `src/app/cetak/kepala-dapur/notulen-briefing/page.tsx` |
| `/cetak/kepala-dapur/serah-terima-shift` | `src/app/cetak/kepala-dapur/serah-terima-shift/page.tsx` |
| `/cetak/kilometer` | `src/app/cetak/kilometer/page.tsx` |
| `/cetak/laporan` | `src/app/cetak/laporan/page.tsx` |
| `/cetak/menu-belanja` | `src/app/cetak/menu-belanja/page.tsx` |
| `/cetak/penerima` | `src/app/cetak/penerima/page.tsx` |
| `/cetak/supplier/invoice` | `src/app/cetak/supplier/invoice/page.tsx` |
| `/cetak/supplier/nota-po` | `src/app/cetak/supplier/nota-po/page.tsx` |
| `/dapur/finansial` | `src/app/dapur/finansial/page.tsx` |
| `/dapur/game` | `src/app/dapur/game/page.tsx` |
| `/dapur/gudang` | `src/app/dapur/gudang/page.tsx` |
| `/dapur/izin` | `src/app/dapur/izin/page.tsx` |
| `/dapur/jadwal` | `src/app/dapur/jadwal/page.tsx` |
| `/dapur/kilometer` | `src/app/dapur/kilometer/page.tsx` |
| `/dapur` | `src/app/dapur/page.tsx` |
| `/dapur/pengaduan` | `src/app/dapur/pengaduan/page.tsx` |
| `/dapur/people` | `src/app/dapur/people/page.tsx` |
| `/dapur/peringkat` | `src/app/dapur/peringkat/page.tsx` |
| `/dapur/profil` | `src/app/dapur/profil/page.tsx` |
| `/dapur/riwayat` | `src/app/dapur/riwayat/page.tsx` |
| `/dapur/slip` | `src/app/dapur/slip/page.tsx` |
| `/dapur/sop` | `src/app/dapur/sop/page.tsx` |
| `/info-gizi/[kode]` | `src/app/info-gizi/[kode]/page.tsx` |
| `/login` | `src/app/login/page.tsx` |
| `/` | `src/app/page.tsx` |

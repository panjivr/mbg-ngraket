# Rencana Promosi Sistem Dapur MBG — djati.web.id

Disusun 5 Oktober 2026. Kalender dimulai setelah halaman baru tayang di produksi.

## Arah utama

**Pesan inti:** Aplikasi SPPG untuk absensi, rekap, dan operasional dapur MBG.

Mulai dari staf/relawan, admin, dan kepala SPPG. Staf membutuhkan alur yang mudah; admin membutuhkan catatan yang mudah diperiksa; kepala membutuhkan ringkasan untuk tindak lanjut. Staf bisa menjadi pengusul internal, sedangkan demo penerapan sebaiknya melibatkan admin dan pihak yang berwenang mengambil keputusan. Mitra/yayasan menjadi tahap berikutnya setelah ada pengalaman penerapan yang dapat dibuktikan.

**Ajakan utama:** Minta demo melalui WhatsApp. Gunakan satu masalah per konten: absensi shift malam, rekap gaji, atau distribusi porsi. Bawa pengunjung ke halaman yang menjawab masalah tersebut.

## Yang telah disiapkan dalam kode

- Sembilan halaman publik dengan judul, deskripsi, canonical `https://djati.web.id`, dan navigasi terkait.
- Halaman solusi absensi, rekap gaji, dan distribusi; dua panduan praktis; halaman fitur dan tentang.
- Sitemap publik, robots.txt, metadata berbagi sosial, gambar OpenGraph, serta schema WebSite/WebPage/BreadcrumbList.
- Halaman publik produksi boleh diindeks; preview, login, dan halaman operasional dibatasi dari indeks. Autentikasi tetap menjadi perlindungan akses data.
- Konten menyatakan aplikasi independen, menjelaskan batasan perangkat dan fitur sesuai paket, tanpa testimoni atau angka hasil yang dibuat-buat.
- Tombol demo menyertakan halaman asal dan UTM yang telah dibersihkan. UTM disimpan selama sesi browser bila penyimpanan tersedia.
- Event `request_demo` siap diteruskan bila analytics dikonfigurasi. **Analytics belum terpasang; klik bukan percakapan atau pelanggan.**

Perubahan ini belum otomatis berarti domain produksi berubah. Tinjau preview dan merge PR terlebih dahulu; branch main memicu deployment Vercel sesuai konfigurasi repo.

## Peta pencarian yang dituju

Frasa berikut adalah hipotesis berdasarkan masalah pengguna, bukan hasil riset volume atau prediksi peringkat.

| Kebutuhan / frasa | Halaman tujuan | Jawaban utama |
|---|---|---|
| aplikasi SPPG; aplikasi dapur MBG | `/` | Siapa pengguna, masalah utama, dan cara meminta demo |
| fitur aplikasi SPPG | `/fitur` | Modul, paket, serta batas hak akses |
| aplikasi absensi SPPG; absensi relawan MBG | `/solusi/absensi-sppg` | Foto, lokasi, shift, dan pemeriksaan admin |
| rekap gaji relawan MBG; slip gaji SPPG | `/solusi/rekap-gaji` | Komponen, pemeriksaan, dan penerbitan slip |
| aplikasi distribusi MBG; rekap porsi SPPG | `/solusi/distribusi` | Penerima, porsi, waktu, dan dokumentasi |
| cara memilih aplikasi SPPG | `/panduan/memilih-aplikasi-sppg` | Daftar pertanyaan dan skenario demo |
| cara rekap absensi shift malam | `/panduan/rekap-absensi-shift-malam` | Sesi lintas tanggal dan contoh pemeriksaan |
| Sistem Dapur MBG; djati.web.id | `/tentang` | Identitas produk dan kontak demo |

Tambahkan artikel berikutnya dari pertanyaan nyata saat demo. Jangan membuat banyak halaman kota dengan isi sama. Bila ada pengalaman dapur tertentu, minta izin dan sajikan bukti yang benar-benar tersedia.

## SEO dan GEO: pelaksanaan

SEO membantu mesin pencari memahami dan menemukan halaman. GEO di sini berarti meningkatkan peluang konten dipahami dan dirujuk mesin jawaban AI, dengan jawaban langsung, struktur jelas, identitas konsisten, serta bukti yang dapat diperiksa. Google menyatakan praktik SEO dasar tetap berlaku untuk fitur pencarian AI; tidak ada markup atau berkas AI khusus yang wajib. Kemunculan, kutipan, dan peringkat tetap tidak dijamin.

1. Setelah tayang, periksa beranda, tiga solusi, dan dua panduan di ponsel serta desktop; uji demo WhatsApp menggunakan akun sendiri.
2. Tambahkan properti `djati.web.id` di Google Search Console. Properti Domain memerlukan verifikasi DNS. Alternatif URL-prefix `https://djati.web.id/` dapat memakai metode HTML tag; kode mendukung `GOOGLE_SITE_VERIFICATION` untuk token tersebut.
3. Kirim `https://djati.web.id/sitemap.xml` dan inspeksi halaman prioritas. Pastikan tidak ada `noindex` pada halaman publik produksi.
4. Verifikasi situs di Bing Webmaster Tools dan kirim sitemap. Impor dari Search Console tersedia bila sesuai akses pemilik.
5. Konfigurasi analytics untuk halaman publik dan event `request_demo`, lalu uji debug. Hindari mengirim nama, nomor telepon, isi formulir, atau data absensi ke analytics.
6. Periksa akses OAI-SearchBot. Kode robots mengizinkan halaman publik; firewall/hosting juga perlu mengizinkan crawler yang sah. Pengaturan bot pencarian terpisah dari GPTBot untuk pelatihan.
7. Tambahkan bukti produk: rekaman layar dengan data contoh, dokumentasi penerapan, profil pengelola yang benar, dan studi kasus yang disetujui. Jangan mengklaim dukungan resmi BGN.
8. Setiap pekan lihat query yang benar-benar muncul, halaman yang diindeks, dan pertanyaan demo. Perbaiki jawaban yang kurang jelas sebelum menambah banyak artikel.

## Kalender 30 hari

| Hari | Pekerjaan | Hasil |
|---|---|---|
| 1 | Tinjau preview dan tayangkan halaman baru | Domain memakai konten baru |
| 2 | Verifikasi Search Console; kirim sitemap | Pemantauan Google tersedia |
| 3 | Verifikasi Bing; kirim sitemap | Pemantauan Bing tersedia |
| 4 | Konfigurasi dan uji event demo | Pengukuran klik berfungsi |
| 5 | Siapkan akun dan data demo | Tidak menampilkan data staf nyata |
| 6 | Rekam demo absensi 45 detik | Video pendek pertama |
| 7 | Publikasikan pengenalan produk | Tautan ber-UTM menuju beranda |
| 8 | Publikasikan tips shift malam | Tautan panduan shift malam |
| 9 | Bagikan tips di komunitas yang mengizinkan | Percakapan berbasis kebutuhan |
| 10 | Tanyakan kendala ke kontak SPPG yang relevan | Daftar masalah dan istilah pengguna |
| 11 | Undang kontak yang tertarik ke demo | Jadwal demo; tanpa pengiriman massal |
| 12 | Jalankan demo absensi dan rekap | Catatan pertanyaan serta tindak lanjut |
| 13 | Publikasikan video rekap gaji | Tautan solusi rekap gaji |
| 14 | Evaluasi minggu kedua | Sumber klik, chat, dan demo nyata |
| 15 | Publikasikan checklist pemilihan aplikasi | Panduan untuk admin/kepala |
| 16 | Demo bersama admin dan kepala | Kebutuhan penerapan yang jelas |
| 17 | Perbaiki FAQ dari pertanyaan demo | Jawaban yang makin relevan |
| 18 | Rekam demo distribusi porsi | Video pendek kedua |
| 19 | Publikasikan konten distribusi | Tautan solusi distribusi |
| 20 | Siapkan contoh laporan dengan data fiktif | Bukti alur produk |
| 21 | Evaluasi indexing dan tautan rusak | Daftar perbaikan teknis |
| 22 | Publikasikan konten akses sesuai peran | Penjelasan staf/admin/kepala |
| 23 | Follow-up peserta yang meminta tindak lanjut | Langkah penerapan berikutnya |
| 24 | Tulis jawaban untuk satu pertanyaan berulang | Artikel baru berdasarkan kebutuhan |
| 25 | Demo kasus pertanyaan tersebut | Validasi pemahaman dan alur |
| 26 | Minta izin studi kasus jika ada pengguna nyata | Bukti yang disetujui; jangan dipaksakan |
| 27 | Publikasikan rangkuman manfaat dan batasan | Ekspektasi penerapan yang jelas |
| 28 | Evaluasi halaman dan sumber terbaik | Prioritas bulan berikutnya |
| 29 | Susun materi mitra/yayasan dari bukti nyata | Draft tahap kedua |
| 30 | Rekap klik, chat, demo, dan penerapan | Keputusan fokus bulan kedua |

Publikasi dan pengiriman pesan pada kalender ini adalah pekerjaan lanjutan oleh pemilik akun; dokumen ini menyediakan bahan, belum memposting atau mengirimkannya.

## Materi siap pakai

### Post 1 — Pengenalan

Masih menggabungkan catatan hadir, rekap, dan laporan dapur dari banyak tempat?

Sistem Dapur MBG membantu staf, admin, dan kepala SPPG mengelola absensi, rekap gaji, distribusi, serta laporan sesuai paket dan hak akses.

Mulai dari satu pekerjaan yang paling sering diulang. Lihat fitur dan minta demo untuk alur dapur Anda:
https://djati.web.id/?utm_source=instagram&utm_medium=organic_social&utm_campaign=pengenalan_sppg

#SPPG #DapurMBG #AdministrasiSPPG

### Post 2 — Shift malam

Masuk Senin malam, pulang Selasa pagi. Rekapnya masuk ke sesi yang mana?

Untuk shift lintas tanggal, periksa waktu masuk, waktu pulang, jadwal divisi, dan aturan istirahat bersama. Panduan ini membantu admin memeriksa catatan sebelum menyusun rekap:
https://djati.web.id/panduan/rekap-absensi-shift-malam?utm_source=facebook&utm_medium=organic_social&utm_campaign=shift_malam

Ingin melihat alurnya di aplikasi? Tombol demo tersedia pada halaman panduan.

### Post 3 — Rekap gaji

Rekap gaji lebih mudah diperiksa ketika kehadiran dan komponen perhitungannya jelas.

Sistem Dapur MBG menyediakan modul HR/gaji sesuai paket dan izin pengguna. Admin dapat meninjau komponen, memeriksa rekap, lalu menerbitkan slip sesuai kebijakan pengelola.

Pelajari alurnya:
https://djati.web.id/solusi/rekap-gaji?utm_source=instagram&utm_medium=organic_social&utm_campaign=rekap_gaji

### Post 4 — Distribusi

Data penerima, jumlah porsi, waktu pengiriman, dan dokumentasi perlu dibaca bersama.

Lihat bagaimana modul distribusi membantu tim SPPG menata catatan tersebut dan menyiapkan rekap operasional:
https://djati.web.id/solusi/distribusi?utm_source=facebook&utm_medium=organic_social&utm_campaign=distribusi

Dokumentasi aplikasi tetap mengikuti pemeriksaan dan ketentuan pengelola.

### Post 5 — Kepala dan admin

Sebelum memilih aplikasi SPPG, coba satu alur dari awal sampai akhir: staf mencatat, admin memeriksa, kepala melihat ringkasan.

Gunakan checklist demo ini untuk menilai kebutuhan tim, akses pengguna, perangkat, dan cara membaca rekap:
https://djati.web.id/panduan/memilih-aplikasi-sppg?utm_source=linkedin&utm_medium=organic_social&utm_campaign=checklist_demo

### Post 6 — Ajakan demo

Ingin melihat aplikasi SPPG berdasarkan pekerjaan harian tim Anda?

Ceritakan kebutuhan utama: absensi shift malam, rekap gaji, atau distribusi porsi. Demo menggunakan data contoh agar alurnya bisa diperiksa bersama admin dan kepala SPPG.

https://djati.web.id/?utm_source=whatsapp&utm_medium=community&utm_campaign=demo_sppg

### Pesan WhatsApp pembuka

Halo Bapak/Ibu, saya ingin mengenalkan Sistem Dapur MBG, aplikasi web independen untuk absensi, rekap, dan operasional SPPG. Apakah tim Bapak/Ibu saat ini mempunyai kendala dalam rekap absensi, gaji, atau distribusi? Jika relevan, saya bisa menunjukkan alur demo menggunakan data contoh. Gambaran fiturnya ada di https://djati.web.id/fitur?utm_source=whatsapp&utm_medium=direct&utm_campaign=perkenalan_sppg

Gunakan hanya untuk kontak yang relevan dan bersedia dihubungi. Sesuaikan sapaan serta hubungan yang nyata.

### Follow-up setelah diminta

Halo Bapak/Ibu, menindaklanjuti pembahasan sebelumnya, kebutuhan yang saya catat adalah [masalah yang disebutkan]. Untuk demo, kita dapat memeriksa [alur yang relevan] bersama admin/kepala SPPG. Apakah [opsi waktu] sesuai? Bila belum diperlukan, saya tidak akan menjadwalkan tindak lanjut tambahan.

Ganti semua teks dalam kurung sebelum mengirim.

### Naskah video vertikal 45 detik

- 0–5 detik: “Shift malam membuat rekap hadir membingungkan?” Tampilkan judul, tanpa data nyata.
- 5–15 detik: Tampilkan pencatatan masuk dan pulang dengan akun demo. “Staf mencatat kehadiran melalui browser.”
- 15–28 detik: Tampilkan riwayat dan rekap admin. “Admin memeriksa sesi, jadwal, dan catatan sebelum rekap dipakai.”
- 28–38 detik: Tampilkan ringkasan operasional. “Mulai dari absensi, lalu pilih modul sesuai kebutuhan dapur.”
- 38–45 detik: Tampilkan djati.web.id. “Minta demo bersama admin dan kepala SPPG.”

Gunakan subtitle besar, satu gagasan per layar, dan tampilan asli aplikasi. Hanya tampilkan fungsi yang berhasil didemokan; jangan menampilkan wajah, GPS, nama, atau gaji pengguna nyata.

## Ukuran keberhasilan

Pisahkan tahapan berikut. Tidak ada angka baseline, target penjualan, atau volume pencarian yang direkayasa.

| Ukuran | Sumber | Makna |
|---|---|---|
| Halaman diindeks, impressions, klik, query | Search Console/Bing setelah verifikasi | Keterlihatan pencarian |
| Klik demo per halaman/sumber | Analytics setelah dikonfigurasi | Minat membuka WhatsApp |
| Percakapan masuk yang relevan | Catatan manual pemilik | Orang benar-benar menghubungi |
| Demo terjadwal dan terlaksana | Catatan demo | Minat yang berlanjut |
| Penerapan/pelanggan nyata | Catatan operasional pemilik | Hasil bisnis |
| Kebutuhan yang berulang | Catatan pertanyaan demo | Arah konten dan pengembangan |

Kolom catatan minimal: tanggal, sumber/UTM, peran, kendala, status chat, tanggal demo, hasil, dan langkah berikutnya. Simpan kontak hanya jika diperlukan dan dengan akses terbatas.

Pada dua minggu pertama, bangun baseline. Bulan kedua fokus pada sumber yang menghasilkan demo relevan. Tunda iklan berbayar sampai alur demo dan pengukuran berfungsi; bila memakai iklan nanti, sepakati anggaran dan ukur hasil nyata terlebih dahulu.

## Tahap berikutnya: mitra/yayasan

Setelah ada pengalaman penerapan, siapkan demo pelaporan lintas dapur, kewenangan akses, rencana onboarding, dan contoh laporan yang sah dibagikan. Bedakan fitur yang telah berfungsi dengan kebutuhan baru. Minta persetujuan sebelum mempublikasikan nama, logo, kutipan, atau hasil pengguna.

## Referensi resmi

- Google — SEO untuk fitur AI: https://developers.google.com/search/docs/appearance/ai-features
- Google — verifikasi properti: https://support.google.com/webmasters/answer/9008080
- Google — jenis properti: https://support.google.com/webmasters/answer/34592
- Google — sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- OpenAI — bot pencarian dan pelatihan: https://developers.openai.com/api/docs/bots
- Bing — sitemap: https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed

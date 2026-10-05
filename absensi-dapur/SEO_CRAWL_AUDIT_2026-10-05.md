# Audit crawl dan pembaruan visual — 5 Oktober 2026

Domain produksi: https://djati.web.id. Aplikasi aktif: absensi-dapur.

## Hasil

- Konten publik diberikan dalam HTML hasil render server, tanpa harus login.
- Sembilan halaman publik mempunyai canonical domain produksi, judul unik, deskripsi, satu H1, JSON-LD, dan tautan internal.
- Sitemap hanya berisi sembilan URL publik; robot produksi mengizinkan crawl halaman tersebut. Preview dan area operasional tetap dibatasi dari indeks.
- Logo BGN menggunakan aset yang sudah ada, disertai keterangan identitas produk independen pada footer/tentang.
- Beranda menampilkan ilustrasi alur dengan angka yang secara eksplisit merupakan data contoh, bukan statistik operasional pengguna.
- Halaman fitur menampilkan ikon, nomor modul, daftar poin, navigasi ke modul, dan CTA demo.
- CSS baru hanya berlaku di area marketing; halaman operasional tidak diubah temanya. Pemutar musik tidak dimuat pada halaman publik marketing.
- Pemeriksaan browser Chromium untuk 9 halaman × 7 lebar (320, 375, 430, 768, 1024, 1280, 1920) lolos: tanpa overflow horizontal, logo dimuat, satu H1, dan target tombol demo minimal 44 px. Navigasi aktif, tautan modul, serta UTM lintas halaman juga lolos; tidak ada pageerror.
- `npm run lint`, `npm run build`, `node scripts/check-seo.mjs`, dan `scripts/check-marketing-ui.mjs` lolos. Uji Chromium dapat memakai executable yang dipilih melalui PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. Firefox, WebKit, dan perangkat fisik belum diuji pada perubahan ini.

## Batas status pencarian

Pencarian publik pada saat audit tidak mengembalikan hasil untuk domain. Ini bukan bukti pasti bahwa semua URL belum diindeks: hasil pencarian memiliki keterbatasan. Status resmi harus diperiksa melalui URL Inspection di Google Search Console.

Pemilik menyatakan domain belum terverifikasi/tidak mengetahui status verifikasinya. Tidak ada token verifikasi maupun akses akun Search Console, Bing, atau Ahrefs yang diberikan. Oleh sebab itu belum ada pengajuan sitemap melalui dashboard pemilik, permintaan indeks, audit Ahrefs terautentikasi, data volume keyword, atau skor kesehatan Ahrefs. Kesiapan crawl berbeda dari kepastian indeks/peringkat.

## Langkah pemilik untuk verifikasi

1. Buka https://search.google.com/search-console dan tambahkan properti URL-prefix `https://djati.web.id/`.
2. Pilih metode HTML tag. Ambil hanya nilai `content` dari tag `google-site-verification`; jangan mengirim password atau kode login.
3. Pasang token tersebut pada environment Vercel `GOOGLE_SITE_VERIFICATION`, deploy kembali, lalu klik Verify pada Search Console. Properti Domain dengan DNS TXT juga merupakan alternatif.
4. Kirim `https://djati.web.id/sitemap.xml`. Gunakan URL Inspection pada beranda, tiga solusi, dan dua panduan; pilih Request indexing bila tersedia.
5. Ahrefs Free mendukung verifikasi Search Console, DNS, HTML file, atau HTML tag. Untuk metode HTML tag, kode mendukung `AHREFS_SITE_VERIFICATION` dengan nama meta `ahrefs-site-verification`; pastikan cocok dengan tag yang diberikan Ahrefs. Bing HTML tag didukung melalui `BING_SITE_VERIFICATION` / `msvalidate.01`.
6. Jalankan audit setelah domain terverifikasi; gunakan temuan asli untuk prioritas berikutnya. Pengajuan crawl/sitemap tidak menjamin kapan URL muncul atau peringkatnya.

## Sumber resmi

- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- https://support.google.com/webmasters/answer/9008080
- https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site
- https://help.ahrefs.com/en/articles/3275938-verifying-ownership-of-your-project-or-website
- https://ahrefs.com/free

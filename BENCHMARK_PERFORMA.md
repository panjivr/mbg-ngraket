# Benchmark Performa (Sebelum vs Sesudah)

Dokumen ini mendefinisikan metode benchmark agar hasil bisa direplikasi.

## 1) Metrik Target

- Bundle JS (gzipped): < 200 KB
- Load halaman (3G Fast): < 2 detik
- Lighthouse (Performance, Accessibility, Best Practices, SEO): ≥ 90

## 2) Baseline (Legacy)

Yang diukur:
- Halaman legacy: `/legacy/app.html` (atau landing legacy `/legacy/index.html`)
- API response time untuk endpoint inti (login, list menu, forecast)

Langkah:
1. Jalankan server
2. Buka `/legacy/app.html`
3. Jalankan Lighthouse di Chrome DevTools (Mobile, throttling 3G)
4. Simpan report sebagai `baseline.json` / `baseline.html`

## 3) Sesudah Migrasi (SSR HTML-first)

Yang diukur:
- Halaman baru: `/`, `/login`, `/app`
Langkah sama seperti baseline, simpan report sebagai `after.json` / `after.html`.

## 4) Validasi Ukuran Asset

File utama:
- `web/assets/app.css`
- `web/assets/app.js`

Ukuran gzipped bisa diukur dengan tooling OS atau CI pipeline.

## 5) Catatan

Environment ini belum memiliki Node.js dan `lighthouse-cli`, sehingga benchmark Lighthouse sebaiknya dilakukan via Chrome DevTools atau machine CI yang memiliki Node.


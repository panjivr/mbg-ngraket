# Simulator Anggaran Operasional SPPG

## Integrasi dan audit

Target aktif repo adalah `absensi-dapur` (Next.js 15 App Router, React 19, TypeScript strict, Tailwind; npm lockfile). Landing publik memakai MarketingShell dengan panel putih, header navy, aksen emas/teal. Fitur diimplementasikan native React; HTML dan spreadsheet dalam paket hanya referensi. Folder landing statis/legacy tidak diubah sesuai AGENTS.md. Tidak ada dependency produksi baru.

Rute: `/simulator-operasional`. Navigasi publik dan CTA landing sudah terpasang; metadata canonical/robots mengikuti `publicMetadata`, dan URL ikut sitemap. Matcher middleware tidak mencakup rute ini; proteksi `/admin`, `/dapur`, `/cetak` tidak diubah.

Alur: landing → simulator → input browser → fungsi perhitungan murni → KPI/grafik → localStorage atau file ekspor. Tidak ada API, database, payroll, atau data pegawai yang digunakan oleh simulator. Komponen tema bersama diperbaiki agar storage yang ditolak tidak menjatuhkan halaman.

## Implementasi

- `src/app/simulator-operasional/page.tsx`, `simulator.css`: route, metadata, gaya terisolasi, responsive dan print A4.
- `src/components/simulator/Simulator.tsx`: BudgetParameters, BudgetSummary, BudgetWarnings, ExpenseTable, ExpenseEditor, HonorScenario, ScenarioComparison, ExportActions.
- `src/lib/simulator/model.ts`: tipe, preset, fungsi kalkulasi, validasi runtime impor/storage, CSV aman.
- `src/lib/simulator/storage.ts`: namespace versi, simpan/muat lokal, download.
- `src/app/page.tsx`, `src/components/marketing/MarketingNav.tsx`, `src/lib/marketing.ts`: CTA, menu, sitemap.
- `src/components/ThemeLangProvider.tsx`: storage failure fallback.
- `tests/simulator-model.spec.ts`, `tests/simulator.spec.ts`: perhitungan dan UI.

## P0 dan P1

Pagu, target cadangan nominal/persen, pembulatan per pos, indikator tarif nonstandar, periode, dan catatan dapat diubah. KPI mencakup anggaran/realisasi/proyeksi terpisah, saldo, serapan, honor/non-honor, per hari dan per PM per hari. Semua realisasi/proyeksi awal nol, diisi manual secara lokal; bukan integrasi buku kas.

Preset berisi tepat 10 pos Rp29.050.000. Catatan “Ard” tetap perlu konfirmasi. Selisih subtotal tertulis Rp18.100.000 ditampilkan sebagai peringatan rekonsiliasi, tidak dijadikan pos. Warning rekonsiliasi adalah konteks sumber awal, tidak dihitung ulang dari skenario custom. Honor Rp30.850.000 opsional. Jika disinkron sekali: total Rp59.900.000 dan saldo Rp18.100.000 terhadap pagu Rp78.000.000.

Pos mendukung kategori/prioritas, satuan, qty, tarif, frekuensi, pengali hari, aktif, sumber/kelayakan, catatan dan rujukan lokal. Tambah/edit/hapus/duplikasi, filter, pencarian, sortir, bulk aktif/nonaktif, subtotal/grafik kategori dan log 30 perubahan tersedia.

Honor mendukung tarif seragam atau penugasan orang-hari per role anonim. Tabel membandingkan 49/40/36/33 aktif dan pengurangan 0/5k/10k/15k; grafik memakai pengurangan yang dipilih. Rata-rata penghasilan mengasumsikan rotasi merata, bukan jadwal penugasan riil. Tarif seragam awal Rp100.000 hanya asumsi simulasi editable, bukan angka payroll. Hari honor terpisah dari hari pelayanan agar hari kerja dapat berbeda. Sinkronisasi selalu eksplisit, mengganti seluruh pos kategori Honor relawan dengan satu sumber; realisasi/proyeksi baris pengganti nol. Setelah sinkronisasi, perubahan kalkulator tetap terpisah sampai disinkron ulang.

Autosave aktif setelah perubahan, namespace `djati:simulator-operasional:v1`. Error akses/kuota diberitahukan. Hapus data lokal menghentikan autosave sampai perubahan berikutnya. Impor JSON satu skenario: versi 1, maksimum 1 MB, 500 pos, 50 role, tipe/angka finite/nonnegatif/rentang tervalidasi, ID unik, total per pos maksimum Rp1 triliun. Konfirmasi sebelum menimpa. Teks tidak dirender sebagai HTML. CSV mengutip sel dan menetralkan formula berawalan =,+,-,@ termasuk whitespace.

Cetak memakai tabel khusus seluruh pos, termasuk yang tersembunyi oleh filter, dan mencantumkan rencana/realisasi/proyeksi serta catatan. Pilih A4 landscape dan simpan PDF melalui browser. Pengguna tetap perlu meninjau pagination bila memakai ratusan pos atau catatan panjang.

## P2 dan batasan

Snapshot pembanding maksimum 5 tersedia selama halaman terbuka; skenario aktif saja di-autosave. Ekspor JSON tiap snapshot untuk arsip. Grafik kategori dan honor tersedia. Grafik multi-skenario lanjutan, ekspor native XLSX dan impor spreadsheet belum ditambahkan; gunakan CSV di Excel dan JSON untuk round-trip tanpa kehilangan skema. Tidak ada backend atau sinkronisasi lintas perangkat.

Storage tidak tersedia tidak mencegah kalkulasi; ekspor JSON diperlukan untuk arsip. Data finansial yang dimasukkan sendiri tidak terenkripsi di localStorage/ekspor. Gunakan data anonim. Tidak ada upload bukti atau analytics nilai anggaran. Juknis, klasifikasi biaya, BBM subsidi dan perubahan honor harus diverifikasi oleh pengelola yang berwenang. Simulator tidak memberikan persetujuan pembiayaan.

## Validasi dan preview

Jalankan dari folder `absensi-dapur`:

```sh
npm ci
npm run lint
npx tsc --noEmit
UI_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/simulator-model.spec.ts --project=chromium
npx playwright install chromium
npx playwright test tests/simulator.spec.ts --project=chromium --workers=1
npm run build
npm start
```

`UI_BASE_URL` pada tes model mencegah start web server yang tidak dibutuhkan. Tes UI memakai webServer pada config Playwright. Jangan jalankan build dan server dev bersamaan karena keduanya memakai `.next`. Screenshot 390px/1440px dan contoh PDF dihasilkan di `artifacts/` (tidak masuk git). Tes memeriksa akses tanpa login, admin tetap redirect login, tidak ada request `/api/`, tanpa pageerror, edit/honor/autosave/impor/ekspor, kuota storage dan print. Browser yang diverifikasi otomatis: Chromium; WebKit/Firefox dan akun internal tidak diuji.

## Deployment

Ikuti AGENTS.md: branch `Codex/simulator-operasional` → PR ke `main` → review preview → merge untuk auto-deploy produksi Vercel. Root Directory harus tetap `absensi-dapur`. Tidak ada migrasi database atau environment variable fitur baru. Menu sudah terintegrasi, tidak membutuhkan langkah manual tambahan. Build lokal bukan bukti deployment; status preview/produksi perlu dicek pada Vercel setelah push/merge.

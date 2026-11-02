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

Pagu, target cadangan nominal/persen, pembulatan per pos, indikator tarif nonstandar, periode, dan catatan dapat diubah. KPI mencakup anggaran/realisasi/proyeksi terpisah, saldo, serapan, honor/non-honor, per hari dan per PM per hari. Realisasi/proyeksi yang belum diisi ditandai belum lengkap, bukan saldo nol yang sudah diverifikasi; data diisi manual secara lokal, bukan integrasi buku kas.

Preset berisi tepat 10 pos Rp29.050.000. Catatan “Ard” tetap perlu konfirmasi. Selisih subtotal tertulis Rp18.100.000 ditampilkan sebagai peringatan rekonsiliasi, tidak dijadikan pos. Warning rekonsiliasi adalah konteks sumber awal, tidak dihitung ulang dari skenario custom. Honor Rp30.850.000 opsional. Jika disinkron sekali: total Rp59.900.000 dan saldo Rp18.100.000 terhadap pagu Rp78.000.000.

Pos mendukung kategori/prioritas, satuan, jumlah, tarif, frekuensi, aktif, sumber/kelayakan, catatan dan rujukan lokal. Jenis biaya adalah per hari pelayanan, per porsi (penerima × hari), per bulan kalender, dan sekali per periode. Biaya bulanan memakai tanggal awal dan akhir inklusif: nilai bulanan × jumlah hari pada tiap bagian bulan / jumlah hari kalender pada bulan tersebut. Tanggal atau hari tidak lengkap ditandai sebelum hasil dianggap lengkap. Setiap pos dapat ditandai di luar pagu; total dalam pagu, di luar pagu, dan gabungannya ditampilkan terpisah. Pembulatan dilakukan per pos. Tambah/edit/hapus/duplikasi, filter, pencarian, sortir, bulk aktif/nonaktif, subtotal/grafik kategori dan log 30 perubahan tersedia.

Honor mendukung pembagian rata dari total dana, tarif sama, daftar divisi atau per orang dengan nominal berbeda, dan total aktual yang dimasukkan pengguna. Per orang untuk satu periode dapat diisi sebagai satu unit × nominal gaji; per divisi harian memakai jumlah orang-hari × tarif. Jumlah dalam anggaran dibandingkan dengan kalkulator dan perbedaan diperingatkan. Sinkronisasi memerlukan konfirmasi dan mengganti semua pos kategori honor menjadi satu pos; sebelum mengganti, pengguna dapat mengekspor JSON. Mode aktual juga menandai nilai realisasi yang dimasukkan. Data yang disimpan hanya pada perangkat, bukan sinkronisasi payroll internal.

Autosave aktif setelah perubahan, namespace `djati:simulator-operasional:v1`. Error akses/kuota diberitahukan. Hapus data lokal menghentikan autosave sampai perubahan berikutnya. Impor JSON satu skenario: versi 1, maksimum 1 MB, 500 pos, 500 divisi/relawan, tipe/angka finite/nonnegatif/rentang tervalidasi, ID unik, total per pos maksimum Rp1 triliun. Konfirmasi sebelum menimpa. Teks tidak dirender sebagai HTML. CSV mengutip sel dan menetralkan formula berawalan =,+,-,@ termasuk whitespace.

Cetak memakai tabel khusus seluruh pos, termasuk yang tersembunyi oleh filter, dan mencantumkan rencana/realisasi/proyeksi serta catatan. Pilih A4 landscape dan simpan PDF melalui browser. Pengguna tetap perlu meninjau pagination bila memakai ratusan pos atau catatan panjang.

## P2 dan batasan

Maksimum 5 snapshot pembanding disimpan di localStorage. Tombol Skenario baru dan Duplikat menyimpan snapshot aktif terlebih dahulu; bila penyimpanan ditolak, skenario aktif tidak ditimpa. Ekspor JSON sebagai cadangan atau untuk pindah perangkat. Grafik kategori dalam pagu tersedia. Grafik multi-skenario lanjutan, ekspor native XLSX dan impor spreadsheet belum ditambahkan; gunakan CSV di Excel dan JSON untuk round-trip tanpa kehilangan skema. Tidak ada backend atau sinkronisasi lintas perangkat.

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

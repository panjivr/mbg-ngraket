# Lapkeu Traceability Matrix

Sumber master: `lapkeu_master.xlsx`

## Coverage Matrix

| Sheet Sumber | Domain | API | UI | Print/Output |
|---|---|---|---|---|
| Setup | Profil SPPG, periode | `/api/finance/setup`, `/api/finance/import/master` | Finance tab `Setup` | Dipakai oleh LR/LPA/SPTJ/BAPSD print |
| Saldo Buku | CoA + opening | `/api/finance/coa`, `/api/finance/import/master` | Finance tab `CoA` | Dipakai laporan |
| Transaksi | Jurnal dasar | `/api/finance/journals`, `/api/finance/ledger`, `/api/finance/summary`, legacy `/api/finance/transactions` | Finance tab `Jurnal`, `Ledger` | BKU print |
| BKU | Buku kas umum | `/api/finance/print/bku` | Finance tab `Print` | HTML print BKU |
| BP Bank | Buku pembantu bank | `/api/finance/ledger` (filter akun kas bank) | Finance tab `Ledger` | (Siap via print pipeline) |
| BP Petty Cash | Buku pembantu petty cash | `/api/finance/ledger` (filter akun petty cash) | Finance tab `Ledger` | (Siap via print pipeline) |
| BP Bahan Baku | Buku pembantu bahan | `/api/finance/ledger` + `/api/finance/stock/*` | Finance tab `Ledger`, `Stock` | (Siap via print pipeline) |
| BP Operasional | Buku pembantu ops | `/api/finance/ledger` | Finance tab `Ledger` | (Siap via print pipeline) |
| BP Fasilitas | Buku pembantu fasilitas | `/api/finance/ledger` | Finance tab `Ledger` | (Siap via print pipeline) |
| BP Pajak | Buku pembantu pajak | `/api/finance/ledger` | Finance tab `Ledger` | (Siap via print pipeline) |
| LR | Laporan penerimaan/pengeluaran | `/api/finance/reports/lr` | Finance tab `LR` | `/api/finance/print/lr` |
| LPA | Laporan penggunaan dana | `/api/finance/reports/lpa` | Finance tab `LPA/SPTJ/BAPSD` | `/api/finance/print/lpa` |
| SPTJ | Surat pertanggungjawaban | `/api/finance/reports/sptj` | Finance tab `LPA/SPTJ/BAPSD` | `/api/finance/print/sptj` |
| BAPSD | Berita acara pengalihan | `/api/finance/reports/bapsd` | Finance tab `LPA/SPTJ/BAPSD` | `/api/finance/print/bapsd` |
| Ref_Brg | Master barang | `/api/finance/import/master`, `/api/finance/stock/*` | Finance tab `Stock` | Dipakai laporan stock |
| Saldo_Brg | Saldo awal persediaan | `/api/finance/stock/detail` | Finance tab `Stock` | Rekap stock |
| Masuk | Barang masuk | `/api/finance/stock/detail` (gabung inventory) | Finance tab `Stock` | Rekap stock |
| Keluar | Barang keluar | `/api/finance/stock/detail` (gabung inventory) | Finance tab `Stock` | Rekap stock |
| Stock_Brg (D) | Stock detail | `/api/finance/stock/detail` | Finance tab `Stock` | Rekap detail |
| Stock_Brg (R) | Stock rekap | `/api/finance/stock/rekap` | Finance tab `Stock` | Rekap ringkas |

## Reconciliation Checks

- Trial Balance: debit = kredit (`/api/finance/reconciliation-check`)
- Balance Sheet: aset = liabilitas + ekuitas (`/api/finance/reconciliation-check`)
- Stock: tidak ada saldo negatif (`/api/finance/reconciliation-check`)


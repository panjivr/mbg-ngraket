
let currentFinanceTab = 'lapkeu_home';
let financeSheetEditMode = false;
const FINANCE_MASTER_SHEET_MAP = {
    menu: 'Menu',
    setup: 'Setup',
    saldo_buku: 'Saldo Buku',
    anggaran: 'Anggaran',
    anggaran_bahan: 'Anggaran Bahan Makanan',
    anggaran_operasional: 'Anggaran Operasional',
    anggaran_insentif: 'Anggaran Insentif Fasilitas',
    transaksi: 'Transaksi',
    bku: 'BKU',
    bp_bank: 'BP Bank',
    bp_petty_cash: 'BP Petty Cash',
    bp_bahan: 'BP Bahan Baku',
    bp_operasional: 'BP Operasional',
    bp_fasilitas: 'BP Fasilitas',
    lpa: 'LPA',
    sptj: 'SPTJ',
    bapsd: 'BAPSD',
    catatan: 'Catatan',
    dafnom: 'DafNom',
    ref_brg: 'Ref_Brg',
    saldo_brg: 'Saldo_Brg',
    masuk: 'Masuk',
    keluar: 'Keluar',
    refresh: 'Refresh',
    stock_brg_d: 'Stock_Brg (D)',
    stock_brg_r: 'Stock_Brg (R)'
};

const FINANCE_TRANSAKSI_JENIS_BUKU_PEMBANTU_OPTIONS = [
    'Kas di Bank',
    'Petty Cash',
    'Bahan Baku',
    'Operasional',
    'Insentif Fasilitas',
    'Pajak'
];

const FINANCE_TRANSAKSI_AKUN_DROPDOWN_OPTIONS = [
    'Petty Cash/Cash in Hand',
    'Kas di Bank',
    'Dana Bantuan Pemerintah',
    'Biaya Bahan Baku',
    'Biaya Operasional',
    'Biaya Insentif Fasilitas'
];

const FINANCE_TRANSAKSI_SHEET_NAME = 'Transaksi';
const FINANCE_SALDO_BUKU_SHEET_NAME = 'Saldo Buku';
const FINANCE_SALDO_BUKU_ALLOWED = {
    '1000': 'BUKU KAS UMUM',
    '1100': 'BUKU PEMBANTU KAS',
    '1101': 'Petty Cash/Cash in Hand',
    '1102': 'Kas di Bank',
    '2000': 'BUKU PEMBANTU JENIS DANA',
    '2110': 'Dana Bantuan Pemerintah',
    '2120': 'Biaya Bahan Baku',
    '2130': 'Biaya Operasional',
    '2140': 'Biaya Insentif Fasilitas'
};
const FINANCE_SALDO_BUKU_NO_EDIT_CODES = ['1100', '2000'];
const FINANCE_ANGGARAN_TABS = ['anggaran_bahan', 'anggaran_operasional', 'anggaran_insentif'];
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function formatAnggaranDateLabel(date) {
    const d = date instanceof Date ? date : new Date(date);
    const dayName = DAY_NAMES[d.getDay()];
    const dayNum = d.getDate();
    const monthName = MONTH_NAMES_FULL[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

function getAnggaranRowsForMonth(year, month) {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    let d = new Date(first);
    while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
    const result = [];
    let weekIndex = 0;
    while (d <= last) {
        for (let i = 0; i < 6; i++) {
            const x = new Date(d);
            x.setDate(d.getDate() + i);
            result.push({
                type: 'date',
                date: x,
                dateStr: x.toISOString().slice(0, 10),
                weekIndex,
                rowLabel: formatAnggaranDateLabel(x)
            });
        }
        result.push({ type: 'surplus', weekIndex });
        weekIndex++;
        d.setDate(d.getDate() + 7);
    }
    result.push({ type: 'total' });
    return result;
}

const FINANCE_ANGGARAN_JENIS_MAP = {
    anggaran_bahan: 'Bahan Baku',
    anggaran_operasional: 'Operasional',
    anggaran_insentif: 'Insentif Fasilitas'
};

function getRealisasiByWeek(transaksiRows, year, month, jenis) {
    const rows = getAnggaranRowsForMonth(year, month);
    const weekRanges = {};
    for (const r of rows) {
        if (r.type !== 'date') continue;
        const w = r.weekIndex;
        if (!weekRanges[w]) weekRanges[w] = { min: r.dateStr, max: r.dateStr };
        if (r.dateStr < weekRanges[w].min) weekRanges[w].min = r.dateStr;
        if (r.dateStr > weekRanges[w].max) weekRanges[w].max = r.dateStr;
    }
    for (const w of Object.keys(weekRanges)) {
        const m = weekRanges[w];
        const dMin = new Date(m.min);
        while (dMin.getDay() !== 1) dMin.setDate(dMin.getDate() - 1);
        weekRanges[w].mon = dMin.toISOString().slice(0, 10);
    }
    const out = {};
    const jenisKey = String(jenis || '').toLowerCase().split(/\s+/)[0] || '';
    for (const tr of transaksiRows || []) {
        const cells = tr.cells || [];
        const v = (col) => financeCellVal(cells, col);
        const dateStr = toDateInputValue(v(3)) || String(v(3) || '').trim().slice(0, 10);
        if (!dateStr || dateStr.length < 10) continue;
        const trxJenis = String(v(9) || '').toLowerCase();
        if (!jenisKey || !trxJenis.includes(jenisKey)) continue;
        const kredit = Number(v(8)) || 0;
        if (kredit <= 0) continue;
        const d = new Date(dateStr);
        let trxMon = new Date(d);
        while (trxMon.getDay() !== 1) trxMon.setDate(trxMon.getDate() - 1);
        const trxMonStr = trxMon.toISOString().slice(0, 10);
        for (const [w, range] of Object.entries(weekRanges)) {
            if (range.mon === trxMonStr) {
                out[w] = (out[w] || 0) + kredit;
                break;
            }
        }
    }
    return out;
}

function getRabByWeekBahan(logicalRows, rowsByNo) {
    const out = {};
    for (let i = 0; i < (logicalRows || []).length; i++) {
        const lr = logicalRows[i];
        if (lr.type !== 'date') continue;
        const rowNo = i + 1;
        const r = rowsByNo[rowNo] || { cells: [] };
        const v = (c) => financeCellVal(r.cells, c);
        const kb = Number(v(3)) || 0, sd13 = Number(v(4)) || 0, balita = Number(v(8)) || 0;
        const sd46 = Number(v(5)) || 0, smp = Number(v(6)) || 0, sma = Number(v(7)) || 0, bumil = Number(v(9)) || 0, busui = Number(v(10)) || 0;
        const h1 = Number(v(11)) || 8000, h2 = Number(v(12)) || 10000;
        const g1 = kb + sd13 + balita, g2 = sd46 + smp + sma + bumil + busui;
        const rab = g1 * h1 + g2 * h2;
        const w = lr.weekIndex;
        out[w] = (out[w] || 0) + rab;
    }
    return out;
}

function getRabByWeekOperasional(logicalRows, rowsByNo) {
    const out = {};
    for (const lr of logicalRows || []) {
        if (lr.type !== 'date') continue;
        const rowNo = logicalRows.indexOf(lr) + 1;
        const r = rowsByNo[rowNo] || { cells: [] };
        const rab = Number(financeCellVal(r.cells, 2)) || 0;
        const w = lr.weekIndex;
        out[w] = (out[w] || 0) + rab;
    }
    return out;
}

function getRabByWeekInsentif(logicalRows, rowsByNo) {
    const out = {};
    for (const lr of logicalRows || []) {
        if (lr.type !== 'date') continue;
        const rowNo = logicalRows.indexOf(lr) + 1;
        const r = rowsByNo[rowNo] || { cells: [] };
        const jml = Number(financeCellVal(r.cells, 2)) || 0;
        const hrg = Number(financeCellVal(r.cells, 3)) || 0;
        const rab = jml * hrg;
        const w = lr.weekIndex;
        out[w] = (out[w] || 0) + rab;
    }
    return out;
}

function isSaldoBukuRowAllowed(code, name) {
    const c = String(code || '').trim();
    const n = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const allowedName = FINANCE_SALDO_BUKU_ALLOWED[c];
    if (!allowedName) return false;
    const a = allowedName.toLowerCase().replace(/\s+/g, ' ');
    return n === a;
}
const FINANCE_REF_BRG_SHEET_NAME = 'Ref_Brg';

const FINANCE_SETUP_FIELDS = [
    { key: 'Nama SPPG', label: 'Nama SPPG', placeholder: 'Nama satuan penyelenggara', type: 'text' },
    { key: 'ID SPPG', label: 'ID SPPG', placeholder: 'Identitas SPPG', type: 'text' },
    { key: 'Alamat', label: 'Alamat', placeholder: 'Alamat lengkap', type: 'text' },
    { key: 'Nama Kepala SPPG', label: 'Nama Kepala SPPG', placeholder: 'Nama lengkap', type: 'text' },
    { key: 'Nama Akuntan SPPG', label: 'Nama Akuntan SPPG', placeholder: 'Nama akuntan', type: 'text' },
    { key: 'Nama Yayasan', label: 'Nama Yayasan', placeholder: 'Nama yayasan', type: 'text' },
    { key: 'Ketua Yayasan/yang mewakili', label: 'Ketua Yayasan/yang mewakili', placeholder: 'Nama ketua atau perwakilan', type: 'text' },
    { key: 'Nomor Rekening/VA', label: 'Nomor Rekening/VA', placeholder: 'Nomor rekening atau VA', type: 'text' },
    { key: 'Tahun Anggaran', label: 'Tahun Anggaran', placeholder: 'Contoh: 2026', type: 'text' },
    { key: 'Tgl awal periode ini (dd-mm-yyyy; format text)', label: 'Tgl awal periode ini', placeholder: "Contoh: '05-01-2026", type: 'text', hint: 'dd-mm-yyyy sebagai text', keyAliases: ['Tgl awal periode ini'] },
    { key: 'Tgl akhir periode ini (dd-mm-yyyy; format text)', label: 'Tgl akhir periode ini', placeholder: "Contoh: '17-01-2026", type: 'text', hint: 'dd-mm-yyyy sebagai text', keyAliases: ['Tgl akhir periode ini'] },
    { key: 'Awal periode berikutnya (format text)', label: 'Awal periode berikutnya', placeholder: "Contoh: '19 Januari 2026", type: 'text', hint: 'Format: dd Month yyyy', keyAliases: ['Awal periode berikutnya'] },
    { key: 'Tanggal Pelaporan (format text)', label: 'Tanggal Pelaporan', placeholder: "Contoh: '17 Januari 2026", type: 'text', hint: 'Format: dd Month yyyy', keyAliases: ['Tanggal Pelaporan'] },
    { key: 'Tempat Pelaporan', label: 'Tempat Pelaporan', placeholder: 'Tempat dibuatnya laporan', type: 'text' },
    { key: 'Nomor LPA', label: 'Nomor LPA', placeholder: 'Nomor LPA', type: 'text' },
    { key: 'Nomor BAPSD', label: 'Nomor BAPSD', placeholder: 'Nomor BAPSD', type: 'text' }
];

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function toDateInputValue(v) {
    const s = String(v ?? '').trim();
    if (!s) return '';
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return s.slice(0, 10);
    return d.toISOString().slice(0, 10);
}

function getFinanceSheetRowCache() {
    if (typeof window === 'undefined') return { rowCells: {}, rows: {} };
    if (!window.__financeSheetRowCellsCache) window.__financeSheetRowCellsCache = {};
    if (!window.__financeSheetRowsCache) window.__financeSheetRowsCache = {};
    return { rowCells: window.__financeSheetRowCellsCache, rows: window.__financeSheetRowsCache };
}

function financeCellVal(cells, col) {
    const found = (cells || []).find(c => Number(c?.col || 0) === Number(col));
    return found ? String(found.value ?? '') : '';
}

function buildUpdatedCellsPreserve(existingCells, updatesByCol) {
    const updates = new Map(
        Object.entries(updatesByCol || {}).map(([k, v]) => [Number(k), v])
    );
    const out = Array.isArray(existingCells) ? existingCells.map(c => {
        const col = Number(c?.col || 0);
        if (!Number.isFinite(col) || col <= 0) return null;
        if (!updates.has(col)) return c;
        return {
            ...c,
            value: String(updates.get(col) ?? ''),
            // User-edited values should stop relying on prior formulas.
            formula: null
        };
    }).filter(Boolean) : [];

    // Ensure updated columns exist even if missing in existingCells.
    for (const [col, v] of updates.entries()) {
        if (!out.some(c => Number(c?.col || 0) === Number(col))) {
            out.push({ col, value: String(v ?? ''), formula: null });
        }
    }
    return out;
}

async function loadFinance(force = false) {
    if (force) currentFinanceTab = 'lapkeu_home';
    await switchFinanceTab(currentFinanceTab);
}

const FINANCE_DETAIL_PANEL_KEYS = ['master_sheet', 'setup', 'coa', 'journal', 'ledger', 'trial', 'lr', 'neraca', 'cashflow', 'formal', 'stock', 'print'];

function updateFinanceLapkeuMenuDate() {
    const el = document.getElementById('finance-lapkeu-menu-date');
    if (!el) return;
    const d = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    el.textContent = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function refreshFinanceLapkeuMenuLabels() {
    const el = document.getElementById('finance-lapkeu-nama-sppg');
    if (!el) return;
    try {
        const rows = await api('/api/finance/setup');
        const setupRows = Array.isArray(rows) ? rows : [];
        if (setupRows.length) window.__financeSetupCache = setupRows;
        const item = setupRows.find(r => String(r.item_key || '') === 'Nama SPPG');
        const v = item?.item_value ? String(item.item_value).trim() : '';
        el.textContent = v || 'Nama SPPG';
    } catch {
        el.textContent = 'Nama SPPG';
    }
    updateFinanceLapkeuMenuDate();
}

async function switchFinanceTab(tab) {
    currentFinanceTab = tab || 'lapkeu_home';
    const tabs = document.querySelectorAll('#finance-tab-list .tab-item');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === currentFinanceTab));

    const homeEl = document.getElementById('finance-panel-lapkeu-home');
    const stackEl = document.getElementById('finance-detail-stack');

    if (currentFinanceTab === 'lapkeu_home') {
        if (homeEl) homeEl.classList.remove('hidden');
        if (stackEl) stackEl.classList.add('hidden');
        await refreshFinanceLapkeuMenuLabels();
        return;
    }

    if (homeEl) homeEl.classList.add('hidden');
    if (stackEl) stackEl.classList.remove('hidden');

    const targetPanel = currentFinanceTab === 'setup' ? 'setup' : 'master_sheet';
    FINANCE_DETAIL_PANEL_KEYS.forEach(k => {
        const el = document.getElementById(`finance-panel-${k}`);
        if (!el) return;
        el.classList.toggle('hidden', k !== targetPanel);
    });

    if (targetPanel === 'setup') {
        await loadFinanceSetup();
    } else {
        await loadFinanceMasterSheetByTab(currentFinanceTab);
    }
}

const FINANCE_SHEETS_WITH_HEADER = ['saldo_buku', 'anggaran', 'anggaran_bahan', 'anggaran_operasional', 'anggaran_insentif', 'transaksi', 'bku', 'bp_bank', 'bp_petty_cash', 'bp_bahan', 'bp_operasional', 'bp_fasilitas', 'lpa', 'sptj', 'bapsd', 'ref_brg'];
const FINANCE_SHEETS_WITH_PERIOD = ['bku', 'bp_bank', 'bp_petty_cash', 'bp_bahan', 'bp_operasional', 'bp_fasilitas'];

async function populateFinanceSheetHeader(tabKey, setup) {
    const periodWrap = document.getElementById('finance-sheet-period-wrap');
    const summaryEl = document.getElementById('finance-sheet-summary');
    if (!periodWrap) return;

    const hasHeader = FINANCE_SHEETS_WITH_HEADER.includes(tabKey);
    if (!hasHeader) return;

    const btnWrap = document.getElementById('finance-sheet-header-btn');
    const cekResultsEl = document.getElementById('cek-saldo-results-area');
    const isAnggaran = FINANCE_ANGGARAN_TABS.includes(tabKey);
    if (btnWrap) {
        if (tabKey === 'saldo_buku') {
            btnWrap.innerHTML = `<button type="button" class="btn btn-primary btn-sm" onclick="runCekSaldo()"><i class="fas fa-calculator"></i> Cek Saldo</button>`;
        } else if (isAnggaran || tabKey === 'transaksi') {
            btnWrap.innerHTML = '';
        } else {
            btnWrap.innerHTML = `<button type="button" class="btn btn-secondary btn-sm" onclick="switchFinanceTab('lapkeu_home')"><i class="fas fa-home"></i> Menu utama</button>`;
        }
    }
    if (cekResultsEl) {
        cekResultsEl.classList.add('hidden');
        cekResultsEl.style.display = 'none';
    }

    if (periodWrap) periodWrap.classList.toggle('hidden', !FINANCE_SHEETS_WITH_PERIOD.includes(tabKey));
    if (FINANCE_SHEETS_WITH_PERIOD.includes(tabKey)) {
        const fromEl = document.getElementById('finance-sheet-from');
        const toEl = document.getElementById('finance-sheet-to');
        if (fromEl && !fromEl.value) fromEl.value = new Date().toISOString().slice(0, 10);
        if (toEl && !toEl.value) toEl.value = new Date().toISOString().slice(0, 10);
    }

    summaryEl.classList.add('hidden');
    summaryEl.innerHTML = '';
    if (['bku', 'bp_bank', 'bp_petty_cash'].includes(tabKey)) {
        summaryEl.classList.remove('hidden');
        summaryEl.innerHTML = `
            <div class="finance-summary-card"><div class="finance-summary-card__label">Saldo Awal</div><div class="finance-summary-card__value" id="finance-summary-saldo-awal">-</div></div>
            <div class="finance-summary-card"><div class="finance-summary-card__label">Saldo Akhir</div><div class="finance-summary-card__value" id="finance-summary-saldo-akhir">-</div></div>
        `;
    } else if (['bp_bahan', 'bp_operasional', 'bp_fasilitas'].includes(tabKey)) {
        summaryEl.classList.remove('hidden');
        summaryEl.innerHTML = `<div class="finance-summary-card"><div class="finance-summary-card__label">Total Belanja</div><div class="finance-summary-card__value" id="finance-summary-total">-</div></div>`;
    }
}

async function loadFinanceMasterSheetByTab(tabKey, forceRefresh = false) {
    const sheetName = FINANCE_MASTER_SHEET_MAP[String(tabKey || '').trim()] || 'Menu';
    const titleEl = document.getElementById('finance-master-sheet-title');
    const rowsEl = document.getElementById('finance-master-sheet-rows');
    const actionsEl = document.getElementById('finance-master-sheet-actions');
    const contentWrap = document.getElementById('finance-sheet-content');

    let setup = {};
    if (FINANCE_SHEETS_WITH_HEADER.includes(tabKey)) {
        try {
            const rows = await api('/api/finance/setup');
            setup = Object.fromEntries((Array.isArray(rows) ? rows : []).map(r => [r.item_key, r.item_value]));
        } catch (_) {}
        await populateFinanceSheetHeader(tabKey, setup);
    }

    const sheetTitles = { saldo_buku: 'SALDO AWAL BUKU', anggaran: 'ANGGARAN', anggaran_bahan: 'ANGGARAN BAHAN MAKANAN', anggaran_operasional: 'ANGGARAN OPERASIONAL', anggaran_insentif: 'ANGGARAN INSENTIF FASILITAS', transaksi: 'INPUT DATA TRANSAKSI', bku: 'BUKU KAS UMUM', bp_bank: 'BUKU PEMBANTU KAS DI BANK', bp_petty_cash: 'BUKU PEMBANTU PETTY CASH', bp_bahan: 'BUKU PEMBANTU DANA BAHAN BAKU/PANGAN', bp_operasional: 'BUKU PEMBANTU DANA OPERASIONAL', bp_fasilitas: 'BUKU PEMBANTU DANA INSENTIF FASILITAS' };
    if (titleEl && sheetTitles[tabKey]) titleEl.textContent = sheetTitles[tabKey];
    else if (titleEl) titleEl.textContent = `Sheet: ${sheetName}`;

    if (rowsEl) rowsEl.innerHTML = `<tr><td colspan="8" class="text-muted">Loading...</td></tr>`;
    const { rows: rowsCache } = getFinanceSheetRowCache();
    if (actionsEl) {
        const printMap = {
                lr: 'lr',
            bku: 'bku',
            bp_bank: 'bp-bank',
            bp_petty_cash: 'bp-petty',
            bp_bahan: 'bp-bahan',
            bp_operasional: 'bp-operasional',
            bp_fasilitas: 'bp-fasilitas',
            lpa: 'lpa',
            sptj: 'sptj',
            bapsd: 'bapsd',
            stock_brg_d: 'stock-detail',
            stock_brg_r: 'stock-rekap'
        };
        const p = printMap[tabKey];

        // For these sheets, we render field-based form UI (not Excel-like grid).
        if (tabKey === 'transaksi') {
            actionsEl.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="addTransaksiRow()"><i class="fas fa-plus"></i> Tambah Baris</button>
                ${p ? `<button class="btn btn-secondary btn-sm" onclick="openFinancePrint('${p}')"><i class="fas fa-print"></i> Print ${sheetName}</button>` : ''}
            `;
        } else if (tabKey === 'saldo_buku') {
            actionsEl.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="openFinanceSaldoBukuCreate()"><i class="fas fa-plus"></i> Tambah Saldo Buku</button>
            `;
        } else if (FINANCE_ANGGARAN_TABS.includes(tabKey)) {
            const clearKeteranganBtn = tabKey === 'anggaran_operasional'
                ? `<button class="btn btn-secondary btn-sm" onclick="clearAnggaranOperasionalKeterangan()"><i class="fas fa-eraser"></i> Bersihkan Keterangan</button>`
                : '';
            actionsEl.innerHTML = `
                ${clearKeteranganBtn}
                <button class="btn btn-secondary btn-sm" onclick="loadFinanceMasterSheetByTab('${tabKey}')"><i class="fas fa-sync"></i> Refresh</button>
            `;
        } else if (tabKey === 'ref_brg') {
            actionsEl.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="openFinanceRefBrgCreate()"><i class="fas fa-plus"></i> Tambah Ref Brg</button>
            `;
        } else {
            // These sheets don't have per-field specialized handlers.
            // We still allow editing lapkeu_sheet_rows via generic "Edit" per row.
            actionsEl.innerHTML = `
                ${p ? `<button class="btn btn-secondary btn-sm" onclick="openFinancePrint('${p}')"><i class="fas fa-print"></i> Print ${sheetName}</button>` : ''}
                <div class="text-sm text-muted" style="align-self:center">View only</div>
            `;
        }
    }
    try {
        const limit = (tabKey === 'transaksi') ? 100 : 2000;
        let rows = [];
        let effectiveSheetName = sheetName;
        if (FINANCE_ANGGARAN_TABS.includes(tabKey)) {
            const altSheets = { anggaran_bahan: ['Anggaran Bahan Makanan', 'Bahan Makanan', 'Anggaran'], anggaran_operasional: ['Anggaran Operasional', 'Operasional', 'Anggaran'], anggaran_insentif: ['Anggaran Insentif Fasilitas', 'Insentif Fasilitas', 'Anggaran'] };
            const cacheBust = forceRefresh ? `&_=${Date.now()}` : '';
            for (const s of (altSheets[tabKey] || [sheetName])) {
                const d = await api(`/api/finance/import/sheets?sheet=${encodeURIComponent(s)}&limit=2000${cacheBust}`);
                rows = Array.isArray(d?.rows) ? d.rows : [];
                if (rows.length) { effectiveSheetName = s; break; }
            }
        } else {
            if (tabKey === 'saldo_buku') {
                try { await api('/api/finance/saldo-buku/cleanup', 'POST'); } catch (_) {}
            }
            const data = await api(`/api/finance/import/sheets?sheet=${encodeURIComponent(sheetName)}&limit=${limit}`);
            rows = Array.isArray(data?.rows) ? data.rows : [];
        }

        // Cache for edit/create modals.
        const { rowCells } = getFinanceSheetRowCache();
        const storageKey = effectiveSheetName || sheetName;
        rowsCache[storageKey] = rows;
        for (const r of rows) {
            rowCells[`${storageKey}:${r.row_no}`] = r.cells || [];
        }

        if (tabKey === 'transaksi') {
            const tableWrap = contentWrap || rowsEl?.closest('.table-responsive')?.parentElement;
            if (tableWrap) {
                const sheet = 'Transaksi';
                const jenisOpts = FINANCE_TRANSAKSI_JENIS_BUKU_PEMBANTU_OPTIONS.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
                const akunOpts = FINANCE_TRANSAKSI_AKUN_DROPDOWN_OPTIONS.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
                const today = new Date().toISOString().slice(0, 10);
                const renderRow = (r, rowNo) => {
                    const v = (c) => financeCellVal(r?.cells || [], c);
                    const dateVal = toDateInputValue(v(1) || v(3)) || (r ? '' : today);
                    const noBukti = v(2) || v(5) || '';
                    const uraian = v(3) || v(6) || '';
                    const debitVal = v(4) || v(7) || '';
                    const kreditVal = v(5) || v(8) || '';
                    const jenisVal = v(6) || v(9) || '';
                    const akunVal = v(7) || v(11) || v(14) || '';
                    const jenisSel = FINANCE_TRANSAKSI_JENIS_BUKU_PEMBANTU_OPTIONS.map(j => `<option value="${escapeHtml(j)}" ${j === jenisVal ? 'selected' : ''}>${escapeHtml(j)}</option>`).join('');
                    const akunSel = FINANCE_TRANSAKSI_AKUN_DROPDOWN_OPTIONS.map(a => `<option value="${escapeHtml(a)}" ${a === akunVal ? 'selected' : ''}>${escapeHtml(a)}</option>`).join('');
                    return `<tr data-row-no="${rowNo}" class="finance-transaksi-row">
                        <td><input type="date" class="input-field input-sm finance-transaksi-cell" data-sheet="${escapeHtml(sheet)}" data-row="${rowNo}" data-col="1" value="${escapeHtml(dateVal)}" onchange="saveFinanceTransaksiCell(this)" /></td>
                        <td><input type="text" class="input-field input-sm finance-transaksi-cell" data-sheet="${escapeHtml(sheet)}" data-row="${rowNo}" data-col="2" value="${escapeHtml(noBukti)}" placeholder="No. Bukti" onchange="saveFinanceTransaksiCell(this)" /></td>
                        <td style="min-width:200px"><input type="text" class="input-field input-sm finance-transaksi-cell w-full" data-sheet="${escapeHtml(sheet)}" data-row="${rowNo}" data-col="3" value="${escapeHtml(uraian)}" placeholder="Uraian" onchange="saveFinanceTransaksiCell(this)" /></td>
                        <td class="text-right"><input type="number" class="input-field input-sm finance-transaksi-cell text-right" data-sheet="${escapeHtml(sheet)}" data-row="${rowNo}" data-col="4" value="${escapeHtml(debitVal)}" min="0" step="0.01" placeholder="0" onchange="saveFinanceTransaksiCell(this)" style="color:#1d4ed8;max-width:120px" /></td>
                        <td class="text-right"><input type="number" class="input-field input-sm finance-transaksi-cell text-right" data-sheet="${escapeHtml(sheet)}" data-row="${rowNo}" data-col="5" value="${escapeHtml(kreditVal)}" min="0" step="0.01" placeholder="0" onchange="saveFinanceTransaksiCell(this)" style="color:#dc2626;max-width:120px" /></td>
                        <td><select class="input-field input-sm finance-transaksi-cell" data-sheet="${escapeHtml(sheet)}" data-row="${rowNo}" data-col="6" onchange="saveFinanceTransaksiCell(this)"><option value="">— Pilih —</option>${jenisSel}</select></td>
                        <td><select class="input-field input-sm finance-transaksi-cell" data-sheet="${escapeHtml(sheet)}" data-row="${rowNo}" data-col="7" onchange="saveFinanceTransaksiCell(this)"><option value="">— Pilih —</option>${akunSel}</select></td>
                    </tr>`;
                };
                const isRowEmpty = (r) => {
                    const v = (c) => financeCellVal(r?.cells || [], c);
                    return !(v(1) || v(2) || v(3) || v(4) || v(5) || v(6) || v(7) || v(8) || v(9) || v(11) || v(14));
                };
                const rowsWithData = rows.filter(r => !isRowEmpty(r));
                const displayedRows = rowsWithData.slice().sort((a, b) => b.row_no - a.row_no).slice(0, 50);
                const nextRowStart = displayedRows.length ? Math.max(...displayedRows.map(r => r.row_no)) + 1 : 1;
                const emptyRowsCount = 5;
                const body = displayedRows.length
                    ? displayedRows.map(r => renderRow(r, r.row_no)).join('') + Array.from({ length: emptyRowsCount }, (_, i) => renderRow(null, nextRowStart + i)).join('')
                    : Array.from({ length: emptyRowsCount }, (_, i) => renderRow(null, i + 1)).join('');
                const headerRow1 = `<tr><th>Tanggal (dd-mm-yyyy)</th><th>Nomor Bukti</th><th>Uraian Transaksi</th><th class="text-right" style="color:#1d4ed8">Debet (D)</th><th class="text-right" style="color:#dc2626">Kredit (K)</th><th>Jenis Buku Pembantu</th><th>Jika (D), masuk ke mana?<br>Jika (K), keluar dari mana?</th></tr>`;
                const headerRow2 = `<tr class="finance-transaksi-subheader"><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th></tr>`;
                tableWrap.innerHTML = `<div class="table-responsive"><table class="nutri-table w-full finance-table finance-transaksi-table"><thead>${headerRow1}${headerRow2}</thead><tbody id="finance-master-sheet-rows">${body}</tbody></table></div><div class="mt-3"><button type="button" class="btn btn-secondary btn-sm" onclick="addTransaksiRow()"><i class="fas fa-plus"></i> Tambah Baris</button></div>`;
            }
            return;
        }

        if (tabKey === 'saldo_buku') {
            const tableWrap = contentWrap || rowsEl?.closest('.table-responsive')?.parentElement;
            if (tableWrap) {
                const isInputRow = (code) => {
                    const c = String(code || '').trim();
                    return /^\d{4}$/.test(c) && !c.endsWith('00');
                };
                const validRows = rows.filter(r => isSaldoBukuRowAllowed(financeCellVal(r.cells, 2), financeCellVal(r.cells, 3)));
                const sorted = validRows.slice().sort((a, b) => {
                    const ca = financeCellVal(a.cells, 2);
                    const cb = financeCellVal(b.cells, 2);
                    return String(ca || '').localeCompare(String(cb || ''));
                });
                const body = !validRows.length ? `<tr><td colspan="5" class="text-muted">Belum ada data.</td></tr>` : sorted.map(r => {
                    const code = financeCellVal(r.cells, 2);
                    const name = financeCellVal(r.cells, 3);
                    const saldoAwal = financeCellVal(r.cells, 4);
                    const val = Number(saldoAwal) || 0;
                    const isHeader = /00$/.test(String(code || '')) && String(code || '').length >= 3;
                    const isSummary = String(code || '') === '1000';
                    const rowClass = isSummary ? 'finance-row-summary' : (isHeader ? 'finance-row-header' : '');
                    const saldoDisplay = isInputRow(code) ? (val ? formatRp(val) : '-') : '-';
                    const noEdit = FINANCE_SALDO_BUKU_NO_EDIT_CODES.includes(String(code || '').trim());
                    const actionTd = noEdit ? '<td></td>' : `<td><button class="btn btn-secondary btn-sm" onclick="openFinanceSaldoBukuEdit(${r.row_no})"><i class="fas fa-pen"></i></button></td>`;
                    return `<tr data-row-no="${r.row_no}" class="${rowClass}">
                        <td><strong>${escapeHtml(code || '-')}</strong></td>
                        <td>${escapeHtml(name || '-')}</td>
                        <td class="text-right">${saldoDisplay}</td>
                        <td class="text-right">${isInputRow(code) ? saldoDisplay : '-'}</td>
                        ${actionTd}
                    </tr>`;
                }).join('');
                const ingatHtml = `
                    <div class="finance-ingat finance-ingat--separate">
                        <div class="finance-ingat__label">INGAT: ubah saldo lewat tombol Edit</div>
                        <div class="finance-ingat__text">
                            <span class="finance-ingat__rule">Saldo BKU = petty cash/cash in hand + Kas di Bank</span>
                            <span class="finance-ingat__rule">Saldo BKU = Saldo Bantuan Pemerintah</span>
                        </div>
                    </div>
                `;
                tableWrap.innerHTML = `
                    <div class="table-responsive">
                        <table class="nutri-table w-full finance-table">
                            <thead><tr><th>KODE</th><th>NAMA AKUN</th><th>SALDO AWAL</th><th>SALDO AKHIR</th><th style="width:60px">Action</th></tr></thead>
                            <tbody id="finance-master-sheet-rows">${body}</tbody>
                        </table>
                    </div>
                    ${ingatHtml}
                `;
            }
            return;
        }

        if (tabKey === 'anggaran_bahan') {
            window.__financeAnggaranSheet = effectiveSheetName;
            const tableWrap = contentWrap || rowsEl?.closest('.table-responsive')?.parentElement;
            if (tableWrap) {
                let transaksiRows = [];
                try {
                    const trxRes = await api('/api/finance/import/sheets?sheet=Transaksi&limit=2000');
                    transaksiRows = Array.isArray(trxRes?.rows) ? trxRes.rows : [];
                } catch (_) {}
                const now = new Date();
                const monthVal = window.__financeAnggaranMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const [y, m] = monthVal.split('-').map(Number);
                const logicalRows = getAnggaranRowsForMonth(y, m);
                const rowsByNo = Object.fromEntries((rows || []).map(r => [r.row_no, r]));
                const rabByWeek = getRabByWeekBahan(logicalRows, rowsByNo);
                const realisasiByWeek = getRealisasiByWeek(transaksiRows, y, m, FINANCE_ANGGARAN_JENIS_MAP.anggaran_bahan);
                const anggaranNavHtml = `<div class="finance-anggaran-nav mb-3"><div class="tab-list finance-anggaran-tabs"><span class="tab-item active">Bahan Makanan</span><span class="tab-item" onclick="switchFinanceTab('anggaran_operasional')">Operasional</span><span class="tab-item" onclick="switchFinanceTab('anggaran_insentif')">Insentif Fasilitas</span></div></div>`;
                const cols = ['Hari/Tanggal', 'Jml', 'KB&TK', 'SD1-3', 'SD4-6', 'SMP', 'SMA', 'Balita', 'Bumil', 'Busui', 'Hrg MBG', 'Hrg MBG2', 'RAB'];
                const colClasses = ['finance-anggaran-col-date', '', 'finance-anggaran-col-jml', 'finance-anggaran-col-jml', 'finance-anggaran-col-jml', 'finance-anggaran-col-jml', 'finance-anggaran-col-jml', 'finance-anggaran-col-jml', 'finance-anggaran-col-jml', 'finance-anggaran-col-jml', 'finance-anggaran-col-harga', 'finance-anggaran-col-harga', 'finance-anggaran-col-rab'];
                const inputCols = new Set([1, 3, 4, 5, 6, 7, 8, 9, 10]);
                const body = logicalRows.map((lr, idx) => {
                    const rowNo = idx + 1;
                    const r = rowsByNo[rowNo] || { cells: [] };
                    const v = (c) => financeCellVal(r.cells, c);
                    if (lr.type === 'surplus') {
                        const rab = rabByWeek[lr.weekIndex] || 0;
                        const real = realisasiByWeek[lr.weekIndex] || 0;
                        const selisih = rab - real;
                        const isSurplus = selisih >= 0;
                        const label = isSurplus ? 'Surplus' : 'Utang';
                        const valDisplay = formatRp(Math.abs(selisih)) || '0';
                        const cls = isSurplus ? 'text-success' : 'text-danger';
                        return `<tr data-row-no="${rowNo}" class="finance-row-header"><td>Surplus/Utang</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td class="text-right"><span class="${cls}">${label} ${valDisplay}</span></td></tr>`;
                    }
                    if (lr.type === 'total') {
                        return `<tr data-row-no="${rowNo}" class="finance-row-summary"><td><strong>Total</strong></td><td colspan="12" class="text-right"><strong id="anggaran-bahan-total">-</strong></td></tr>`;
                    }
                    const cells = [];
                    for (let c = 1; c <= 13; c++) {
                        let html;
                        const tdClass = c === 1 ? 'finance-anggaran-col-date' : (c === 11 || c === 12 ? 'finance-anggaran-col-harga text-right' : (c >= 2 && c <= 10 ? 'finance-anggaran-col-jml text-right' : 'text-right'));
                        if (c === 1) {
                            html = `<span class="finance-anggaran-date-label">${escapeHtml(lr.rowLabel || '')}</span>`;
                        } else if (c === 2) {
                            const kb = Number(v(3)) || 0, sd13 = Number(v(4)) || 0, sd46 = Number(v(5)) || 0, smp = Number(v(6)) || 0, sma = Number(v(7)) || 0, balita = Number(v(8)) || 0, bumil = Number(v(9)) || 0, busui = Number(v(10)) || 0;
                            const total = kb + sd13 + sd46 + smp + sma + balita + bumil + busui;
                            html = total || '-';
                        } else if (inputCols.has(c)) {
                            const num = Number(v(c)) || 0;
                            html = `<input type="number" class="finance-anggaran-input finance-anggaran-bahan-input finance-anggaran-input--jml" data-sheet="${escapeHtml(storageKey)}" data-row="${rowNo}" data-col="${c}" value="${num}" min="0" step="0.01" onchange="saveFinanceAnggaranCell(this);recalcBahanRab(this)" />`;
                        } else if (c === 11 || c === 12) {
                            const num = Number(v(c)) || (c === 11 ? 8000 : 10000);
                            html = `<input type="number" class="finance-anggaran-input finance-anggaran-bahan-input finance-anggaran-input--harga" data-sheet="${escapeHtml(storageKey)}" data-row="${rowNo}" data-col="${c}" value="${num}" min="0" onchange="saveFinanceAnggaranCell(this);recalcBahanRab(this)" />`;
                        } else if (c === 13) {
                            const kb = Number(v(3)) || 0, sd13 = Number(v(4)) || 0, balita = Number(v(8)) || 0, sd46 = Number(v(5)) || 0, smp = Number(v(6)) || 0, sma = Number(v(7)) || 0, bumil = Number(v(9)) || 0, busui = Number(v(10)) || 0;
                            const h1 = Number(v(11)) || 8000, h2 = Number(v(12)) || 10000;
                            const g1 = kb + sd13 + balita, g2 = sd46 + smp + sma + bumil + busui;
                            const rab = g1 * h1 + g2 * h2;
                            html = `<span class="finance-anggaran-rab" data-row="${rowNo}">${formatRp(rab) || '-'}</span>`;
                        } else {
                            html = '-';
                        }
                        cells.push(`<td class="${tdClass}">${html}</td>`);
                    }
                    return `<tr data-row-no="${rowNo}">${cells.join('')}</tr>`;
                }).join('');
                const monthPickerHtml = `<div class="finance-anggaran-month-wrap mb-4 flex flex-wrap gap-4 items-end"><div><label class="input-label">Bulan</label><input type="month" id="finance-anggaran-month" class="input-field" style="max-width:180px" value="${monthVal}" onchange="window.__financeAnggaranMonth=this.value;loadFinanceMasterSheetByTab(currentFinanceTab)" /></div></div>`;
                tableWrap.innerHTML = `${anggaranNavHtml}${monthPickerHtml}<div class="table-responsive table-responsive--fit"><table class="nutri-table w-full finance-table finance-anggaran-table finance-anggaran-table--teal finance-anggaran-table--compact"><thead><tr>${cols.map((h, i) => `<th class="${colClasses[i] || ''}">${h}</th>`).join('')}</tr></thead><tbody id="finance-master-sheet-rows">${body}</tbody></table></div>`;
                setTimeout(() => updateAnggaranBahanTotal(), 50);
            }
            return;
        }

        if (tabKey === 'anggaran_operasional') {
            window.__financeAnggaranSheet = effectiveSheetName;
            const tableWrap = contentWrap || rowsEl?.closest('.table-responsive')?.parentElement;
            if (tableWrap) {
                let transaksiRows = [];
                try {
                    const trxRes = await api('/api/finance/import/sheets?sheet=Transaksi&limit=2000');
                    transaksiRows = Array.isArray(trxRes?.rows) ? trxRes.rows : [];
                } catch (_) {}
                const now = new Date();
                const monthVal = window.__financeAnggaranMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const [y, m] = monthVal.split('-').map(Number);
                const logicalRows = getAnggaranRowsForMonth(y, m);
                const rowsByNo = Object.fromEntries((rows || []).map(r => [r.row_no, r]));
                const rabByWeek = getRabByWeekOperasional(logicalRows, rowsByNo);
                const realisasiByWeek = getRealisasiByWeek(transaksiRows, y, m, FINANCE_ANGGARAN_JENIS_MAP.anggaran_operasional);
                const anggaranNavHtml = `<div class="finance-anggaran-nav mb-3"><div class="tab-list finance-anggaran-tabs"><span class="tab-item" onclick="switchFinanceTab('anggaran_bahan')">Bahan Makanan</span><span class="tab-item active">Operasional</span><span class="tab-item" onclick="switchFinanceTab('anggaran_insentif')">Insentif Fasilitas</span></div></div>`;
                const body = logicalRows.map((lr, idx) => {
                    const rowNo = idx + 1;
                    const r = rowsByNo[rowNo] || { cells: [] };
                    const v = (c) => financeCellVal(r.cells, c);
                    if (lr.type === 'surplus') {
                        const rab = rabByWeek[lr.weekIndex] || 0;
                        const real = realisasiByWeek[lr.weekIndex] || 0;
                        const selisih = rab - real;
                        const isSurplus = selisih >= 0;
                        const label = isSurplus ? 'Surplus' : 'Utang';
                        const valDisplay = formatRp(Math.abs(selisih)) || '0';
                        const cls = isSurplus ? 'text-success' : 'text-danger';
                        return `<tr data-row-no="${rowNo}" class="finance-row-header"><td>Surplus/Utang</td><td class="text-right"><span class="${cls}">${label} ${valDisplay}</span></td><td></td></tr>`;
                    }
                    if (lr.type === 'total') {
                        return `<tr data-row-no="${rowNo}" class="finance-row-summary"><td><strong>Total</strong></td><td class="text-right"><strong id="anggaran-operasional-total">-</strong></td><td></td></tr>`;
                    }
                    const ketRaw = v(3) || '';
                    const ketClean = (ketRaw.includes('GMT') || /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/.test(ketRaw) || ketRaw.trim() === 'Surplus/Utang') ? '' : ketRaw;
                    return `<tr data-row-no="${rowNo}"><td><span class="finance-anggaran-date-label">${escapeHtml(lr.rowLabel || '')}</span></td><td class="text-right"><input type="number" class="finance-anggaran-input finance-anggaran-rab-input" data-sheet="${escapeHtml(storageKey)}" data-row="${rowNo}" data-col="2" value="${Number(v(2)) || ''}" min="0" step="0.01" onchange="saveFinanceAnggaranCell(this);updateAnggaranOperasionalTotal()" /></td><td><input type="text" class="finance-anggaran-input finance-anggaran-input--wide" data-sheet="${escapeHtml(storageKey)}" data-row="${rowNo}" data-col="3" value="${escapeHtml(ketClean)}" onchange="saveFinanceAnggaranCell(this)" /></td></tr>`;
                }).join('');
                const monthPickerHtml = `<div class="finance-anggaran-month-wrap mb-4 flex flex-wrap gap-4 items-end"><div><label class="input-label">Bulan</label><input type="month" id="finance-anggaran-month" class="input-field" style="max-width:180px" value="${monthVal}" onchange="window.__financeAnggaranMonth=this.value;loadFinanceMasterSheetByTab(currentFinanceTab)" /></div></div>`;
                tableWrap.innerHTML = `${anggaranNavHtml}${monthPickerHtml}<div class="table-responsive table-responsive--fit"><table class="nutri-table w-full finance-table finance-anggaran-table finance-anggaran-table--red finance-anggaran-table--compact"><thead><tr><th>Hari/Tanggal</th><th>RAB</th><th>Keterangan</th></tr></thead><tbody id="finance-master-sheet-rows">${body}</tbody></table></div>`;
                setTimeout(() => updateAnggaranOperasionalTotal(), 50);
            }
            return;
        }

        if (tabKey === 'anggaran_insentif') {
            window.__financeAnggaranSheet = effectiveSheetName;
            const tableWrap = contentWrap || rowsEl?.closest('.table-responsive')?.parentElement;
            if (tableWrap) {
                let transaksiRows = [];
                try {
                    const trxRes = await api('/api/finance/import/sheets?sheet=Transaksi&limit=2000');
                    transaksiRows = Array.isArray(trxRes?.rows) ? trxRes.rows : [];
                } catch (_) {}
                const now = new Date();
                const monthVal = window.__financeAnggaranMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const [y, m] = monthVal.split('-').map(Number);
                const logicalRows = getAnggaranRowsForMonth(y, m);
                const rowsByNo = Object.fromEntries((rows || []).map(r => [r.row_no, r]));
                const rabByWeek = getRabByWeekInsentif(logicalRows, rowsByNo);
                const realisasiByWeek = getRealisasiByWeek(transaksiRows, y, m, FINANCE_ANGGARAN_JENIS_MAP.anggaran_insentif);
                const anggaranNavHtml = `<div class="finance-anggaran-nav mb-3"><div class="tab-list finance-anggaran-tabs"><span class="tab-item" onclick="switchFinanceTab('anggaran_bahan')">Bahan Makanan</span><span class="tab-item" onclick="switchFinanceTab('anggaran_operasional')">Operasional</span><span class="tab-item active">Insentif Fasilitas</span></div></div>`;
                const body = logicalRows.map((lr, idx) => {
                    const rowNo = idx + 1;
                    const r = rowsByNo[rowNo] || { cells: [] };
                    const v = (c) => financeCellVal(r.cells, c);
                    if (lr.type === 'surplus') {
                        const rab = rabByWeek[lr.weekIndex] || 0;
                        const real = realisasiByWeek[lr.weekIndex] || 0;
                        const selisih = rab - real;
                        const isSurplus = selisih >= 0;
                        const label = isSurplus ? 'Surplus' : 'Utang';
                        const valDisplay = formatRp(Math.abs(selisih)) || '0';
                        const cls = isSurplus ? 'text-success' : 'text-danger';
                        return `<tr data-row-no="${rowNo}" class="finance-row-header"><td>Surplus/Utang</td><td></td><td></td><td class="text-right"><span class="${cls}">${label} ${valDisplay}</span></td></tr>`;
                    }
                    if (lr.type === 'total') {
                        return `<tr data-row-no="${rowNo}" class="finance-row-summary"><td><strong>Total</strong></td><td colspan="3" class="text-right"><strong id="anggaran-insentif-total">-</strong></td></tr>`;
                    }
                    const jml = Number(v(2)) || 0, hrg = Number(v(3)) || 0;
                    const rab = formatRp(jml * hrg) || '-';
                    return `<tr data-row-no="${rowNo}"><td><span class="finance-anggaran-date-label">${escapeHtml(lr.rowLabel || '')}</span></td><td class="text-right"><input type="number" class="finance-anggaran-input finance-anggaran-insentif-jml" data-sheet="${escapeHtml(storageKey)}" data-row="${rowNo}" data-col="2" value="${jml}" min="0" onchange="saveFinanceAnggaranCell(this);recalcInsentifRab(this)" /></td><td class="text-right"><input type="number" class="finance-anggaran-input finance-anggaran-insentif-hrg" data-sheet="${escapeHtml(storageKey)}" data-row="${rowNo}" data-col="3" value="${hrg}" min="0" onchange="saveFinanceAnggaranCell(this);recalcInsentifRab(this)" /></td><td class="text-right"><span class="finance-anggaran-rab-insentif">${rab}</span></td></tr>`;
                }).join('');
                const monthPickerHtml = `<div class="finance-anggaran-month-wrap mb-4 flex flex-wrap gap-4 items-end"><div><label class="input-label">Bulan</label><input type="month" id="finance-anggaran-month" class="input-field" style="max-width:180px" value="${monthVal}" onchange="window.__financeAnggaranMonth=this.value;loadFinanceMasterSheetByTab(currentFinanceTab)" /></div></div>`;
                tableWrap.innerHTML = `${anggaranNavHtml}${monthPickerHtml}<div class="table-responsive table-responsive--fit"><table class="nutri-table w-full finance-table finance-anggaran-table finance-anggaran-table--orange finance-anggaran-table--compact"><thead><tr><th>Hari/Tanggal</th><th>Jml</th><th>Harga</th><th>RAB</th></tr></thead><tbody id="finance-master-sheet-rows">${body}</tbody></table></div>`;
                setTimeout(() => updateAnggaranInsentifTotal(), 50);
            }
            return;
        }

        if (tabKey === 'ref_brg') {
            const tableWrap = contentWrap || rowsEl?.closest('.table-responsive')?.parentElement;
            if (tableWrap) {
                const body = !rows.length ? `<tr><td colspan="4" class="text-muted">Belum ada data.</td></tr>` : rows.map(r => {
                    const kode = financeCellVal(r.cells, 1);
                    const nama = financeCellVal(r.cells, 2);
                    const satuan = financeCellVal(r.cells, 3);
                    return `<tr data-row-no="${r.row_no}">
                        <td><strong>${escapeHtml(kode || '-')}</strong></td>
                        <td>${escapeHtml(nama || '-')}</td>
                        <td>${escapeHtml(satuan || '-')}</td>
                        <td><button class="btn btn-secondary btn-sm" onclick="openFinanceRefBrgEdit(${r.row_no})"><i class="fas fa-pen"></i></button></td>
                    </tr>`;
                }).join('');
                tableWrap.innerHTML = `<div class="table-responsive"><table class="nutri-table w-full finance-table"><thead><tr><th>Kode</th><th>Nama Barang</th><th>Satuan</th><th style="width:60px">Action</th></tr></thead><tbody id="finance-master-sheet-rows">${body}</tbody></table></div>`;
            }
            return;
        }

        const ledgerSheets = ['bku', 'bp_bank', 'bp_petty_cash'];
        const bpAmountSheets = ['bp_bahan', 'bp_operasional', 'bp_fasilitas'];
        if (ledgerSheets.includes(tabKey) || bpAmountSheets.includes(tabKey)) {
            const tableWrap = contentWrap || rowsEl?.closest('.table-responsive')?.parentElement;
            if (tableWrap) {
                const isLedger = ledgerSheets.includes(tabKey);
                const headers = isLedger ? ['Bulan', 'No. Bukti', 'Uraian Transaksi', 'Debet', 'Kredit', 'Saldo'] : ['Bulan', 'No. Bukti', 'Uraian Transaksi', 'Jumlah', 'Keterangan'];
                const body = !rows.length ? `<tr><td colspan="${headers.length + 1}" class="text-muted">Belum ada data.</td></tr>` : rows.slice(0, 100).map(r => {
                    const c1 = financeCellVal(r.cells, 1);
                    const c2 = financeCellVal(r.cells, 2);
                    const c3 = financeCellVal(r.cells, 3);
                    const c4 = financeCellVal(r.cells, 4);
                    const c5 = financeCellVal(r.cells, 5);
                    const c6 = financeCellVal(r.cells, 6);
                    const d = Number(c4) || 0;
                    const k = Number(c5) || 0;
                    const amt = Number(c4) || 0;
                    const rowClass = (c3 || '').toLowerCase().includes('saldo awal') ? 'finance-row-summary' : '';
                    return `<tr data-row-no="${r.row_no}" class="${rowClass}">
                        <td>${escapeHtml(c1 || '-')}</td>
                        <td>${escapeHtml(c2 || '-')}</td>
                        <td style="max-width:260px">${escapeHtml(c3 || '-')}</td>
                        ${isLedger ? `<td class="text-right ${d ? 'text-debit' : ''}">${d ? formatRp(d) : '-'}</td><td class="text-right ${k ? 'text-kredit' : ''}">${k ? formatRp(k) : '-'}</td><td class="text-right">${c6 ? (Number(c6) ? formatRp(Number(c6)) : escapeHtml(c6)) : '-'}</td>` : `<td class="text-right">${amt ? formatRp(amt) : '-'}</td><td>${escapeHtml(c5 || '-')}</td>`}
                    </tr>`;
                }).join('');
                tableWrap.innerHTML = `<div class="table-responsive"><table class="nutri-table w-full finance-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody id="finance-master-sheet-rows">${body}</tbody></table></div>`;
            }
            return;
        }

        if (contentWrap) {
            contentWrap.innerHTML = `<div class="table-responsive"><table class="nutri-table w-full finance-table"><thead><tr><th style="width:80px">Row</th><th>Datasheet</th></tr></thead><tbody id="finance-master-sheet-rows"></tbody></table></div>`;
        }
        const finalRowsEl = document.getElementById('finance-master-sheet-rows');
        if (finalRowsEl) {
            if (!rows.length) {
                finalRowsEl.innerHTML = `<tr><td colspan="2" class="text-muted">Belum ada data untuk sheet ${sheetName}.</td></tr>`;
            } else {
                const body = rows.map(r => {
                    const cells = Array.isArray(r.cells) ? r.cells : [];
                    const nonEmpty = cells
                        .map(c => ({ col: Number(c?.col || 0), value: String(c?.value ?? '') }))
                        .filter(x => Number.isFinite(x.col) && x.col > 0 && x.value.trim() !== '')
                        .sort((a, b) => a.col - b.col);

                    const maxShow = 10;
                    const shown = nonEmpty.slice(0, maxShow);
                    const restCount = Math.max(0, nonEmpty.length - shown.length);

                    const kvHtml = shown.length
                        ? shown.map(x => `<div class="text-sm"><span class="mono">C${x.col}</span>: ${escapeHtml(x.value)}</div>`).join('')
                        : `<div class="text-sm text-muted">Tidak ada nilai</div>`;

                    const more = restCount > 0 ? `<div class="text-sm text-muted">+ ${restCount} kolom lainnya</div>` : '';

                    return `<tr data-row-no="${r.row_no}">
                        <td>${r.row_no}</td>
                        <td>
                            <div class="finance-kv-wrap" style="display:flex;flex-direction:column;gap:2px">
                                ${kvHtml}
                                ${more}
                            </div>
                        </td>
                    </tr>`;
                }).join('');
                finalRowsEl.innerHTML = body;
            }
        }
    } catch (e) {
        if (rowsEl) rowsEl.innerHTML = `<tr><td colspan="2" class="text-muted">Gagal load sheet ${sheetName}: ${e.message}</td></tr>`;
    }
}

function getCurrentFinanceSheetName() {
    return FINANCE_MASTER_SHEET_MAP[String(currentFinanceTab || '').trim()] || 'Menu';
}

function toggleFinanceSheetEditMode() {
    financeSheetEditMode = !financeSheetEditMode;
    loadFinanceMasterSheetByTab(currentFinanceTab);
}

async function saveFinanceSheetRow(rowNo) {
    try {
        const sheet = getCurrentFinanceSheetName();
        const rowEl = document.querySelector(`#finance-master-sheet-rows tr[data-row-no="${rowNo}"]`);
        if (!rowEl) return;
        const inputs = Array.from(rowEl.querySelectorAll('.finance-sheet-cell'));
        const cells = inputs.map(i => ({
            col: Number(i.dataset.col || 0),
            value: String(i.value || '')
        }));
        await api(`/api/finance/import/sheets/${encodeURIComponent(sheet)}/${rowNo}`, 'PUT', { cells });
        notifyUi('success', 'Finance', `Row ${rowNo} tersimpan (${sheet})`);
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal simpan row');
    }
}

async function fetchFinanceCoaOnce() {
    if (typeof window === 'undefined') return [];
    if (window.__financeCoaCache && Array.isArray(window.__financeCoaCache.data)) return window.__financeCoaCache.data;
    const coa = await api('/api/finance/coa');
    window.__financeCoaCache = { data: Array.isArray(coa) ? coa : [] };
    return window.__financeCoaCache.data;
}

function resolveCoaValueToCode(coa, v) {
    const s = String(v ?? '').trim();
    if (!s) return '';
    const byCode = (coa || []).find(a => String(a.account_code || '') === s);
    if (byCode) return byCode.account_code;
    const byName = (coa || []).find(a => String(a.account_name || '') === s);
    if (byName) return byName.account_code;
    return s;
}

function getFinanceSheetNextRowNo(sheetName) {
    const { rows: rowsCache } = getFinanceSheetRowCache();
    const existing = Array.isArray(rowsCache?.[sheetName]) ? rowsCache[sheetName] : [];
    const maxRow = existing.reduce((m, r) => Math.max(m, Number(r?.row_no || 0)), 0);
    return maxRow + 1;
}

async function saveFinanceTransaksiRowFromModal(rowNo) {
    const sheetName = FINANCE_TRANSAKSI_SHEET_NAME;
    try {
        setModalError('');

        const trx_date = String(document.getElementById('f_tx_edit_date')?.value || '').trim();
        const no_bukti = String(document.getElementById('f_tx_edit_no_bukti')?.value || '').trim();
        const uraian = String(document.getElementById('f_tx_edit_uraian')?.value || '').trim();
        const jenis_buku_pembantu = String(document.getElementById('f_tx_edit_jenis_buku_pembantu')?.value || '').trim();
        const akun_penerimaan_pengeluaran = String(document.getElementById('f_tx_edit_akun_pp')?.value || '').trim();
        const akun_kas = String(document.getElementById('f_tx_edit_akun_kas')?.value || '').trim();
        const catatan_pengeluaran = String(document.getElementById('f_tx_edit_catatan')?.value || '').trim();

        const debit = Number(document.getElementById('f_tx_edit_debit')?.value || 0);
        const kredit = Number(document.getElementById('f_tx_edit_kredit')?.value || 0);

        const hasAmount = (debit > 0 || kredit > 0);
        if (debit > 0 && kredit > 0) return setModalError('Isi salah satu: debit atau kredit');
        if (hasAmount && !no_bukti) return setModalError('Nomor bukti wajib diisi');
        if (hasAmount && !uraian) return setModalError('Uraian wajib diisi');
        if (hasAmount && !akun_penerimaan_pengeluaran) return setModalError('Akun penerimaan/pengeluaran wajib diisi');
        if (hasAmount && !akun_kas) return setModalError('Akun kas wajib diisi');

        const { rowCells } = getFinanceSheetRowCache();
        const existingCells = rowCells[`${sheetName}:${rowNo}`] || [];
        const updates = {
            3: trx_date,
            5: no_bukti,
            6: uraian,
            9: jenis_buku_pembantu,
            7: debit > 0 ? String(debit) : '',
            8: kredit > 0 ? String(kredit) : '',
            11: akun_penerimaan_pengeluaran,
            14: akun_kas,
            17: catatan_pengeluaran
        };
        const updatedCells = buildUpdatedCellsPreserve(existingCells, updates);
        await api(`/api/finance/import/sheets/${encodeURIComponent(sheetName)}/${rowNo}`, 'PUT', { cells: updatedCells });
        closeModalUi();
        notifyUi('success', 'Finance', `Transaksi baris ${rowNo} tersimpan`);
        await loadFinanceMasterSheetByTab('transaksi');
    } catch (e) {
        setModalError(e.message || 'Gagal simpan transaksi');
    }
}

async function openFinanceTransaksiEdit(rowNo) {
    const sheetName = FINANCE_TRANSAKSI_SHEET_NAME;
    try {
        const { rowCells } = getFinanceSheetRowCache();
        const cells = rowCells[`${sheetName}:${rowNo}`] || [];

        const trx_date = financeCellVal(cells, 3);
        const no_bukti = financeCellVal(cells, 5);
        const uraian = financeCellVal(cells, 6);
        const jenis_buku_pembantu = financeCellVal(cells, 9);
        const debit = financeCellVal(cells, 7);
        const kredit = financeCellVal(cells, 8);
        const akun_pp_raw = financeCellVal(cells, 11);
        const akun_kas_raw = financeCellVal(cells, 14);
        const catatan_pengeluaran = financeCellVal(cells, 17);

        const coa = await fetchFinanceCoaOnce();
        const akun_pp = resolveCoaValueToCode(coa, akun_pp_raw);
        const akun_kas = resolveCoaValueToCode(coa, akun_kas_raw);

        const jenisOptions = FINANCE_TRANSAKSI_JENIS_BUKU_PEMBANTU_OPTIONS
            .map(v => `<option value="${escapeHtml(v)}" ${String(jenis_buku_pembantu || '') === v ? 'selected' : ''}>${escapeHtml(v)}</option>`)
            .join('');

        const coaOptions = (coa || [])
            .map(a => `<option value="${escapeHtml(a.account_code)}" ${String(akun_pp || '') === String(a.account_code) ? 'selected' : ''}>${escapeHtml(a.account_code)} - ${escapeHtml(a.account_name || '')}</option>`)
            .join('');
        // Build two option sets to keep the selected option correct for each select.
        const coaOptionsForKas = (coa || [])
            .map(a => `<option value="${escapeHtml(a.account_code)}" ${String(akun_kas || '') === String(a.account_code) ? 'selected' : ''}>${escapeHtml(a.account_code)} - ${escapeHtml(a.account_name || '')}</option>`)
            .join('');

        openModalUi({
            title: `Edit Transaksi (Row ${rowNo})`,
            bodyHtml: `
                <div class="form-grid">
                    <div><label class="input-label">Tanggal</label><input id="f_tx_edit_date" class="input-field" type="date" value="${escapeHtml(toDateInputValue(trx_date))}" /></div>
                    <div><label class="input-label">Nomor Bukti</label><input id="f_tx_edit_no_bukti" class="input-field" placeholder="INV-001/...." value="${escapeHtml(no_bukti)}" /></div>
                    <div class="form-full"><label class="input-label">Uraian Transaksi</label><input id="f_tx_edit_uraian" class="input-field" placeholder="Pembelian bahan baku minggu ke-1" value="${escapeHtml(uraian)}" /></div>

                    <div>
                        <label class="input-label">Jenis Buku Pembantu</label>
                        <select id="f_tx_edit_jenis_buku_pembantu" class="input-field">${jenisOptions}</select>
                    </div>

                    <div>
                        <label class="input-label">Akun Penerimaan/Pengeluaran</label>
                        <select id="f_tx_edit_akun_pp" class="input-field">${coaOptions}</select>
                    </div>
                    <div>
                        <label class="input-label">Akun Kas</label>
                        <select id="f_tx_edit_akun_kas" class="input-field">${coaOptionsForKas}</select>
                    </div>

                    <div><label class="input-label">Debit</label><input id="f_tx_edit_debit" class="input-field" type="number" min="0" step="0.01" value="${escapeHtml(debit)}" /></div>
                    <div><label class="input-label">Kredit</label><input id="f_tx_edit_kredit" class="input-field" type="number" min="0" step="0.01" value="${escapeHtml(kredit)}" /></div>
                    <div class="form-full"><label class="input-label">Catatan Pengeluaran</label><input id="f_tx_edit_catatan" class="input-field" placeholder="Opsional" value="${escapeHtml(catatan_pengeluaran)}" /></div>
                </div>
                <div class="text-sm text-muted mt-2">Isi salah satu nilai: debit atau kredit. Jika keduanya 0, baris ini akan menghapus jurnal terkait (jika ada).</div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                {
                    label: 'Simpan',
                    className: 'btn btn-primary btn-sm',
                    onClick: async () => { await saveFinanceTransaksiRowFromModal(rowNo); }
                }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal membuka form edit transaksi');
    }
}

async function saveFinanceTransaksiCell(inputEl) {
    if (!inputEl) return;
    const sheet = inputEl.getAttribute('data-sheet') || 'Transaksi';
    const rowNo = Number(inputEl.getAttribute('data-row') || 0);
    const col = Number(inputEl.getAttribute('data-col') || 0);
    if (!sheet || !rowNo || !col) return;
    const row = inputEl.closest('tr.finance-transaksi-row');
    const updates = {};
    if (row) {
        for (let c = 1; c <= 7; c++) {
            const el = row.querySelector(`[data-col="${c}"]`);
            if (el) updates[c] = el.tagName === 'SELECT' ? el.value : String(el.value ?? '').trim();
        }
    } else {
        const val = inputEl.tagName === 'SELECT' ? inputEl.value : String(inputEl.value ?? '').trim();
        updates[col] = val;
    }
    try {
        const { rowCells } = getFinanceSheetRowCache();
        const key = `${sheet}:${rowNo}`;
        const existingCells = rowCells[key] || [];
        const updatedCells = buildUpdatedCellsPreserve(existingCells, updates);
        await api(`/api/finance/import/sheets/${encodeURIComponent(sheet)}/${rowNo}`, 'PUT', { cells: updatedCells });
        rowCells[key] = updatedCells;
        notifyUi('success', 'Finance', 'Tersimpan');
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal simpan');
    }
}

function addTransaksiRow() {
    const tbody = document.getElementById('finance-master-sheet-rows');
    if (!tbody) return;
    const sheet = 'Transaksi';
    const existingRows = Array.from(tbody.querySelectorAll('tr.finance-transaksi-row'));
    const maxRow = existingRows.reduce((m, tr) => Math.max(m, Number(tr.getAttribute('data-row-no') || 0)), 0);
    const nextRow = maxRow + 1;
    const today = new Date().toISOString().slice(0, 10);
    const jenisSel = FINANCE_TRANSAKSI_JENIS_BUKU_PEMBANTU_OPTIONS.map(j => `<option value="${escapeHtml(j)}">${escapeHtml(j)}</option>`).join('');
    const akunSel = FINANCE_TRANSAKSI_AKUN_DROPDOWN_OPTIONS.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    const html = `<tr data-row-no="${nextRow}" class="finance-transaksi-row">
        <td><input type="date" class="input-field input-sm finance-transaksi-cell" data-sheet="${escapeHtml(sheet)}" data-row="${nextRow}" data-col="1" value="${today}" onchange="saveFinanceTransaksiCell(this)" /></td>
        <td><input type="text" class="input-field input-sm finance-transaksi-cell" data-sheet="${escapeHtml(sheet)}" data-row="${nextRow}" data-col="2" placeholder="No. Bukti" onchange="saveFinanceTransaksiCell(this)" /></td>
        <td style="min-width:200px"><input type="text" class="input-field input-sm finance-transaksi-cell w-full" data-sheet="${escapeHtml(sheet)}" data-row="${nextRow}" data-col="3" placeholder="Uraian" onchange="saveFinanceTransaksiCell(this)" /></td>
        <td class="text-right"><input type="number" class="input-field input-sm finance-transaksi-cell text-right" data-sheet="${escapeHtml(sheet)}" data-row="${nextRow}" data-col="4" min="0" step="0.01" placeholder="0" onchange="saveFinanceTransaksiCell(this)" style="color:#1d4ed8;max-width:120px" /></td>
        <td class="text-right"><input type="number" class="input-field input-sm finance-transaksi-cell text-right" data-sheet="${escapeHtml(sheet)}" data-row="${nextRow}" data-col="5" min="0" step="0.01" placeholder="0" onchange="saveFinanceTransaksiCell(this)" style="color:#dc2626;max-width:120px" /></td>
        <td><select class="input-field input-sm finance-transaksi-cell" data-sheet="${escapeHtml(sheet)}" data-row="${nextRow}" data-col="6" onchange="saveFinanceTransaksiCell(this)"><option value="">— Pilih —</option>${jenisSel}</select></td>
        <td><select class="input-field input-sm finance-transaksi-cell" data-sheet="${escapeHtml(sheet)}" data-row="${nextRow}" data-col="7" onchange="saveFinanceTransaksiCell(this)"><option value="">— Pilih —</option>${akunSel}</select></td>
    </tr>`;
    tbody.insertAdjacentHTML('beforeend', html);
}

async function saveFinanceAnggaranCell(inputEl) {
    if (!inputEl) return;
    const sheet = inputEl.getAttribute('data-sheet') || window.__financeAnggaranSheet;
    const rowNo = Number(inputEl.getAttribute('data-row') || 0);
    const col = Number(inputEl.getAttribute('data-col') || 0);
    if (!sheet || !rowNo || !col) return;
    const val = String(inputEl.value ?? '').trim();
    try {
        const { rowCells } = getFinanceSheetRowCache();
        const existingCells = rowCells[`${sheet}:${rowNo}`] || [];
        const updates = { [col]: val };
        const updatedCells = buildUpdatedCellsPreserve(existingCells, updates);
        await api(`/api/finance/import/sheets/${encodeURIComponent(sheet)}/${rowNo}`, 'PUT', { cells: updatedCells });
        rowCells[`${sheet}:${rowNo}`] = updatedCells;
        const tr = inputEl.closest('tr');
        if (tr && col === 2 && inputEl.closest('.finance-anggaran-table--orange')) {
            const jmlInput = tr.querySelector('input[data-col="2"]');
            const hrgInput = tr.querySelector('input[data-col="3"]');
            const rabTd = tr.querySelector('td:nth-child(4)');
            if (jmlInput && hrgInput && rabTd) {
                rabTd.textContent = formatRp((Number(jmlInput.value) || 0) * (Number(hrgInput.value) || 0)) || '-';
            }
        } else if (tr && col === 3 && inputEl.closest('.finance-anggaran-table--orange')) {
            const jmlInput = tr.querySelector('input[data-col="2"]');
            const hrgInput = tr.querySelector('input[data-col="3"]');
            const rabTd = tr.querySelector('td:nth-child(4)');
            if (jmlInput && hrgInput && rabTd) {
                rabTd.textContent = formatRp((Number(jmlInput.value) || 0) * (Number(hrgInput.value) || 0)) || '-';
            }
        }
        notifyUi('success', 'Finance', 'Tersimpan');
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal simpan');
    }
}

function updateAnggaranOperasionalTotal() {
    const tbody = document.getElementById('finance-master-sheet-rows');
    if (!tbody) return;
    const inputs = tbody.querySelectorAll('tr:not(.finance-row-summary) input.finance-anggaran-rab-input');
    let sum = 0;
    inputs.forEach(inp => { sum += Number(inp.value) || 0; });
    const el = document.getElementById('anggaran-operasional-total');
    if (el) el.textContent = formatRp(sum) || '-';
}

function updateAnggaranInsentifTotal() {
    const tbody = document.getElementById('finance-master-sheet-rows');
    if (!tbody) return;
    const spans = tbody.querySelectorAll('.finance-anggaran-rab-insentif');
    let sum = 0;
    spans.forEach(span => {
        const m = (span.textContent || '').replace(/\D/g, '');
        if (m) sum += Number(m);
    });
    const el = document.getElementById('anggaran-insentif-total');
    if (el) el.textContent = formatRp(sum) || '-';
}

function recalcInsentifRab(inputEl) {
    const tr = inputEl?.closest('tr');
    if (!tr) return;
    const jml = Number(tr.querySelector('input[data-col="2"]')?.value) || 0;
    const hrg = Number(tr.querySelector('input[data-col="3"]')?.value) || 0;
    const span = tr.querySelector('.finance-anggaran-rab-insentif');
    if (span) span.textContent = formatRp(jml * hrg) || '-';
    updateAnggaranInsentifTotal();
}

function updateAnggaranBahanTotal() {
    const tbody = document.getElementById('finance-master-sheet-rows');
    if (!tbody) return;
    const rabSpans = tbody.querySelectorAll('tr:not(.finance-row-header):not(.finance-row-summary) .finance-anggaran-rab');
    let sum = 0;
    rabSpans.forEach(span => {
        const txt = span.textContent || '';
        const m = txt.replace(/\D/g, '');
        if (m) sum += Number(m);
    });
    const el = document.getElementById('anggaran-bahan-total');
    if (el) el.textContent = formatRp(sum) || '-';
}

function recalcBahanRab(inputEl) {
    const tr = inputEl?.closest('tr');
    if (!tr) return;
    const getVal = (col) => {
        const inp = tr.querySelector(`input[data-col="${col}"]`);
        return inp ? (Number(inp.value) || 0) : 0;
    };
    const g1 = getVal(3) + getVal(4) + getVal(8);
    const g2 = getVal(5) + getVal(6) + getVal(7) + getVal(9) + getVal(10);
    const h1 = getVal(11) || 8000, h2 = getVal(12) || 10000;
    const rab = g1 * h1 + g2 * h2;
    const total = g1 + g2;
    const rabSpan = tr.querySelector('.finance-anggaran-rab');
    const jmlTd = tr.querySelector('td:nth-child(2)');
    if (rabSpan) rabSpan.textContent = formatRp(rab) || '-';
    if (jmlTd) jmlTd.textContent = total || '-';
    updateAnggaranBahanTotal();
}

async function saveFinanceSaldoBukuRowFromModal(rowNo) {
    const sheetName = FINANCE_SALDO_BUKU_SHEET_NAME;
    try {
        setModalError('');

        const code = String(document.getElementById('f_sb_edit_code')?.value || '').trim();
        const name = String(document.getElementById('f_sb_edit_name')?.value || '').trim();
        const saldoAwal = String(document.getElementById('f_sb_edit_saldo_awal')?.value || '').trim();

        if (!code) return setModalError('Kode akun wajib diisi');
        if (!name) return setModalError('Nama akun wajib diisi');

        const { rowCells } = getFinanceSheetRowCache();
        const existingCells = rowCells[`${sheetName}:${rowNo}`] || [];
        const updates = { 2: code, 3: name, 4: saldoAwal };
        const updatedCells = buildUpdatedCellsPreserve(existingCells, updates);

        await api(`/api/finance/import/sheets/${encodeURIComponent(sheetName)}/${rowNo}`, 'PUT', { cells: updatedCells });
        closeModalUi();
        notifyUi('success', 'Finance', `Saldo Buku baris ${rowNo} tersimpan`);
        await loadFinanceMasterSheetByTab('saldo_buku');
    } catch (e) {
        setModalError(e.message || 'Gagal simpan saldo buku');
    }
}

function runCekSaldo() {
    const tbody = document.getElementById('finance-master-sheet-rows');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-row-no]');
    const codeToVal = {};
    const sheetName = FINANCE_SALDO_BUKU_SHEET_NAME;
    const { rowCells } = getFinanceSheetRowCache();
    for (const tr of rows) {
        const code = String((tr.querySelector('td:first-child')?.textContent || '')).trim();
        if (!code || !/^\d{4}$/.test(code)) continue;
        if (code.endsWith('00')) continue;
        const rowNo = Number(tr.getAttribute('data-row-no') || 0);
        const cells = rowNo ? (rowCells[`${sheetName}:${rowNo}`] || []) : [];
        const val = Number(financeCellVal(cells, 4)) || 0;
        codeToVal[code] = val;
    }
    const pettyCash = codeToVal['1101'] || 0;
    const kasDiBank = codeToVal['1102'] || 0;
    const danaBanper = codeToVal['2110'] || 0;
    const bahanBaku = codeToVal['2120'] || 0;
    const operasional = codeToVal['2130'] || 0;
    const insentifFasilitas = codeToVal['2140'] || 0;
    const bku = pettyCash + kasDiBank;
    const bpKas = pettyCash + kasDiBank;
    const bpBanper = danaBanper + bahanBaku + operasional + insentifFasilitas;
    const resultsEl = document.getElementById('cek-saldo-results-area');
    const bkuEl = document.getElementById('cek-bku');
    const bpKasEl = document.getElementById('cek-bp-kas');
    const bpBanperEl = document.getElementById('cek-bp-banper');
    const statusEl = document.getElementById('cek-status');
    if (resultsEl) { resultsEl.classList.remove('hidden'); resultsEl.style.display = 'block'; }
    if (bkuEl) bkuEl.textContent = formatRp(bku);
    if (bpKasEl) bpKasEl.textContent = formatRp(bpKas);
    if (bpBanperEl) bpBanperEl.textContent = formatRp(bpBanper);
    if (statusEl) {
        const ok = bku === bpKas && bku === bpBanper;
        statusEl.textContent = ok ? 'Oke, Cocok' : 'Tidak cocok – periksa saldo';
        statusEl.className = 'mt-2 ' + (ok ? 'finance-cek-saldo__ok' : 'finance-cek-saldo__err');
    }
}

async function openFinanceSaldoBukuEdit(rowNo) {
    const sheetName = FINANCE_SALDO_BUKU_SHEET_NAME;
    try {
        const { rowCells } = getFinanceSheetRowCache();
        const cells = rowCells[`${sheetName}:${rowNo}`] || [];

        const code = financeCellVal(cells, 2);
        const name = financeCellVal(cells, 3);
        const saldoAwal = financeCellVal(cells, 4);

        openModalUi({
            title: `Edit Saldo Buku (Row ${rowNo})`,
            bodyHtml: `
                <div class="form-grid">
                    <div><label class="input-label">Kode Akun</label><input id="f_sb_edit_code" class="input-field" placeholder="5104" value="${escapeHtml(code)}" /></div>
                    <div><label class="input-label">Nama Akun</label><input id="f_sb_edit_name" class="input-field" placeholder="Biaya Lain-lain" value="${escapeHtml(name)}" /></div>
                    <div class="form-full"><label class="input-label">Saldo Awal</label><input id="f_sb_edit_saldo_awal" class="input-field" type="number" min="0" step="0.01" placeholder="0" value="${escapeHtml(saldoAwal)}" /></div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => { await saveFinanceSaldoBukuRowFromModal(rowNo); } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal membuka form edit saldo buku');
    }
}

async function openFinanceSaldoBukuCreate() {
    const sheetName = FINANCE_SALDO_BUKU_SHEET_NAME;
    const nextRowNo = getFinanceSheetNextRowNo(sheetName);
    openModalUi({
        title: `Tambah Saldo Buku (Row ${nextRowNo})`,
        bodyHtml: `
            <div class="form-grid">
                <div><label class="input-label">Kode Akun</label><input id="f_sb_edit_code" class="input-field" placeholder="5104" value="" /></div>
                <div><label class="input-label">Nama Akun</label><input id="f_sb_edit_name" class="input-field" placeholder="Biaya Lain-lain" value="" /></div>
                <div class="form-full"><label class="input-label">Saldo Awal</label><input id="f_sb_edit_saldo_awal" class="input-field" type="number" min="0" step="0.01" placeholder="0" value="" /></div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => { await saveFinanceSaldoBukuRowFromModal(nextRowNo); } }
        ]
    });
}

async function saveFinanceRefBrgRowFromModal(rowNo) {
    const sheetName = FINANCE_REF_BRG_SHEET_NAME;
    try {
        setModalError('');

        const kode = String(document.getElementById('f_ref_edit_kode')?.value || '').trim();
        const nama = String(document.getElementById('f_ref_edit_nama')?.value || '').trim();
        const satuan = String(document.getElementById('f_ref_edit_satuan')?.value || '').trim();

        if (!kode) return setModalError('Kode barang wajib diisi');
        if (!nama) return setModalError('Nama barang wajib diisi');

        const { rowCells } = getFinanceSheetRowCache();
        const existingCells = rowCells[`${sheetName}:${rowNo}`] || [];
        const updates = { 1: kode, 2: nama, 3: satuan };
        const updatedCells = buildUpdatedCellsPreserve(existingCells, updates);

        await api(`/api/finance/import/sheets/${encodeURIComponent(sheetName)}/${rowNo}`, 'PUT', { cells: updatedCells });
        closeModalUi();
        notifyUi('success', 'Finance', `Ref Brg baris ${rowNo} tersimpan`);
        await loadFinanceMasterSheetByTab('ref_brg');
    } catch (e) {
        setModalError(e.message || 'Gagal simpan Ref Brg');
    }
}

async function openFinanceRefBrgEdit(rowNo) {
    const sheetName = FINANCE_REF_BRG_SHEET_NAME;
    try {
        const { rowCells } = getFinanceSheetRowCache();
        const cells = rowCells[`${sheetName}:${rowNo}`] || [];

        const kode = financeCellVal(cells, 1);
        const nama = financeCellVal(cells, 2);
        const satuan = financeCellVal(cells, 3);

        openModalUi({
            title: `Edit Ref Brg (Row ${rowNo})`,
            bodyHtml: `
                <div class="form-grid">
                    <div><label class="input-label">Kode Barang</label><input id="f_ref_edit_kode" class="input-field" placeholder="BRG.001" value="${escapeHtml(kode)}" /></div>
                    <div><label class="input-label">Nama Barang</label><input id="f_ref_edit_nama" class="input-field" placeholder="Beras" value="${escapeHtml(nama)}" /></div>
                    <div class="form-full"><label class="input-label">Satuan</label><input id="f_ref_edit_satuan" class="input-field" placeholder="kg" value="${escapeHtml(satuan)}" /></div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => { await saveFinanceRefBrgRowFromModal(rowNo); } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal membuka form edit Ref Brg');
    }
}

async function openFinanceRefBrgCreate() {
    const sheetName = FINANCE_REF_BRG_SHEET_NAME;
    const nextRowNo = getFinanceSheetNextRowNo(sheetName);
    openModalUi({
        title: `Tambah Ref Brg (Row ${nextRowNo})`,
        bodyHtml: `
            <div class="form-grid">
                <div><label class="input-label">Kode Barang</label><input id="f_ref_edit_kode" class="input-field" placeholder="BRG.001" value="" /></div>
                <div><label class="input-label">Nama Barang</label><input id="f_ref_edit_nama" class="input-field" placeholder="Beras" value="" /></div>
                <div class="form-full"><label class="input-label">Satuan</label><input id="f_ref_edit_satuan" class="input-field" placeholder="kg" value="" /></div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => { await saveFinanceRefBrgRowFromModal(nextRowNo); } }
        ]
    });
}

function openFinanceSheetRowEditor(sheetName, rowNo) {
    try {
        const safeSheet = String(sheetName || '').trim();
        const safeRowNo = Number(rowNo || 0);
        if (!safeSheet || !Number.isFinite(safeRowNo) || safeRowNo <= 0) {
            notifyUi('danger', 'Finance', 'Invalid sheet/row');
            return;
        }

        const { rowCells } = getFinanceSheetRowCache();
        const existingCells = rowCells[`${safeSheet}:${safeRowNo}`] || [];

        const nonEmptyCols = (existingCells || [])
            .map(c => ({ col: Number(c?.col || 0), value: String(c?.value ?? '') }))
            .filter(x => Number.isFinite(x.col) && x.col > 0)
            .sort((a, b) => a.col - b.col);

        const inputs = nonEmptyCols.length
            ? nonEmptyCols.map((x, idx) => {
                const id = `f_gre_col_${x.col}`;
                return `
                    <div class="form-full">
                        <label class="input-label">Kolom C${x.col}</label>
                        <input id="${id}" class="input-field" value="${escapeHtml(x.value)}" />
                    </div>
                `;
            }).join('')
            : `<div class="text-sm text-muted">Row tidak punya nilai tersimpan. Kamu bisa tambah kolom baru di bawah.</div>`;

        openModalUi({
            title: `Edit Sheet ${safeSheet} (Row ${safeRowNo})`,
            bodyHtml: `
                <div class="text-sm text-muted mb-2">
                    Editor ini menyimpan perubahan ke <span class="mono">lapkeu_sheet_rows</span>. Untuk sheet resmi yang sudah punya handler khusus (Transaksi/Saldo Buku/Ref_Brg/Setup), mapping-nya akan ter-update dan memengaruhi report.
                </div>
                <div class="form-grid">
                    ${inputs}
                </div>
                <div style="margin-top:12px" class="hr-line"></div>
                <div class="form-grid" style="margin-top:12px">
                    <div>
                        <label class="input-label">Tambah Kolom (col)</label>
                        <input id="f_gre_new_col" class="input-field" type="number" min="1" step="1" placeholder="contoh: 3" />
                    </div>
                    <div class="form-full">
                        <label class="input-label">Nilai Kolom</label>
                        <input id="f_gre_new_val" class="input-field" type="text" placeholder="Isi nilai" />
                    </div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                {
                    label: 'Simpan',
                    className: 'btn btn-primary btn-sm',
                    onClick: async () => {
                        try {
                            setModalError('');
                            const updatesByCol = {};
                            for (const x of nonEmptyCols) {
                                const id = `f_gre_col_${x.col}`;
                                const el = document.getElementById(id);
                                if (!el) continue;
                                updatesByCol[x.col] = String(el.value ?? '');
                            }

                            const newColRaw = document.getElementById('f_gre_new_col')?.value;
                            const newCol = Number(newColRaw || 0);
                            const newVal = String(document.getElementById('f_gre_new_val')?.value ?? '');
                            if (Number.isFinite(newCol) && newCol > 0 && newVal.trim() !== '') {
                                updatesByCol[newCol] = newVal;
                            }

                            const updatedCells = buildUpdatedCellsPreserve(existingCells, updatesByCol);
                            await api(`/api/finance/import/sheets/${encodeURIComponent(safeSheet)}/${safeRowNo}`, 'PUT', { cells: updatedCells });
                            closeModalUi();
                            notifyUi('success', 'Finance', `Row ${safeRowNo} tersimpan (${safeSheet})`);
                            await loadFinanceMasterSheetByTab(currentFinanceTab);
                        } catch (e) {
                            setModalError(e.message || 'Gagal simpan');
                        }
                    }
                }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal membuka editor');
    }
}

function addFinanceSheetRow() {
    const rowsEl = document.getElementById('finance-master-sheet-rows');
    if (!rowsEl) return;
    const rows = Array.from(rowsEl.querySelectorAll('tr[data-row-no]'));
    const maxRow = rows.reduce((m, r) => Math.max(m, Number(r.getAttribute('data-row-no') || 0)), 0);
    const next = maxRow + 1;
    if (!financeSheetEditMode) financeSheetEditMode = true;
    loadFinanceMasterSheetByTab(currentFinanceTab).then(() => {
        const rows2 = Array.from(rowsEl.querySelectorAll('tr[data-row-no]'));
        const colCount = Math.max(8, (rows2[0]?.querySelectorAll('.finance-sheet-cell').length || 8));
        const tdInputs = Array.from({ length: colCount }).map((_, i) => `<td><input class="input-field finance-sheet-cell" data-col="${i + 1}" value="" style="min-width:120px"/></td>`).join('');
        rowsEl.insertAdjacentHTML('beforeend', `<tr data-row-no="${next}"><td>${next}</td>${tdInputs}<td><button class="btn btn-primary btn-sm" onclick="saveFinanceSheetRow(${next})">Simpan</button></td></tr>`);
    });
}

function openFinanceSetupQuickEdit() {
    switchFinanceTab('setup');
}

async function clearAnggaranOperasionalKeterangan() {
    try {
        const res = await api('/api/finance/clear-anggaran-op-keterangan', 'POST', {});
        const { rowCells, rows } = getFinanceSheetRowCache();
        for (const key of Object.keys(rowCells)) {
            if (key.startsWith('Anggaran Operasional:') || key.startsWith('Operasional:')) delete rowCells[key];
        }
        delete rows['Anggaran Operasional'];
        delete rows['Operasional'];
        notifyUi('success', 'Finance', `Data keterangan di Anggaran Operasional telah dibersihkan (${res.updated || 0} baris)`);
        await loadFinanceMasterSheetByTab('anggaran_operasional', true);
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal bersihkan keterangan');
    }
}

function findSetupKeyForField(field, setupRows) {
    const key = String(field.key || '').trim();
    const aliases = Array.isArray(field.keyAliases) ? field.keyAliases : [];
    const allKeys = [key, ...aliases];
    for (const k of allKeys) {
        const found = setupRows.find(r => String(r.item_key || '').trim() === k);
        if (found) return found.item_key;
    }
    return key;
}

async function loadFinanceSetup() {
    const statusEl = document.getElementById('finance-setup-status');
    const tbody = document.getElementById('finance-setup-form-body');
    if (!statusEl || !tbody) return;

    statusEl.textContent = 'Loading...';
    tbody.innerHTML = '<tr><td colspan="2" class="text-muted">Memuat setup...</td></tr>';
    try {
        const [rows, coverage, reco] = await Promise.all([
            api('/api/finance/setup'),
            api('/api/finance/coverage'),
            api('/api/finance/reconciliation-check')
        ]);
        const headerInfo = [
            `Sheet coverage: ${coverage?.implemented?.extracted_all_sheets ? 'lengkap' : 'belum lengkap'}`,
            `TB balanced: ${reco?.trial_balance?.balanced ? 'YA' : 'TIDAK'}`,
            `BS balanced: ${reco?.balance_sheet?.balanced ? 'YA' : 'TIDAK'}`,
            `Stock non-negative: ${reco?.stock?.all_non_negative ? 'YA' : 'TIDAK'}`
        ].join(' | ');

        const setupRows = Array.isArray(rows) ? rows : [];
        window.__financeSetupCache = setupRows;
        window.__financeSetupKeyMap = {};
        statusEl.textContent = headerInfo;

        const setupByKey = Object.fromEntries(setupRows.map(r => [String(r.item_key || '').trim(), String(r.item_value || '')]));

        let html = '';
        for (const field of FINANCE_SETUP_FIELDS) {
            const dbKey = findSetupKeyForField(field, setupRows);
            window.__financeSetupKeyMap[field.key] = dbKey;
            const value = setupByKey[dbKey] ?? '';
            const inputId = `f_setup_${field.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const hintHtml = field.hint ? ` <span class="finance-setup-hint">${escapeHtml(field.hint)}</span>` : '';
            const placeholder = field.placeholder || '';
            const inputType = field.type === 'number' ? 'number' : 'text';
            html += `
                <tr class="finance-setup-row">
                    <td class="finance-setup-td-item">
                        <label for="${inputId}" class="finance-setup-label">${escapeHtml(field.label)}</label>${hintHtml}
                    </td>
                    <td class="finance-setup-td-uraian">
                        <input id="${inputId}" type="${inputType}" class="finance-setup-input input-field" data-setup-key="${escapeHtml(dbKey)}"
                            value="${escapeHtml(String(value ?? ''))}" placeholder="${escapeHtml(placeholder)}" />
                    </td>
                </tr>`;
        }
        tbody.innerHTML = html || '<tr><td colspan="2" class="text-muted">Belum ada field setup.</td></tr>';
    } catch (e) {
        statusEl.textContent = `Gagal load setup: ${e.message}`;
        tbody.innerHTML = `<tr><td colspan="2" class="text-muted">Error: ${escapeHtml(e.message)}</td></tr>`;
    }
}

async function saveFinanceSetupForm() {
    const tbody = document.getElementById('finance-setup-form-body');
    if (!tbody) return;
    const inputs = tbody.querySelectorAll('.finance-setup-input[data-setup-key]');
    if (!inputs.length) return notifyUi('warning', 'Finance', 'Tidak ada data untuk disimpan');

    const updates = [];
    for (const el of inputs) {
        const key = el.getAttribute('data-setup-key');
        const value = String(el.value ?? '').trim();
        if (!key) continue;
        updates.push({ key, value });
    }
    if (!updates.length) return notifyUi('warning', 'Finance', 'Tidak ada data untuk disimpan');

    try {
        const res = await api('/api/finance/setup/batch', 'PUT', { updates });
        notifyUi('success', 'Finance', 'Setup berhasil disimpan');
        const rows = Array.isArray(res?.rows) ? res.rows : [];
        if (rows.length) {
            window.__financeSetupCache = rows;
            const setupByKey = Object.fromEntries(rows.map(r => [String(r.item_key || '').trim(), String(r.item_value || '')]));
            for (const el of inputs) {
                const key = el.getAttribute('data-setup-key');
                if (!key) continue;
                el.value = setupByKey[key] ?? '';
            }
        }
        // Jangan panggil loadFinanceSetup() - form sudah di-update dari response PUT.
        // Refetch bisa menimpa dengan data lama jika ada inkonsistensi DB.
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal simpan setup');
    }
}

async function loadFinanceCoa() {
    const tbody = document.getElementById('finance-coa-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api('/api/finance/coa');
        const html = (rows || []).map(r => `<tr>
            <td>${r.account_code || '-'}</td>
            <td>${r.account_name || '-'}</td>
            <td>${r.account_group || '-'}</td>
            <td>${r.normal_balance || '-'}</td>
            <td>${Number(r.is_active || 0) ? 'ACTIVE' : 'DISABLED'}</td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="5" class="text-muted">Belum ada akun</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Gagal load CoA: ${e.message}</td></tr>`;
    }
}

async function loadFinanceJournals() {
    const tbody = document.getElementById('finance-journal-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api('/api/finance/journals?limit=150');
        const html = (rows || []).map(r => `<tr>
            <td>${formatDateTime(r.journal_date)}</td>
            <td>${r.journal_no || '-'}</td>
            <td>${r.description || '-'}</td>
            <td>${r.status || '-'}</td>
            <td>${formatRp(r.total_debit || 0)}</td>
            <td>${formatRp(r.total_credit || 0)}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="openJournalDetail('${r.id}')">Detail</button>
                ${String(r.status || '').toUpperCase() === 'DRAFT' ? `<button class="btn btn-primary btn-sm" style="margin-left:6px" onclick="postJournal('${r.id}')">Post</button>` : ''}
            </td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="7" class="text-muted">Belum ada jurnal</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Gagal load jurnal: ${e.message}</td></tr>`;
    }
}

async function loadFinanceLedger() {
    const tbody = document.getElementById('finance-ledger-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api('/api/finance/ledger');
        const html = (rows || []).slice(-300).reverse().map(r => `<tr>
            <td>${formatDateTime(r.journal_date)}</td>
            <td>${r.journal_no || '-'}</td>
            <td>${r.account_code || ''} - ${r.account_name || ''}</td>
            <td>${r.memo || '-'}</td>
            <td>${formatRp(r.debit || 0)}</td>
            <td>${formatRp(r.credit || 0)}</td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="6" class="text-muted">Belum ada ledger</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Gagal load ledger: ${e.message}</td></tr>`;
    }
}

async function loadFinanceTrial() {
    const tbody = document.getElementById('finance-trial-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Loading...</td></tr>`;
    try {
        const data = await api('/api/finance/trial-balance');
        const html = (data.items || []).map(r => `<tr>
            <td>${r.account_code || '-'}</td>
            <td>${r.account_name || '-'}</td>
            <td>${formatRp(r.debit || 0)}</td>
            <td>${formatRp(r.credit || 0)}</td>
            <td>${formatRp(r.balance || 0)}</td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="5" class="text-muted">Belum ada data</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Gagal load trial balance: ${e.message}</td></tr>`;
    }
}

async function loadFinanceLr() {
    const box = document.getElementById('finance-lr-body');
    if (!box) return;
    box.textContent = 'Loading...';
    try {
        const d = await api('/api/finance/reports/lr');
        box.innerHTML = `
            <div>Total Penerimaan: <b>${formatRp(d.total_income || 0)}</b></div>
            <div>Total Pengeluaran: <b>${formatRp(d.total_expense || 0)}</b></div>
            <div>Surplus/Defisit: <b>${formatRp(d.net_surplus || 0)}</b></div>
        `;
    } catch (e) {
        box.textContent = `Gagal load LR: ${e.message}`;
    }
}

async function loadFinanceNeraca() {
    const box = document.getElementById('finance-neraca-body');
    if (!box) return;
    box.textContent = 'Loading...';
    try {
        const d = await api('/api/finance/reports/balance-sheet');
        box.innerHTML = `
            <div>Total Asset: <b>${formatRp(d.total_assets || 0)}</b></div>
            <div>Total Liabilities: <b>${formatRp(d.total_liabilities || 0)}</b></div>
            <div>Total Equity: <b>${formatRp(d.total_equity || 0)}</b></div>
            <div>Status Seimbang: <b>${d.balanced ? 'YA' : 'TIDAK'}</b></div>
        `;
    } catch (e) {
        box.textContent = `Gagal load neraca: ${e.message}`;
    }
}

async function loadFinanceCashflow() {
    const box = document.getElementById('finance-cashflow-body');
    if (!box) return;
    box.textContent = 'Loading...';
    try {
        const d = await api('/api/finance/reports/cashflow');
        box.innerHTML = `
            <div>Inflow: <b>${formatRp(d.inflow || 0)}</b></div>
            <div>Outflow: <b>${formatRp(d.outflow || 0)}</b></div>
            <div>Net: <b>${formatRp(d.net || 0)}</b></div>
        `;
    } catch (e) {
        box.textContent = `Gagal load cashflow: ${e.message}`;
    }
}

async function loadFinanceFormal() {
    const lpaBox = document.getElementById('finance-lpa-body');
    const sptjBox = document.getElementById('finance-sptj-body');
    const bapsdBox = document.getElementById('finance-bapsd-body');
    if (lpaBox) lpaBox.textContent = 'Loading...';
    if (sptjBox) sptjBox.textContent = 'Loading...';
    if (bapsdBox) bapsdBox.textContent = 'Loading...';
    try {
        const [lpa, sptj, bapsd] = await Promise.all([
            api('/api/finance/reports/lpa'),
            api('/api/finance/reports/sptj'),
            api('/api/finance/reports/bapsd')
        ]);
        if (lpaBox) lpaBox.innerHTML = `<div>Nama SPPG: ${lpa.lembaga || '-'}</div><div>Dana Pemasukan: <b>${formatRp(lpa.dana_pemasukan || 0)}</b></div><div>Dana Pengeluaran: <b>${formatRp(lpa.dana_pengeluaran || 0)}</b></div><div>Sisa Anggaran: <b>${formatRp(lpa.sisa_anggaran || 0)}</b></div>`;
        if (sptjBox) sptjBox.innerHTML = `<div>Nama: ${sptj.nama_perwakilan || '-'}</div><div>Jabatan: ${sptj.jabatan || '-'}</div><div>Penerimaan: <b>${formatRp(sptj.jumlah_penerimaan || 0)}</b></div><div>Pengeluaran: <b>${formatRp(sptj.jumlah_pengeluaran || 0)}</b></div>`;
        if (bapsdBox) bapsdBox.innerHTML = `<div>Nomor: ${bapsd.nomor || '-'}</div><div>Sisa Dana: <b>${formatRp(bapsd.sisa_dana || 0)}</b></div><div>Pihak 1: ${bapsd.pihak_pertama || '-'}</div><div>Pihak 2: ${bapsd.pihak_kedua || '-'}</div>`;
    } catch (e) {
        if (lpaBox) lpaBox.textContent = `Gagal load: ${e.message}`;
        if (sptjBox) sptjBox.textContent = `Gagal load: ${e.message}`;
        if (bapsdBox) bapsdBox.textContent = `Gagal load: ${e.message}`;
    }
}

async function loadFinanceStock() {
    const rekapBody = document.getElementById('finance-stock-rekap-rows');
    const detailBody = document.getElementById('finance-stock-detail-rows');
    if (rekapBody) rekapBody.innerHTML = `<tr><td colspan="3" class="text-muted">Loading...</td></tr>`;
    if (detailBody) detailBody.innerHTML = `<tr><td colspan="4" class="text-muted">Loading...</td></tr>`;
    try {
        const [rekap, detail] = await Promise.all([
            api('/api/finance/stock/rekap'),
            api('/api/finance/stock/detail')
        ]);
        if (rekapBody) {
            rekapBody.innerHTML = (rekap || []).map(r => `<tr><td>${r.kode || '-'}</td><td>${r.item_count || 0}</td><td>${Number(r.qty_total || 0).toFixed(2)}</td></tr>`).join('') || `<tr><td colspan="3" class="text-muted">Belum ada data</td></tr>`;
        }
        if (detailBody) {
            detailBody.innerHTML = (detail || []).slice(0, 400).map(r => `<tr><td>${r.kode_brg || '-'}</td><td>${r.nama_barang || '-'}</td><td>${r.satuan || '-'}</td><td>${Number(r.saldo_akhir || 0).toFixed(2)}</td></tr>`).join('') || `<tr><td colspan="4" class="text-muted">Belum ada data</td></tr>`;
        }
    } catch (e) {
        if (rekapBody) rekapBody.innerHTML = `<tr><td colspan="3" class="text-muted">Gagal load stock: ${e.message}</td></tr>`;
        if (detailBody) detailBody.innerHTML = `<tr><td colspan="4" class="text-muted">Gagal load stock: ${e.message}</td></tr>`;
    }
}

function buildFinancePrintUrl(docType) {
    const safe = String(docType || '').trim().toLowerCase();
    const fromEl = document.getElementById('finance-sheet-from') || document.getElementById('f_print_from');
    const toEl = document.getElementById('finance-sheet-to') || document.getElementById('f_print_to');
    const lrDetailEl = document.getElementById('f_print_lr_detail');

    const from = fromEl ? String(fromEl.value || '').trim() : '';
    const to = toEl ? String(toEl.value || '').trim() : '';
    const lrDetail = safe === 'lr' && lrDetailEl ? !!lrDetailEl.checked : false;

    const qs = [];
    if (from) qs.push(`from=${encodeURIComponent(from)}`);
    if (to) qs.push(`to=${encodeURIComponent(to)}`);
    if (lrDetail) qs.push(`lr_mode=detail`);

    return `/api/finance/print/${encodeURIComponent(safe)}${qs.length ? `?${qs.join('&')}` : ''}`;
}

async function openFinancePrint(docType) {
    const safe = String(docType || '').trim().toLowerCase();
    if (!safe) return;
    try {
        const html = await api(buildFinancePrintUrl(safe));
        const win = window.open('', '_blank');
        if (!win) {
            notifyUi('warning', 'Finance', 'Popup diblokir browser. Izinkan popup untuk print.');
            return;
        }
        win.document.open();
        win.document.write(String(html || ''));
        win.document.close();
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal membuka print');
    }
}

async function printSelectedSurat() {
    const selected = [];
    const lr = document.getElementById('f_print_lr')?.checked;
    const lpa = document.getElementById('f_print_lpa')?.checked;
    const sptj = document.getElementById('f_print_sptj')?.checked;
    const bapsd = document.getElementById('f_print_bapsd')?.checked;

    if (lr) selected.push('lr');
    if (lpa) selected.push('lpa');
    if (sptj) selected.push('sptj');
    if (bapsd) selected.push('bapsd');

    if (!selected.length) return notifyUi('warning', 'Finance', 'Pilih minimal 1 surat untuk dicetak');

    try {
        const win = window.open('', '_blank');
        if (!win) {
            notifyUi('warning', 'Finance', 'Popup diblokir browser. Izinkan popup untuk print.');
            return;
        }

        win.document.open();
        win.document.write('<!doctype html><html><head><meta charset="utf-8"/><title>Print Surat</title></head><body>');
        for (const doc of selected) {
            const html = await api(buildFinancePrintUrl(doc));
            // Extract inner HTML for the <body> that backend print returns.
            const m = String(html || '').match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const bodyHtml = m && m[1] ? m[1] : String(html || '');
            win.document.write(bodyHtml);
            win.document.write('<hr style="margin:16px 0" />');
        }
        win.document.write('<script>window.focus();</script>');
        win.document.write('</body></html>');
        win.document.close();
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal mencetak surat');
    }
}

function openFinanceSetupEdit(key, value, sourceRow) {
    const safeKey = String(key || '').trim();
    openModalUi({
        title: `Edit Setup: ${safeKey}`,
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Key</label>
                    <input class="input-field" value="${safeKey}" disabled />
                </div>
                <div class="form-full">
                    <label class="input-label">Value</label>
                    <input id="f_setup_value" class="input-field" value="${String(value || '').replace(/"/g, '&quot;')}" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    const newVal = String(document.getElementById('f_setup_value')?.value || '').trim();
                    await api(`/api/finance/setup/${encodeURIComponent(safeKey)}`, 'PUT', { value: newVal, source_row: Number(sourceRow || 0) });
                    closeModalUi();
                    notifyUi('success', 'Finance', 'Setup berhasil diupdate');
                    await loadFinanceSetup();
                } catch (e) {
                    setModalError(e.message || 'Gagal update setup');
                }
            } }
        ]
    });
}

function openCoaCreate() {
    openModalUi({
        title: 'Tambah Akun (CoA)',
        bodyHtml: `
            <div class="form-grid">
                <div><label class="input-label">Kode Akun</label><input id="f_coa_code" class="input-field" placeholder="5104" /></div>
                <div><label class="input-label">Nama Akun</label><input id="f_coa_name" class="input-field" placeholder="Biaya Lain-lain" /></div>
                <div>
                    <label class="input-label">Group</label>
                    <select id="f_coa_group" class="input-field">
                        <option value="ASSET">ASSET</option>
                        <option value="LIABILITY">LIABILITY</option>
                        <option value="EQUITY">EQUITY</option>
                        <option value="INCOME">INCOME</option>
                        <option value="EXPENSE" selected>EXPENSE</option>
                        <option value="OTHER">OTHER</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Normal Balance</label>
                    <select id="f_coa_normal" class="input-field">
                        <option value="DEBIT" selected>DEBIT</option>
                        <option value="CREDIT">CREDIT</option>
                    </select>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    const account_code = String(document.getElementById('f_coa_code')?.value || '').trim();
                    const account_name = String(document.getElementById('f_coa_name')?.value || '').trim();
                    const account_group = String(document.getElementById('f_coa_group')?.value || 'OTHER');
                    const normal_balance = String(document.getElementById('f_coa_normal')?.value || 'DEBIT');
                    if (!account_code || !account_name) return setModalError('Kode dan nama akun wajib diisi');
                    await api('/api/finance/coa', 'POST', { account_code, account_name, account_group, normal_balance, is_active: 1 });
                    closeModalUi();
                    notifyUi('success', 'Finance', 'Akun berhasil ditambahkan');
                    await loadFinanceCoa();
                } catch (e) {
                    setModalError(e.message || 'Gagal tambah akun');
                }
            } }
        ]
    });
}

async function postJournal(id) {
    try {
        await api(`/api/finance/journals/${encodeURIComponent(id)}/post`, 'POST', {});
        notifyUi('success', 'Finance', 'Jurnal berhasil diposting');
        await loadFinanceJournals();
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal posting jurnal');
    }
}

async function openJournalDetail(id) {
    try {
        const d = await api(`/api/finance/journals/${encodeURIComponent(id)}`);
        const lines = (d.lines || []).map(x => `
            <tr>
                <td>${x.line_no}</td>
                <td>${x.account_code || ''}</td>
                <td>${x.account_name || ''}</td>
                <td>${formatRp(x.debit || 0)}</td>
                <td>${formatRp(x.credit || 0)}</td>
                <td>${x.memo || '-'}</td>
            </tr>
        `).join('');
        openModalUi({
            title: `Detail Jurnal: ${d.journal?.journal_no || '-'}`,
            bodyHtml: `
                <div style="margin-bottom:8px">
                    <div><b>Tanggal:</b> ${formatDateTime(d.journal?.journal_date)}</div>
                    <div><b>Status:</b> ${d.journal?.status || '-'}</div>
                    <div><b>Deskripsi:</b> ${d.journal?.description || '-'}</div>
                </div>
                <div class="table-responsive">
                    <table class="nutri-table w-full">
                        <thead><tr><th>Line</th><th>Kode</th><th>Akun</th><th>Debit</th><th>Kredit</th><th>Memo</th></tr></thead>
                        <tbody>${lines || '<tr><td colspan="6" class="text-muted">Tidak ada line</td></tr>'}</tbody>
                    </table>
                </div>
            `,
            actions: [
                { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal load detail jurnal');
    }
}

async function openJournalCreate() {
    try {
        const coa = await api('/api/finance/coa');
        const opts = (coa || []).map(a => `<option value="${a.account_code}">${a.account_code} - ${a.account_name}</option>`).join('');
        const rowHtml = (idx) => `
            <div class="form-grid journal-line" data-idx="${idx}" style="grid-template-columns:2fr 1fr 1fr 2fr; gap:8px; margin-bottom:6px">
                <select class="input-field j_account">${opts}</select>
                <input class="input-field j_debit" type="number" min="0" step="0.01" placeholder="Debit" />
                <input class="input-field j_credit" type="number" min="0" step="0.01" placeholder="Kredit" />
                <input class="input-field j_memo" placeholder="Memo line" />
            </div>
        `;
        openModalUi({
            title: 'Tambah Jurnal',
            bodyHtml: `
                <div class="form-grid">
                    <div><label class="input-label">Tanggal</label><input id="f_j_date" class="input-field" type="date" /></div>
                    <div><label class="input-label">No Jurnal (opsional)</label><input id="f_j_no" class="input-field" placeholder="Auto jika kosong" /></div>
                    <div class="form-full"><label class="input-label">Deskripsi</label><input id="f_j_desc" class="input-field" placeholder="Contoh: Penyesuaian periode" /></div>
                </div>
                <div style="margin-top:10px">
                    <div class="flex justify-between items-center mb-2">
                        <div class="font-bold">Lines</div>
                        <button class="btn btn-secondary btn-sm" type="button" onclick="addJournalLine()"><i class="fas fa-plus"></i> Add Line</button>
                    </div>
                    <div id="journal-lines-wrap">${rowHtml(1)}${rowHtml(2)}</div>
                </div>
                <div class="text-sm text-muted" style="margin-top:8px">Total debit harus sama dengan total kredit.</div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan Draft', className: 'btn btn-primary btn-sm', onClick: async () => { await submitJournal(false); } },
                { label: 'Simpan & Post', className: 'btn btn-success btn-sm', onClick: async () => { await submitJournal(true); } }
            ]
        });

        window.__journalRowTemplate = rowHtml;
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal membuka form jurnal');
    }
}

function addJournalLine() {
    const wrap = document.getElementById('journal-lines-wrap');
    if (!wrap || typeof window.__journalRowTemplate !== 'function') return;
    const count = wrap.querySelectorAll('.journal-line').length + 1;
    wrap.insertAdjacentHTML('beforeend', window.__journalRowTemplate(count));
}

async function submitJournal(autoPost) {
    try {
        setModalError('');
        const dateRaw = String(document.getElementById('f_j_date')?.value || '').trim();
        const journal_date = dateRaw ? new Date(dateRaw + 'T00:00:00').toISOString() : new Date().toISOString();
        const journal_no = String(document.getElementById('f_j_no')?.value || '').trim();
        const description = String(document.getElementById('f_j_desc')?.value || '').trim();
        const wrap = document.getElementById('journal-lines-wrap');
        const lines = [];
        (wrap ? Array.from(wrap.querySelectorAll('.journal-line')) : []).forEach(row => {
            const account_code = String(row.querySelector('.j_account')?.value || '').trim();
            const debit = Number(row.querySelector('.j_debit')?.value || 0);
            const credit = Number(row.querySelector('.j_credit')?.value || 0);
            const memo = String(row.querySelector('.j_memo')?.value || '').trim();
            if (account_code && (debit > 0 || credit > 0)) lines.push({ account_code, debit, credit, memo });
        });
        if (lines.length < 2) return setModalError('Minimal 2 line jurnal');
        await api('/api/finance/journals', 'POST', { journal_no, journal_date, description, lines, auto_post: !!autoPost });
        closeModalUi();
        notifyUi('success', 'Finance', autoPost ? 'Jurnal diposting' : 'Jurnal draft tersimpan');
        await loadFinanceJournals();
        await loadFinance(true);
    } catch (e) {
        setModalError(e.message || 'Gagal simpan jurnal');
    }
}

async function openLapkeuTransaksiInput() {
    try {
        const coa = await api('/api/finance/coa');
        const options = (coa || []).map(a => `<option value="${a.account_code}">${a.account_code} - ${a.account_name}</option>`).join('');
        const today = new Date().toISOString().slice(0, 10);
        openModalUi({
            title: 'Input Transaksi (Sesuai Lapkeu Master)',
            bodyHtml: `
                <div class="form-grid">
                    <div><label class="input-label">Tanggal</label><input id="f_lt_date" class="input-field" type="date" value="${today}" /></div>
                    <div><label class="input-label">Nomor Bukti</label><input id="f_lt_nobukti" class="input-field" placeholder="INV-001/...." /></div>
                    <div class="form-full"><label class="input-label">Uraian Transaksi</label><input id="f_lt_uraian" class="input-field" placeholder="Pembelian bahan baku minggu ke-1" /></div>
                    <div>
                        <label class="input-label">Jenis Buku Pembantu</label>
                        <select id="f_lt_jenis" class="input-field">
                            <option value="Kas di Bank">Kas di Bank</option>
                            <option value="Petty Cash">Petty Cash</option>
                            <option value="Bahan Baku">Bahan Baku</option>
                            <option value="Operasional">Operasional</option>
                            <option value="Insentif Fasilitas">Insentif Fasilitas</option>
                            <option value="Pajak">Pajak</option>
                        </select>
                    </div>
                    <div>
                        <label class="input-label">Akun Penerimaan/Pengeluaran</label>
                        <select id="f_lt_akun_pp" class="input-field">${options}</select>
                    </div>
                    <div>
                        <label class="input-label">Akun Kas</label>
                        <select id="f_lt_akun_kas" class="input-field">${options}</select>
                    </div>
                    <div><label class="input-label">Debit</label><input id="f_lt_debit" class="input-field" type="number" min="0" step="0.01" placeholder="0" /></div>
                    <div><label class="input-label">Kredit</label><input id="f_lt_kredit" class="input-field" type="number" min="0" step="0.01" placeholder="0" /></div>
                    <div class="form-full"><label class="input-label">Catatan Pengeluaran</label><input id="f_lt_catatan" class="input-field" placeholder="Opsional" /></div>
                </div>
                <div class="text-sm text-muted mt-2">Isi salah satu nilai: Debit atau Kredit.</div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setModalError('');
                        const d = String(document.getElementById('f_lt_date')?.value || '').trim();
                        const trx_date = d ? new Date(d + 'T00:00:00').toISOString() : new Date().toISOString();
                        const no_bukti = String(document.getElementById('f_lt_nobukti')?.value || '').trim();
                        const uraian = String(document.getElementById('f_lt_uraian')?.value || '').trim();
                        const jenis_buku_pembantu = String(document.getElementById('f_lt_jenis')?.value || '').trim();
                        const akun_penerimaan_pengeluaran = String(document.getElementById('f_lt_akun_pp')?.value || '').trim();
                        const akun_kas = String(document.getElementById('f_lt_akun_kas')?.value || '').trim();
                        const debit = Number(document.getElementById('f_lt_debit')?.value || 0);
                        const kredit = Number(document.getElementById('f_lt_kredit')?.value || 0);
                        const catatan_pengeluaran = String(document.getElementById('f_lt_catatan')?.value || '').trim();
                        if (!no_bukti) return setModalError('Nomor bukti wajib diisi');
                        if (!uraian) return setModalError('Uraian wajib diisi');
                        if ((debit <= 0 && kredit <= 0) || (debit > 0 && kredit > 0)) return setModalError('Isi salah satu: debit atau kredit');
                        await api('/api/finance/transactions/manual', 'POST', {
                            trx_date,
                            no_bukti,
                            uraian,
                            jenis_buku_pembantu,
                            akun_penerimaan_pengeluaran,
                            akun_kas,
                            debit,
                            kredit,
                            catatan_pengeluaran
                        });
                        closeModalUi();
                        notifyUi('success', 'Finance', 'Transaksi lapkeu berhasil disimpan');
                        await switchFinanceTab('transaksi');
                    } catch (e) {
                        setModalError(e.message || 'Gagal simpan transaksi');
                    }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Finance', e.message || 'Gagal membuka form transaksi');
    }
}

function openExpenseCreate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateDefault = `${yyyy}-${mm}-${dd}`;

    openModalUi({
        title: 'Add Expense',
        bodyHtml: `
            <div class="form-grid">
                <div>
                    <label class="input-label">Category</label>
                    <select id="f_exp_cat" class="input-field">
                        <option value="Purchasing">Purchasing</option>
                        <option value="Operational" selected>Operational</option>
                        <option value="Maintenance">Maintenance</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Amount</label>
                    <input id="f_exp_amt" class="input-field" type="number" min="1" step="1" placeholder="0" />
                </div>
                <div>
                    <label class="input-label">Date</label>
                    <input id="f_exp_date" class="input-field" type="date" value="${dateDefault}" />
                </div>
                <div class="form-full">
                    <label class="input-label">Description</label>
                    <input id="f_exp_desc" class="input-field" placeholder="Contoh: Gas Elpiji" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const category = document.getElementById('f_exp_cat').value;
                    const amount = Number(document.getElementById('f_exp_amt').value || 0);
                    const description = document.getElementById('f_exp_desc').value.trim();
                    const dateStr = document.getElementById('f_exp_date').value;
                    if (!amount) return setModalError('Amount wajib diisi');
                    const date = dateStr ? new Date(dateStr + 'T00:00:00').toISOString() : new Date().toISOString();
                    await api('/api/finance/expense', 'POST', { category, amount, description, date });
                    closeModalUi();
                    notifyUi('success', 'Finance', 'Expense berhasil ditambahkan');
                    await loadFinance();
                    await loadDashboard();
                } catch (e) {
                    setModalError(e.message || 'Gagal tambah expense');
                }
            } }
        ]
    });
}

async function createExpense(category, amount, description) {
    try {
        await api('/api/finance/expense', 'POST', { category, amount, description });
        await loadFinance();
        await loadDashboard();
    } catch (e) {
        notifyUi('danger', 'Finance', 'Gagal tambah expense: ' + e.message);
    }
}

async function loadPurchases() {
    const tbody = document.getElementById('purchases-rows');
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Loading...</td></tr>`;
    try {
        const start = (document.getElementById('pur_start') && document.getElementById('pur_start').value) ? document.getElementById('pur_start').value : '';
        const end = (document.getElementById('pur_end') && document.getElementById('pur_end').value) ? document.getElementById('pur_end').value : '';
        let url = '/api/purchases';
        if (start && end) url += `?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
        const rows = await api(url);
        const html = (rows || []).map(p => `<tr>
            <td>${formatDateTime(p.purchase_date)}</td>
            <td>${p.ingredient_name || '-'}</td>
            <td>${(p.quantity || 0)} ${p.unit || ''}</td>
            <td>${formatRp(p.unit_price || 0)}</td>
            <td>${formatRp(p.total_price || 0)}</td>
            <td>${p.notes || ''}</td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="6" class="text-muted">Belum ada purchase</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Gagal load purchases: ${e.message}</td></tr>`;
    }
}

function clearPurchasesFilter() {
    if (document.getElementById('pur_start')) document.getElementById('pur_start').value = '';
    if (document.getElementById('pur_end')) document.getElementById('pur_end').value = '';
    loadPurchases();
}

async function openPurchaseCreate() {
    try {
        const ings = await api('/api/ingredients');
        if (!ings || !ings.length) return notifyUi('warning', 'Purchases', 'Tidak ada ingredient. Tambah dulu di Ingredients.');

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateDefault = `${yyyy}-${mm}-${dd}`;

        const opt = (ings || []).map(i => `<option value="${i.id}">${i.name} (${i.unit || '-'})</option>`).join('');
        openModalUi({
            title: 'New Purchase',
            bodyHtml: `
                <div class="form-grid">
                    <div class="form-full">
                        <label class="input-label">Ingredient</label>
                        <select id="f_pur_ing" class="input-field">${opt}</select>
                    </div>
                    <div>
                        <label class="input-label">Quantity</label>
                        <input id="f_pur_qty" class="input-field" type="number" min="0.01" step="0.01" placeholder="0" />
                    </div>
                    <div>
                        <label class="input-label">Total Price</label>
                        <input id="f_pur_total" class="input-field" type="number" min="1" step="1" placeholder="0" />
                    </div>
                    <div>
                        <label class="input-label">Purchase Date</label>
                        <input id="f_pur_date" class="input-field" type="date" value="${dateDefault}" />
                    </div>
                    <div class="form-full">
                        <label class="input-label">Notes</label>
                        <input id="f_pur_notes" class="input-field" placeholder="Opsional" />
                    </div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setModalError('');
                        const ingredient_id = document.getElementById('f_pur_ing').value;
                        const quantity = Number(document.getElementById('f_pur_qty').value || 0);
                        const total_price = Number(document.getElementById('f_pur_total').value || 0);
                        const notes = document.getElementById('f_pur_notes').value.trim();
                        const d = document.getElementById('f_pur_date').value;
                        if (!ingredient_id) return setModalError('Ingredient wajib dipilih');
                        if (!quantity) return setModalError('Quantity wajib diisi');
                        if (!total_price) return setModalError('Total price wajib diisi');
                        const purchase_date = d ? new Date(d + 'T00:00:00').toISOString() : new Date().toISOString();
                        await api('/api/purchases', 'POST', { ingredient_id, quantity, total_price, notes, purchase_date });
                        closeModalUi();
                        notifyUi('success', 'Purchases', 'Purchase berhasil ditambahkan');
                        await loadPurchases();
                        if (typeof loadIngredients === 'function') await loadIngredients();
                        if (typeof loadInventory === 'function') await loadInventory();
                        await loadDashboard();
                    } catch (e) {
                        setModalError(e.message || 'Gagal tambah purchase');
                    }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Purchases', 'Gagal tambah purchase: ' + e.message);
    }
}

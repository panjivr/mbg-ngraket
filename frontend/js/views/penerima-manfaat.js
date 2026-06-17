/**
 * Penerima Manfaat — Lokasi PM & Penanggung Jawab (PJ)
 * Data disimpan server-side (API + SQLite tenant) agar ikut backup/migrasi/deploy.
 * Tab 1: Lokasi PM (KB/TK/PAUD/SD/SMP/SMA/Posyandu)
 * Tab 2: Penanggung Jawab (PJ) + Print BAST Insentif
 */

/* ====================================================
  API + CACHE HELPERS
  ==================================================== */

const _pmState = {
    lokasi: [],
    pj: [],
    loaded: false
};

function pmGetAll(table) {
    const key = table === 'pj' ? 'pj' : 'lokasi';
    return (_pmState[key] || []).slice();
}

function pmFindById(table, id) {
    const key = table === 'pj' ? 'pj' : 'lokasi';
    return (_pmState[key] || []).find(r => r.id === id) || null;
}

function pmAuthHeaders() {
    const h = { 'Content-Type': 'application/json' };
    try {
        if (typeof SESSION !== 'undefined' && SESSION && SESSION.token) h.Authorization = 'Bearer ' + SESSION.token;
        if (typeof SESSION !== 'undefined' && SESSION && SESSION.tenant_id) h['x-tenant-id'] = SESSION.tenant_id;
    } catch (e) { }
    return h;
}

async function pmApi(path, opts) {
    const res = await fetch(path, {
        method: (opts && opts.method) || 'GET',
        headers: pmAuthHeaders(),
        body: opts && opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
}

async function pmLoadFromServer() {
    const [lokasi, pj] = await Promise.all([
        pmApi('/api/penerima-manfaat/lokasi'),
        pmApi('/api/penerima-manfaat/pj')
    ]);
    _pmState.lokasi = Array.isArray(lokasi) ? lokasi : [];
    _pmState.pj = Array.isArray(pj) ? pj : [];
    _pmState.loaded = true;
}

async function pmInsert(table, item) {
    const t = table === 'pj' ? 'pj' : 'lokasi';
    const row = await pmApi(`/api/penerima-manfaat/${t}`, { method: 'POST', body: item });
    await pmLoadFromServer();
    return row;
}

async function pmUpdate(table, id, updates) {
    const t = table === 'pj' ? 'pj' : 'lokasi';
    const row = await pmApi(`/api/penerima-manfaat/${t}/${encodeURIComponent(id)}`, { method: 'PUT', body: updates });
    await pmLoadFromServer();
    return row;
}

async function pmDelete(table, id) {
    const t = table === 'pj' ? 'pj' : 'lokasi';
    await pmApi(`/api/penerima-manfaat/${t}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await pmLoadFromServer();
}

/* ====================================================
   UTILS
   ==================================================== */

function pmGetPorsi(lokasi) {
    let kecil = 0, besar = 0;
    switch (lokasi.jenis) {
        case 'KB': case 'TK': case 'PAUD':
            kecil = parseInt(lokasi.jumlah_murid) || 0;
            break;
        case 'SD':
            kecil = parseInt(lokasi.kelas_1_3) || 0;
            besar = parseInt(lokasi.kelas_4_6) || 0;
            break;
        case 'SMP': case 'SMA':
            besar = parseInt(lokasi.jumlah_siswa) || 0;
            break;
        case 'Posyandu':
            kecil = parseInt(lokasi.balita) || 0;
            besar = (parseInt(lokasi.ibu_hamil) || 0) + (parseInt(lokasi.ibu_menyusui) || 0);
            break;
    }
    return { kecil, besar };
}

function pmGetPjPorsiBesar(lokasi) {
    if (!lokasi) return 0;
    // Legacy/default:
    // - if pj exists and pj_porsi_besar is not set => assume 1
    // - otherwise => use pj_porsi_besar
    const raw = lokasi.pj_porsi_besar;
    const v = (raw === undefined || raw === null || String(raw).trim() === '') ? NaN : parseInt(raw);
    if (!Number.isFinite(v)) return lokasi.pj_id ? 1 : 0;
    return v < 0 ? 0 : v;
}

function pmRupiah(n) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseFloat(n) || 0);
}

function pmTanggalPanjang(d) {
    return (d || new Date()).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function pmJenisBadge(jenis) {
    const m = { KB: 'warning', TK: 'warning', PAUD: 'warning', SD: 'success', SMP: 'success', SMA: 'success', Posyandu: 'danger' };
    return m[jenis] || '';
}

function pmNotify(msg, type) {
    if (typeof notifyUi === 'function') notifyUi(type || 'success', type === 'error' ? 'Gagal' : 'Berhasil', msg);
}

/* ====================================================
   MAIN LOAD FUNCTION
   ==================================================== */

let _pmActiveTab = 'lokasi';

async function loadPenerimaManfaat() {
    const c = document.getElementById('pm-container');
    if (!c) return;
    c.innerHTML = '<div class="text-muted" style="padding:16px">Memuat data penerima manfaat...</div>';
    try {
        await pmLoadFromServer();
        c.innerHTML = _pmRender();
        _pmInit();
    } catch (e) {
        c.innerHTML = `<div class="text-danger" style="padding:16px">Gagal memuat data: ${String(e && e.message || e)}</div>`;
    }
}

/* ====================================================
   RENDER
   ==================================================== */

function _pmRender() {
    return `
        <div class="flex justify-between items-center mb-4">
            <div>
                <h3 class="font-bold text-lg">Penerima Manfaat</h3>
                <p class="text-muted text-sm">Kelola lokasi penerima dan penanggung jawab (PJ)</p>
            </div>
        </div>

        <div class="pm-tabs" style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:20px">
            <button class="pm-tab-btn ${_pmActiveTab === 'lokasi' ? 'pm-tab-active' : ''}"
                data-tab="lokasi" style="background:none;border:none;border-bottom:3px solid ${_pmActiveTab === 'lokasi' ? 'var(--primary)' : 'transparent'};
                margin-bottom:-2px;padding:10px 20px;font-size:14px;font-weight:600;
                color:${_pmActiveTab === 'lokasi' ? 'var(--primary)' : 'var(--text-muted)'};cursor:pointer">
                🏫 Data Lokasi
            </button>
            <button class="pm-tab-btn ${_pmActiveTab === 'pj' ? 'pm-tab-active' : ''}"
                data-tab="pj" style="background:none;border:none;border-bottom:3px solid ${_pmActiveTab === 'pj' ? 'var(--primary)' : 'transparent'};
                margin-bottom:-2px;padding:10px 20px;font-size:14px;font-weight:600;
                color:${_pmActiveTab === 'pj' ? 'var(--primary)' : 'var(--text-muted)'};cursor:pointer">
                👤 Penanggung Jawab (PJ)
            </button>
        </div>

        <div id="pm-tab-lokasi" style="display:${_pmActiveTab === 'lokasi' ? 'block' : 'none'}">
            ${_pmRenderLokasi()}
        </div>
        <div id="pm-tab-pj" style="display:${_pmActiveTab === 'pj' ? 'block' : 'none'}">
            ${_pmRenderPJ()}
        </div>`;
}

/* ====================================================
   LOKASI TAB
   ==================================================== */

function _pmRenderLokasi() {
    const list = pmGetAll('lokasi');
    const pjList = pmGetAll('pj');
    return `
        <div class="card">
            <div class="flex justify-between items-center mb-4" style="flex-wrap:wrap;gap:8px">
                <span class="font-bold">Daftar Lokasi Penerima Manfaat</span>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <select id="pm-filter-jenis" class="input-field" style="width:140px;padding:6px 10px;font-size:13px">
                        <option value="">Semua Jenis</option>
                        ${['KB','TK','PAUD','SD','SMP','SMA','Posyandu'].map(j => `<option value="${j}">${j}</option>`).join('')}
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="pmOpenLokasiForm(null)">
                        <i class="fas fa-plus"></i> Tambah Lokasi
                    </button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="nutri-table w-full" id="pm-lokasi-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Lokasi</th>
                            <th>Jenis</th>
                            <th>Alamat</th>
                            <th>Penanggung Jawab</th>
                            <th style="text-align:center">Porsi Kecil</th>
                            <th style="text-align:center">Porsi Besar</th>
                            <th style="text-align:center">PJ (porsi besar)</th>
                            <th style="text-align:center">Total</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="pm-lokasi-tbody">
                        ${_pmLokasiRows(list, pjList, '')}
                    </tbody>
                </table>
            </div>
            ${list.length === 0 ? `
                <div style="text-align:center;padding:40px;color:var(--text-muted)">
                    <div style="font-size:40px;margin-bottom:12px">🏫</div>
                    <div class="font-bold">Belum ada data lokasi</div>
                    <div class="text-sm mt-2">Klik "Tambah Lokasi" untuk memulai</div>
                </div>` : ''}
        </div>`;
}

function _pmLokasiRows(list, pjList, filterJenis) {
    const filtered = filterJenis ? list.filter(l => l.jenis === filterJenis) : list;
    if (filtered.length === 0) return `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:20px">Tidak ada data</td></tr>`;
    return filtered.map((l, i) => {
        const pj = pjList.find(p => p.id === l.pj_id);
        const { kecil, besar } = pmGetPorsi(l);
        const pjPorsiBesar = pmGetPjPorsiBesar(l);
        const total = kecil + besar + pjPorsiBesar;
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${l.nama}</strong></td>
                <td><span class="badge ${pmJenisBadge(l.jenis)}">${l.jenis}</span></td>
                <td style="max-width:180px;font-size:12px">${l.alamat || '—'}</td>
                <td style="font-size:12px">${pj ? pj.nama : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="text-align:center">${kecil}</td>
                <td style="text-align:center">${besar}</td>
                <td style="text-align:center">
                    <input type="number"
                        class="input-field"
                        min="0"
                        step="1"
                        style="width:92px;padding:4px 6px;font-size:12px;text-align:center"
                        value="${pjPorsiBesar}"
                        ${!l.pj_id ? 'disabled' : ''}
                        oninput="pmUpdatePjPorsiBesar('${l.id}', this.value)">
                </td>
                <td style="text-align:center;font-weight:700;color:var(--primary)">${total}</td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-secondary btn-sm" onclick="pmOpenLokasiForm('${l.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-secondary btn-sm" style="color:var(--danger)" onclick="pmDeleteLokasi('${l.id}','${l.nama.replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

/* ====================================================
   PJ TAB
   ==================================================== */

function _pmRenderPJ() {
    const pjList = pmGetAll('pj');
    const lokasiList = pmGetAll('lokasi');
    return `
        <div class="card">
            <div class="flex justify-between items-center mb-4" style="flex-wrap:wrap;gap:8px">
                <span class="font-bold">Daftar Penanggung Jawab (PJ)</span>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn btn-secondary btn-sm" onclick="pmPrintBASTInsentif()" style="background:var(--purple,#6f42c1);color:#fff;border:none">
                        <i class="fas fa-print"></i> Print BAST Insentif
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="pmOpenPJForm(null)">
                        <i class="fas fa-plus"></i> Tambah PJ
                    </button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="nutri-table w-full">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama PJ</th>
                            <th>Alamat</th>
                            <th>Kontak</th>
                            <th>Lokasi yang Ditangani</th>
                            <th style="text-align:center">Jumlah PM</th>
                            <th>Besar Insentif</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_pmPJRows(pjList, lokasiList)}
                    </tbody>
                </table>
            </div>
            ${pjList.length === 0 ? `
                <div style="text-align:center;padding:40px;color:var(--text-muted)">
                    <div style="font-size:40px;margin-bottom:12px">👤</div>
                    <div class="font-bold">Belum ada data PJ</div>
                    <div class="text-sm mt-2">Klik "Tambah PJ" untuk memulai</div>
                </div>` : ''}
        </div>`;
}

function _pmPJRows(pjList, lokasiList) {
    if (pjList.length === 0) return `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px">Tidak ada data</td></tr>`;
    return pjList.map((pj, i) => {
        const lokasiPJ = lokasiList.filter(l => l.pj_id === pj.id);
        const totalPM = lokasiPJ.reduce((s, l) => { const p = pmGetPorsi(l); return s + p.kecil + p.besar + pmGetPjPorsiBesar(l); }, 0);
        const lokasiNames = lokasiPJ.length ? lokasiPJ.map(l => l.nama).join(', ') : '—';
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${pj.nama}</strong></td>
                <td style="max-width:160px;font-size:12px">${pj.alamat || '—'}</td>
                <td style="font-size:12px">${pj.kontak || '—'}</td>
                <td style="max-width:200px;font-size:12px">${lokasiNames}</td>
                <td style="text-align:center;font-weight:700">${totalPM}</td>
                <td style="font-weight:700;color:var(--primary,#1b5e4b)">${pmRupiah(pj.insentif)}</td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-secondary btn-sm" onclick="pmOpenPJForm('${pj.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-secondary btn-sm" style="color:var(--danger)" onclick="pmDeletePJ('${pj.id}','${pj.nama.replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

/* ====================================================
   DYNAMIC FORM FIELDS
   ==================================================== */

function _pmDynamicFields(jenis, v) {
    v = v || {};
    switch (jenis) {
        case 'KB': case 'TK': case 'PAUD':
            return `
                <div class="input-group">
                    <label class="input-label">Jumlah Murid <span style="color:red">*</span></label>
                    <input type="number" id="pm_jumlah_murid" class="input-field" min="0" value="${v.jumlah_murid || 0}">
                    <div class="text-xs text-muted mt-1">Semua murid mendapat porsi kecil</div>
                </div>`;
        case 'SD':
            return `
                <div style="background:var(--bg-soft,#f0f9f5);border-radius:6px;padding:10px 12px;margin-bottom:8px;font-size:12px;font-weight:600;color:var(--primary)">Detail Kelas SD</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div class="input-group">
                        <label class="input-label">Kelas 1–3 (Porsi Kecil) <span style="color:red">*</span></label>
                        <input type="number" id="pm_kelas_1_3" class="input-field" min="0" value="${v.kelas_1_3 || 0}">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Kelas 4–6 (Porsi Besar) <span style="color:red">*</span></label>
                        <input type="number" id="pm_kelas_4_6" class="input-field" min="0" value="${v.kelas_4_6 || 0}">
                    </div>
                </div>`;
        case 'SMP': case 'SMA':
            return `
                <div class="input-group">
                    <label class="input-label">Jumlah Siswa <span style="color:red">*</span></label>
                    <input type="number" id="pm_jumlah_siswa" class="input-field" min="0" value="${v.jumlah_siswa || 0}">
                    <div class="text-xs text-muted mt-1">Semua siswa mendapat porsi besar</div>
                </div>`;
        case 'Posyandu':
            return `
                <div style="background:var(--bg-soft,#f0f9f5);border-radius:6px;padding:10px 12px;margin-bottom:8px;font-size:12px;font-weight:600;color:var(--primary)">Detail Peserta Posyandu</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div class="input-group">
                        <label class="input-label">Balita (Porsi Kecil) <span style="color:red">*</span></label>
                        <input type="number" id="pm_balita" class="input-field" min="0" value="${v.balita || 0}">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Ibu Hamil (Porsi Besar) <span style="color:red">*</span></label>
                        <input type="number" id="pm_ibu_hamil" class="input-field" min="0" value="${v.ibu_hamil || 0}">
                    </div>
                </div>
                <div class="input-group">
                    <label class="input-label">Ibu Menyusui (Porsi Besar) <span style="color:red">*</span></label>
                    <input type="number" id="pm_ibu_menyusui" class="input-field" min="0" value="${v.ibu_menyusui || 0}">
                </div>`;
        default: return '';
    }
}

/* ====================================================
   FORM: LOKASI
   ==================================================== */

function pmOpenLokasiForm(lokasiId) {
    const lokasi = lokasiId ? pmFindById('lokasi', lokasiId) : null;
    const isEdit = !!lokasi;
    const jenis = lokasi ? lokasi.jenis : 'SD';
    const pjList = pmGetAll('pj');

    const pjOpts = pjList.map(p =>
        `<option value="${p.id}" ${lokasi && lokasi.pj_id === p.id ? 'selected' : ''}>${p.nama}</option>`
    ).join('');

    const jenisOpts = ['KB','TK','PAUD','SD','SMP','SMA','Posyandu'].map(j =>
        `<option value="${j}" ${jenis === j ? 'selected' : ''}>${j}</option>`
    ).join('');

    const bodyHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="input-group">
                <label class="input-label">Nama Lokasi <span style="color:red">*</span></label>
                <input type="text" id="pm_nama" class="input-field" value="${lokasi ? lokasi.nama : ''}" placeholder="Contoh: SDN 01 Merdeka">
            </div>
            <div class="input-group">
                <label class="input-label">Jenis <span style="color:red">*</span></label>
                <select id="pm_jenis" class="input-field" onchange="pmRefreshDynFields(this.value)">${jenisOpts}</select>
            </div>
        </div>
        <div class="input-group">
            <label class="input-label">Alamat</label>
            <textarea id="pm_alamat" class="input-field" rows="2" placeholder="Alamat lengkap lokasi">${lokasi ? lokasi.alamat || '' : ''}</textarea>
        </div>
        <div class="input-group">
            <label class="input-label">Penanggung Jawab (PJ)</label>
            <select id="pm_pj_id" class="input-field" onchange="pmTogglePjPorsiBesarInput(this.value)">
                <option value="">— Pilih PJ —</option>
                ${pjOpts}
            </select>
            ${pjList.length === 0 ? '<div class="text-xs" style="color:var(--warning,#e09800);margin-top:4px">⚠️ Belum ada PJ. Tambahkan di tab Penanggung Jawab terlebih dahulu.</div>' : ''}
        </div>
        <div class="input-group">
            <label class="input-label">Jumlah PJ menerima porsi besar</label>
            <input type="number"
                id="pm_pj_porsi_besar"
                class="input-field"
                min="0"
                step="1"
                ${!(lokasi && lokasi.pj_id) ? 'disabled' : ''}
                value="${lokasi && lokasi.pj_id ? pmGetPjPorsiBesar(lokasi) : 0}">
            <div class="text-xs text-muted mt-1">Jika PJ dipilih, default otomatis = 1 (bisa diubah).</div>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">
        <div id="pm-dyn-fields">${_pmDynamicFields(jenis, lokasi)}</div>`;

    if (typeof openModalUi === 'function') {
        openModalUi({
            title: isEdit ? 'Edit Lokasi' : 'Tambah Lokasi Baru',
            bodyHtml,
            actions: [
                {
                    label: isEdit ? 'Simpan Perubahan' : 'Tambah Lokasi',
                    className: 'btn btn-primary btn-sm',
                    onClick: () => _pmSaveLokasi(lokasiId)
                },
                { label: 'Batal', className: 'btn btn-secondary btn-sm' }
            ]
        });
    }
}

window.pmRefreshDynFields = function(jenis) {
    const el = document.getElementById('pm-dyn-fields');
    if (el) el.innerHTML = _pmDynamicFields(jenis, {});
};

async function _pmSaveLokasi(lokasiId) {
    const nama = (document.getElementById('pm_nama') || {}).value || '';
    if (!nama.trim()) { if (typeof setModalError === 'function') setModalError('Nama lokasi wajib diisi'); return; }

    const jenis = (document.getElementById('pm_jenis') || {}).value || '';
    const alamat = (document.getElementById('pm_alamat') || {}).value || '';
    const pj_id = (document.getElementById('pm_pj_id') || {}).value || '';

    const pj_porsi_besar_el = document.getElementById('pm_pj_porsi_besar');
    const pj_porsi_besar = pj_porsi_besar_el
        ? (pj_id ? Math.max(0, parseInt(pj_porsi_besar_el.value || 0) || 0) : 0)
        : (pj_id ? 1 : 0);

    const data = { nama: nama.trim(), jenis, alamat, pj_id, pj_porsi_besar };

    // Collect dynamic fields
    const fields = ['jumlah_murid','kelas_1_3','kelas_4_6','jumlah_siswa','balita','ibu_hamil','ibu_menyusui'];
    fields.forEach(f => {
        const el = document.getElementById('pm_' + f);
        if (el) data[f] = parseInt(el.value) || 0;
    });

    try {
        if (lokasiId) {
            await pmUpdate('lokasi', lokasiId, data);
            pmNotify('Lokasi berhasil diperbarui');
        } else {
            await pmInsert('lokasi', data);
            pmNotify('Lokasi berhasil ditambahkan');
        }
        if (typeof closeModalUi === 'function') closeModalUi();
        _pmRefreshLokasi();
    } catch (e) {
        if (typeof setModalError === 'function') setModalError(String(e && e.message || e));
        pmNotify('Gagal menyimpan lokasi', 'error');
    }
}

async function pmDeleteLokasi(id, nama) {
    if (!window.confirm('Hapus lokasi "' + nama + '"? Data ini tidak dapat dikembalikan.')) return;
    try {
        await pmDelete('lokasi', id);
        pmNotify('Lokasi berhasil dihapus');
        _pmRefreshLokasi();
    } catch (e) {
        pmNotify('Gagal menghapus lokasi', 'error');
    }
}

function _pmRefreshLokasi() {
    const tab = document.getElementById('pm-tab-lokasi');
    if (tab) {
        tab.innerHTML = _pmRenderLokasi();
        document.getElementById('pm-filter-jenis').addEventListener('change', function() {
            const tbody = document.getElementById('pm-lokasi-tbody');
            if (tbody) tbody.innerHTML = _pmLokasiRows(pmGetAll('lokasi'), pmGetAll('pj'), this.value);
        });
    }
}

window.pmTogglePjPorsiBesarInput = function(pjId) {
    const el = document.getElementById('pm_pj_porsi_besar');
    if (!el) return;
    if (String(pjId || '').trim()) {
        el.disabled = false;
        if (String(el.value || '').trim() === '') el.value = '1';
    } else {
        el.disabled = true;
        el.value = '0';
    }
};

window.pmUpdatePjPorsiBesar = async function(lokasiId, value) {
    const lok = pmFindById('lokasi', lokasiId);
    if (!lok) return;
    if (!lok.pj_id) return; // input akan disabled kalau tidak ada PJ
    const v = Math.max(0, parseInt(value, 10) || 0);
    try {
        await pmUpdate('lokasi', lokasiId, { ...lok, pj_porsi_besar: v });
        _pmRefreshLokasi();
    } catch (e) {
        pmNotify('Gagal update porsi PJ', 'error');
    }
};

/* ====================================================
   FORM: PJ
   ==================================================== */

function pmOpenPJForm(pjId) {
    const pj = pjId ? pmFindById('pj', pjId) : null;
    const isEdit = !!pj;

    const bodyHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="input-group">
                <label class="input-label">Nama PJ <span style="color:red">*</span></label>
                <input type="text" id="pj_nama" class="input-field" value="${pj ? pj.nama : ''}" placeholder="Nama lengkap">
            </div>
            <div class="input-group">
                <label class="input-label">No. HP / Kontak</label>
                <input type="text" id="pj_kontak" class="input-field" value="${pj ? pj.kontak || '' : ''}" placeholder="08xxxxxxxxxx">
            </div>
        </div>
        <div class="input-group">
            <label class="input-label">Alamat</label>
            <textarea id="pj_alamat" class="input-field" rows="2" placeholder="Alamat lengkap PJ">${pj ? pj.alamat || '' : ''}</textarea>
        </div>
        <div class="input-group">
            <label class="input-label">Besar Insentif (Rp)</label>
            <input type="number" id="pj_insentif" class="input-field" value="${pj ? pj.insentif || '' : ''}" min="0" placeholder="Contoh: 150000">
            <div class="text-xs text-muted mt-1">Nominal insentif yang diterima PJ per periode</div>
        </div>`;

    if (typeof openModalUi === 'function') {
        openModalUi({
            title: isEdit ? 'Edit Penanggung Jawab' : 'Tambah Penanggung Jawab',
            bodyHtml,
            actions: [
                {
                    label: isEdit ? 'Simpan Perubahan' : 'Tambah PJ',
                    className: 'btn btn-primary btn-sm',
                    onClick: () => _pmSavePJ(pjId)
                },
                { label: 'Batal', className: 'btn btn-secondary btn-sm' }
            ]
        });
    }
}

async function _pmSavePJ(pjId) {
    const nama = (document.getElementById('pj_nama') || {}).value || '';
    if (!nama.trim()) { if (typeof setModalError === 'function') setModalError('Nama PJ wajib diisi'); return; }

    const data = {
        nama: nama.trim(),
        kontak: (document.getElementById('pj_kontak') || {}).value || '',
        alamat: (document.getElementById('pj_alamat') || {}).value || '',
        insentif: parseFloat((document.getElementById('pj_insentif') || {}).value) || 0
    };

    try {
        if (pjId) {
            await pmUpdate('pj', pjId, data);
            pmNotify('Data PJ berhasil diperbarui');
        } else {
            await pmInsert('pj', data);
            pmNotify('PJ berhasil ditambahkan');
        }
        if (typeof closeModalUi === 'function') closeModalUi();
        _pmRefreshPJ();
    } catch (e) {
        if (typeof setModalError === 'function') setModalError(String(e && e.message || e));
        pmNotify('Gagal menyimpan PJ', 'error');
    }
}

async function pmDeletePJ(id, nama) {
    const used = pmGetAll('lokasi').filter(l => l.pj_id === id);
    if (used.length > 0) {
        alert('PJ "' + nama + '" masih terdaftar di ' + used.length + ' lokasi. Lepaskan dulu sebelum menghapus.');
        return;
    }
    if (!window.confirm('Hapus PJ "' + nama + '"?')) return;
    try {
        await pmDelete('pj', id);
        pmNotify('PJ berhasil dihapus');
        _pmRefreshPJ();
    } catch (e) {
        pmNotify('Gagal menghapus PJ', 'error');
    }
}

function _pmRefreshPJ() {
    const tab = document.getElementById('pm-tab-pj');
    if (tab) tab.innerHTML = _pmRenderPJ();
}

/* ====================================================
   PRINT: BAST INSENTIF
   ==================================================== */

function pmPrintBASTInsentif() {
    const pjList = pmGetAll('pj');
    const lokasiList = pmGetAll('lokasi');

    if (pjList.length === 0) {
        alert('Belum ada data PJ untuk dicetak.');
        return;
    }

    let grandTotal = 0;
    const rows = pjList.map((pj, i) => {
        const lokasiPJ = lokasiList.filter(l => l.pj_id === pj.id);
        const totalPM = lokasiPJ.reduce((s, l) => { const p = pmGetPorsi(l); return s + p.kecil + p.besar + pmGetPjPorsiBesar(l); }, 0);
        const lokasiNames = lokasiPJ.map(l => l.nama + ' (' + l.jenis + ')').join('; ') || '—';
        const insentif = parseFloat(pj.insentif) || 0;
        grandTotal += insentif;
        return `
            <tr>
                <td style="text-align:center">${i + 1}</td>
                <td>${pj.nama}</td>
                <td>${pj.alamat || '—'}</td>
                <td>${pj.kontak || '—'}</td>
                <td style="font-size:10pt">${lokasiNames}</td>
                <td style="text-align:center">${totalPM}</td>
                <td style="text-align:right">${pmRupiah(insentif)}</td>
                <td style="text-align:center;min-width:80px">&nbsp;</td>
            </tr>`;
    }).join('');

    const today = pmTanggalPanjang(new Date());

    const printWin = window.open('', '_blank', 'width=900,height=700');
    printWin.document.write(`<!DOCTYPE html><html lang="id"><head>
        <meta charset="UTF-8"><title>BAST Insentif PJ</title>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; margin: 0; padding: 20px; }
            @page { size: A4; margin: 1.5cm 2cm; }
            .kop { text-align:center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 18px; }
            .kop h2 { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 3px 0; }
            .kop p { font-size: 10pt; margin: 2px 0; }
            .title { text-align:center; margin: 16px 0 12px; }
            .title h3 { font-size: 13pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; }
            .info table { font-size: 11pt; }
            .info td { padding: 2px 6px 2px 0; vertical-align: top; }
            .info td:first-child { min-width: 160px; }
            table.print-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11pt; }
            table.print-table th, table.print-table td { border: 1px solid #333; padding: 6px 9px; }
            table.print-table th { background: #ebebeb; font-weight: bold; text-align: center; }
            .sign { margin-top: 28px; display: flex; justify-content: space-between; }
            .sign-block { text-align: center; min-width: 180px; flex: 1; }
            .sign-block .role { font-weight: bold; margin-bottom: 56px; }
            .sign-block .name { font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
        </style>
    </head><body>
        <div class="kop">
            <h2>Program Makan Bergizi Gratis (MBG)</h2>
            <p>Sistem Manajemen Dapur MBG · DJATI CORP</p>
        </div>
        <div class="title"><h3>Berita Acara Serah Terima Insentif</h3><h3>Penanggung Jawab Program MBG</h3></div>
        <div class="info">
            <table>
                <tr><td>Hari / Tanggal</td><td>:</td><td>${today}</td></tr>
                <tr><td>Jumlah PJ</td><td>:</td><td>${pjList.length} orang</td></tr>
                <tr><td>Total Insentif</td><td>:</td><td><strong>${pmRupiah(grandTotal)}</strong></td></tr>
            </table>
        </div>
        <p style="margin:10px 0;font-size:11pt;line-height:1.6">Yang bertanda tangan di bawah ini menyatakan bahwa telah dilakukan serah terima insentif kepada Penanggung Jawab (PJ) Program Makan Bergizi Gratis sebagaimana tercantum berikut:</p>
        <table class="print-table">
            <thead><tr>
                <th>No</th><th>Nama PJ</th><th>Alamat</th><th>Kontak</th>
                <th>Lokasi PM</th><th>Jml PM</th><th>Besar Insentif</th><th>TTD</th>
            </tr></thead>
            <tbody>
                ${rows}
                <tr>
                    <td colspan="6" style="text-align:right;font-weight:bold">Grand Total Insentif</td>
                    <td style="text-align:right;font-weight:bold">${pmRupiah(grandTotal)}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
        <div class="sign">
            <div class="sign-block"><div class="role">Mengetahui,<br>Koordinator Program MBG</div><div class="name">( ...................................... )</div><div>NIP/NIK: ___________________</div></div>
            <div class="sign-block"><div class="role">Pemberi Insentif</div><div class="name">( ...................................... )</div><div>NIP/NIK: ___________________</div></div>
        </div>
        <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
    printWin.document.close();
}

/* ====================================================
   INIT
   ==================================================== */

function _pmInit() {
    document.querySelectorAll('.pm-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            _pmActiveTab = this.dataset.tab;
            loadPenerimaManfaat();
        });
    });

    const filterJenis = document.getElementById('pm-filter-jenis');
    if (filterJenis) {
        filterJenis.addEventListener('change', function() {
            const tbody = document.getElementById('pm-lokasi-tbody');
            if (tbody) tbody.innerHTML = _pmLokasiRows(pmGetAll('lokasi'), pmGetAll('pj'), this.value);
        });
    }
}

// Expose globals for inline onclick
window.pmOpenLokasiForm = pmOpenLokasiForm;
window.pmOpenPJForm = pmOpenPJForm;
window.pmDeleteLokasi = pmDeleteLokasi;
window.pmDeletePJ = pmDeletePJ;
window.pmPrintBASTInsentif = pmPrintBASTInsentif;

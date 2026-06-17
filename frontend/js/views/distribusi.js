/**
 * Distribusi v2 — Daily wave distribution aligned with War Room
 * Fitur:
 *   1. Listing per hari (periode 14 hari bergulir dari tanggal mulai yang dipilih)
 *   2. 1 hari 1 plan produksi. 1 plan bisa punya 1–3 wave distribusi.
 *      Setiap wave = grup sekolah yang dikirim pada jam yang sama.
 *      Satu sekolah hanya boleh ada di 1 wave per hari.
 *   3. Sekolah yang ditandai libur pada tanggal tsb tidak bisa di-assign.
 *   4. Prefill wave dari plan War Room; user boleh override jam + porsi per sekolah.
 *   5. Semua fungsi cetak (Surat Jalan, Uji Organoleptik, BAST Packaging,
 *      Print Distribusi PDF) tetap dipertahankan, sumber datanya sekarang
 *      dari backend `pm_distribution_events` yang dicermink ke localStorage
 *      agar fungsi print yang lama tetap kompatibel.
 */

// Flag untuk debugging load dari app.js
window.__mbgDistribusiScriptLoaded = true;

/* ====================================================
   STORAGE HELPERS (reuse pmKey jika file PM sudah dimuat)
   ==================================================== */

function distKey(table) {
    const tid = (typeof SESSION !== 'undefined' && SESSION.tenant_id) ? SESSION.tenant_id : 'local';
    return 'mbg_pm_' + tid + '_' + table;
}

function distGetAll(table) {
    try { return JSON.parse(localStorage.getItem(distKey(table)) || '[]'); } catch (e) { return []; }
}

function distSave(table, data) {
    localStorage.setItem(distKey(table), JSON.stringify(data));
}

function distFindById(table, id) {
    return distGetAll(table).find(r => r.id === id) || null;
}

/* ====================================================
   UTILS
   ==================================================== */

function distGetPorsi(lokasi) {
    if (typeof pmGetPorsi === 'function') return pmGetPorsi(lokasi);
    let kecil = 0, besar = 0;
    switch (lokasi && lokasi.jenis) {
        case 'KB': case 'TK': case 'PAUD': kecil = parseInt(lokasi.jumlah_murid) || 0; break;
        case 'SD': kecil = parseInt(lokasi.kelas_1_3) || 0; besar = parseInt(lokasi.kelas_4_6) || 0; break;
        case 'SMP': case 'SMA': besar = parseInt(lokasi.jumlah_siswa) || 0; break;
        case 'Posyandu': kecil = parseInt(lokasi.balita) || 0; besar = (parseInt(lokasi.ibu_hamil) || 0) + (parseInt(lokasi.ibu_menyusui) || 0); break;
    }
    return { kecil, besar };
}

function distGetPjPorsiBesar(lokasi) {
    if (!lokasi) return 0;
    if (typeof pmGetPjPorsiBesar === 'function') return pmGetPjPorsiBesar(lokasi);
    const raw = lokasi.pj_porsi_besar;
    const v = (raw === undefined || raw === null || String(raw).trim() === '') ? NaN : parseInt(raw, 10);
    if (!Number.isFinite(v)) return lokasi.pj_id ? 1 : 0;
    return v < 0 ? 0 : v;
}

function distDefaultPortions(lokasi) {
    if (!lokasi) return 0;
    const p = distGetPorsi(lokasi);
    return (Number(p.kecil) || 0) + (Number(p.besar) || 0) + distGetPjPorsiBesar(lokasi);
}

function distTglShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function distTglPanjang(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function distTglHari(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' });
}

function distToday() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function distAddDaysISO(dateStr, diff) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + (Number(diff) || 0));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function distNotify(msg, type) {
    if (typeof notifyUi === 'function') {
        notifyUi(type || 'success', type === 'error' ? 'Gagal' : (type === 'warning' ? 'Peringatan' : 'Berhasil'), msg);
    }
}

function distEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function distFmtTime(iso) {
    if (!iso) return '—';
    const s = String(iso).trim();
    // Accept formats: "HH:MM", "HH:MM:SS", ISO "2026-04-23T10:00:00Z".
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.slice(0, 5);
    const m = s.match(/T(\d{2}:\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return '—';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function distDeliveryTimeToIsoHHMM(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    if (/^\d{2}:\d{2}$/.test(s)) return s;
    if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
    const m = s.match(/T(\d{2}:\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function distComposeDeliveryIso(date, hhmm) {
    if (!date || !hhmm) return '';
    return `${date}T${hhmm}:00`;
}

/* ====================================================
   PERIOD STATE (14-hari bergulir)
   ==================================================== */

function distPeriodStateKey() {
    const tid = (typeof SESSION !== 'undefined' && SESSION.tenant_id) ? SESSION.tenant_id : 'local';
    return `mbg_dist_period_state_${tid}`;
}

function distGetPeriodStart() {
    try {
        const s = localStorage.getItem(distPeriodStateKey());
        if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    } catch (e) { }
    // default: 14 hari mulai dari hari ini
    const today = distToday();
    localStorage.setItem(distPeriodStateKey(), today);
    return today;
}

function distSetPeriodStart(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    localStorage.setItem(distPeriodStateKey(), date);
}

function distPeriodRange(start) {
    const from = start || distGetPeriodStart();
    const to = distAddDaysISO(from, 13);
    return { from, to };
}

/* ====================================================
   API HELPERS
   ==================================================== */

async function distApi(path, opts) {
    if (typeof api === 'function') {
        // api(path, method, body) — unwrap fetch-style opts object
        if (opts && typeof opts === 'object') {
            const method = opts.method || 'GET';
            let body = null;
            if (opts.body) {
                try { body = JSON.parse(opts.body); } catch { body = opts.body; }
            }
            return api(path, method, body);
        }
        return api(path);
    }
    const res = await fetch(path, opts || {});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

function distCanSyncToServer() {
    return typeof SESSION !== 'undefined' && SESSION && SESSION.tenant_id;
}

/* ====================================================
   CACHE: lokasi & pj (disimpan di localStorage supaya
   fungsi print lama tetap bisa `distFindById('lokasi', id)`)
   ==================================================== */

async function distSyncLokasiPjCache() {
    if (!distCanSyncToServer()) return;
    try {
        const [lokasi, pj] = await Promise.all([
            distApi('/api/penerima-manfaat/lokasi'),
            distApi('/api/penerima-manfaat/pj').catch(() => [])
        ]);
        if (Array.isArray(lokasi)) distSave('lokasi', lokasi);
        if (Array.isArray(pj)) distSave('pj', pj);
    } catch (e) {
        console.warn('distSyncLokasiPjCache failed:', e);
    }
}

/* ====================================================
   CACHE: pm_distribution_events -> localStorage 'distribusi'
   (mirror per tanggal, sehingga print functions lama tetap bekerja)
   ==================================================== */

function distMirrorEventsToLocal(dateStr, events, lokasiById) {
    const all = distGetAll('distribusi');
    const kept = all.filter(r => r.tanggal !== dateStr);
    const lokasiMap = lokasiById || new Map((distGetAll('lokasi') || []).map(l => [String(l.id), l]));
    for (const ev of (Array.isArray(events) ? events : [])) {
        const lokasi = lokasiMap.get(String(ev.lokasi_id));
        const jam = distDeliveryTimeToIsoHHMM(ev.wave_delivery_time);
        kept.push({
            id: ev.event_id || ev.id,
            tanggal: dateStr,
            lokasi_id: ev.lokasi_id,
            wave_number: Number(ev.wave_number) || 1,
            jam_distribusi: jam || '',
            menu_item_id: ev.menu_item_id || null,
            menu_item_name: ev.menu_item_name || '',
            menu: ev.menu_item_name || '',
            jenis_menu: ev.menu_jenis || '',
            jenis_packaging: ev.jenis_packaging || (lokasi && lokasi.default_packaging) || '',
            target_portions: Number(ev.target_portions) || 0,
            served_portions: Number(ev.served_portions) || 0,
            returned_portions: Number(ev.returned_portions) || 0,
            masuk: !!ev.delivered_at || ['VERIFIED', 'SIGNED', 'COMPLETE'].includes(String(ev.evidence_status || '').toUpperCase()),
            delivered_at: ev.delivered_at || null,
            evidence_status: ev.evidence_status || 'PENDING',
            notes: ev.notes || '',
            driver_staff_id: ev.driver_staff_id ? String(ev.driver_staff_id) : null
        });
    }
    distSave('distribusi', kept);
}

/* ====================================================
   MAIN: LOAD + RENDER PERIOD
   ==================================================== */

function _distInjectStyles() {
    if (document.getElementById('dist-v2-styles')) return;
    const css = `
    .dist-toolbar { display:flex; flex-wrap:wrap; gap:12px 16px; align-items:flex-end; justify-content:space-between; }
    .dist-toolbar h2 { margin:0 0 2px; font-size:18px; font-weight:700; }
    .dist-toolbar .hint { font-size:12px; color:var(--text-muted); }
    .dist-toolbar .group { display:flex; gap:6px; flex-wrap:wrap; align-items:flex-end; }
    .dist-toolbar .field { display:flex; flex-direction:column; gap:2px; }
    .dist-toolbar .field label { font-size:11px; color:var(--text-muted); }
    .dist-toolbar .field input[type=date] { padding:6px 8px; font-size:13px; width:160px; }
    .dist-period-strip { display:flex; align-items:center; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border); font-size:12px; color:var(--text-muted); flex-wrap:wrap; }
    .dist-period-strip strong { color:var(--text); }

    .dist-day-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px; }
    .dist-day-card { background:var(--bg-card,#fff); border:1px solid var(--border); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; transition:box-shadow .15s ease, transform .15s ease; }
    .dist-day-card:hover { box-shadow:0 6px 18px rgba(0,0,0,0.08); transform:translateY(-1px); }
    .dist-day-card.is-today { border-color:var(--primary, #2e7d32); box-shadow:0 0 0 2px rgba(46,125,50,0.15); }
    .dist-day-card.is-past { opacity:0.75; }
    .dist-day-card.is-weekend .dist-day-head { background:linear-gradient(135deg, #fff7e6 0%, #fff 100%); }

    .dist-day-head { padding:10px 12px 8px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px; border-bottom:1px solid var(--border-weak, #eee); background:linear-gradient(135deg, #f6fbf7 0%, #ffffff 100%); }
    .dist-day-head .date-num { font-size:26px; font-weight:800; line-height:1; color:var(--text); }
    .dist-day-head .date-sub { font-size:11px; color:var(--text-muted); margin-top:2px; letter-spacing:0.3px; text-transform:uppercase; }
    .dist-day-head .date-today-pill { background:var(--primary, #2e7d32); color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:8px; letter-spacing:0.4px; }

    .dist-day-body { padding:10px 12px; display:flex; flex-direction:column; gap:8px; flex:1; }
    .dist-pill-row { display:flex; flex-wrap:wrap; gap:4px; }
    .dist-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; line-height:1.6; }
    .dist-pill.ok { background:#e8f5e9; color:#1b5e20; }
    .dist-pill.warn { background:#fff3e0; color:#b24d00; }
    .dist-pill.muted { background:#f0f0f0; color:#555; }
    .dist-pill.info { background:#e3f2fd; color:#0d47a1; }
    .dist-pill.violet { background:#f3e5f5; color:#4a148c; }
    .dist-pill.danger { background:#ffebee; color:#b71c1c; }
    .dist-pill.success { background:#dcedc8; color:#33691e; }

    .dist-day-meta { font-size:12px; color:var(--text-muted); display:flex; gap:6px; flex-wrap:wrap; }
    .dist-day-meta .lbl { color:var(--text-muted); }
    .dist-day-meta .val { color:var(--text); font-weight:600; }

    .dist-portion-bar { margin-top:4px; height:6px; background:#eee; border-radius:999px; overflow:hidden; }
    .dist-portion-bar > span { display:block; height:100%; background:linear-gradient(90deg, #66bb6a, #2e7d32); border-radius:999px; }

    .dist-day-actions { padding:8px 10px; border-top:1px solid var(--border-weak, #eee); background:var(--bg-soft, #fafafa); display:flex; gap:6px; align-items:center; }
    .dist-day-actions .btn { flex:1; }
    .dist-day-actions .btn-print { flex:0 0 auto; }

    .dist-print-group { display:inline-flex; gap:4px; flex-wrap:wrap; }
    .dist-print-group .btn { padding:2px 8px; font-size:11px; line-height:1.4; }

    .dist-print-picker { display:flex; flex-direction:column; gap:10px; }
    .dist-print-picker .dist-print-toolbar { position:sticky; top:0; background:#fff; z-index:5; display:flex; gap:6px; align-items:center; flex-wrap:wrap; padding:8px 10px; border:1px solid var(--border); border-radius:10px; background:#f6fbf7; }
    .dist-print-picker .dist-print-toolbar .pp-selectall { display:flex; gap:6px; align-items:center; font-weight:600; font-size:13px; cursor:pointer; user-select:none; }
    .dist-print-picker .dist-print-toolbar .pp-selectall input { width:16px; height:16px; }
    .dist-print-picker .dist-print-rows { max-height:460px; overflow-y:auto; border:1px solid var(--border); border-radius:10px; padding:4px 10px; background:#fafafa; }
    .dist-print-picker .pp-row { display:flex; gap:6px; align-items:center; padding:6px 4px; border-bottom:1px dashed #e2e2e2; flex-wrap:wrap; }
    .dist-print-picker .pp-row:last-child { border-bottom:none; }
    .dist-print-picker .pp-row .pp-name { flex:1; min-width:140px; font-weight:500; font-size:13px; }
    .dist-print-picker .pp-row .pp-wave { font-size:11px; color:var(--text-muted); min-width:130px; }

    .dist-day-detail { padding:10px 12px 12px; border-top:1px solid var(--border-weak, #eee); background:var(--bg-soft, #fafafa); font-size:12px; display:none; }
    .dist-day-detail.open { display:block; }
    .dist-wave-mini { background:#fff; border:1px solid var(--border); border-radius:8px; padding:8px 10px; margin-bottom:6px; }
    .dist-wave-mini .wave-head { display:flex; justify-content:space-between; gap:6px; align-items:center; margin-bottom:4px; font-weight:600; font-size:12px; }
    .dist-wave-mini ul { margin:0; padding:0; list-style:none; }
    .dist-wave-mini li { padding:3px 0; display:flex; gap:6px; flex-wrap:wrap; align-items:center; font-size:12px; border-bottom:1px dashed #eee; }
    .dist-wave-mini li:last-child { border-bottom:none; }

    .dist-empty-state { padding:32px; text-align:center; color:var(--text-muted); font-size:13px; background:var(--bg-card, #fff); border:1px dashed var(--border); border-radius:12px; }

    /* Editor modal */
    .dist-editor-grid { display:grid; grid-template-columns:minmax(0, 1fr) 320px; gap:14px; }
    @media (max-width: 980px) {
        .dist-editor-grid { grid-template-columns:1fr; }
    }
    .dist-wave-card { border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin-bottom:12px; background:#fff; }
    .dist-wave-card .wave-head { display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px; flex-wrap:wrap; }
    .dist-wave-card .wave-head .grp { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
    .dist-wave-card .wave-head .wave-num { font-size:16px; font-weight:700; color:var(--text); }
    .dist-wave-card .wave-head .wave-total { background:#e8f5e9; color:#1b5e20; font-size:12px; font-weight:600; padding:3px 8px; border-radius:8px; }
    .dist-wave-card .wave-list { border:1px solid var(--border-weak, #eee); border-radius:8px; padding:0 10px; background:#fafafa; max-height:340px; overflow-y:auto; }
    .dist-wave-card .wave-list-head { display:grid; grid-template-columns:28px minmax(0, 1fr) 60px 80px 120px; gap:8px; padding:6px 2px; font-size:11px; color:var(--text-muted); border-bottom:1px solid var(--border); font-weight:600; position:sticky; top:0; background:#fafafa; z-index:1; }
    .dist-wave-card .loc-row { display:grid; grid-template-columns:28px minmax(0, 1fr) 60px 80px 120px; gap:8px; padding:6px 2px; border-bottom:1px dashed #eee; align-items:center; }
    .dist-wave-card .loc-row .loc-print { display:flex; gap:2px; justify-content:flex-end; }
    .dist-wave-card .loc-row .loc-print .btn { padding:2px 5px; font-size:10px; line-height:1.3; }
    .dist-wave-card .loc-row:last-child { border-bottom:none; }
    .dist-wave-card .loc-row.disabled { opacity:0.55; }
    .dist-wave-card .loc-row .loc-name { font-weight:500; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .dist-wave-card .loc-row .loc-default { font-size:11px; color:var(--text-muted); text-align:right; }
    .dist-wave-card .loc-row input[type=number] { padding:3px 6px; font-size:12px; width:100%; }
    .dist-wave-card .loc-row input[type=number]:disabled { background:#f5f5f5; }

    .dist-lokasi-side { border:1px solid var(--border); border-radius:10px; padding:10px 12px; background:#fafafa; max-height:560px; overflow-y:auto; }
    .dist-lokasi-side h4 { margin:0 0 2px; font-size:13px; font-weight:700; }
    .dist-lokasi-side .hint { font-size:11px; color:var(--text-muted); margin-bottom:6px; }
    .dist-lokasi-side .loc-side-row { display:flex; gap:6px; align-items:center; padding:5px 2px; border-bottom:1px dashed #eee; font-size:12px; }
    .dist-lokasi-side .loc-side-row .name { flex:1; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    .dist-editor-topbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px; padding:10px 12px; background:#f6fbf7; border:1px solid #c8e6c9; border-radius:10px; }
    .dist-editor-topbar .grow { flex:1; }
    .dist-editor-planinfo { padding:10px 12px; border-radius:10px; margin-bottom:12px; font-size:13px; }
    .dist-editor-planinfo.has { background:#e8f5e9; border:1px solid #c8e6c9; color:#1b5e20; }
    .dist-editor-planinfo.none { background:#fff3e0; border:1px solid #ffcc80; color:#795548; }
    .dist-editor-planinfo .sub { font-size:11px; color:#555; margin-top:4px; }

    .dist-small-btn { padding:3px 8px; font-size:11px; }

    @media (max-width: 640px) {
        .dist-toolbar { flex-direction:column; align-items:stretch; }
        .dist-toolbar .group { justify-content:stretch; }
        .dist-toolbar .field input[type=date] { width:100%; }
    }
    `;
    const el = document.createElement('style');
    el.id = 'dist-v2-styles';
    el.textContent = css;
    document.head.appendChild(el);
}

function loadDistribusi() {
    _distInjectStyles();
    const container = document.getElementById('dist-container');
    if (!container) return;
    const { from, to } = distPeriodRange();

    container.innerHTML = `
        <div class="card card-pad" id="dist-top" style="margin-bottom:12px">
            <div class="dist-toolbar">
                <div>
                    <h2>Distribusi MBG</h2>
                    <div class="hint">Periode 14 hari bergulir. 1 hari = 1 plan produksi (War Room). Setiap plan boleh memiliki 1–3 wave distribusi.</div>
                        </div>
                <div class="group">
                    <div class="field">
                        <label for="dist-period-start">Tanggal mulai periode</label>
                        <input type="date" id="dist-period-start" class="input-field" value="${from}">
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="distPeriodPrev()" title="Periode sebelumnya (-14 hari)">&laquo; 14h</button>
                    <button class="btn btn-sm btn-secondary" onclick="distJumpToToday()" title="Kembali ke hari ini">Hari ini</button>
                    <button class="btn btn-sm btn-secondary" onclick="distPeriodNext()" title="Periode berikutnya (+14 hari)">14h &raquo;</button>
                    <button class="btn btn-sm btn-primary" onclick="distOpenHolidayManager()" title="Kalender libur per sekolah">Kalender Libur</button>
                    <button class="btn btn-sm btn-secondary" onclick="distPrintDistribusiPdf()" title="Print ringkasan distribusi">Print Harian</button>
                </div>
                </div>
            <div id="dist-period-strip" class="dist-period-strip">
                <span>Periode aktif:</span>
                <strong id="dist-period-label-from">${distEsc(distTglShort(from))}</strong>
                <span>&rarr;</span>
                <strong id="dist-period-label-to">${distEsc(distTglShort(to))}</strong>
                <span id="dist-period-stats" style="margin-left:auto"></span>
            </div>
            </div>
        <div id="dist-period-body">
            <div class="dist-empty-state">Memuat periode...</div>
                </div>
    `;

    const input = document.getElementById('dist-period-start');
    if (input) {
        input.addEventListener('change', () => {
            const v = input.value;
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                distSetPeriodStart(v);
                _distRenderPeriod();
            }
        });
    }

    // Fetch fresh lokasi/pj cache supaya print functions lama tetap valid.
    distSyncLokasiPjCache().finally(_distRenderPeriod);
}

async function _distRenderPeriod() {
    const body = document.getElementById('dist-period-body');
    if (!body) return;
    const { from, to } = distPeriodRange();
    const labFrom = document.getElementById('dist-period-label-from');
    const labTo = document.getElementById('dist-period-label-to');
    if (labFrom) labFrom.textContent = distTglShort(from);
    if (labTo) labTo.textContent = distTglShort(to);

    body.innerHTML = `<div class="dist-empty-state">Memuat ${distEsc(distTglShort(from))} &rarr; ${distEsc(distTglShort(to))}...</div>`;

    if (!distCanSyncToServer()) {
        body.innerHTML = `<div class="dist-empty-state" style="color:var(--danger)">Tidak terhubung ke tenant. Silakan login.</div>`;
        return;
    }

    try {
        const resp = await distApi(`/api/distribusi/period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        const days = Array.isArray(resp?.days) ? resp.days : [];
        const todayStr = distToday();

        // Agregat periode untuk strip
        const totalPlan = days.filter(d => d.plan).length;
        const totalAssign = days.reduce((s, d) => s + (Number(d.assignment_count) || 0), 0);
        const totalTarget = days.reduce((s, d) => s + (Number(d.target_portions) || Number(d.total_portion_plan) || 0), 0);
        const totalServed = days.reduce((s, d) => s + (Number(d.served_portions) || 0), 0);
        const totalHoliday = days.reduce((s, d) => s + (Number(d.holiday_count) || 0), 0);
        const stats = document.getElementById('dist-period-stats');
        if (stats) {
            stats.innerHTML = `
                <span class="dist-pill info" title="Hari dengan plan produksi">${totalPlan} plan</span>
                <span class="dist-pill violet" title="Total assignment (lokasi × hari)">${totalAssign} assignment</span>
                <span class="dist-pill success" title="Porsi terkirim / target">${totalServed}/${totalTarget} porsi</span>
                ${totalHoliday ? `<span class="dist-pill danger" title="Tanda libur per-sekolah-per-hari">${totalHoliday} libur</span>` : ''}
            `;
        }

        if (!days.length) {
            body.innerHTML = `<div class="dist-empty-state">Tidak ada hari dalam periode ini.</div>`;
        return;
    }

        const cards = days.map(d => {
            const isToday = d.date === todayStr;
            const isPast = d.date < todayStr;
            const dow = d.day_of_week;
            const isWeekend = (dow === 0 || dow === 6);
            const dayNum = d.date.slice(8, 10);
            const monthShort = new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            const dayName = new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' });

            const planPill = d.plan
                ? `<span class="dist-pill ok">Plan ${distEsc(d.plan.code || 'aktif')}</span>`
                : `<span class="dist-pill warn">Belum ada plan</span>`;
            const wavePill = d.wave_count > 0
                ? `<span class="dist-pill info">${d.wave_count} wave</span>`
                : `<span class="dist-pill muted">0 wave</span>`;
            const assignPill = d.assignment_count > 0
                ? `<span class="dist-pill violet">${d.distinct_lokasi_assigned} lokasi</span>`
                : '';
            const holidayPill = d.holiday_count > 0
                ? `<span class="dist-pill danger">${d.holiday_count} libur</span>`
                : '';
            const target = Number(d.target_portions) || Number(d.total_portion_plan) || 0;
            const served = Number(d.served_portions) || 0;
            const pct = target > 0 ? Math.min(100, Math.round((served / target) * 100)) : 0;
            const portionPill = target > 0
                ? `<span class="dist-pill success">${served}/${target} porsi</span>`
                : `<span class="dist-pill muted">0 porsi</span>`;

            return `
                <div class="dist-day-card ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''} ${isWeekend ? 'is-weekend' : ''}" data-date="${d.date}">
                    <div class="dist-day-head">
                        <div>
                            <div class="date-num">${distEsc(dayNum)}</div>
                            <div class="date-sub">${distEsc(dayName)} &middot; ${distEsc(monthShort)}</div>
                </div>
                        ${isToday ? '<div class="date-today-pill">HARI INI</div>' : ''}
                </div>
                    <div class="dist-day-body">
                        <div class="dist-pill-row">${planPill}${holidayPill}</div>
                        <div class="dist-pill-row">${wavePill}${assignPill}${portionPill}</div>
                        <div class="dist-day-meta">
                            <span><span class="lbl">Porsi</span> <span class="val">${served}/${target}</span></span>
                            ${d.delivered_events > 0 ? `<span><span class="lbl">Terkirim</span> <span class="val">${d.delivered_events}</span></span>` : ''}
                            ${d.verified_events > 0 ? `<span><span class="lbl">Verified</span> <span class="val">${d.verified_events}</span></span>` : ''}
                </div>
                        <div class="dist-portion-bar"><span style="width:${pct}%"></span></div>
            </div>
                    <div class="dist-day-actions">
                        <button class="btn btn-sm btn-primary" onclick="distOpenDayEditor('${d.date}')">Atur distribusi</button>
                        <button class="btn btn-sm btn-secondary" onclick="distToggleDayRow('${d.date}')" title="Lihat detail wave"><span id="dist-day-toggle-${d.date}">Detail</span></button>
                        <button class="btn btn-sm btn-secondary btn-print" onclick="distOpenPrintPicker('${d.date}')" title="Cetak Surat Jalan / Uji Organoleptik / BAST">Print</button>
                </div>
                    <div id="dist-day-detail-${d.date}" class="dist-day-detail">
                        <div id="dist-day-detail-body-${d.date}">Memuat detail...</div>
                </div>
                </div>
            `;
        }).join('');

        body.innerHTML = `<div class="dist-day-grid">${cards}</div>`;
    } catch (e) {
        body.innerHTML = `<div class="dist-empty-state" style="color:var(--danger)">Gagal memuat periode: ${distEsc(e.message || e)}</div>`;
    }
}

function distPeriodPrev() {
    const cur = distGetPeriodStart();
    const prev = distAddDaysISO(cur, -14);
    distSetPeriodStart(prev);
    const input = document.getElementById('dist-period-start');
    if (input) input.value = prev;
    _distRenderPeriod();
}

function distPeriodNext() {
    const cur = distGetPeriodStart();
    const next = distAddDaysISO(cur, 14);
    distSetPeriodStart(next);
    const input = document.getElementById('dist-period-start');
    if (input) input.value = next;
    _distRenderPeriod();
}

function distJumpToToday() {
    const today = distToday();
    distSetPeriodStart(today);
    const input = document.getElementById('dist-period-start');
    if (input) input.value = today;
    _distRenderPeriod();
}

/* ====================================================
   INLINE DETAIL (expand row per hari)
   ==================================================== */

async function distToggleDayRow(date) {
    const detail = document.getElementById(`dist-day-detail-${date}`);
    if (!detail) return;
    const toggle = document.getElementById(`dist-day-toggle-${date}`);
    const isOpen = detail.classList.contains('open');
    if (isOpen) {
        detail.classList.remove('open');
        if (toggle) toggle.textContent = 'Detail';
        return;
    }
    detail.classList.add('open');
    if (toggle) toggle.textContent = 'Tutup';
    const body = document.getElementById(`dist-day-detail-body-${date}`);
    body.innerHTML = 'Memuat detail...';
    try {
        const data = await distApi(`/api/distribusi/day?date=${encodeURIComponent(date)}`);
        const lokasiById = new Map((data.lokasi || []).map(l => [String(l.id), l]));
        distMirrorEventsToLocal(date, data.assignments || [], lokasiById);

        const waves = Array.isArray(data.waves) ? data.waves : [];
        const assignments = Array.isArray(data.assignments) ? data.assignments : [];
        const holidayLokasi = (data.lokasi || []).filter(l => l.is_holiday);
        const unassigned = (data.lokasi || []).filter(l => !assignments.some(a => String(a.lokasi_id) === String(l.id)) && !l.is_holiday);

        const waveBlocks = waves.map(w => {
            const items = assignments.filter(a => Number(a.wave_number) === Number(w.wave_number));
            const totalTarget = items.reduce((s, a) => s + (Number(a.target_portions) || 0), 0);
            const totalServed = items.reduce((s, a) => s + (Number(a.served_portions) || 0), 0);
            const lokasiList = items.map(a => {
                const l = lokasiById.get(String(a.lokasi_id));
                const nama = l ? l.nama : a.lokasi_id;
                const evPill = a.delivered_at
                    ? `<span class="dist-pill success">terkirim</span>`
                    : `<span class="dist-pill muted">pending</span>`;
                const actionBtns = a.event_id ? `
                    <span class="dist-print-group">
                        <button class="btn btn-xs btn-secondary dist-small-btn" onclick="distPrintSuratJalan('${distEsc(a.event_id)}')" title="Cetak Surat Jalan">Surat Jalan</button>
                        <button class="btn btn-xs btn-secondary dist-small-btn" onclick="distPrintUjiOrg('${distEsc(a.event_id)}')" title="Cetak Uji Organoleptik">Uji Org.</button>
                        <button class="btn btn-xs btn-secondary dist-small-btn" onclick="distPrintBASTPackaging('${distEsc(a.event_id)}')" title="Cetak BAST Packaging">BAST</button>
                    </span>
                ` : '<span class="dist-pill muted" title="Assignment belum disimpan. Klik Atur distribusi untuk membuat event.">belum ada event</span>';
                return `<li>
                    <span style="flex:1;min-width:140px">${distEsc(nama)}</span>
                    <span class="dist-pill muted">${Number(a.target_portions) || 0} porsi</span>
                    ${evPill}
                    ${actionBtns}
                </li>`;
            }).join('');
            return `
                <div class="dist-wave-mini">
                    <div class="wave-head">
                        <span>Wave ${w.wave_number} &middot; ${distEsc(distFmtTime(w.delivery_time))}</span>
                        <span>
                            ${items.length} lokasi &middot; ${totalServed}/${totalTarget} porsi
                            ${w.source === 'plan' ? '<span class="dist-pill ok" style="margin-left:4px">plan</span>' : '<span class="dist-pill warn" style="margin-left:4px">manual</span>'}
                        </span>
                    </div>
                    <ul>${lokasiList || '<li style="color:var(--text-muted)">Belum ada lokasi di wave ini.</li>'}</ul>
                </div>
            `;
        }).join('');

        const holidayBlock = holidayLokasi.length ? `
            <div style="margin-top:6px;font-size:12px;color:var(--text-muted)">
                <strong style="color:#b71c1c">${holidayLokasi.length} libur:</strong>
                ${holidayLokasi.slice(0, 10).map(l => `<span class="dist-pill danger" style="margin:2px">${distEsc(l.nama)}${l.holiday_reason ? ' — ' + distEsc(l.holiday_reason) : ''}</span>`).join('')}
                ${holidayLokasi.length > 10 ? `<span class="dist-pill muted">+${holidayLokasi.length - 10} lainnya</span>` : ''}
            </div>
        ` : '';

        const unassignedBlock = unassigned.length ? `
            <div style="margin-top:6px;font-size:12px;color:var(--text-muted)">
                <strong>${unassigned.length} belum di-assign:</strong>
                ${unassigned.slice(0, 10).map(l => `<span class="dist-pill muted" style="margin:2px">${distEsc(l.nama)}</span>`).join('')}
                ${unassigned.length > 10 ? `<span class="dist-pill muted">+${unassigned.length - 10} lainnya</span>` : ''}
            </div>
        ` : '';

        body.innerHTML = `
            ${waves.length ? waveBlocks : '<div style="color:var(--text-muted);padding:6px 0">Belum ada wave untuk tanggal ini. Klik <em>Atur distribusi</em> untuk membuat wave dan assign sekolah.</div>'}
            ${unassignedBlock}
            ${holidayBlock}
        `;
    } catch (e) {
        body.innerHTML = `<div style="color:var(--danger)">Gagal memuat detail: ${distEsc(e.message || e)}</div>`;
    }
}

/* ====================================================
   DAY EDITOR MODAL (wave + assign sekolah)
   ==================================================== */

window._distDayState = {
    date: null,
    planId: null,
    lokasi: [],            // array lokasi lengkap (dengan default_portions, is_holiday)
    lokasiById: new Map(),
    waves: []              // [{wave_number, delivery_time_hhmm, lokasi_ids:Set, portions:{lokasi_id: number}, source}]
};

async function distOpenDayEditor(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        distNotify('Tanggal tidak valid', 'error');
        return;
    }
    if (typeof openModalUi !== 'function') {
        distNotify('Modal UI belum siap', 'error');
        return;
    }

    // Loading modal
    openModalUi({
        title: 'Atur Distribusi — ' + distTglPanjang(date),
        size: 'xl',
        bodyHtml: `<div id="dist-day-editor-root" style="min-height:260px">Memuat data...</div>`,
        actions: []
    });

    try {
        const data = await distApi(`/api/distribusi/day?date=${encodeURIComponent(date)}`);
        const state = window._distDayState = {
            date,
            planId: data.plan ? data.plan.id : null,
            plan: data.plan || null,
            lokasi: (data.lokasi || []).slice().sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || ''))),
            lokasiById: new Map((data.lokasi || []).map(l => [String(l.id), l])),
            waves: []
        };
        distMirrorEventsToLocal(date, data.assignments || [], state.lokasiById);

        // Build initial waves state from server data.
        const waves = Array.isArray(data.waves) ? data.waves : [];
        const assignments = Array.isArray(data.assignments) ? data.assignments : [];
        const assignByWave = new Map();
        for (const a of assignments) {
            const wn = Number(a.wave_number) || 0;
            if (!assignByWave.has(wn)) assignByWave.set(wn, []);
            assignByWave.get(wn).push(a);
        }

        if (waves.length === 0) {
            // default 1 wave kosong
            state.waves.push({
                wave_number: 1,
                delivery_time_hhmm: '10:00',
                lokasi_ids: new Set(),
                portions: {},
                events: {},
                source: 'manual'
            });
        } else {
            waves.forEach(w => {
                const asg = assignByWave.get(Number(w.wave_number)) || [];
                const portions = {};
                const events = {};
                const lokasiSet = new Set();
                for (const a of asg) {
                    lokasiSet.add(String(a.lokasi_id));
                    portions[String(a.lokasi_id)] = Number(a.target_portions) || 0;
                    if (a.event_id) events[String(a.lokasi_id)] = String(a.event_id);
                }
                state.waves.push({
                    wave_number: Number(w.wave_number) || (state.waves.length + 1),
                    delivery_time_hhmm: distDeliveryTimeToIsoHHMM(w.delivery_time) || '10:00',
                    lokasi_ids: lokasiSet,
                    portions,
                    events,
                    source: w.source || 'manual'
                });
            });
        }

        // Jika tidak ada plan dan tidak ada wave di assignment, isi default dari jam standard.
        _distRenderDayEditor();
    } catch (e) {
        const root = document.getElementById('dist-day-editor-root');
        if (root) root.innerHTML = `<div style="color:var(--danger)">Gagal memuat: ${distEsc(e.message || e)}</div>`;
    }
}

function _distRenderDayEditor() {
    const root = document.getElementById('dist-day-editor-root');
    if (!root) return;
    const s = window._distDayState;
    if (!s || !s.date) return;

    // Build: which lokasi is locked to which wave
    const lokasiToWave = new Map();
    s.waves.forEach(w => {
        for (const lid of w.lokasi_ids) {
            lokasiToWave.set(String(lid), w.wave_number);
        }
    });

    _distInjectStyles();

    const planHeader = s.plan
        ? `<div class="dist-editor-planinfo has">
             <strong>Plan Produksi ${distEsc(s.plan.code || 'PL')}</strong>
             &middot; Target <strong>${Number(s.plan.target_portions) || 0}</strong> porsi
             &middot; Delivery utama <strong>${distEsc(distFmtTime(s.plan.target_delivery_time))}</strong>
             <div class="sub">Wave dari plan sudah di-prefill. Anda boleh mengubah jam, menambah/menghapus wave (maks 3), dan men-assign sekolah.</div>
           </div>`
        : `<div class="dist-editor-planinfo none">
             Belum ada <strong>plan produksi</strong> untuk tanggal ini. Anda masih bisa atur wave manual, namun sebaiknya publish plan dari <em>War Room</em> dulu.
           </div>`;

    const holidayCount = s.lokasi.filter(l => l.is_holiday).length;
    const holidayChip = holidayCount
        ? `<span class="dist-pill danger">${holidayCount} lokasi libur hari ini</span>`
        : `<span class="dist-pill ok">Tidak ada lokasi libur</span>`;

    const addWaveBtn = s.waves.length < 3
        ? `<button class="btn btn-sm btn-primary" onclick="distAddWave()">+ Tambah Wave (${s.waves.length}/3)</button>`
        : `<span class="dist-pill warn">Maksimum 3 wave</span>`;

    // Side panel: ringkasan lokasi
    const lokasiSideHtml = s.lokasi.map(l => {
        const lid = String(l.id);
        const assignedWave = lokasiToWave.get(lid);
        const isHoliday = !!l.is_holiday;
        const defPortions = Number(l.default_portions) || distDefaultPortions(l);
        const statusPill = isHoliday
            ? `<span class="dist-pill danger">libur</span>`
            : assignedWave
                ? `<span class="dist-pill info">W${assignedWave}</span>`
                : `<span class="dist-pill muted">–</span>`;
        return `<div class="loc-side-row" title="${distEsc(l.nama)}${isHoliday && l.holiday_reason ? ' — ' + distEsc(l.holiday_reason) : ''}">
            <span class="name">${distEsc(l.nama)}</span>
            <span class="dist-pill muted">${defPortions}</span>
            ${statusPill}
        </div>`;
    }).join('');

    // Wave cards
    const waveBlocks = s.waves.map((w, idx) => {
        const rows = s.lokasi.map(l => {
            const lid = String(l.id);
            const assignedWave = lokasiToWave.get(lid);
            const inThisWave = assignedWave === w.wave_number;
            const inOtherWave = !!assignedWave && !inThisWave;
            const isHoliday = !!l.is_holiday;
            const disabled = inOtherWave || isHoliday;
            const defaultPortions = Number(l.default_portions) || distDefaultPortions(l);
            const portionVal = (inThisWave && Number.isFinite(Number(w.portions[lid]))) ? Number(w.portions[lid]) : defaultPortions;
            const badge = isHoliday
                ? `<span class="dist-pill danger">libur</span>`
                : inOtherWave ? `<span class="dist-pill warn">W${assignedWave}</span>` : '';
            const evId = inThisWave ? (w.events && w.events[lid]) : null;
            const printCell = evId ? `
                <span class="loc-print">
                    <button class="btn btn-xs btn-secondary" type="button" onclick="event.preventDefault();distPrintSuratJalan('${distEsc(evId)}')" title="Cetak Surat Jalan">SJ</button>
                    <button class="btn btn-xs btn-secondary" type="button" onclick="event.preventDefault();distPrintUjiOrg('${distEsc(evId)}')" title="Cetak Uji Organoleptik">UO</button>
                    <button class="btn btn-xs btn-secondary" type="button" onclick="event.preventDefault();distPrintBASTPackaging('${distEsc(evId)}')" title="Cetak BAST Packaging">BAST</button>
                </span>
            ` : `<span class="loc-print" style="color:var(--text-muted);font-size:10px;justify-content:flex-end">${inThisWave ? 'simpan dulu' : ''}</span>`;
            return `
                <label class="loc-row ${disabled ? 'disabled' : ''}">
                    <input type="checkbox"
                           ${inThisWave ? 'checked' : ''}
                           ${disabled ? 'disabled' : ''}
                           onchange="distToggleLokasiInWave(${idx}, '${distEsc(lid)}', this.checked)">
                    <span class="loc-name" title="${distEsc(l.nama)}">${distEsc(l.nama)} ${badge}</span>
                    <span class="loc-default">def ${defaultPortions}</span>
                    <input type="number" min="0" step="1" class="input-field"
                           value="${inThisWave ? portionVal : ''}"
                           ${!inThisWave ? 'disabled' : ''}
                           placeholder="${defaultPortions}"
                           onchange="distSetPortionInWave(${idx}, '${distEsc(lid)}', this.value)">
                    ${printCell}
                </label>
            `;
        }).join('');

        const sumPortion = Array.from(w.lokasi_ids).reduce((s2, lid) => {
            const l = window._distDayState.lokasiById.get(String(lid));
            const def = l ? (Number(l.default_portions) || distDefaultPortions(l)) : 0;
            const v = w.portions[String(lid)];
            return s2 + (Number.isFinite(Number(v)) ? Number(v) : def);
        }, 0);

        return `
            <div class="dist-wave-card">
                <div class="wave-head">
                    <div class="grp">
                        <span class="wave-num">Wave ${w.wave_number}</span>
                        <span class="dist-pill ${w.source === 'plan' ? 'ok' : 'warn'}">${w.source === 'plan' ? 'dari plan' : 'manual'}</span>
                        <span class="wave-total" id="dist-wave-total-${idx}">${sumPortion} porsi &middot; ${w.lokasi_ids.size} sekolah</span>
                    </div>
                    <div class="grp">
                        <label style="font-size:12px;color:var(--text-muted)">Jam</label>
                        <input type="time" class="input-field" style="padding:4px 6px;width:100px;font-size:12px" value="${distEsc(w.delivery_time_hhmm || '')}" onchange="distSetWaveTime(${idx}, this.value)">
                        <button class="btn btn-xs btn-secondary dist-small-btn" onclick="distSelectAllInWave(${idx}, true)" title="Pilih semua lokasi non-libur yang masih bebas">Pilih semua</button>
                        <button class="btn btn-xs btn-secondary dist-small-btn" onclick="distSelectAllInWave(${idx}, false)" title="Kosongkan wave ini">Kosongkan</button>
                        <button class="btn btn-xs btn-danger dist-small-btn" onclick="distRemoveWave(${idx})" ${s.waves.length <= 1 ? 'disabled' : ''} title="Hapus wave ini">Hapus</button>
                    </div>
                </div>
                <div class="wave-list">
                    <div class="wave-list-head">
                        <span></span><span>Sekolah</span><span class="loc-default">Default</span><span>Porsi</span><span style="text-align:right">Cetak</span>
                    </div>
                    ${rows}
                </div>
            </div>
        `;
    }).join('');

    root.innerHTML = `
        ${planHeader}
        <div class="dist-editor-topbar">
            ${addWaveBtn}
            ${holidayChip}
            <button class="btn btn-xs btn-secondary" onclick="distOpenHolidayManager('${distEsc(s.date)}')">Atur libur per sekolah</button>
            <span class="grow"></span>
            <button class="btn btn-sm btn-primary" onclick="distSaveDayEditor()">Simpan</button>
            <button class="btn btn-sm btn-secondary" onclick="closeModalUi && closeModalUi()">Tutup</button>
        </div>
        <div class="dist-editor-grid">
            <div>${waveBlocks}</div>
            <div class="dist-lokasi-side">
                <h4>Daftar Lokasi (${s.lokasi.length})</h4>
                <div class="hint">Ringkasan status + wave yang sudah assign.</div>
                ${lokasiSideHtml || '<div class="hint">Belum ada lokasi.</div>'}
            </div>
        </div>
    `;
}

function distAddWave() {
    const s = window._distDayState;
    if (!s || s.waves.length >= 3) return;
    const prev = s.waves[s.waves.length - 1];
    const prevHHMM = prev ? prev.delivery_time_hhmm : '10:00';
    const nextHH = (() => {
        const [h, m] = String(prevHHMM || '10:00').split(':').map(x => parseInt(x, 10) || 0);
        const total = Math.min(23 * 60 + 59, h * 60 + m + 90);
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    })();
    s.waves.push({
        wave_number: s.waves.length + 1,
        delivery_time_hhmm: nextHH,
        lokasi_ids: new Set(),
        portions: {},
        events: {},
        source: 'manual'
    });
    _distRenderDayEditor();
}

function distRemoveWave(idx) {
    const s = window._distDayState;
    if (!s || s.waves.length <= 1) return;
    s.waves.splice(idx, 1);
    s.waves.forEach((w, i) => { w.wave_number = i + 1; });
    _distRenderDayEditor();
}

function distSetWaveTime(idx, hhmm) {
    const s = window._distDayState;
    if (!s || !s.waves[idx]) return;
    s.waves[idx].delivery_time_hhmm = String(hhmm || '').slice(0, 5);
}

function distToggleLokasiInWave(idx, lokasiId, checked) {
    const s = window._distDayState;
    if (!s || !s.waves[idx]) return;
    const w = s.waves[idx];
    const lid = String(lokasiId);
    if (checked) {
        // remove from other waves just in case (shouldn't happen because of disabled)
        s.waves.forEach((ow, i) => {
            if (i !== idx) { ow.lokasi_ids.delete(lid); delete ow.portions[lid]; }
        });
        w.lokasi_ids.add(lid);
        if (!(lid in w.portions)) {
            const loc = s.lokasiById.get(lid);
            w.portions[lid] = loc ? (Number(loc.default_portions) || distDefaultPortions(loc)) : 0;
        }
        } else {
        w.lokasi_ids.delete(lid);
        delete w.portions[lid];
    }
    _distRenderDayEditor();
}

function distSetPortionInWave(idx, lokasiId, value) {
    const s = window._distDayState;
    if (!s || !s.waves[idx]) return;
    const v = parseInt(value, 10);
    if (!Number.isFinite(v) || v < 0) return;
    s.waves[idx].portions[String(lokasiId)] = v;
    const totalEl = document.getElementById(`dist-wave-total-${idx}`);
    if (totalEl) {
        const w = s.waves[idx];
        const sum = Array.from(w.lokasi_ids).reduce((s2, lid) => {
            const l = s.lokasiById.get(String(lid));
            const def = l ? (Number(l.default_portions) || distDefaultPortions(l)) : 0;
            const vv = w.portions[String(lid)];
            return s2 + (Number.isFinite(Number(vv)) ? Number(vv) : def);
        }, 0);
        totalEl.textContent = `${sum} porsi · ${w.lokasi_ids.size} sekolah`;
    }
}

function distSelectAllInWave(idx, select) {
    const s = window._distDayState;
    if (!s || !s.waves[idx]) return;
    const w = s.waves[idx];
    if (select) {
        // semua lokasi yang belum di wave lain dan bukan libur
        const taken = new Set();
        s.waves.forEach((ow, i) => { if (i !== idx) ow.lokasi_ids.forEach(lid => taken.add(String(lid))); });
        for (const l of s.lokasi) {
            const lid = String(l.id);
            if (l.is_holiday) continue;
            if (taken.has(lid)) continue;
            w.lokasi_ids.add(lid);
            if (!(lid in w.portions)) w.portions[lid] = Number(l.default_portions) || distDefaultPortions(l);
        }
    } else {
        w.lokasi_ids.clear();
        w.portions = {};
    }
    _distRenderDayEditor();
}

async function distSaveDayEditor() {
    const s = window._distDayState;
    if (!s || !s.date) return;
    const payload = {
        date: s.date,
        waves: s.waves.map((w, i) => ({
            wave_number: i + 1,
            delivery_time: distComposeDeliveryIso(s.date, w.delivery_time_hhmm),
            lokasi_ids: Array.from(w.lokasi_ids),
            lokasi_portions: w.portions
        }))
    };
    // Guard: each wave must have a time
    for (const w of payload.waves) {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(String(w.delivery_time))) {
            distNotify(`Wave ${w.wave_number} belum memiliki jam kirim yang valid`, 'error');
            return;
        }
    }

    try {
        const resp = await distApi('/api/distribusi/day', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        distNotify('Distribusi harian tersimpan', 'success');
        // Mirror to local untuk print functions lama
        const lokasiById = new Map((resp.lokasi || []).map(l => [String(l.id), l]));
        distMirrorEventsToLocal(s.date, resp.assignments || [], lokasiById);
        if (typeof closeModalUi === 'function') closeModalUi();
        _distRenderPeriod();
    } catch (e) {
        distNotify('Gagal menyimpan: ' + (e.message || e), 'error');
    }
}

/* ====================================================
   HOLIDAY MANAGER (per sekolah) — modal global
   ==================================================== */

window._distHolidayState = {
    lokasi: [],
    holidays: [],          // {lokasi_id, date, reason}
    filterLokasi: '',
    focusDate: null
};

async function distOpenHolidayManager(focusDate) {
    if (typeof openModalUi !== 'function') {
        distNotify('Modal UI belum siap', 'error');
        return;
    }
    openModalUi({
        title: 'Kalender Libur per Sekolah',
        size: 'lg',
        bodyHtml: `<div id="dist-holiday-root" style="min-height:260px">Memuat data...</div>`,
        actions: []
    });
    try {
        const { from, to } = distPeriodRange();
        const fromH = distAddDaysISO(from, -30);
        const toH = distAddDaysISO(to, 60);
        const [lokasi, holidays] = await Promise.all([
            distApi('/api/penerima-manfaat/lokasi'),
            distApi(`/api/penerima-manfaat/holidays?from=${encodeURIComponent(fromH)}&to=${encodeURIComponent(toH)}`)
        ]);
        window._distHolidayState = {
            lokasi: (Array.isArray(lokasi) ? lokasi : []).slice().sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || ''))),
            holidays: Array.isArray(holidays) ? holidays : [],
            filterLokasi: '',
            focusDate: focusDate || distToday()
        };
        _distRenderHolidayManager();
    } catch (e) {
        const root = document.getElementById('dist-holiday-root');
        if (root) root.innerHTML = `<div style="color:var(--danger)">Gagal memuat: ${distEsc(e.message || e)}</div>`;
    }
}

function _distRenderHolidayManager() {
    const root = document.getElementById('dist-holiday-root');
    if (!root) return;
    const s = window._distHolidayState;
    const filtered = s.filterLokasi
        ? s.lokasi.filter(l => String(l.nama || '').toLowerCase().includes(s.filterLokasi.toLowerCase()))
        : s.lokasi;

    const hByLokasi = new Map();
    for (const h of s.holidays) {
        const k = String(h.lokasi_id);
        if (!hByLokasi.has(k)) hByLokasi.set(k, []);
        hByLokasi.get(k).push(h);
    }

    const rows = filtered.map(l => {
        const lid = String(l.id);
        const list = (hByLokasi.get(lid) || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
        const chips = list.map(h => `
            <span class="badge" style="background:#ffe0b2;color:#bf360c;margin:2px;display:inline-flex;align-items:center;gap:4px">
                ${distEsc(distTglShort(h.date))}${h.reason ? ' · ' + distEsc(h.reason) : ''}
                <button class="btn btn-xs btn-icon" style="padding:0 4px;font-size:11px" onclick="distDeleteHoliday('${distEsc(lid)}','${distEsc(h.date)}')" title="Hapus">×</button>
            </span>
        `).join('');
        return `
            <tr>
                <td><strong>${distEsc(l.nama)}</strong><br><span style="font-size:11px;color:var(--text-muted)">${distEsc(l.jenis || '')}</span></td>
                <td>${chips || '<span style="color:var(--text-muted);font-size:11px">Tidak ada libur tercatat</span>'}</td>
                <td style="white-space:nowrap">
                    <input type="date" id="dist-hol-date-${distEsc(lid)}" class="input-field" style="padding:3px 6px;font-size:12px" value="${distEsc(s.focusDate || distToday())}">
                    <input type="text" id="dist-hol-reason-${distEsc(lid)}" class="input-field" placeholder="alasan (opsional)" style="padding:3px 6px;font-size:12px;width:150px">
                    <button class="btn btn-xs btn-primary" onclick="distAddHoliday('${distEsc(lid)}')">+ Tambah</button>
                </td>
            </tr>
        `;
    }).join('');

    root.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
            <input type="text" class="input-field" placeholder="Cari sekolah..." style="max-width:240px"
                   value="${distEsc(s.filterLokasi || '')}" oninput="window._distHolidayState.filterLokasi=this.value;_distRenderHolidayManager()">
            <span style="flex:1"></span>
            <span style="font-size:12px;color:var(--text-muted)">Total: ${s.lokasi.length} lokasi · ${s.holidays.length} tanggal libur</span>
        </div>
        <div style="max-height:480px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
            <table class="data-table" style="margin:0;width:100%">
                <thead><tr>
                    <th style="width:220px">Sekolah</th>
                    <th>Tanggal Libur</th>
                    <th style="width:360px">Tambah libur baru</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="3" style="text-align:center">Tidak ada lokasi.</td></tr>'}</tbody>
            </table>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-sm btn-secondary" onclick="closeModalUi && closeModalUi()">Tutup</button>
        </div>
    `;
}

async function distAddHoliday(lokasiId) {
    const dateEl = document.getElementById(`dist-hol-date-${lokasiId}`);
    const reasonEl = document.getElementById(`dist-hol-reason-${lokasiId}`);
    const date = (dateEl && dateEl.value) || '';
    const reason = (reasonEl && reasonEl.value) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return distNotify('Tanggal libur wajib diisi', 'error');
    try {
        await distApi('/api/penerima-manfaat/holidays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lokasi_id: lokasiId, date, reason })
        });
        const existingIdx = window._distHolidayState.holidays.findIndex(h => String(h.lokasi_id) === String(lokasiId) && h.date === date);
        if (existingIdx >= 0) {
            window._distHolidayState.holidays[existingIdx].reason = reason;
        } else {
            window._distHolidayState.holidays.push({ lokasi_id: lokasiId, date, reason });
        }
        _distRenderHolidayManager();
        distNotify('Libur ditambahkan');
    } catch (e) {
        distNotify('Gagal menambah libur: ' + (e.message || e), 'error');
    }
}

async function distDeleteHoliday(lokasiId, date) {
    if (!confirm(`Hapus tanda libur ${distTglShort(date)} untuk lokasi ini?`)) return;
    try {
        await distApi('/api/penerima-manfaat/holidays', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lokasi_id: lokasiId, date })
        });
        window._distHolidayState.holidays = window._distHolidayState.holidays.filter(h => !(String(h.lokasi_id) === String(lokasiId) && h.date === date));
        _distRenderHolidayManager();
        distNotify('Libur dihapus');
    } catch (e) {
        distNotify('Gagal menghapus libur: ' + (e.message || e), 'error');
    }
}

/* ====================================================
   LEGACY SUPPORT — dipakai oleh fungsi print
   (distFindById('distribusi', id) -> mirror pm_distribution_events)
   ==================================================== */

async function distResyncDistribusiForTanggal(tanggal) {
    try {
        if (!distCanSyncToServer()) return;
        const data = await distApi(`/api/distribusi/day?date=${encodeURIComponent(tanggal)}`);
        const lokasiById = new Map((data.lokasi || []).map(l => [String(l.id), l]));
        distMirrorEventsToLocal(tanggal, data.assignments || [], lokasiById);
    } catch (e) {
        console.warn('distResyncDistribusiForTanggal failed:', e);
    }
}

/* ====================================================
   PRINT HELPERS (dipertahankan dari versi lama)
   ==================================================== */

function _distPrintKop() {
    return `
        <div class="kop">
            <h2>Program Makan Bergizi Gratis (MBG)</h2>
            <p>Sistem Manajemen Dapur MBG · DJATI CORP</p>
        </div>`;
}

function _distPrintCSS() {
    return `
        body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; margin: 0; padding: 20px; }
        @page { size: A4; margin: 1.5cm 2cm; }
        .kop { text-align:center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 18px; }
        .kop h2 { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 3px 0; }
        .kop p { font-size: 10pt; margin: 2px 0; }
        .title { text-align:center; margin: 16px 0 12px; }
        .title h3 { font-size: 13pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; line-height:1.5; }
        .info { margin: 12px 0; font-size: 11pt; }
        .info td { padding: 2px 6px 2px 0; vertical-align: top; }
        .info td:first-child { min-width: 160px; }
        table.pt { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11pt; }
        table.pt th, table.pt td { border: 1px solid #333; padding: 6px 9px; }
        table.pt th { background: #ebebeb; font-weight: bold; text-align: center; }
        .c { text-align:center; } .r { text-align:right; }
        .sign { margin-top: 28px; display: flex; justify-content: space-between; gap: 16px; }
        .sb { text-align:center; min-width: 180px; flex: 1; }
        .sb .role { font-weight: bold; margin-bottom: 56px; font-size:11pt; }
        .sb .name { font-weight: bold; border-top: 1px solid #000; padding-top: 4px; font-size:11pt; }
        .note { font-size:10pt; font-style:italic; margin:8px 0; }
        .sj-lead { font-size:11pt; margin: 10px 0; line-height: 1.5; }`;
}

// Collector mode: bila non-null, _distOpenPrint akan push HTML ke sini
// alih-alih membuka jendela. Dipakai untuk bulk print.
window.__distPrintCollector = null;

function _distOpenPrint(html) {
    if (window.__distPrintCollector && Array.isArray(window.__distPrintCollector)) {
        window.__distPrintCollector.push(html);
        return;
    }
    let w = null;
    try {
        w = window.open('', '_blank', 'width=900,height=700');
    } catch (e) {
        w = null;
    }
    if (w && w.document) {
        try {
            w.document.open();
    w.document.write(html);
    w.document.close();
            w.focus();
            return;
        } catch (e) {
            console.warn('Popup write failed, falling back to iframe:', e);
        }
    }
    // Fallback: popup blocked -> gunakan iframe tersembunyi untuk mencetak di tab yang sama.
    try {
        const prev = document.getElementById('dist-print-iframe');
        if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
        const iframe = document.createElement('iframe');
        iframe.id = 'dist-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.warn('Iframe print failed:', err);
                alert('Browser memblokir popup cetak. Izinkan popup untuk halaman ini lalu coba lagi, atau gunakan Ctrl+P.');
            }
        }, 350);
    } catch (e) {
        console.error('Print fallback failed:', e);
        alert('Gagal membuka jendela cetak: ' + (e.message || e) + '. Izinkan popup untuk halaman ini.');
    }
}

/* ====================================================
   SURAT JALAN — layout mengikuti contoh PDF resmi per jenis lokasi
   (KB/TK/PAUD, SD, SMP/SMA, Posyandu). Nama SPPG & penandatanganan diambil
   dari GET /api/distribusi/surat-jalan-meta (lapkeu + tenant + staff + users).
   ==================================================== */

function _distSjEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Atribut HTML (mis. src logo data URL) */
function _distSjAttr(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
}

function _distSjVariantKey(lok) {
    const j = String(lok && lok.jenis || '').trim();
    if (j === 'KB' || j === 'TK' || j === 'PAUD') return 'kb_tk_paud';
    if (j === 'SD') return 'sd';
    if (j === 'SMP' || j === 'SMA') return 'smp_sma';
    if (j === 'Posyandu') return 'posyandu';
    return 'generic';
}

/** Tanggal surat jalan format contoh: DD/MM/YYYY */
function distTglSjPad(dateStr) {
    if (!dateStr) return '—';
    const m = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '—';
    return m[3] + '/' + m[2] + '/' + m[1];
}

let _distSjCtxCache = { t: 0, data: null };

function _distSjInvalidateContext() {
    _distSjCtxCache = { t: 0, data: null };
}

async function _distSjLoadContext() {
    const now = Date.now();
    if (_distSjCtxCache.data && (now - _distSjCtxCache.t) < 5000) return _distSjCtxCache.data;
    let staff = [];
    let meta = {};
    if (typeof distCanSyncToServer === 'function' && distCanSyncToServer()) {
        try {
            const pair = await Promise.all([
                distApi('/api/staff').catch(() => []),
                distApi('/api/distribusi/surat-jalan-meta').catch(() => ({}))
            ]);
            staff = pair[0];
            meta = pair[1] && typeof pair[1] === 'object' ? pair[1] : {};
        } catch (e) {
            staff = [];
            meta = {};
        }
    }
    const staffList = Array.isArray(staff) ? staff : [];
    const staffById = new Map(staffList.map(s => [String(s.id), s]));
    const pickFirstName = (roleKey) => {
        const role = String(roleKey || '').toLowerCase();
        const m = staffList.filter(s => String(s.role || '').toLowerCase() === role);
        m.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' }));
        return m[0] ? String(m[0].name || '').trim() : '';
    };
    let sppgLine = String(meta.sppg_line || '').trim();
    if (!sppgLine) {
        let tenantNm = '';
        try {
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.tenant && currentUser.tenant.name) {
                tenantNm = String(currentUser.tenant.name).trim();
            }
        } catch (e) { /* ignore */ }
        const ns = String(meta.nama_sppg_setup || '').trim();
        if (/^sppg\b/i.test(ns)) sppgLine = ns.toUpperCase();
        else if (ns) sppgLine = ('SPPG ' + ns).toUpperCase();
        else if (/^sppg\b/i.test(tenantNm)) sppgLine = tenantNm.toUpperCase();
        else if (tenantNm) sppgLine = ('SPPG ' + tenantNm).toUpperCase();
        else sppgLine = 'SPPG';
    }
    const ahliGiziDapur = String(meta.ahli_gizi_dapur || '').trim() || pickFirstName('ahli_gizi');
    const koordinatorLapangan = String(meta.koordinator_lapangan || '').trim() || pickFirstName('asisten_lapangan');
    const sppgProfile = meta.sppg_profile && typeof meta.sppg_profile === 'object' ? meta.sppg_profile : {};
    const kepalaSppg = String(meta.kepala_sppg || '').trim() || pickFirstName('kepala_sppg');
    const ctx = {
        staffById,
        staffList,
        sppgLine,
        sppgProfile,
        ahliGiziDapur,
        koordinatorLapangan,
        kepalaSppg
    };
    _distSjCtxCache = { t: now, data: ctx };
    return ctx;
}

function _distSjDriverLine(d, staffById) {
    const sid = d && d.driver_staff_id ? String(d.driver_staff_id) : '';
    if (!sid) return '';
    const st = staffById.get(sid);
    return st ? String(st.name || '').trim() : '';
}

function _distSjPrintCSSExtra() {
    return (
        '@page { size: A4; margin: 1.4cm 1.7cm; }' +
        ' body.sj-doc { margin:0; padding:0; }' +
        ' body.sj-doc .kop, body.sj-doc .title, body.sj-doc .sj-lead { display: none !important; }' +
        ' .sj-top { text-align:center; margin: 0 0 16px; line-height: 1.35; }' +
        ' .sj-t1 { font-size: 13pt; font-weight: bold; text-transform: uppercase; }' +
        ' .sj-t2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 4px; }' +
        ' .sj-t3 { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin-top: 8px; letter-spacing: 0.02em; padding-bottom: 10px; border-bottom: 3px solid #000; box-sizing: border-box; }' +
        ' table.sj-meta { width: 100%; font-size: 11pt; margin: 10px 0 16px; border-collapse: collapse; }' +
        ' table.sj-meta td { vertical-align: top; padding: 3px 6px 3px 0; }' +
        ' table.sj-meta td.l { white-space: nowrap; width: 155px; }' +
        ' table.sj-meta td.c { width: 14px; text-align: center; }' +
        ' table.sj-tbl { width: 100%; border-collapse: collapse; margin: 14px 0 10px; font-size: 10.5pt; }' +
        ' table.sj-tbl th, table.sj-tbl td { border: 1px solid #222; padding: 5px 7px; vertical-align: middle; }' +
        ' table.sj-tbl th { background: #D9E9F9; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
        ' .sj-no { width: 34px; } .sjkel { min-width: 120px; text-align: left; }' +
        ' .sj-porsi { width: 78px; } .sj-pack { width: 82px; }' +
        ' .sj-kh { text-align: center; } .sj-kh2 { width: 68px; }' +
        ' .sj-k { height: 26px; text-align: center; }' +
        ' .sj-total { font-weight: bold; }' +
        ' table.sj-signtbl { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 10.5pt; line-height: 1.45; }' +
        ' table.sj-signtbl td { border: 0; vertical-align: top; padding: 2px 10px; }' +
        ' td.sj-sig-bin { text-align: center; font-weight: normal; padding-bottom: 10px; }' +
        ' td.sj-sig-rolecell { width: 33%; text-align: center; vertical-align: top; height: 58px; }' +
        ' td.sj-sig-rolecell .sj-role { font-weight: normal; }' +
        ' td.sj-sig-namecell { width: 33%; text-align: center; vertical-align: bottom; padding-top: 4px; }' +
        ' td.sj-sig-recv { width: 34%; vertical-align: top; padding-left: 14px; }' +
        ' td.sj-sig-recv .sj-role { font-weight: normal; }' +
        ' .sj-recv-inner { display: flex; flex-direction: column; align-items: center; text-align: center; min-height: 128px; height: 100%; box-sizing: border-box; }' +
        ' .sj-recv-fill { flex: 1; min-height: 28px; width: 100%; }' +
        ' .sj-name { font-weight: bold; font-size: 11pt; padding-top: 6px; }' +
        ' .sj-line-blank { width: 86%; max-width: 200px; border-bottom: 1px solid #000; min-height: 22px; margin: 0 auto; }' +
        ' .sj-logo-row { text-align: center; margin: 0 0 10px; }' +
        ' .sj-logo { max-height: 76px; max-width: 180px; object-fit: contain; }' +
        ' .sj-tagline { font-size: 10.5pt; font-weight: 600; margin-top: 6px; color: #222; }' +
        ' .sj-id { font-size: 9.5pt; margin-top: 4px; }' +
        ' .sj-addr { font-size: 9.5pt; margin-top: 6px; text-align: center; max-width: 100%; line-height: 1.35; }'
    );
}

function _distSjKetPair() {
    return '<td class="sj-k">&nbsp;</td><td class="sj-k">&nbsp;</td>';
}

function _distSjThead(mode) {
    const lab = mode === 'jenis' ? 'Jenis' : 'Kelas';
    return '<thead><tr>' +
        '<th rowspan="2" class="sj-no c">No</th>' +
        '<th rowspan="2" class="sjkel">' + lab + '</th>' +
        '<th rowspan="2" class="sj-porsi">Jumlah<br>Porsi</th>' +
        '<th rowspan="2" class="sj-pack">Jumlah<br>Packaging</th>' +
        '<th colspan="2" class="sj-kh">Keterangan</th>' +
        '</tr><tr><th class="sj-kh2">Sebelum</th><th class="sj-kh2">Sesudah</th></tr></thead>';
}

function _distSjRow(no, label, porsi) {
    return '<tr><td class="c">' + no + '</td><td>' + _distSjEsc(label) + '</td><td class="c">' + porsi + '</td><td>&nbsp;</td>' + _distSjKetPair() + '</tr>';
}

function _distSjTotalRow(total) {
    return '<tr><td colspan="2" class="r sj-total">Total</td><td class="c sj-total">' + total + '</td><td>&nbsp;</td>' + _distSjKetPair() + '</tr>';
}

function _distSjKopAndHeadHtml(sppgLine, profile) {
    const p = profile && typeof profile === 'object' ? profile : {};
    const logo = String(p.logo_data_url || '').trim();
    const tagline = String(p.tagline || '').trim();
    const sid = String(p.sppg_id || '').trim();
    const addr = String(p.alamat || '').trim();
    let logoRow = '';
    if (logo) {
        logoRow = '<div class="sj-logo-row"><img class="sj-logo" src="' + _distSjAttr(logo) + '" alt="Logo SPPG" /></div>';
    }
    let tagHtml = '';
    if (tagline) tagHtml = '<div class="sj-tagline">' + _distSjEsc(tagline) + '</div>';
    let idHtml = '';
    if (sid) idHtml = '<div class="sj-id">ID SPPG: ' + _distSjEsc(sid) + '</div>';
    let addrHtml = '';
    if (addr) addrHtml = '<div class="sj-addr">' + _distSjEsc(addr).replace(/\r?\n/g, '<br>') + '</div>';
    return logoRow +
        '<div class="sj-top">' +
        '<div class="sj-t1">SURAT JALAN</div>' +
        '<div class="sj-t2">PROGRAM MAKAN BERGIZI GRATIS</div>' +
        tagHtml +
        '<div class="sj-t3">' + _distSjEsc(sppgLine) + '</div>' +
        idHtml +
        addrHtml +
        '</div>';
}

function _distSjMetaHtml(d, lok, waktuPengiriman, driverNm) {
    const kepada = lok ? String(lok.nama || '').trim() : '—';
    const tgl = distTglSjPad(d.tanggal);
    const w = waktuPengiriman ? _distSjEsc(waktuPengiriman) : '&nbsp;';
    const drv = driverNm ? _distSjEsc(driverNm) : '&nbsp;';
    return '<table class="sj-meta"><tbody>' +
        '<tr><td class="l">Kepada</td><td class="c">:</td><td class="v">' + _distSjEsc(kepada) + '</td></tr>' +
        '<tr><td class="l">Hari / Tanggal</td><td class="c">:</td><td class="v">' + _distSjEsc(tgl) + '</td></tr>' +
        '<tr><td class="l">Waktu Pengiriman</td><td class="c">:</td><td class="v">' + w + '</td></tr>' +
        '<tr><td class="l">Driver</td><td class="c">:</td><td class="v">' + drv + '</td></tr>' +
        '</tbody></table>';
}

function _distSjSignHtml(isPosyandu, ahliNm, koordNm) {
    const pihak = isPosyandu ? 'Pihak POSYANDU,' : 'Pihak Sekolah,';
    const agBlock = ahliNm
        ? '<div class="sj-name">' + _distSjEsc(ahliNm) + '</div>'
        : '<div class="sj-line-blank">&nbsp;</div>';
    const klBlock = koordNm
        ? '<div class="sj-name">' + _distSjEsc(koordNm) + '</div>'
        : '<div class="sj-line-blank">&nbsp;</div>';
    return '<table class="sj-signtbl" role="presentation">' +
        '<tr>' +
        '<td colspan="2" class="sj-sig-bin">Diperiksa Oleh,</td>' +
        '<td class="sj-sig-recv" rowspan="3">' +
        '<div class="sj-recv-inner">' +
        '<div class="sj-role">Diterima Oleh,</div>' +
        '<div class="sj-role">' + pihak + '</div>' +
        '<div class="sj-recv-fill"></div>' +
        '<div class="sj-line-blank">&nbsp;</div>' +
        '</div></td></tr>' +
        '<tr>' +
        '<td class="sj-sig-rolecell"><span class="sj-role">Ahli Gizi Dapur,</span></td>' +
        '<td class="sj-sig-rolecell"><span class="sj-role">Koordinator Lapangan</span></td>' +
        '</tr>' +
        '<tr>' +
        '<td class="sj-sig-namecell">' + agBlock + '</td>' +
        '<td class="sj-sig-namecell">' + klBlock + '</td>' +
        '</tr></table>';
}

function _distSjTableForVariant(key, lok, pj, porsi, pjPorsiBesar, totalPorsi) {
    const ih = lok ? (parseInt(lok.ibu_hamil, 10) || 0) : 0;
    const im = lok ? (parseInt(lok.ibu_menyusui, 10) || 0) : 0;
    const bal = lok ? (parseInt(lok.balita, 10) || 0) : 0;
    let body = '';
    let n = 1;
    if (key === 'kb_tk_paud') {
        body += _distSjRow(n++, 'Kecil', porsi.kecil);
        if (pj && pjPorsiBesar > 0) body += _distSjRow(n++, 'Guru', pjPorsiBesar);
        return '<table class="pt sj-tbl">' + _distSjThead('kelas') + '<tbody>' + body + _distSjTotalRow(totalPorsi) + '</tbody></table>';
    }
    if (key === 'sd') {
        body += _distSjRow(n++, '1 - 3', porsi.kecil);
        body += _distSjRow(n++, '4-6', porsi.besar);
        if (pj && pjPorsiBesar > 0) body += _distSjRow(n++, 'Guru', pjPorsiBesar);
        return '<table class="pt sj-tbl">' + _distSjThead('kelas') + '<tbody>' + body + _distSjTotalRow(totalPorsi) + '</tbody></table>';
    }
    if (key === 'smp_sma') {
        body += _distSjRow(n++, 'Besar', porsi.besar);
        if (pj && pjPorsiBesar > 0) body += _distSjRow(n++, 'Guru', pjPorsiBesar);
        return '<table class="pt sj-tbl">' + _distSjThead('kelas') + '<tbody>' + body + _distSjTotalRow(totalPorsi) + '</tbody></table>';
    }
    if (key === 'posyandu') {
        const b2 = ih + im;
        body += _distSjRow(n++, 'B2', b2);
        body += _distSjRow(n++, 'BALITA', bal);
        if (pjPorsiBesar > 0) body += _distSjRow(n++, 'PJ', pjPorsiBesar);
        return '<table class="pt sj-tbl">' + _distSjThead('jenis') + '<tbody>' + body + _distSjTotalRow(totalPorsi) + '</tbody></table>';
    }
    const jenis = lok ? String(lok.jenis || '').trim() : '';
    if (porsi.kecil > 0 && porsi.besar > 0) {
        body += _distSjRow(n++, 'Porsi kecil (' + jenis + ')', porsi.kecil);
        body += _distSjRow(n++, 'Porsi besar (' + jenis + ')', porsi.besar);
    } else if (porsi.besar > 0) {
        body += _distSjRow(n++, 'Besar', porsi.besar);
    } else {
        body += _distSjRow(n++, 'Kecil', porsi.kecil);
    }
    if (pj && pjPorsiBesar > 0) body += _distSjRow(n++, 'Guru', pjPorsiBesar);
    return '<table class="pt sj-tbl">' + _distSjThead('kelas') + '<tbody>' + body + _distSjTotalRow(totalPorsi) + '</tbody></table>';
}

function _distSjComposeHtmlDocument(d, lok, pj, ctx) {
    const key = _distSjVariantKey(lok);
    const porsi = lok ? distGetPorsi(lok) : { kecil: 0, besar: 0 };
    const pjPorsiBesar = lok ? distGetPjPorsiBesar(lok) : 0;
    const totalPorsi = (porsi.kecil + porsi.besar) + pjPorsiBesar;
    const waktu = distFmtTime(d.jam_distribusi || '');
    const driverNm = _distSjDriverLine(d, ctx.staffById);
    const tbl = _distSjTableForVariant(key, lok, pj, porsi, pjPorsiBesar, totalPorsi);
    const sign = _distSjSignHtml(key === 'posyandu', ctx.ahliGiziDapur, ctx.koordinatorLapangan);
    const inner = _distSjKopAndHeadHtml(ctx.sppgLine, ctx.sppgProfile) + _distSjMetaHtml(d, lok, waktu, driverNm) + tbl + sign;
    return '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Surat Jalan</title>' +
        '<style>' + _distPrintCSS() + _distSjPrintCSSExtra() + '</style></head><body class="sj-doc">' + inner +
        '<script>window.onload=function(){window.print();}<\/script></body></html>';
}

/* ====================================================
   PRINT: SURAT JALAN
   ==================================================== */

async function _distResolveEvent(id) {
    let d = distFindById('distribusi', id);
    if (d) return d;
    // Coba resync semua tanggal di periode terlebih dulu; kemungkinan user membuka print
    // dari halaman lain tanpa pernah mirror.
    try {
        const { from, to } = distPeriodRange();
        if (distCanSyncToServer()) {
            const resp = await distApi(`/api/distribusi/period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
            const days = Array.isArray(resp?.days) ? resp.days : [];
            for (const dd of days) {
                if ((Number(dd.assignment_count) || 0) > 0) {
                    await distResyncDistribusiForTanggal(dd.date);
                    d = distFindById('distribusi', id);
                    if (d) return d;
                }
            }
        }
    } catch (e) {
        console.warn('_distResolveEvent resync failed:', e);
    }
    return null;
}

async function distPrintSuratJalan(id) {
    let d = distFindById('distribusi', id);
    if (!d) d = await _distResolveEvent(id);
    if (!d) { alert('Data distribusi tidak ditemukan untuk event ' + id + '. Coba buka Atur distribusi dan simpan ulang, lalu klik Print kembali.'); return; }

    if (d.tanggal) await distResyncDistribusiForTanggal(d.tanggal);
    d = distFindById('distribusi', id) || d;

    const lok = distFindById('lokasi', d.lokasi_id);
    const pj = lok && lok.pj_id ? distFindById('pj', lok.pj_id) : null;
    const ctx = await _distSjLoadContext();
    _distOpenPrint(_distSjComposeHtmlDocument(d, lok, pj, ctx));
}

/* ====================================================
   PRINT: UJI ORGANOLEPTIK
   ==================================================== */

async function distPrintUjiOrg(id) {
    let d = distFindById('distribusi', id);
    if (!d) d = await _distResolveEvent(id);
    if (!d) { alert('Data distribusi tidak ditemukan untuk event ' + id + '. Coba buka Atur distribusi dan simpan ulang, lalu klik Print kembali.'); return; }

    const lok = distFindById('lokasi', d.lokasi_id);
    const pj  = lok && lok.pj_id ? distFindById('pj', lok.pj_id) : null;
    if (d.tanggal) await distResyncDistribusiForTanggal(d.tanggal);

    const params = [
        { no: 1, p: 'Warna',       s: 'Warna makanan normal, tidak berubah/menghitam' },
        { no: 2, p: 'Aroma / Bau', s: 'Tidak berbau busuk, asam, atau menyimpang' },
        { no: 3, p: 'Tekstur',     s: 'Tekstur sesuai dengan jenis makanan' },
        { no: 4, p: 'Rasa',        s: 'Rasa normal, tidak pahit atau terlalu asam' },
        { no: 5, p: 'Penampilan',  s: 'Tampilan bersih, menarik, tidak kotor' },
        { no: 6, p: 'Kemasan',     s: 'Kemasan tidak rusak, tidak bocor, rapat' },
        { no: 7, p: 'Kebersihan',  s: 'Tidak ditemukan benda asing di dalam makanan' },
        { no: 8, p: 'Suhu',        s: 'Makanan dalam kondisi hangat / sesuai prosedur' },
    ];

    const rows = params.map(p => `
        <tr>
            <td class="c">${p.no}</td>
            <td style="font-weight:bold">${p.p}</td>
            <td>${p.s}</td>
            <td class="c">&#9744; Baik &nbsp; &#9744; Tidak</td>
            <td>&nbsp;</td>
        </tr>`).join('');

    _distOpenPrint(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Uji Organoleptik</title>
    <style>${_distPrintCSS()}</style></head><body>
    ${_distPrintKop()}
    <div class="title"><h3>Formulir Uji Organoleptik</h3><h3>Makan Bergizi Gratis (MBG)</h3></div>
    <div class="info"><table>
        <tr><td>Hari / Tanggal</td><td>:</td><td>${distTglPanjang(d.tanggal)}</td></tr>
        <tr><td>Jam</td><td>:</td><td>${d.jam_distribusi || '—'}</td></tr>
        <tr><td>Lokasi</td><td>:</td><td>${lok ? lok.nama + ' (' + lok.jenis + ')' : '—'}</td></tr>
        <tr><td>Alamat</td><td>:</td><td>${lok ? lok.alamat || '—' : '—'}</td></tr>
        <tr><td>Menu</td><td>:</td><td>${d.menu || '—'}</td></tr>
        <tr><td>Jenis Menu</td><td>:</td><td>${d.jenis_menu || '—'}</td></tr>
        <tr><td>Penanggung Jawab</td><td>:</td><td>${pj ? pj.nama : '—'}</td></tr>
    </table></div>
    <table class="pt">
        <thead><tr>
            <th style="width:40px">No</th><th style="width:110px">Parameter</th>
            <th>Standar / Keterangan</th><th style="width:120px">Hasil Uji</th><th style="width:120px">Catatan</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:14px;font-size:11pt;line-height:2">
        <strong>Kesimpulan :</strong> &nbsp;
        &#9744; <strong>Layak Konsumsi</strong> &nbsp;&nbsp;&nbsp;
        &#9744; <strong>Tidak Layak Konsumsi</strong>
    </div>
    <div style="margin-top:6px;font-size:11pt">
        <strong>Catatan Tambahan :</strong><br>
        ___________________________________________________________________________<br>
        ___________________________________________________________________________
    </div>
    <div class="sign">
        <div class="sb"><div class="role">Petugas Uji Organoleptik</div><div class="name">( ...................................... )</div><div>Nama: ______________________</div></div>
        <div class="sb"><div class="role">Mengetahui, Koordinator</div><div class="name">( ...................................... )</div><div>Nama: ______________________</div></div>
    </div>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
}

/* ====================================================
   PRINT: BAST — mengikuti contoh PDF «BAST (BERITA ACARA SERAH TERIMA)»
   (bukan layout Surat Jalan). Meta SPPG dari /api/distribusi/surat-jalan-meta.
   ==================================================== */

function _distBastHariPanjang(dateStr) {
    if (!dateStr) return '—';
    try {
        const iso = String(dateStr).trim().slice(0, 10);
        const d = new Date(iso + 'T12:00:00');
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('id-ID', { weekday: 'long' });
    } catch (e) {
        return '—';
    }
}

function _distBastNomorSurat(d) {
    const t = d && d.tanggal ? String(d.tanggal).replace(/-/g, '') : '........';
    const lid = d && d.lokasi_id != null && d.lokasi_id !== '' ? String(d.lokasi_id) : '—';
    return 'BAST/MBG/' + t + '/' + lid;
}

function _distBastSppgBarisFormal(sppgLine) {
    const tail = String(sppgLine || '').replace(/^SPPG\s+/i, '').trim();
    const suf = tail ? tail.toUpperCase() : '—';
    return 'SATUAN PELAYANAN PEMENUHAN GIZI (SPPG), ' + suf;
}

function _distBastSppgNamaKalimat(sppgLine) {
    const parts = String(sppgLine || '').replace(/^SPPG\s+/i, '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    return parts.map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function _distBastLokMelayaniUpper(lok) {
    if (!lok) return '—';
    const n = String(lok.nama || '').trim();
    return n ? n.toUpperCase() : '—';
}

/** Kop surat: logo BGN kiri, judul + baris SPPG kanan (sesuai template cetak BAST). */
function _distBastKopHtml(mainTitlePlain, sppgFormalEscaped) {
    return (
        '<div class="bast-kop">' +
        '<div class="bast-kop-logo"><img src="/img/logo-badan-gizi-nasional.png" width="92" height="92" alt="Logo Badan Gizi Nasional Republik Indonesia" /></div>' +
        '<div class="bast-kop-text">' +
        '<div class="bast-kop-t1">' + mainTitlePlain + '</div>' +
        '<div class="bast-sppg">' + sppgFormalEscaped + '</div>' +
        '</div></div>'
    );
}

function _distBastPrintCSSExtra() {
    return (
        ' .bast-doc { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.45; color: #000; box-sizing: border-box; }' +
        ' @page { size: A4; margin: 1.4cm 1.7cm; }' +
        ' .bast-num { font-size: 11pt; margin: 0 0 14px; }' +
        ' .bast-nv { font-weight: normal; }' +
        ' .bast-kop { display: flex; flex-direction: row; align-items: flex-start; gap: 12px; margin-bottom: 14px; width: 100%; box-sizing: border-box; }' +
        ' .bast-kop-logo { flex: 0 0 auto; max-width: 84px; }' +
        ' .bast-kop-logo img { width: 80px; height: 80px; max-width: 100%; object-fit: contain; display: block; }' +
        ' .bast-kop-text { flex: 1 1 0; min-width: 0; text-align: center; align-self: flex-start; padding-top: 2px; box-sizing: border-box; }' +
        ' .bast-kop-t1 { font-size: 11pt; font-weight: bold; text-transform: uppercase; line-height: 1.35; word-wrap: break-word; overflow-wrap: anywhere; }' +
        ' .bast-sppg { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 8px; padding-bottom: 10px; border-bottom: 3px solid #000; box-sizing: border-box; word-wrap: break-word; overflow-wrap: anywhere; }' +
        ' .bast-par { text-align: justify; margin: 14px 0 22px; line-height: 1.65; }' +
        ' .bast-ul { border-bottom: 1px solid #000; font-weight: normal; }' +
        ' .bast-ul-blank { display: inline-block; min-width: 140px; margin: 0 2px; }' +
        ' .bast-sect2 { margin-top: 44px; padding-top: 4px; clear: both; }' +
        ' .bast-sign-grid { display: flex; flex-direction: row; align-items: flex-start; justify-content: space-between; gap: 14px; width: 100%; box-sizing: border-box; margin-top: 4px; }' +
        ' .bast-sign-left { flex: 1 1 0; min-width: 0; max-width: 58%; box-sizing: border-box; }' +
        ' .bast-sign-right { flex: 0 0 40%; width: 40%; max-width: 40%; min-width: 0; box-sizing: border-box; }' +
        ' .bast-ln { display: table; width: 100%; table-layout: fixed; margin: 7px 0; }' +
        ' .bast-lb { display: table-cell; width: 178px; min-width: 178px; max-width: 178px; white-space: nowrap; vertical-align: bottom; font-size: 11pt; box-sizing: border-box; }' +
        ' .bast-sep { display: table-cell; width: 14px; text-align: center; vertical-align: bottom; }' +
        ' .bast-fill { display: table-cell; border-bottom: 1px solid #000; min-height: 18px; vertical-align: bottom; width: auto; }' +
        ' .bast-sub { font-size: 10pt; margin: 4px 0 10px 22px; }' +
        ' .bast-paren { text-align: left; margin: 12px 0 14px; font-size: 11pt; clear: both; }' +
        ' .bast-know-box { display: flex; flex-direction: column; border: 1px solid #000; min-height: 200px; width: 100%; max-width: 100%; padding: 10px 12px; box-sizing: border-box; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
        ' .bast-know-h { font-size: 11pt; font-weight: normal; text-align: left; }' +
        ' .bast-know-body { flex: 1 1 auto; min-height: 56px; }' +
        ' .bast-know-foot { text-align: center; padding-top: 6px; font-size: 11pt; flex-shrink: 0; }' +
        ' .bast-know-nm { font-weight: bold; margin-top: 4px; }' +
        ' .bast-know-jab { margin-top: 6px; font-weight: normal; }' +
        ' .bast-blanknm { display: inline-block; min-width: 220px; border-bottom: 1px solid #000; min-height: 16px; vertical-align: bottom; }'
    );
}

function _distBastLineRow(label) {
    return '<div class="bast-ln"><span class="bast-lb">' + label + '</span><span class="bast-sep">:</span><span class="bast-fill">&nbsp;</span></div>';
}

function _distBastComposeHtml(d, lok, ctx, totalPorsi) {
    const hari = _distBastHariPanjang(d.tanggal);
    const tgl = distTglSjPad(d.tanggal);
    const sppgFormal = _distSjEsc(_distBastSppgBarisFormal(ctx.sppgLine));
    const sppgNm = _distSjEsc(_distBastSppgNamaKalimat(ctx.sppgLine));
    const lokU = _distSjEsc(_distBastLokMelayaniUpper(lok));
    const nPak = String(Number(totalPorsi) || 0);
    const nomor = _distSjEsc(_distBastNomorSurat(d));
    const kepala = ctx.kepalaSppg ? _distSjEsc(ctx.kepalaSppg) : '';
    const jabLok = _distSjEsc(_distBastSppgNamaKalimat(ctx.sppgLine));

    const kopTerima = _distBastKopHtml('BERITA ACARA PENERIMAAN PAKET MAKANAN PROGRAM MAKAN BERGIZI GRATIS', sppgFormal);
    const kopKembali = _distBastKopHtml('BERITA ACARA PENGEMBALIAN ALAT MAKAN PROGRAM MAKAN BERGIZI GRATIS', sppgFormal);
    const jamBlank = '<span class="bast-ul bast-ul-blank">&nbsp;</span>';

    const par1 =
        '<p class="bast-par">Pada Hari ' + _distSjEsc(hari) + ' Tanggal ' + _distSjEsc(tgl) + ' jam ' + jamBlank + ' telah diterima paket makanan sejumlah : <span class="bast-ul">' + nPak + '</span> Paket Makanan Bergizi dari Satuan Pelayanan Pemenuhan Gizi (SPPG) ' + sppgNm + ', yang melayani <span class="bast-ul">' + lokU + '</span> Baik dimakan sebelum jam ' + jamBlank + '</p>';

    const par2 =
        '<p class="bast-par">Pada Hari ' + _distSjEsc(hari) + ' Tanggal ' + _distSjEsc(tgl) + ' jam ' + jamBlank + ' telah diserahkan kembali ompreng sejumlah : <span class="bast-ul">' + nPak + '</span> Paket Makanan Bergizi dari Satuan Pelayanan Pemenuhan Gizi (SPPG) ' + sppgNm + '.</p>';

    const signPenerimaan =
        _distBastLineRow('Yang menyerahkan') +
        _distBastLineRow('Nomor Telepon') +
        '<div class="bast-paren">(____________________________________________________)</div>' +
        _distBastLineRow('Diterima oleh') +
        '<div class="bast-sub">(Nama PIC Penerima)</div>' +
        _distBastLineRow('Nomor Telepon') +
        '<div class="bast-paren">(____________________________________________________)</div>';

    const signPengembalian =
        _distBastLineRow('Yang menyerahkan') +
        '<div class="bast-sub">(Nama PIC Penerima)</div>' +
        _distBastLineRow('Nomor Telepon') +
        _distBastLineRow('Diterima oleh') +
        _distBastLineRow('Nomor Telepon') +
        '<div class="bast-paren">(____________________________________________________)</div>';

    const mengetahuiBox =
        '<div class="bast-know-box">' +
        '<div class="bast-know-h">Mengetahui:</div>' +
        '<div class="bast-know-body"></div>' +
        '<div class="bast-know-foot">' +
        (kepala
            ? '<div class="bast-know-nm">' + kepala + '</div>'
            : '<div class="bast-know-nm"><span class="bast-blanknm">&nbsp;</span></div>') +
        '<div class="bast-know-jab">Kepala SPPG, ' + jabLok + '</div>' +
        '</div></div>';

    const signGrid1 =
        '<div class="bast-sign-grid">' +
        '<div class="bast-sign-left">' + signPenerimaan + '</div>' +
        '<div class="bast-sign-right">' + mengetahuiBox + '</div>' +
        '</div>';

    const signGrid2 =
        '<div class="bast-sign-grid">' +
        '<div class="bast-sign-left">' + signPengembalian + '</div>' +
        '<div class="bast-sign-right">' + mengetahuiBox + '</div>' +
        '</div>';

    return (
        '<div class="bast-doc">' +
        '<div class="bast-num">Nomor surat&nbsp;&nbsp;&nbsp;: <span class="bast-nv">' + nomor + '</span></div>' +
        kopTerima +
        par1 +
        signGrid1 +
        '<div class="bast-sect2">' +
        kopKembali +
        par2 +
        signGrid2 +
        '</div>' +
        '</div>'
    );
}

async function distPrintBASTPackaging(id) {
    let d = distFindById('distribusi', id);
    if (!d) d = await _distResolveEvent(id);
    if (!d) { alert('Data distribusi tidak ditemukan untuk event ' + id + '. Coba buka Atur distribusi dan simpan ulang, lalu klik Print kembali.'); return; }

    const lok = distFindById('lokasi', d.lokasi_id);
    if (d.tanggal) await distResyncDistribusiForTanggal(d.tanggal);
    const porsi = lok ? distGetPorsi(lok) : { kecil: 0, besar: 0 };
    const pjPorsiBesar = lok ? distGetPjPorsiBesar(lok) : 0;
    const totalPorsi = porsi.kecil + porsi.besar + pjPorsiBesar;

    const ctx = await _distSjLoadContext();
    const inner = _distBastComposeHtml(d, lok, ctx, totalPorsi);
    _distOpenPrint(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>BAST — Berita Acara Serah Terima</title>
    <style>${_distBastPrintCSSExtra()}</style></head><body>
    ${inner}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
}

/* ====================================================
   BULK PRINT (beberapa sekolah jadi 1 dokumen multi-halaman)
   ==================================================== */

function _distExtractBodyFragment(html) {
    const bodyMatch = String(html || '').match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let body = bodyMatch ? bodyMatch[1] : String(html || '');
    // Hilangkan script window.print() internal supaya tidak auto-print per fragment.
    body = body.replace(/<script\b[^>]*>[\s\S]*?window\.print\s*\([\s\S]*?<\/script>/gi, '');
    return body;
}

async function distPrintBulkSelected(type, eventIds) {
    const ids = Array.isArray(eventIds) ? eventIds.filter(Boolean) : [];
    if (!ids.length) {
        distNotify('Pilih minimal satu sekolah dulu', 'error');
        return;
    }
    const printFn =
        type === 'surat_jalan' ? distPrintSuratJalan :
        type === 'uji_org' ? distPrintUjiOrg :
        type === 'bast' ? distPrintBASTPackaging : null;
    if (!printFn) {
        distNotify('Tipe dokumen tidak dikenal', 'error');
        return;
    }
    const title =
        type === 'surat_jalan' ? 'Surat Jalan' :
        type === 'uji_org' ? 'Uji Organoleptik' :
        'BAST';

    // Aktifkan collector
    const collector = [];
    window.__distPrintCollector = collector;
    try {
        if ((type === 'surat_jalan' || type === 'bast') && typeof _distSjInvalidateContext === 'function') {
            _distSjInvalidateContext();
        }
        for (const eid of ids) {
            try {
                await printFn(eid);
            } catch (e) {
                console.warn('Bulk print item failed for', eid, e);
            }
        }
    } finally {
        window.__distPrintCollector = null;
    }

    if (!collector.length) {
        distNotify('Gagal mengumpulkan dokumen. Periksa apakah sekolah yang dipilih sudah punya event.', 'error');
        return;
    }

    const bodies = collector.map(_distExtractBodyFragment);
    const combinedBody = bodies.map((b, i) => `
        <section class="dist-bulk-section">${b}</section>
        ${i < bodies.length - 1 ? '<div class="dist-bulk-pagebreak"></div>' : ''}
    `).join('');

    const bastBulkCss = type === 'bast' ? _distBastPrintCSSExtra() : '';
    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${distEsc(title)} — ${ids.length} sekolah</title>
    <style>
        ${_distPrintCSS()}
        ${bastBulkCss}
        .dist-bulk-pagebreak { page-break-after: always; break-after: page; height: 0; }
        .dist-bulk-section { page-break-inside: avoid; }
        @media print { .dist-bulk-pagebreak { display: block; } }
    </style></head><body>
    ${combinedBody}
    <script>window.onload=function(){setTimeout(function(){window.print();},100);}<\/script>
    </body></html>`;

    _distOpenPrint(html);
    distNotify(`Menyiapkan ${ids.length} ${title.toLowerCase()}...`, 'success');
}

/* ====================================================
   PRINT: DISTRIBUSI (SHEET)
   ==================================================== */

function _distPrintDistribusiCSS() {
    return `
        body { font-family: 'Times New Roman', serif; font-size: 10.5pt; color: #000; margin: 0; padding: 3mm 2mm 2mm 2mm; }
        @page { size: A4 landscape; margin: 6mm 4mm; }
        .kop { text-align:center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 14px; }
        .kop h2 { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 3px 0; }
        .kop p { font-size: 10pt; margin: 2px 0; }
        .title { text-align:center; margin: 4px 0 10px; }
        .title h3 { font-size: 13pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; line-height: 1.5; }

        .summary { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .summary td { border: 1.2px solid #000; padding: 4px 6px; vertical-align: top; }
        .summary td .lbl { font-weight: bold; font-size: 11pt; }
        .summary td .val { font-weight: bold; font-size: 11pt; float: right; }

        table.sheet { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; table-layout: fixed; }
        table.sheet th, table.sheet td { border: 1.2px solid #000; padding: 2.5px 4px; vertical-align: top; word-wrap: break-word; }
        table.sheet th { background: #ffeb3b; font-weight: bold; text-align: center; }

        .c { text-align: center; }
        .r { text-align: right; }
        .small { font-size: 10pt; }
        .section-title { margin-top: 10px; font-weight: bold; text-transform: uppercase; text-decoration: underline; }
        .note { font-size: 9.8pt; font-style: italic; margin-top: 6px; }
        .muted { color: #000; }
        .page-break { page-break-after: avoid; }
    `;
}

window._distPrintPickerState = { date: null, assignments: [], lokasiById: new Map(), selected: new Set() };

async function distOpenPrintPicker(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        distNotify('Tanggal tidak valid', 'error');
        return;
    }
    if (typeof openModalUi !== 'function') {
        distNotify('Modal UI belum siap', 'error');
        return;
    }
    _distInjectStyles();
    openModalUi({
        title: 'Cetak Dokumen Distribusi — ' + distTglPanjang(date),
        size: 'lg',
        bodyHtml: `<div id="dist-print-picker-root" class="dist-print-picker" style="min-height:220px">Memuat...</div>`,
        actions: []
    });
    try {
        const data = await distApi(`/api/distribusi/day?date=${encodeURIComponent(date)}`);
        const lokasiById = new Map((data.lokasi || []).map(l => [String(l.id), l]));
        distMirrorEventsToLocal(date, data.assignments || [], lokasiById);
        const assignments = (Array.isArray(data.assignments) ? data.assignments : [])
            .filter(a => a.event_id)
            .sort((a, b) => {
                const w = (Number(a.wave_number) || 0) - (Number(b.wave_number) || 0);
                if (w !== 0) return w;
                const na = (lokasiById.get(String(a.lokasi_id)) || {}).nama || '';
                const nb = (lokasiById.get(String(b.lokasi_id)) || {}).nama || '';
                return String(na).localeCompare(String(nb));
            });

        window._distPrintPickerState = {
            date,
            assignments,
            lokasiById,
            selected: new Set(assignments.map(a => String(a.event_id))) // default: pilih semua
        };

        _distRenderPrintPicker();
    } catch (e) {
        const root = document.getElementById('dist-print-picker-root');
        if (root) root.innerHTML = `<div style="color:var(--danger);padding:12px">Gagal memuat: ${distEsc(e.message || e)}</div>`;
    }
}

function _distRenderPrintPicker() {
    const root = document.getElementById('dist-print-picker-root');
    if (!root) return;
    const s = window._distPrintPickerState;
    if (!s || !s.date) return;

    if (!s.assignments.length) {
        root.innerHTML = `
            <div class="dist-empty-state" style="padding:16px;text-align:left">
                <p style="margin:0 0 8px"><strong>Belum ada event distribusi</strong> untuk tanggal ${distEsc(distTglPanjang(s.date))}.</p>
                <p style="margin:0 0 10px;font-size:12px">Surat Jalan, Uji Organoleptik, dan BAST Packaging dibuat per event (per lokasi yang sudah di-assign ke wave). Buka <strong>Atur distribusi</strong>, pilih sekolah di setiap wave, lalu <em>Simpan</em>. Setelah itu tombol cetak akan tersedia.</p>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="btn btn-sm btn-primary" onclick="(typeof closeModalUi==='function' && closeModalUi()); distOpenDayEditor('${distEsc(s.date)}')">Atur distribusi sekarang</button>
                    <button class="btn btn-sm btn-secondary" onclick="distPrintDistribusiPdf('${distEsc(s.date)}')">Print ringkasan harian (PDF)</button>
                </div>
            </div>
        `;
        return;
    }

    const totalCount = s.assignments.length;
    const selCount = s.selected.size;
    const allChecked = selCount === totalCount;
    const anyChecked = selCount > 0;

    const rows = s.assignments.map(a => {
        const lok = s.lokasiById.get(String(a.lokasi_id));
        const nama = lok ? lok.nama : a.lokasi_id;
        const jenis = lok && lok.jenis ? ` <span class="dist-pill muted" style="font-size:10px">${distEsc(lok.jenis)}</span>` : '';
        const eid = String(a.event_id);
        const checked = s.selected.has(eid) ? 'checked' : '';
        return `
            <div class="pp-row">
                <label style="display:flex;align-items:center;gap:8px;flex:1;min-width:220px;cursor:pointer">
                    <input type="checkbox" ${checked} onchange="distPrintPickerToggle('${distEsc(eid)}', this.checked)">
                    <span class="pp-name" title="${distEsc(nama)}">${distEsc(nama)}${jenis}</span>
                </label>
                <span class="pp-wave">Wave ${Number(a.wave_number) || 1} &middot; ${Number(a.target_portions) || 0} porsi</span>
                <span class="dist-print-group">
                    <button class="btn btn-xs btn-secondary" onclick="distPrintSuratJalan('${distEsc(eid)}')" title="Cetak Surat Jalan untuk sekolah ini saja">Surat Jalan</button>
                    <button class="btn btn-xs btn-secondary" onclick="distPrintUjiOrg('${distEsc(eid)}')" title="Cetak Uji Organoleptik untuk sekolah ini saja">Uji Org.</button>
                    <button class="btn btn-xs btn-secondary" onclick="distPrintBASTPackaging('${distEsc(eid)}')" title="Cetak BAST untuk sekolah ini saja">BAST</button>
                </span>
            </div>
        `;
    }).join('');

    const disabled = !anyChecked ? 'disabled' : '';
    const selectedLabel = `${selCount}/${totalCount} dipilih`;

    root.innerHTML = `
        <div class="dist-print-toolbar">
            <label class="pp-selectall">
                <input type="checkbox" ${allChecked ? 'checked' : ''} ${!anyChecked ? '' : (!allChecked ? 'data-indeterminate="1"' : '')} onchange="distPrintPickerToggleAll(this.checked)">
                <span>Pilih Semua</span>
            </label>
            <span class="dist-pill info">${selectedLabel}</span>
            <span style="flex:1"></span>
            <button class="btn btn-sm btn-primary" ${disabled} onclick="distPrintPickerBulk('surat_jalan')" title="Gabung semua terpilih jadi 1 dokumen multi-halaman">Print Surat Jalan Terpilih</button>
            <button class="btn btn-sm btn-primary" ${disabled} onclick="distPrintPickerBulk('uji_org')" title="Gabung semua terpilih jadi 1 dokumen multi-halaman">Print Uji Org. Terpilih</button>
            <button class="btn btn-sm btn-primary" ${disabled} onclick="distPrintPickerBulk('bast')" title="Gabung semua terpilih jadi 1 dokumen multi-halaman">Print BAST Terpilih</button>
            <button class="btn btn-sm btn-secondary" onclick="distPrintDistribusiPdf('${distEsc(s.date)}')" title="Ringkasan harian seluruh distribusi (format berbeda, laporan SPPG)">Ringkasan Harian (PDF)</button>
        </div>
        <div class="dist-print-rows">
            ${rows}
        </div>
    `;

    // Visual indeterminate state for select-all checkbox
    const sa = root.querySelector('.pp-selectall input[type=checkbox]');
    if (sa) sa.indeterminate = (anyChecked && !allChecked);
}

function distPrintPickerToggle(eventId, checked) {
    const s = window._distPrintPickerState;
    if (!s) return;
    if (checked) s.selected.add(String(eventId));
    else s.selected.delete(String(eventId));
    _distRenderPrintPicker();
}

function distPrintPickerToggleAll(checked) {
    const s = window._distPrintPickerState;
    if (!s) return;
    s.selected = new Set(checked ? s.assignments.map(a => String(a.event_id)) : []);
    _distRenderPrintPicker();
}

async function distPrintPickerBulk(type) {
    const s = window._distPrintPickerState;
    if (!s) return;
    const ids = Array.from(s.selected);
    if (!ids.length) {
        distNotify('Pilih minimal satu sekolah dulu', 'error');
        return;
    }
    await distPrintBulkSelected(type, ids);
}

async function distPrintDistribusiPdf(dateOverride) {
    const tanggal = (dateOverride !== undefined && dateOverride !== null && dateOverride !== '') ? String(dateOverride) : '';
    if (!tanggal) {
        const html = `
            <div class="input-group">
                <label class="input-label">Tanggal Print <span style="color:red">*</span></label>
                <input type="date" id="dist_print_tanggal" class="input-field" value="${distToday()}">
            </div>
        `;
        if (typeof openModalUi === 'function') {
            openModalUi({
                title: 'Print Distribusi PDF',
                bodyHtml: html,
                actions: [
                    {
                        label: 'Print',
                        className: 'btn btn-primary btn-sm',
                        onClick: () => {
                            const v = (document.getElementById('dist_print_tanggal') || {}).value || '';
                            if (!v) return alert('Tanggal print wajib diisi.');
                            if (typeof closeModalUi === 'function') closeModalUi();
                            distPrintDistribusiPdf(v);
                        }
                    },
                    { label: 'Batal', className: 'btn btn-secondary btn-sm' }
                ]
            });
            return;
        }
        alert('openModalUi tidak tersedia. Gunakan tombol print dari modal.');
        return;
    }

    await distResyncDistribusiForTanggal(tanggal);

    const distribusiList = distGetAll('distribusi');
    const lokasiList = distGetAll('lokasi');
    if (!lokasiList.length) {
        alert('Belum ada data lokasi penerima manfaat.');
        return;
    }

    const rowsTanggal = distribusiList.filter(d => d.tanggal === tanggal);
    if (rowsTanggal.length === 0) {
        alert('Belum ada data distribusi untuk tanggal tersebut.');
        return;
    }

    // Samakan 1 lokasi -> 1 baris distribusi (lebih diutamakan yang masuk==true)
    const byLokasi = new Map();
    rowsTanggal.forEach(d => {
        if (!d.lokasi_id) return;
        const prev = byLokasi.get(d.lokasi_id);
        if (!prev) {
            byLokasi.set(d.lokasi_id, d);
            return;
        }
        if (!prev.masuk && d.masuk) {
            byLokasi.set(d.lokasi_id, d);
            return;
        }
        if ((!prev.jam_distribusi || prev.jam_distribusi === '') && d.jam_distribusi) {
            byLokasi.set(d.lokasi_id, d);
        }
    });

    const serdikRows = [];
    const balitaRows = [];
    let serdikNo = 1;
    let balitaNo = 1;
    let posyanduPjTotal = 0;

    for (const d of byLokasi.values()) {
        const lok = distFindById('lokasi', d.lokasi_id);
        if (!lok) continue;

        const pj = lok.pj_id ? distFindById('pj', lok.pj_id) : null;
        const porsi = distGetPorsi(lok);
        const pjPorsiBesar = distGetPjPorsiBesar(lok);
        const ket = d.jenis_menu || '—';
        const wajib = d.jam_distribusi || '—';

        if (lok.jenis === 'Posyandu') {
            const ibuHamil = parseInt(lok.ibu_hamil) || 0;
            const ibuMenyusui = parseInt(lok.ibu_menyusui) || 0;
            const balita = parseInt(lok.balita) || 0;

            posyanduPjTotal += pjPorsiBesar;

            balitaRows.push({ no: balitaNo++, sekolah: 'IBU HAMIL ' + lok.nama, b2: ibuHamil, balita: '', ket, wajib });
            balitaRows.push({ no: balitaNo++, sekolah: 'IBU MENYUSUI ' + lok.nama, b2: ibuMenyusui, balita: '', ket, wajib });
            balitaRows.push({ no: balitaNo++, sekolah: 'PJ ' + lok.nama, b2: pjPorsiBesar, balita: '', ket, wajib });
            balitaRows.push({ no: balitaNo++, sekolah: 'BALITA ' + lok.nama, b2: '', balita: balita, ket, wajib });
            continue;
        }

        const kecil = parseInt(porsi.kecil) || 0;
        const besar = parseInt(porsi.besar) || 0;
        const pjCount = pjPorsiBesar;
        const total = kecil + besar + pjCount;

        serdikRows.push({
            no: serdikNo++,
            sekolah: lok.nama,
            kecil, besar, pj: pjCount, total, ket, wajib
        });
    }

    const sumNum = (arr, fn) => arr.reduce((s, x) => s + (parseInt(fn(x)) || 0), 0);
    const serdikKecilTotal = sumNum(serdikRows, r => r.kecil);
    const serdikBesarTotal = sumNum(serdikRows, r => r.besar);
    const pjTotalSerdik = sumNum(serdikRows, r => r.pj);
    const jumlahPorsiSerdik = serdikKecilTotal + serdikBesarTotal + pjTotalSerdik;

    const b2Total = sumNum(balitaRows, r => r.b2);
    const balitaTotal = sumNum(balitaRows, r => r.balita);
    const pjTotal = pjTotalSerdik + posyanduPjTotal;
    const totalPorsi = jumlahPorsiSerdik + b2Total + balitaTotal;

    const uniq = (arr) => Array.from(new Set(arr.map(s => (s || '').toString().trim()).filter(Boolean)));
    const menuKering = uniq(rowsTanggal.filter(d => d.jenis_menu === 'Kering').map(d => d.menu_item_name || d.menu || '—'));
    const menuBasah = uniq(rowsTanggal.filter(d => d.jenis_menu === 'Basah').map(d => d.menu_item_name || d.menu || '—'));

    const menuBlock = (title, list) => {
        const lines = list.length ? list.slice(0, 6).map(m => `<div>${m}</div>`).join('') : `<div class="small">—</div>`;
        return `<td style="width:50%;"><div style="font-weight:bold;text-decoration:underline;text-align:center">${title}</div>${lines}</td>`;
    };

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Distribusi MBG</title>
<style>${_distPrintDistribusiCSS()}</style></head>
<body>
    <div class="kop">
        <h2>Program Makan Bergizi Gratis (MBG)</h2>
        <p>Sistem Manajemen Dapur MBG · DJATI CORP</p>
    </div>
    <div class="title">
        <h3>Distribusi Makan Bergizi Gratis</h3>
        <div class="small" style="text-align:center;margin-top:4px">${distTglPanjang(tanggal)}</div>
    </div>

    <table class="summary">
        <tr>
            <td style="width:25%"><span class="lbl">SERDIK KECIL</span><span class="val">${serdikKecilTotal}</span></td>
            <td style="width:25%"><span class="lbl">SERDIK BESAR</span><span class="val">${serdikBesarTotal}</span></td>
            <td style="width:25%"><span class="lbl">PJ</span><span class="val">${pjTotal}</span></td>
            <td style="width:25%"><span class="lbl">JUMLAH PORSI SERDIK</span><span class="val">${jumlahPorsiSerdik}</span></td>
        </tr>
        <tr>
            <td style="width:25%"><span class="lbl">B2 (IBU)</span><span class="val">${b2Total}</span></td>
            <td style="width:25%"><span class="lbl">BALITA</span><span class="val">${balitaTotal}</span></td>
            <td style="width:50%" colspan="2"><span class="lbl">TOTAL PORSI</span><span class="val">${totalPorsi}</span></td>
        </tr>
    </table>

    <table class="sheet" style="margin-top:12px">
        <thead>
            <tr>
                <th>MENU KERING</th>
                <th>MENU BASAH</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                ${menuBlock('MENU KERING', menuKering)}
                ${menuBlock('MENU BASAH', menuBasah)}
            </tr>
        </tbody>
    </table>

    <div class="section-title">Daftar SERDIK</div>
    <table class="sheet">
        <thead>
            <tr>
                <th style="width:5%">NO</th>
                <th>SEKOLAH</th>
                <th style="width:10%">KECIL</th>
                <th style="width:10%">BESAR</th>
                <th style="width:8%">PJ</th>
                <th style="width:12%">TOTAL</th>
                <th style="width:10%">KET.</th>
                <th style="width:14%">WAJIB DISTRIBUSI</th>
            </tr>
        </thead>
        <tbody>
            ${serdikRows.length ? serdikRows.map(r => `
                <tr>
                    <td class="c">${r.no}</td>
                    <td>${r.sekolah}</td>
                    <td class="c">${r.kecil}</td>
                    <td class="c">${r.besar}</td>
                    <td class="c">${r.pj}</td>
                    <td class="c" style="font-weight:bold;color:#1b5e4b">${r.total}</td>
                    <td class="c">${r.ket}</td>
                    <td class="c">${r.wajib}</td>
                </tr>
            `).join('') : `
                <tr><td colspan="8" class="c">Tidak ada data SERDIK</td></tr>
            `}
        </tbody>
        <tfoot>
            <tr>
                <td class="c" colspan="2" style="font-weight:bold">TOTAL</td>
                <td class="c" style="font-weight:bold">${serdikKecilTotal}</td>
                <td class="c" style="font-weight:bold">${serdikBesarTotal}</td>
                <td class="c" style="font-weight:bold">${pjTotalSerdik}</td>
                <td class="c" style="font-weight:bold">${jumlahPorsiSerdik}</td>
                <td></td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    <div class="section-title">Daftar BALITA (B2)</div>
    <table class="sheet">
        <thead>
            <tr>
                <th style="width:5%">NO</th>
                <th>SEKOLAH</th>
                <th style="width:12%">B2</th>
                <th style="width:12%">BALITA</th>
                <th style="width:10%">KET.</th>
                <th style="width:14%">WAJIB DISTRIBUSI</th>
            </tr>
        </thead>
        <tbody>
            ${balitaRows.length ? balitaRows.map(r => `
                <tr>
                    <td class="c">${r.no}</td>
                    <td>${r.sekolah}</td>
                    <td class="c">${r.b2 === '' ? '' : r.b2}</td>
                    <td class="c">${r.balita === '' ? '' : r.balita}</td>
                    <td class="c">${r.ket}</td>
                    <td class="c">${r.wajib}</td>
                </tr>
            `).join('') : `
                <tr><td colspan="6" class="c">Tidak ada data BALITA</td></tr>
            `}
        </tbody>
        <tfoot>
            <tr>
                <td class="c" colspan="2" style="font-weight:bold">TOTAL</td>
                <td class="c" style="font-weight:bold">${b2Total}</td>
                <td class="c" style="font-weight:bold">${balitaTotal}</td>
                <td></td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    <div class="note">
        * Data diambil dari menu Distribusi, Penerima Manfaat (Lokasi &amp; PJ), serta jam distribusi yang diinput pada tanggal terpilih.
    </div>
    <script>window.onload=function(){window.print();}<\/script>
</body></html>`;

    _distOpenPrint(html);
}

/* ====================================================
   LEGACY / REDIRECT (backward compatibility)
   ==================================================== */

// distOpenForm(id?) — dulu membuka form satuan. Sekarang diarahkan ke editor harian.
function distOpenForm(distribusiId) {
    if (distribusiId) {
        const row = distFindById('distribusi', distribusiId);
        if (row && row.tanggal) return distOpenDayEditor(row.tanggal);
    }
    return distOpenDayEditor(distToday());
}

function distToggleMasuk(id) {
    const row = distFindById('distribusi', id);
    if (row && row.tanggal) {
        return distOpenDayEditor(row.tanggal);
    }
    distNotify('Fitur ini telah dipindahkan ke editor distribusi harian.', 'warning');
}

function distDeleteRow(id) {
    const row = distFindById('distribusi', id);
    if (row && row.tanggal) {
        return distOpenDayEditor(row.tanggal);
    }
    distNotify('Buka editor harian untuk menghapus assignment.', 'warning');
}

function distResetFilter() {
    distJumpToToday();
}

/* ====================================================
   EXPORTS
   ==================================================== */

window.loadDistribusi = loadDistribusi;
window.distOpenForm = distOpenForm;
window.distToggleMasuk = distToggleMasuk;
window.distDeleteRow = distDeleteRow;
window.distResetFilter = distResetFilter;
window.distPrintSuratJalan = distPrintSuratJalan;
window.distPrintUjiOrg = distPrintUjiOrg;
window.distPrintBASTPackaging = distPrintBASTPackaging;
window.distPrintDistribusiPdf = distPrintDistribusiPdf;
window.distOpenPrintPicker = distOpenPrintPicker;
window.distPrintPickerToggle = distPrintPickerToggle;
window.distPrintPickerToggleAll = distPrintPickerToggleAll;
window.distPrintPickerBulk = distPrintPickerBulk;
window.distPrintBulkSelected = distPrintBulkSelected;
window._distOpenPrint = _distOpenPrint;

window.distPeriodPrev = distPeriodPrev;
window.distPeriodNext = distPeriodNext;
window.distJumpToToday = distJumpToToday;
window.distToggleDayRow = distToggleDayRow;
window.distOpenDayEditor = distOpenDayEditor;
window.distAddWave = distAddWave;
window.distRemoveWave = distRemoveWave;
window.distSetWaveTime = distSetWaveTime;
window.distToggleLokasiInWave = distToggleLokasiInWave;
window.distSetPortionInWave = distSetPortionInWave;
window.distSelectAllInWave = distSelectAllInWave;
window.distSaveDayEditor = distSaveDayEditor;
window.distOpenHolidayManager = distOpenHolidayManager;
window.distAddHoliday = distAddHoliday;
window.distDeleteHoliday = distDeleteHoliday;

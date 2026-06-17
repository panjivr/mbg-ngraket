/**
 * Jobdesc & Tugas — Juknis BGN + SOP operasional SPPG/MBG
 * - Dokumen resmi: manifest.json + tautan portal BGN; PDF lokal opsional di frontend/docs/juknis-bgn/
 * - SOP detail: frontend/docs/juknis-bgn/sop-internal-catalog.json (generate: node scripts/generate_sop_catalog.js)
 */

function _jdEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const JOBDESC_ROLE_LABELS = {
    kepala_sppg: 'Kepala SPPG',
    ahli_gizi: 'Ahli Gizi',
    koordinator_divisi: 'Koordinator Divisi',
    asisten_lapangan: 'Asisten Lapangan',
    driver: 'Driver',
    akuntan: 'Akuntan',
    admin: 'Admin',
    yayasan: 'Yayasan / Tauwas'
};

const RACI_LABEL = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };

/** Peta tautan resmi bila manifest belum terbaca */
const JOBDESC_OFFICIAL_LINKS_FALLBACK = [
    { id: 'portal_juknis', title: 'Portal Dokumen Juknis BGN', subtitle: 'Unduh peraturan / Juknis resmi', url: 'https://www.bgn.go.id/juknis', kind: 'portal' },
    { id: 'juknis_tata_kelola_mbg', title: 'Petunjuk Teknis Tata Kelola MBG (laman BGN)', subtitle: 'Buka laman resmi lalu unduh PDF dari situs BGN', url: 'https://www.bgn.go.id/juknis/lB1PKg-petunjuk-teknis-tata-kelola-penyelenggaraan-program-makan-bergizi-gratis', kind: 'juknis_page' },
    { id: 'jdih_keputusan', title: 'JDIH BGN — Keputusan', subtitle: 'Arsip keputusan resmi', url: 'https://jdih.bgn.go.id/jdih/category/keputusan', kind: 'jdih' },
    { id: 'jdih_search', title: 'JDIH BGN — Pencarian', subtitle: 'Cari nomor keputusan jika URL berubah', url: 'https://jdih.bgn.go.id/jdih/search?tipe_dokumen=peraturan', kind: 'jdih' },
    { id: 'bgn_home', title: 'Situs resmi BGN', subtitle: 'Informasi program', url: 'https://www.bgn.go.id', kind: 'portal' }
];

let JOBDESC_BGN_SOP_CATALOG = [];
let JOBDESC_OFFICIAL_LINKS_BY_ID = {};

function _jdAbsUrl(u) {
    const s = String(u || '').trim();
    if (!s) return '#';
    if (/^https?:\/\//i.test(s)) return s;
    try {
        return new URL(s, window.location.origin).href;
    } catch (_) {
        return s;
    }
}

function _jdBuildLinkMapFromManifest(manifest) {
    const map = {};
    const list = (manifest && Array.isArray(manifest.official_links)) ? manifest.official_links : JOBDESC_OFFICIAL_LINKS_FALLBACK;
    for (const row of list) {
        if (row && row.id) map[row.id] = row;
    }
    return map;
}

async function _jdFetchText(url) {
    const res = await fetch(_jdAbsUrl(url), { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    return await res.text();
}

async function _jdLoadSopCatalog() {
    JOBDESC_BGN_SOP_CATALOG = [];
    try {
        const raw = await _jdFetchText('/docs/juknis-bgn/sop-internal-catalog.json');
        const j = JSON.parse(raw);
        if (Array.isArray(j.categories)) JOBDESC_BGN_SOP_CATALOG = j.categories;
    } catch (e) {
        console.warn('jobdesc: sop-internal-catalog.json gagal dimuat', e);
    }
}

async function _jdLoadJuknisLibraryAndRender() {
    const el = document.getElementById('jobdesc-juknis-panel');
    if (!el) return;
    el.innerHTML = '<div class="text-sm text-muted">Memuat dokumen Juknis…</div>';
    let lib = null;
    try {
        if (typeof api === 'function') lib = await api('/api/juknis-library');
    } catch (e) {
        console.warn('jobdesc: /api/juknis-library', e);
    }
    const manifest = lib && lib.manifest ? lib.manifest : { official_links: JOBDESC_OFFICIAL_LINKS_FALLBACK, canonical_reference: { short: 'Keputusan Kepala BGN Nomor 401.1 Tahun 2025' }, repository_reference: { title: 'BGN_JUKNIS_MATRIX.md', path: 'BGN_JUKNIS_MATRIX.md' } };
    JOBDESC_OFFICIAL_LINKS_BY_ID = _jdBuildLinkMapFromManifest(manifest);

    const canon = manifest.canonical_reference || {};
    const repo = manifest.repository_reference || {};
    const officialRows = (manifest.official_links || JOBDESC_OFFICIAL_LINKS_FALLBACK).map(row => `
        <div class="jd-doc-card">
          <div class="jd-doc-card-head">
            <span class="jd-badge jd-badge--${_jdEsc(row.kind || 'link')}">${_jdEsc(row.kind || 'link')}</span>
            <a class="jd-doc-title" href="${_jdEsc(row.url)}" target="_blank" rel="noopener noreferrer">${_jdEsc(row.title)}</a>
          </div>
          <p class="jd-doc-sub">${_jdEsc(row.subtitle || '')}</p>
          <div class="jd-doc-url"><code>${_jdEsc(row.url)}</code></div>
        </div>
    `).join('');

    const localPdfs = (lib && Array.isArray(lib.localPdfs)) ? lib.localPdfs : [];
    const localBlock = localPdfs.length
        ? `<div class="jd-local-wrap">
             <h4 class="jd-h4">Arsip PDF di server (folder <code>frontend/docs/juknis-bgn/</code>)</h4>
             <p class="jd-muted">File berikut disalin manual dari unduhan resmi BGN — bukan bundel aplikasi.</p>
             <ul class="jd-ul">${localPdfs.map(p => `<li><a href="${_jdEsc(p.url)}" target="_blank" rel="noopener">${_jdEsc(p.filename)}</a></li>`).join('')}</ul>
           </div>`
        : `<div class="jd-local-wrap jd-muted">
             <strong>Belum ada PDF lokal.</strong> Unduh dokumen resmi dari tautan di atas, lalu letakkan berkas <code>.pdf</code> di folder
             <code>frontend/docs/juknis-bgn/</code> pada repositori — akan muncul otomatis di daftar ini setelah server di-restart.
           </div>`;

    el.innerHTML = `
      <div class="jd-juknis-grid">
        <div>
          <h3 class="jd-h3">File asli Juknis (sumber Badan Gizi Nasional)</h3>
          <p class="jd-lead"><strong>${_jdEsc(canon.short || 'Keputusan Kepala BGN 401.1/2025')}</strong> — ${ _jdEsc(canon.about || 'acuan tata kelola MBG; teks lengkap unduh dari portal BGN.') }</p>
          <p class="jd-muted" style="margin-top:8px">Matriks pemetaan internal aplikasi: <strong>${_jdEsc(repo.path || 'BGN_JUKNIS_MATRIX.md')}</strong> di root repo (bukan substitusi dokumen hukum).</p>
          <div class="jd-actions">
            <a class="btn btn-secondary btn-sm" href="${_jdAbsUrl((lib && lib.staticIndexUrl) || '/docs/juknis-bgn/index.html')}" target="_blank" rel="noopener">Buka indeks statis</a>
            <a class="btn btn-secondary btn-sm" href="${_jdAbsUrl((lib && lib.readmeUrl) || '/docs/juknis-bgn/README.txt')}" target="_blank" rel="noopener">Petunjuk folder PDF</a>
          </div>
        </div>
        <div class="jd-official-list">${officialRows}</div>
      </div>
      ${localBlock}
    `;
}

function _jdFindSopByCode(code) {
    const c = String(code || '').trim();
    for (const cat of JOBDESC_BGN_SOP_CATALOG) {
        for (const it of cat.items || []) {
            if (it.code === c) return { category: cat.category, matrixRef: cat.matrixRef, item: it };
        }
    }
    return null;
}

function _jdLegalRefsHtml(ids) {
    const arr = Array.isArray(ids) ? ids : [];
    if (!arr.length) return '<p class="jd-muted">—</p>';
    const parts = arr.map(id => {
        const row = JOBDESC_OFFICIAL_LINKS_BY_ID[id];
        if (!row) return `<span class="jd-chip">${_jdEsc(id)}</span>`;
        return `<a class="jd-chip jd-chip--link" href="${_jdEsc(row.url)}" target="_blank" rel="noopener noreferrer">${_jdEsc(row.title)}</a>`;
    }).join('');
    return `<div class="jd-chip-row">${parts}</div>`;
}

function _jdDefinitionsHtml(defs) {
    const d = Array.isArray(defs) ? defs : [];
    if (!d.length) return '';
    const rows = d.map(x => `<dt>${_jdEsc(x.term || '')}</dt><dd>${_jdEsc(x.text || '')}</dd>`).join('');
    return `<dl class="jd-dl">${rows}</dl>`;
}

function _jdProcedureHtml(it) {
    if (Array.isArray(it.procedure) && it.procedure.length) {
        return it.procedure.map((ph, idx) => {
            const bullets = (ph.items || []).map(t => `<li>${_jdEsc(t)}</li>`).join('');
            const cp = ph.checkpoint ? `<div class="jd-checkpoint"><strong>Checkpoint:</strong> ${_jdEsc(ph.checkpoint)}</div>` : '';
            return `
              <div class="jd-phase">
                <div class="jd-phase-num">${idx + 1}</div>
                <div class="jd-phase-body">
                  <div class="jd-phase-title">${_jdEsc(ph.phase || ('Tahap ' + (idx + 1)))}</div>
                  <ul class="jd-ul">${bullets || '<li>—</li>'}</ul>
                  ${cp}
                </div>
              </div>`;
        }).join('');
    }
    const steps = Array.isArray(it.steps) ? it.steps : [];
    if (!steps.length) return '<p class="jd-muted">—</p>';
    return `<ol class="jd-ol">${steps.map(s => `<li>${_jdEsc(s)}</li>`).join('')}</ol>`;
}

function _jdSimpleList(label, arr) {
    const a = Array.isArray(arr) ? arr : [];
    if (!a.length) return '';
    return `
      <div class="jd-block">
        <div class="jd-block-title">${label}</div>
        <ul class="jd-ul">${a.map(x => `<li>${_jdEsc(x)}</li>`).join('')}</ul>
      </div>`;
}

function jobdescPrintSop(code) {
    const found = _jdFindSopByCode(code);
    if (!found) {
        if (typeof notifyUi === 'function') notifyUi('warning', 'SOP', 'Kode tidak ditemukan: ' + code);
        else alert('SOP tidak ditemukan');
        return;
    }
    const { category, matrixRef, item: it } = found;
    const legalBlock = _jdLegalRefsHtml(it.legalRefIds);
    const defs = _jdDefinitionsHtml(it.definitions);
    const pre = _jdSimpleList('Prasyarat', it.prerequisites);
    const proc = _jdProcedureHtml(it);
    const out = _jdSimpleList('Keluaran (deliverables)', it.outputs);
    const rec = _jdSimpleList('Rekam jejak / bukti', it.records);
    const tips = it.tips ? `<div class="jd-tip"><strong>Tips:</strong> ${_jdEsc(it.tips)}</div>` : '';

    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${_jdEsc(it.code)}</title>
    <style>
      @page { margin: 18mm 16mm; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 12mm; line-height: 1.45; }
      h1 { font-size: 15pt; margin: 0 0 6px; line-height: 1.25; }
      .sub { font-size: 10pt; color: #444; margin-bottom: 14px; }
      h2 { font-size: 11.5pt; margin: 18px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
      .jd-dl { margin: 8px 0; display: grid; grid-template-columns: 140px 1fr; gap: 6px 14px; font-size: 10.5pt; }
      .jd-dl dt { font-weight: 700; color: #333; }
      .jd-dl dd { margin: 0; }
      .jd-ul, .jd-ol { margin: 6px 0 6px 18px; }
      .jd-phase { display: flex; gap: 12px; margin: 10px 0; page-break-inside: avoid; }
      .jd-phase-num { flex: 0 0 28px; height: 28px; border-radius: 50%; background: #0d47a1; color: #fff; font-weight: 700; font-size: 11pt; display: flex; align-items: center; justify-content: center; }
      .jd-phase-title { font-weight: 700; margin-bottom: 4px; }
      .jd-checkpoint { margin-top: 8px; padding: 8px 10px; background: #e8f5e9; border-left: 4px solid #2e7d32; font-size: 10pt; }
      .jd-tip { margin-top: 12px; padding: 10px; background: #fff8e1; border: 1px solid #ffe082; font-size: 10pt; }
      .legal { font-size: 10pt; margin: 10px 0 0; padding: 10px; background: #f5f5f5; border: 1px solid #ddd; }
      .jd-chip-row { margin: 6px 0; }
      .jd-chip { display: inline-block; margin: 4px 8px 4px 0; padding: 3px 8px; background: #eee; border-radius: 6px; font-size: 9.5pt; }
      .jd-chip--link { background: #e3f2fd; color: #0d47a1; font-weight: 600; text-decoration: none; }
      .muted { color: #555; font-size: 10pt; }
      .sys { font-size: 10pt; margin-top: 12px; padding: 10px; border: 1px dashed #999; }
    </style></head><body>
      <h1>${_jdEsc(it.code)}</h1>
      <div class="sub">${_jdEsc(it.title)}</div>
      <p class="muted"><strong>Kategori:</strong> ${_jdEsc(category)} · <strong>Indikator matriks:</strong> ${_jdEsc(matrixRef)}</p>
      <h2>Tujuan</h2>
      <p>${_jdEsc(it.purpose || '—')}</p>
      <h2>Ruang lingkup peran</h2>
      <p>${_jdEsc(it.scope || '—')}</p>
      <h2>Acuan regulasi (unduh asli dari BGN)</h2>
      <div class="legal">${legalBlock}</div>
      ${defs ? '<h2>Istilah penting</h2>' + defs : ''}
      ${pre}
      <h2>Prosedur</h2>
      ${proc}
      ${out}
      ${rec}
      ${tips}
      <div class="sys"><strong>Modul sistem (referensi):</strong> ${_jdEsc(it.systemLinks || '—')}</div>
      <p class="muted" style="margin-top:16px">Dokumen operasional internal aplikasi — tidak menggantikan teks resmi Juknis/Peraturan BGN. Nomor dan revisi mengikuti unduhan dari portal resmi.</p>
      <script>window.onload=function(){setTimeout(function(){window.print();},250);}<\/script>
    </body></html>`;
    if (typeof window._distOpenPrint === 'function') window._distOpenPrint(html);
    else {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
    }
}

function _jdParseJson(s, fallback) {
    if (s == null || s === '') return fallback;
    try {
        const v = typeof s === 'string' ? JSON.parse(s) : s;
        return Array.isArray(v) ? v : fallback;
    } catch (_) {
        return fallback;
    }
}

function _jdRenderRoleCards(rows) {
    const el = document.getElementById('jobdesc-roles');
    if (!el) return;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
        el.innerHTML = '<div class="text-sm text-muted">Belum ada data job description di server.</div>';
        return;
    }
    const sorted = list.slice().sort((a, b) => String(a.role_key || '').localeCompare(String(b.role_key || '')));
    el.innerHTML = sorted.map(r => {
        const resp = _jdParseJson(r.responsibilities_json, []);
        const kpis = _jdParseJson(r.kpis_json, []);
        const respLi = resp.map(x => `<li class="text-sm" style="margin:2px 0">${_jdEsc(x)}</li>`).join('');
        const kpiBadges = kpis.map(k => `<span class="chip" style="margin:2px 4px 2px 0;font-size:10px">${_jdEsc(k)}</span>`).join('');
        return `
          <div class="p-3 mb-2 rounded border border-border bg-dark-overlay">
            <div class="font-bold">${_jdEsc(r.title || r.role_key)}</div>
            <div class="text-xs text-muted" style="margin-top:2px">${_jdEsc(r.role_key)} · ${_jdEsc(r.source || 'JUKNIS_BGN_2025')}</div>
            <p class="text-sm text-muted" style="margin:8px 0 4px">${_jdEsc(r.summary || '')}</p>
            <div class="text-xs font-bold" style="margin-top:8px">Tanggung jawab</div>
            <ul style="margin:4px 0 0;padding-left:18px">${respLi || '<li class="text-sm text-muted">—</li>'}</ul>
            <div class="text-xs font-bold" style="margin-top:8px">KPI</div>
            <div style="margin-top:4px">${kpiBadges || '<span class="text-sm text-muted">—</span>'}</div>
          </div>`;
    }).join('');
}

function _jdRenderRaciTable(activities) {
    const el = document.getElementById('jobdesc-raci');
    if (!el) return;
    const acts = Array.isArray(activities) ? activities : [];
    if (!acts.length) {
        el.innerHTML = '<div class="text-sm text-muted">Matriks RACI belum tersedia.</div>';
        return;
    }
    const roleKeys = [...new Set(acts.flatMap(a => Object.keys(a.assignments || {})))].sort((a, b) => String(a).localeCompare(String(b)));
    const thRoles = roleKeys.map(k => `<th class="text-center" style="font-size:10px;white-space:nowrap;padding:6px 4px">${_jdEsc(JOBDESC_ROLE_LABELS[k] || k)}<br><span class="text-muted" style="font-weight:400">${_jdEsc(k)}</span></th>`).join('');
    const rows = acts.map(a => {
        const cells = roleKeys.map(k => {
            const code = (a.assignments && a.assignments[k]) ? String(a.assignments[k]).toUpperCase() : '—';
            const tip = RACI_LABEL[code] || '';
            return `<td class="text-center" style="font-size:11px;padding:6px 4px" title="${_jdEsc(tip)}">${_jdEsc(code)}</td>`;
        }).join('');
        return `<tr>
          <td style="min-width:200px;font-size:11px;padding:6px 8px"><strong>${_jdEsc(a.activity_name || a.activity_key)}</strong><br><span class="text-muted" style="font-size:10px">${_jdEsc(a.activity_key)}</span></td>
          ${cells}
        </tr>`;
    }).join('');
    el.innerHTML = `
      <div class="table-responsive" style="max-height:420px;overflow:auto">
        <table class="nutri-table w-full">
          <thead><tr>
            <th style="min-width:200px;padding:8px">Aktivitas</th>
            ${thRoles}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="text-xs text-muted mt-2">R = Responsible · A = Accountable · C = Consulted · I = Informed. Sumber: <code>/api/raci</code>.</p>
    `;
}

function _jdRenderSopToc() {
    const anchors = JOBDESC_BGN_SOP_CATALOG.map((cat, i) => {
        const id = 'jd-cat-' + i;
        return `<a class="jd-toc-item" href="#${id}">${_jdEsc(cat.category)}</a>`;
    }).join('');
    return `<nav class="jd-toc" aria-label="Daftar isi SOP">${anchors}</nav>`;
}

function _jdRenderSopItemBody(it) {
    const legal = _jdLegalRefsHtml(it.legalRefIds);
    const defs = _jdDefinitionsHtml(it.definitions);
    const pre = _jdSimpleList('Prasyarat', it.prerequisites);
    const proc = _jdProcedureHtml(it);
    const out = _jdSimpleList('Keluaran', it.outputs);
    const rec = _jdSimpleList('Rekam jejak', it.records);
    const tips = it.tips ? `<div class="jd-tip-inline"><strong>Tips:</strong> ${_jdEsc(it.tips)}</div>` : '';
    return `
      <div class="jd-sop-body">
        <div class="jd-sop-grid2">
          <div>
            <h4 class="jd-h4">Tujuan</h4>
            <p class="jd-p">${_jdEsc(it.purpose || '—')}</p>
            <h4 class="jd-h4">Ruang lingkup peran</h4>
            <p class="jd-p">${_jdEsc(it.scope || '—')}</p>
          </div>
          <div>
            <h4 class="jd-h4">Acuan Juknis (file asli di BGN)</h4>
            ${legal}
          </div>
        </div>
        ${defs ? '<h4 class="jd-h4">Istilah penting</h4>' + defs : ''}
        ${pre}
        <h4 class="jd-h4">Prosedur detail</h4>
        <div class="jd-proc-wrap">${proc}</div>
        <div class="jd-sop-grid2" style="margin-top:12px">
          <div>${out}</div>
          <div>${rec}</div>
        </div>
        <p class="jd-muted" style="margin-top:10px"><strong>Integrasi sistem:</strong> ${_jdEsc(it.systemLinks || '—')}</p>
        ${tips}
      </div>`;
}

function _jdRenderSopCatalog() {
    const root = document.getElementById('jobdesc-sop-root');
    if (!root) return;
    if (!JOBDESC_BGN_SOP_CATALOG.length) {
        root.innerHTML = '<div class="text-sm text-danger">Katalog SOP tidak dimuat. Periksa berkas <code>docs/juknis-bgn/sop-internal-catalog.json</code> di server.</div>';
        return;
    }
    const toc = _jdRenderSopToc();
    const parts = JOBDESC_BGN_SOP_CATALOG.map((cat, i) => {
        const id = 'jd-cat-' + i;
        const items = (cat.items || []).map(it => `
            <details class="jd-sop-details">
              <summary class="jd-sop-sum">
                <div class="jd-sop-sum-main">
                  <span class="jd-code">${_jdEsc(it.code)}</span>
                  <span class="jd-sop-title">${_jdEsc(it.title)}</span>
                </div>
                <button type="button" class="btn btn-secondary btn-sm jobdesc-sop-print-btn" data-sop-code="${_jdEsc(it.code)}">Cetak / PDF</button>
              </summary>
              ${_jdRenderSopItemBody(it)}
            </details>
        `).join('');
        return `
          <section class="jd-cat-block" id="${id}">
            <header class="jd-cat-head">
              <h3 class="jd-cat-title">${_jdEsc(cat.category)}</h3>
              <span class="jd-matrix-pill">${_jdEsc(cat.matrixRef)}</span>
            </header>
            ${items}
          </section>`;
    }).join('');
    root.innerHTML = `
      <div class="jd-sop-intro">
        ${toc}
        <p class="jd-muted" style="margin:8px 0 0">SOP berikut adalah <strong>prosedur operasional internal</strong> yang dipetakan ke indikator Juknis. Nomor versi katalog: file JSON. Untuk hukum yang mengikat, rujuk PDF resmi dari BGN.</p>
      </div>
      ${parts}`;

    root.querySelectorAll('.jobdesc-sop-print-btn').forEach(btn => {
        btn.addEventListener('click', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            jobdescPrintSop(btn.getAttribute('data-sop-code'));
        });
    });
}

function _jdEnsurePageStyles() {
    if (document.getElementById('jobdesc-page-styles')) return;
    const st = document.createElement('style');
    st.id = 'jobdesc-page-styles';
    st.textContent = `
      .jd-juknis-grid { display:grid; grid-template-columns: 1fr; gap: 16px; }
      @media (min-width:900px) { .jd-juknis-grid { grid-template-columns: minmax(0,1fr) minmax(0,1.2fr); } }
      .jd-h3 { margin:0 0 8px; font-size:1.05rem; font-weight:700; }
      .jd-h4 { margin:12px 0 6px; font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted,#666); }
      .jd-lead { margin:0; line-height:1.55; font-size:0.9rem; }
      .jd-muted { color:var(--text-muted,#666); font-size:0.85rem; line-height:1.5; }
      .jd-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .jd-official-list { display:flex; flex-direction:column; gap:10px; }
      .jd-doc-card { border:1px solid var(--border,#ddd); border-radius:10px; padding:10px 12px; background:var(--bg-soft,#fafafa); }
      .jd-doc-card-head { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:4px; }
      .jd-doc-title { font-weight:600; font-size:0.92rem; }
      .jd-doc-sub { margin:0; font-size:0.8rem; color:var(--text-muted,#666); }
      .jd-doc-url { font-size:0.72rem; margin-top:4px; word-break:break-all; }
      .jd-badge { font-size:0.65rem; font-weight:700; padding:2px 8px; border-radius:999px; text-transform:uppercase; }
      .jd-badge--portal { background:#e3f2fd; color:#0d47a1; }
      .jd-badge--juknis_page { background:#e8f5e9; color:#1b5e20; }
      .jd-badge--jdih { background:#fff3e0; color:#e65100; }
      .jd-badge--link { background:#eee; color:#333; }
      .jd-local-wrap { margin-top:14px; padding-top:12px; border-top:1px dashed var(--border,#ccc); }
      .jd-ul { margin:6px 0; padding-left:1.2rem; }
      .jd-toc { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
      .jd-toc-item { font-size:0.8rem; padding:4px 10px; border-radius:999px; border:1px solid var(--border,#ccc); text-decoration:none; color:inherit; }
      .jd-toc-item:hover { background:var(--bg-soft,#f5f5f5); }
      .jd-cat-block { margin-bottom:28px; scroll-margin-top: 72px; }
      .jd-cat-head { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:10px; }
      .jd-cat-title { margin:0; font-size:1.05rem; font-weight:700; }
      .jd-matrix-pill { font-size:0.72rem; padding:3px 10px; border-radius:999px; background:#f3e5f5; color:#4a148c; font-weight:600; }
      .jd-sop-details { border:1px solid var(--border,#ddd); border-radius:10px; margin-bottom:10px; overflow:hidden; background:var(--card-bg,#fff); }
      .jd-sop-details > summary { list-style:none; cursor:pointer; display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding:12px 14px; background:var(--bg-soft,#fafafa); }
      .jd-sop-details > summary::-webkit-details-marker { display:none; }
      .jd-sop-sum-main { flex:1; min-width:0; }
      .jd-code { font-family:ui-monospace,monospace; font-size:0.72rem; color:var(--text-muted,#666); display:block; }
      .jd-sop-title { font-weight:700; font-size:0.95rem; display:block; margin-top:2px; }
      .jd-sop-body { padding:12px 14px 14px; border-top:1px solid var(--border,#eee); }
      .jd-sop-grid2 { display:grid; grid-template-columns:1fr; gap:12px; }
      @media (min-width:720px) { .jd-sop-grid2 { grid-template-columns:1fr 1fr; } }
      .jd-p { margin:0; font-size:0.88rem; line-height:1.5; }
      .jd-dl { margin:8px 0; display:grid; grid-template-columns: minmax(0,140px) 1fr; gap:6px 12px; font-size:0.85rem; }
      .jd-dl dt { font-weight:700; color:#333; }
      .jd-dl dd { margin:0; }
      .jd-chip-row { display:flex; flex-wrap:wrap; gap:6px; }
      .jd-chip { display:inline-block; padding:4px 10px; border-radius:8px; background:#eee; font-size:0.78rem; }
      .jd-chip--link { background:#e3f2fd; color:#0d47a1; text-decoration:none; font-weight:600; }
      .jd-block { margin-top:10px; }
      .jd-block-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted,#666); margin-bottom:4px; }
      .jd-proc-wrap { display:flex; flex-direction:column; gap:10px; }
      .jd-phase { display:flex; gap:12px; align-items:flex-start; padding:10px; border:1px solid #e0e0e0; border-radius:10px; background:#fcfcfc; }
      .jd-phase-num { flex:0 0 32px; height:32px; border-radius:50%; background:#0d47a1; color:#fff; font-weight:700; font-size:0.85rem; display:flex; align-items:center; justify-content:center; }
      .jd-phase-title { font-weight:700; font-size:0.88rem; margin-bottom:4px; }
      .jd-checkpoint { margin-top:8px; padding:8px 10px; background:#e8f5e9; border-left:4px solid #2e7d32; font-size:0.82rem; }
      .jd-tip-inline { margin-top:10px; padding:10px; background:#fff8e1; border-radius:8px; font-size:0.82rem; border:1px solid #ffe082; }
      .jd-banner { display:flex; gap:14px; align-items:flex-start; }
      .jd-banner-icon { flex:0 0 48px; height:48px; border-radius:12px; background:linear-gradient(135deg,#0d47a1,#1565c0); color:#fff; font-weight:800; font-size:0.75rem; display:flex; align-items:center; justify-content:center; letter-spacing:0.05em; }
    `;
    document.head.appendChild(st);
}

async function loadJobdescGovernance() {
    _jdEnsurePageStyles();
    const rolesEl = document.getElementById('jobdesc-roles');
    const raciEl = document.getElementById('jobdesc-raci');
    const refEl = document.getElementById('jobdesc-bgn-ref');
    if (!rolesEl && !raciEl) return;

    if (rolesEl) rolesEl.innerHTML = '<div class="text-sm text-muted">Memuat peran…</div>';
    if (raciEl) raciEl.innerHTML = '';
    if (refEl) {
        refEl.innerHTML = `
          <div class="jd-banner">
            <div class="jd-banner-icon" aria-hidden="true">BGN</div>
            <div>
              <div class="font-bold" style="font-size:1rem">Acuan program MBG / SPPG</div>
              <p class="text-sm text-muted" style="margin:6px 0 0;line-height:1.55">
                Halaman ini menyatukan <strong>Jobdesc</strong> (API), <strong>matriks RACI</strong>, <strong>dokumen resmi Juknis BGN</strong> (tautan unduhan),
                dan <strong>SOP operasional internal</strong> (baca di bawah). Dokumen hukum mengikat hanya versi PDF yang diunduh dari situs resmi BGN.
              </p>
            </div>
          </div>`;
    }

    await _jdLoadJuknisLibraryAndRender();
    await _jdLoadSopCatalog();
    _jdRenderSopCatalog();

    if (typeof api !== 'function') {
        if (rolesEl) rolesEl.innerHTML = '<div class="text-sm text-danger">API tidak tersedia.</div>';
        return;
    }
    try {
        const [jobRows, raciRows] = await Promise.all([
            api('/api/jobdesc').catch(() => []),
            api('/api/raci').catch(() => [])
        ]);
        _jdRenderRoleCards(jobRows);
        _jdRenderRaciTable(raciRows);
    } catch (e) {
        if (rolesEl) rolesEl.innerHTML = `<div class="text-sm text-danger">Gagal memuat jobdesc: ${_jdEsc(e.message || e)}</div>`;
    }
}

window.loadJobdescGovernance = loadJobdescGovernance;
window.jobdescPrintSop = jobdescPrintSop;

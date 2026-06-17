const REPORT_COLUMNS = {
    production: {
        plans: ['code', 'target_portions', 'target_delivery_time', 'status', 'created_at'],
        batches: ['code', 'plan_id', 'menu_item_id', 'batch_number', 'batch_size', 'division_id', 'start_time', 'end_time', 'status']
    },
    finance: {
        transactions: null,
        purchases: null
    },
    inventory: {
        movements: ['at', 'ingredient_name', 'movement_type', 'qty_before', 'qty_after', 'delta', 'note', 'actor_email'],
        low_stock: ['name', 'unit', 'quantity']
    },
    staff: {
        performance: ['division_name', 'total_tasks', 'done_tasks', 'completion_rate']
    }
};

function escapeHtml(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderSimpleTable(rows, columns, options = {}) {
    const maxRows = Number(options.maxRows || 25);
    const safeRows = Array.isArray(rows) ? rows.slice(0, maxRows) : [];
    const cols = Array.isArray(columns) && columns.length ? columns : (safeRows[0] ? Object.keys(safeRows[0]) : []);
    if (!safeRows.length) return `<div class="text-sm text-muted">Tidak ada data.</div>`;

    const thead = cols.map(c => `<th>${escapeHtml(c)}</th>`).join('');
    const tbody = safeRows.map(r => {
        const tds = cols.map(c => `<td>${escapeHtml(r?.[c] ?? '-')}</td>`).join('');
        return `<tr>${tds}</tr>`;
    }).join('');

    return `
        <div class="table-responsive">
            <table class="nutri-table w-full">
                <thead><tr>${thead}</tr></thead>
                <tbody>${tbody}</tbody>
            </table>
        </div>
    `;
}

function renderKpiSummary(items) {
    const safe = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!safe.length) return '';
    const blocks = safe.map((item) => {
        const label = escapeHtml(item.label || '-');
        const value = escapeHtml(item.value || '0');
        return `
            <div class="p-3 border border-border rounded">
                <div class="text-xs text-muted mb-1">${label}</div>
                <div class="font-bold">${value}</div>
            </div>
        `;
    }).join('');
    return `<div class="grid-dashboard mb-3">${blocks}</div>`;
}

function detectMissingSections(dataByType) {
    const missing = [];
    if (!dataByType.production) missing.push('production');
    if (!dataByType.finance) missing.push('finance');
    if (!dataByType.inventory) missing.push('inventory');
    if (!dataByType.staff) missing.push('staff');
    return missing;
}

const AUDIT_ACTION_OPTIONS = [
    { value: '', label: 'Semua aksi' },
    { value: 'distribution_event.create', label: 'Distribusi - Create' },
    { value: 'distribution_event.update', label: 'Distribusi - Update' },
    { value: 'distribution_event.delete', label: 'Distribusi - Delete' },
    { value: 'report.daily.create', label: 'Report Harian - Create' },
    { value: 'report.submit', label: 'Report - Submit' },
    { value: 'report.publish', label: 'Report - Publish' },
    { value: 'report.monthly.compile', label: 'Report Bulanan - Compile' },
    { value: 'report.quarterly.compile', label: 'Report Triwulanan - Compile' }
];

function auditActionLabel(action) {
    const key = String(action || '').trim();
    const found = AUDIT_ACTION_OPTIONS.find(x => x.value === key);
    if (found) return found.label;
    return key || '-';
}

function auditEsc(v) {
    return escapeHtml(v == null ? '' : String(v));
}

function auditDateOnly(isoLike) {
    const s = String(isoLike || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

function auditInRange(row, fromDate, toDate) {
    const d = auditDateOnly(row?.created_at);
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
}

function auditRowsToCsv(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalized = safeRows.map(r => ({
        created_at: r?.created_at || '',
        actor_email: r?.actor_email || '',
        action: r?.action || '',
        entity_type: r?.entity_type || '',
        entity_id: r?.entity_id || '',
        period: r?.period || '',
        meta: r?.meta_json ? String(r.meta_json) : ''
    }));
    const cols = ['created_at', 'actor_email', 'action', 'entity_type', 'entity_id', 'period', 'meta'];
    return toCsv(normalized, cols);
}

function auditParseJson(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(String(raw));
    } catch (e) {
        return null;
    }
}

function auditPeriodOf(row) {
    if (row?.period) return String(row.period);
    const meta = auditParseJson(row?.meta_json);
    if (!meta || typeof meta !== 'object') return '';
    if (meta.period) return String(meta.period);
    if (meta.month) return String(meta.month);
    if (meta.quarter) return String(meta.quarter);
    const start = String(meta.period_start || '').trim();
    const end = String(meta.period_end || '').trim();
    if (start && end) return `${start}..${end}`;
    return start || end || '';
}

function isReportAuditAction(action) {
    return String(action || '').startsWith('report.');
}

function isDistribusiAuditAction(action) {
    return String(action || '').startsWith('distribution_event.');
}

function openAuditEventDetail(index) {
    const rows = Array.isArray(window.__auditLogLastRows) ? window.__auditLogLastRows : [];
    const row = rows[index];
    if (!row) return;
    const before = auditParseJson(row.before_json);
    const after = auditParseJson(row.after_json);
    const meta = auditParseJson(row.meta_json);
    const body = `
        <div class="text-sm mb-3">
            <div><strong>Waktu:</strong> ${auditEsc(row.created_at || '-')}</div>
            <div><strong>Aksi:</strong> ${auditEsc(auditActionLabel(row.action))}</div>
            <div><strong>Entity:</strong> ${auditEsc(row.entity_type || '-')} / ${auditEsc(row.entity_id || '-')}</div>
            <div><strong>Aktor:</strong> ${auditEsc(row.actor_role || '-')} (${auditEsc(row.actor_id || '-')})</div>
        </div>
        <div class="font-bold mb-2">Before</div>
        <pre style="max-height:180px;overflow:auto;border:1px solid #ddd;padding:8px;border-radius:6px">${auditEsc(JSON.stringify(before || null, null, 2))}</pre>
        <div class="font-bold mb-2 mt-3">After</div>
        <pre style="max-height:180px;overflow:auto;border:1px solid #ddd;padding:8px;border-radius:6px">${auditEsc(JSON.stringify(after || null, null, 2))}</pre>
        <div class="font-bold mb-2 mt-3">Meta</div>
        <pre style="max-height:180px;overflow:auto;border:1px solid #ddd;padding:8px;border-radius:6px">${auditEsc(JSON.stringify(meta || null, null, 2))}</pre>
    `;
    openModalUi({
        title: 'Audit Event Detail',
        bodyHtml: body,
        actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
    });
}

function openAuditRelatedReport(index) {
    const rows = Array.isArray(window.__auditLogLastRows) ? window.__auditLogLastRows : [];
    const row = rows[index];
    if (!row) return;
    closeModalUi();
    switchView('reports');
    const meta = auditParseJson(row.meta_json) || {};
    if (meta.month) {
        notifyUi('info', 'Audit', `Event report untuk periode bulanan ${meta.month}. Buka Preview report sesuai kebutuhan.`);
    } else if (meta.quarter) {
        notifyUi('info', 'Audit', `Event report untuk periode triwulanan ${meta.quarter}. Buka Preview report sesuai kebutuhan.`);
    } else {
        notifyUi('info', 'Audit', 'Event report terbuka. Gunakan tombol Preview di dashboard reports.');
    }
}

function openAuditRelatedDistribusi(index) {
    const rows = Array.isArray(window.__auditLogLastRows) ? window.__auditLogLastRows : [];
    const row = rows[index];
    if (!row) return;
    const payload = auditParseJson(row.after_json) || auditParseJson(row.before_json) || {};
    const lokasiId = String(payload.lokasi_id || '').trim();
    const serviceDate = String(payload.service_date || '').trim();
    closeModalUi();
    switchView('distribusi');
    const parts = [];
    if (serviceDate) parts.push(`tanggal ${serviceDate}`);
    if (lokasiId) parts.push(`lokasi ${lokasiId}`);
    if (parts.length > 0) {
        notifyUi('info', 'Audit', `Navigasi ke Distribusi (${parts.join(', ')}).`);
    }
}

function renderAuditTableRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) {
        return `<tr><td colspan="8" class="text-sm text-muted">Tidak ada event audit untuk filter ini.</td></tr>`;
    }
    return safeRows.map((row, idx) => {
        const period = auditPeriodOf(row);
        const actor = `${String(row?.actor_role || '-')} / ${String(row?.actor_id || '-')}`;
        let relBtn = `<button class="btn btn-secondary btn-sm" onclick="openAuditEventDetail(${idx})">Detail</button>`;
        if (isDistribusiAuditAction(row?.action)) {
            relBtn = `
                <button class="btn btn-secondary btn-sm" onclick="openAuditRelatedDistribusi(${idx})">Buka Distribusi</button>
                <button class="btn btn-secondary btn-sm" onclick="openAuditEventDetail(${idx})">Detail</button>
            `;
        } else if (isReportAuditAction(row?.action)) {
            relBtn = `
                <button class="btn btn-secondary btn-sm" onclick="openAuditRelatedReport(${idx})">Buka Reports</button>
                <button class="btn btn-secondary btn-sm" onclick="openAuditEventDetail(${idx})">Detail</button>
            `;
        }
        return `
            <tr>
                <td>${auditEsc(row?.created_at || '-')}</td>
                <td>${auditEsc(actor)}</td>
                <td>${auditEsc(auditActionLabel(row?.action))}</td>
                <td>${auditEsc(row?.entity_type || '-')}</td>
                <td>${auditEsc(row?.entity_id || '-')}</td>
                <td>${auditEsc(period || '-')}</td>
                <td>${auditEsc(row?.meta_json || '-')}</td>
                <td><div class="flex gap-1" style="flex-wrap:wrap">${relBtn}</div></td>
            </tr>
        `;
    }).join('');
}

function auditControlsHtml() {
    const opts = AUDIT_ACTION_OPTIONS.map(item => `<option value="${auditEsc(item.value)}">${auditEsc(item.label)}</option>`).join('');
    return `
        <div class="flex gap-2 mb-3" style="flex-wrap:wrap">
            <select id="audit-filter-action" class="input-field" style="min-width:220px">${opts}</select>
            <input id="audit-filter-from" type="date" class="input-field">
            <input id="audit-filter-to" type="date" class="input-field">
            <button class="btn btn-secondary btn-sm" onclick="refreshAuditLog()"><i class="fas fa-sync"></i> Refresh</button>
            <button class="btn btn-secondary btn-sm" onclick="exportAuditLogCsv()"><i class="fas fa-file-csv"></i> Export CSV</button>
        </div>
    `;
}

async function refreshAuditLog() {
    const tableHost = document.getElementById('audit-log-rows');
    const summaryHost = document.getElementById('audit-log-summary');
    if (!tableHost || !summaryHost) return;

    const action = String((document.getElementById('audit-filter-action') || {}).value || '').trim();
    const fromDate = String((document.getElementById('audit-filter-from') || {}).value || '').trim();
    const toDate = String((document.getElementById('audit-filter-to') || {}).value || '').trim();
    window.__auditLogFilterState = { action, fromDate, toDate };

    tableHost.innerHTML = `<tr><td colspan="7" class="text-sm text-muted">Memuat audit log...</td></tr>`;
    try {
        const qs = action ? `?action=${encodeURIComponent(action)}` : '';
        const rows = await api(`/api/compliance/audit-events${qs}`);
        const safeRows = Array.isArray(rows) ? rows : [];
        const filtered = safeRows.filter(row => auditInRange(row, fromDate, toDate));
        window.__auditLogLastRows = filtered;
        summaryHost.innerHTML = `<div class="text-sm text-muted">Total event: ${filtered.length}</div>`;
        tableHost.innerHTML = renderAuditTableRows(filtered);
    } catch (e) {
        const msg = e?.message || 'Gagal memuat audit log';
        summaryHost.innerHTML = `<div class="text-sm text-danger">${auditEsc(msg)}</div>`;
        tableHost.innerHTML = `<tr><td colspan="7" class="text-sm text-danger">${auditEsc(msg)}</td></tr>`;
    }
}

function exportAuditLogCsv() {
    const rows = Array.isArray(window.__auditLogLastRows) ? window.__auditLogLastRows : [];
    const stamp = new Date().toISOString().replaceAll(':', '-');
    const content = auditRowsToCsv(rows);
    downloadText(`audit-log-${stamp}.csv`, content, 'text/csv;charset=utf-8');
    notifyUi('success', 'Audit Log', 'CSV audit log siap diunduh');
}

function openAuditLog() {
    const html = `
        <div class="mb-2">
            <div class="font-bold">Compliance Audit Log</div>
            <div class="text-sm text-muted">Filter per aksi dan periode untuk evidence review.</div>
        </div>
        ${auditControlsHtml()}
        <div id="audit-log-summary" class="mb-2 text-sm text-muted"></div>
        <div class="table-responsive" style="max-height:420px; overflow:auto">
            <table class="nutri-table w-full">
                <thead>
                    <tr>
                        <th>Waktu</th>
                        <th>Aktor</th>
                        <th>Aksi</th>
                        <th>Entity</th>
                        <th>Entity ID</th>
                        <th>Period</th>
                        <th>Meta</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="audit-log-rows">
                    <tr><td colspan="8" class="text-sm text-muted">Memuat audit log...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    openModalUi({
        title: 'Audit Log',
        bodyHtml: html,
        actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
    });

    const preset = window.__auditLogFilterState || {};
    const actionEl = document.getElementById('audit-filter-action');
    const fromEl = document.getElementById('audit-filter-from');
    const toEl = document.getElementById('audit-filter-to');
    if (actionEl) actionEl.value = String(preset.action || '');
    if (fromEl) fromEl.value = String(preset.fromDate || '');
    if (toEl) toEl.value = String(preset.toDate || '');
    refreshAuditLog();
}

function renderAuditOverview(events, errorMessage = '') {
    if (errorMessage) {
        return `<div class="text-sm text-warning mb-3">Audit ringkas belum tersedia: ${escapeHtml(errorMessage)}</div>`;
    }
    const rows = Array.isArray(events) ? events.slice(0, 5) : [];
    if (!rows.length) {
        return `<div class="text-sm text-muted mb-3">Audit ringkas: belum ada event terbaru.</div>`;
    }
    const items = rows.map((row) => {
        const action = auditActionLabel(row?.action);
        const when = String(row?.created_at || '-');
        const entity = String(row?.entity_type || '-');
        return `<li><span class="font-bold">${escapeHtml(action)}</span> • ${escapeHtml(entity)} • <span class="text-muted">${escapeHtml(when)}</span></li>`;
    }).join('');
    return `
        <div class="p-3 border border-border rounded mb-3">
            <div class="flex justify-between items-center" style="gap:8px;flex-wrap:wrap">
                <div class="font-bold">Audit Terbaru</div>
                <button class="btn btn-secondary btn-sm" onclick="openAuditLog()">Buka Audit Log</button>
            </div>
            <ul style="margin:8px 0 0 18px">${items}</ul>
        </div>
    `;
}

async function fetchPreviewSafe(type) {
    try {
        return await api(`/api/reports/preview/${encodeURIComponent(type)}`);
    } catch (e) {
        return null;
    }
}

function renderOverviewBlock(title, value, hint) {
    return `
        <div class="p-3 border border-border rounded">
            <div class="text-xs text-muted mb-1">${escapeHtml(title)}</div>
            <div class="font-bold">${escapeHtml(value)}</div>
            <div class="text-xs text-muted mt-1">${escapeHtml(hint)}</div>
        </div>
    `;
}

function guardrailLabel(key) {
    const map = {
        staff_master_ready: 'Staff Master',
        production_data_ready: 'Data Produksi',
        beneficiary_master_ready: 'Master Penerima Manfaat',
        distribution_evidence_ready: 'Evidence Distribusi',
        daily_reporting_ready: 'Laporan Harian'
    };
    return map[String(key || '')] || String(key || '-');
}

function renderGuardrailDetails(guardrails) {
    const checks = Array.isArray(guardrails?.checks) ? guardrails.checks : [];
    if (!checks.length) return '';
    const lines = checks.map((c) => {
        const ok = !!c?.ok;
        const sev = String(c?.severity || 'warning').toLowerCase();
        const icon = ok ? 'PASS' : (sev === 'critical' ? 'FAIL' : 'WARN');
        const cls = ok ? 'text-success' : (sev === 'critical' ? 'text-danger' : 'text-warning');
        const label = guardrailLabel(c?.key);
        const detail = String(c?.detail || '-');
        return `<li><span class="${cls}" style="font-weight:700">${icon}</span> ${escapeHtml(label)} <span class="text-muted">(${escapeHtml(detail)})</span></li>`;
    }).join('');
    return `<ul style="margin:6px 0 10px 18px">${lines}</ul>`;
}

async function loadReports() {
    const host = document.getElementById('report-overview');
    if (!host) return;
    host.innerHTML = `<div class="text-sm text-muted">Memuat ringkasan lintas laporan...</div>`;

    const guardrailReq = (async () => {
        try { return await api('/api/compliance/guardrails/smoke-check'); } catch (e) { return null; }
    })();
    const auditReq = (async () => {
        try {
            const rows = await api('/api/compliance/audit-events');
            return { rows: Array.isArray(rows) ? rows : [], error: '' };
        } catch (e) {
            return { rows: [], error: e?.message || 'akses audit tidak tersedia' };
        }
    })();
    const [production, finance, inventory, staff, guardrails, auditResult] = await Promise.all([
        fetchPreviewSafe('production'),
        fetchPreviewSafe('finance'),
        fetchPreviewSafe('inventory'),
        fetchPreviewSafe('staff'),
        guardrailReq,
        auditReq
    ]);
    const payload = { production, finance, inventory, staff };
    window.__reportsPreviewCache = payload;
    window.__auditOverviewCache = Array.isArray(auditResult?.rows) ? auditResult.rows : [];

    const plansCount = Array.isArray(production?.plans) ? production.plans.length : 0;
    const batchesCount = Array.isArray(production?.batches) ? production.batches.length : 0;
    const txns = Array.isArray(finance?.transactions) ? finance.transactions : [];
    const financeTotal = txns.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
    const lowStockCount = Array.isArray(inventory?.low_stock) ? inventory.low_stock.length : 0;
    const perf = Array.isArray(staff?.performance) ? staff.performance : [];
    const totalTasks = perf.reduce((sum, row) => sum + Number(row?.total_tasks || 0), 0);
    const doneTasks = perf.reduce((sum, row) => sum + Number(row?.done_tasks || 0), 0);
    const doneRate = totalTasks > 0 ? (doneTasks / totalTasks) : 0;

    const blocks = [
        renderOverviewBlock('Produksi', `${plansCount} plan / ${batchesCount} batch`, '10 plan & 25 batch terbaru'),
        renderOverviewBlock('Keuangan', `Rp ${Number(financeTotal).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`, `${txns.length} transaksi terbaru`),
        renderOverviewBlock('Inventori', `${lowStockCount} item stok rendah`, '10 item kuantitas terendah'),
        renderOverviewBlock('Kinerja Staff', `${(doneRate * 100).toFixed(1)}% task selesai`, `${doneTasks}/${totalTasks} task`)
    ];
    const missing = detectMissingSections(payload);
    const qualityWarnings = []
        .concat(Array.isArray(production?.meta?.warnings) ? production.meta.warnings : [])
        .concat(Array.isArray(finance?.meta?.warnings) ? finance.meta.warnings : [])
        .concat(Array.isArray(inventory?.meta?.warnings) ? inventory.meta.warnings : [])
        .concat(Array.isArray(staff?.meta?.warnings) ? staff.meta.warnings : []);

    let qualityHtml = '';
    if (missing.length > 0) {
        qualityHtml += `<div class="text-sm mb-3 text-danger">Sebagian report belum tersedia: ${escapeHtml(missing.join(', '))}.</div>`;
    }
    if (qualityWarnings.length > 0) {
        const uniq = Array.from(new Set(qualityWarnings.map(v => String(v || '').trim()).filter(Boolean)));
        if (uniq.length > 0) {
            qualityHtml += `<div class="text-sm mb-3 text-warning">Catatan kualitas data: ${escapeHtml(uniq.join(' | '))}</div>`;
        }
    }
    if (guardrails && typeof guardrails === 'object' && guardrails.status) {
        const status = String(guardrails.status || '').toUpperCase();
        if (status === 'FAIL') {
            qualityHtml += `<div class="text-sm mb-2 text-danger">Guardrail Azure: FAIL. Periksa item critical sebelum publish report.</div>`;
            qualityHtml += renderGuardrailDetails(guardrails);
        } else if (status === 'WARN') {
            qualityHtml += `<div class="text-sm mb-2 text-warning">Guardrail Azure: WARN. Ada item non-kritis yang perlu dibenahi.</div>`;
            qualityHtml += renderGuardrailDetails(guardrails);
        } else {
            qualityHtml += `<div class="text-sm mb-3 text-success">Guardrail Azure: PASS.</div>`;
        }
    }

    const auditOverviewHtml = renderAuditOverview(auditResult?.rows || [], auditResult?.error || '');
    host.innerHTML = `${qualityHtml}${auditOverviewHtml}<div class="grid-dashboard">${blocks.join('')}</div>`;
}

function getReportDataset(type, data) {
    const t = String(type || '').trim().toLowerCase();
    if (t === 'production') {
        return [
            { title: 'Plans (10 terbaru)', rows: Array.isArray(data?.plans) ? data.plans : [], columns: REPORT_COLUMNS.production.plans },
            { title: 'Batches (25 terbaru)', rows: Array.isArray(data?.batches) ? data.batches : [], columns: REPORT_COLUMNS.production.batches }
        ];
    }
    if (t === 'finance') {
        return [
            { title: 'Transactions (25 terbaru)', rows: Array.isArray(data?.transactions) ? data.transactions : [], columns: REPORT_COLUMNS.finance.transactions },
            { title: 'Purchases (25 terbaru)', rows: Array.isArray(data?.purchases) ? data.purchases : [], columns: REPORT_COLUMNS.finance.purchases }
        ];
    }
    if (t === 'inventory') {
        return [
            { title: 'Inventory Movements (50 terbaru)', rows: Array.isArray(data?.movements) ? data.movements : [], columns: REPORT_COLUMNS.inventory.movements },
            { title: 'Low Stock (10 terendah)', rows: Array.isArray(data?.low_stock) ? data.low_stock : [], columns: REPORT_COLUMNS.inventory.low_stock }
        ];
    }
    if (t === 'staff') {
        return [
            { title: 'Staff Performance (per divisi)', rows: Array.isArray(data?.performance) ? data.performance : [], columns: REPORT_COLUMNS.staff.performance }
        ];
    }
    return [];
}

function buildReportBodyHtml(type, data, nowLabel) {
    const t = String(type || '').trim().toLowerCase();
    let body = `<div class="text-sm text-muted mb-3">Generated: ${escapeHtml(nowLabel)}</div>`;
    const warnings = Array.isArray(data?.meta?.warnings) ? data.meta.warnings : [];
    if (warnings.length > 0) {
        body += `<div class="text-sm text-warning mb-3">Quality warnings: ${escapeHtml(warnings.join(' | '))}</div>`;
    }

    if (t === 'production') {
        const plans = Array.isArray(data?.plans) ? data.plans : [];
        const batches = Array.isArray(data?.batches) ? data.batches : [];
        body += renderKpiSummary([
            { label: 'Total Plan (preview)', value: String(plans.length) },
            { label: 'Total Batch (preview)', value: String(batches.length) }
        ]);
    } else if (t === 'finance') {
        const txns = Array.isArray(data?.transactions) ? data.transactions : [];
        const purchases = Array.isArray(data?.purchases) ? data.purchases : [];
        const totalTxn = txns.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
        body += renderKpiSummary([
            { label: 'Transaksi (preview)', value: String(txns.length) },
            { label: 'Nilai transaksi', value: Number(totalTxn).toLocaleString('id-ID', { maximumFractionDigits: 2 }) },
            { label: 'PO (preview)', value: String(purchases.length) }
        ]);
    } else if (t === 'inventory') {
        const movements = Array.isArray(data?.movements) ? data.movements : [];
        const lowStock = Array.isArray(data?.low_stock) ? data.low_stock : [];
        body += renderKpiSummary([
            { label: 'Pergerakan stok (preview)', value: String(movements.length) },
            { label: 'Item stok rendah', value: String(lowStock.length) }
        ]);
    } else if (t === 'staff') {
        const perf = Array.isArray(data?.performance) ? data.performance : [];
        const doneTotal = perf.reduce((sum, row) => sum + Number(row?.done_tasks || 0), 0);
        const allTotal = perf.reduce((sum, row) => sum + Number(row?.total_tasks || 0), 0);
        const avgRate = allTotal > 0 ? (doneTotal / allTotal) : 0;
        body += renderKpiSummary([
            { label: 'Divisi terukur', value: String(perf.length) },
            { label: 'Task selesai', value: String(doneTotal) },
            { label: 'Completion rate', value: `${(avgRate * 100).toFixed(1)}%` }
        ]);
    } else {
        body += `<div class="text-sm text-muted">Tipe report tidak dikenali: ${escapeHtml(t)}</div>`;
    }

    const sections = getReportDataset(t, data);
    sections.forEach((section, idx) => {
        body += `<div class="font-bold ${idx === 0 ? 'mb-2' : 'mt-4 mb-2'}">${escapeHtml(section.title)}</div>`;
        body += renderSimpleTable(section.rows, section.columns, { maxRows: 200 });
    });

    return body;
}

function toCsv(rows, columns) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const cols = Array.isArray(columns) && columns.length ? columns : (safeRows[0] ? Object.keys(safeRows[0]) : []);
    const esc = (value) => {
        const s = String(value ?? '');
        if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
        return s;
    };
    const header = cols.map(esc).join(',');
    const body = safeRows.map(row => cols.map(c => esc(row?.[c])).join(',')).join('\n');
    return `${header}\n${body}`;
}

function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 0);
}

async function resolveReportData(type) {
    const t = String(type || '').trim().toLowerCase();
    const cache = window.__reportsPreviewCache || {};
    if (cache[t]) return cache[t];
    const data = await api(`/api/reports/preview/${encodeURIComponent(t)}`);
    window.__reportsPreviewCache = Object.assign({}, cache, { [t]: data });
    return data;
}

async function openReportPreview(type) {
    const t = String(type || '').trim().toLowerCase();
    if (!t) return;
    try {
        openModalUi({
            title: `Preview Laporan: ${t.toUpperCase()}`,
            bodyHtml: `<div class="text-sm text-muted">Memuat data...</div>`,
            actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
        });

        const data = await resolveReportData(t);
        const nowLabel = new Date().toLocaleString('id-ID', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const body = buildReportBodyHtml(t, data, nowLabel);

        openModalUi({
            title: `Preview Laporan: ${t.toUpperCase()}`,
            bodyHtml: body,
            actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
        });
    } catch (e) {
        openModalUi({
            title: `Preview Laporan: ${t.toUpperCase()}`,
            bodyHtml: `<div class="text-sm text-muted">Gagal memuat report.</div>`,
            actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
        });
        notifyUi('error', 'Report', e?.message || 'Gagal memuat');
    }
}

async function exportReport(type, format) {
    const t = String(type || '').trim().toLowerCase();
    const f = String(format || '').trim().toLowerCase();
    if (!t || !f) return;
    try {
        const data = await resolveReportData(t);
        const sections = getReportDataset(t, data);
        const stamp = new Date().toISOString().replaceAll(':', '-');

        if (f === 'excel') {
            // Export as CSV (Excel-compatible) for portability on static deployment.
            const csvBlocks = sections.map((section) => {
                const cols = Array.isArray(section.columns) && section.columns.length
                    ? section.columns
                    : (section.rows[0] ? Object.keys(section.rows[0]) : []);
                const csv = toCsv(section.rows, cols);
                return `# ${section.title}\n${csv}\n`;
            }).join('\n');
            downloadText(`report-${t}-${stamp}.csv`, csvBlocks, 'text/csv;charset=utf-8');
            notifyUi('success', 'Report', 'File CSV siap diunduh');
            return;
        }

        if (f === 'pdf') {
            const nowLabel = new Date().toLocaleString('id-ID', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const body = buildReportBodyHtml(t, data, nowLabel);
            const win = window.open('', '_blank');
            if (!win) {
                notifyUi('error', 'Report', 'Popup diblokir browser. Izinkan popup untuk export PDF.');
                return;
            }
            win.document.write(`
                <html>
                <head>
                    <title>Report ${escapeHtml(t.toUpperCase())}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
                        table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; }
                        th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; text-align: left; }
                        th { background: #f3f4f6; }
                        .text-muted { color: #666; font-size: 12px; }
                        .font-bold { font-weight: 700; }
                        .mb-2 { margin-bottom: 8px; }
                        .mb-3 { margin-bottom: 12px; }
                        .mt-4 { margin-top: 16px; }
                        .grid-dashboard { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; margin-bottom: 12px; }
                        .border { border: 1px solid #ddd; }
                        .rounded { border-radius: 6px; }
                        .p-3 { padding: 10px; }
                    </style>
                </head>
                <body>
                    <h2>Laporan ${escapeHtml(t.toUpperCase())}</h2>
                    ${body}
                </body>
                </html>
            `);
            win.document.close();
            win.focus();
            win.print();
            return;
        }

        notifyUi('error', 'Report', `Format export tidak dikenali: ${f}`);
    } catch (e) {
        notifyUi('error', 'Report', e?.message || 'Gagal export report');
    }
}

function currentMonthKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}

function currentQuarterKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${yyyy}-Q${q}`;
}

async function compileMonthlyReport(monthKey = '') {
    const month = String(monthKey || currentMonthKey()).trim();
    try {
        await api('/api/reports/monthly/compile', 'POST', { month });
        notifyUi('success', 'Report', `Kompilasi bulanan ${month} berhasil dibuat`);
    } catch (e) {
        notifyUi('error', 'Report', e?.message || 'Gagal kompilasi bulanan');
    }
}

async function compileQuarterlyReport(quarterKey = '') {
    const quarter = String(quarterKey || currentQuarterKey()).trim().toUpperCase();
    try {
        await api('/api/reports/quarterly/compile', 'POST', { quarter });
        notifyUi('success', 'Report', `Kompilasi triwulanan ${quarter} berhasil dibuat`);
    } catch (e) {
        notifyUi('error', 'Report', e?.message || 'Gagal kompilasi triwulanan');
    }
}

window.loadReports = loadReports;
window.openReportPreview = openReportPreview;
window.exportReport = exportReport;
window.compileMonthlyReport = compileMonthlyReport;
window.compileQuarterlyReport = compileQuarterlyReport;
window.openAuditLog = openAuditLog;
window.refreshAuditLog = refreshAuditLog;
window.exportAuditLogCsv = exportAuditLogCsv;
window.openAuditEventDetail = openAuditEventDetail;
window.openAuditRelatedReport = openAuditRelatedReport;
window.openAuditRelatedDistribusi = openAuditRelatedDistribusi;

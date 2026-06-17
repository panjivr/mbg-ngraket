
// Production Monitoring & Configuration (V6 — plan-centric, War Room handles creation)

window._activePlanId = null;
window._prodV2 = null;
window._prodMonitor = window._prodMonitor || {
    listTimer: null,
    filter: 'all',
    search: '',
    plansCache: [],
    events: [],
    lastTaskStatuses: {},
    lastBatchStatuses: {}
};

const PROD_STATUS_META = {
    'DRAFT':       { cls: 'prod-badge prod-badge--muted',   label: 'Draft' },
    'SIMULATED':   { cls: 'prod-badge prod-badge--warning', label: 'Simulated' },
    'PO_SENT':     { cls: 'prod-badge prod-badge--info',    label: 'PO Sent' },
    'APPROVED':    { cls: 'prod-badge prod-badge--success', label: 'Approved' },
    'PUBLISHED':   { cls: 'prod-badge prod-badge--success', label: 'Published' },
    'SCHEDULED':   { cls: 'prod-badge prod-badge--info',    label: 'Scheduled' },
    'IN_PROGRESS': { cls: 'prod-badge prod-badge--primary', label: 'In Progress' },
    'COMPLETED':   { cls: 'prod-badge prod-badge--success', label: 'Completed' },
    'CANCELLED':   { cls: 'prod-badge prod-badge--danger',  label: 'Cancelled' },
    'PENDING':     { cls: 'prod-badge prod-badge--muted',   label: 'Pending' }
};

const PROD_DIVISION_ICONS = {
    receiving: 'fa-box-open',
    prep:      'fa-carrot',
    cooking:   'fa-fire',
    kitchen:   'fa-fire',
    packing:   'fa-box',
    driver:    'fa-truck',
    cleaning:  'fa-broom',
    security:  'fa-shield-alt',
    ompreng:   'fa-utensils',
    general:   'fa-layer-group'
};

function prodStatusBadge(status) {
    const meta = PROD_STATUS_META[String(status || '').toUpperCase()] || { cls: 'prod-badge prod-badge--muted', label: String(status || '-') };
    return `<span class="${meta.cls}">${meta.label}</span>`;
}

function prodFormatDelivery(iso) {
    if (!iso) return '<span class="text-muted">-</span>';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '<span class="text-muted">-</span>';
        const today = new Date();
        const sameDay = d.toDateString() === today.toDateString();
        const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        return sameDay
            ? `<span class="text-sm"><strong>Hari ini</strong> ${time}</span>`
            : `<span class="text-sm">${date} <span class="text-muted">${time}</span></span>`;
    } catch (e) { return '<span class="text-muted">-</span>'; }
}

function prodComputeProgress(plan) {
    const batches = Number(plan?.stats?.batches || 0);
    const tasks = Number(plan?.stats?.tasks || 0);
    if (!batches && !tasks) return { pct: 0, sub: 'Belum ada batch/task' };
    const st = String(plan?.status || '').toUpperCase();
    if (st === 'COMPLETED') return { pct: 100, sub: `${batches} batch · ${tasks} task` };
    if (st === 'CANCELLED') return { pct: 0, sub: 'Dibatalkan' };
    return { pct: null, sub: `${batches} batch · ${tasks} task` };
}

function initProductionV2() {
    if (!window._prodV2) window._prodV2 = { planId: null, lastEventAt: null, timer: null };
    loadMonitoringPlans();
    if (window._prodMonitor.listTimer) clearInterval(window._prodMonitor.listTimer);
    window._prodMonitor.listTimer = setInterval(() => {
        const view = document.getElementById('view-production-v2');
        if (view && !view.classList.contains('hidden')) loadMonitoringPlans({ silent: true });
    }, 30000);
}

window.setMonitorFilter = function(f) {
    window._prodMonitor.filter = f || 'all';
    document.querySelectorAll('.monitor-filter-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.filter === window._prodMonitor.filter);
    });
    renderMonitorPlansTable();
};

window.setMonitorSearch = function(q) {
    window._prodMonitor.search = String(q || '').trim().toLowerCase();
    renderMonitorPlansTable();
};

function planMatchesFilter(p) {
    const st = String(p?.status || '').toUpperCase();
    const f = window._prodMonitor.filter;
    if (f === 'scheduled') return ['PUBLISHED', 'APPROVED', 'SCHEDULED', 'SIMULATED'].includes(st);
    if (f === 'running') return ['IN_PROGRESS'].includes(st);
    return !['COMPLETED', 'CANCELLED', 'DRAFT'].includes(st);
}

function planMatchesSearch(p) {
    const q = window._prodMonitor.search;
    if (!q) return true;
    const hay = `${p.code || ''} ${p.id || ''} ${p.status || ''}`.toLowerCase();
    return hay.includes(q);
}

async function loadMonitoringPlans(opts) {
    const silent = opts && opts.silent;
    const tbody = document.getElementById('prod-orders-rows');
    if (!tbody) return;
    if (!silent) tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-4"><i class="fas fa-spinner fa-spin mr-1"></i> Memuat plan…</td></tr>`;
    try {
        const plans = await api('/api/plans');
        window._prodMonitor.plansCache = Array.isArray(plans) ? plans : [];
        renderMonitorKPIs();
        renderMonitorPlansTable();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-4"><i class="fas fa-exclamation-triangle mr-1"></i> Gagal load plan: ${(e && e.message) || e}</td></tr>`;
    }
}

function renderMonitorKPIs() {
    const all = window._prodMonitor.plansCache || [];
    const active = all.filter(p => !['COMPLETED', 'CANCELLED', 'DRAFT'].includes(String(p.status || '').toUpperCase()));
    const totalPortions = active.reduce((s, p) => s + Number(p.target_portions || 0), 0);
    const running = active.filter(p => String(p.status || '').toUpperCase() === 'IN_PROGRESS').length;
    const nextDelivery = active
        .map(p => p.target_delivery_time)
        .filter(Boolean)
        .map(iso => new Date(iso).getTime())
        .filter(t => Number.isFinite(t) && t >= Date.now() - 6 * 3600 * 1000)
        .sort((a, b) => a - b)[0];

    const byId = (id) => document.getElementById(id);
    if (byId('monitor-kpi-plans'))    byId('monitor-kpi-plans').textContent = String(active.length);
    if (byId('monitor-kpi-portions')) byId('monitor-kpi-portions').textContent = totalPortions.toLocaleString('id-ID');
    if (byId('monitor-kpi-running'))  byId('monitor-kpi-running').textContent = String(running);
    if (byId('monitor-kpi-eta')) {
        if (nextDelivery) {
            const d = new Date(nextDelivery);
            const diffMin = Math.round((nextDelivery - Date.now()) / 60000);
            const rel = diffMin <= 0 ? 'lewat' : (diffMin < 60 ? `${diffMin}m lagi` : `${Math.round(diffMin / 60)}j lagi`);
            byId('monitor-kpi-eta').innerHTML = `${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} <span class="text-xs text-muted">· ${rel}</span>`;
        } else {
            byId('monitor-kpi-eta').textContent = '-';
        }
    }
}

function renderMonitorPlansTable() {
    const tbody = document.getElementById('prod-orders-rows');
    if (!tbody) return;
    const plans = (window._prodMonitor.plansCache || [])
        .filter(planMatchesFilter)
        .filter(planMatchesSearch)
        .sort((a, b) => {
            const ta = a.target_delivery_time ? new Date(a.target_delivery_time).getTime() : Infinity;
            const tb = b.target_delivery_time ? new Date(b.target_delivery_time).getTime() : Infinity;
            return ta - tb;
        });

    if (!plans.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-4">
            Tidak ada plan yang cocok. Buat plan baru di <strong>War Room</strong> atau ubah filter.
        </td></tr>`;
        return;
    }

    const activeId = window._prodV2 && window._prodV2.planId;
    tbody.innerHTML = plans.map(p => {
        const prog = prodComputeProgress(p);
        const isActive = activeId && (activeId === p.id || activeId === p.code);
        const code = p.code || String(p.id || '').slice(0, 8);
        const isCancelled = String(p.status || '').toUpperCase() === 'CANCELLED';
        const pctBar = prog.pct === null
            ? `<div class="prod-progress-bar prod-progress-bar--indeterminate"><div class="prod-progress-bar-fill"></div></div>`
            : `<div class="prod-progress-bar"><div class="prod-progress-bar-fill" style="width:${Math.max(0, Math.min(100, prog.pct))}%"></div></div>`;
        const monBtn = isCancelled
            ? `<button type="button" class="btn btn-secondary btn-sm opacity-60 cursor-not-allowed" disabled title="Plan dibatalkan — buka War Room untuk mulai ulang"><i class="fas fa-ban"></i> Dibatalkan</button>`
            : `<button type="button" class="btn ${isActive ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="startMonitorOrder('${p.id}')" title="${isActive ? 'Sedang dimonitor' : 'Mulai monitor'}">
                        <i class="fas fa-${isActive ? 'eye' : 'desktop'}"></i> ${isActive ? 'Active' : 'Monitor'}
                    </button>`;
        return `<tr class="${isActive ? 'prod-row-active' : ''}">
            <td>
                <div class="font-mono text-sm">${code}</div>
                <div class="text-xs text-muted">${p.stats?.batches || 0} batch · ${p.stats?.tasks || 0} task</div>
            </td>
            <td><strong>${Number(p.target_portions || 0).toLocaleString('id-ID')}</strong> <span class="text-xs text-muted">porsi</span></td>
            <td>${prodFormatDelivery(p.target_delivery_time)}</td>
            <td>
                ${pctBar}
                <div class="text-xs text-muted mt-1">${prog.sub}</div>
            </td>
            <td>${prodStatusBadge(p.status)}</td>
            <td class="text-right">
                <div class="flex gap-1 justify-end">
                    ${monBtn}
                    <button type="button" class="btn btn-secondary btn-sm" onclick="openPlanDetailsLegacy('${p.id}')" title="Detail plan"><i class="fas fa-info-circle"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function openPlanDetailsLegacy(id) {
    try {
        const detail = await api(`/api/plans/${id}/details`);
        const detailCard = document.getElementById('plan-details-card');
        if (detailCard) detailCard.classList.remove('hidden');
        const idEl = document.getElementById('plan-details-id');
        if (idEl) idEl.textContent = (detail.plan && detail.plan.code) ? detail.plan.code : id;
        const slack = detail && detail.stats ? detail.stats.slack_minutes : null;
        const st = (detail.plan && detail.plan.status) ? detail.plan.status : '-';
        const statusEl = document.getElementById('plan-details-status');
        if (statusEl) statusEl.textContent = (slack === null) ? st : `${st} • Slack ${slack} menit${slack < 0 ? ' (TIDAK FEASIBLE)' : ''}`;
        window._activePlanId = id;

        const batchesEl = document.getElementById('plan-batches-rows');
        if (batchesEl) {
            const batches = (detail.batches || []).map(b => `<tr>
                <td class="font-mono text-sm">${b.code || b.id}</td>
                <td>${b.menu_name || b.menu_item_id || '-'}</td>
                <td>${b.division_name || b.division_id || '-'}</td>
                <td>${b.batch_size || '-'}</td>
                <td>${formatDateTime(b.start_time)}</td>
                <td>${formatDateTime(b.end_time)}</td>
                <td>${b.status || '-'}</td>
            </tr>`).join('');
            batchesEl.innerHTML = batches || `<tr><td colspan="7" class="text-muted">Tidak ada batch</td></tr>`;
        }

        const tasksEl = document.getElementById('plan-tasks-rows');
        if (tasksEl) {
            const tasks = (detail.tasks || []).map(t => `<tr>
                <td>${t.title || '-'}</td>
                <td>${t.division_name || t.division_id || '-'}</td>
                <td>${formatDateTime(t.start_time)}</td>
                <td>${formatDateTime(t.end_time)}</td>
                <td class="font-mono text-sm">${Number.isFinite(Number(t.duration_minutes)) ? `${Number(t.duration_minutes)}m` : '-'}</td>
                <td>${t.status || '-'}</td>
                <td><button class="btn btn-primary btn-sm" onclick="setTaskStatus('${t.id}','DONE')">Done</button></td>
            </tr>`).join('');
            tasksEl.innerHTML = tasks || `<tr><td colspan="7" class="text-muted">Tidak ada task</td></tr>`;
        }
    } catch (e) {
        notifyUi('danger', 'Production Plans', 'Gagal load detail plan: ' + e.message);
    }
}

function closePlanDetails() {
    const el = document.getElementById('plan-details-card');
    if (el) el.classList.add('hidden');
}

// ─── Live Monitoring ────────────────────────────────────────────────────────

/**
 * Tutup panel monitor saja: hentikan refresh otomatis (5s), sembunyikan kartu.
 * Plan tetap dianggap "Active" di tabel — klik Monitor lagi untuk buka panel + lanjut polling.
 */
function closePlanMonitor() {
    if (window._prodV2 && window._prodV2.timer) {
        clearInterval(window._prodV2.timer);
        window._prodV2.timer = null;
    }
    const card = document.getElementById('prod-monitor-card');
    if (card) card.classList.add('hidden');
    const pulse = document.getElementById('monitor-live-pulse');
    if (pulse) pulse.classList.remove('monitor-pulse--active');
    renderMonitorPlansTable();
}

/** Hentikan polling monitor, lepas sesi, reset state UI (tanpa panggilan API). */
function teardownProductionMonitorSession() {
    if (window._prodV2 && window._prodV2.timer) {
        clearInterval(window._prodV2.timer);
    }
    if (window._prodV2) {
        window._prodV2.planId = null;
        window._prodV2.lastEventAt = null;
        window._prodV2.timer = null;
    }
    window._activePlanId = null;
    const card = document.getElementById('prod-monitor-card');
    if (card) card.classList.add('hidden');
    const pulse = document.getElementById('monitor-live-pulse');
    if (pulse) pulse.classList.remove('monitor-pulse--active');
    window._prodMonitor.lastTaskStatuses = {};
    window._prodMonitor.lastBatchStatuses = {};
    window._prodMonitor.events = [];
    const evEl = document.getElementById('prod-events');
    if (evEl) evEl.innerHTML = '<span class="text-muted">Belum ada event tercatat.</span>';
    renderMonitorPlansTable();
}

/**
 * Stop: batalkan plan di server (jobdesc task/batch + delivery wave), lalu hentikan monitor.
 * Batal tidak menghapus baris; task/batch yang sudah COMPLETED tidak diubah.
 */
async function stopMonitorOrder() {
    const planId = window._prodV2 && window._prodV2.planId;
    if (!planId) {
        teardownProductionMonitorSession();
        return;
    }
    const msg = 'Batalkan plan di server? Task dan batch jobdesc yang belum selesai akan ditandai <strong>dibatalkan</strong>, delivery wave ikut dibatalkan, dan plan tampil sebagai <strong>CANCELLED</strong> di War Room. Yang sudah selesai tetap tercatat.';
    const ok = typeof confirmUi === 'function'
        ? await confirmUi({
            title: 'Batalkan production plan',
            message: msg,
            confirmLabel: 'Ya, batalkan',
            cancelLabel: 'Tidak',
            danger: true
        })
        : confirm('Batalkan plan di server? Jobdesc dan delivery yang belum selesai akan dibatalkan.');
    if (!ok) return;
    try {
        await api(`/api/plans/${encodeURIComponent(planId)}/cancel`, 'POST', {});
        notifyUi('success', 'Plan dibatalkan', 'Data plan, jobdesc, dan delivery telah diperbarui di server.');
        teardownProductionMonitorSession();
        try {
            const v = document.getElementById('view-production-v2');
            if (v && !v.classList.contains('hidden') && typeof loadMonitoringPlans === 'function') {
                await loadMonitoringPlans({ silent: true });
            }
        } catch (e) { /* ignore */ }
    } catch (e) {
        notifyUi('danger', 'Batalkan plan', (e && e.message) ? e.message : String(e));
    }
}

async function startMonitorOrder(planId) {
    if (!window._prodV2) initProductionV2();
    if (window._prodV2.timer) clearInterval(window._prodV2.timer);
    window._prodV2.planId = planId;
    window._activePlanId = planId;
    window._prodV2.lastEventAt = null;
    window._prodMonitor.lastTaskStatuses = {};
    window._prodMonitor.lastBatchStatuses = {};
    window._prodMonitor.events = [];
    const card = document.getElementById('prod-monitor-card');
    if (card) {
        card.classList.remove('hidden');
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
    const pulse = document.getElementById('monitor-live-pulse');
    if (pulse) pulse.classList.add('monitor-pulse--active');
    const titleEl = document.getElementById('prod-monitor-title');
    if (titleEl) titleEl.textContent = 'Memuat…';
    await refreshMonitorOrder();
    window._prodV2.timer = setInterval(() => refreshMonitorOrder(), 5000);
    renderMonitorPlansTable();
}

async function refreshMonitorOrder() {
    const id = window._prodV2 && window._prodV2.planId;
    if (!id) return;
    await loadOrderStatusV2();
}

function pushProdEvent(icon, cls, title, detail) {
    const ev = {
        at: Date.now(),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        icon, cls, title, detail
    };
    window._prodMonitor.events.unshift(ev);
    window._prodMonitor.events = window._prodMonitor.events.slice(0, 50);
    const el = document.getElementById('prod-events');
    if (!el) return;
    el.innerHTML = window._prodMonitor.events.map(e => `
        <div class="prod-event-row">
            <span class="prod-event-icon ${e.cls}"><i class="fas ${e.icon}"></i></span>
            <div class="flex-1 min-w-0">
                <div class="prod-event-title">${e.title}</div>
                ${e.detail ? `<div class="text-xs text-muted">${e.detail}</div>` : ''}
            </div>
            <div class="text-xs text-muted">${e.time}</div>
        </div>
    `).join('');
}

window.clearProdEvents = function() {
    window._prodMonitor.events = [];
    const el = document.getElementById('prod-events');
    if (el) el.innerHTML = '<span class="text-muted">Belum ada event tercatat.</span>';
};

function prodTaskStatusMeta(st) {
    const s = String(st || '').toUpperCase();
    if (s === 'COMPLETED') return { cls: 'prod-task--done',   color: 'var(--success)', label: 'Selesai' };
    if (s === 'IN_PROGRESS') return { cls: 'prod-task--active', color: 'var(--warning)', label: 'Berjalan' };
    if (s === 'CANCELLED') return { cls: 'prod-task--cancelled', color: 'var(--danger)', label: 'Dibatalkan' };
    return { cls: 'prod-task--pending', color: 'var(--text-muted)', label: 'Pending' };
}

function prodHourMinute(iso) {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '-'; }
}

async function loadOrderStatusV2() {
    const id = window._prodV2 && window._prodV2.planId;
    if (!id) return;
    try {
        const plan = await api(`/api/plans/${id}/details`);
        const p = plan.plan || {};
        const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
        const batches = Array.isArray(plan.batches) ? plan.batches : [];

        detectStatusChanges(tasks, batches);

        const titleEl = document.getElementById('prod-monitor-title');
        const subEl = document.getElementById('prod-monitor-subtitle');
        if (titleEl) titleEl.innerHTML = `${p.code || String(id).slice(0, 8)} &nbsp;${prodStatusBadge(p.status)}`;
        if (subEl) {
            const deliv = p.target_delivery_time ? `Delivery: <strong>${prodHourMinute(p.target_delivery_time)}</strong>` : 'Tanpa target delivery';
            const portions = Number(p.target_portions || 0).toLocaleString('id-ID');
            subEl.innerHTML = `${portions} porsi · ${deliv} · <span class="text-xs">Live refresh 5s</span>`;
        }

        const doneTasks = tasks.filter(t => String(t.status).toUpperCase() === 'COMPLETED').length;
        const runningTasks = tasks.filter(t => String(t.status).toUpperCase() === 'IN_PROGRESS').length;
        const doneBatches = batches.filter(b => String(b.status).toUpperCase() === 'COMPLETED').length;
        const pct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setTxt('mon-k-progress', pct + '%');
        const fill = document.getElementById('mon-progress-fill');
        if (fill) fill.style.width = pct + '%';
        setTxt('mon-k-tasks', `${doneTasks}/${tasks.length}`);
        setTxt('mon-k-tasks-sub', runningTasks ? `${runningTasks} berjalan` : 'siap eksekusi');
        setTxt('mon-k-batches', `${doneBatches}/${batches.length}`);
        setTxt('mon-k-batches-sub', batches.length ? `${batches.length - doneBatches} tersisa` : '—');

        const stats = plan.stats || {};
        const slackEl = document.getElementById('mon-k-slack');
        const slackSub = document.getElementById('mon-k-slack-sub');
        if (slackEl) {
            if (Number.isFinite(Number(stats.slack_minutes))) {
                const m = Number(stats.slack_minutes);
                const txt = m >= 0 ? `+${m}m` : `${m}m`;
                slackEl.innerHTML = `<span style="color:${m < 0 ? 'var(--danger)' : m < 30 ? 'var(--warning)' : 'var(--success)'}">${txt}</span>`;
                if (slackSub) slackSub.textContent = m < 0 ? 'TIDAK FEASIBLE — overrun' : (m < 30 ? 'ketat terhadap delivery' : 'sehat');
            } else if (stats.latest_end_time) {
                slackEl.textContent = 'ETA ' + prodHourMinute(stats.latest_end_time);
                if (slackSub) slackSub.textContent = 'tanpa target delivery';
            } else {
                slackEl.textContent = '-';
                if (slackSub) slackSub.textContent = '';
            }
        }

        const planCancelled = String(p.status || '').toUpperCase() === 'CANCELLED';
        if (planCancelled && window._prodV2 && window._prodV2.timer) {
            clearInterval(window._prodV2.timer);
            window._prodV2.timer = null;
        }

        const metricsEl = document.getElementById('prod-metrics');
        if (metricsEl) metricsEl.innerHTML = renderTimelineByDivision(tasks, planCancelled);
        const summaryEl = document.getElementById('mon-timeline-summary');
        if (summaryEl) summaryEl.textContent = `${tasks.length} task · ${Object.keys(groupTasksByDivision(tasks)).length} divisi`;

        const cookEl = document.getElementById('prod-cook-rows');
        if (cookEl) cookEl.innerHTML = renderBatchRows(batches, planCancelled);
    } catch (e) {
        notifyUi('danger', 'Monitor Plan', 'Gagal load status: ' + (e && e.message || e));
    }
}

function groupTasksByDivision(tasks) {
    const map = {};
    (tasks || []).forEach(t => {
        const d = String(t.division_id || 'general');
        if (!map[d]) map[d] = { id: d, name: t.division_name || d, items: [] };
        map[d].items.push(t);
    });
    return map;
}

function renderTimelineByDivision(tasks, readOnly) {
    if (!tasks || !tasks.length) return `<div class="text-muted text-center py-6"><i class="fas fa-inbox mr-1"></i> Belum ada task di plan ini.</div>`;
    const sorted = [...tasks].sort((a, b) => (new Date(a.start_time || 0)) - (new Date(b.start_time || 0)));
    const groups = groupTasksByDivision(sorted);
    const order = ['receiving', 'prep', 'cooking', 'kitchen', 'packing', 'driver', 'cleaning', 'security', 'ompreng', 'general'];
    const keys = Object.keys(groups).sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });

    return keys.map(k => {
        const g = groups[k];
        const icon = PROD_DIVISION_ICONS[k] || 'fa-cube';
        const doneCount = g.items.filter(t => String(t.status).toUpperCase() === 'COMPLETED').length;
        const runCount = g.items.filter(t => String(t.status).toUpperCase() === 'IN_PROGRESS').length;

        const items = g.items.map(t => {
            const meta = prodTaskStatusMeta(t.status);
            let actionBtn = '';
            const st = String(t.status || '').toUpperCase();
            if (!readOnly) {
                if (st === 'PENDING' || st === '') {
                    actionBtn = `<button class="btn btn-primary btn-sm" onclick="updateTaskStatus('${t.id}','IN_PROGRESS')" title="Mulai"><i class="fas fa-play"></i></button>`;
                } else if (st === 'IN_PROGRESS') {
                    actionBtn = `<button class="btn btn-success btn-sm" onclick="updateTaskStatus('${t.id}','COMPLETED')" title="Selesai"><i class="fas fa-check"></i></button>`;
                }
            }
            const dur = Number.isFinite(Number(t.duration_minutes)) ? `${Number(t.duration_minutes)}m` : '';
            return `
                <div class="prod-task-card ${meta.cls}">
                    <div class="prod-task-card-body">
                        <div class="prod-task-title">${t.title || 'Tanpa judul'}</div>
                        <div class="prod-task-meta">
                            <span><i class="fas fa-clock fa-xs"></i> ${prodHourMinute(t.start_time)} – ${prodHourMinute(t.end_time)}</span>
                            ${dur ? `<span class="prod-task-sep">·</span><span>${dur}</span>` : ''}
                        </div>
                    </div>
                    <div class="prod-task-actions">
                        <span class="prod-task-badge" style="color:${meta.color};border-color:${meta.color}33;background:${meta.color}14;">${meta.label}</span>
                        ${actionBtn}
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="prod-division-group">
                <div class="prod-division-header">
                    <span class="prod-division-icon"><i class="fas ${icon}"></i></span>
                    <span class="prod-division-name">${g.name}</span>
                    <span class="prod-division-count">${doneCount}/${g.items.length}${runCount ? ` · ${runCount} berjalan` : ''}</span>
                </div>
                <div class="prod-division-tasks">${items}</div>
            </div>`;
    }).join('');
}

function renderBatchRows(batches, readOnly) {
    if (!batches || !batches.length) {
        return `<tr><td colspan="6" class="text-muted text-center py-3">Belum ada batch masak.</td></tr>`;
    }
    return batches.map(b => {
        const st = String(b.status || '').toUpperCase();
        const actBtn = !readOnly && st !== 'COMPLETED'
            ? `<button class="btn btn-success btn-sm" onclick="updateBatchStatus('${b.id}','COMPLETED')" title="Selesaikan batch"><i class="fas fa-check"></i></button>`
            : '';
        return `
            <tr class="${st === 'COMPLETED' ? 'prod-row-done' : ''}">
                <td><strong>${b.menu_name || b.menu_item_id || '-'}</strong><div class="text-xs text-muted">${b.division_name || b.division_id || ''}</div></td>
                <td class="font-mono text-xs">${b.code || ('#' + (b.batch_number || '-'))}</td>
                <td>${Number(b.batch_size || 0).toLocaleString('id-ID')}</td>
                <td class="text-xs">${prodHourMinute(b.start_time)}<div class="text-muted">${prodHourMinute(b.end_time)}</div></td>
                <td>${prodStatusBadge(b.status)}</td>
                <td class="text-right">${actBtn}</td>
            </tr>`;
    }).join('');
}

function detectStatusChanges(tasks, batches) {
    const lastT = window._prodMonitor.lastTaskStatuses || {};
    const lastB = window._prodMonitor.lastBatchStatuses || {};
    const firstRun = Object.keys(lastT).length === 0 && Object.keys(lastB).length === 0;

    (tasks || []).forEach(t => {
        const prev = lastT[t.id];
        const cur = String(t.status || '').toUpperCase();
        if (!firstRun && prev && prev !== cur) {
            if (cur === 'IN_PROGRESS') {
                pushProdEvent('fa-play', 'prod-event-icon--info', `Task dimulai: ${t.title}`, `${t.division_name || t.division_id || ''}`);
            } else if (cur === 'COMPLETED') {
                pushProdEvent('fa-check', 'prod-event-icon--success', `Task selesai: ${t.title}`, `${t.division_name || t.division_id || ''}`);
            } else if (cur === 'CANCELLED') {
                pushProdEvent('fa-ban', 'prod-event-icon--danger', `Task dibatalkan: ${t.title}`, `${t.division_name || t.division_id || ''}`);
            }
        }
        lastT[t.id] = cur;
    });

    (batches || []).forEach(b => {
        const prev = lastB[b.id];
        const cur = String(b.status || '').toUpperCase();
        if (!firstRun && prev && prev !== cur && cur === 'COMPLETED') {
            pushProdEvent('fa-box-check', 'prod-event-icon--success', `Batch selesai: ${b.menu_name || b.menu_item_id || b.code || b.id}`, `Size ${b.batch_size || '-'}`);
        }
        lastB[b.id] = cur;
    });

    window._prodMonitor.lastTaskStatuses = lastT;
    window._prodMonitor.lastBatchStatuses = lastB;
}

async function updateTaskStatus(id, status) {
    if (status === 'COMPLETED' && !(await confirmUi({ title: 'Selesaikan Task', message: 'Tandai task ini selesai?' }))) return;
    try {
        await api(`/api/tasks/${id}/status`, 'PUT', { status });
        await loadOrderStatusV2();
    } catch (e) { notifyUi('danger', 'Task', e.message); }
}

async function updateBatchStatus(id, status) {
    if (!(await confirmUi({ title: 'Selesaikan Batch', message: 'Tandai batch ini selesai?' }))) return;
    try {
        await api(`/api/batches/${id}/status`, 'PUT', { status });
        await loadOrderStatusV2();
    } catch (e) { notifyUi('danger', 'Batch', e.message); }
}

// ─── Kitchen Config ─────────────────────────────────────────────────────────

async function openKitchenDocConfig() {
    try {
        const cfg = await api('/api/kitchen/config');
        openModalUi({
            title: 'Konfigurasi Kop SPPG',
            bodyHtml: `
                <div class="form-grid">
                    <p class="text-sm text-muted form-full mb-2">Pengaturan lengkap (logo, ID SPPG, tagline): buka <strong>Setup Dapur → Profil SPPG</strong>.</p>
                    <div class="form-full">
                        <label class="input-label">Nama Kitchen (Kop SPPG)</label>
                        <input id="f_kitchen_name" class="input-field" value="${String(cfg.kitchen_name || cfg.name || '').replace(/"/g, '&quot;')}" placeholder="Contoh: SPPG MBG - Kecamatan ..." />
                    </div>
                    <div class="form-full">
                        <label class="input-label">Alamat</label>
                        <input id="f_kitchen_address" class="input-field" value="${String(cfg.address || '').replace(/"/g, '&quot;')}" placeholder="Alamat lengkap" />
                    </div>
                    <div>
                        <label class="input-label">Kontak (HP)</label>
                        <input id="f_kitchen_phone" class="input-field" value="${String(cfg.contact_phone || cfg.contact || '').replace(/"/g, '&quot;')}" placeholder="08xxxxxxxxxx" />
                    </div>
                    <div>
                        <label class="input-label">Email</label>
                        <input id="f_kitchen_email" class="input-field" value="${String(cfg.contact_email || '').replace(/"/g, '&quot;')}" placeholder="email@domain.com" />
                    </div>
                    <div class="form-full">
                        <label class="input-label">Logo (Data URL)</label>
                        <input id="f_kitchen_logo" class="input-field" value="${String(cfg.logo_data_url || '').replace(/"/g, '&quot;')}" placeholder="data:image/png;base64,..." />
                    </div>
                </div>
            `,
            actions: [
                { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setModalError('');
                        const next = { ...(cfg || {}) };
                        next.kitchen_name = document.getElementById('f_kitchen_name').value.trim();
                        next.address = document.getElementById('f_kitchen_address').value.trim();
                        next.contact_phone = document.getElementById('f_kitchen_phone').value.trim();
                        next.contact_email = document.getElementById('f_kitchen_email').value.trim();
                        next.logo_data_url = document.getElementById('f_kitchen_logo').value.trim();
                        await api('/api/kitchen/config', 'PUT', next);
                        closeModalUi();
                        notifyUi('success', 'Kitchen Config', 'Tersimpan');
                    } catch (e) { setModalError(e.message || 'Gagal simpan'); }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Kitchen Config', 'Gagal buka config: ' + e.message);
    }
}

async function openProductionSettings() {
    try {
        const prep = await api('/api/kitchen/config/prep').catch(() => ({}));
        const packing = await api('/api/kitchen/config/packing').catch(() => ({}));
        const scheduler = await api('/api/kitchen/config/scheduler').catch(() => ({}));

        const rates = (packing.packaging_rates && typeof packing.packaging_rates === 'object') ? packing.packaging_rates : {};
        const getSec = (k, fallback) => {
            const v = rates[k] && rates[k].seconds_per_portion != null ? Number(rates[k].seconds_per_portion) : fallback;
            return Number.isFinite(v) ? v : fallback;
        };

        openModalUi({
            title: 'Pengaturan Produksi (Scheduler)',
            bodyHtml: `
                <div class="form-grid">
                    <div class="form-full"><div class="font-bold mb-2">Scheduler</div></div>
                    <div><label class="input-label">Cooling (menit)</label><input id="cfg_cooling" type="number" class="input-field" min="0" step="1" value="${Number(scheduler.cooling_minutes || 0)}" /></div>
                    <div><label class="input-label">Buffer antar proses (menit)</label><input id="cfg_buffer" type="number" class="input-field" min="0" step="1" value="${Number(scheduler.buffer_minutes ?? 10)}" /></div>
                    <div><label class="input-label">Driver/Loading (menit)</label><input id="cfg_driver" type="number" class="input-field" min="0" step="1" value="${Number(scheduler.driver_minutes || 30)}" /></div>
                    <div class="form-full mt-2"><div class="font-bold mb-2">Manpower</div></div>
                    <div><label class="input-label">Prep worker count</label><input id="cfg_prep_workers" type="number" class="input-field" min="1" step="1" value="${Number(prep.worker_count || prep.prepper_count || 1)}" /></div>
                    <div><label class="input-label">Packer count</label><input id="cfg_packers" type="number" class="input-field" min="1" step="1" value="${Number(packing.packer_count || 1)}" /></div>
                    <div class="form-full mt-2"><div class="font-bold mb-2">Packing Rate (detik/porsi)</div></div>
                    <div><label class="input-label">Default</label><input id="cfg_pack_default" type="number" class="input-field" min="1" step="1" value="${Number(packing.seconds_per_portion || 15)}" /></div>
                    <div><label class="input-label">Ompreng</label><input id="cfg_pack_ompreng" type="number" class="input-field" min="1" step="1" value="${getSec('ompreng', Number(packing.seconds_per_portion || 15))}" /></div>
                    <div><label class="input-label">Plastik</label><input id="cfg_pack_plastik" type="number" class="input-field" min="1" step="1" value="${getSec('plastik', Number(packing.seconds_per_portion || 15))}" /></div>
                </div>
            `,
            actions: [
                { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setModalError('');
                        const nextScheduler = { ...(scheduler || {}),
                            cooling_minutes: Number(document.getElementById('cfg_cooling').value || 0),
                            buffer_minutes: Number(document.getElementById('cfg_buffer').value || 0),
                            driver_minutes: Number(document.getElementById('cfg_driver').value || 0)
                        };
                        const nextPrep = { ...(prep || {}), worker_count: Number(document.getElementById('cfg_prep_workers').value || 1) };
                        const secDefault = Math.max(1, Number(document.getElementById('cfg_pack_default').value || 15));
                        const nextPacking = { ...(packing || {}),
                            packer_count: Number(document.getElementById('cfg_packers').value || 1),
                            seconds_per_portion: secDefault,
                            packaging_rates: { ...(packing.packaging_rates || {}),
                                ompreng: { seconds_per_portion: Math.max(1, Number(document.getElementById('cfg_pack_ompreng').value || secDefault)) },
                                plastik: { seconds_per_portion: Math.max(1, Number(document.getElementById('cfg_pack_plastik').value || secDefault)) },
                            }
                        };
                        await api('/api/kitchen/config/scheduler', 'POST', nextScheduler);
                        await api('/api/kitchen/config/prep', 'POST', nextPrep);
                        await api('/api/kitchen/config/packing', 'POST', nextPacking);
                        closeModalUi();
                        notifyUi('success', 'Pengaturan', 'Tersimpan');
                    } catch (e) { setModalError(e.message || 'Gagal simpan'); }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Pengaturan Produksi', 'Gagal membuka pengaturan: ' + e.message);
    }
}

// ─── Equipment ──────────────────────────────────────────────────────────────

async function loadEquipment() {
    const tbody = document.getElementById('equip-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api('/api/kitchen/equipment');
        const html = (rows || []).map(e => `<tr>
            <td>${e.name || '-'}</td>
            <td>${e.type || '-'}</td>
            <td>${e.status || '-'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteEquipment('${e.id}')">Hapus</button></td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="4" class="text-muted">Belum ada equipment</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Gagal load equipment: ${e.message}</td></tr>`;
    }
}

async function openEquipmentModal() {
    openModalUi({
        title: 'Tambah Equipment',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full"><label class="input-label">Nama Alat</label><input id="f_eq_name" class="input-field" placeholder="Contoh: Kompor A, Oven 1" /></div>
                <div><label class="input-label">Tipe</label>
                    <select id="f_eq_type" class="input-field">
                        <option value="STOVE">Kompor (Stove)</option>
                        <option value="OVEN">Oven</option>
                        <option value="STEAMER">Steamer</option>
                        <option value="FRYER">Fryer</option>
                        <option value="OTHER">Lainnya</option>
                    </select>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const name = document.getElementById('f_eq_name').value.trim();
                    const type = document.getElementById('f_eq_type').value;
                    await api('/api/kitchen/equipment', 'POST', { name, type, status: 'READY' });
                    closeModalUi();
                    notifyUi('success', 'Equipment', 'Tersimpan');
                    await loadEquipment();
                } catch (e) { setModalError(e.message || 'Gagal simpan'); }
            } }
        ]
    });
}

async function deleteEquipment(id) {
    if (!await confirmUi({ title: 'Hapus Equipment', message: 'Hapus alat ini?', danger: true })) return;
    try {
        await api(`/api/kitchen/equipment/${id}`, 'DELETE');
        await loadEquipment();
    } catch (e) { notifyUi('danger', 'Equipment', e.message); }
}

// ─── Document helpers ───────────────────────────────────────────────────────

async function generatePlanDocs() {
    const id = window._activePlanId;
    if (!id) return notifyUi('warning', 'Dokumen Produksi', 'Pilih plan dulu');
    try {
        const v = await api(`/api/plans/${encodeURIComponent(id)}/docs/validate`, 'POST', {});
        const errs = (v && v.errors) ? v.errors : [];
        if (errs.length) {
            const list = errs.map(e => `<li>${e.message}</li>`).join('');
            notifyUi('danger', 'Dokumen', `Validasi gagal: ${list}`);
            return;
        }
        await api(`/api/plans/${encodeURIComponent(id)}/docs/generate`, 'POST', {});
        notifyUi('success', 'Dokumen Produksi', 'Generate berhasil');
    } catch (e) {
        notifyUi('danger', 'Dokumen', e.message || 'Gagal generate');
    }
}

async function downloadPlanDoc(docType, format) {
    const id = window._activePlanId;
    if (!id) return notifyUi('warning', 'Dokumen', 'Pilih plan dulu');
    await downloadPlanDocById(id, docType, format);
}

window.closePlanMonitor = closePlanMonitor;
window.stopMonitorOrder = stopMonitorOrder;

async function downloadPlanDocById(planId, docType, format) {
    const url = `/api/plans/${encodeURIComponent(planId)}/docs/${encodeURIComponent(docType)}/${encodeURIComponent(format)}`;
    const filename = `${String(planId).slice(0, 8)}-${docType}.${format}`;
    try {
        const headers = {};
        if (SESSION.token) headers['Authorization'] = 'Bearer ' + SESSION.token;
        if (SESSION.tenant_id) headers['x-tenant-id'] = SESSION.tenant_id;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
        notifyUi('danger', 'Download', 'Gagal: ' + (e.message || 'Error'));
    }
}

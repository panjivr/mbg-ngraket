
// Dashboard — SPPG operational overview (V2)

window._dashState = window._dashState || { timer: null };

function dashGreeting() {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

function dashFormatRp(n) {
    if (typeof formatRp === 'function') return formatRp(n);
    const num = Number(n || 0);
    if (!Number.isFinite(num)) return 'Rp 0';
    return 'Rp ' + num.toLocaleString('id-ID');
}

function dashFormatDelivery(iso) {
    if (!iso) return '<span class="text-muted">-</span>';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '<span class="text-muted">-</span>';
        const today = new Date();
        const sameDay = d.toDateString() === today.toDateString();
        const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        return sameDay
            ? `<span class="text-sm"><strong class="text-warning">Hari ini</strong> ${time}</span>`
            : `<span class="text-sm">${date} <span class="text-muted">${time}</span></span>`;
    } catch (e) { return '<span class="text-muted">-</span>'; }
}

function dashStatusBadge(status) {
    if (typeof prodStatusBadge === 'function') return prodStatusBadge(status);
    return `<span class="prod-badge prod-badge--muted">${status || '-'}</span>`;
}

function dashRenderHero() {
    const greet = document.getElementById('dash-hero-greeting');
    const dateEl = document.getElementById('dash-hero-date');
    if (greet) {
        const user = window.currentUser || window.SESSION || {};
        const name = user.name || user.user_name || '';
        greet.textContent = name ? `${dashGreeting()}, ${name}` : dashGreeting();
    }
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }
}

function dashSetKpi(id, value, noteId, note) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
    if (noteId && note != null) {
        const n = document.getElementById(noteId);
        if (n) n.textContent = note;
    }
}

async function loadDashboard() {
    dashRenderHero();

    if (window._dashState.timer) clearInterval(window._dashState.timer);
    window._dashState.timer = setInterval(() => {
        const view = document.getElementById('view-dashboard-sppg');
        if (view && !view.classList.contains('hidden')) {
            loadDashboardSilent();
        }
    }, 60000);

    await loadDashboardSilent();
}

async function loadDashboardSilent() {
    const results = await Promise.allSettled([
        api('/api/dashboard/stats'),
        api('/api/finance/summary').catch(() => ({})),
        api('/api/plans').catch(() => []),
        api('/api/tasks').catch(() => [])
    ]);

    const stats   = results[0].status === 'fulfilled' ? (results[0].value || {}) : null;
    const finance = results[1].status === 'fulfilled' ? (results[1].value || {}) : {};
    const plans   = results[2].status === 'fulfilled' ? (Array.isArray(results[2].value) ? results[2].value : []) : [];
    const tasks   = results[3].status === 'fulfilled' ? (Array.isArray(results[3].value) ? results[3].value : []) : [];

    if (stats) {
        dashSetKpi('dash-today-production', Number(stats.today_production || 0).toLocaleString('id-ID'), 'dash-today-production-note', 'Total porsi dari batch hari ini');
        dashSetKpi('dash-low-stock',        Number(stats.low_stock_items || 0).toLocaleString('id-ID'), 'dash-low-stock-note',        'Item di bawah threshold 50');
        dashSetKpi('dash-active-batches',   Number(stats.active_batches || 0).toLocaleString('id-ID'),  'dash-active-batches-note',   'Batch aktif (end_time > now)');
    } else {
        dashSetKpi('dash-today-production', '-', 'dash-today-production-note', 'Gagal load statistik');
        dashSetKpi('dash-low-stock',        '-', 'dash-low-stock-note',        'Gagal load statistik');
        dashSetKpi('dash-active-batches',   '-', 'dash-active-batches-note',   'Gagal load statistik');
    }

    if (finance && Number.isFinite(Number(finance.avg_cost_per_portion))) {
        dashSetKpi('dash-avg-cost', dashFormatRp(finance.avg_cost_per_portion), 'dash-avg-cost-note', 'Rata-rata dari plan aktif');
    } else {
        dashSetKpi('dash-avg-cost', '-', 'dash-avg-cost-note', 'Finance summary tidak tersedia');
    }

    const tasksRunning = tasks.filter(t => String(t.status || '').toUpperCase() === 'IN_PROGRESS').length;
    const tasksPending = tasks.filter(t => {
        const s = String(t.status || '').toUpperCase();
        return s === 'PENDING' || s === '' || s === 'OPEN';
    }).length;
    dashSetKpi('dash-mini-plans',          plans.length.toLocaleString('id-ID'));
    dashSetKpi('dash-mini-tasks-running',  tasksRunning.toLocaleString('id-ID'));
    dashSetKpi('dash-mini-tasks-pending',  tasksPending.toLocaleString('id-ID'));
    dashSetKpi('dash-mini-expenses',       stats ? dashFormatRp(stats.month_expenses || 0) : '-');

    dashRenderPlans(plans);
    dashRenderTasks(tasks);
}

function dashRenderPlans(plans) {
    const tbody = document.getElementById('dash-plans-rows');
    const note  = document.getElementById('dash-plans-note');
    if (!tbody) return;

    const active = (plans || [])
        .filter(p => !['COMPLETED', 'CANCELLED', 'DRAFT'].includes(String(p.status || '').toUpperCase()))
        .sort((a, b) => {
            const ta = a.target_delivery_time ? new Date(a.target_delivery_time).getTime() : Infinity;
            const tb = b.target_delivery_time ? new Date(b.target_delivery_time).getTime() : Infinity;
            return ta - tb;
        })
        .slice(0, 5);

    if (!active.length) {
        tbody.innerHTML = `
            <tr><td colspan="5" class="text-muted text-center py-4">
                <i class="fas fa-inbox mr-1"></i> Belum ada plan aktif. Buat lewat
                <a href="#" onclick="switchView('prod-draft'); return false;" class="text-primary">War Room</a>.
            </td></tr>`;
        if (note) note.textContent = 'Belum ada plan aktif.';
        return;
    }

    if (note) note.textContent = `${active.length} plan aktif (sort: delivery terdekat)`;

    tbody.innerHTML = active.map(p => {
        const code = p.code || String(p.id || '').slice(0, 8);
        const batches = Number(p.stats?.batches || 0);
        const tasks = Number(p.stats?.tasks || 0);
        return `<tr>
            <td>
                <div class="font-mono text-sm">${code}</div>
                <div class="text-xs text-muted">${batches} batch · ${tasks} task</div>
            </td>
            <td><strong>${Number(p.target_portions || 0).toLocaleString('id-ID')}</strong> <span class="text-xs text-muted">porsi</span></td>
            <td>${dashFormatDelivery(p.target_delivery_time)}</td>
            <td>${dashStatusBadge(p.status)}</td>
            <td class="text-right">
                <button class="btn btn-primary btn-sm" onclick="dashOpenPlan('${p.id}')" title="Monitor plan ini">
                    <i class="fas fa-desktop"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

window.dashOpenPlan = function(planId) {
    try {
        if (typeof switchView === 'function') switchView('prod-plan');
        setTimeout(() => { if (typeof startMonitorOrder === 'function') startMonitorOrder(planId); }, 250);
    } catch (e) {
        if (typeof notifyUi === 'function') notifyUi('danger', 'Dashboard', 'Gagal buka plan: ' + e.message);
    }
};

function dashTaskIconForDivision(divId) {
    const icons = { receiving: 'fa-box-open', prep: 'fa-carrot', cooking: 'fa-fire', kitchen: 'fa-fire', packing: 'fa-box', driver: 'fa-truck', cleaning: 'fa-broom', security: 'fa-shield-alt', ompreng: 'fa-utensils' };
    return icons[String(divId || '').toLowerCase()] || 'fa-tasks';
}

function dashRenderTasks(tasks) {
    const container = document.getElementById('dash-tasks-rows');
    const note = document.getElementById('dash-tasks-note');
    if (!container) return;

    const pending = (tasks || [])
        .filter(t => {
            const s = String(t.status || '').toUpperCase();
            return !['DONE', 'COMPLETED', 'CANCELLED'].includes(s);
        })
        .sort((a, b) => {
            const ra = String(a.status || '').toUpperCase() === 'IN_PROGRESS' ? 0 : 1;
            const rb = String(b.status || '').toUpperCase() === 'IN_PROGRESS' ? 0 : 1;
            if (ra !== rb) return ra - rb;
            const ta = a.start_time ? new Date(a.start_time).getTime() : Infinity;
            const tb = b.start_time ? new Date(b.start_time).getTime() : Infinity;
            return ta - tb;
        })
        .slice(0, 8);

    if (!pending.length) {
        container.innerHTML = `<div class="dash-empty-state">
            <i class="fas fa-check-circle text-success" style="font-size:2rem;"></i>
            <div class="mt-2 text-muted">Tidak ada task pending. Semua selesai!</div>
        </div>`;
        if (note) note.textContent = 'Semua task selesai.';
        return;
    }

    if (note) note.textContent = `${pending.length} task terdekat (max 8 ditampilkan)`;

    container.innerHTML = pending.map(t => {
        const st = String(t.status || '').toUpperCase();
        const icon = dashTaskIconForDivision(t.division_id);
        let actionBtn = '';
        if (st === 'PENDING' || st === '') {
            actionBtn = `<button class="btn btn-primary btn-sm" onclick="dashSetTaskStatus('${t.id}','IN_PROGRESS')" title="Mulai"><i class="fas fa-play"></i></button>`;
        } else if (st === 'IN_PROGRESS') {
            actionBtn = `<button class="btn btn-success btn-sm" onclick="dashSetTaskStatus('${t.id}','COMPLETED')" title="Selesai"><i class="fas fa-check"></i></button>`;
        }
        const timeStr = t.start_time ? new Date(t.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
        return `
            <div class="dash-task-item dash-task-${st.toLowerCase() || 'pending'}">
                <div class="dash-task-icon"><i class="fas ${icon}"></i></div>
                <div class="dash-task-body">
                    <div class="dash-task-title">${t.title || 'Tanpa judul'}</div>
                    <div class="dash-task-meta">
                        <span>${t.division_name || t.division_id || 'Umum'}</span>
                        ${timeStr ? `<span class="prod-task-sep">·</span><span><i class="fas fa-clock fa-xs"></i> ${timeStr}</span>` : ''}
                        <span class="prod-task-sep">·</span>
                        ${dashStatusBadge(st)}
                    </div>
                </div>
                <div class="dash-task-action">${actionBtn}</div>
            </div>`;
    }).join('');
}

window.dashSetTaskStatus = async function(id, status) {
    try {
        if (status === 'COMPLETED' && typeof confirmUi === 'function') {
            const ok = await confirmUi({ title: 'Selesaikan Task', message: 'Tandai task ini selesai?' });
            if (!ok) return;
        }
        await api(`/api/tasks/${id}/status`, 'PUT', { status });
        await loadDashboardSilent();
    } catch (e) {
        if (typeof notifyUi === 'function') notifyUi('danger', 'Task', e.message);
    }
};

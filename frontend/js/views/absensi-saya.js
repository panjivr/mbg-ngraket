// ─── Absensi Saya — Self-service attendance for Asisten Lapangan & Admin ───
// Data disimpan di localStorage (offline-first) dan dicoba sync ke backend

function _absKey() {
    const tid = (SESSION && SESSION.tenant_id) ? SESSION.tenant_id : 'default';
    return `absensi_saya_${tid}`;
}

function _absGetAll() {
    try { return JSON.parse(localStorage.getItem(_absKey()) || '[]'); } catch (e) { return []; }
}

function _absSave(list) {
    localStorage.setItem(_absKey(), JSON.stringify(list || []));
}

function _absToday() {
    return new Date().toISOString().slice(0, 10);
}

function _absNow() {
    return new Date().toISOString();
}

function _absFmtTime(iso) {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { return iso; }
}

function _absFmtDate(ymd) {
    if (!ymd) return '-';
    try {
        const d = new Date(ymd + 'T00:00:00');
        return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return ymd; }
}

function _absTodayEvents() {
    const today = _absToday();
    return _absGetAll().filter(e => e.date === today);
}

function _absLastNDays(n) {
    const all = _absGetAll();
    const result = {};
    all.forEach(e => {
        if (!result[e.date]) result[e.date] = [];
        result[e.date].push(e);
    });
    const days = [];
    for (let i = 0; i < n; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ymd = d.toISOString().slice(0, 10);
        days.push({ date: ymd, events: result[ymd] || [] });
    }
    return days;
}

function _absStatusBadge(todayEvts) {
    const hasIn  = todayEvts.some(e => e.type === 'CLOCK_IN');
    const hasOut = todayEvts.some(e => e.type === 'CLOCK_OUT');
    if (hasIn && hasOut) return `<span class="badge badge-success">Hadir — Sudah Clock Out</span>`;
    if (hasIn)           return `<span class="badge badge-warning">Hadir — Belum Clock Out</span>`;
    return `<span class="badge badge-muted">Belum Absen</span>`;
}

function _absTypeLabel(type) {
    const map = { CLOCK_IN: 'Clock In', CLOCK_OUT: 'Clock Out', BREAK_START: 'Mulai Istirahat', BREAK_END: 'Selesai Istirahat' };
    return map[type] || type;
}

function _absTypeIcon(type) {
    const map = { CLOCK_IN: 'fa-play text-success', CLOCK_OUT: 'fa-stop text-danger', BREAK_START: 'fa-coffee text-warning', BREAK_END: 'fa-mug-hot text-info' };
    return map[type] || 'fa-circle';
}

// ─── Backend sync attempt ───
async function _absSyncToBackend(evt) {
    try {
        // Cari staff record yang sesuai dengan user saat ini
        const staffList = await api('/api/staff');
        const userName = (SESSION && SESSION.name) ? SESSION.name.toLowerCase().trim() : '';
        const match = (staffList || []).find(s => String(s.name || '').toLowerCase().trim() === userName);
        if (!match) return; // Tidak ada staff record — tidak bisa sync

        await api('/api/attendance/events', 'POST', {
            staff_id: match.id,
            event_type: evt.type,
            occurred_at: evt.timestamp,
            division_id: match.division_id || null,
            notes: evt.notes || ''
        });

        // Tandai sudah tersync
        const list = _absGetAll();
        const idx = list.findIndex(e => e.id === evt.id);
        if (idx >= 0) { list[idx].synced = true; _absSave(list); }
    } catch (e) {
        // Sync gagal — data tetap tersimpan di localStorage
    }
}

// ─── Actions ───
async function absensiDoEvent(type) {
    const todayEvts = _absTodayEvents();

    if (type === 'CLOCK_IN' && todayEvts.some(e => e.type === 'CLOCK_IN')) {
        return notifyUi('warning', 'Sudah Clock In', 'Anda sudah melakukan clock in hari ini.');
    }
    if (type === 'CLOCK_OUT' && !todayEvts.some(e => e.type === 'CLOCK_IN')) {
        return notifyUi('warning', 'Belum Clock In', 'Lakukan clock in terlebih dahulu sebelum clock out.');
    }
    if (type === 'CLOCK_OUT' && todayEvts.some(e => e.type === 'CLOCK_OUT')) {
        return notifyUi('warning', 'Sudah Clock Out', 'Anda sudah melakukan clock out hari ini.');
    }

    const evt = {
        id: `abs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_email: (SESSION && SESSION.email) || '',
        user_name: (SESSION && SESSION.name) || '',
        date: _absToday(),
        type: type,
        timestamp: _absNow(),
        synced: false,
        notes: ''
    };

    const list = _absGetAll();
    list.push(evt);
    _absSave(list);

    notifyUi('success', _absTypeLabel(type), `Berhasil dicatat pada ${_absFmtTime(evt.timestamp)}`);
    _absSyncToBackend(evt); // fire and forget
    _absRender();
}

// ─── Render ───
function _absRender() {
    const container = document.getElementById('absensi-saya-container');
    if (!container) return;

    const todayEvts = _absTodayEvents();
    const today = _absToday();
    const userName = (SESSION && SESSION.name) ? SESSION.name : '-';
    const userRole = (SESSION && SESSION.role) ? SESSION.role : '-';
    const roleCfg = (typeof ROLES_CONFIG !== 'undefined' && ROLES_CONFIG[userRole]) ? ROLES_CONFIG[userRole] : null;
    const roleLabel = roleCfg ? roleCfg.label : userRole;

    const clockInEvt  = todayEvts.find(e => e.type === 'CLOCK_IN');
    const clockOutEvt = todayEvts.find(e => e.type === 'CLOCK_OUT');

    // Today events table
    const todayRows = todayEvts.length > 0
        ? todayEvts.map(e => `
            <tr>
                <td><i class="fas ${_absTypeIcon(e.type)} mr-1"></i> ${_absTypeLabel(e.type)}</td>
                <td class="font-bold">${_absFmtTime(e.timestamp)}</td>
                <td>${e.synced ? '<span class="badge badge-success" style="font-size:0.7rem;">Tersync</span>' : '<span class="badge badge-muted" style="font-size:0.7rem;">Lokal</span>'}</td>
            </tr>`).join('')
        : `<tr><td colspan="3" class="text-muted text-center">Belum ada aktivitas absensi hari ini</td></tr>`;

    // Last 7 days summary
    const histRows = _absLastNDays(7).map(({ date, events }) => {
        const inEvt  = events.find(e => e.type === 'CLOCK_IN');
        const outEvt = events.find(e => e.type === 'CLOCK_OUT');
        const isToday = date === today;
        let status = '';
        if (inEvt && outEvt)  status = '<span class="badge badge-success">Hadir</span>';
        else if (inEvt)       status = '<span class="badge badge-warning">Partial</span>';
        else                  status = '<span class="badge badge-muted">-</span>';

        return `<tr ${isToday ? 'style="font-weight:600;"' : ''}>
            <td>${isToday ? '<span class="text-primary">Hari ini</span>' : _absFmtDate(date)}</td>
            <td>${inEvt ? _absFmtTime(inEvt.timestamp) : '-'}</td>
            <td>${outEvt ? _absFmtTime(outEvt.timestamp) : '-'}</td>
            <td>${status}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-2xl font-bold">Absensi Saya</h2>
                <p class="text-muted text-sm mt-1">${_absFmtDate(today)}</p>
            </div>
            <div class="text-right">
                <div class="font-bold">${userName}</div>
                <div class="text-muted text-sm">${roleLabel}</div>
            </div>
        </div>

        <!-- Status Card -->
        <div class="card mb-4" style="border-left: 4px solid var(--accent);">
            <div class="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <div class="text-sm text-muted mb-1">Status Kehadiran Hari Ini</div>
                    ${_absStatusBadge(todayEvts)}
                </div>
                <div class="flex gap-2 flex-wrap">
                    <div class="text-sm">
                        <span class="text-muted">Clock In:</span>
                        <span class="font-bold ml-1">${clockInEvt ? _absFmtTime(clockInEvt.timestamp) : '-'}</span>
                    </div>
                    <div class="text-sm">
                        <span class="text-muted">Clock Out:</span>
                        <span class="font-bold ml-1">${clockOutEvt ? _absFmtTime(clockOutEvt.timestamp) : '-'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid-cols-2 gap-3 mb-4" style="display:grid;">
            <button class="btn btn-primary" style="padding:1rem;" onclick="absensiDoEvent('CLOCK_IN')">
                <i class="fas fa-play mr-2"></i><strong>Clock In</strong>
                <div class="text-xs mt-1 opacity-80">Mulai kerja</div>
            </button>
            <button class="btn btn-secondary" style="padding:1rem;" onclick="absensiDoEvent('CLOCK_OUT')">
                <i class="fas fa-stop mr-2"></i><strong>Clock Out</strong>
                <div class="text-xs mt-1 opacity-80">Selesai kerja</div>
            </button>
            <button class="btn btn-secondary" style="padding:0.75rem;" onclick="absensiDoEvent('BREAK_START')">
                <i class="fas fa-coffee mr-2"></i> Mulai Istirahat
            </button>
            <button class="btn btn-secondary" style="padding:0.75rem;" onclick="absensiDoEvent('BREAK_END')">
                <i class="fas fa-mug-hot mr-2"></i> Selesai Istirahat
            </button>
        </div>

        <!-- Today's Activity -->
        <div class="card mb-4">
            <div class="flex justify-between items-center mb-3">
                <div class="font-bold">Aktivitas Hari Ini</div>
                <button class="btn btn-secondary btn-sm" onclick="_absRender()">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>
            <div class="table-responsive">
                <table class="nutri-table w-full">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Waktu</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${todayRows}</tbody>
                </table>
            </div>
        </div>

        <!-- 7-Day History -->
        <div class="card">
            <div class="font-bold mb-3">Riwayat 7 Hari Terakhir</div>
            <div class="table-responsive">
                <table class="nutri-table w-full">
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${histRows}</tbody>
                </table>
            </div>
        </div>

        <div class="mt-4 p-3 card text-sm text-muted" style="border-left: 3px solid var(--border);">
            <i class="fas fa-info-circle mr-1"></i>
            Data absensi tersimpan di perangkat ini. Jika profil Anda terhubung ke data staff, absensi akan otomatis tersinkronisasi ke server.
        </div>
    `;
}

function loadAbsensiSaya() {
    _absRender();
}

window.loadAbsensiSaya   = loadAbsensiSaya;
window.absensiDoEvent    = absensiDoEvent;
window._absRender        = _absRender;

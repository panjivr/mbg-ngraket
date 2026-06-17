let HR_STATE = {
    tab: 'staff',
    selectedPayrollPeriodId: null,
    staff: [],
    shifts: [],
    compensation: [],
    payrollPeriods: [],
    attendanceRecapRows: [],
    divisions: [],
    divisionNameById: {},
    staffFilters: {
        keyword: '',
        role: '',
        division_id: '',
    }
};

/** Muat daftar divisi dari Setup Dapur dan cache di HR_STATE. */
async function ensureHrDivisions(force = false) {
    try {
        if (!force && Array.isArray(HR_STATE.divisions) && HR_STATE.divisions.length) return HR_STATE.divisions;
        const cfg = await api('/api/kitchen/config');
        const list = Array.isArray(cfg?.divisions) ? cfg.divisions : [];
        HR_STATE.divisions = list;
        HR_STATE.divisionNameById = {};
        for (const d of list) {
            if (!d || !d.id) continue;
            HR_STATE.divisionNameById[String(d.id).toLowerCase()] = String(d.name || d.id);
        }
        return list;
    } catch (e) {
        return HR_STATE.divisions || [];
    }
}

/** Konversi id divisi ke nama canonical (mengikuti Setup Dapur). Fallback ke id jika tidak ada. */
function divisionNameFor(divisionId) {
    const raw = String(divisionId == null ? '' : divisionId).trim();
    if (!raw) return '-';
    const key = raw.toLowerCase();
    const name = HR_STATE.divisionNameById && HR_STATE.divisionNameById[key];
    return name ? name : raw;
}

function todayYmd() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function openHrProgressModal(title, subtitle) {
    const startedAt = Date.now();
    openModalUi({
        title: title || 'Memproses...',
        bodyHtml: `
            <div class="text-center" style="padding: 0.25rem 0;">
                <div style="font-size:2rem; color: var(--primary); margin-bottom:0.35rem;">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="text-sm">${subtitle || 'Mohon tunggu, proses sedang berjalan.'}</div>
                <div id="hr-progress-elapsed" class="text-xs text-muted mt-2">0 detik</div>
            </div>
        `,
        actions: []
    });
    const tmr = setInterval(() => {
        const el = document.getElementById('hr-progress-elapsed');
        if (!el) return;
        const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        el.textContent = `${sec} detik`;
    }, 1000);
    return () => {
        try { clearInterval(tmr); } catch (e) {}
        closeModalUi();
    };
}

/** Tanggal hari ini di Asia/Jakarta (selaras dengan server / event). */
function jakartaTodayYmd() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function setValueIfEmpty(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!String(el.value || '').trim()) el.value = value;
}

function addDaysToYmd(ymd, days) {
    const d = new Date(`${String(ymd || '')}T00:00:00`);
    if (!Number.isFinite(d.getTime())) return String(ymd || '');
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
}

function getHrErrorMessage(err, fallback) {
    const raw = String(err?.message || '').trim();
    if (!raw) return fallback || 'Terjadi kesalahan';
    const l = raw.toLowerCase();
    if (l.includes('409') || l.includes('conflict')) {
        return 'Data bentrok dengan data yang sudah ada (kemungkinan kode staff duplikat).';
    }
    if (l.includes('403') || l.includes('forbidden')) {
        return 'Akses ditolak untuk aksi ini.';
    }
    if (l.includes('400') || l.includes('bad request')) {
        return 'Input tidak valid. Periksa kembali data yang diisi.';
    }
    return raw;
}

function generateRandomDigits(len) {
    let res = '';
    for (let i = 0; i < len; i++) res += Math.floor(Math.random() * 10);
    return res;
}

function regenerateFormStaffCode() {
    const el = document.getElementById('f_st_code');
    if (el) el.value = generateRandomDigits(4);
}

function regenerateFormStaffPin() {
    const name = document.getElementById('f_st_name')?.value || '';
    const role = document.getElementById('f_st_role')?.value || 'staff';
    const div = document.getElementById('f_st_div')?.value || '';
    const code = document.getElementById('f_st_code')?.value || '';
    const skills = Array.from(document.querySelectorAll('input[name="skill"]:checked')).map(x => x.value);
    
    // Check which ID we are editing (if any)
    const title = document.getElementById('modal-title')?.textContent || '';
    const isEdit = title.includes('Edit');
    // This is a bit hacky, but we can't easily get the ID from the modal unless we store it.
    // However, for PIN reset in the form, it's safer to just confirm inline.
    
    openModalUi({
        title: 'Konfirmasi Reset PIN Staff',
        bodyHtml: `
            <div class="p-4">
                <p class="mb-4">Apakah Anda yakin ingin melakukan reset PIN untuk staff ini?</p>
                <p class="text-sm text-muted mb-4">PIN baru akan ditampilkan di form, Anda harus menekan "Simpan" untuk menyimpannya secara permanen.</p>
                <label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" id="reset_staff_pin_check" style="width:20px; height:20px;" onchange="(document.getElementById('btn_staff_reset_confirm')||{}).disabled = !this.checked">
                    <span class="font-medium">Saya yakin ingin mereset PIN</span>
                </label>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => {
                // Return to form (needs original data)
                // Since we don't have the ID, we'll store it before opening.
                openStaffForm(window._CURRENT_STAFF_ID, { name, role, division_id: div, staff_code: code, skills });
            } },
            { 
                id: 'btn_staff_reset_confirm',
                label: 'Reset Sekarang', 
                className: 'btn btn-primary btn-sm',
                disabled: true,
                onClick: () => {
                   const newPin = generateRandomDigits(6);
                   notifyUi('success', 'Reset PIN', 'PIN baru telah dibuat. Jangan lupa tekan Simpan.');
                   openStaffForm(window._CURRENT_STAFF_ID, { name, role, division_id: div, staff_code: code, skills, pin: newPin });
                }
            }
        ]
    });
}

window.regenerateFormStaffCode = regenerateFormStaffCode;
window.regenerateFormStaffPin = regenerateFormStaffPin;

function toIsoFromDatetimeLocal(v) {
    const raw = String(v || '').trim();
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
}

function ensureAttendanceEventDateRangeDefaults(forceReset = false) {
    const fromEl = document.getElementById('evt_from');
    const toEl = document.getElementById('evt_to');
    if (!fromEl || !toEl) return;
    const ymd = jakartaTodayYmd();
    const defaultFrom = `${ymd}T00:00`;
    const defaultTo = `${ymd}T23:59`;
    if (forceReset || !String(fromEl.value || '').trim()) fromEl.value = defaultFrom;
    if (forceReset || !String(toEl.value || '').trim()) toEl.value = defaultTo;
}

function setAttendanceEventsTodayRange() {
    ensureAttendanceEventDateRangeDefaults(true);
    loadAttendanceEvents();
}

function renderOptions(selectEl, options, { allowEmpty = true, emptyLabel = 'Semua' } = {}) {
    if (!selectEl) return;
    const list = [];
    if (allowEmpty) list.push(`<option value="">${emptyLabel}</option>`);
    options.forEach(o => {
        list.push(`<option value="${o.value}">${o.label}</option>`);
    });
    selectEl.innerHTML = list.join('');
}

/**
 * Normalisasi role sesi pengguna ke key canonical (client-side best effort).
 * Harus selaras dengan `normalizeRoleKey` di server.js, tapi di sini kita hanya
 * perlu tahu apakah user = kepala_sppg atau bukan untuk memutuskan UI.
 */
function hrCurrentRoleKey() {
    try {
        const raw = String((window.SESSION && window.SESSION.role) || localStorage.getItem('app_role') || '').trim().toLowerCase();
        if (!raw) return '';
        return raw.replace(/[\s-]+/g, '_');
    } catch (e) { return ''; }
}

/**
 * Manajemen User Pengelola hanya boleh diakses Kepala SPPG (tenant owner login
 * via /auth/login, atau sub-user dengan role 'kepala_sppg'). Tenant registration
 * (pendaftaran SPPG baru) di-handle developer, dan akun kepala_sppg pertama
 * dibuat otomatis dari data pendaftaran tenant.
 */
function hrCanManagePortalUsers() {
    return hrCurrentRoleKey() === 'kepala_sppg';
}

/**
 * Terapkan visibility tab berdasarkan role. Dipanggil saat modul HR init dan
 * saat user berpindah tab, agar tab "User Pengelola" hanya muncul untuk
 * kepala_sppg. Juga fallback: kalau user tidak berhak tapi tab sedang aktif,
 * paksa pindah ke tab default.
 */
function applyHrRoleGate() {
    const canManage = hrCanManagePortalUsers();
    try {
        const tabs = document.querySelectorAll('#hr-tab-list .tab-item[data-requires-role]');
        tabs.forEach(el => {
            const required = String(el.getAttribute('data-requires-role') || '').toLowerCase();
            const ok = required === 'kepala_sppg' ? canManage : true;
            el.classList.toggle('hidden', !ok);
        });
    } catch (e) {}
    try {
        const panel = document.getElementById('hr-panel-users');
        if (panel && !canManage) panel.classList.add('hidden');
    } catch (e) {}
    if (!canManage && HR_STATE.tab === 'users') {
        HR_STATE.tab = 'staff';
    }
}

async function initHrModule(force = false) {
    try {
        await ensureHrDivisions(force);
        if (force || !HR_STATE.staff.length) {
            HR_STATE.staff = await api('/api/staff');
        }
        if (force || !HR_STATE.shifts.length) {
            HR_STATE.shifts = await api('/api/shifts');
        }
    } catch (e) {}

    // Attendance events default ke rentang hari ini supaya query tetap ringan.
    ensureAttendanceEventDateRangeDefaults(false);

    const staffOptions = (HR_STATE.staff || []).map(s => ({ value: s.id, label: s.name || '-' }));
    renderOptions(document.getElementById('att_staff'), staffOptions, { allowEmpty: true, emptyLabel: 'Semua Staff' });
    renderOptions(document.getElementById('asgn_staff'), staffOptions, { allowEmpty: true, emptyLabel: 'Semua Staff' });
    renderOptions(document.getElementById('evt_staff'), staffOptions, { allowEmpty: true, emptyLabel: 'Semua Staff' });
    renderOptions(document.getElementById('att_recap_staff'), staffOptions, { allowEmpty: true, emptyLabel: 'Semua Staff' });

    await loadAttendancePolicy();

    applyHrRoleGate();
    switchHrTab(HR_STATE.tab || 'staff');
}

async function switchHrTab(tab) {
    let t = String(tab || '').trim() || 'staff';
    if (t === 'division_kpi') t = 'staff';

    // Guard: tab "User Pengelola" hanya untuk Kepala SPPG. Kalau role lain
    // mencoba (misal via console / state tersimpan), fallback ke Staff.
    if (t === 'users' && !hrCanManagePortalUsers()) {
        notifyUi('Hanya Kepala SPPG yang bisa mengakses User Pengelola.', 'warning');
        t = 'staff';
    }
    HR_STATE.tab = t;

    applyHrRoleGate();

    const tabs = document.querySelectorAll('#hr-tab-list .tab-item');
    tabs.forEach(el => {
        const key = el.getAttribute('data-tab');
        if (key === t) el.classList.add('active');
        else el.classList.remove('active');
    });

    const panels = document.querySelectorAll('#view-staff .hr-panel');
    panels.forEach(p => p.classList.add('hidden'));
    const active = document.getElementById(`hr-panel-${t}`);
    if (active) active.classList.remove('hidden');

    if (t === 'staff') await loadStaff();
    if (t === 'users') await loadPortalUsers();
    if (t === 'shifts') {
        const asgnDateEl = document.getElementById('asgn_date');
        if (asgnDateEl && !String(asgnDateEl.value || '').trim()) {
            asgnDateEl.value = jakartaTodayYmd();
        }
        await loadShifts();
        await loadShiftAssignments();
    }
    if (t === 'attendance') {
        const attDateEl = document.getElementById('att_date');
        if (attDateEl && !String(attDateEl.value || '').trim()) {
            attDateEl.value = jakartaTodayYmd();
        }
        await loadAttendanceDaily();
        await initKitchenGpsMap();
        await loadAttendanceEvents();
    }
    if (t === 'policy') {
        await loadAttendancePolicy();
        await loadAttendanceRecap();
    }
    if (t === 'payroll') {
        await loadCompensation();
        await loadPayrollPeriods();
        await reloadSelectedPayrollItems();
    }
    if (t === 'staff_performance') await loadStaffPerformance();
}

async function loadAttendancePolicy() {
    try {
        const policy = await api('/api/attendance/policy');
        if (document.getElementById('att_policy_work_hours')) document.getElementById('att_policy_work_hours').value = Number(policy?.work_hours_per_day || 8);
        if (document.getElementById('att_policy_overtime_after')) document.getElementById('att_policy_overtime_after').value = Number(policy?.overtime_after_hours || 8);
        if (document.getElementById('att_policy_late_grace')) document.getElementById('att_policy_late_grace').value = Number(policy?.late_grace_minutes || 10);
        if (document.getElementById('att_policy_radius')) document.getElementById('att_policy_radius').value = Number(policy?.max_geo_radius_m || 50);
        if (document.getElementById('att_policy_biweekly_days')) document.getElementById('att_policy_biweekly_days').value = Number(policy?.biweekly_days || 14);

        const cycleEl = document.getElementById('att_recap_cycle');
        const fromEl = document.getElementById('att_recap_from');
        const toEl = document.getElementById('att_recap_to');
        if (cycleEl && !cycleEl.value) cycleEl.value = 'daily';
        if (toEl && !toEl.value) toEl.value = jakartaTodayYmd();
        if (fromEl && !fromEl.value) {
            const cycle = cycleEl ? String(cycleEl.value || 'daily') : 'daily';
            const toYmd = (toEl && toEl.value) ? toEl.value : jakartaTodayYmd();
            const biweekly = Math.max(7, Number(policy?.biweekly_days || 14));
            fromEl.value = cycle === 'biweekly' ? addDaysToYmd(toYmd, -(biweekly - 1)) : toYmd;
        }

        if (cycleEl && !cycleEl.dataset.bindDone) {
            cycleEl.addEventListener('change', () => {
                const c = String(cycleEl.value || 'daily');
                const toYmd = (document.getElementById('att_recap_to') || {}).value || jakartaTodayYmd();
                const bw = Number((document.getElementById('att_policy_biweekly_days') || {}).value || 14);
                const from = c === 'biweekly' ? addDaysToYmd(toYmd, -(Math.max(7, bw) - 1)) : toYmd;
                const fromEl2 = document.getElementById('att_recap_from');
                if (fromEl2) fromEl2.value = from;
            });
            cycleEl.dataset.bindDone = '1';
        }
    } catch (e) {
        // optional panel
    }
}

async function saveAttendancePolicy() {
    try {
        const payload = {
            work_hours_per_day: Number((document.getElementById('att_policy_work_hours') || {}).value || 8),
            overtime_after_hours: Number((document.getElementById('att_policy_overtime_after') || {}).value || 8),
            late_grace_minutes: Number((document.getElementById('att_policy_late_grace') || {}).value || 10),
            max_geo_radius_m: Number((document.getElementById('att_policy_radius') || {}).value || 50),
            biweekly_days: Number((document.getElementById('att_policy_biweekly_days') || {}).value || 14),
        };
        await api('/api/attendance/policy', 'PUT', payload);
        notifyUi('success', 'Absensi', 'Kebijakan absensi berhasil disimpan');
        await loadAttendancePolicy();
        await loadAttendanceRecap();
    } catch (e) {
        notifyUi('danger', 'Absensi', getHrErrorMessage(e, 'Gagal simpan kebijakan absensi'));
    }
}

async function loadAttendanceRecap() {
    const tbody = document.getElementById('attendance-recap-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="9" class="text-muted">Loading...</td></tr>`;
    try {
        const cycle = String((document.getElementById('att_recap_cycle') || {}).value || 'daily');
        const from_date = String((document.getElementById('att_recap_from') || {}).value || '').trim();
        const to_date = String((document.getElementById('att_recap_to') || {}).value || '').trim();
        const staff_id = String((document.getElementById('att_recap_staff') || {}).value || '').trim();
        const qs = [];
        if (cycle) qs.push(`cycle=${encodeURIComponent(cycle)}`);
        if (from_date) qs.push(`from_date=${encodeURIComponent(from_date)}`);
        if (to_date) qs.push(`to_date=${encodeURIComponent(to_date)}`);
        if (staff_id) qs.push(`staff_id=${encodeURIComponent(staff_id)}`);
        qs.push('include_photos=1');
        const url = `/api/attendance/recap${qs.length ? `?${qs.join('&')}` : ''}`;
        const resp = await api(url);
        const rows = Array.isArray(resp?.rows) ? resp.rows : [];
        HR_STATE.attendanceRecapRows = rows;
        const totalHours = rows.reduce((sum, r) => sum + Number(r?.worked_hours || 0), 0);
        const statRecapHours = document.getElementById('att-stat-recap-hours');
        if (statRecapHours) statRecapHours.textContent = Number(totalHours || 0).toFixed(2);
        const html = rows.map(r => `<tr>
            <td>${r.staff_name || '-'}</td>
            <td>${divisionNameFor(r.division_id)}</td>
            <td>${r.from_date || '-'} s/d ${r.to_date || '-'}</td>
            <td>${Number(r.present_days || 0)}/${Number(r.total_days || 0)}</td>
            <td>${Number(r.worked_hours || 0).toFixed(2)} jam</td>
            <td>${Number(r.overtime_hours || 0).toFixed(2)} jam</td>
            <td>${Number(r.late_minutes || 0)} menit</td>
            <td>${Number(r.avg_worked_hours_per_day || 0).toFixed(2)} jam</td>
            <td>
                ${r.latest_photo
                    ? `<img alt="foto absensi" src="${String(r.latest_photo).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" style="max-height:50px;max-width:68px;border-radius:6px;object-fit:cover;border:1px solid var(--border);cursor:zoom-in" title="Klik untuk lihat detail foto" onclick="openAttendanceRecapPhoto('${r.staff_id}')" />`
                    : '<span class="text-muted">—</span>'}
                <div class="text-xs text-muted">${Number(r.photo_count || 0)} foto</div>
            </td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="9" class="text-muted">Belum ada data rekap</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-muted">Gagal load rekap: ${e.message}</td></tr>`;
    }
}

function openAttendanceRecapPhoto(staffId) {
    const sid = String(staffId || '').trim();
    if (!sid) return;
    const rows = Array.isArray(HR_STATE.attendanceRecapRows) ? HR_STATE.attendanceRecapRows : [];
    const row = rows.find(r => String(r.staff_id || '') === sid);
    if (!row) {
        notifyUi('info', 'Foto Rekap', 'Data foto tidak ditemukan untuk staff ini.');
        return;
    }
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const samples = Array.isArray(row.photo_samples) ? row.photo_samples : [];
    const latestBlock = row.latest_photo
        ? `<div class="mb-3">
            <div class="text-sm text-muted mb-1">Foto terbaru (${esc(formatDateTime(row.latest_photo_at || ''))})</div>
            <img src="${esc(row.latest_photo)}" alt="latest" style="max-width:100%;max-height:50vh;border-radius:8px;border:1px solid var(--border);" />
        </div>`
        : `<div class="text-sm text-muted mb-3">Belum ada foto absensi di periode ini.</div>`;
    const sampleHtml = samples.length
        ? `<div class="grid-dashboard">
            ${samples.map(s => `
                <div class="p-2 border border-border rounded">
                    <div class="text-xs text-muted mb-1">${esc(s.event_type || '-')} • ${esc(formatDateTime(s.occurred_at || ''))}</div>
                    <img src="${esc(s.photo_data_url || '')}" alt="sample" style="width:100%;max-height:180px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
                </div>
            `).join('')}
        </div>`
        : `<div class="text-sm text-muted">Tidak ada sample foto tersimpan.</div>`;
    openModalUi({
        title: `Foto Rekap - ${row.staff_name || row.staff_id || '-'}`,
        bodyHtml: `
            <div class="text-sm mb-3">
                <div><strong>Staff:</strong> ${esc(row.staff_name || '-')}</div>
                <div><strong>Periode:</strong> ${esc(row.from_date || '-')} s/d ${esc(row.to_date || '-')}</div>
                <div><strong>Total Foto:</strong> ${Number(row.photo_count || 0)}</div>
            </div>
            ${latestBlock}
            <div class="font-bold mb-2">Sample Foto Absensi</div>
            ${sampleHtml}
        `,
        actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
    });
}

async function loadStaff() {
    const tbody = document.getElementById('staff-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Loading...</td></tr>`;
    try {
        await ensureHrDivisions(false);
        const rows = await api('/api/staff');
        HR_STATE.staff = rows || [];

        // Load Portal PIN for management
        let portalPin = 'panji123';
        try {
            const conf = await api('/api/kitchen/config');
            portalPin = conf.portal_pin || 'panji123';
        } catch(e) {}

        const roleSet = Array.from(new Set((rows || []).map(r => String(r.role || '').trim()).filter(Boolean))).sort();
        const divisionSet = Array.from(new Set((rows || []).map(r => String(r.division_id || '').trim()).filter(Boolean))).sort();

        const portalPinEl = document.getElementById('staff-portal-pin-value');
        if (portalPinEl) portalPinEl.textContent = portalPin;

        const statTotal = document.getElementById('staff-stat-total');
        const statPinSet = document.getElementById('staff-stat-pin-set');
        const statDiv = document.getElementById('staff-stat-division');
        const statRole = document.getElementById('staff-stat-role');
        if (statTotal) statTotal.textContent = String(rows.length || 0);
        if (statPinSet) statPinSet.textContent = String((rows || []).filter(r => String(r.pin || '').trim()).length);
        if (statDiv) statDiv.textContent = String(divisionSet.length);
        if (statRole) statRole.textContent = String(roleSet.length);

        const roleFilterEl = document.getElementById('staff-filter-role');
        const divisionFilterEl = document.getElementById('staff-filter-division');
        const roleOptions = [`<option value="">Semua Role</option>`]
            .concat(roleSet.map(v => `<option value="${v}">${v}</option>`))
            .join('');
        const divisionOptions = [`<option value="">Semua Divisi</option>`]
            .concat(divisionSet.map(v => `<option value="${v}">${divisionNameFor(v)}</option>`))
            .join('');
        if (roleFilterEl) roleFilterEl.innerHTML = roleOptions;
        if (divisionFilterEl) divisionFilterEl.innerHTML = divisionOptions;

        if (roleFilterEl) roleFilterEl.value = String(HR_STATE.staffFilters.role || '');
        if (divisionFilterEl) divisionFilterEl.value = String(HR_STATE.staffFilters.division_id || '');

        const keywordEl = document.getElementById('staff-filter-keyword');
        if (keywordEl) keywordEl.value = String(HR_STATE.staffFilters.keyword || '');

        if (keywordEl && !keywordEl.dataset.bindDone) {
            keywordEl.addEventListener('input', () => {
                HR_STATE.staffFilters.keyword = String(keywordEl.value || '').trim();
                renderStaffTable();
            });
            keywordEl.dataset.bindDone = '1';
        }
        if (roleFilterEl && !roleFilterEl.dataset.bindDone) {
            roleFilterEl.addEventListener('change', () => {
                HR_STATE.staffFilters.role = String(roleFilterEl.value || '').trim();
                renderStaffTable();
            });
            roleFilterEl.dataset.bindDone = '1';
        }
        if (divisionFilterEl && !divisionFilterEl.dataset.bindDone) {
            divisionFilterEl.addEventListener('change', () => {
                HR_STATE.staffFilters.division_id = String(divisionFilterEl.value || '').trim();
                renderStaffTable();
            });
            divisionFilterEl.dataset.bindDone = '1';
        }

        renderStaffTable();

        const staffOptions = (HR_STATE.staff || []).map(s => ({ value: s.id, label: s.name || '-' }));
        renderOptions(document.getElementById('att_staff'), staffOptions, { allowEmpty: true, emptyLabel: 'Semua Staff' });
        renderOptions(document.getElementById('asgn_staff'), staffOptions, { allowEmpty: true, emptyLabel: 'Semua Staff' });
        renderOptions(document.getElementById('evt_staff'), staffOptions, { allowEmpty: true, emptyLabel: 'Semua Staff' });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Gagal load staff: ${e.message}</td></tr>`;
    }
}

function getFilteredStaffRows() {
    const rows = Array.isArray(HR_STATE.staff) ? HR_STATE.staff : [];
    const keyword = String(HR_STATE.staffFilters.keyword || '').trim().toLowerCase();
    const role = String(HR_STATE.staffFilters.role || '').trim().toLowerCase();
    const division = String(HR_STATE.staffFilters.division_id || '').trim().toLowerCase();

    return rows.filter((r) => {
        const name = String(r.name || '');
        const code = String(r.staff_code || '');
        const rowRole = String(r.role || '');
        const rowDivision = String(r.division_id || '');
        const blob = `${name} ${code} ${rowRole} ${rowDivision}`.toLowerCase();
        if (keyword && !blob.includes(keyword)) return false;
        if (role && rowRole.toLowerCase() !== role) return false;
        if (division && rowDivision.toLowerCase() !== division) return false;
        return true;
    });
}

function renderStaffTable() {
    const tbody = document.getElementById('staff-rows');
    if (!tbody) return;
    const summaryEl = document.getElementById('staff-table-summary');
    const rows = getFilteredStaffRows();
    if (summaryEl) summaryEl.textContent = `${rows.length} data`;
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Belum ada data staff untuk filter ini</td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => {
        const pinSet = String(r.pin || '').trim() ? 'SET' : 'BELUM';
        const pinCls = pinSet === 'SET' ? 'text-success' : 'text-warning';
        return `<tr>
            <td>${r.name || '-'}</td>
            <td><code>${r.staff_code || '-'}</code></td>
            <td>${r.role || '-'}</td>
            <td>${divisionNameFor(r.division_id)}</td>
            <td>${(r.skills || []).join(', ') || '-'}</td>
            <td><span class="${pinCls}">${pinSet}</span></td>
            <td class="flex gap-2" style="flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm" onclick="openStaffEdit('${r.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteStaff('${r.id}')">Hapus</button>
            </td>
        </tr>`;
    }).join('');
}

function resetStaffFilters() {
    HR_STATE.staffFilters = { keyword: '', role: '', division_id: '' };
    const kw = document.getElementById('staff-filter-keyword');
    const rl = document.getElementById('staff-filter-role');
    const dv = document.getElementById('staff-filter-division');
    if (kw) kw.value = '';
    if (rl) rl.value = '';
    if (dv) dv.value = '';
    renderStaffTable();
}

function toCsvEsc(v) {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
    return s;
}

function exportStaffCsv() {
    const rows = getFilteredStaffRows();
    const cols = ['name', 'staff_code', 'role', 'division_id', 'division_name', 'skills', 'pin_status'];
    const lines = [cols.join(',')];
    rows.forEach((r) => {
        const pinStatus = String(r.pin || '').trim() ? 'SET' : 'BELUM';
        const values = [
            r.name || '',
            r.staff_code || '',
            r.role || '',
            r.division_id || '',
            r.division_id ? divisionNameFor(r.division_id) : '',
            Array.isArray(r.skills) ? r.skills.join('|') : '',
            pinStatus,
        ].map(toCsvEsc);
        lines.push(values.join(','));
    });
    const stamp = new Date().toISOString().replaceAll(':', '-');
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notifyUi('success', 'Staff', `Export CSV berhasil (${rows.length} baris)`);
}

async function openStaffForm(id, overrides = null) {
    window._CURRENT_STAFF_ID = id;
    let data = { name: '', role: 'relawan', skills: [], division_id: '', staff_code: '' };
    if (id) {
        try {
            const list = HR_STATE.staff && HR_STATE.staff.length ? HR_STATE.staff : await api('/api/staff');
            data = list.find(x => x.id === id) || data;
        } catch (e) {}
    }
    
    // Apply overrides if returning from a confirmation modal
    if (overrides) {
        data = { ...data, ...overrides };
    }

    let divisionOptionsHtml = `<option value="">Pilih divisi...</option>`;
    try {
        const cfg = await api('/api/kitchen/config');
        const divisions = (cfg && cfg.divisions) ? cfg.divisions : [];
        let htmlParts = [`<option value="">Pilih divisi...</option>`];
        if (!divisions.find(d => String(d.id).toUpperCase() === 'SPPG')) {
            htmlParts.push('<option value="SPPG">SPPG</option>');
        }
        divisionOptionsHtml = htmlParts.concat(divisions.map(d => `<option value="${d.id}">${d.name || d.id}</option>`)).join('');
    } catch (e) {}

    const skills = ['cut', 'wash', 'peel', 'cook', 'pack', 'drive', 'clean'];
    const skillsHtml = skills.map(s => `
        <label class="flex items-center gap-2 text-sm border p-2 rounded cursor-pointer ${data.skills.includes(s) ? 'bg-blue-50 border-blue-200' : ''}">
            <input type="checkbox" name="skill" value="${s}" ${data.skills.includes(s) ? 'checked' : ''}>
            ${s.toUpperCase()}
        </label>
    `).join('');

    openModalUi({
        title: id ? 'Edit Staff' : 'Tambah Staff',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Nama Lengkap</label>
                    <input id="f_st_name" class="input-field" value="${data.name}" placeholder="Nama Staff" />
                </div>
                <div>
                    <label class="input-label">Role Utama <span class="text-xs text-muted">(saat ini: <strong>${data.role || '-'}</strong>)</span></label>
                    <select id="f_st_role" class="input-field">
                        <optgroup label="Portal Pengelola (login email + password)">
                            <option value="kepala_sppg" ${data.role === 'kepala_sppg' ? 'selected' : ''}>Kepala SPPG</option>
                            <option value="asisten_lapangan" ${data.role === 'asisten_lapangan' ? 'selected' : ''}>Asisten Lapangan</option>
                            <option value="ahli_gizi" ${data.role === 'ahli_gizi' ? 'selected' : ''}>Ahli Gizi</option>
                            <option value="akuntan" ${data.role === 'akuntan' ? 'selected' : ''}>Akuntan</option>
                            <option value="yayasan" ${data.role === 'yayasan' ? 'selected' : ''}>Yayasan</option>
                            <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="driver" ${data.role === 'driver' ? 'selected' : ''}>Driver</option>
                        </optgroup>
                        <optgroup label="Portal Relawan (login Kode Staff + PIN / Face)">
                            <option value="koordinator_divisi" ${data.role === 'koordinator_divisi' ? 'selected' : ''}>Koordinator Divisi</option>
                            <option value="relawan" ${data.role === 'relawan' ? 'selected' : ''}>Relawan</option>
                        </optgroup>
                    </select>
                    <div class="text-xs text-muted mt-1">
                        <strong>Koordinator Divisi</strong> dan <strong>Relawan</strong> hanya dapat login melalui
                        <em>Portal Relawan</em> (staff.html) dengan Kode Staff + PIN atau Face Recognition.
                        Role pengelola (Kepala SPPG, Admin, dll.) login dengan email + password di portal pengelola.
                    </div>
                </div>
                <div>
                    <label class="input-label">Divisi Default</label>
                    <select id="f_st_div" class="input-field">${divisionOptionsHtml}</select>
                </div>
                <div>
                    <label class="input-label">Kode Staff</label>
                    <input id="f_st_code" class="input-field" value="${data.staff_code || (id ? '' : generateRandomDigits(4))}" placeholder="contoh: 1001 atau AZIS4906" />
                </div>
                <div class="form-full">
                    <label class="input-label">PIN (untuk login staff)</label>
                    <div class="flex gap-2">
                        <input id="f_st_pin" class="input-field" value="${data.pin || (id ? '' : generateRandomDigits(6))}" placeholder="Isi untuk set/reset PIN" />
                        <button class="btn btn-secondary btn-sm" onclick="regenerateFormStaffPin()" title="Generate Acak"><i class="fas fa-sync-alt"></i></button>
                    </div>
                    <div class="text-xs text-muted mt-1">Isi kolom ini jika ingin mengubah/set PIN. Jika tidak ingin mengubah, biarkan seperti semula.</div>
                </div>
                <div class="form-full">
                    <label class="input-label mb-2">Keahlian (Skills)</label>
                    <div class="grid grid-cols-3 gap-2">
                        ${skillsHtml}
                    </div>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const nameEl = document.getElementById('f_st_name');
                    const roleEl = document.getElementById('f_st_role');
                    const divEl = document.getElementById('f_st_div');
                    const codeEl = document.getElementById('f_st_code');
                    const pinEl = document.getElementById('f_st_pin');
                    if (!nameEl || !roleEl) {
                        return setModalError('Form tidak lengkap (element hilang). Tutup modal dan coba lagi.');
                    }
                    const name = (nameEl.value || '').trim();
                    const role = roleEl.value || 'staff';
                    const division_id = divEl ? (divEl.value || '') : '';
                    const staff_code = codeEl ? (codeEl.value || '').trim() : '';
                    const pin = pinEl ? (pinEl.value || '').trim() : '';
                    const skills = Array.from(document.querySelectorAll('input[name="skill"]:checked')).map(x => x.value);
                    if (!name) return setModalError('Nama wajib diisi');
                    // Accept alphanumeric codes (with optional `-`/`_`), 3-16 chars.
                    // Existing data already uses mixed codes like "AZIS4906", so a
                    // pure-digit rule would block every legacy record on save.
                    if (staff_code && !/^[A-Za-z0-9_-]{3,16}$/.test(staff_code)) {
                        return setModalError('Kode staff 3-16 karakter, hanya huruf, angka, tanda - atau _');
                    }
                    if (pin && !/^\d{4,8}$/.test(pin)) {
                        return setModalError('PIN harus 4-8 digit angka.');
                    }
                    const payload = { name, role, skills, division_id, staff_code };
                    if (pin) payload.pin = pin;
                    if (id) await api(`/api/staff/${id}`, 'PUT', payload);
                    else await api('/api/staff', 'POST', payload);
                    const msg = id ? 'Update staff berhasil di simpan' : 'Staff berhasil disimpan';
                    notifyUi('success', 'Staff', msg);
                    closeModalUi();
                    try { await initHrModule(true); } catch (reloadErr) { console.warn('[Staff] reload HR after save failed', reloadErr); }
                } catch (e) {
                    console.error('[Staff] save failed', {
                        id,
                        status: e?.status || null,
                        message: e?.message || String(e),
                        data: e?.data || e?.body || null
                    });
                    setModalError(getHrErrorMessage(e, 'Gagal simpan staff'));
                }
            } }
        ]
    });

    try {
        const sel = document.getElementById('f_st_div');
        if (sel) sel.value = data.division_id || '';
    } catch (e) {}
}

async function openStaffCreate() { await openStaffForm(null); }
async function openStaffEdit(id) { await openStaffForm(id); }

async function savePortalPin(pin) {
    try {
        const conf = await api('/api/kitchen/config');
        conf.portal_pin = pin;
        await api('/api/kitchen/config', 'PUT', conf);
        notifyUi('success', 'Portal', 'PIN Pendaftaran berhasil diperbarui');
        await initHrModule(true);
    } catch(e) {
        notifyUi('danger', 'Error', e.message);
    }
}

function confirmResetPin() {
    openModalUi({
        title: 'Konfirmasi Reset PIN',
        bodyHtml: `
            <div class="p-4">
                <p class="mb-4">Apakah Anda yakin ingin melakukan reset PIN pendaftaran portal?</p>
                <p class="text-sm text-muted mb-4">PIN baru akan dibuat secara acak dan langsung tersimpan.</p>
                <label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" id="reset_pin_check" style="width:20px; height:20px;" onchange="(document.getElementById('btn_reset_confirm')||{}).disabled = !this.checked">
                    <span class="font-medium">Saya yakin ingin mereset PIN</span>
                </label>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { 
                id: 'btn_reset_confirm',
                label: 'Reset Sekarang', 
                className: 'btn btn-danger btn-sm', 
                disabled: true,
                onClick: async () => {
                    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
                    closeModalUi();
                    await savePortalPin(newPin);
                } 
            }
        ]
    });
}

async function deleteStaff(id) {
    if (!await confirmUi('Hapus Staff?', 'Data staff akan dihapus permanen.')) return;
    try {
        await api(`/api/staff/${id}`, 'DELETE');
        notifyUi('success', 'Staff', 'Terhapus');
        await initHrModule(true);
    } catch (e) {
        notifyUi('danger', 'Error', e.message);
    }
}

async function loadShifts() {
    const container = document.getElementById('shifts-container');
    if (!container) return;
    container.innerHTML = `<div class="text-muted">Loading shifts...</div>`;
    try {
        const rows = await api('/api/shifts');
        HR_STATE.shifts = rows || [];
        if (!rows.length) {
            container.innerHTML = `<div class="text-center p-4 border border-dashed rounded text-muted">Belum ada shift. <button class="text-primary underline" onclick="openShiftCreate()">Tambah Shift</button></div>`;
            return;
        }
        container.innerHTML = rows.map(r => `
            <div class="card p-3 border mb-2 flex justify-between items-center">
                <div>
                    <div class="font-bold">${r.name}</div>
                    <div class="text-sm text-muted">${r.start_time} - ${r.end_time} • ${String(r.division_id || 'all').toLowerCase() === 'all' ? 'Semua Divisi' : divisionNameFor(r.division_id)}</div>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-secondary btn-sm" onclick="openShiftEdit('${r.id}')"><i class="fas fa-edit"></i></button>
                    <button class="text-red-500 hover:text-red-700 p-2" onclick="deleteShift('${r.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<div class="text-red-500">Error: ${e.message}</div>`;
    }
}

async function openShiftForm(id) {
    let data = { name: '', start_time: '07:00', end_time: '15:00', division_id: 'all' };
    if (id) {
        try {
            const list = HR_STATE.shifts && HR_STATE.shifts.length ? HR_STATE.shifts : await api('/api/shifts');
            data = list.find(x => x.id === id) || data;
        } catch (e) {}
    }

    let divisionOptionsHtml = `<option value="all">Semua Divisi</option>`;
    try {
        const cfg = await api('/api/kitchen/config');
        const divisions = (cfg && cfg.divisions) ? cfg.divisions : [];
        let htmlParts = [`<option value="all" ${data.division_id === 'all' ? 'selected' : ''}>Semua Divisi</option>`];
        
        // Ensure SPPG is always an option if not in DB config (compatibility with register page)
        if (!divisions.find(d => String(d.id).toUpperCase() === 'SPPG')) {
            htmlParts.push(`<option value="SPPG" ${data.division_id === 'SPPG' ? 'selected' : ''}>SPPG</option>`);
        }
        
        divisionOptionsHtml = htmlParts.concat(divisions.map(d => 
            `<option value="${d.id}" ${data.division_id === d.id ? 'selected' : ''}>${d.name || d.id}</option>`
        )).join('');
    } catch (e) {}

    openModalUi({
        title: id ? 'Edit Shift' : 'Tambah Shift',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Nama Shift</label>
                    <input id="f_sh_name" class="input-field" value="${data.name}" placeholder="Shift Pagi" />
                </div>
                <div>
                    <label class="input-label">Jam Mulai</label>
                    <input id="f_sh_start" type="time" class="input-field" value="${data.start_time}" />
                </div>
                <div>
                    <label class="input-label">Jam Selesai</label>
                    <input id="f_sh_end" type="time" class="input-field" value="${data.end_time}" />
                </div>
                <div class="form-full">
                    <label class="input-label">Divisi</label>
                    <select id="f_sh_div" class="input-field">${divisionOptionsHtml}</select>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const name = document.getElementById('f_sh_name').value.trim();
                    const start_time = document.getElementById('f_sh_start').value;
                    const end_time = document.getElementById('f_sh_end').value;
                    const division_id = document.getElementById('f_sh_div').value;
                    if (!name) return setModalError('Nama shift wajib diisi');
                    if (!start_time || !end_time) return setModalError('Jam mulai dan jam selesai wajib diisi');
                    if (start_time === end_time) return setModalError('Jam mulai dan selesai tidak boleh sama');
                    const payload = { name, start_time, end_time, division_id };
                    if (id) await api(`/api/shifts/${id}`, 'PUT', payload);
                    else await api('/api/shifts', 'POST', payload);
                    closeModalUi();
                    notifyUi('success', 'Shift', 'Berhasil disimpan');
                    await initHrModule(true);
                    await loadShifts();
                } catch (e) {
                    setModalError(getHrErrorMessage(e, 'Gagal simpan shift'));
                }
            } }
        ]
    });
}

async function openShiftCreate() { await openShiftForm(null); }
async function openShiftEdit(id) { await openShiftForm(id); }
async function deleteShift(id) {
    if (!await confirmUi('Hapus Shift?', 'Permanen.')) return;
    try {
        await api(`/api/shifts/${id}`, 'DELETE');
        notifyUi('success', 'Shift', 'Terhapus');
        await initHrModule(true);
        await loadShifts();
    } catch (e) {
        notifyUi('danger', 'Error', e.message);
    }
}

function resetAttendanceFilters() {
    const d = document.getElementById('att_date');
    if (d) d.value = jakartaTodayYmd();
    const s = document.getElementById('att_staff');
    if (s) s.value = '';
}

/** Format ISO timestamp ke "HH:mm" di zona Asia/Jakarta. Return '-' bila kosong/invalid. */
function formatJakartaClockTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    try {
        return new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(d);
    } catch (e) {
        return '-';
    }
}

/** Format total menit ke "Xj Ym" (misal 495 -> "8j 15m"). 0/undefined -> "0j 0m". */
function formatMinutesAsHoursMinutes(minutes) {
    const total = Math.max(0, Math.floor(Number(minutes) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}j ${m}m`;
}

async function loadAttendanceDaily() {
    const tbody = document.getElementById('attendance-daily-rows');
    if (!tbody) return;
    const colspan = 11;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-muted">Loading...</td></tr>`;
    try {
        const date = (document.getElementById('att_date') && document.getElementById('att_date').value) ? document.getElementById('att_date').value : '';
        const staffId = (document.getElementById('att_staff') && document.getElementById('att_staff').value) ? document.getElementById('att_staff').value : '';
        let url = '/api/attendance/daily';
        const qs = [];
        if (date) qs.push(`work_date=${encodeURIComponent(date)}`);
        if (staffId) qs.push(`staff_id=${encodeURIComponent(staffId)}`);
        if (qs.length) url += `?${qs.join('&')}`;
        const resp = await api(url);
        const list = Array.isArray(resp)
            ? resp
            : (Array.isArray(resp?.rows) ? resp.rows : (Array.isArray(resp?.items) ? resp.items : []));
        const statDaily = document.getElementById('att-stat-daily-rows');
        if (statDaily) statDaily.textContent = String(list.length || 0);
        const html = list.map(r => {
            const clockIn = formatJakartaClockTime(r.clock_in_at);
            const clockOut = formatJakartaClockTime(r.clock_out_at);
            const worked = formatMinutesAsHoursMinutes(r.minutes_worked);
            const late = formatMinutesAsHoursMinutes(r.late_minutes);
            const overtime = formatMinutesAsHoursMinutes(r.overtime_minutes);
            return `<tr>
                <td>${r.work_date || '-'}</td>
                <td>${r.staff_name || '-'}</td>
                <td>${r.shift_name || '-'}</td>
                <td>${clockIn}</td>
                <td>${clockOut}</td>
                <td>${worked}</td>
                <td>${late}</td>
                <td>${overtime}</td>
                <td>${r.status || '-'}</td>
                <td>${r.note || ''}</td>
                <td><button class="btn btn-secondary btn-sm" onclick="openAttendanceDailyEdit('${r.staff_id}','${r.work_date}')">Edit</button></td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="${colspan}" class="text-muted">Belum ada data</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-muted">Gagal load absensi: ${e.message}</td></tr>`;
    }
}

async function openAttendanceDailyCreate() {
    await openAttendanceDailyForm(null, null);
}

/** Perbarui absensi harian untuk hari ini (Jakarta) dari Attendance Events yang sudah punya staff_id. */
async function recomputeAttendanceTodayFromEvents() {
    try {
        const ymd = jakartaTodayYmd();
        const attDate = document.getElementById('att_date');
        if (attDate && !String(attDate.value || '').trim()) attDate.value = ymd;
        const staffId = (document.getElementById('att_staff') && document.getElementById('att_staff').value)
            ? document.getElementById('att_staff').value
            : '';
        const r = await api('/api/attendance/recompute', 'POST', {
            from_date: ymd,
            to_date: ymd,
            staff_id: staffId || null,
        });
        notifyUi(
            'success',
            'Absensi',
            `Absensi ${r.from_date || ymd} diperbarui dari event: ${r.updated_days || 0} kombinasi staff/hari (${r.skipped_days || 0} dilewati).`
        );
        await loadAttendanceDaily();
        await loadStaffPerformance();
    } catch (e) {
        notifyUi('danger', 'Absensi', getHrErrorMessage(e, 'Gagal perbarui absensi hari ini'));
    }
}

async function openAttendanceRecompute() {
    const staffList = HR_STATE.staff && HR_STATE.staff.length ? HR_STATE.staff : await api('/api/staff');
    const baseDate = (document.getElementById('att_date') && document.getElementById('att_date').value) ? document.getElementById('att_date').value : jakartaTodayYmd();
    const staffOptions = [`<option value="">Semua Staff</option>`].concat(staffList.map(s => `<option value="${s.id}">${s.name || '-'}</option>`)).join('');

    openModalUi({
        title: 'Recompute Absensi dari Events',
        bodyHtml: `
            <div class="text-sm text-muted mb-3">Menghitung ulang minutes_worked dari event CLOCK_IN/CLOCK_OUT dan BREAK (hanya event yang sudah terpasang ke staff).</div>
            <div class="form-grid">
                <div>
                    <label class="input-label">Dari</label>
                    <input id="f_rc_from" class="input-field" type="date" value="${baseDate}" />
                </div>
                <div>
                    <label class="input-label">Sampai</label>
                    <input id="f_rc_to" class="input-field" type="date" value="${baseDate}" />
                </div>
                <div class="form-full">
                    <label class="input-label">Staff</label>
                    <select id="f_rc_staff" class="input-field">${staffOptions}</select>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Jalankan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const from_date = document.getElementById('f_rc_from').value;
                    const to_date = document.getElementById('f_rc_to').value;
                    const staff_id = document.getElementById('f_rc_staff').value || null;
                    if (!from_date || !to_date) return setModalError('Tanggal wajib diisi');
                    const r = await api('/api/attendance/recompute', 'POST', { from_date, to_date, staff_id });
                    closeModalUi();
                    notifyUi('success', 'Absensi', `Recompute selesai. Updated: ${r.updated_days || 0}, Skipped: ${r.skipped_days || 0}`);
                    await loadAttendanceDaily();
                    await loadStaffPerformance();
                } catch (e) {
                    setModalError(e.message || 'Gagal recompute');
                }
            } }
        ]
    });
}

async function openAttendanceDailyEdit(staffId, workDate) {
    await openAttendanceDailyForm(staffId, workDate);
}

async function openAttendanceDailyForm(staffId, workDate) {
    const staffList = HR_STATE.staff && HR_STATE.staff.length ? HR_STATE.staff : await api('/api/staff');
    const shiftList = HR_STATE.shifts && HR_STATE.shifts.length ? HR_STATE.shifts : await api('/api/shifts');

    const staffOptions = staffList.map(s => `<option value="${s.id}" ${String(staffId) === String(s.id) ? 'selected' : ''}>${s.name || '-'}</option>`).join('');
    const shiftOptions = [`<option value="">(Tidak ada)</option>`].concat(shiftList.map(sh => `<option value="${sh.id}">${sh.name} (${sh.start_time}-${sh.end_time})</option>`)).join('');
    const d = workDate || (document.getElementById('att_date') && document.getElementById('att_date').value) || todayYmd();

    openModalUi({
        title: 'Input Absensi Harian',
        bodyHtml: `
            <div class="form-grid">
                <div>
                    <label class="input-label">Tanggal</label>
                    <input id="f_ad_date" class="input-field" type="date" value="${d}" />
                </div>
                <div>
                    <label class="input-label">Staff</label>
                    <select id="f_ad_staff" class="input-field">${staffOptions}</select>
                </div>
                <div class="form-full">
                    <label class="input-label">Shift</label>
                    <select id="f_ad_shift" class="input-field">${shiftOptions}</select>
                </div>
                <div>
                    <label class="input-label">Minutes Worked</label>
                    <input id="f_ad_minutes" class="input-field" type="number" min="0" step="1" placeholder="0" />
                </div>
                <div>
                    <label class="input-label">Late Minutes</label>
                    <input id="f_ad_late" class="input-field" type="number" min="0" step="1" placeholder="0" />
                </div>
                <div>
                    <label class="input-label">Overtime Minutes</label>
                    <input id="f_ad_ot" class="input-field" type="number" min="0" step="1" placeholder="0" />
                </div>
                <div>
                    <label class="input-label">Status</label>
                    <select id="f_ad_status" class="input-field">
                        <option value="PRESENT">PRESENT</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="SICK">SICK</option>
                        <option value="LEAVE">LEAVE</option>
                    </select>
                </div>
                <div class="form-full">
                    <label class="input-label">Catatan</label>
                    <input id="f_ad_note" class="input-field" placeholder="Opsional" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const work_date = document.getElementById('f_ad_date').value;
                    const staff_id = document.getElementById('f_ad_staff').value;
                    const shift_id = document.getElementById('f_ad_shift').value || null;
                    const minutes_worked = Number(document.getElementById('f_ad_minutes').value || 0);
                    const late_minutes = Number(document.getElementById('f_ad_late').value || 0);
                    const overtime_minutes = Number(document.getElementById('f_ad_ot').value || 0);
                    const status = document.getElementById('f_ad_status').value;
                    const note = document.getElementById('f_ad_note').value.trim();
                    if (!work_date) return setModalError('Tanggal wajib diisi');
                    if (!staff_id) return setModalError('Staff wajib dipilih');
                    await api('/api/attendance/daily', 'POST', {
                        staff_id,
                        work_date,
                        shift_id,
                        minutes_worked,
                        late_minutes,
                        overtime_minutes,
                        status,
                        note,
                    });
                    closeModalUi();
                    notifyUi('success', 'Absensi', 'Berhasil disimpan');
                    await loadAttendanceDaily();
                    await loadStaffPerformance();
                } catch (e) {
                    setModalError(e.message || 'Gagal simpan');
                }
            } }
        ]
    });
}

async function loadShiftAssignments() {
    const tbody = document.getElementById('assignments-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Loading...</td></tr>`;
    try {
        await ensureHrDivisions(false);
        const asgnDateEl = document.getElementById('asgn_date');
        if (asgnDateEl && !String(asgnDateEl.value || '').trim()) {
            asgnDateEl.value = jakartaTodayYmd();
        }
        const date = String(asgnDateEl ? asgnDateEl.value : '').trim() || jakartaTodayYmd();
        const staffId = (document.getElementById('asgn_staff') && document.getElementById('asgn_staff').value) ? document.getElementById('asgn_staff').value : '';
        const qs = [`work_date=${encodeURIComponent(date)}`];
        if (staffId) qs.push(`staff_id=${encodeURIComponent(staffId)}`);
        const resp = await api(`/api/attendance/assignments/effective?${qs.join('&')}`);
        const rows = Array.isArray(resp?.rows) ? resp.rows : [];
        const summary = resp?.summary || { total: rows.length, auto: 0, override: 0, missing_shift: 0 };

        const statAsgn = document.getElementById('att-stat-assignment-rows');
        if (statAsgn) statAsgn.textContent = String(summary.total || rows.length || 0);

        const summaryEl = document.getElementById('assignments-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `Tanggal <strong>${date}</strong> &middot; ${summary.total} staff &middot; `
                + `Otomatis dari divisi: <strong>${summary.auto}</strong> &middot; `
                + `Override manual: <strong>${summary.override}</strong> &middot; `
                + `Belum ada shift: <strong>${summary.missing_shift}</strong>`;
        }

        const html = rows.map(r => {
            const shiftLabel = r.shift_name
                ? `${r.shift_name} <span class="text-xs text-muted">(${r.start_time || '-'} - ${r.end_time || '-'})</span>`
                : '<span class="text-danger">Belum ada shift untuk divisi ini</span>';
            let sourceLabel;
            let action;
            if (r.source === 'override') {
                sourceLabel = '<span class="badge badge-warning">Override</span>';
                action = `
                    <button class="btn btn-secondary btn-sm" onclick="openAssignmentEdit('${r.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="resetShiftAssignment('${r.id}')" title="Kembali ke default divisi">Reset</button>
                `;
            } else if (r.source === 'auto') {
                sourceLabel = '<span class="badge badge-info">Otomatis (divisi)</span>';
                action = `<button class="btn btn-secondary btn-sm" onclick="openAssignmentCreateFor('${r.staff_id}','${date}')">Override</button>`;
            } else {
                sourceLabel = '<span class="badge badge-danger">Tidak terjadwal</span>';
                action = `<button class="btn btn-secondary btn-sm" onclick="openAssignmentCreateFor('${r.staff_id}','${date}')">Set Shift</button>`;
            }
            return `<tr>
                <td>${r.staff_name || '-'}</td>
                <td>${divisionNameFor(r.division_id)}</td>
                <td>${shiftLabel}</td>
                <td>${sourceLabel}</td>
                <td class="flex gap-2" style="flex-wrap:wrap">${action}</td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="5" class="text-muted">Belum ada staff untuk tenant ini</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Gagal load assignment: ${e.message}</td></tr>`;
    }
}

async function resetShiftAssignment(assignmentId) {
    if (!await confirmUi('Reset ke default divisi?', 'Override manual untuk staff ini akan dihapus. Shift efektif akan kembali mengikuti divisi staff.')) return;
    try {
        await api(`/api/attendance/assignments/${encodeURIComponent(assignmentId)}`, 'DELETE');
        notifyUi('success', 'Shift Assignment', 'Override dihapus. Kembali ke default divisi.');
        await loadShiftAssignments();
    } catch (e) {
        notifyUi('danger', 'Shift Assignment', getHrErrorMessage(e, 'Gagal reset override'));
    }
}

async function openAssignmentCreateFor(staffId, workDate) {
    await openAssignmentForm(null, { staff_id: staffId || '', work_date: workDate || '' });
}

async function openAssignmentCreate() {
    await openAssignmentForm(null);
}

async function openAssignmentEdit(id) {
    await openAssignmentForm(id);
}

async function openAssignmentForm(id, preset = null) {
    const staffList = HR_STATE.staff && HR_STATE.staff.length ? HR_STATE.staff : await api('/api/staff');
    const shiftList = HR_STATE.shifts && HR_STATE.shifts.length ? HR_STATE.shifts : await api('/api/shifts');

    const defaultDate = (preset && preset.work_date)
        ? String(preset.work_date)
        : ((document.getElementById('asgn_date') && document.getElementById('asgn_date').value)
            ? document.getElementById('asgn_date').value
            : (typeof jakartaTodayYmd === 'function' ? jakartaTodayYmd() : todayYmd()));
    let current = {
        id: '',
        staff_id: preset && preset.staff_id ? String(preset.staff_id) : '',
        shift_id: '',
        work_date: defaultDate,
    };
    if (id) {
        try {
            const rows = await api(`/api/attendance/assignments?work_date=${encodeURIComponent(defaultDate)}`);
            current = rows.find(x => x.id === id) || current;
        } catch (e) {}
    }

    const staffOptions = staffList.map(s => `<option value="${s.id}" ${(current.staff_id || '') === s.id ? 'selected' : ''}>${s.name || '-'} (${divisionNameFor(s.division_id)})</option>`).join('');
    const shiftOptions = shiftList.map(sh => `<option value="${sh.id}" ${(current.shift_id || '') === sh.id ? 'selected' : ''}>${sh.name} (${sh.start_time}-${sh.end_time}) — ${String(sh.division_id || 'all').toLowerCase() === 'all' ? 'Semua Divisi' : divisionNameFor(sh.division_id)}</option>`).join('');

    openModalUi({
        title: id ? 'Edit Override Shift' : 'Override Shift (manual)',
        bodyHtml: `
            <div class="text-xs text-muted mb-2">
                Override ini hanya berlaku untuk tanggal tertentu. Di luar override, shift staff mengikuti shift default dari divisinya.
            </div>
            <div class="form-grid">
                <div>
                    <label class="input-label">Tanggal</label>
                    <input id="f_as_date" class="input-field" type="date" value="${current.work_date || (typeof jakartaTodayYmd === 'function' ? jakartaTodayYmd() : todayYmd())}" />
                </div>
                <div>
                    <label class="input-label">Staff</label>
                    <select id="f_as_staff" class="input-field">${staffOptions}</select>
                </div>
                <div class="form-full">
                    <label class="input-label">Shift</label>
                    <select id="f_as_shift" class="input-field">${shiftOptions}</select>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const work_date = document.getElementById('f_as_date').value;
                    const staff_id = document.getElementById('f_as_staff').value;
                    const shift_id = document.getElementById('f_as_shift').value;
                    if (!work_date) return setModalError('Tanggal wajib diisi');
                    if (!staff_id) return setModalError('Staff wajib dipilih');
                    if (!shift_id) return setModalError('Shift wajib dipilih');
                    if (id) {
                        await api(`/api/attendance/assignments/${id}`, 'PUT', { work_date, staff_id, shift_id });
                    } else {
                        await api('/api/attendance/assignments', 'POST', { work_date, staff_id, shift_id });
                    }
                    closeModalUi();
                    notifyUi('success', 'Assignment', 'Berhasil disimpan');
                    await loadShiftAssignments();
                } catch (e) {
                    setModalError(e.message || 'Gagal simpan');
                }
            } }
        ]
    });
}

async function deleteAssignment(id) {
    if (!await confirmUi('Hapus Assignment?', 'Permanen.')) return;
    try {
        await api(`/api/attendance/assignments/${id}`, 'DELETE');
        notifyUi('success', 'Assignment', 'Terhapus');
        await loadShiftAssignments();
    } catch (e) {
        notifyUi('danger', 'Error', e.message);
    }
}

// --- Relawan Absensi: GPS dapur (Leaflet) + Analisis Bulk ---
let __kitchenGpsState = {
    map: null,
    marker: null,
    lat: null,
    lng: null,
    ready: false
};

async function initKitchenGpsMap() {
    const el = document.getElementById('kitchen-gps-map');
    if (!el) return;
    if (__kitchenGpsState.ready && __kitchenGpsState.map) return;
    if (typeof L === 'undefined') {
        notifyUi('danger', 'GPS', 'Leaflet belum dimuat.');
        return;
    }

    let cfg = null;
    try { cfg = await api('/api/kitchen/config'); } catch (e) { cfg = null; }

    const p = cfg?.kitchen_gps || cfg?.kitchenGps || cfg?.kitchen?.gps_point || null;
    const lat = p && Number.isFinite(Number(p.latitude)) ? Number(p.latitude) : null;
    const lng = p && Number.isFinite(Number(p.longitude)) ? Number(p.longitude) : null;

    const center = lat != null && lng != null ? [lat, lng] : [0, 0];
    const zoom = lat != null && lng != null ? 16 : 2;

    el.innerHTML = '';
    const map = L.map('kitchen-gps-map').setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    __kitchenGpsState.map = map;
    __kitchenGpsState.lat = lat;
    __kitchenGpsState.lng = lng;

    const latEl = document.getElementById('kitchen_gps_lat');
    const lngEl = document.getElementById('kitchen_gps_lng');
    const pairEl = document.getElementById('kitchen_gps_pair');
    if (latEl && lngEl) {
        latEl.value = lat != null ? String(lat) : '';
        lngEl.value = lng != null ? String(lng) : '';
    }
    if (pairEl) {
        pairEl.value = lat != null && lng != null ? `${lat}, ${lng}` : '';
    }

    if (lat != null && lng != null) {
        __kitchenGpsState.marker = L.marker([lat, lng]).addTo(map);
    }

    map.on('click', (e) => {
        const cLat = e.latlng.lat;
        const cLng = e.latlng.lng;
        __kitchenGpsState.lat = cLat;
        __kitchenGpsState.lng = cLng;

        if (!__kitchenGpsState.marker) __kitchenGpsState.marker = L.marker([cLat, cLng]).addTo(map);
        else __kitchenGpsState.marker.setLatLng([cLat, cLng]);

        if (latEl) latEl.value = String(cLat);
        if (lngEl) lngEl.value = String(cLng);
        if (pairEl) pairEl.value = `${cLat}, ${cLng}`;
    });

    __kitchenGpsState.ready = true;
}

function parseLatLngPair(text) {
    const s = String(text || '').trim();
    if (!s) return null;
    // Extract first two numbers (supports formats like "-6.2, 106.8" or full URLs).
    const nums = [];
    const re = /-?\d+(?:\.\d+)?/g;
    let m;
    while ((m = re.exec(s)) && nums.length < 2) {
        nums.push(Number(m[0]));
    }
    if (nums.length < 2) return null;
    const lat = nums[0];
    const lng = nums[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
}

function setKitchenGpsFromPair() {
    const pairEl = document.getElementById('kitchen_gps_pair');
    const parsed = parseLatLngPair(pairEl ? pairEl.value : '');
    if (!parsed) {
        notifyUi('error', 'GPS', 'Koordinat tidak valid. Contoh: -6.200000, 106.816666');
        return;
    }

    const { lat, lng } = parsed;

    // Update input fields immediately
    const latEl = document.getElementById('kitchen_gps_lat');
    const lngEl = document.getElementById('kitchen_gps_lng');
    if (latEl) latEl.value = String(lat);
    if (lngEl) lngEl.value = String(lng);
    if (pairEl) pairEl.value = `${lat}, ${lng}`;

    // If map is ready, move marker + pan
    if (__kitchenGpsState.ready && __kitchenGpsState.map) {
        __kitchenGpsState.lat = lat;
        __kitchenGpsState.lng = lng;
        if (!__kitchenGpsState.marker) __kitchenGpsState.marker = L.marker([lat, lng]).addTo(__kitchenGpsState.map);
        else __kitchenGpsState.marker.setLatLng([lat, lng]);
        __kitchenGpsState.map.setView([lat, lng], 16);
    } else {
        __kitchenGpsState.lat = lat;
        __kitchenGpsState.lng = lng;
    }
}

async function saveKitchenGpsPoint() {
    const latVal = document.getElementById('kitchen_gps_lat')?.value;
    const lngVal = document.getElementById('kitchen_gps_lng')?.value;
    const lat = Number(latVal);
    const lng = Number(lngVal);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        notifyUi('error', 'GPS', 'Titik GPS dapur belum valid. Isi dengan klik peta atau paste koordinat.');
        return;
    }

    const conf = await api('/api/kitchen/config');
    conf.kitchen_gps = { latitude: lat, longitude: lng };
    await api('/api/kitchen/config', 'PUT', conf);

    notifyUi('success', 'GPS Dapur', 'Titik GPS dapur berhasil disimpan.');
}

async function analyzeRelawanAttendanceBulk(options) {
    const opts = options || {};
    const onlyWajahTidakCocok = !!opts.only_wajah_tidak_cocok;
    const closeProgress = openHrProgressModal(
        onlyWajahTidakCocok ? 'Deteksi Ulang Wajah' : 'Analisis Absen Bulk',
        onlyWajahTidakCocok
            ? 'Sedang mendeteksi ulang event "Wajah tidak cocok"...'
            : 'Sedang menganalisis event absensi relawan...'
    );
    try {
        const evtFromEl = document.getElementById('evt_from');
        const evtToEl = document.getElementById('evt_to');
        const fromIso = toIsoFromDatetimeLocal(evtFromEl && evtFromEl.value);
        const toIso = toIsoFromDatetimeLocal(evtToEl && evtToEl.value);

        const payload = {};
        if (fromIso) payload.from = fromIso;
        if (toIso) payload.to = toIso;
        if (onlyWajahTidakCocok) payload.only_wajah_tidak_cocok = true;

        const result = await api('/api/attendance/events/relawan/analyze-bulk', 'POST', payload);
        if (result && (result.face_api_unreachable === true || result.ok === false)) {
            const hint = result.message || result.error || 'Face API tidak aktif atau tidak terjangkau.';
            const tgt = result.face_api_target ? ` Target: ${result.face_api_target}` : '';
            notifyUi('error', 'Analisis Absen', `${hint}${tgt}`);
            return;
        }
        const mode = onlyWajahTidakCocok ? 'Deteksi ulang (wajah tidak cocok)' : 'Analisis bulk';
        const elig = result?.eligible_in_range != null ? `, dalam filter: ${result.eligible_in_range}` : '';
        const ff = result?.failed_face != null ? `, wajah masih gagal: ${result.failed_face}` : '';
        const up = result?.recognize_upstream_errors > 0
            ? `, error koneksi ke Face API: ${result.recognize_upstream_errors} (biasanya layanan Python port 5000 mati)`
            : '';
        const perf = result?.recognize_calls != null
            ? `, recognize: ${result.recognize_calls}x, cache hit: ${result.recognize_cache_hits || 0}, rata2 ${result.recognize_avg_ms || 0}ms`
            : '';
        notifyUi(
            'success',
            'Analisis Absen',
            `${mode}: diproses ${result?.processed || 0}, diupdate ${result?.updated || 0}${elig}${ff}${up}${perf}.`
        );
        await loadAttendanceEvents();
        await loadAttendanceDaily();
    } catch (e) {
        notifyUi('danger', 'Analisis Absen', e.message || 'Gagal analisis');
    } finally {
        closeProgress();
    }
}

/** Jalankan pengenalan wajah ulang hanya untuk baris ber-catatan "Wajah tidak cocok" (rentang tanggal sama). */
async function analyzeRelawanFaceMismatchRetry() {
    await analyzeRelawanAttendanceBulk({ only_wajah_tidak_cocok: true });
}

async function loadAttendanceEvents(opts = {}) {
    const preserveScroll = !!opts.preserveScroll;
    const highlightEventId = opts.highlightEventId ? String(opts.highlightEventId).trim() : '';
    const mainEl = document.getElementById('main-content');
    let savedScrollTop = null;
    if (preserveScroll && mainEl) savedScrollTop = mainEl.scrollTop;

    const tbody = document.getElementById('attendance-events-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Loading...</td></tr>`;
    try {
        ensureAttendanceEventDateRangeDefaults(false);
        const fromIso = toIsoFromDatetimeLocal(document.getElementById('evt_from') && document.getElementById('evt_from').value);
        const toIso = toIsoFromDatetimeLocal(document.getElementById('evt_to') && document.getElementById('evt_to').value);
        const staffId = (document.getElementById('evt_staff') && document.getElementById('evt_staff').value) ? document.getElementById('evt_staff').value : '';
        let url = '/api/attendance/events';
        const qs = [];
        if (staffId) qs.push(`staff_id=${encodeURIComponent(staffId)}`);
        if (fromIso) qs.push(`from=${encodeURIComponent(fromIso)}`);
        if (toIso) qs.push(`to=${encodeURIComponent(toIso)}`);
        if (qs.length) url += `?${qs.join('&')}`;
        const rows = await api(url);
        const statEvents = document.getElementById('att-stat-event-rows');
        if (statEvents) statEvents.textContent = String((rows || []).length || 0);

        const sortDir = HR_STATE.attendanceEventsSort === 'asc' ? 'asc' : 'desc';
        const safeTime = (iso) => {
            const t = new Date(iso).getTime();
            return Number.isFinite(t) ? t : 0;
        };

        const sortedRows = (rows || []).slice().sort((a, b) => {
            const ta = safeTime(a.occurred_at);
            const tb = safeTime(b.occurred_at);
            return sortDir === 'asc' ? (ta - tb) : (tb - ta);
        });
        HR_STATE.attendanceEventsRows = sortedRows;

        const html = sortedRows.map(r => {
            const m = r.meta_json || {};
            const ph = m.attendance_photo && String(m.attendance_photo).startsWith('data:image') ? String(m.attendance_photo) : '';
            const photo = ph
                ? `<img alt="bukti" src="${ph.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" style="max-height:56px;max-width:72px;border-radius:6px;object-fit:cover;border:1px solid var(--border);cursor:zoom-in" title="Klik untuk perbesar" onclick="openAttendancePhotoPreview('${r.id}')" />`
                : '<span class="text-muted">—</span>';
            const loc = m.location && m.location.latitude != null && m.location.longitude != null
                ? `<span class="text-xs" title="Akurasi ±${m.location.accuracy != null ? Math.round(m.location.accuracy) : '?'} m">${Number(m.location.latitude).toFixed(5)}, ${Number(m.location.longitude).toFixed(5)}</span>`
                : '<span class="text-muted">—</span>';
            const canCorrect = String(r.source || '').toLowerCase() === 'face_portal';
            return `<tr id="attendance-event-row-${r.id}" data-event-id="${r.id}">
            <td>${formatDateTime(r.occurred_at)}</td>
            <td>${r.staff_name || '-'}</td>
            <td>${r.event_type || '-'}</td>
            <td>${r.source || '-'}</td>
            <td>${photo}<div class="mt-1">${loc}</div></td>
            <td>${r.note || ''}</td>
            <td>
                ${canCorrect ? `
                <button class="btn btn-secondary btn-xs mb-1" onclick="openAttendanceEventCorrection('${r.id}')">
                    <i class="fas fa-user-check"></i> Koreksi
                </button><br/>` : ''}
                <button class="btn btn-danger btn-xs" onclick="deleteAttendanceEvent('${r.id}')">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </td>
        </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="7" class="text-muted">Belum ada event</td></tr>`;

        const restoreScrollAndHighlight = () => {
            if (savedScrollTop != null && mainEl) mainEl.scrollTop = savedScrollTop;
            if (highlightEventId) {
                const row = document.getElementById(`attendance-event-row-${highlightEventId}`);
                if (row) {
                    row.classList.add('attendance-event-row-highlight');
                    window.setTimeout(() => {
                        try { row.classList.remove('attendance-event-row-highlight'); } catch (e) {}
                    }, 4000);
                }
            }
        };
        requestAnimationFrame(() => requestAnimationFrame(restoreScrollAndHighlight));
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Gagal load events: ${e.message}</td></tr>`;
        if (savedScrollTop != null && mainEl) requestAnimationFrame(() => { mainEl.scrollTop = savedScrollTop; });
    }
}

function toggleAttendanceEventsSort() {
    if (!HR_STATE.attendanceEventsSort) HR_STATE.attendanceEventsSort = 'desc';
    HR_STATE.attendanceEventsSort = HR_STATE.attendanceEventsSort === 'desc' ? 'asc' : 'desc';

    // Optional: show icon/state in header.
    const iconEl = document.getElementById('attendance-events-sort-icon');
    if (iconEl) iconEl.textContent = HR_STATE.attendanceEventsSort === 'asc' ? ' ▲' : ' ▼';

    loadAttendanceEvents();
}

async function deleteAttendanceEvent(id) {
    const eventId = String(id || '').trim();
    if (!eventId) return;
    if (!await confirmUi('Hapus Attendance Event?', 'Event ini akan dihapus permanen. Jika event sudah terhubung ke staff, baris Absensi Harian untuk tanggal tersebut akan dihapus atau dihitung ulang dari event yang tersisa.')) return;
    try {
        await api(`/api/attendance/events/${encodeURIComponent(eventId)}`, 'DELETE');
        notifyUi('success', 'Attendance Events', 'Event terhapus');
        await loadAttendanceEvents();
        await loadAttendanceDaily();
    } catch (e) {
        notifyUi('danger', 'Attendance Events', e.message || 'Gagal menghapus event');
    }
}

function refreshCorrectionStaffOptions() {
    const divisionSel = document.getElementById('f_corr_division');
    const staffSel = document.getElementById('f_corr_staff');
    if (!divisionSel || !staffSel) return;
    const div = String(divisionSel.value || '').trim();
    const staffList = Array.isArray(HR_STATE.staff) ? HR_STATE.staff : [];
    const list = staffList.filter(s => String(s.division_id || '').trim() === div);
    const html = list.map(s => `<option value="${s.id}">${s.name || '-'} (${divisionNameFor(s.division_id)})</option>`).join('');
    staffSel.innerHTML = html || `<option value="">(Tidak ada staff di divisi ini)</option>`;
}

function applyAttendanceEventCorrectionLocally(eventId, { staff_id, division_id, note }) {
    const id = String(eventId || '').trim();
    if (!id) return;
    const idx = (HR_STATE.attendanceEventsRows || []).findIndex(x => String(x?.id || '') === id);
    if (idx < 0) return;
    const staff = (HR_STATE.staff || []).find(s => String(s?.id || '') === String(staff_id || ''));
    const current = HR_STATE.attendanceEventsRows[idx] || {};
    const nextMeta = {
        ...(current.meta_json || {}),
        manual_correction: {
            at: new Date().toISOString(),
            staff_id: String(staff_id || ''),
            division_id: String(division_id || ''),
            staff_name: String(staff?.name || current.staff_name || ''),
        }
    };
    const next = {
        ...current,
        staff_id: String(staff_id || current.staff_id || ''),
        staff_name: String(staff?.name || current.staff_name || '-'),
        note: String(note || current.note || ''),
        meta_json: nextMeta
    };
    HR_STATE.attendanceEventsRows[idx] = next;

    const rowEl = document.getElementById(`attendance-event-row-${id}`);
    if (!rowEl) return;
    const tds = rowEl.querySelectorAll('td');
    if (tds[1]) tds[1].textContent = next.staff_name || '-';
    if (tds[5]) tds[5].textContent = next.note || '';
    rowEl.classList.add('attendance-event-row-highlight');
    window.setTimeout(() => {
        try { rowEl.classList.remove('attendance-event-row-highlight'); } catch (e) {}
    }, 3500);
}

async function openAttendanceEventCorrection(id) {
    const eventId = String(id || '').trim();
    if (!eventId) return;
    const row = (HR_STATE.attendanceEventsRows || []).find(x => String(x.id) === eventId);
    const m = row && row.meta_json ? row.meta_json : {};
    const hasPhoto = !!(m && String(m.attendance_photo || '').startsWith('data:image/'));
    if (!hasPhoto) {
        notifyUi('danger', 'Koreksi Event', 'Foto event tidak tersedia, tidak bisa dijadikan data training.');
        return;
    }
    const staffList = HR_STATE.staff && HR_STATE.staff.length ? HR_STATE.staff : await api('/api/staff');
    HR_STATE.staff = staffList || [];
    const divisions = Array.from(new Set((staffList || []).map(s => String(s.division_id || '').trim()).filter(Boolean))).sort();
    if (!divisions.length) {
        notifyUi('danger', 'Koreksi Event', 'Tidak ada data divisi staff.');
        return;
    }
    const defaultDiv = divisions[0];
    const divisionOptions = divisions.map(d => `<option value="${d}" ${d === defaultDiv ? 'selected' : ''}>${divisionNameFor(d)}</option>`).join('');
    const infoName = row?.staff_name ? String(row.staff_name) : '-';
    const infoNote = row?.note ? String(row.note) : '-';
    openModalUi({
        title: 'Koreksi Event Wajah',
        bodyHtml: `
            <div class="text-sm text-muted mb-3">
                Event ini akan langsung di-overwrite ke staff yang dipilih dan foto event ditambahkan ke galeri staff (maks 5 sampel/staff).
            </div>
            <div class="text-xs mb-2">Staff saat ini: <b>${infoName}</b> | Catatan: <b>${infoNote}</b></div>
            <div class="form-grid">
                <div>
                    <label class="input-label">Divisi</label>
                    <select id="f_corr_division" class="input-field" onchange="refreshCorrectionStaffOptions()">${divisionOptions}</select>
                </div>
                <div>
                    <label class="input-label">Staff yang benar</label>
                    <select id="f_corr_staff" class="input-field"></select>
                </div>
            </div>
        `,
        actions: [
            { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan Koreksi', className: 'btn btn-primary btn-sm', onClick: async () => {
                let closeProgress = null;
                try {
                    setModalError('');
                    const division_id = String(document.getElementById('f_corr_division')?.value || '').trim();
                    const staff_id = String(document.getElementById('f_corr_staff')?.value || '').trim();
                    if (!division_id) return setModalError('Divisi wajib dipilih');
                    if (!staff_id) return setModalError('Staff wajib dipilih');
                    closeProgress = openHrProgressModal('Koreksi Wajah', 'Menyimpan koreksi dan menambahkan sample training...');
                    await api(`/api/attendance/events/${encodeURIComponent(eventId)}/correct-face`, 'POST', {
                        staff_id,
                        division_id,
                        add_as_training: true,
                        apply_now: true,
                    });
                    closeModalUi();
                    applyAttendanceEventCorrectionLocally(eventId, {
                        staff_id,
                        division_id,
                        note: 'Dikoreksi manual (admin tenant)'
                    });
                    notifyUi('success', 'Koreksi Event', 'Koreksi berhasil. Baris diperbarui tanpa refresh penuh.');
                } catch (e) {
                    setModalError(e.message || 'Gagal simpan koreksi');
                } finally {
                    if (closeProgress) closeProgress();
                }
            } },
        ]
    });
    refreshCorrectionStaffOptions();
}

function openAttendancePhotoPreview(eventId) {
    const row = (HR_STATE.attendanceEventsRows || []).find(x => String(x.id) === String(eventId || ''));
    const m = row && row.meta_json ? row.meta_json : {};
    const ph = String(m.attendance_photo || '');
    if (!ph.startsWith('data:image/')) {
        notifyUi('danger', 'Preview Foto', 'Foto tidak tersedia.');
        return;
    }
    openModalUi({
        title: 'Preview Foto Absensi',
        bodyHtml: `
            <div class="text-center">
                <img src="${ph.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" alt="preview"
                     style="max-width:100%; max-height:70vh; border-radius:8px; border:1px solid var(--border);" />
            </div>
        `,
        actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
    });
}

async function openAttendanceEventCreate() {
    const staffList = HR_STATE.staff && HR_STATE.staff.length ? HR_STATE.staff : await api('/api/staff');
    const now = new Date();
    const staffOptions = staffList.map(s => `<option value="${s.id}">${s.name || '-'}</option>`).join('');
    const dtDefault = now.toISOString().slice(0, 16);

    openModalUi({
        title: 'Tambah Attendance Event',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Staff</label>
                    <select id="f_ev_staff" class="input-field">${staffOptions}</select>
                </div>
                <div>
                    <label class="input-label">Event Type</label>
                    <select id="f_ev_type" class="input-field">
                        <option value="CLOCK_IN">CLOCK_IN</option>
                        <option value="CLOCK_OUT">CLOCK_OUT</option>
                        <option value="BREAK_START">BREAK_START</option>
                        <option value="BREAK_END">BREAK_END</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Waktu</label>
                    <input id="f_ev_time" class="input-field" type="datetime-local" value="${dtDefault}" />
                </div>
                <div class="form-full">
                    <label class="input-label">Catatan</label>
                    <input id="f_ev_note" class="input-field" placeholder="Opsional" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const staff_id = document.getElementById('f_ev_staff').value;
                    const event_type = document.getElementById('f_ev_type').value;
                    const occurred_at = toIsoFromDatetimeLocal(document.getElementById('f_ev_time').value);
                    const note = document.getElementById('f_ev_note').value.trim();
                    if (!staff_id) return setModalError('Staff wajib dipilih');
                    if (!occurred_at) return setModalError('Waktu tidak valid');
                    await api('/api/attendance/events', 'POST', { staff_id, event_type, occurred_at, note, source: 'manual' });
                    closeModalUi();
                    notifyUi('success', 'Event', 'Berhasil ditambahkan');
                    await loadAttendanceEvents();
                } catch (e) {
                    setModalError(e.message || 'Gagal simpan');
                }
            } }
        ]
    });
}

async function loadCompensation() {
    const tbody = document.getElementById('payroll-comp-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api('/api/payroll/compensation');
        HR_STATE.compensation = rows || [];
        const statCompCount = document.getElementById('payroll-stat-comp-count');
        if (statCompCount) statCompCount.textContent = String((rows || []).length || 0);
        const html = (rows || []).map(r => `<tr>
            <td>${r.staff_name || '-'}</td>
            <td>${r.pay_type || '-'}</td>
            <td>${formatRp(r.rate || 0)}</td>
            <td>${r.effective_from || '-'}</td>
            <td class="flex gap-2">
                <button class="btn btn-secondary btn-sm" onclick="openCompensationEdit('${r.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCompensation('${r.id}')">Hapus</button>
            </td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="5" class="text-muted">Belum ada rate</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Gagal load rate: ${e.message}</td></tr>`;
    }
}

async function openCompensationCreate() {
    await openCompensationForm(null);
}

async function openCompensationEdit(id) {
    await openCompensationForm(id);
}

async function openCompensationForm(id) {
    const staffList = HR_STATE.staff && HR_STATE.staff.length ? HR_STATE.staff : await api('/api/staff');
    let current = { staff_id: '', pay_type: 'HOURLY', rate: 0, currency: 'IDR', effective_from: todayYmd(), meta_json: {} };
    if (id) {
        current = (HR_STATE.compensation || []).find(x => x.id === id) || current;
    }

    const staffOptions = staffList.map(s => `<option value="${s.id}" ${String(current.staff_id) === String(s.id) ? 'selected' : ''}>${s.name || '-'}</option>`).join('');

    openModalUi({
        title: id ? 'Edit Rate' : 'Tambah Rate',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Staff</label>
                    <select id="f_cp_staff" class="input-field">${staffOptions}</select>
                </div>
                <div>
                    <label class="input-label">Pay Type</label>
                    <select id="f_cp_type" class="input-field">
                        <option value="HOURLY" ${current.pay_type === 'HOURLY' ? 'selected' : ''}>HOURLY</option>
                        <option value="DAILY" ${current.pay_type === 'DAILY' ? 'selected' : ''}>DAILY</option>
                        <option value="MONTHLY" ${current.pay_type === 'MONTHLY' ? 'selected' : ''}>MONTHLY</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Rate (IDR)</label>
                    <input id="f_cp_rate" class="input-field" type="number" min="0" step="1" value="${Number(current.rate || 0)}" />
                </div>
                <div>
                    <label class="input-label">Effective From</label>
                    <input id="f_cp_eff" class="input-field" type="date" value="${current.effective_from || todayYmd()}" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const staff_id = document.getElementById('f_cp_staff').value;
                    const pay_type = document.getElementById('f_cp_type').value;
                    const rate = Number(document.getElementById('f_cp_rate').value || 0);
                    const effective_from = document.getElementById('f_cp_eff').value;
                    if (!staff_id) return setModalError('Staff wajib dipilih');
                    if (!effective_from) return setModalError('Effective From wajib diisi');
                    if (!rate) return setModalError('Rate wajib diisi');
                    const payload = { staff_id, pay_type, rate, effective_from };
                    if (id) await api(`/api/payroll/compensation/${id}`, 'PUT', payload);
                    else await api('/api/payroll/compensation', 'POST', payload);
                    closeModalUi();
                    notifyUi('success', 'Payroll', 'Rate tersimpan');
                    await loadCompensation();
                } catch (e) {
                    setModalError(e.message || 'Gagal simpan');
                }
            } }
        ]
    });
}

async function deleteCompensation(id) {
    if (!await confirmUi('Hapus Rate?', 'Permanen.')) return;
    try {
        await api(`/api/payroll/compensation/${id}`, 'DELETE');
        notifyUi('success', 'Payroll', 'Rate terhapus');
        await loadCompensation();
    } catch (e) {
        notifyUi('danger', 'Error', e.message);
    }
}

async function loadPayrollPeriods() {
    const tbody = document.getElementById('payroll-period-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api('/api/payroll/periods');
        HR_STATE.payrollPeriods = rows || [];
        const draftCount = (rows || []).filter(r => String(r?.status || '').toUpperCase() === 'DRAFT').length;
        const postedCount = (rows || []).filter(r => String(r?.status || '').toUpperCase() === 'POSTED').length;
        const statDraft = document.getElementById('payroll-stat-period-draft');
        const statPosted = document.getElementById('payroll-stat-period-posted');
        if (statDraft) statDraft.textContent = String(draftCount || 0);
        if (statPosted) statPosted.textContent = String(postedCount || 0);

        const selected = (rows || []).find(r => String(r?.id || '') === String(HR_STATE.selectedPayrollPeriodId || ''));
        const statSelectedNet = document.getElementById('payroll-stat-selected-net');
        if (statSelectedNet) statSelectedNet.textContent = formatRp(selected?.total_net || 0);
        const html = (rows || []).map(r => {
            const selected = HR_STATE.selectedPayrollPeriodId === r.id;
            const btnDetail = `<button class="btn btn-secondary btn-sm" onclick="selectPayrollPeriod('${r.id}')">${selected ? 'Terpilih' : 'Detail'}</button>`;
            const btnCalc = r.status === 'DRAFT' ? `<button class="btn btn-secondary btn-sm" onclick="calculatePayrollPeriod('${r.id}')">Calc</button>` : '';
            const btnPost = r.status === 'DRAFT' ? `<button class="btn btn-primary btn-sm" onclick="postPayrollPeriod('${r.id}')">Post</button>` : '';
            return `<tr>
                <td>${r.start_date || '-'}</td>
                <td>${r.end_date || '-'}</td>
                <td>${r.status || '-'}</td>
                <td>${formatRp(r.total_net || 0)}</td>
                <td class="flex gap-2">${btnDetail}${btnCalc}${btnPost}</td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="5" class="text-muted">Belum ada period</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Gagal load periods: ${e.message}</td></tr>`;
    }
}

async function openPayrollPeriodCreate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const startDefault = `${yyyy}-${mm}-01`;
    const endDefault = `${yyyy}-${mm}-${dd}`;

    openModalUi({
        title: 'Buat Payroll Period',
        bodyHtml: `
            <div class="form-grid">
                <div>
                    <label class="input-label">Start</label>
                    <input id="f_pp_start" class="input-field" type="date" value="${startDefault}" />
                </div>
                <div>
                    <label class="input-label">End</label>
                    <input id="f_pp_end" class="input-field" type="date" value="${endDefault}" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const start_date = document.getElementById('f_pp_start').value;
                    const end_date = document.getElementById('f_pp_end').value;
                    if (!start_date || !end_date) return setModalError('Tanggal wajib diisi');
                    await api('/api/payroll/periods', 'POST', { start_date, end_date });
                    closeModalUi();
                    notifyUi('success', 'Payroll', 'Period dibuat');
                    await loadPayrollPeriods();
                } catch (e) {
                    setModalError(e.message || 'Gagal simpan');
                }
            } }
        ]
    });
}

async function selectPayrollPeriod(id) {
    HR_STATE.selectedPayrollPeriodId = id;
    await loadPayrollPeriods();
    await reloadSelectedPayrollItems();
}

async function loadSelectedPayrollItems() {
    const info = document.getElementById('payroll-selected-info');
    const tbody = document.getElementById('payroll-item-rows');
    const statItemCount = document.getElementById('payroll-stat-item-count');
    const statSelectedNet = document.getElementById('payroll-stat-selected-net');
    if (tbody) tbody.innerHTML = '';
    if (!HR_STATE.selectedPayrollPeriodId) {
        if (info) info.textContent = 'Pilih period untuk melihat detail.';
        if (statItemCount) statItemCount.textContent = '0';
        if (statSelectedNet) statSelectedNet.textContent = formatRp(0);
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-muted">Belum ada period terpilih</td></tr>`;
        return;
    }
    const selectedPeriod = (HR_STATE.payrollPeriods || []).find(r => String(r?.id || '') === String(HR_STATE.selectedPayrollPeriodId || ''));
    if (selectedPeriod) {
        if (info) info.textContent = `Period terpilih: ${selectedPeriod.start_date || '-'} s/d ${selectedPeriod.end_date || '-'} (${selectedPeriod.status || '-'})`;
        if (statSelectedNet) statSelectedNet.textContent = formatRp(selectedPeriod.total_net || 0);
    } else if (info) {
        info.textContent = `Period terpilih: ${HR_STATE.selectedPayrollPeriodId}`;
    }
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api(`/api/payroll/periods/${HR_STATE.selectedPayrollPeriodId}/items`);
        if (statItemCount) statItemCount.textContent = String((rows || []).length || 0);
        const html = (rows || []).map(r => `<tr>
            <td>${r.staff_name || '-'}</td>
            <td>${r.pay_type || '-'}</td>
            <td>${formatRp(r.rate || 0)}</td>
            <td>${r.minutes_worked || 0}</td>
            <td>${formatRp(r.gross || 0)}</td>
            <td>${formatRp(r.deductions || 0)}</td>
            <td>${formatRp(r.net || 0)}</td>
            <td>${r.currency || 'IDR'}</td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="8" class="text-muted">Belum ada item</td></tr>`;
    } catch (e) {
        if (statItemCount) statItemCount.textContent = '0';
        tbody.innerHTML = `<tr><td colspan="8" class="text-muted">Gagal load items: ${e.message}</td></tr>`;
    }
}

async function reloadSelectedPayrollItems() { await loadSelectedPayrollItems(); }

async function calculatePayrollPeriod(id) {
    try {
        await api(`/api/payroll/periods/${id}/calculate`, 'POST');
        notifyUi('success', 'Payroll', 'Kalkulasi selesai');
        await loadPayrollPeriods();
        if (HR_STATE.selectedPayrollPeriodId === id) await reloadSelectedPayrollItems();
    } catch (e) {
        notifyUi('danger', 'Payroll', e.message);
    }
}

async function postPayrollPeriod(id) {
    if (!await confirmUi('Post Payroll?', 'Setelah dipost, status period jadi POSTED dan tercatat di finance.')) return;
    try {
        await api(`/api/payroll/periods/${id}/post`, 'POST');
        notifyUi('success', 'Payroll', 'Berhasil dipost');
        await loadPayrollPeriods();
    } catch (e) {
        notifyUi('danger', 'Payroll', e.message);
    }
}

async function openPayrollItemUpsert() {
    if (!HR_STATE.selectedPayrollPeriodId) {
        notifyUi('danger', 'Payroll', 'Pilih period dulu');
        return;
    }

    const staffList = HR_STATE.staff && HR_STATE.staff.length ? HR_STATE.staff : await api('/api/staff');
    const staffOptions = staffList.map(s => `<option value="${s.id}">${s.name || '-'}</option>`).join('');

    openModalUi({
        title: 'Input Manual Payroll Item',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Staff</label>
                    <select id="f_pi_staff" class="input-field">${staffOptions}</select>
                </div>
                <div>
                    <label class="input-label">Pay Type</label>
                    <select id="f_pi_type" class="input-field">
                        <option value="HOURLY">HOURLY</option>
                        <option value="DAILY">DAILY</option>
                        <option value="MONTHLY">MONTHLY</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Rate</label>
                    <input id="f_pi_rate" class="input-field" type="number" min="0" step="1" value="0" />
                </div>
                <div>
                    <label class="input-label">Minutes</label>
                    <input id="f_pi_min" class="input-field" type="number" min="0" step="1" value="0" />
                </div>
                <div>
                    <label class="input-label">Gross</label>
                    <input id="f_pi_gross" class="input-field" type="number" min="0" step="1" value="0" />
                </div>
                <div>
                    <label class="input-label">Deductions</label>
                    <input id="f_pi_ded" class="input-field" type="number" min="0" step="1" value="0" />
                </div>
                <div>
                    <label class="input-label">Currency</label>
                    <input id="f_pi_cur" class="input-field" value="IDR" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const staff_id = document.getElementById('f_pi_staff').value;
                    const pay_type = document.getElementById('f_pi_type').value;
                    const rate = Number(document.getElementById('f_pi_rate').value || 0);
                    const minutes_worked = Number(document.getElementById('f_pi_min').value || 0);
                    const gross = Number(document.getElementById('f_pi_gross').value || 0);
                    const deductions = Number(document.getElementById('f_pi_ded').value || 0);
                    const currency = document.getElementById('f_pi_cur').value.trim() || 'IDR';
                    if (!staff_id) return setModalError('Staff wajib dipilih');
                    if (!gross) return setModalError('Gross wajib diisi');
                    await api(`/api/payroll/periods/${HR_STATE.selectedPayrollPeriodId}/items`, 'POST', {
                        staff_id,
                        pay_type,
                        rate,
                        minutes_worked,
                        gross,
                        deductions,
                        currency,
                    });
                    closeModalUi();
                    notifyUi('success', 'Payroll', 'Item tersimpan');
                    await reloadSelectedPayrollItems();
                    await loadPayrollPeriods();
                } catch (e) {
                    setModalError(e.message || 'Gagal simpan');
                }
            } }
        ]
    });
}

function perfFormatPct(v) {
    if (v == null || v === '' || !Number.isFinite(Number(v))) return '—';
    return `${Number(v).toFixed(1)}%`;
}

function perfParseOptionalNumber(el) {
    const t = String(el?.value ?? '').trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

async function saveStaffKpiFromButton(btn) {
    const tr = btn && btn.closest ? btn.closest('tr') : null;
    if (!tr) return;
    const staffId = tr.getAttribute('data-staff-kpi');
    if (!staffId) return;
    const inputs = tr.querySelectorAll('input[data-kpi-field]');
    const body = { staff_id: staffId, note: '' };
    inputs.forEach((inp) => {
        const f = inp.getAttribute('data-kpi-field');
        if (f === 'note') body.note = String(inp.value || '').trim().slice(0, 500);
        else if (f === 'kedisiplinan' || f === 'five_r' || f === 'improvement') {
            body[f] = perfParseOptionalNumber(inp);
        }
    });
    try {
        await api('/api/performance/staff-kpi', 'POST', body);
        notifyUi('success', 'KPI Staff', 'Penilaian disimpan.');
        await loadStaffPerformance();
    } catch (e) {
        notifyUi('danger', 'KPI Staff', getHrErrorMessage(e, 'Gagal simpan penilaian'));
    }
}

/** KPI per staff — tab Manajemen Staff. */
async function loadStaffPerformance() {
    const tbody = document.getElementById('staff-performance-rows');
    if (!tbody) return;
    const colspan = 8;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-muted">Loading...</td></tr>`;
    try {
        await ensureHrDivisions(false);
        const rows = await api('/api/performance/staff');
        const list = Array.isArray(rows) ? rows : (Array.isArray(rows?.rows) ? rows.rows : []);
        const numAvg = (arr, picker) => {
            const nums = (arr || []).map(picker).filter((x) => x != null && Number.isFinite(Number(x)));
            if (!nums.length) return null;
            return nums.reduce((a, b) => a + Number(b), 0) / nums.length;
        };
        const setDash = (id, v, isPct) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (v == null || !Number.isFinite(v)) {
                el.textContent = '—';
                return;
            }
            el.textContent = isPct ? `${v.toFixed(1)}%` : `${v.toFixed(1)}`;
        };
        setDash('perf-stat-staff-kehadiran', numAvg(list, (r) => (r.kehadiran_pct == null ? null : Number(r.kehadiran_pct))), true);
        setDash('perf-stat-staff-kedisiplinan', numAvg(list, (r) => (r.kedisiplinan == null ? null : Number(r.kedisiplinan))), false);
        setDash('perf-stat-staff-five-r', numAvg(list, (r) => (r.five_r == null ? null : Number(r.five_r))), false);
        setDash('perf-stat-staff-improvement', numAvg(list, (r) => (r.improvement == null ? null : Number(r.improvement))), false);
        const escAttr = (s) => String(s)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
        const escHtml = (s) => String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const ph = (v) => (v == null || v === '' ? '' : String(v));
        const html = (list || []).map((r) => {
            const sid = escAttr(r.staff_id);
            const sname = escHtml(String(r.staff_name || '-'));
            return `<tr data-staff-kpi="${sid}">
                <td>${sname}</td>
                <td>${escHtml(divisionNameFor(r.division_id))}</td>
                <td>${perfFormatPct(r.kehadiran_pct)}</td>
                <td><input class="input-field kpi-input" type="number" min="0" max="100" step="0.1" data-kpi-field="kedisiplinan" value="${ph(r.kedisiplinan)}" placeholder="0–100" style="min-width:4rem" /></td>
                <td><input class="input-field kpi-input" type="number" min="0" max="100" step="0.1" data-kpi-field="five_r" value="${ph(r.five_r)}" placeholder="0–100" style="min-width:4rem" /></td>
                <td><input class="input-field kpi-input" type="number" min="0" max="100" step="0.1" data-kpi-field="improvement" value="${ph(r.improvement)}" placeholder="0–100" style="min-width:4rem" /></td>
                <td><input class="input-field kpi-input" type="text" data-kpi-field="note" value="${escAttr(r.kpi_note || '')}" placeholder="Catatan" style="min-width:6rem" /></td>
                <td><button type="button" class="btn btn-primary btn-sm" onclick="saveStaffKpiFromButton(this)">Simpan</button></td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="${colspan}" class="text-muted">Belum ada data</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-muted">Gagal load KPI staff: ${e.message}</td></tr>`;
    }
}

/** Data KPI per divisi: coba `/api/performance/divisions`, lalu alias `/api/reports/divisions/bgn-kpi` (prefix sama dengan batch performance; membantu bila proxy tidak meneruskan `/api/performance`). */
async function fetchPerformanceDivisionsJson() {
    const primary = '/api/performance/divisions';
    const fallback = '/api/reports/divisions/bgn-kpi';
    try {
        return await api(primary);
    } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        if (/404|tidak ditemukan|Cannot GET|not found/i.test(msg)) {
            return await api(fallback);
        }
        throw e;
    }
}

/** KPI operasional BGN per divisi — halaman Kinerja operasi (divisi). */
async function loadDivisionKpiView() {
    const tbodyBatch = document.getElementById('division-kpi-division-batches-rows');
    if (tbodyBatch) {
        tbodyBatch.innerHTML = '<tr><td colspan="4" class="text-muted">Loading...</td></tr>';
        try {
            const bRows = await api('/api/reports/divisions/performance');
            const bHtml = (bRows || []).map((r) => `<tr>
            <td>${r.division_name || '-'}</td>
            <td>${r.total_batches || 0}</td>
            <td>${r.on_time_batches || 0}</td>
            <td>${Number((r.on_time_rate || 0) * 100).toFixed(1)}%</td>
        </tr>`).join('');
            tbodyBatch.innerHTML = bHtml || '<tr><td colspan="4" class="text-muted">Belum ada data</td></tr>';
        } catch (e) {
            tbodyBatch.innerHTML = `<tr><td colspan="4" class="text-muted">Gagal memuat SOP/batch per divisi: ${e.message}</td></tr>`;
        }
    }
    const tbody = document.getElementById('division-kpi-bgn-rows');
    if (!tbody) return;
    const colspan = 6;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await fetchPerformanceDivisionsJson();
        const list = Array.isArray(rows) ? rows : (Array.isArray(rows?.rows) ? rows.rows : []);
        const numAvg = (arr, picker) => {
            const nums = (arr || []).map(picker).filter((x) => x != null && Number.isFinite(Number(x)));
            if (!nums.length) return null;
            return nums.reduce((a, b) => a + Number(b), 0) / nums.length;
        };
        const setDash = (id, v, isPct) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (v == null || !Number.isFinite(v)) {
                el.textContent = '—';
                return;
            }
            el.textContent = isPct ? `${v.toFixed(1)}%` : `${v.toFixed(1)}`;
        };
        const avgSop = numAvg(list, (r) => (r.kpi_sppg_sop_compliance_rate == null ? null : Number(r.kpi_sppg_sop_compliance_rate) * 100));
        const avgDist = numAvg(list, (r) => (r.kpi_on_time_distribution_rate == null ? null : Number(r.kpi_on_time_distribution_rate) * 100));
        const covRaw = list.length && list[0].kpi_beneficiary_coverage_rate != null ? Number(list[0].kpi_beneficiary_coverage_rate) * 100 : null;
        const avgFood = numAvg(list, (r) => (r.kpi_food_safety_compliance_rate == null ? null : Number(r.kpi_food_safety_compliance_rate) * 100));
        const avgScore = numAvg(list, (r) => (r.kpi_score == null ? null : Number(r.kpi_score)));
        setDash('div-kpi-stat-sop', avgSop, true);
        setDash('div-kpi-stat-dist', avgDist, true);
        setDash('div-kpi-stat-coverage', covRaw, true);
        setDash('div-kpi-stat-food', avgFood, true);
        setDash('div-kpi-stat-score', avgScore, false);
        const escHtml = (s) => String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const html = (list || []).map((r) => {
            const dname = escHtml(String(r.division_name || r.division_id || '-'));
            return `<tr>
                <td>${dname}</td>
                <td>${Number((r.kpi_sppg_sop_compliance_rate || 0) * 100).toFixed(1)}%</td>
                <td>${Number((r.kpi_on_time_distribution_rate || 0) * 100).toFixed(1)}%</td>
                <td>${Number((r.kpi_beneficiary_coverage_rate || 0) * 100).toFixed(1)}%</td>
                <td>${Number((r.kpi_food_safety_compliance_rate || 0) * 100).toFixed(1)}%</td>
                <td><span class="font-bold">${Number(r.kpi_score || 0).toFixed(1)}</span></td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="${colspan}" class="text-muted">Belum ada data</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-muted">Gagal memuat KPI divisi: ${e.message}</td></tr>`;
    }
}

async function loadKinerjaOperasiView() {
    await loadDivisionKpiView();
}

/** SOP / batch per divisi — gunakan tab KPI Divisi. */
async function loadDivisionBatchesForStaffKpi() {
    return loadDivisionKpiView();
}

/** @deprecated */
async function loadPerformance() {
    return loadDivisionKpiView();
}

// =====================================================================
// MANAJEMEN USER PENGELOGLA (canonical, login ke portal pengelola via email+pwd)
// =====================================================================

/**
 * Role yang boleh dipilih/di-assign saat membuat atau mengedit User Pengelola.
 *
 * CATATAN: 'kepala_sppg' TIDAK ada di daftar ini karena akun Kepala SPPG
 * di-provision oleh developer saat pendaftaran tenant (satu tenant satu Kepala
 * SPPG canonical di tabel `tenants`). Kepala SPPG inilah yang kemudian
 * menambahkan user pengelola lain (asisten lapangan, akuntan, yayasan, dsb).
 */
const PORTAL_USER_ROLES = [
    { value: 'asisten_lapangan', label: 'Asisten Lapangan' },
    { value: 'ahli_gizi', label: 'Ahli Gizi' },
    { value: 'akuntan', label: 'Akuntan' },
    { value: 'yayasan', label: 'Yayasan' },
    { value: 'admin', label: 'Admin' },
    { value: 'driver', label: 'Driver' }
];

/**
 * Label untuk menampilkan role di tabel. Tetap menyertakan 'kepala_sppg' karena
 * mungkin ada row legacy atau tenant owner yang secara tidak sengaja ada di
 * tabel `users` — supaya tidak tampil sebagai raw key.
 */
const PORTAL_USER_ROLE_LABEL = PORTAL_USER_ROLES.reduce((acc, r) => {
    acc[r.value] = r.label;
    return acc;
}, { kepala_sppg: 'Kepala SPPG' });

let PORTAL_USERS = [];

async function loadPortalUsers() {
    const tbody = document.getElementById('pu-rows');
    if (!hrCanManagePortalUsers()) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-muted italic">Hanya Kepala SPPG yang berhak membuka manajemen User Pengelola.</td></tr>`;
        PORTAL_USERS = [];
        return;
    }
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-muted italic">Memuat...</td></tr>`;
    try {
        await ensureHrDivisions();
        const rows = await api('/api/users');
        PORTAL_USERS = Array.isArray(rows) ? rows : [];
        renderPortalUsers();
    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Gagal memuat: ${e.message}</td></tr>`;
    }
}

function renderPortalUsers() {
    const tbody = document.getElementById('pu-rows');
    const summary = document.getElementById('pu-table-summary');
    if (!tbody) return;

    const keyword = String((document.getElementById('pu-filter-keyword') || {}).value || '').trim().toLowerCase();
    const roleFilter = String((document.getElementById('pu-filter-role') || {}).value || '').trim().toLowerCase();

    const filtered = (PORTAL_USERS || []).filter(u => {
        const role = String(u.role || '').toLowerCase();
        if (roleFilter && role !== roleFilter) return false;
        if (keyword) {
            const hay = `${u.email || ''} ${u.name || ''} ${u.role || ''}`.toLowerCase();
            if (!hay.includes(keyword)) return false;
        }
        return true;
    });

    if (summary) summary.textContent = `${filtered.length} / ${PORTAL_USERS.length} data`;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-muted italic">Belum ada user pengelola. Klik "Tambah User" untuk membuat akun login pertama.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const role = String(u.role || '');
        const roleLabel = PORTAL_USER_ROLE_LABEL[role] || role || '-';
        // Kepala SPPG = provisioned via dev, tidak perlu tombol Edit/Delete untuk
        // role itu karena ubah role-nya tidak didukung lewat UI ini. Tombol reset
        // password tetap disediakan supaya Kepala SPPG bisa bantu reset akunnya
        // sendiri kalau perlu.
        const isKepala = role.toLowerCase() === 'kepala_sppg';
        const actionBtns = [];
        actionBtns.push(`<button class="btn btn-secondary btn-sm" onclick="openPortalUserForm('${u.id}')" ${isKepala ? 'title="Role Kepala SPPG tidak bisa diubah dari sini"' : ''}><i class="fas fa-edit"></i> Edit</button>`);
        actionBtns.push(`<button class="btn btn-secondary btn-sm" onclick="openPortalUserPasswordReset('${u.id}')" title="Reset password"><i class="fas fa-key"></i></button>`);
        if (!isKepala) {
            actionBtns.push(`<button class="btn btn-secondary btn-sm" style="color:#b91c1c;" onclick="deletePortalUser('${u.id}')"><i class="fas fa-trash"></i></button>`);
        }
        return `<tr>
            <td>${escapeHtmlHr(u.name) || '-'}</td>
            <td><code>${escapeHtmlHr(u.email) || '-'}</code></td>
            <td><span class="chip chip-primary">${escapeHtmlHr(roleLabel)}</span></td>
            <td>
                <div class="flex gap-1 flex-wrap">
                    ${actionBtns.join('')}
                </div>
            </td>
        </tr>`;
    }).join('');
}

function escapeHtmlHr(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function openPortalUserForm(id) {
    if (!hrCanManagePortalUsers()) {
        notifyUi('error', 'Akses Ditolak', 'Hanya Kepala SPPG yang bisa mengelola User Pengelola.');
        return;
    }
    // Default role untuk user baru: asisten_lapangan (operasional paling umum).
    // Kepala SPPG sengaja TIDAK jadi default/opsi karena di-provision lewat dev
    // saat pendaftaran tenant.
    let data = { id: '', email: '', name: '', role: 'asisten_lapangan', password: '' };
    if (id) {
        const existing = (PORTAL_USERS || []).find(x => x.id === id);
        if (existing) data = { ...data, ...existing, password: '' };
    }

    // Bangun opsi role. Kalau sedang mengedit user lama yang role-nya
    // 'kepala_sppg' (mis. data lama / migrasi), tampilkan sebagai opsi disabled
    // agar tidak hilang dari dropdown tapi juga tidak bisa di-set ulang.
    const isExistingKepala = !!id && String(data.role || '').toLowerCase() === 'kepala_sppg';
    const roleOptionsList = [];
    if (isExistingKepala) {
        roleOptionsList.push(`<option value="kepala_sppg" selected disabled>Kepala SPPG (dikelola via pendaftaran tenant)</option>`);
    }
    PORTAL_USER_ROLES.forEach(r => {
        const selected = !isExistingKepala && data.role === r.value ? 'selected' : '';
        roleOptionsList.push(`<option value="${r.value}" ${selected}>${r.label}</option>`);
    });
    const roleOptionsHtml = roleOptionsList.join('');

    openModalUi({
        title: id ? 'Edit User Pengelola' : 'Tambah User Pengelola',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Nama Lengkap</label>
                    <input id="pu_f_name" class="input-field" value="${escapeHtmlHr(data.name)}" placeholder="Nama lengkap" />
                </div>
                <div class="form-full">
                    <label class="input-label">Email (untuk login)</label>
                    <input id="pu_f_email" class="input-field" value="${escapeHtmlHr(data.email)}" placeholder="user@domain.com" />
                </div>
                <div class="form-full">
                    <label class="input-label">Role Canonical</label>
                    <select id="pu_f_role" class="input-field" ${isExistingKepala ? 'disabled' : ''}>${roleOptionsHtml}</select>
                    <div class="text-xs text-muted mt-1">Kepala SPPG di-setup oleh developer saat pendaftaran tenant, tidak bisa ditambah dari sini.</div>
                </div>
                <div class="form-full">
                    <label class="input-label">${id ? 'Password Baru (kosongkan jika tidak ingin ubah)' : 'Password Awal'}</label>
                    <input id="pu_f_password" class="input-field" type="password" value="${id ? '' : '123456'}" placeholder="${id ? 'Biarkan kosong kalau tidak diubah' : 'Minimal 6 karakter'}" />
                    <div class="text-xs text-muted mt-1">${id ? 'Reset password bisa dilakukan via tombol <i class="fas fa-key"></i> di daftar.' : 'Default "123456" — pastikan diganti oleh user setelah login pertama.'}</div>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const name = (document.getElementById('pu_f_name').value || '').trim();
                    const email = (document.getElementById('pu_f_email').value || '').trim().toLowerCase();
                    const roleEl = document.getElementById('pu_f_role');
                    const role = (roleEl && !roleEl.disabled) ? (roleEl.value || '').trim() : String(data.role || '').trim();
                    const password = (document.getElementById('pu_f_password').value || '').trim();

                    if (!name) return setModalError('Nama wajib diisi');
                    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setModalError('Email tidak valid');
                    if (!role) return setModalError('Role wajib dipilih');
                    // Hard guard di client: tolak pembuatan/assign ulang kepala_sppg
                    // dari UI User Pengelola. Backend juga akan menolak (400).
                    if (!id && role === 'kepala_sppg') {
                        return setModalError('Role Kepala SPPG di-provision via pendaftaran tenant, tidak bisa dibuat dari sini.');
                    }
                    if (!id && (!password || password.length < 6)) return setModalError('Password minimal 6 karakter');
                    if (id && password && password.length < 6) return setModalError('Password baru minimal 6 karakter');

                    const payload = { email, name, role };
                    if (password) payload.password = password;

                    if (id) {
                        await api(`/api/users/${encodeURIComponent(id)}`, 'PUT', payload);
                        notifyUi('success', 'User', `User ${email} diperbarui.`);
                    } else {
                        await api('/api/users', 'POST', payload);
                        notifyUi('success', 'User', `User ${email} dibuat. Password awal: "${password}".`);
                    }
                    closeModalUi();
                    await loadPortalUsers();
                } catch (e) { setModalError(e.message || 'Gagal menyimpan'); }
            }}
        ]
    });
}

async function openPortalUserPasswordReset(id) {
    if (!hrCanManagePortalUsers()) {
        notifyUi('error', 'Akses Ditolak', 'Hanya Kepala SPPG yang bisa mereset password User Pengelola.');
        return;
    }
    const user = (PORTAL_USERS || []).find(x => x.id === id);
    if (!user) return notifyUi('error', 'Reset Password', 'User tidak ditemukan');

    openModalUi({
        title: `Reset Password — ${user.email}`,
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <div class="text-sm text-muted mb-2">Masukkan password baru. User wajib mengganti sendiri setelah login.</div>
                    <input id="pu_reset_pw" class="input-field" type="password" placeholder="Password baru (min 6 karakter)" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Reset', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const pw = (document.getElementById('pu_reset_pw').value || '').trim();
                    if (!pw || pw.length < 6) return setModalError('Password minimal 6 karakter');
                    await api(`/api/users/${encodeURIComponent(id)}`, 'PUT', { password: pw });
                    notifyUi('success', 'Reset Password', `Password ${user.email} direset.`);
                    closeModalUi();
                } catch (e) { setModalError(e.message || 'Gagal reset password'); }
            }}
        ]
    });
}

async function deletePortalUser(id) {
    if (!hrCanManagePortalUsers()) {
        notifyUi('error', 'Akses Ditolak', 'Hanya Kepala SPPG yang bisa menghapus User Pengelola.');
        return;
    }
    const user = (PORTAL_USERS || []).find(x => x.id === id);
    if (!user) return;
    if (!confirm(`Hapus user "${user.email}" (${PORTAL_USER_ROLE_LABEL[user.role] || user.role})? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
        await api(`/api/users/${encodeURIComponent(id)}`, 'DELETE');
        notifyUi('success', 'Hapus', `User ${user.email} dihapus.`);
        await loadPortalUsers();
    } catch (e) {
        notifyUi('error', 'Hapus', e.message || 'Gagal menghapus user');
    }
}

window.loadPortalUsers = loadPortalUsers;
window.renderPortalUsers = renderPortalUsers;
window.openPortalUserForm = openPortalUserForm;
window.openPortalUserPasswordReset = openPortalUserPasswordReset;
window.deletePortalUser = deletePortalUser;
window.hrCanManagePortalUsers = hrCanManagePortalUsers;
window.applyHrRoleGate = applyHrRoleGate;

window.initHrModule = initHrModule;
window.switchHrTab = switchHrTab;
window.loadStaff = loadStaff;
window.renderStaffTable = renderStaffTable;
window.resetStaffFilters = resetStaffFilters;
window.exportStaffCsv = exportStaffCsv;
window.openStaffCreate = openStaffCreate;
window.openStaffEdit = openStaffEdit;
window.deleteStaff = deleteStaff;
window.loadShifts = loadShifts;
window.openShiftCreate = openShiftCreate;
window.openShiftEdit = openShiftEdit;
window.deleteShift = deleteShift;
window.loadAttendanceDaily = loadAttendanceDaily;
window.openAttendanceDailyCreate = openAttendanceDailyCreate;
window.openAttendanceDailyEdit = openAttendanceDailyEdit;
window.openAttendanceRecompute = openAttendanceRecompute;
window.recomputeAttendanceTodayFromEvents = recomputeAttendanceTodayFromEvents;
window.resetAttendanceFilters = resetAttendanceFilters;
window.loadAttendancePolicy = loadAttendancePolicy;
window.saveAttendancePolicy = saveAttendancePolicy;
window.loadAttendanceRecap = loadAttendanceRecap;
window.openAttendanceRecapPhoto = openAttendanceRecapPhoto;
window.loadShiftAssignments = loadShiftAssignments;
window.openAssignmentCreate = openAssignmentCreate;
window.openAssignmentCreateFor = openAssignmentCreateFor;
window.openAssignmentEdit = openAssignmentEdit;
window.deleteAssignment = deleteAssignment;
window.resetShiftAssignment = resetShiftAssignment;
window.loadAttendanceEvents = loadAttendanceEvents;
window.setAttendanceEventsTodayRange = setAttendanceEventsTodayRange;
window.openAttendanceEventCreate = openAttendanceEventCreate;
window.toggleAttendanceEventsSort = toggleAttendanceEventsSort;
window.deleteAttendanceEvent = deleteAttendanceEvent;
window.openAttendanceEventCorrection = openAttendanceEventCorrection;
window.refreshCorrectionStaffOptions = refreshCorrectionStaffOptions;
window.openAttendancePhotoPreview = openAttendancePhotoPreview;
window.loadCompensation = loadCompensation;
window.openCompensationCreate = openCompensationCreate;
window.openCompensationEdit = openCompensationEdit;
window.deleteCompensation = deleteCompensation;
window.loadPayrollPeriods = loadPayrollPeriods;
window.openPayrollPeriodCreate = openPayrollPeriodCreate;
window.selectPayrollPeriod = selectPayrollPeriod;
window.reloadSelectedPayrollItems = reloadSelectedPayrollItems;
window.calculatePayrollPeriod = calculatePayrollPeriod;
window.postPayrollPeriod = postPayrollPeriod;
window.openPayrollItemUpsert = openPayrollItemUpsert;
window.loadStaffPerformance = loadStaffPerformance;
window.loadDivisionKpiView = loadDivisionKpiView;
window.saveStaffKpiFromButton = saveStaffKpiFromButton;
window.loadKinerjaOperasiView = loadKinerjaOperasiView;
window.loadDivisionBatchesForStaffKpi = loadDivisionBatchesForStaffKpi;
window.loadPerformance = loadPerformance;
window.initKitchenGpsMap = initKitchenGpsMap;
window.saveKitchenGpsPoint = saveKitchenGpsPoint;
window.setKitchenGpsFromPair = setKitchenGpsFromPair;
window.analyzeRelawanAttendanceBulk = analyzeRelawanAttendanceBulk;
window.analyzeRelawanFaceMismatchRetry = analyzeRelawanFaceMismatchRetry;

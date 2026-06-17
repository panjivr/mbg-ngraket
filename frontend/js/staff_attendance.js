let STAFF_SESSION = {
    token: localStorage.getItem('staff_token') || '',
    tenant_id: localStorage.getItem('staff_tenant_id') || '',
    staff_id: localStorage.getItem('staff_id') || '',
    name: localStorage.getItem('staff_name') || '',
    role: localStorage.getItem('staff_role') || '',
    division_id: localStorage.getItem('staff_division_id') || '',
    login_method: localStorage.getItem('staff_login_method') || ''
};

let CAMERA_STATE = {
    stream: null,
    photo_data_url: ''
};

let STAFF_DIVISION_DIRECTORY = {
    loaded: false,
    nameById: {}
};

/** Muat daftar divisi dari Setup Dapur (sama seperti HR / Manajemen Staff). */
async function ensureStaffDivisionDirectory(force = false) {
    try {
        if (!force && STAFF_DIVISION_DIRECTORY.loaded) return STAFF_DIVISION_DIRECTORY.nameById;
        const cfg = await staffApi('/api/kitchen/config');
        const list = Array.isArray(cfg?.divisions) ? cfg.divisions : [];
        const map = {};
        for (const d of list) {
            if (!d || !d.id) continue;
            map[String(d.id).toLowerCase()] = String(d.name || d.id);
        }
        STAFF_DIVISION_DIRECTORY = { loaded: true, nameById: map };
        return map;
    } catch (e) {
        return STAFF_DIVISION_DIRECTORY.nameById || {};
    }
}

/** Nama divisi canonical mengikuti Setup Dapur. Fallback ke id jika tidak ditemukan. */
function divisionNameForStaff(divisionId) {
    const raw = String(divisionId == null ? '' : divisionId).trim();
    if (!raw) return '-';
    const key = raw.toLowerCase();
    const name = STAFF_DIVISION_DIRECTORY.nameById && STAFF_DIVISION_DIRECTORY.nameById[key];
    return name ? name : raw;
}

function setVisible(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    if (visible) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

function showSection(id) {
    const sections = ['staff-landing', 'staff-login', 'staff-attendance', 'staff-face-register', 'staff-face-login', 'koordinator-panel'];
    sections.forEach(sec => {
        setVisible(sec, sec === id);
    });
}

function showLanding(message = '') {
    stopCamera();
    if (window.location.pathname.includes('/staff.html')) {
        setVisible('staff-auth', true);
        setVisible('staff-main-portal', false);
        showSection('staff-landing');
        const msgEl = document.getElementById('st_landing_msg');
        if (msgEl) {
            if (message) {
                msgEl.textContent = message;
                msgEl.classList.remove('hidden');
                setTimeout(() => msgEl.classList.add('hidden'), 5000);
            } else {
                msgEl.classList.add('hidden');
            }
        }
    } else {
        window.location.href = 'staff.html';
    }
}

function showManualLogin() {
    showSection('staff-login');
}

function setError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    if (message) {
        el.textContent = message;
        el.classList.remove('hidden');
    } else {
        el.textContent = '';
        el.classList.add('hidden');
    }
}

function getApiBase() {
    let base = (localStorage.getItem('app_server_url') || '').trim().replace(/\/+$/, '');
    if (!base) return '';
    // Halaman HTTPS + app_server_url http:// → mixed content (kamera/API gagal di HP)
    try {
        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' && /^http:\/\//i.test(base)) {
            base = 'https://' + base.slice(7);
            localStorage.setItem('app_server_url', base);
        }
    } catch (e) { /* ignore */ }
    return base;
}

async function staffApi(path, method = 'GET', body = null, additionalHeaders = {}) {
    const headers = { ...additionalHeaders };
    if (STAFF_SESSION.token && !headers['Authorization']) headers['Authorization'] = 'Bearer ' + STAFF_SESSION.token;
    if (STAFF_SESSION.tenant_id && !headers['x-tenant-id']) headers['x-tenant-id'] = STAFF_SESSION.tenant_id;
    if (body) headers['Content-Type'] = 'application/json';
    const base = getApiBase();
    let url = path;
    if (base) {
        try { url = new URL(path, base + '/').toString(); } catch (e) { url = base + (String(path || '').startsWith('/') ? '' : '/') + path; }
    }
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
        const raw = await res.text();
        let msg = raw;
        let parsed = null;
        try {
            const j = JSON.parse(raw);
            parsed = j && typeof j === 'object' ? j : null;
            if (parsed) msg = (parsed.message || parsed.error || raw);
        } catch (e) {}
        const err = new Error(String(msg || `HTTP ${res.status}`));
        err.status = res.status;
        if (parsed) err.body = parsed;
        throw err;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return await res.text();
}

async function loadDivisions(targetElementId = 'att_division', tenant_id = null) {
    try {
        const tid = tenant_id || (document.getElementById('reg_tenant') ? document.getElementById('reg_tenant').value.trim() : null);
        const headers = {};
        if (tid) headers['x-tenant-id'] = tid;
        
        const cfg = await staffApi('/api/kitchen/config', 'GET', null, headers);
        const divisions = (cfg && cfg.divisions) ? cfg.divisions : [];
        if (!tid) localStorage.setItem('kitchen_config', JSON.stringify(cfg));
        
        const sel = document.getElementById(targetElementId);
        if (!sel) return;
        
        // Phase 2: Ensure SPPG is always an option
        let htmlParts = [`<option value="">Pilih divisi...</option>`];
        if (!divisions.find(d => String(d.id).toUpperCase() === 'SPPG')) {
            htmlParts.push('<option value="SPPG">SPPG</option>');
        }
        
        const html = htmlParts.concat(divisions.map(d => `<option value="${d.id}">${d.name || d.id}</option>`)).join('');
        sel.innerHTML = html;
        if (STAFF_SESSION.division_id && targetElementId === 'att_division') sel.value = STAFF_SESSION.division_id;
    } catch (e) {
        const sel = document.getElementById(targetElementId);
        if (sel) sel.innerHTML = `<option value="">(Gagal load divisi)</option>`;
    }
}

async function staffLogin() {
    setError('st_login_error', '');
    try {
        const tenant_id = document.getElementById('st_tenant').value.trim();
        const staff_code = document.getElementById('st_code').value.trim();
        const pin = document.getElementById('st_pin').value.trim();
        if (!tenant_id) return setError('st_login_error', 'Tenant/Kitchen wajib diisi');
        if (!staff_code) return setError('st_login_error', 'Kode staff wajib diisi');
        if (!pin) return setError('st_login_error', 'PIN wajib diisi');

        const r = await staffApi('/auth/staff/code-login', 'POST', { tenant_id, staff_code, pin });
        STAFF_SESSION.token = r.token;
        STAFF_SESSION.tenant_id = r.tenant_id;
        STAFF_SESSION.staff_id = r.staff.id;
        STAFF_SESSION.name = r.staff.name || '';
        STAFF_SESSION.role = r.staff.role || '';
        STAFF_SESSION.division_id = r.staff.division_id || '';

        localStorage.setItem('staff_token', STAFF_SESSION.token);
        localStorage.setItem('staff_tenant_id', STAFF_SESSION.tenant_id);
        localStorage.setItem('staff_id', STAFF_SESSION.staff_id);
        localStorage.setItem('staff_name', STAFF_SESSION.name);
        localStorage.setItem('staff_role', STAFF_SESSION.role);
        localStorage.setItem('staff_division_id', STAFF_SESSION.division_id);

        STAFF_SESSION.login_method = 'manual';
        localStorage.setItem('staff_login_method', 'manual');

        await afterLogin();
    } catch (e) {
        setError('st_login_error', e.message || 'Gagal login');
    }
}

async function staffLogout() {
    try {
        await staffApi('/auth/logout', 'POST');
    } catch (e) {}
    STAFF_SESSION = { token: '', tenant_id: '', staff_id: '', name: '', role: '', division_id: '' };
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_tenant_id');
    localStorage.removeItem('staff_id');
    localStorage.removeItem('staff_name');
    localStorage.removeItem('staff_role');
    localStorage.removeItem('staff_division_id');
    localStorage.removeItem('staff_login_method');
    stopCamera();
    setVisible('koordinator-panel', false);
    if (window.location.pathname.includes('/staff.html')) {
        showLanding();
    } else {
        window.location.href = 'staff.html';
    }
}

async function afterLogin() {
    if (!window.location.pathname.includes('/staff.html')) {
        if (STAFF_SESSION.login_method === 'manual') {
            window.location.href = 'staff.html';
        } else {
            showLanding();
            notifyUi('success', 'Portal', `Absensi/Login Berhasil: ${STAFF_SESSION.name}`);
        }
        return;
    }
    
    if (STAFF_SESSION.login_method === 'face') {
        showLanding(`Absensi Berhasil: ${STAFF_SESSION.name}`);
        return;
    }
    
    setVisible('staff-auth', false);
    setVisible('staff-main-portal', true);
    showSection('staff-attendance');
    const label = document.getElementById('st_user_label');
    if (label) label.textContent = `${STAFF_SESSION.name || '-'} (${STAFF_SESSION.role || 'staff'})`;
    const nameEl = document.getElementById('att_name');
    if (nameEl) nameEl.value = STAFF_SESSION.name || '';

    const role = String(STAFF_SESSION.role || '').toLowerCase();
    const isKoor = role === 'koordinator_divisi' || role === 'kepala_sppg' || role === 'admin' || role === 'asisten_lapangan';
    setVisible('koordinator-panel', role === 'koordinator_divisi');
    setVisible('jobdesc-panel', true);

    await ensureStaffDivisionDirectory(true);
    const myDivisionName = divisionNameForStaff(STAFF_SESSION.division_id);

    const scopeLabel = document.getElementById('jobdesc_scope_label');
    if (scopeLabel) {
        if (isKoor) {
            scopeLabel.textContent = `Divisi: ${myDivisionName || 'semua'} • role ${STAFF_SESSION.role || 'staff'}`;
        } else {
            scopeLabel.textContent = `Tugas yang di-assign ke ${STAFF_SESSION.name || 'Anda'}`;
        }
    }
    if (role === 'koordinator_divisi') {
        const divLabel = document.getElementById('koor_division_label');
        if (divLabel) {
            divLabel.textContent = `Divisi: ${myDivisionName || 'Belum ada divisi'}`;
        }
    }

    await loadDivisions();
    await loadMyTodayEvents();
    try { await loadKoorTasks(); } catch (e) { console.warn('loadKoorTasks failed', e); }
    await startCamera('att_video');
}

function toggleJobdescPanel() {
    const box = document.getElementById('koor-task-container');
    const btn = document.getElementById('jobdesc_toggle_btn');
    if (!box) return;
    const isHidden = box.classList.contains('hidden');
    if (isHidden) {
        box.classList.remove('hidden');
        if (btn) btn.textContent = 'Tutup';
        try { loadKoorTasks(); } catch (e) { /* ignore */ }
    } else {
        box.classList.add('hidden');
        if (btn) btn.textContent = 'Buka';
    }
}

async function startCamera(videoId) {
    setError('st_action_error', '');
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser tidak mendukung kamera');
        }
        const stream =
            videoId === 'login_video' || videoId === 'reg_video' || videoId === 'att_video'
                ? await acquireFaceUserMedia()
                : await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user' } });
        if (videoId === 'reg_video') CAMERA_STATE.reg_stream = stream;
        else if (videoId === 'login_video') CAMERA_STATE.login_stream = stream;
        else CAMERA_STATE.stream = stream;

        const v = document.getElementById(videoId || 'att_video');
        if (v) {
            v.muted = true;
            v.playsInline = true;
            v.setAttribute('playsinline', '');
            v.setAttribute('webkit-playsinline', '');
            v.srcObject = stream;
            try { await v.play(); } catch (e) {}
        }
    } catch (e) {
        let errId = 'st_action_error';
        if (videoId === 'reg_video') errId = 'reg_face_error';
        else if (videoId === 'login_video') errId = 'face_login_error';
        
        let msg = e.message || 'Gagal membuka kamera';
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            msg = 'Akses Kamera Ditolak! Harus via localhost atau HTTPS';
        }

        setError(errId, msg);
        
        if (videoId === 'login_video') {
            const stat = document.getElementById('face-status-text');
            if (stat) {
                stat.textContent = msg;
                stat.style.color = '#ef4444';
            }
        }
    }
}

function stopCamera() {
    ['stream', 'reg_stream', 'login_stream'].forEach(k => {
        const s = CAMERA_STATE[k];
        if (s && s.getTracks) s.getTracks().forEach(t => t.stop());
        CAMERA_STATE[k] = null;
    });
    ['att_video', 'reg_video', 'login_video'].forEach(id => {
        const v = document.getElementById(id);
        if (v) v.srcObject = null;
    });
}

function capturePhoto() {
    setError('st_action_error', '');
    const v = document.getElementById('att_video');
    if (!v) return;
    const w = v.videoWidth || 640;
    const h = v.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    CAMERA_STATE.photo_data_url = dataUrl;
    const img = document.getElementById('att_preview');
    if (img) img.src = dataUrl;
}

function uploadPhotoFile() {
    setError('st_action_error', '');
    const input = document.getElementById('att_upload');
    const f = input && input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
        CAMERA_STATE.photo_data_url = String(reader.result || '');
        const img = document.getElementById('att_preview');
        if (img) img.src = CAMERA_STATE.photo_data_url;
    };
    reader.readAsDataURL(f);
}

function todayRangeIso() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { from: start.toISOString(), to: end.toISOString() };
}

async function sendAttendanceEvent(event_type) {
    setError('st_action_error', '');
    try {
        const name = document.getElementById('att_name').value.trim();
        const division_id = document.getElementById('att_division').value;
        if (!name) return setError('st_action_error', 'Nama wajib diisi');
        if (!division_id) return setError('st_action_error', 'Divisi wajib dipilih');
        if (!CAMERA_STATE.photo_data_url) return setError('st_action_error', 'Foto wajib ada (ambil/upload)');

        const occurred_at = new Date().toISOString();
        const meta_json = {
            name,
            division_id,
            photo_required: true
        };

        const result = await staffApi('/api/attendance/events', 'POST', {
            staff_id: STAFF_SESSION.staff_id,
            event_type,
            occurred_at,
            source: 'staff_portal',
            note: '',
            meta_json,
            photo_data_url: CAMERA_STATE.photo_data_url
        });

        localStorage.setItem('staff_division_id', division_id);
        STAFF_SESSION.division_id = division_id;
        
        const statusMsg = result.note ? ` (${result.note})` : '';
        notifyUi('success', 'Absensi Berhasil', `<strong>${event_type}</strong> ${statusMsg}`);
        CAMERA_STATE.photo_data_url = '';
        const img = document.getElementById('att_preview');
        if (img) img.src = '';
        await loadMyTodayEvents();
    } catch (e) {
        setError('st_action_error', e.message || 'Gagal kirim absensi');
    }
}

async function loadMyTodayEvents() {
    const tbody = document.getElementById('att_today_rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Loading...</td></tr>`;
    try {
        await ensureStaffDivisionDirectory();
        const r = todayRangeIso();
        const url = `/api/attendance/events?staff_id=${encodeURIComponent(STAFF_SESSION.staff_id)}&from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`;
        const rows = await staffApi(url);

        const seenEvents = new Set();
        const displayRows = [];
        for (const ev of (rows || [])) {
            if (ev.event_type === 'CLOCK_IN' || ev.event_type === 'CLOCK_OUT') {
                if (!seenEvents.has(ev.event_type)) {
                    seenEvents.add(ev.event_type);
                    displayRows.push(ev);
                }
            } else {
                displayRows.push(ev);
            }
        }

        const html = displayRows.map(ev => {
            const meta = ev.meta_json || {};
            const dt = new Date(ev.occurred_at);
            const dateStr = dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':').replace(/:/g, '.');

            return `<tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;">
                <td class="p-3">
                    <div style="font-weight: 500; color: var(--text-main);">${dateStr},</div>
                    <div style="color: var(--text-muted); font-size: 0.8em; margin-top: 2px;">${timeStr}</div>
                </td>
                <td class="p-3 font-bold" style="color: var(--text-main);">${ev.event_type}</td>
                <td class="p-3 text-muted">${meta.division_id ? divisionNameForStaff(meta.division_id) : '-'}</td>
                <td class="p-3">${ev.note || '-'}</td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="4" class="text-muted">Belum ada event</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Gagal load: ${e.message}</td></tr>`;
    }
}

async function initStaffPage() {
    persistAppTenantFromUrl();
    updateFaceTenantHintEl();

    const tenantInput = document.getElementById('st_tenant');
    if (tenantInput) tenantInput.value = STAFF_SESSION.tenant_id || localStorage.getItem('app_tenant_id') || '';
    const regTenantInput = document.getElementById('reg_tenant');
    if (regTenantInput) regTenantInput.value = STAFF_SESSION.tenant_id || localStorage.getItem('app_tenant_id') || '';
    
    const regPinInput = document.getElementById('reg_pin');
    if (regPinInput) regPinInput.value = localStorage.getItem('staff_reg_pin') || '';
    
    if (STAFF_SESSION.token && STAFF_SESSION.tenant_id && STAFF_SESSION.staff_id) {
        await afterLogin();
    } else {
        if (window.location.pathname.includes('/staff.html')) {
            showLanding();
        }
    }
}

/** FACE RECOGNITION EXTENSIONS **/

/** Persist ?tenant= so HP / bookmark tanpa query tetap pakai dapur yang benar setelah sekali buka link admin. */
function persistAppTenantFromUrl() {
    try {
        const q = new URLSearchParams(window.location.search).get('tenant');
        const v = q != null ? String(q).trim() : '';
        if (v) localStorage.setItem('app_tenant_id', v);
    } catch (e) {}
}

/**
 * Tenant untuk /api/facerec/recognize:
 * 1) ?tenant= di URL (QR / link admin)
 * 2) Jika sudah login manual — pakai tenant sesi (hindari bentrok app_tenant_id kiosk lain)
 * 3) app_tenant_id (tersimpan dari URL sebelumnya)
 * 4) tenant di localStorage tanpa token
 * 5) default
 */
function getFaceRecognizeTenantId() {
    try {
        const q = new URLSearchParams(window.location.search).get('tenant');
        if (q && String(q).trim()) return String(q).trim();
    } catch (e) {}

    // If on staff_face_login (relawan portal) and URL tenant missing,
    // use dropdown selection to decide which tenant to write to.
    try {
        const sel = document.getElementById('face_portal_tenant_select');
        if (sel && sel.value && String(sel.value).trim()) {
            const v = String(sel.value).trim();
            if (v !== 'default') return v;
        }
    } catch (e) { /* ignore */ }

    const fromSession = (STAFF_SESSION.tenant_id || '').trim();
    if (fromSession && STAFF_SESSION.token) return fromSession;
    const fromApp = (localStorage.getItem('app_tenant_id') || '').trim();
    if (fromApp) return fromApp;
    const staffSavedTid = (localStorage.getItem('staff_tenant_id') || '').trim();
    if (staffSavedTid && !STAFF_SESSION.token) return staffSavedTid;
    if (fromSession) return fromSession;
    return 'default';
}

/** Update hint line on face login page (kitchen id untuk debug operator). */
function updateFaceTenantHintEl() {
    const el = document.getElementById('face_tenant_hint');
    if (!el) return;
    const tid = getFaceRecognizeTenantId();
    if (tid && tid !== 'default') {
        const short = tid.length > 28 ? `${tid.slice(0, 12)}…${tid.slice(-8)}` : tid;
        el.textContent = `Dapur aktif: ${short}`;
    } else {
        el.textContent = 'Pilih Kitchen / SPPG di dropdown agar tenant aktif.';
    }
}

function updateFacePortalReadinessHint() {
    if (!window.location.pathname.includes('staff_face_login')) return;
    const statusText = document.getElementById('face-status-text');
    if (!statusText) return;
    const tenantId = String(getFaceRecognizeTenantId() || '').trim();
    const hasTenant = !!tenantId && tenantId !== 'default';
    const online = typeof navigator === 'undefined' ? true : !!navigator.onLine;
    const video = document.getElementById('login_video');
    const camReady = !!(video && video.videoWidth > 0 && video.videoHeight > 0);
    if (!hasTenant) {
        statusText.textContent = 'Pilih Kitchen / SPPG terlebih dahulu';
        statusText.style.color = '#fbbf24';
        return;
    }
    if (!online) {
        statusText.textContent = 'Offline — cek koneksi internet';
        statusText.style.color = '#f87171';
        return;
    }
    if (!camReady) {
        statusText.textContent = 'Menyiapkan kamera...';
        statusText.style.color = '#93c5fd';
        return;
    }
    statusText.textContent = 'Siap absensi — tekan Clock In atau Clock Out';
    statusText.style.color = '#a7f3d0';
}

async function initRelawanTenantDropdown() {
    const sel = document.getElementById('face_portal_tenant_select');
    if (!sel) return;

    sel.innerHTML = `<option value="">Memuat data tenant...</option>`;
    sel.disabled = true;
    setError('face_portal_tenant_error', '');

    try {
        const tenants = await staffApi('/api/tenants');
        const list = Array.isArray(tenants) ? tenants : [];
        // Cache list for relawan success message rendering.
        window.__RELAWAN_TENANTS_LIST = list;
        window.__RELAWAN_TENANTS_MAP = {};
        list.forEach(t => { window.__RELAWAN_TENANTS_MAP[String(t.id)] = t.name || t.id; });
        if (list.length === 0) {
            sel.innerHTML = `<option value="">Tenant tidak tersedia</option>`;
            setError('face_portal_tenant_error', 'Tenant aktif belum tersedia di sistem.');
            sel.disabled = false;
            return;
        }

        const urlTid = (() => {
            try { return new URLSearchParams(window.location.search).get('tenant') || ''; } catch (e) { return ''; }
        })();
        const storedTid = String(localStorage.getItem('relawan_selected_tenant_id') || '').trim();
        let selected = '';
        if (urlTid) selected = urlTid;
        else if (storedTid) selected = storedTid;
        else selected = list[0].id;

        // If selected does not exist in list, fallback to first.
        if (!list.find(t => String(t.id) === String(selected))) selected = list[0].id;

        sel.innerHTML = list
            .map(t => `<option value="${t.id}">${String(t.name || t.id)}</option>`)
            .join('');
        sel.value = selected;
        localStorage.setItem('relawan_selected_tenant_id', String(selected));

        setError('face_portal_tenant_error', '');
        sel.disabled = false;
        if (!sel.dataset.bindDone) {
            sel.addEventListener('change', () => {
                const val = String(sel.value || '').trim();
                if (val) localStorage.setItem('relawan_selected_tenant_id', val);
                updateFaceTenantHintEl();
                updateFacePortalReadinessHint();
            });
            sel.dataset.bindDone = '1';
        }
        updateFaceTenantHintEl();
        updateFacePortalReadinessHint();
    } catch (e) {
        sel.innerHTML = `<option value="">Gagal memuat tenant</option>`;
        setError('face_portal_tenant_error', e.message || 'Gagal memuat daftar tenant.');
        sel.disabled = false;
        updateFacePortalReadinessHint();
    }
}

function clearFaceMatchLabelsForPortal() {
    ['face_match_name', 'face_match_tenant', 'face_match_code', 'face_match_division'].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.textContent = '-';
    });
}

function updateFaceAbsenActionButtons() {
    const tf = window.TEMP_FACE_STAFF;
    const ok = !!(tf && String(tf.tenant_id || '').trim() && String(tf.staff_code || '').trim());
    ['btn-face-clock-in', 'btn-face-clock-out'].forEach((id) => {
        const b = document.getElementById(id);
        if (b) {
            b.disabled = !ok;
            b.style.opacity = ok ? '' : '0.55';
            b.style.cursor = ok ? 'pointer' : 'not-allowed';
        }
    });
}

/** Kode staf untuk portal absensi sederhana: URL ?staff_code= / ?code= lalu sessionStorage. */
function getFacePortalStaffCodeFromUrlOrSession() {
    try {
        const q = new URLSearchParams(window.location.search);
        const c = String(q.get('staff_code') || q.get('code') || '').trim();
        if (c) return c;
    } catch (e) { /* ignore */ }
    try {
        return String(sessionStorage.getItem('face_portal_staff_code') || '').trim();
    } catch (e) {
        return '';
    }
}

/** Halaman staff_face_login: hanya kamera depan, tanpa deteksi wajah otomatis. */
async function beginStaffFaceSimplePortal() {
    if (!window.location.pathname.includes('staff_face_login')) return;
    FACE_RECOGNITION_ACTIVE = false;
    setError('face_login_error', '');
    setVisible('face-scan-state', true);
    const st = document.getElementById('face-status-text');
    if (st) {
        st.textContent = 'Menyalakan kamera…';
        st.style.color = '#fff';
    }

    // On HP relawan, we don't rely on ?tenant=UUID. Operator picks the kitchen/SPPG in dropdown.
    await initRelawanTenantDropdown();

    await startCamera('login_video');
    const st2 = document.getElementById('face-status-text');
    if (st2) {
        st2.textContent = 'Kamera aktif — tekan Clock In atau Clock Out';
        st2.style.color = '#a7f3d0';
    }
    updateFacePortalReadinessHint();
}

/**
 * Recognize: parse JSON meski non-2xx agar hint server (404 staff) tampil di HP, bukan hanya "HTTP 404".
 */
async function postFacerecRecognize(image_data, tenant_id) {
    const headers = { 'Content-Type': 'application/json' };
    if (STAFF_SESSION.token && !headers['Authorization']) headers['Authorization'] = 'Bearer ' + STAFF_SESSION.token;
    if (STAFF_SESSION.tenant_id && !headers['x-tenant-id']) headers['x-tenant-id'] = STAFF_SESSION.tenant_id;
    const base = getApiBase();
    let url = '/api/facerec/recognize';
    if (base) {
        try {
            url = new URL(url, base + '/').toString();
        } catch (e) {
            url = base + (url.startsWith('/') ? url : '/' + url);
        }
    }
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image_data, tenant_id })
    });
    const raw = await res.text();
    let data = {};
    try {
        data = raw ? JSON.parse(raw) : {};
    } catch (e) {
        data = {};
    }
    if (!res.ok) {
        const msg = [data.hint, data.error, data.message].find(x => x && String(x).trim()) || raw || `HTTP ${res.status}`;
        const err = new Error(String(msg));
        err.status = res.status;
        err.payload = data;
        throw err;
    }
    return data;
}

function isMobileDevice() {
    return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
}

/** No hard `min` width/height — that often triggers OverconstrainedError on phones. Try HD, then VGA, then default. */
async function acquireFaceUserMedia() {
    const mobile = isMobileDevice();
    const attempts = [
        {
            audio: false,
            video: {
                facingMode: 'user',
                ...(mobile
                    ? { width: { ideal: 1280 }, height: { ideal: 720 } }
                    : { width: { ideal: 960 }, height: { ideal: 540 } })
            }
        },
        { audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
        { audio: false, video: { facingMode: 'user' } }
    ];
    let lastErr = null;
    for (const c of attempts) {
        try {
            return await navigator.mediaDevices.getUserMedia(c);
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('Gagal membuka kamera');
}

/**
 * Shared pipeline for register + recognize (same center-crop strategy so embedding domain matches).
 * - register: higher max dimension + JPEG quality (especially desktop was 640 before — weak template).
 * - recognize: 640px cap + moderate JPEG = fast upload; server decode cap keeps latency predictable.
 */
function captureVideoFrameForFaceRecognition(videoEl, opts = {}) {
    const mode = opts.mode === 'register'
        ? 'register'
        : (opts.mode === 'attendance' ? 'attendance' : 'recognize');
    const vw = videoEl.videoWidth || 0;
    const vh = videoEl.videoHeight || 0;
    if (vw < 2 || vh < 2) return null;
    const mobile = isMobileDevice();
    const maxDim = mode === 'register'
        ? 960
        : (mode === 'attendance'
            ? (mobile ? 640 : 640)
            : (mobile ? 800 : 720));

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    const crop = mobile ? 0.82 : 0.88;
    sw = Math.round(vw * crop);
    sh = Math.round(vh * crop);
    sx = Math.round((vw - sw) / 2);
    sy = Math.round((vh - sh) / 2);

    let tw = sw;
    let th = sh;
    if (Math.max(sw, sh) > maxDim) {
        const scale = maxDim / Math.max(sw, sh);
        tw = Math.round(sw * scale);
        th = Math.round(sh * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (ctx && 'imageSmoothingQuality' in ctx) {
        ctx.imageSmoothingQuality = mode === 'register' ? 'high' : 'medium';
    }
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, tw, th);
    let q;
    if (mode === 'register') {
        q = mobile ? 0.95 : 0.92;
    } else if (mode === 'attendance') {
        q = mobile ? 0.82 : 0.84;
    } else {
        q = mobile ? 0.94 : 0.92;
    }
    return canvas.toDataURL('image/jpeg', q);
}

let FACE_RECOGNITION_ACTIVE = false;

function showFaceRegister() {
    setVisible('staff-login', false);
    setVisible('staff-face-register', true);
    startCamera('reg_video');
}

function hideFaceRegister() {
    if (window.location.pathname.includes('staff_register.html')) {
        window.location.href = 'staff.html';
    } else {
        showLanding();
    }
}

async function submitFaceRegistration() {
    setError('reg_face_error', '');
    try {
        const tenant_id = document.getElementById('reg_tenant').value.trim();
        const name = document.getElementById('reg_name').value.trim();
        const division = document.getElementById('reg_division').value.trim();
        const pin = document.getElementById('reg_pin').value.trim();
        
        if (!tenant_id || !name || !division || !pin) {
            return setError('reg_face_error', 'Harap isi semua data pendaftaran');
        }

        const v = document.getElementById('reg_video');
        if (!v || v.videoWidth === 0) {
            return setError('reg_face_error', 'Kamera belum siap, mohon tunggu sebentar.');
        }

        const dataUrl = captureVideoFrameForFaceRecognition(v, { mode: 'register' });
        if (!dataUrl || dataUrl.length < 1000) {
            return setError('reg_face_error', 'Gagal menangkap gambar, silakan coba lagi.');
        }

        notifyUi('info', 'Face Reg', 'Sedang memproses pendaftaran...');

        const registrationResult = await staffApi('/api/facerec/register', 'POST', {
            tenant_id,
            name,
            division,
            pin,
            image_data: dataUrl
        });

        const generatedPin = registrationResult.generated_pin || '000000';

        notifyUi(
            'success',
            'Pendaftaran berhasil',
            `Data wajah tersimpan. PIN login: ${generatedPin}`,
            { durationMs: 10000 }
        );

        openModalUi({
            title: 'Pendaftaran Berhasil!',
            bodyHtml: `
                <div class="text-center p-6">
                    <div style="font-size: 4rem; color: var(--success); margin-bottom: 1.5rem;">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin-bottom: 1rem;">Selamat, ${name}!</h3>
                    <p style="color: var(--text-muted); line-height: 1.6; font-size: 1.1rem; margin-bottom: 1.5rem;">
                        Disimpan sebagai <strong>Relawan ${division}</strong>
                    </p>
                    
                    <div style="background: var(--bg-card-soft); border: 2px dashed var(--secondary); border-radius: var(--radius); padding: 1.5rem; margin-bottom: 1.5rem;">
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">PIN LOGIN ANDA</p>
                        <div style="font-size: 2.5rem; font-weight: 800; color: var(--secondary); letter-spacing: 0.2em; font-family: monospace;">${generatedPin}</div>
                    </div>

                    <p style="font-size: 0.875rem; color: var(--text-muted); font-style: italic;">
                        Catat PIN di atas! Gunakan PIN ini untuk login jika wajah tidak terbaca.
                    </p>

                    <div class="mt-6 p-3 bg-gray-50 rounded text-sm text-primary font-medium">
                        Kembali ke menu utama dalam <span id="reg_countdown">10</span> detik...
                    </div>
                </div>
            `,
            actions: [{ label: 'Tutup Sekarang', className: 'btn btn-primary', onClick: () => { hideFaceRegister(); closeModalUi(); } }]
        });

        let count = 10;
        const timer = setInterval(() => {
            count--;
            const el = document.getElementById('reg_countdown');
            if (el) el.textContent = count;
            if (count <= 0) {
                clearInterval(timer);
                hideFaceRegister();
                closeModalUi();
            }
        }, 1000);
    } catch (e) {
        if (e.status === 409) {
            openModalUi({
                title: 'Data Sudah Terdaftar',
                bodyHtml: `
                    <div class="text-center p-6">
                        <div style="font-size: 3rem; color: var(--warning); margin-bottom: 1.5rem;">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin-bottom: 1rem;">Mohon Maaf</h3>
                        <p style="color: var(--text-muted); line-height: 1.6; font-size: 1.1rem;">${(e.message || 'Data ini sudah terdaftar di sistem.').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                    </div>
                `,
                actions: [{ label: 'Tutup', className: 'btn btn-secondary', onClick: closeModalUi }]
            });
        } else {
            setError('reg_face_error', e.message || 'Gagal mendaftarkan wajah');
        }
    }
}

/** staff_face_login: mulai ulang kamera (tanpa deteksi wajah). */
async function resetStaffFaceAbsenLanding() {
    if (window.location.pathname.includes('staff_face_login')) {
        FACE_RECOGNITION_ACTIVE = false;
        setError('face_login_error', '');
        const successPage = document.getElementById('face-success-page');
        if (successPage) successPage.classList.add('hidden');
        const locRejectPage = document.getElementById('face-location-reject-page');
        if (locRejectPage) locRejectPage.classList.add('hidden');
        const scanState = document.getElementById('face-scan-state');
        if (scanState) scanState.classList.remove('hidden');
        const absenPanel = document.getElementById('face-absen-panel');
        if (absenPanel) absenPanel.classList.remove('hidden');
        await startCamera('login_video');
        const st = document.getElementById('face-status-text');
        if (st) {
            st.textContent = 'Kamera aktif — tekan Clock In atau Clock Out';
            st.style.color = '#a7f3d0';
        }
        return;
    }
    FACE_RECOGNITION_ACTIVE = false;
    stopCamera();
    window.TEMP_FACE_STAFF = null;
    const ov = document.getElementById('face-scan-overlay');
    if (ov) ov.style.display = '';
    const st = document.getElementById('face-status-text');
    if (st) {
        st.textContent = 'Mendeteksi...';
        st.style.color = '#fff';
    }
    if (document.getElementById('face-start-state')) {
        setVisible('face-start-state', true);
        setVisible('face-scan-state', false);
        setVisible('face-pin-state', false);
    }
}

async function initStaffFaceAbsenPage() {
    if (!window.location.pathname.includes('staff_face_login')) return;
    try {
        const t = getFaceRecognizeTenantId();
        if (t && t !== 'default') localStorage.setItem('app_tenant_id', t);
    } catch (e) { /* ignore */ }
    if (typeof updateFaceTenantHintEl === 'function') updateFaceTenantHintEl();
    await beginStaffFaceSimplePortal();
    if (!window.__FACE_PORTAL_NET_BIND_DONE) {
        window.addEventListener('online', updateFacePortalReadinessHint);
        window.addEventListener('offline', updateFacePortalReadinessHint);
        window.__FACE_PORTAL_NET_BIND_DONE = true;
    }
}

async function toggleFaceLogin() {
    FACE_RECOGNITION_ACTIVE = !FACE_RECOGNITION_ACTIVE;
    if (FACE_RECOGNITION_ACTIVE) {
        window.TEMP_FACE_STAFF = null;
        const _reset = (id, fallback = '-') => {
            const el = document.getElementById(id);
            if (el) el.textContent = fallback;
        };
        _reset('face_match_name', '-');
        _reset('face_match_tenant', '-');
        _reset('face_match_code', '-');
        _reset('face_match_division', '-');
        setVisible('face-pin-state', false);
        setVisible('face-scan-state', true);
        setVisible('staff-face-login', true);
        if (document.getElementById('face-start-state')) setVisible('face-start-state', false);
        const btn = document.getElementById('btn-face-login');
        if (btn) btn.classList.add('btn-pulse');
        const ovStart = document.getElementById('face-scan-overlay');
        if (ovStart) ovStart.style.display = '';
        const st = document.getElementById('face-status-text');
        if (st) {
            st.textContent = 'Mencari wajah…';
            st.style.color = '#fff';
        }
        await startCamera('login_video');
        runFaceRecognitionLoop();
    } else {
        if (window.location.pathname.includes('staff_face_login')) {
            resetStaffFaceAbsenLanding();
        } else {
            showLanding();
        }
    }
}

async function runFaceRecognitionLoop() {
    const statusText = document.getElementById('face-status-text');
    let failCount = 0;
    let isProcessing = false;
    // Gap between attempts: mobile keeps light cadence; desktop slightly tighter than 2s so UX feels snappier after DeepFace returns.
    const scanIntervalMs = isMobileDevice() ? 950 : 1200;

    while (FACE_RECOGNITION_ACTIVE) {
        if (isProcessing) {
            await new Promise(r => setTimeout(r, 500));
            continue;
        }

        try {
            const v = document.getElementById('login_video');
            if (!v || v.paused || v.ended) break;

            isProcessing = true;
            statusText.textContent = "Scanning...";
            statusText.style.color = 'var(--secondary)';

            if (!v.videoWidth || !v.videoHeight) {
                isProcessing = false;
                await new Promise(r => setTimeout(r, 400));
                continue;
            }
            const dataUrl = captureVideoFrameForFaceRecognition(v, { mode: 'recognize' });
            if (!dataUrl || dataUrl.length < 800) {
                isProcessing = false;
                await new Promise(r => setTimeout(r, 400));
                continue;
            }

            const tenant_id = getFaceRecognizeTenantId();
            const result = await postFacerecRecognize(dataUrl, tenant_id);

            isProcessing = false;

            if (result && result.verified && result.staff) {
                const scode = (result.staff.staff_code != null ? String(result.staff.staff_code) : '').trim();
                if (!scode) {
                    statusText.textContent = 'Wajah cocok tetapi staf tanpa kode — hubungi admin';
                    statusText.style.color = '#fbbf24';
                    await new Promise(r => setTimeout(r, scanIntervalMs));
                    continue;
                }
                statusText.textContent = `Wajah Dikenali: ${result.staff.name}`;
                statusText.style.color = '#4ade80';
                FACE_RECOGNITION_ACTIVE = false;
                const faceOnlyPage = window.location.pathname.includes('staff_face_login');
                if (faceOnlyPage) {
                    try {
                        if (v) v.play();
                    } catch (e) { /* ignore */ }
                    const ov = document.getElementById('face-scan-overlay');
                    if (ov) ov.style.display = 'none';
                    statusText.textContent = 'Siap absensi — Clock In / Out mengambil foto + lokasi';
                    statusText.style.color = '#86efac';
                    setVisible('face-scan-state', true);
                } else {
                    if (v) v.pause();
                    stopCamera();
                    setVisible('face-scan-state', false);
                }

                window.TEMP_FACE_STAFF = {
                    tenant_id: (result.staff.tenant_id || tenant_id || '').trim(),
                    staff_code: scode
                };

                const elName = document.getElementById('face_match_name');
                if (elName) elName.textContent = result.staff.name;
                const elTen = document.getElementById('face_match_tenant');
                if (elTen) elTen.textContent = result.staff.tenant_name || result.staff.tenant_id;
                const elCode = document.getElementById('face_match_code');
                if (elCode) elCode.textContent = result.staff.staff_code;
                const divEl = document.getElementById('face_match_division');
                if (divEl) divEl.textContent = result.staff.division_id || '-';

                if (!faceOnlyPage) setVisible('face-pin-state', true);
                if (faceOnlyPage) updateFaceAbsenActionButtons();
                await loadFaceStaffHistory();
                notifyUi('success', 'Face Match', 'Wajah dikenali! Silakan Clock In / Out.');
                break;
            } else {
                statusText.textContent = result?.message || "Scanning...";
            }
        } catch (e) {
            isProcessing = false;
            failCount++;
            const msg = e && e.message ? String(e.message) : 'Jaringan error';
            if (failCount <= 3 || failCount % 5 === 0) {
                statusText.textContent = msg.length > 72 ? msg.slice(0, 69) + '…' : msg;
                statusText.style.color = '#f87171';
            }
            if (failCount > 12) statusText.textContent = 'Cek koneksi / tenant dapur (?tenant=UUID)';
            await new Promise(r => setTimeout(r, 1000));
        }
        await new Promise(r => setTimeout(r, scanIntervalMs));
    }
}

async function submitFacePinLogin() {
    setError('face_login_error', '');
    try {
        const pin = document.getElementById('face_login_pin').value.trim();
        if (!pin) return setError('face_login_error', 'PIN wajib diisi');
        const tf = window.TEMP_FACE_STAFF;
        if (!tf || !String(tf.tenant_id || '').trim() || !String(tf.staff_code || '').trim()) {
            return setError('face_login_error', 'Sesi wajah berakhir — scan wajah ulang.');
        }
        const { tenant_id, staff_code } = tf;
        const r = await staffApi('/auth/staff/code-login', 'POST', { tenant_id, staff_code, pin });
        STAFF_SESSION = { token: r.token, tenant_id: r.tenant_id, staff_id: r.staff.id, name: r.staff.name, role: r.staff.role, division_id: r.staff.division_id, login_method: 'face' };
        Object.keys(STAFF_SESSION).forEach(k => localStorage.setItem(`staff_${k}`, STAFF_SESSION[k]));
        notifyUi('success', 'Login', `Selamat datang, ${STAFF_SESSION.name}`);
        toggleFaceLogin();
        await afterLogin();
    } catch (e) {
        setError('face_login_error', e.message || 'Gagal login');
    }
}

function getCurrentLocationQuick(timeoutMs = 2500, maximumAgeMs = 120000) {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const safeTimeout = Math.max(800, Number(timeoutMs || 2500));
        const t = setTimeout(() => resolve(null), safeTimeout + 200);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                clearTimeout(t);
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    captured_at: new Date().toISOString()
                });
            },
            () => {
                clearTimeout(t);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: safeTimeout, maximumAge: Math.max(0, Number(maximumAgeMs || 0)) }
        );
    });
}

function approxDataUrlBytes(dataUrl) {
    const raw = String(dataUrl || '');
    const comma = raw.indexOf(',');
    const payload = comma >= 0 ? raw.slice(comma + 1) : raw;
    if (!payload) return 0;
    const len = payload.length;
    const pad = payload.endsWith('==') ? 2 : (payload.endsWith('=') ? 1 : 0);
    return Math.max(0, Math.floor((len * 3) / 4) - pad);
}

function createClientEventId() {
    try {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
    } catch (e) {}
    return `ce-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function setFaceAttendanceSubmittingState(isSubmitting) {
    const busy = !!isSubmitting;
    ['btn-face-clock-in', 'btn-face-clock-out'].forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const baseLabel = id === 'btn-face-clock-in'
            ? '<i class="fas fa-play mr-1"></i> Clock In'
            : '<i class="fas fa-stop mr-1"></i> Clock Out';
        if (!btn.dataset.baseLabel) btn.dataset.baseLabel = baseLabel;
        btn.disabled = busy;
        btn.style.opacity = busy ? '0.65' : '';
        btn.style.cursor = busy ? 'progress' : '';
        btn.innerHTML = busy ? '<i class="fas fa-spinner fa-spin mr-1"></i> Mengirim...' : btn.dataset.baseLabel;
    });
}

async function submitFaceAttendance(event_type) {
    if (window._faceAttSubmitting) return;
    try {
        const submitStartedAt = Date.now();
        const simplePortal = window.location.pathname.includes('staff_face_login');
        let tenant_id;
        let staff_code;
        if (simplePortal) {
            tenant_id = String(getFaceRecognizeTenantId() || '').trim();
            if (!tenant_id || tenant_id === 'default') {
                notifyUi('error', 'Absensi', 'Pilih Kitchen / SPPG dulu dari dropdown.');
                return;
            }
            // Relawan capture: tidak butuh staff_code. Analisis face + mapping ke staff dilakukan di portal staff/HR.
            staff_code = '';
        } else {
            const tf = window.TEMP_FACE_STAFF;
            if (!tf || !String(tf.tenant_id || '').trim() || !String(tf.staff_code || '').trim()) {
                notifyUi('error', 'Absensi', 'Data wajah belum lengkap — scan wajah ulang.');
                return;
            }
            tenant_id = String(tf.tenant_id || '').trim();
            staff_code = String(tf.staff_code || '').trim();
        }
        const v = document.getElementById('login_video');
        if (!v || !v.videoWidth || !v.videoHeight) {
            notifyUi('error', 'Absensi', 'Kamera tidak siap. Muat ulang halaman dan izinkan kamera.');
            return;
        }
        const photo_data_url = captureVideoFrameForFaceRecognition(v, { mode: 'attendance' });
        if (!photo_data_url || photo_data_url.length < 800) {
            notifyUi('error', 'Absensi', 'Gagal mengambil foto. Pastikan kamera menyala.');
            return;
        }
        const photoBytes = approxDataUrlBytes(photo_data_url);
        const clientEventId = createClientEventId();

        window._faceAttSubmitting = true;
        setFaceAttendanceSubmittingState(true);
        const statusText = document.getElementById('face-status-text');
        if (statusText) {
            statusText.textContent = 'Mengirim data absensi...';
            statusText.style.color = '#93c5fd';
        }
        notifyUi('info', 'Absensi', 'Mengirim foto & lokasi…');

        const geoStartAt = Date.now();
        const geoTimeoutMs = simplePortal ? 10000 : 2500;
        const geoMaximumAgeMs = simplePortal ? 120000 : 90000;
        const geo = await getCurrentLocationQuick(geoTimeoutMs, geoMaximumAgeMs);
        const geoWaitMs = Date.now() - geoStartAt;
        if (!geo) {
            notifyUi(
                'error',
                'Absensi',
                'Lokasi GPS wajib — izinkan akses lokasi di browser lalu coba lagi (tunggu sampai titik GPS muncul).'
            );
            return;
        }
        const endpoint = simplePortal
            ? '/api/attendance/events/relawan-capture'
            : '/api/attendance/events/direct';

        const body = simplePortal
            ? {
                tenant_id,
                event_type,
                occurred_at: new Date().toISOString(),
                source: 'face_portal',
                photo_data_url
            }
            : {
                tenant_id,
                staff_code,
                event_type,
                occurred_at: new Date().toISOString(),
                source: 'face_portal',
            };
        body.client_event_id = clientEventId;
        body.client_metrics = {
            submit_started_at: new Date(submitStartedAt).toISOString(),
            photo_bytes: photoBytes,
            geo_wait_ms: geoWaitMs,
            portal: simplePortal ? 'relawan' : 'staff',
        };
        body.latitude = geo.latitude;
        body.longitude = geo.longitude;
        body.geo_accuracy = geo.accuracy;
        body.geo_captured_at = geo.captured_at;

        const reqStartAt = Date.now();
        const result = await staffApi(endpoint, 'POST', body);
        const reqMs = Date.now() - reqStartAt;

        const locHint = ' Lokasi tercatat.';
        const dedupeHint = result?.duplicate ? ' (duplikat request terdeteksi, data existing dipakai)' : '';
        const statusMsg = result.note ? ` (${result.note})` : '';
        if (simplePortal) {
            const humanLabel = event_type === 'CLOCK_IN' ? 'masuk' : (event_type === 'CLOCK_OUT' ? 'keluar' : event_type);

            const tenants = window.__RELAWAN_TENANTS_LIST || [];
            const t = tenants.find(x => String(x.id) === String(tenant_id)) || null;
            const tenantName = t ? (t.name || t.id) : tenant_id;

            const spggLabel = formatRelawanSpggLabel(tenantName);
            showRelawanAbsensiSuccessPage({
                humanLabel,
                spggLabel
            });
            notifyUi(
                'success',
                'Absensi',
                `${event_type} berhasil${dedupeHint}. Upload ~${Math.round(photoBytes / 1024)}KB, respon ${reqMs}ms.${locHint}`
            );
        } else {
            notifyUi('success', 'Absensi Berhasil', `<strong>${event_type}</strong>${statusMsg}${dedupeHint}${locHint}`);
        }

        if (event_type === 'CLOCK_OUT' && !window.location.pathname.includes('staff_face_login')) {
            setTimeout(showLanding, 1500);
        } else if (document.getElementById('face_history_rows') && window.TEMP_FACE_STAFF) {
            await loadFaceStaffHistory();
        }

        // Auto-refresh card "Riwayat Hari Ini" di portal staff utama supaya event baru
        // langsung muncul tanpa perlu klik tombol Refresh.
        if (!simplePortal && document.getElementById('att_today_rows')) {
            try { await loadMyTodayEvents(); } catch (e) { /* ignore */ }
        }
    } catch (e) {
        const simplePortal = window.location.pathname.includes('staff_face_login');
        if (isRelawanAttendanceLocationPolicyError(e, simplePortal)) {
            showRelawanLocationRejectedPage({ serverMessage: e.message, body: e.body });
        } else {
            notifyUi('error', 'Absensi', e.message);
        }
    } finally {
        window._faceAttSubmitting = false;
        setFaceAttendanceSubmittingState(false);
        updateFacePortalReadinessHint();
    }
}

function formatRelawanSpggLabel(tenantName) {
    const n = String(tenantName || '').trim();
    if (!n) return '-';
    if (/SPPG/i.test(n)) return n;
    return `SPPG ${n}`;
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** True jika error dari API absensi relawan terkait kebijakan lokasi / titik dapur (bukan error jaringan generik). */
function isRelawanAttendanceLocationPolicyError(err, simplePortal) {
    if (!simplePortal || !err || err.status !== 400) return false;
    const b = err.body;
    if (b && (Number.isFinite(Number(b.distance_m)) || Number.isFinite(Number(b.max_geo_radius_m)))) return true;
    const m = String(err.message || '');
    return /di luar radius|radius kebijakan|terukur|Titik GPS dapur belum|tidak dapat divalidasi jarak|Lokasi GPS wajib untuk absensi/i.test(m);
}

/**
 * Tampilan penuh untuk relawan: lokasi tidak memenuhi kebijakan — arahkan absensi ulang.
 * Data tidak tersimpan di server; ini hanya UX (server tetap 400).
 */
function showRelawanLocationRejectedPage({ serverMessage, body }) {
    try { FACE_RECOGNITION_ACTIVE = false; } catch (e) { /* ignore */ }
    try { stopCamera(); } catch (e) { /* ignore */ }

    const scanState = document.getElementById('face-scan-state');
    const absenPanel = document.getElementById('face-absen-panel');
    const successPage = document.getElementById('face-success-page');
    const rejectPage = document.getElementById('face-location-reject-page');
    const statusText = document.getElementById('face-status-text');

    if (scanState) scanState.classList.add('hidden');
    if (absenPanel) absenPanel.classList.add('hidden');
    if (successPage) successPage.classList.add('hidden');
    if (rejectPage) rejectPage.classList.remove('hidden');

    if (statusText) {
        statusText.textContent = '';
        statusText.style.color = '#fff';
    }

    const titleEl = document.getElementById('face-location-reject-title');
    const msgEl = document.getElementById('face-location-reject-message');
    const detailEl = document.getElementById('face-location-reject-detail');

    const dm = body != null ? Number(body.distance_m) : NaN;
    const rm = body != null ? Number(body.max_geo_radius_m) : NaN;
    const hasDist = Number.isFinite(dm) && Number.isFinite(rm);

    if (titleEl) {
        titleEl.textContent = hasDist ? 'Lokasi tidak sesuai' : 'Absensi tidak dapat diproses';
    }
    if (msgEl) {
        const main = String(serverMessage || 'Lokasi Anda tidak memenuhi kebijakan absensi untuk kitchen ini.').trim();
        msgEl.innerHTML = escapeHtml(main);
    }
    if (detailEl) {
        if (hasDist) {
            detailEl.innerHTML =
                `Jarak ke titik dapur: sekitar <strong>${escapeHtml(String(Math.round(dm)))} m</strong> ` +
                `(maksimum menurut kebijakan: <strong>${escapeHtml(String(Math.round(rm)))} m</strong>). ` +
                'Pastikan Anda berada di area yang benar, lalu coba absensi lagi.';
        } else if (/Titik GPS dapur belum/i.test(String(serverMessage || ''))) {
            detailEl.textContent =
                'Titik lokasi dapur di sistem belum diatur oleh admin. Hubungi pengurus dapur/SPPG, atau pilih kitchen yang benar.';
        } else {
            detailEl.textContent =
                'Pastikan izin lokasi aktif, tunggu GPS stabil, dan Anda berada di area dapur/SPPG yang dipilih. ' +
                'Kemudian tekan tombol di bawah untuk absensi kembali.';
        }
    }
}

function showRelawanAbsensiSuccessPage({ humanLabel, spggLabel }) {
    // Stop scanning & show the "success page" (page-style, not toast).
    try { FACE_RECOGNITION_ACTIVE = false; } catch (e) { /* ignore */ }
    try { stopCamera(); } catch (e) { /* ignore */ }

    const scanState = document.getElementById('face-scan-state');
    const absenPanel = document.getElementById('face-absen-panel');
    const successPage = document.getElementById('face-success-page');
    const locRejectPage = document.getElementById('face-location-reject-page');
    const statusText = document.getElementById('face-status-text');

    if (scanState) scanState.classList.add('hidden');
    if (absenPanel) absenPanel.classList.add('hidden');
    if (locRejectPage) locRejectPage.classList.add('hidden');
    if (successPage) successPage.classList.remove('hidden');

    if (statusText) {
        statusText.textContent = '';
        statusText.style.color = '#fff';
    }

    const msgEl = document.getElementById('face-success-message');
    if (msgEl) {
        const cap = humanLabel === 'masuk' || humanLabel === 'keluar' ? humanLabel : String(humanLabel || '');
        msgEl.innerHTML = `Anda sudah berhasil absen <strong>${escapeHtml(cap)}</strong> di <strong>${escapeHtml(spggLabel)}</strong>.`;
    }
}

async function loadFaceStaffHistory() {
    const tbody = document.getElementById('face_history_rows');
    if (!tbody || !window.TEMP_FACE_STAFF) return;
    try {
        const { tenant_id, staff_code } = window.TEMP_FACE_STAFF;
        const r = todayRangeIso();
        const rows = await staffApi(`/api/attendance/events/raw?tenant_id=${tenant_id}&staff_code=${staff_code}&from=${r.from}&to=${r.to}`);
        tbody.innerHTML = (rows || []).map(ev => `
            <tr>
                <td class="p-3">${new Date(ev.occurred_at).toLocaleTimeString()}</td>
                <td class="p-3 font-bold">${ev.event_type}</td>
                <td class="p-3">${ev.meta_json?.division_id || '-'}</td>
                <td class="p-3">${ev.note || '-'}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="text-center p-4">Belum ada riwayat</td></tr>';
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4">Gagal load</td></tr>'; }
}

/** KOORDINATOR TASK FUNCTIONS **/

function showKoorTasks() {
    const container = document.getElementById('koor-task-container');
    if (!container) return;
    const isHidden = container.classList.contains('hidden');
    setVisible('koor-task-container', isHidden);
    if (isHidden) loadKoorTasks();
}

async function loadKoorTasks() {
    const list = document.getElementById('koor_task_list');
    const badge = document.getElementById('jobdesc_count_badge');
    if (!list) return;
    list.innerHTML = `<div class="text-center p-4 text-muted small italic">Memuat tugas...</div>`;

    try {
        await ensureStaffDivisionDirectory();
        const resp = await staffApi('/api/tasks/my');
        const tasks = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.tasks) ? resp.tasks : []);
        const actor = (resp && resp.actor) || null;
        if (badge) {
            const pendingCount = tasks.filter(t => {
                const s = String(t.status || 'PENDING').toUpperCase();
                return s !== 'DONE' && s !== 'COMPLETED' && s !== 'CANCELLED';
            }).length;
            badge.textContent = `${pendingCount}/${tasks.length}`;
        }
        if (!tasks.length) {
            const actorDivisionName = actor && actor.division_id ? divisionNameForStaff(actor.division_id) : '';
            const msg = actor && actor.can_see_all
                ? 'Belum ada tugas di tenant ini — publish plan dari War Room dulu.'
                : (actorDivisionName
                    ? `Belum ada tugas untuk divisi ${actorDivisionName}.`
                    : 'Belum ada tugas yang di-assign ke Anda.');
            list.innerHTML = `<div class="text-center p-4 text-muted small">${msg}</div>`;
            return;
        }

        list.innerHTML = tasks.map(t => {
            const status = String(t.status || 'PENDING').toUpperCase();
            const isDone = (status === 'DONE' || status === 'COMPLETED');
            const isRunning = (status === 'IN_PROGRESS');
            const when = t.start_time
                ? t.start_time.replace('T', ' ').slice(0, 16)
                : (t.due_date ? t.due_date.split('T')[0] : '');
            const color = isDone ? '#22c55e' : (isRunning ? '#f59e0b' : '#3b82f6');
            const divisionLabel = t.division_id ? divisionNameForStaff(t.division_id) : 'Umum';

            // --- Quantity chips (porsi + material) --------------------------
            const chipBase = 'display:inline-block; padding:2px 8px; border-radius:999px; font-size:0.65rem; font-weight:600;';
            let qtyChips = '';
            if (t.portion_count) {
                const subTotal = t.total_portions ? ` / ${t.total_portions}` : '';
                qtyChips += `<span style="${chipBase} background:#2563eb; color:#fff; margin-right:4px;">${t.portion_count} porsi${subTotal}</span>`;
            }
            let layerText = '';
            try {
                const q = t.quantity_detail_json ? JSON.parse(t.quantity_detail_json) : null;
                if (q && q.layer && q.layer.units_total) {
                    const mat = q.layer.material ? ' ' + q.layer.material : '';
                    layerText = `<span style="${chipBase} background:#f59e0b; color:#1f2937; margin-right:4px;">${q.layer.units_total} ${q.layer.unit || 'pcs'}${mat}</span>`;
                }
                if (q && q.batch_number && q.batch_count) {
                    layerText += `<span style="${chipBase} background:#475569; color:#fff;">Batch ${q.batch_number}/${q.batch_count}</span>`;
                }
            } catch (e) { /* ignore */ }

            const descLine = t.description
                ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">${t.description}</div>`
                : '';

            return `
                <div class="card" style="padding:0.75rem; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:flex-start; background:var(--bg-body); border:1px solid var(--border); border-radius: var(--radius);">
                    <div style="flex:1;">
                        <div style="font-weight:600; font-size:0.85rem; color:var(--text-main);">${t.title || '-'}</div>
                        ${(qtyChips || layerText) ? `<div style="margin-top:0.3rem;">${qtyChips}${layerText}</div>` : ''}
                        ${descLine}
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">
                            ${divisionLabel}${when ? ` | ${when}` : ''}
                        </div>
                    </div>
                    <div style="text-align:right; min-width:110px;">
                        <span style="font-size:0.7rem; color:${color}; font-weight:700;">${status}</span><br/>
                        ${!isDone && !isRunning ? `<button class="btn btn-secondary btn-sm mt-1" style="font-size:0.65rem;" onclick="updateKoorTaskStatus('${t.id}', 'IN_PROGRESS', event)">Mulai</button>` : ''}
                        ${!isDone ? `<button class="btn btn-primary btn-sm mt-1" style="font-size:0.65rem;" onclick="updateKoorTaskStatus('${t.id}', 'DONE', event)">Selesai</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { list.innerHTML = `<div class="p-4 text-danger">Gagal: ${e.message}</div>`; }
}

async function updateKoorTaskStatus(taskId, status, event) {
    if (event) event.stopPropagation();
    try {
        await staffApi(`/api/tasks/${taskId}/status`, 'PUT', { status: String(status || '').toUpperCase() });
        notifyUi('success', 'Update', 'Status tugas diperbarui');
        await loadKoorTasks();
    } catch (e) { notifyUi('error', 'Update', e.message); }
}

/* =========================================================================
 * PANEL KOORDINATOR: Rekap Absensi & Penilaian KPI
 * -------------------------------------------------------------------------
 * Dipakai dari staff.html (relawan portal) oleh role 'koordinator_divisi'.
 * Data diambil dari backend:
 *   - GET  /api/attendance/recap (tenant-scoped, tidak filter by division → client filter)
 *   - GET  /api/staff            (untuk fallback daftar anggota divisi)
 *   - GET  /api/performance/staff (staff KPI per tenant → client filter by division)
 *   - POST /api/performance/staff-kpi (simpan penilaian manual)
 * ========================================================================= */

/** Format ISO YYYY-MM-DD untuk tanggal lokal Jakarta. */
function koorYmdToday() {
    try {
        const now = new Date();
        const tzOffsetMin = now.getTimezoneOffset(); // menit ke UTC
        const jakartaOffsetMin = -7 * 60;
        const local = new Date(now.getTime() + (tzOffsetMin - jakartaOffsetMin) * 60000);
        return local.toISOString().slice(0, 10);
    } catch (e) {
        return new Date().toISOString().slice(0, 10);
    }
}

/** Tambah hari pada YMD string → YMD baru (negatif OK). */
function koorAddDaysYmd(ymd, delta) {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(delta || 0));
    return d.toISOString().slice(0, 10);
}

/** Pastikan user saat ini adalah koordinator yang punya divisi. */
function koorEnsureDivisionContext() {
    const role = String(STAFF_SESSION.role || '').toLowerCase();
    if (role !== 'koordinator_divisi') {
        notifyUi('error', 'Akses', 'Fitur ini hanya untuk Koordinator Divisi.');
        return null;
    }
    const divisionId = String(STAFF_SESSION.division_id || '').trim();
    if (!divisionId) {
        notifyUi('error', 'Divisi', 'Akun Anda belum dipasangi divisi. Hubungi admin dapur.');
        return null;
    }
    return { divisionId, divisionName: divisionNameForStaff(divisionId) };
}

/** Ambil daftar anggota divisi koordinator (dipakai untuk fallback nama, KPI entry). */
async function koorLoadDivisionMembers(divisionId) {
    try {
        const all = await staffApi('/api/staff');
        const list = Array.isArray(all) ? all : [];
        return list.filter(s => String(s.division_id || '').toLowerCase() === String(divisionId).toLowerCase());
    } catch (e) {
        return [];
    }
}

function koorFmtMinutesAsHours(mins) {
    const m = Number(mins || 0);
    if (!Number.isFinite(m) || m <= 0) return '0 j';
    const h = Math.floor(m / 60);
    const rem = Math.round(m - h * 60);
    if (h === 0) return `${rem} m`;
    if (rem === 0) return `${h} j`;
    return `${h} j ${rem} m`;
}

function koorFmtPct(v) {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return '-';
    return `${n.toFixed(1)}%`;
}

/** Render baris rekap absensi (satu per staff). */
function koorRenderRecapRows(rows, divisionMembers) {
    const byStaff = new Map();
    for (const r of rows || []) byStaff.set(String(r.staff_id), r);
    // Pastikan semua anggota divisi muncul, walaupun belum ada entri attendance_daily.
    const merged = (divisionMembers || []).map(m => {
        const r = byStaff.get(String(m.id));
        if (r) return r;
        return {
            staff_id: m.id,
            staff_name: m.name || '-',
            division_id: m.division_id || '',
            total_days: 0,
            present_days: 0,
            absent_days: 0,
            worked_minutes: 0,
            overtime_minutes: 0,
            late_minutes: 0,
            photo_count: 0,
            latest_photo: ''
        };
    });

    if (!merged.length) {
        return `<tr><td colspan="6" class="text-muted italic text-center p-4">Tidak ada anggota divisi.</td></tr>`;
    }
    return merged.map(r => {
        const attendRate = r.total_days > 0 ? (r.present_days / r.total_days) * 100 : 0;
        return `<tr>
            <td>${escapeHtml(r.staff_name || '-')}</td>
            <td class="text-center">${Number(r.total_days || 0)}</td>
            <td class="text-center" style="color: var(--success); font-weight: 600;">${Number(r.present_days || 0)}</td>
            <td class="text-center" style="color: #b91c1c;">${Number(r.absent_days || 0)}</td>
            <td class="text-center">${koorFmtMinutesAsHours(r.worked_minutes)}${r.overtime_minutes ? ` <span class="text-xs text-muted">(+${koorFmtMinutesAsHours(r.overtime_minutes)} OT)</span>` : ''}</td>
            <td class="text-center"><span class="chip" style="background:${attendRate >= 90 ? '#dcfce7' : attendRate >= 70 ? '#fef3c7' : '#fee2e2'}; color:${attendRate >= 90 ? '#166534' : attendRate >= 70 ? '#92400e' : '#991b1b'};">${koorFmtPct(attendRate)}</span></td>
        </tr>`;
    }).join('');
}

/** Buka modal Rekap Absensi untuk divisi koordinator. */
async function openKoorAttendanceRecap() {
    const ctx = koorEnsureDivisionContext();
    if (!ctx) return;

    const today = koorYmdToday();
    const defaultFrom = koorAddDaysYmd(today, -13);
    const defaultTo = today;

    openModalUi({
        title: `Rekap Absensi — Divisi ${ctx.divisionName}`,
        bodyHtml: `
            <div class="form-grid" style="grid-template-columns: 1fr 1fr auto; gap: 0.75rem; align-items: end;">
                <div>
                    <label class="input-label">Dari</label>
                    <input id="koor_recap_from" class="input-field" type="date" value="${defaultFrom}" max="${today}" />
                </div>
                <div>
                    <label class="input-label">Sampai</label>
                    <input id="koor_recap_to" class="input-field" type="date" value="${defaultTo}" max="${today}" />
                </div>
                <div>
                    <button class="btn btn-primary btn-sm" onclick="refreshKoorAttendanceRecap()"><i class="fas fa-sync"></i> Muat</button>
                </div>
            </div>
            <div class="text-xs text-muted mt-2" id="koor_recap_meta">Default: 14 hari terakhir.</div>

            <div class="table-responsive mt-3" style="max-height: 60vh; overflow:auto;">
                <table class="nutri-table w-full" style="font-size: 0.85rem;">
                    <thead>
                        <tr>
                            <th>Nama Anggota</th>
                            <th class="text-center">Hari Tercatat</th>
                            <th class="text-center">Hadir</th>
                            <th class="text-center">Absen</th>
                            <th class="text-center">Jam Kerja</th>
                            <th class="text-center">% Hadir</th>
                        </tr>
                    </thead>
                    <tbody id="koor_recap_rows">
                        <tr><td colspan="6" class="text-center p-4 text-muted italic">Memuat...</td></tr>
                    </tbody>
                </table>
            </div>
        `,
        actions: [
            { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: closeModalUi }
        ]
    });

    await refreshKoorAttendanceRecap();
}

/** Ambil ulang data rekap sesuai input tanggal di modal. */
async function refreshKoorAttendanceRecap() {
    const ctx = koorEnsureDivisionContext();
    if (!ctx) return;

    const fromEl = document.getElementById('koor_recap_from');
    const toEl = document.getElementById('koor_recap_to');
    const tbody = document.getElementById('koor_recap_rows');
    const meta = document.getElementById('koor_recap_meta');
    if (!tbody) return;

    const fromDate = String((fromEl && fromEl.value) || '').trim();
    const toDate = String((toEl && toEl.value) || '').trim();
    if (!fromDate || !toDate || fromDate > toDate) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-danger">Rentang tanggal tidak valid.</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-muted italic">Memuat...</td></tr>`;

    try {
        const [recapResp, members] = await Promise.all([
            staffApi(`/api/attendance/recap?cycle=daily&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}&include_photos=0`),
            koorLoadDivisionMembers(ctx.divisionId)
        ]);
        const allRows = Array.isArray(recapResp?.rows) ? recapResp.rows
            : Array.isArray(recapResp) ? recapResp
            : [];
        // Filter client-side: hanya anggota divisi koordinator.
        const memberIds = new Set((members || []).map(m => String(m.id)));
        const myDivRows = allRows.filter(r => {
            if (memberIds.size) return memberIds.has(String(r.staff_id));
            return String(r.division_id || '').toLowerCase() === String(ctx.divisionId).toLowerCase();
        });
        tbody.innerHTML = koorRenderRecapRows(myDivRows, members);
        if (meta) {
            meta.textContent = `Divisi: ${ctx.divisionName} • ${members.length} anggota • periode ${fromDate} s.d. ${toDate}`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-danger">Gagal memuat: ${escapeHtml(e.message || 'unknown')}</td></tr>`;
    }
}

/** Render baris tabel penilaian KPI — tiap row menampilkan metrik + tombol "Nilai".
 *  Baris milik koordinator sendiri ditandai visual dan tombol "Nilai"-nya di-disable
 *  (self-assessment tidak diperbolehkan; KPI koordinator sendiri akan dinilai
 *  oleh atasan di Portal Pengelola, mis. Kepala SPPG / Asisten Lapangan).
 */
function koorRenderKpiRows(perfRows, divisionMembers) {
    const byStaff = new Map();
    for (const r of perfRows || []) byStaff.set(String(r.staff_id), r);
    const merged = (divisionMembers || []).map(m => {
        const r = byStaff.get(String(m.id));
        if (r) return r;
        return {
            staff_id: m.id,
            staff_name: m.name || '-',
            division_id: m.division_id || '',
            tasks_completed: 0,
            ontime_rate: 0,
            kpi_score: null,
            kehadiran_pct: null,
            kedisiplinan: null,
            five_r: null,
            improvement: null,
            kpi_note: ''
        };
    });

    if (!merged.length) {
        return `<tr><td colspan="7" class="text-muted italic text-center p-4">Tidak ada anggota divisi.</td></tr>`;
    }

    const selfId = String(STAFF_SESSION.staff_id || '');
    return merged.map(r => {
        const hadirPct = r.kehadiran_pct != null ? `${Number(r.kehadiran_pct).toFixed(1)}%` : '-';
        const kpi = r.kpi_score != null ? `${Number(r.kpi_score).toFixed(1)}` : '-';
        const kedis = r.kedisiplinan != null ? Number(r.kedisiplinan).toFixed(0) : '-';
        const fiver = r.five_r != null ? Number(r.five_r).toFixed(0) : '-';
        const imp = r.improvement != null ? Number(r.improvement).toFixed(0) : '-';
        const isSelf = selfId && String(r.staff_id) === selfId;
        const nameCell = isSelf
            ? `${escapeHtml(r.staff_name || '-')} <span class="chip" style="background:#e0e7ff;color:#3730a3;font-size:0.65rem;margin-left:6px;">Anda</span>`
            : escapeHtml(r.staff_name || '-');
        const actionCell = isSelf
            ? `<span class="text-xs text-muted italic" title="Koordinator tidak bisa menilai dirinya sendiri. KPI Anda dinilai oleh atasan di Portal Pengelola.">
                    <i class="fas fa-lock"></i> Tidak bisa self-assessment
               </span>`
            : `<button class="btn btn-primary btn-sm" style="font-size:0.7rem;" onclick="openKoorKpiEditor('${encodeURIComponent(r.staff_id)}', '${encodeURIComponent(r.staff_name || '-')}')"><i class="fas fa-edit"></i> Nilai</button>`;
        return `<tr${isSelf ? ' style="background: #f5f3ff;"' : ''}>
            <td>${nameCell}</td>
            <td class="text-center">${hadirPct}</td>
            <td class="text-center">${kedis}</td>
            <td class="text-center">${fiver}</td>
            <td class="text-center">${imp}</td>
            <td class="text-center"><span class="chip" style="background:#eff6ff;color:#1d4ed8;font-weight:700;">${kpi}</span></td>
            <td class="text-center">${actionCell}</td>
        </tr>`;
    }).join('');
}

/** State cache KPI supaya tombol "Nilai" langsung dapat nilai terbaru. */
let KOOR_KPI_STATE = {
    divisionId: '',
    members: [],
    perfByStaff: new Map(),
};

/** Buka modal Penilaian KPI Staff divisi koordinator. */
async function openKoorKpiPanel() {
    const ctx = koorEnsureDivisionContext();
    if (!ctx) return;

    openModalUi({
        title: `Penilaian KPI — Divisi ${ctx.divisionName}`,
        bodyHtml: `
            <div class="text-xs text-muted mb-2">
                Nilai 0-100 untuk tiga komponen manual: <strong>Kedisiplinan</strong>, <strong>5R</strong>, dan <strong>Improvement</strong>.
                Angka kehadiran & KPI agregat diambil otomatis dari sistem.
            </div>
            <div class="table-responsive mt-1" style="max-height: 60vh; overflow:auto;">
                <table class="nutri-table w-full" style="font-size: 0.85rem;">
                    <thead>
                        <tr>
                            <th>Nama Anggota</th>
                            <th class="text-center">% Hadir</th>
                            <th class="text-center">Kedisiplinan</th>
                            <th class="text-center">5R</th>
                            <th class="text-center">Improvement</th>
                            <th class="text-center">KPI Agregat</th>
                            <th class="text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="koor_kpi_rows">
                        <tr><td colspan="7" class="text-center p-4 text-muted italic">Memuat...</td></tr>
                    </tbody>
                </table>
            </div>
        `,
        actions: [
            { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: closeModalUi }
        ]
    });

    await refreshKoorKpiPanel();
}

async function refreshKoorKpiPanel() {
    const ctx = koorEnsureDivisionContext();
    if (!ctx) return;
    const tbody = document.getElementById('koor_kpi_rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-muted italic">Memuat...</td></tr>`;

    try {
        const [perfResp, members] = await Promise.all([
            staffApi('/api/performance/staff?period_days=30'),
            koorLoadDivisionMembers(ctx.divisionId)
        ]);
        const allRows = Array.isArray(perfResp) ? perfResp : [];
        const memberIds = new Set((members || []).map(m => String(m.id)));
        const myDivRows = allRows.filter(r => {
            if (memberIds.size) return memberIds.has(String(r.staff_id));
            return String(r.division_id || '').toLowerCase() === String(ctx.divisionId).toLowerCase();
        });

        KOOR_KPI_STATE = {
            divisionId: ctx.divisionId,
            members: members,
            perfByStaff: new Map((myDivRows || []).map(r => [String(r.staff_id), r])),
        };
        tbody.innerHTML = koorRenderKpiRows(myDivRows, members);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-danger">Gagal memuat: ${escapeHtml(e.message || 'unknown')}</td></tr>`;
    }
}

/** Buka form editor penilaian KPI untuk satu staff. */
async function openKoorKpiEditor(staffIdEncoded, staffNameEncoded) {
    const ctx = koorEnsureDivisionContext();
    if (!ctx) return;
    const staffId = decodeURIComponent(String(staffIdEncoded || ''));
    const staffName = decodeURIComponent(String(staffNameEncoded || ''));

    // Pastikan staff ini benar-benar anggota divisi koordinator (guard client-side).
    const isMember = (KOOR_KPI_STATE.members || []).some(m => String(m.id) === String(staffId));
    if (!isMember) {
        notifyUi('error', 'Akses', 'Anda hanya bisa menilai anggota divisi Anda.');
        return;
    }

    // Self-assessment tidak diperbolehkan. Koordinator tidak bisa menilai KPI
    // dirinya sendiri — itu wewenang atasan (Kepala SPPG / Asisten Lapangan)
    // di Portal Pengelola.
    const selfId = String(STAFF_SESSION.staff_id || '');
    if (selfId && String(staffId) === selfId) {
        notifyUi('warning', 'Self-assessment', 'Koordinator tidak bisa menilai KPI dirinya sendiri. Hubungi atasan untuk dinilai.');
        return;
    }

    const cur = KOOR_KPI_STATE.perfByStaff.get(String(staffId)) || {};
    const vKed = cur.kedisiplinan != null ? Number(cur.kedisiplinan) : '';
    const vFiv = cur.five_r != null ? Number(cur.five_r) : '';
    const vImp = cur.improvement != null ? Number(cur.improvement) : '';
    const vNote = cur.kpi_note != null ? String(cur.kpi_note) : '';

    openModalUi({
        title: `Nilai KPI — ${staffName}`,
        bodyHtml: `
            <div class="text-xs text-muted mb-3">
                Isi skala <strong>0 – 100</strong> untuk masing-masing kriteria. Boleh dikosongkan jika
                belum dinilai pada periode ini.
            </div>
            <div class="form-grid" style="gap: 0.75rem;">
                <div>
                    <label class="input-label">Kedisiplinan</label>
                    <input id="koor_kpi_kedis" class="input-field" type="number" min="0" max="100" step="0.1" value="${vKed}" placeholder="0 - 100" />
                    <div class="text-xs text-muted mt-1">Ketepatan waktu, mengikuti SOP, instruksi koordinator.</div>
                </div>
                <div>
                    <label class="input-label">5R (Ringkas, Rapi, Resik, Rawat, Rajin)</label>
                    <input id="koor_kpi_fiver" class="input-field" type="number" min="0" max="100" step="0.1" value="${vFiv}" placeholder="0 - 100" />
                    <div class="text-xs text-muted mt-1">Kebersihan area, kerapian tools, disiplin housekeeping.</div>
                </div>
                <div>
                    <label class="input-label">Improvement / Inisiatif</label>
                    <input id="koor_kpi_imp" class="input-field" type="number" min="0" max="100" step="0.1" value="${vImp}" placeholder="0 - 100" />
                    <div class="text-xs text-muted mt-1">Ide perbaikan, bantu tim, proaktif solving masalah.</div>
                </div>
                <div class="form-full">
                    <label class="input-label">Catatan (opsional)</label>
                    <textarea id="koor_kpi_note" class="input-field" rows="3" placeholder="Contoh: perlu coaching teknik plating, sudah memimpin briefing pagi, dst.">${escapeHtml(vNote)}</textarea>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => { openKoorKpiPanel(); } },
            { label: 'Simpan Nilai', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const clamp = (v) => {
                        const s = String(v == null ? '' : v).trim();
                        if (!s) return null;
                        const n = Number(s);
                        if (!Number.isFinite(n)) return null;
                        return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
                    };
                    const kedisiplinan = clamp(document.getElementById('koor_kpi_kedis').value);
                    const five_r = clamp(document.getElementById('koor_kpi_fiver').value);
                    const improvement = clamp(document.getElementById('koor_kpi_imp').value);
                    const note = String(document.getElementById('koor_kpi_note').value || '').trim().slice(0, 2000);
                    await staffApi('/api/performance/staff-kpi', 'POST', {
                        staff_id: staffId,
                        kedisiplinan,
                        five_r,
                        improvement,
                        note
                    });
                    notifyUi('success', 'KPI', `Penilaian ${staffName} tersimpan.`);
                    // Reopen KPI panel (refresh list).
                    await openKoorKpiPanel();
                } catch (e) {
                    setModalError(e.message || 'Gagal menyimpan penilaian');
                }
            }}
        ]
    });
}

window.staffLogin = staffLogin;
window.staffLogout = staffLogout;
window.startCamera = startCamera;
window.capturePhoto = capturePhoto;
window.uploadPhotoFile = uploadPhotoFile;
window.sendAttendanceEvent = sendAttendanceEvent;
window.loadMyTodayEvents = loadMyTodayEvents;
window.showFaceRegister = showFaceRegister;
window.hideFaceRegister = hideFaceRegister;
window.submitFaceRegistration = submitFaceRegistration;
window.toggleFaceLogin = toggleFaceLogin;
window.resetStaffFaceAbsenLanding = resetStaffFaceAbsenLanding;
window.initStaffFaceAbsenPage = initStaffFaceAbsenPage;
window.submitFacePinLogin = submitFacePinLogin;
window.submitFaceAttendance = submitFaceAttendance;
window.showLanding = showLanding;
window.showManualLogin = showManualLogin;
window.showKoorTasks = showKoorTasks;
window.loadKoorTasks = loadKoorTasks;
window.updateKoorTaskStatus = updateKoorTaskStatus;
window.toggleJobdescPanel = toggleJobdescPanel;
window.openKoorAttendanceRecap = openKoorAttendanceRecap;
window.refreshKoorAttendanceRecap = refreshKoorAttendanceRecap;
window.openKoorKpiPanel = openKoorKpiPanel;
window.refreshKoorKpiPanel = refreshKoorKpiPanel;
window.openKoorKpiEditor = openKoorKpiEditor;

initStaffPage();

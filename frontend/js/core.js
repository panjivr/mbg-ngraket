let currentUser = null;
let currentRole = null;
let SESSION = {
    token: localStorage.getItem('app_token') || '',
    tenant_id: localStorage.getItem('app_tenant_id') || '',
    role: localStorage.getItem('app_role') || '',
    email: localStorage.getItem('app_email') || '',
    name: localStorage.getItem('app_name') || ''
};

const I18N_DICT = {
    id: {
        'common.save': 'Simpan',
        'common.cancel': 'Batal',
        'common.refresh': 'Refresh',
        'common.test': 'Tes',
        'common.saveReload': 'Simpan & Reload',
        'common.download': 'Download',
        'common.selectFile': 'Pilih File',
        'settings.section.printer': 'Printer & Dokumen',
        'settings.section.server': 'Server & API',
        'settings.section.database': 'Database (Backup)',
        'settings.printer.subtitle': 'Format dokumen & pengaturan cetak',
        'settings.server.subtitle': 'Koneksi API & pengaturan backend',
        'settings.database.subtitle': 'Backup & Restore Master Data',
        'settings.printer.save': 'Simpan Konfigurasi',
        'settings.printer.testPrint': 'Tes Cetak',
        'settings.printer.generateTest': 'Buat Halaman Tes',
        'settings.server.warning': 'Mengubah Server URL dapat memutus sesi. Ubah hanya jika paham.',
        'settings.server.url': 'Server URL (Base API)',
        'settings.server.test': 'Tes',
        'settings.server.saveReload': 'Simpan & Reload',
        'settings.db.backup.title': 'Backup',
        'settings.db.backup.desc': 'Export master data (Menu, Recipe, Staff, Equipment) ke file JSON.',
        'settings.db.backup.action': 'Download Backup',
        'settings.db.restore.title': 'Restore',
        'settings.db.restore.desc': 'Restore data dari file backup. Peringatan: bisa menimpa data.',
        'settings.db.restore.select': 'Pilih File Backup',
        'settings.lang.changed': 'Bahasa diubah',
        'settings.lang.reloadPrompt': 'Reload halaman untuk menerapkan bahasa?',
        'nav.dashboard': 'Dashboard',
        'nav.production': 'Produksi',
        'nav.production.live': 'Monitoring Plan (Live)',
        'nav.production.draft': 'Planner Draft (War Room)',
        'nav.production.list': 'Daftar Plan & Order',
        'nav.kitchen': 'Setup Dapur',
        'nav.menu': 'Food dan Menu',
        'nav.workflows': 'Workflow',
        'nav.recipes': 'Resep',
        'nav.ingredient': 'Bahan (Ingredients)',
        'nav.inventory': 'Stok (Inventory)',
        'nav.purchases': 'Pembelian',
        'nav.finance': 'Keuangan',
        'nav.performance': 'Kinerja Operasi (Divisi)',
        'nav.staff': 'Manajemen Staff',
        'nav.nutrisurvey': 'NutriSurvey',
        'nav.pricing': 'Harga',
        'nav.jobdesc': 'Jobdesc & Tugas',
        'nav.tasks': 'Tugas Saya',
        'nav.routes': 'Rute Pengiriman',
        'nav.reports': 'Laporan',
        'nav.penerima-manfaat': 'Penerima Manfaat',
        'nav.distribusi': 'Distribusi',
        'nav.absensi-saya': 'Absensi Saya',
        'nav.operational-materials': 'Bahan Operasional',
        'login.title': 'Silakan Login',
        'login.subtitle': 'Masuk menggunakan akun yang Anda miliki',
        'login.role': 'Role / Jabatan',
        'login.tenant': 'Kode dapur / kitchen',
        'login.username': 'Nama Akun',
        'login.password': 'Kata Sandi',
        'login.security': 'Verifikasi Keamanan',
        'login.submit': 'Masuk Portal'
    },
    en: {
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.refresh': 'Refresh',
        'common.test': 'Test',
        'common.saveReload': 'Save & Reload',
        'common.download': 'Download',
        'common.selectFile': 'Select File',
        'settings.section.printer': 'Printer & Documents',
        'settings.section.server': 'Server & API',
        'settings.section.database': 'Database (Backup)',
        'settings.printer.subtitle': 'Document format & print settings',
        'settings.server.subtitle': 'API connection & backend settings',
        'settings.database.subtitle': 'Backup & Restore Master Data',
        'settings.printer.save': 'Save Config',
        'settings.printer.testPrint': 'Test Print',
        'settings.printer.generateTest': 'Generate Test Page',
        'settings.server.warning': 'Changing Server URL may disconnect your session. Change only if you know what you are doing.',
        'settings.server.url': 'Server URL (Base API)',
        'settings.server.test': 'Test',
        'settings.server.saveReload': 'Save & Reload',
        'settings.db.backup.title': 'Backup',
        'settings.db.backup.desc': 'Export master data (Menu, Recipes, Staff, Equipment) to a JSON file.',
        'settings.db.backup.action': 'Download Backup',
        'settings.db.restore.title': 'Restore',
        'settings.db.restore.desc': 'Restore data from a backup file. Warning: may overwrite existing data.',
        'settings.db.restore.select': 'Select Backup File',
        'settings.lang.changed': 'Language changed',
        'settings.lang.reloadPrompt': 'Reload page to apply language?',
        'nav.dashboard': 'Dashboard',
        'nav.production': 'Production',
        'nav.production.live': 'Live Plan Monitoring',
        'nav.production.draft': 'Draft Planner (War Room)',
        'nav.production.list': 'Plans & Orders',
        'nav.kitchen': 'Kitchen Setup',
        'nav.menu': 'Food and Menu',
        'nav.workflows': 'Workflow',
        'nav.recipes': 'Recipes',
        'nav.ingredient': 'Ingredients',
        'nav.inventory': 'Inventory',
        'nav.purchases': 'Purchases',
        'nav.finance': 'Finance',
        'nav.performance': 'Ops performance (divisions)',
        'nav.staff': 'Staff Management',
        'nav.nutrisurvey': 'NutriSurvey',
        'nav.pricing': 'Pricing',
        'nav.jobdesc': 'Jobdesc & Tasks',
        'nav.tasks': 'My Tasks',
        'nav.routes': 'Delivery Routes',
        'nav.reports': 'Reports',
        'nav.penerima-manfaat': 'Beneficiaries',
        'nav.distribusi': 'Distribution',
        'nav.absensi-saya': 'My Attendance',
        'nav.operational-materials': 'Operational Materials',
        'login.title': 'Please Log In',
        'login.subtitle': 'Sign in using your account',
        'login.role': 'Role',
        'login.tenant': 'Kitchen / tenant code',
        'login.username': 'Account Name',
        'login.password': 'Password',
        'login.security': 'Security Verification',
        'login.submit': 'Sign In'
    }
};

function getPreferredTheme() {
    const v = String(localStorage.getItem('app_theme') || '').trim().toLowerCase();
    if (v === 'dark' || v === 'light') return v;
    try {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) {}
    return 'light';
}

function applyTheme(theme) {
    const t = String(theme || '').toLowerCase() === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    try { document.documentElement.style.colorScheme = t; } catch (e) {}
    return t;
}

function setThemePreference(theme) {
    const t = String(theme || '').toLowerCase() === 'dark' ? 'dark' : 'light';
    localStorage.setItem('app_theme', t);
    applyTheme(t);
    return t;
}

window.getPreferredTheme = getPreferredTheme;
window.applyTheme = applyTheme;
window.setThemePreference = setThemePreference;

function getPreferredThemePreset() {
    const v = String(localStorage.getItem('app_theme_preset') || '').trim().toLowerCase();
    if (!v) return 'ocean-depths';
    return v;
}

function applyThemePreset(preset) {
    const p = String(preset || '').trim().toLowerCase();
    document.documentElement.dataset.preset = p || 'ocean-depths';
    return document.documentElement.dataset.preset;
}

function setThemePresetPreference(preset) {
    const p = String(preset || '').trim().toLowerCase();
    localStorage.setItem('app_theme_preset', p || 'ocean-depths');
    return applyThemePreset(p);
}

window.getPreferredThemePreset = getPreferredThemePreset;
window.applyThemePreset = applyThemePreset;
window.setThemePresetPreference = setThemePresetPreference;

function getPreferredLanguage() {
    const v = String(localStorage.getItem('app_lang') || '').trim().toLowerCase();
    if (v === 'en' || v === 'id') return v;
    return 'id';
}

function applyLanguage(lang) {
    const l = String(lang || '').trim().toLowerCase() === 'en' ? 'en' : 'id';
    document.documentElement.lang = l;
    try { document.documentElement.dataset.lang = l; } catch (e) {}
    return l;
}

window.getPreferredLanguage = getPreferredLanguage;
window.applyLanguage = applyLanguage;

function t(key, fallback = '') {
    const lang = getPreferredLanguage();
    const dict = I18N_DICT[lang] || I18N_DICT.id || {};
    const v = dict[key];
    if (typeof v === 'string') return v;
    if (fallback) return fallback;
    return key;
}

function applyTranslations(root = document) {
    try {
        const nodes = (root || document).querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-title]');
        nodes.forEach(el => {
            const k = el.getAttribute('data-i18n');
            if (k) el.textContent = t(k, el.textContent);
            const kp = el.getAttribute('data-i18n-placeholder');
            if (kp) el.setAttribute('placeholder', t(kp, el.getAttribute('placeholder') || ''));
            const kt = el.getAttribute('data-i18n-title');
            if (kt) el.setAttribute('title', t(kt, el.getAttribute('title') || ''));
        });
    } catch (e) {}
}

window.t = t;
window.applyTranslations = applyTranslations;

function getApiBaseUrl() {
    const v = (localStorage.getItem('app_server_url') || '').trim();
    if (!v) return '';
    try {
        const u = new URL(v);
        const h = String(u.hostname || '').toLowerCase();
        const loop = h === 'localhost' || h === '127.0.0.1';
        if (typeof location !== 'undefined' && loop) {
            const ph = String(location.hostname || '').toLowerCase();
            const pageLocal = ph === 'localhost' || ph === '127.0.0.1';
            if (!pageLocal) return '';
        }
    } catch (e) {
        return '';
    }
    return v.replace(/\/+$/, '');
}

const MBG_CANONICAL = (typeof window !== 'undefined' && window.MBG_CANONICAL) ? window.MBG_CANONICAL : {};

function normalizeRoleKey(roleKey) {
    const raw = String(roleKey || '').trim().toLowerCase();
    if (!raw) return 'kepala_sppg';
    const alias = MBG_CANONICAL.roleAlias || {};
    return alias[raw] || raw;
}

const ROLES_CONFIG_FALLBACK = {
    kepala_sppg: {
        label: 'Kepala SPPG',
        nav: ['dashboard', 'production', 'kitchen', 'recipes', 'workflows', 'menu', 'ingredient', 'inventory', 'purchases', 'finance', 'performance', 'staff', 'nutrisurvey', 'pricing', 'jobdesc', 'reports', 'penerima-manfaat', 'distribusi', 'operational-materials']
    },
    yayasan: {
        label: 'Yayasan',
        nav: ['dashboard', 'inventory', 'finance', 'performance', 'reports', 'penerima-manfaat', 'distribusi']
    },
    akuntan: {
        label: 'Akuntan',
        nav: ['dashboard', 'inventory', 'purchases', 'finance', 'pricing', 'reports', 'operational-materials']
    },
    ahli_gizi: {
        label: 'Ahli Gizi',
        nav: ['nutrisurvey', 'recipes', 'workflows', 'menu', 'ingredient', 'inventory', 'reports']
    },
    asisten_lapangan: {
        label: 'Asisten Lapangan',
        nav: ['dashboard', 'production', 'kitchen', 'recipes', 'workflows', 'menu', 'ingredient', 'inventory', 'purchases', 'jobdesc', 'reports', 'penerima-manfaat', 'distribusi', 'absensi-saya', 'operational-materials']
    },
    admin: {
        label: 'Admin',
        nav: ['dashboard', 'staff', 'jobdesc', 'reports', 'penerima-manfaat', 'distribusi', 'absensi-saya']
    },
    // Legacy — tidak tampil di login dropdown, dipertahankan untuk kompatibilitas data lama
    koordinator: { label: 'Koordinator Divisi', nav: ['dashboard', 'tasks', 'inventory'] },
    driver: { label: 'Driver', nav: ['routes', 'tasks'] }
};

const ROLES_CONFIG = (() => {
    const canonical = MBG_CANONICAL.roles || {};
    const mapped = {};
    Object.entries(canonical).forEach(([k, v]) => {
        mapped[k] = {
            label: v.label || k,
            nav: Array.isArray(v.allowed_nav) ? v.allowed_nav.slice() : []
        };
    });
    if (Object.keys(mapped).length === 0) return ROLES_CONFIG_FALLBACK;
    Object.entries(ROLES_CONFIG_FALLBACK).forEach(([k, v]) => {
        const nk = normalizeRoleKey(k);
        if (!mapped[nk]) mapped[nk] = v;
    });
    return mapped;
})();

async function api(path, method = 'GET', body = null) {
    const headers = {};
    if (SESSION.token) headers['Authorization'] = 'Bearer ' + SESSION.token;
    if (SESSION.tenant_id) headers['x-tenant-id'] = SESSION.tenant_id;
    if (body) headers['Content-Type'] = 'application/json';
    // Kirim timezone offset (getTimezoneOffset: WIB = -420) agar server bisa
    // menerjemahkan HH:MM shift ke epoch ms yang benar
    headers['X-Tz-Offset-Minutes'] = String(new Date().getTimezoneOffset());
    const base = getApiBaseUrl();
    let url = path;
    if (base) {
        try {
            url = new URL(path, base + '/').toString();
        } catch (e) {
            url = base + (String(path || '').startsWith('/') ? '' : '/') + path;
        }
    }
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
        const raw = await res.text();
        let msg = raw;
        let parsed = null;
        try {
            const j = JSON.parse(raw);
            if (j && typeof j === 'object') { msg = (j.message || j.error || raw); parsed = j; }
        } catch (e) {}
        let finalMsg = String(msg || `HTTP ${res.status}`);
        if (res.status === 404 && /cannot\s+get/i.test(raw || '')) {
            finalMsg = `API tidak ditemukan. Cek Server URL (Settings) dan pastikan backend berjalan. (${finalMsg})`;
        }
        const err = new Error(finalMsg);
        if (parsed) err.data = parsed;
        throw err;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return await res.text();
}

function formatRp(n) {
    const num = Number(n || 0);
    return 'Rp ' + num.toLocaleString('id-ID');
}

function formatDateTime(s) {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function notifyUi(type, title, message, opts) {
    let area = document.getElementById('toast-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'toast-area';
        area.className = 'toast-area';
        document.body.appendChild(area);
    }
    const normalizedType = (() => {
        const t = String(type || 'success').toLowerCase();
        if (t === 'danger' || t === 'error') return 'danger';
        if (t === 'warn' || t === 'warning') return 'warning';
        if (t === 'info') return 'info';
        return 'success';
    })();
    const el = document.createElement('div');
    el.className = `toast toast-${normalizedType}`;
    el.innerHTML = `<div class="toast-title">${title || ''}</div><div class="text-sm text-muted">${message || ''}</div>`;
    area.appendChild(el);
    const maxToasts = 5;
    const children = Array.from(area.children || []);
    if (children.length > maxToasts) {
        children.slice(0, children.length - maxToasts).forEach((x) => { try { x.remove(); } catch (e) {} });
    }
    const o = opts && typeof opts === 'object' ? opts : {};
    let ms = typeof o.durationMs === 'number' ? o.durationMs : null;
    if (ms == null) {
        ms = normalizedType === 'info' ? 8000 : 3500;
    }
    setTimeout(() => {
        try { el.remove(); } catch (e) {}
    }, ms);
}

function escapeHtmlUi(input) {
    return String(input ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderUiState(opts = {}) {
    const type = String(opts.type || 'info').toLowerCase();
    const iconByType = {
        loading: 'fa-spinner fa-spin',
        empty: 'fa-inbox',
        error: 'fa-exclamation-triangle',
        success: 'fa-check-circle',
        info: 'fa-info-circle'
    };
    const title = escapeHtmlUi(opts.title || (
        type === 'loading' ? 'Memuat data...' :
        type === 'empty' ? 'Belum ada data' :
        type === 'error' ? 'Terjadi kesalahan' :
        type === 'success' ? 'Berhasil' : 'Informasi'
    ));
    const message = escapeHtmlUi(opts.message || '');
    const icon = iconByType[type] || iconByType.info;
    const actions = Array.isArray(opts.actions) ? opts.actions : [];
    const actionsHtml = actions.map((a) => {
        const label = escapeHtmlUi(a?.label || 'Aksi');
        const onClick = String(a?.onClick || '').trim();
        const cls = escapeHtmlUi(a?.className || 'btn btn-secondary btn-sm');
        if (!onClick) return '';
        return `<button class="${cls}" onclick="${onClick}">${label}</button>`;
    }).join('');
    return `
        <div class="ui-state ui-state-${escapeHtmlUi(type)}">
            <div class="ui-state-icon"><i class="fas ${icon}"></i></div>
            <div class="ui-state-title">${title}</div>
            ${message ? `<div class="ui-state-message">${message}</div>` : ''}
            ${actionsHtml ? `<div class="ui-state-actions">${actionsHtml}</div>` : ''}
        </div>
    `;
}

function setSectionUiState(sectionElOrId, opts = {}) {
    const el = typeof sectionElOrId === 'string'
        ? document.getElementById(sectionElOrId)
        : sectionElOrId;
    if (!el) return;
    el.innerHTML = renderUiState(opts);
}

function setModalError(message, isHtml = false) {
    const err = document.getElementById('modal-error');
    if (!err) return;
    if (isHtml) {
        err.innerHTML = message || '';
    } else {
        err.textContent = message || '';
        err.innerHTML = '';
    }
    if (message) err.classList.remove('hidden'); else err.classList.add('hidden');
    err.style.display = message ? 'block' : 'none';
}

function openModalUi({ title, bodyHtml, actions, size }) {
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.textContent = title || '';
    
    const modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.innerHTML = bodyHtml || '';
    
    setModalError('');

    // Size support: 'sm' (default 600), 'md' (760), 'lg' (960), 'xl' (1200), 'full' (95vw).
    try {
        const overlayEl = document.getElementById('modal-overlay') || document.getElementById('modal-backdrop');
        const modalEl = overlayEl ? overlayEl.querySelector('.modal') : null;
        if (modalEl) {
            const map = { sm: '600px', md: '760px', lg: '960px', xl: '1200px', full: '95vw' };
            const key = String(size || 'sm').toLowerCase();
            modalEl.style.maxWidth = map[key] || map.sm;
        }
    } catch (e) { /* no-op */ }
    
    const actionsEl = document.getElementById('modal-actions');
    if (actionsEl) {
        actionsEl.innerHTML = '';
        if (actions && actions.length > 0) {
            actions.forEach(a => {
                const b = document.createElement('button');
                b.className = a.className || 'btn btn-secondary btn-sm';
                b.type = a.type || 'button';
                b.textContent = a.label || 'OK';
                // Honour optional action attributes so callers can reference the
                // button from inline handlers (e.g. checkbox onchange that toggles
                // the confirm button's `disabled` state).
                if (a.id) b.id = a.id;
                if (a.title) b.title = a.title;
                if (a.disabled === true) b.disabled = true;
                if (a.onClick) {
                    b.onclick = a.onClick;
                } else {
                    b.onclick = () => closeModalUi();
                }
                actionsEl.appendChild(b);
            });
            actionsEl.style.display = 'flex';
        } else {
            actionsEl.style.display = 'none';
        }
    }
    
    const overlay = document.getElementById('modal-overlay') || document.getElementById('modal-backdrop');
    if (overlay) {
        overlay.style.display = 'flex';
        
        // Auto-focus first input
        setTimeout(() => {
            const firstInput = overlay.querySelector('input:not([type="hidden"]), select, textarea, button:not(.btn-secondary)');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

async function openBilling(e) {
    try { if (e) e.preventDefault(); } catch (err) {}
    if (!SESSION.token) {
        openModalUi({
            title: 'Pembayaran & Langganan',
            bodyHtml: `<div class="text-sm text-muted">Silakan login atau buat akun terlebih dahulu untuk melihat status langganan dan memilih paket.</div>`,
            actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm' }]
        });
        return;
    }

    const me = await api('/api/subscription/me');
    const plans = await api('/api/subscription/plans');

    const state = String(me?.state || 'NONE');
    const currentCode = String(me?.subscription?.plan_code || me?.tenant?.plan_type || '').toUpperCase();
    const endAt = me?.subscription?.current_period_end || me?.tenant?.subscription_end_at || '';
    const pendingRequest = me?.pending_request || null;
    const pendingPlanCode = String(pendingRequest?.plan_code || '').toUpperCase();
    const isPendingApproval = !!pendingRequest && String(pendingRequest?.status || '').toUpperCase() === 'PENDING';

    const badgeText = isPendingApproval ? 'PENDING_APPROVAL' : state;
    const statusBadge = badgeText === 'ACTIVE' ? 'success' : (badgeText === 'GRACE' ? 'warning' : (isPendingApproval ? 'warning' : 'danger'));

    const MODULE_LABELS = {
        basic: 'Basic',
        production: 'Production',
        tasks: 'Jobdesc & Tasks',
        inventory: 'Inventory',
        purchases: 'Pembelian',
        finance: 'Keuangan',
        staff: 'Manajemen Staff',
        routes: 'Delivery Routes',
        pricing: 'Pricing',
        reports: 'Reports',
        integrations: 'NutriSurvey'
    };

    const normalizeModulesForUI = (mods) => {
        const set = new Set(Array.isArray(mods) ? mods : []);
        // Legacy mapping
        if (set.has('core')) {
            set.add('basic');
            set.add('inventory');
            set.add('purchases');
            set.add('finance');
            set.add('staff');
            set.add('tasks');
            set.add('routes');
            set.add('pricing');
        }
        if (set.has('ops')) {
            set.add('production');
            set.add('tasks');
        }
        if (set.size === 0) set.add('basic');
        return set;
    };

    const currentModulesSet = normalizeModulesForUI(me?.plan?.features?.modules);

    const rows = (Array.isArray(plans) ? plans : []).map(p => {
        const code = String(p.code || '').toUpperCase();
        const isCurrent = code && code === currentCode;
        const isPendingForThisPlan = isPendingApproval && pendingPlanCode && code === pendingPlanCode;
        const isLockedByOtherPending = isPendingApproval && !isCurrent && !isPendingForThisPlan;
        const price = formatRp(p.price_monthly || 0);
        const features = (p.features && Array.isArray(p.features.modules)) ? p.features.modules : null;
        const featureList = features
            ? features.slice(0, 6).map(x => `<li>${MODULE_LABELS[String(x)] || String(x)}</li>`).join('')
            : `<li>Fitur sesuai paket</li>`;
        const btn = isCurrent
            ? `<button class="btn btn-secondary btn-sm w-full" disabled>Paket Aktif</button>`
            : (isLockedByOtherPending
                ? `<button class="btn btn-secondary btn-sm w-full" disabled>Tunggu Approval Paket</button>`
                : (isPendingForThisPlan
                    ? `<button class="btn btn-secondary btn-sm w-full" disabled>Menunggu Approval</button>`
                    : `<button class="btn btn-primary btn-sm w-full" onclick="subscribePlan('${code.replace(/'/g, '')}')">Pilih Paket</button>`
                )
            );
        return `
          <div class="card" style="padding: 14px; display:flex; flex-direction:column; gap:10px; ${isCurrent ? 'border-color: rgba(15, 82, 186, 0.45); box-shadow: 0 0 0 2px rgba(15, 82, 186, 0.18);' : ''}">
            <div class="flex justify-between items-center">
              <div class="font-bold">${p.name || code}</div>
              <div class="badge ${isCurrent ? 'success' : 'warning'}">${code}</div>
            </div>
            <div style="font-weight: 800; font-size: 18px;">${price}<span class="text-muted" style="font-weight: 500; font-size: 12px;"> / bulan</span></div>
            <ul class="text-sm text-muted" style="padding-left: 18px; display: grid; gap: 4px;">${featureList}</ul>
            <div style="margin-top:auto;">${btn}</div>
          </div>
        `;
    }).join('');

    const guideSeen = String(localStorage.getItem('mbg_billing_guide_seen') || '').toLowerCase() === 'true';

    // Modules di luar "Basic" dianggap sebagai paket berbayar (paid tiers).
    const paidModuleOrder = ['production', 'tasks', 'inventory', 'purchases', 'finance', 'staff', 'routes', 'pricing', 'reports', 'integrations'];
    const lockedPremiumModules = [];
    paidModuleOrder.forEach(m => {
        if (!currentModulesSet.has(m)) lockedPremiumModules.push(MODULE_LABELS[m] || m);
    });

    const unlockedModulesList = Array.from(currentModulesSet)
        .slice(0, 8)
        .map(m => MODULE_LABELS[m] || m)
        .join(' • ');

    const guideHtml = guideSeen
        ? `
          <div class="card" style="padding:12px; margin:0 0 12px 0;">
            <div class="font-bold">Panduan Pengguna (Aktif)</div>
            <div class="text-sm text-muted mt-1">Modul aktif Anda: <span style="font-weight:700">${unlockedModulesList || '-'}</span></div>
            <div class="text-sm mt-3">
              <div style="margin-bottom:6px; font-weight:700">Start sekarang:</div>
              <div class="text-muted">• Isi & kelola <b>Kitchen Setup</b> lalu siapkan <b>Menu</b> & <b>Ingredients</b>.</div>
              <div class="text-muted">• Jalankan <b>Production</b> untuk monitor rencana & proses.</div>
              ${currentModulesSet.has('production')
                  ? `<div class="text-muted">• Pakai <b>Production</b> untuk monitoring order dan proses masak.</div>`
                  : `<div class="text-muted">• Upgrade ke <b>Production</b> agar bisa monitoring proses.</div>`}
              ${currentModulesSet.has('inventory')
                  ? `<div class="text-muted">• Gunakan <b>Inventory</b> untuk pantau stok.</div>`
                  : `<div class="text-muted">• Inventory terkunci. Upgrade untuk manajemen stok.</div>`}
              ${currentModulesSet.has('purchases')
                  ? `<div class="text-muted">• Pakai <b>Pembelian</b> untuk urus kebutuhan bahan.</div>`
                  : `<div class="text-muted">• Pembelian terkunci. Upgrade untuk bantu operasional.</div>`}
              ${currentModulesSet.has('finance')
                  ? `<div class="text-muted">• Gunakan <b>Keuangan</b> untuk ringkasan transaksi.</div>`
                  : `<div class="text-muted">• Keuangan terkunci. Upgrade untuk kontrol biaya.</div>`}
              ${currentModulesSet.has('reports')
                  ? `<div class="text-muted">• Gunakan <b>Reports & Performance</b> untuk evaluasi harian.</div>`
                  : `<div class="text-muted">• Reports & Performance terkunci. Upgrade untuk analitik.</div>`}
              ${currentModulesSet.has('integrations')
                  ? `<div class="text-muted">• Aktifkan <b>NutriSurvey</b> untuk hitung gizi berbasis menu/recipe.</div>`
                  : `<div class="text-muted">• NutriSurvey terkunci. Upgrade untuk fitur gizi.</div>`}
            </div>
          </div>
        `
        : `
          <div class="card" style="padding:12px; margin:0 0 12px 0;">
            <div class="font-bold">Kenapa Paket Berbayar?</div>
            <div class="text-sm text-muted mt-1">Sistem ini memakai tier modul: fitur hanya muncul kalau modul ada di paket.</div>
            <div class="text-sm mt-3">
              <div style="margin-bottom:6px; font-weight:700">Cara Upgrade (Manual Approval)</div>
              <div class="text-muted">1) Pilih paket di sini.</div>
              <div class="text-muted">2) Sistem membuat permintaan upgrade (status <b>PENDING_APPROVAL</b>).</div>
              <div class="text-muted">3) Developer/admin approve di Dev Console.</div>
              <div class="text-muted">4) Setelah approve, paket aktif dan fitur akan unlock otomatis.</div>
            </div>
              <div class="text-sm mt-3">
                <div style="font-weight:700; margin-bottom:6px">Tersisa yang bisa Anda unlock:</div>
                <div class="text-muted">• ${lockedPremiumModules.length ? lockedPremiumModules.join(' • ') : 'Semua modul di luar Basic sudah aktif.'}</div>
              </div>
          </div>
        `;

    const bodyHtml = `
      ${guideHtml}
      <div class="card" style="padding: 14px; margin-bottom: 14px;">
        <div class="flex justify-between items-center">
          <div>
            <div class="text-sm text-muted">Status Langganan</div>
            <div class="font-bold" style="margin-top: 4px;">${me?.tenant?.name ? me.tenant.name : 'Tenant'}</div>
          </div>
          <div class="badge ${statusBadge}">${badgeText}</div>
        </div>
        <div class="grid-cols-2 gap-2 mt-4">
          <div>
            <div class="text-xs text-muted">Paket</div>
            <div style="font-weight:700; margin-top:4px;">${currentCode || '-'}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Berlaku Sampai</div>
            <div style="font-weight:700; margin-top:4px;">${formatDateTime(endAt)}</div>
          </div>
        </div>
        ${isPendingApproval
            ? `<div class="field-error mt-4" style="display:block;">Permintaan upgrade Anda sedang menunggu persetujuan admin. Fitur premium akan aktif setelah disetujui.</div>`
            : (state !== 'ACTIVE'
                ? `<div class="field-error mt-4" style="display:block;">Akun Anda belum aktif berlangganan. Beberapa fitur akan terkunci sampai pembayaran/approval selesai.</div>`
                : (lockedPremiumModules.length
                    ? `<div class="field-error mt-4" style="display:block;">Akun Anda aktif, tetapi modul berikut masih terkunci: <b>${lockedPremiumModules.join(' & ')}</b>. Upgrade untuk unlock.</div>`
                    : ``)
            )
        }
      </div>
      <div class="text-sm font-bold mb-2">Pilih Paket</div>
      <div class="grid-cols-2 gap-2">${rows || `<div class="text-sm text-muted">Tidak ada paket aktif.</div>`}</div>
    `;

    openModalUi({
        title: 'Pembayaran & Langganan',
        bodyHtml,
        actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm' }]
    });

    // Mark guide as seen after first time user opens this modal.
    try { localStorage.setItem('mbg_billing_guide_seen', 'true'); } catch (e) {}
}

async function subscribePlan(code) {
    try {
        if (!code) return;
        await api('/api/subscription/request', 'POST', { plan_code: code });
        notifyUi('success', 'Permintaan Terkirim', `Paket ${code} sedang menunggu approval admin.`);
        await openBilling();
    } catch (e) {
        notifyUi('danger', 'Gagal', e && e.message ? e.message : 'Gagal memproses subscription');
    }
}

window.openBilling = openBilling;
window.subscribePlan = subscribePlan;
function closeModalUi() {
    const overlay = document.getElementById('modal-overlay') || document.getElementById('modal-backdrop');
    if (overlay) overlay.style.display = 'none';
    
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.textContent = '';
    
    const modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.innerHTML = '';
    
    const err = document.getElementById('modal-error');
    if (err) {
        err.classList.add('hidden');
        err.style.display = 'none';
        err.textContent = '';
    }
    
    const actionsEl = document.getElementById('modal-actions');
    if (actionsEl) actionsEl.innerHTML = '';
}

function setSidebarError(message, isHtml = false) {
    const err = document.getElementById('sidebar-error');
    if (!err) return;
    
    if (isHtml) {
        err.innerHTML = message || '';
    } else {
        err.textContent = message || '';
        err.innerHTML = '';
    }
    if (message) err.classList.remove('hidden'); else err.classList.add('hidden');
    err.style.display = message ? 'block' : 'none';
    if (message) {
        try { err.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    }
}

function closeSidebarUi() {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    
    const title = document.getElementById('sidebar-title');
    if (title) title.textContent = '';
    
    const body = document.getElementById('sidebar-body');
    if (body) body.innerHTML = '';
    
    const err = document.getElementById('sidebar-error');
    if (err) {
        err.classList.add('hidden');
        err.style.display = 'none';
        err.textContent = '';
    }
    
    const actionsEl = document.getElementById('sidebar-actions');
    if (actionsEl) actionsEl.innerHTML = '';
}

function openSidebarUi({ title, bodyHtml, actions }) {
    const sidebarTitle = document.getElementById('sidebar-title');
    if (sidebarTitle) sidebarTitle.textContent = title || '';
    
    const sidebarBody = document.getElementById('sidebar-body');
    if (sidebarBody) sidebarBody.innerHTML = bodyHtml || '';
    
    setSidebarError('');
    
    const actionsEl = document.getElementById('sidebar-actions');
    if (actionsEl) {
        actionsEl.innerHTML = '';
        if (actions && actions.length > 0) {
            actions.forEach(a => {
                const b = document.createElement('button');
                b.className = a.className || 'btn btn-secondary btn-sm';
                b.type = 'button';
                const label = String(a.label != null ? a.label : 'OK');
                b.textContent = label;
                b.setAttribute('aria-label', label);
                if (a.onClick) {
                    b.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        let ret;
                        try {
                            ret = a.onClick(e);
                        } catch (err) {
                            console.error('Sidebar action:', err);
                            setSidebarError(err && err.message ? err.message : String(err));
                            if (typeof notifyUi === 'function') notifyUi('danger', 'Aksi sidebar', err.message || String(err));
                            return;
                        }
                        if (ret != null && typeof ret.then === 'function') {
                            ret.catch((err) => {
                                console.error('Sidebar action (async):', err);
                                setSidebarError(err && err.message ? err.message : String(err));
                                if (typeof notifyUi === 'function') notifyUi('danger', 'Aksi sidebar', err.message || String(err));
                            });
                        }
                    });
                } else {
                    b.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeSidebarUi();
                    });
                }
                actionsEl.appendChild(b);
            });
            actionsEl.style.display = 'flex';
        } else {
            actionsEl.style.display = 'none';
        }
    }
    
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        
        // Hanya fokus ke field di dalam body — jangan ke tombol footer.
        setTimeout(() => {
            const firstInput = overlay.querySelector(
                '#sidebar-body input:not([type="hidden"]), #sidebar-body select, #sidebar-body textarea'
            );
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

function confirmUi({ title, message, confirmLabel, cancelLabel, danger }) {
    return new Promise((resolve) => {
        openModalUi({
            title: title || 'Konfirmasi',
            bodyHtml: `<div class="text-sm text-muted">${message || ''}</div>`,
            actions: [
                { label: cancelLabel || 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => { closeModalUi(); resolve(false); } },
                { label: confirmLabel || 'Ya', className: danger ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm', onClick: () => { closeModalUi(); resolve(true); } }
            ]
        });
    });
}

async function openAppSettings() {
    const tenantPref = localStorage.getItem('app_customer_tenant') || '';
    const serverPref = localStorage.getItem('app_server_url') || '';
    openModalUi({
        title: 'Settings',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Server URL (API Base)</label>
                    <input id="f_set_server" class="input-field" value="${serverPref.replace(/"/g,'&quot;')}" placeholder="Contoh: http://localhost:8080" />
                    <div class="text-muted text-sm mt-2">Kosongkan jika frontend dibuka dari backend yang sama.</div>
                </div>
                <div class="form-full">
                    <label class="input-label">Kode dapur aktif (dari sesi)</label>
                    <input class="input-field" value="${SESSION.tenant_id || '-'}" readonly />
                </div>
                <div class="form-full">
                    <label class="input-label">Kode dapur / kitchen (preferensi lokal)</label>
                    <input id="f_set_tenant" class="input-field" value="${tenantPref.replace(/"/g,'&quot;')}" placeholder="Nama atau kode kitchen dari pengelola" />
                    <div class="text-muted text-sm mt-2">Opsional: dipakai untuk mengingat kitchen default dan prefill login staf.</div>
                </div>
            </div>
        `,
        actions: [
            { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: () => {
                const s = document.getElementById('f_set_server').value.trim();
                const v = document.getElementById('f_set_tenant').value.trim();
                if (s) localStorage.setItem('app_server_url', s.replace(/\/+$/, ''));
                else localStorage.removeItem('app_server_url');
                if (v) localStorage.setItem('app_customer_tenant', v);
                else localStorage.removeItem('app_customer_tenant');
                notifyUi('success', 'Settings', 'Disimpan');
                closeModalUi();
            } }
        ]
    });
}

async function openNotifications() {
    try {
        const tasks = await api('/api/tasks');
        const pending = (tasks || []).filter(t => String(t.status || '').toUpperCase() !== 'DONE').slice(0, 8);
        const rows = pending.map(t => `<tr>
            <td>${t.title || '-'}</td>
            <td>${t.division_id || '-'}</td>
            <td>${t.status || '-'}</td>
        </tr>`).join('');
        openModalUi({
            title: 'Notifications',
            bodyHtml: `
                <div class="text-sm text-muted mb-2">Task pending terbaru</div>
                <table class="nutri-table w-full">
                    <thead>
                        <tr><th>Task</th><th>Divisi</th><th>Status</th></tr>
                    </thead>
                    <tbody>${rows || `<tr><td colspan="3" class="text-muted">Tidak ada task pending</td></tr>`}</tbody>
                </table>
            `,
            actions: [
                { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Notifications', 'Gagal load: ' + e.message);
    }
}

window.notifyUi = notifyUi;
window.renderUiState = renderUiState;
window.setSectionUiState = setSectionUiState;
window.openModalUi = openModalUi;
window.closeModalUi = closeModalUi;

/**
 * Display unit + quantity secara human-friendly.
 * Normalisasi hanya 2 satuan: gram | pcs.
 * - >=1000g ditampilkan sebagai kg (1 desimal)
 * - pcs apa adanya
 */
function formatUnitDisplay(qty, unit) {
    const u = String(unit || '').toLowerCase();
    const n = Number(qty);
    if (!Number.isFinite(n)) return `${qty} ${unit || ''}`.trim();
    if (u === 'gram') {
        if (Math.abs(n) >= 1000) {
            const kg = n / 1000;
            const rounded = Math.round(kg * 10) / 10;
            return `${rounded.toString().replace('.', ',')} kg`;
        }
        return `${n} g`;
    }
    if (u === 'pcs') return `${n} pcs`;
    return `${n} ${u || ''}`.trim();
}
window.formatUnitDisplay = formatUnitDisplay;

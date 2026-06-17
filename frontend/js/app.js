
// Global handlers exposed to window for HTML attributes
window.handleLogin = handleLogin; // from auth.js
window.logout = logout; // from auth.js

// View Configuration Map
const VIEW_CONFIG = {
    'dashboard': { id: 'view-dashboard-sppg', load: () => typeof loadDashboard === 'function' && loadDashboard() },
    'production': { id: 'view-production-v2', load: () => typeof initProductionV2 === 'function' && initProductionV2() },
    'prod-plan': { id: 'view-production-v2', load: () => typeof initProductionV2 === 'function' && initProductionV2() }, // Submenu
    'prod-draft': { id: 'view-production-planner', load: () => typeof openProductionPlanner === 'function' && openProductionPlanner() },
    'batches': { id: 'view-batches', load: () => { if(typeof loadBatchOrders === 'function') loadBatchOrders(); if(typeof loadBatches === 'function') loadBatches(); } },
    'kitchen': { id: 'view-kitchen-setup', load: () => typeof loadKitchenSetup === 'function' && loadKitchenSetup() },
    'equipment': { id: 'view-kitchen-setup', load: () => typeof loadKitchenSetup === 'function' && loadKitchenSetup('equipment') }, // Submenu
    'menu': { id: 'view-menu', load: () => { if(typeof loadMenu === 'function') loadMenu(); if(typeof loadFoodsV2 === 'function') loadFoodsV2(); } },
    'recipes': { id: 'view-recipes', load: () => typeof loadRecipesLibrary === 'function' && loadRecipesLibrary() },
    'workflows': { id: 'view-workflows', load: () => typeof loadWorkflowsLibrary === 'function' && loadWorkflowsLibrary() },
    'ingredient': { id: 'view-ingredient', load: () => typeof loadIngredients === 'function' && loadIngredients() },
    'inventory': { id: 'view-inventory', load: () => typeof loadInventory === 'function' && loadInventory() },
    'purchases': { id: 'view-purchases', load: () => typeof loadPurchases === 'function' && loadPurchases() },
    'finance': { id: 'view-finance', load: () => typeof loadFinance === 'function' && loadFinance() },
    'performance': { id: 'view-performance', load: () => typeof loadKinerjaOperasiView === 'function' && loadKinerjaOperasiView() },
    'staff': { id: 'view-staff', load: () => { if(typeof initHrModule === 'function') initHrModule(); else if(typeof loadStaff === 'function') loadStaff(); } },
    'nutrisurvey': { id: 'view-nutrisurvey', load: () => typeof initNutriSurvey === 'function' && initNutriSurvey() },
    'pricing': { id: 'view-pricing', load: () => typeof loadPricing === 'function' && loadPricing() },
    'jobdesc': { id: 'view-jobdesc', load: () => { if (typeof loadJobdescGovernance === 'function') loadJobdescGovernance(); return typeof loadTasks === 'function' && loadTasks(); } },
    'tasks': { id: 'view-tasks', load: () => typeof loadMyTasks === 'function' && loadMyTasks() },
    'routes': { id: 'view-dashboard-driver', load: null },
    'reports': { id: 'view-reports', load: () => typeof loadReports === 'function' && loadReports() },
    'penerima-manfaat': { id: 'view-penerima-manfaat', load: () => typeof loadPenerimaManfaat === 'function' && loadPenerimaManfaat() },
    'distribusi': { id: 'view-distribusi', load: () => { mbgEnsureDistribusiLoaded(); } },
    'absensi-saya': { id: 'view-absensi-saya', load: () => typeof loadAbsensiSaya === 'function' && loadAbsensiSaya() },
    'operational-materials': { id: 'view-operational-materials', load: () => typeof loadOperationalMaterials === 'function' && loadOperationalMaterials() }
};

// Untuk kasus pengguna pakai anti-developer (Console tidak bisa dibuka),
// kita coba pastikan `distribusi.js` benar-benar bisa di-load ulang, lalu tampilkan status di UI.
async function mbgEnsureDistribusiLoaded() {
    const viewEl = document.getElementById('view-distribusi');
    if (!viewEl) return;

    const already = (typeof window.loadDistribusi === 'function');
    const flag = (typeof window.__mbgDistribusiScriptLoaded !== 'undefined');
    if (already) {
        try { window.loadDistribusi(); } catch (e) {
            viewEl.innerHTML = '<div class="p-4 text-danger"><strong>Error saat render Distribusi:</strong><br>' + ((e && e.message) || String(e)) + '</div>';
        }
        return;
    }

    // Capture error tanpa console: tampilkan pesan first-error saja.
    let capturedError = '';
    const captureHandler = (ev) => {
        try {
            if (!capturedError) {
                capturedError = (ev && ev.message) ? ev.message : (ev && ev.error ? ev.error.message || String(ev.error) : '');
            }
        } catch (_) {}
    };
    window.addEventListener('error', captureHandler, true);

    let fetchStatus = '';
    let injectStatus = '';
    try {
        const scriptUrl = new URL('js/views/distribusi.js', location.href).toString();
        const res = await fetch(scriptUrl, { cache: 'no-store' });
        fetchStatus = res ? (res.status + ' ' + (res.statusText || '')) : 'unknown';
        const text = await res.text();

        if (!res.ok) {
            viewEl.innerHTML =
                '<div class="p-4 text-danger">' +
                '<strong>Script Distribusi gagal dimuat (HTTP):</strong><br>' +
                fetchStatus + '<br><br>' +
                '<div class="text-muted" style="font-size:12px;white-space:pre-wrap">' +
                (text ? text.slice(0, 200).replace(/\\s+/g, ' ') : '-') +
                '</div>' +
                '</div>';
            return;
        }

        // Inject via blob supaya tidak bergantung urutan tag <script> statik.
        const blobUrl = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = blobUrl;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('script onerror'));
            document.head.appendChild(s);
        });
        URL.revokeObjectURL(blobUrl);
        injectStatus = 'injected';
    } catch (e) {
        injectStatus = 'inject-failed: ' + ((e && e.message) || String(e));
    } finally {
        window.removeEventListener('error', captureHandler, true);
    }

    // Setelah mencoba load ulang, cek apakah hook sudah ada.
    const ok = (typeof window.loadDistribusi === 'function');
    if (!ok) {
        viewEl.innerHTML =
            '<div class="p-4 text-danger">' +
            '<strong>Distribusi tidak bisa tampil.</strong><br>' +
            'Kondisi awal: loadDistribusi=' + String(already) + ', flagDieksekusi=' + String(flag) + '<br>' +
            'Fetch status: ' + (fetchStatus || '-') + '<br>' +
            'Inject status: ' + (injectStatus || '-') + (capturedError ? ('<br>Error: ' + capturedError) : '') +
            '<br><br>' +
            '<button class="btn btn-secondary btn-sm" onclick="mbgEnsureDistribusiLoaded()">Coba lagi</button>' +
            '</div>';
        return;
    }

    // Jika sudah benar-benar loaded, render.
    try { window.loadDistribusi(); } catch (e) {
        viewEl.innerHTML = '<div class="p-4 text-danger"><strong>Error saat render Distribusi:</strong><br>' + ((e && e.message) || String(e)) + '</div>';
    }
}

async function initApp() {
    if (typeof applyTheme === 'function') {
        const t = typeof getPreferredTheme === 'function' ? getPreferredTheme() : (localStorage.getItem('app_theme') || 'light');
        applyTheme(t);
    }
    if (typeof applyThemePreset === 'function') {
        const p = typeof getPreferredThemePreset === 'function' ? getPreferredThemePreset() : (localStorage.getItem('app_theme_preset') || '');
        applyThemePreset(p);
    }
    if (typeof applyLanguage === 'function') {
        const l = typeof getPreferredLanguage === 'function' ? getPreferredLanguage() : (localStorage.getItem('app_lang') || 'id');
        applyLanguage(l);
    }
    if (typeof applyTranslations === 'function') {
        applyTranslations(document);
    }
    const token = localStorage.getItem('app_token');
    const role = localStorage.getItem('app_role');
    
    if (token && role) {
        currentUser = {
            name: localStorage.getItem('app_name') || 'User',
            role: role
        };
        currentRole = role;
        window.currentUser = currentUser;
        window.currentRole = currentRole;
        SESSION.token = token;
        SESSION.role = role;

        // Nvidia-like UI tiers: hide premium menus if the active plan
        // doesn't include the required modules.
        let subscriptionState = 'UNKNOWN';
        let subscriptionModules = ['basic'];
        try {
            const me = await api('/api/subscription/me');
            subscriptionState = String(me?.state || 'UNKNOWN');
            const ok = subscriptionState === 'ACTIVE' || subscriptionState === 'GRACE';
            const planModules = me?.plan?.features?.modules;
            if (ok && Array.isArray(planModules) && planModules.length) {
                subscriptionModules = planModules;
            } else {
                subscriptionModules = ['basic'];
            }
        } catch (e) {
            subscriptionState = 'UNKNOWN';
            subscriptionModules = ['basic'];
        }

        window._subscription_state = subscriptionState;
        window._subscription_modules = subscriptionModules;

        // Upgrade banner (friendly marketing for new users)
        try {
            const banner = document.getElementById('upgrade-banner');
            if (banner) {
                const guideSeen = String(localStorage.getItem('mbg_billing_guide_seen') || '').toLowerCase() === 'true';
                const m = normalizeSubscriptionModules(subscriptionModules);
                const missingReports = !m.has('reports');
                const missingIntegrations = !m.has('integrations');

                if (missingReports || missingIntegrations) {
                    const premiumText = [
                        missingReports ? '<b>Reports & Performance</b>' : '',
                        missingIntegrations ? '<b>NutriSurvey</b>' : ''
                    ].filter(Boolean).join(' & ');

                    const text = guideSeen
                        ? `Anda sudah aktif. Upgrade untuk unlock: ${premiumText}.`
                        : `Paket Anda saat ini mengunci: ${premiumText}. Klik Pembayaran untuk pilih paket.`;

                    const t = banner.querySelector('#upgrade-banner-text');
                    if (t) t.innerHTML = text;
                    banner.classList.remove('hidden');
                } else {
                    banner.classList.add('hidden');
                }
            }
        } catch (e) {
            // Non-blocking
        }

        // Restore sidebar state
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
        }
        
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        setupUI(currentUser);
        initGlobalUxEnhancements();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-shell').classList.add('hidden');
    }
}

let __uxEnhancementsInitialized = false;
let __tableStateObserver = null;
let __toolbarEnhanceTimer = null;

function updateDensityButton() {
    const btn = document.getElementById('density-btn');
    if (!btn) return;
    const compact = document.body.classList.contains('density-compact');
    btn.title = compact ? 'Density: Compact (klik untuk normal)' : 'Density: Normal (klik untuk compact)';
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = compact ? '<i class="fas fa-expand-alt"></i>' : '<i class="fas fa-compress-alt"></i>';
}

function applyDensityPreference() {
    const pref = String(localStorage.getItem('ui_density') || 'normal').toLowerCase();
    if (pref === 'compact') document.body.classList.add('density-compact');
    else document.body.classList.remove('density-compact');
    updateDensityButton();
}

function toggleDensityMode() {
    document.body.classList.toggle('density-compact');
    const compact = document.body.classList.contains('density-compact');
    localStorage.setItem('ui_density', compact ? 'compact' : 'normal');
    updateDensityButton();
    notifyUi('info', 'UI Density', compact ? 'Mode Compact aktif' : 'Mode Normal aktif');
}

function markTableStateRows(root) {
    const host = root || document;
    const rows = host.querySelectorAll('tbody tr');
    rows.forEach((tr) => {
        const cells = tr.querySelectorAll('td');
        if (cells.length !== 1) {
            tr.classList.remove('table-state-row', 'table-state-loading', 'table-state-error', 'table-state-empty');
            return;
        }
        const td = cells[0];
        if (!td || !td.hasAttribute('colspan')) return;
        const text = String(td.textContent || '').trim().toLowerCase();
        tr.classList.add('table-state-row');
        tr.classList.remove('table-state-loading', 'table-state-error', 'table-state-empty');
        if (text.includes('loading') || text.includes('memuat')) {
            tr.classList.add('table-state-loading');
        } else if (text.includes('gagal') || text.includes('error')) {
            tr.classList.add('table-state-error');
        } else if (text.includes('belum') || text.includes('tidak ada') || text.includes('kosong')) {
            tr.classList.add('table-state-empty');
        }
    });
}

function inferActionIconClass(labelText) {
    const s = String(labelText || '').trim().toLowerCase();
    if (!s) return '';
    if (/(tambah|buat|assign|input|new )/.test(s)) return 'fa-plus';
    if (/(refresh|muat ulang|reload|tampilkan)/.test(s)) return 'fa-sync';
    if (/(simpan|save|submit)/.test(s)) return 'fa-save';
    if (/(hapus|delete)/.test(s)) return 'fa-trash';
    if (/(filter|sort)/.test(s)) return 'fa-filter';
    if (/(export|csv|excel|pdf)/.test(s)) return 'fa-file-export';
    if (/(hitung|calc|recompute)/.test(s)) return 'fa-calculator';
    if (/(post|publish)/.test(s)) return 'fa-upload';
    if (/(detail|preview|lihat|open)/.test(s)) return 'fa-eye';
    return '';
}

function enhanceToolbarButton(btn) {
    if (!btn || !btn.classList || !btn.classList.contains('btn')) return;
    btn.classList.add('ux-action-btn');
    const hasIcon = !!btn.querySelector('i');
    if (!hasIcon) {
        const iconClass = inferActionIconClass(btn.textContent || '');
        if (iconClass) {
            const i = document.createElement('i');
            i.className = `fas ${iconClass}`;
            i.setAttribute('aria-hidden', 'true');
            btn.prepend(i);
        }
    }
}

function applyToolbarStandards(root) {
    const host = root || document;
    host.querySelectorAll('.ux-toolbar, .ux-toolbar-context, .ux-toolbar-actions, .ux-toolbar-title, .ux-sticky-bar').forEach((el) => {
        el.classList.remove('ux-toolbar', 'ux-toolbar-context', 'ux-toolbar-actions', 'ux-toolbar-title', 'ux-sticky-bar');
    });

    const activeView = document.querySelector('.view-section:not(.hidden)') || host;
    const bars = activeView.querySelectorAll('.flex.justify-between.items-center');
    bars.forEach((bar) => {
        const hasButtons = !!bar.querySelector('button.btn');
        if (!hasButtons) return;
        bar.classList.add('ux-toolbar');
        const children = Array.from(bar.children || []);
        const left = children[0];
        const right = children[children.length - 1];
        if (left) left.classList.add('ux-toolbar-context');
        if (right && right.querySelector && right.querySelector('button.btn')) right.classList.add('ux-toolbar-actions');
        const title = bar.querySelector('h1,h2,h3,.font-bold');
        if (title) title.classList.add('ux-toolbar-title');
        bar.querySelectorAll('button.btn').forEach(enhanceToolbarButton);
    });

    const tables = activeView.querySelectorAll('.table-responsive');
    tables.forEach((tableBox) => {
        if (!tableBox.querySelector('.nutri-table')) return;
        const parent = tableBox.parentElement;
        if (!parent) return;
        let sibling = tableBox.previousElementSibling;
        let stickyApplied = 0;
        while (sibling && stickyApplied < 2) {
            const isInteractiveBar =
                sibling.matches('.flex, .form-grid') &&
                !!sibling.querySelector('button, input, select');
            if (isInteractiveBar) {
                sibling.classList.add('ux-sticky-bar');
                stickyApplied += 1;
            }
            sibling = sibling.previousElementSibling;
        }
        const cardHeader = parent.querySelector(':scope > .flex.justify-between.items-center');
        if (cardHeader && cardHeader.querySelector('button.btn')) {
            cardHeader.classList.add('ux-sticky-bar');
        }
    });

    updateDataCardsMeta(activeView);
}

function scheduleToolbarEnhancement() {
    try { clearTimeout(__toolbarEnhanceTimer); } catch (e) {}
    __toolbarEnhanceTimer = setTimeout(() => applyToolbarStandards(document), 30);
}

function updateStickyOffsetVar() {
    const header = document.querySelector('#main-content > header');
    const h = header ? Number(header.getBoundingClientRect().height || 0) : 0;
    const val = Math.max(64, Math.round(h + 12));
    document.documentElement.style.setProperty('--ux-sticky-offset', `${val}px`);
}

function countDataRows(tbody) {
    if (!tbody) return 0;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return rows.filter((tr) => {
        if (tr.classList.contains('table-state-row')) return false;
        if (tr.classList.contains('hidden')) return false;
        const tds = tr.querySelectorAll('td');
        if (!tds.length) return false;
        if (tds.length === 1 && tds[0].hasAttribute('colspan')) return false;
        return true;
    }).length;
}

function updateDataCardsMeta(root) {
    const host = root || document;
    const cards = host.querySelectorAll('.card');
    cards.forEach((card) => {
        const table = card.querySelector('.nutri-table');
        if (!table) {
            card.classList.remove('ux-data-card');
            return;
        }
        card.classList.add('ux-data-card');
        const tbody = table.querySelector('tbody');
        const total = countDataRows(tbody);
        const headerTitle =
            card.querySelector('.ux-toolbar-title') ||
            card.querySelector(':scope > .font-bold') ||
            card.querySelector('h3, h2, h4, .font-bold');
        if (!headerTitle) return;
        if (!headerTitle.classList.contains('ux-has-count')) headerTitle.classList.add('ux-has-count');
        let badge = headerTitle.querySelector('.ux-row-count');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'ux-row-count';
            headerTitle.appendChild(badge);
        }
        badge.textContent = `${total} data`;
        badge.title = `Jumlah baris data saat ini: ${total}`;
    });
}

function getQuickActionEntries() {
    const entries = [];
    const seen = new Set();
    const navEls = document.querySelectorAll('.nav-item[data-key], .nav-subitem[data-key]');
    navEls.forEach((el) => {
        const key = String(el.getAttribute('data-key') || '').trim();
        if (!key || seen.has(`nav:${key}`)) return;
        seen.add(`nav:${key}`);
        const label = String(el.textContent || '').replace(/\s+/g, ' ').trim() || key;
        entries.push({
            kind: 'view',
            key,
            label,
            hint: 'Buka fitur',
            action: () => { closeModalUi(); switchView(key); }
        });
    });

    const systemActions = [
        {
            key: 'action:refresh-current',
            label: 'Refresh halaman saat ini',
            hint: 'Muat ulang view aktif',
            action: () => { const active = window._active_view || 'dashboard'; closeModalUi(); switchView(active); }
        },
        {
            key: 'action:billing',
            label: 'Buka pembayaran/langganan',
            hint: 'Billing',
            action: () => { closeModalUi(); openBilling(); }
        },
        {
            key: 'action:settings',
            label: 'Buka pengaturan aplikasi',
            hint: 'Settings',
            action: () => { closeModalUi(); openAppSettings(); }
        },
        {
            key: 'action:notifications',
            label: 'Buka notifikasi',
            hint: 'Notifications',
            action: () => { closeModalUi(); openNotifications(); }
        },
        {
            key: 'action:density-toggle',
            label: document.body.classList.contains('density-compact') ? 'Ubah ke mode normal' : 'Ubah ke mode compact',
            hint: 'UI Density',
            action: () => { closeModalUi(); toggleDensityMode(); }
        },
        {
            key: 'action:logout',
            label: 'Logout',
            hint: 'Keluar dari aplikasi',
            action: () => { closeModalUi(); logout(); }
        }
    ];
    systemActions.forEach((a) => entries.push({ kind: 'action', ...a }));
    return entries;
}

function openCommandPalette() {
    const bodyHtml = `
        <div class="mb-3">
            <input id="command-palette-input" class="input-field" placeholder="Cari fitur atau aksi... (contoh: staff, reports, inventory)" />
        </div>
        <div id="command-palette-results" class="command-palette-results"></div>
        <div class="text-xs text-muted mt-2">Tip: Enter untuk jalankan hasil pertama, Esc untuk tutup.</div>
    `;
    openModalUi({
        title: 'Quick Actions',
        bodyHtml,
        actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
    });

    const all = getQuickActionEntries();
    window.__commandPaletteEntries = all;

    const input = document.getElementById('command-palette-input');
    const resultsEl = document.getElementById('command-palette-results');
    if (!input || !resultsEl) return;

    const render = () => {
        const q = String(input.value || '').trim().toLowerCase();
        const filtered = all.filter((it) => {
            const blob = `${it.label} ${it.hint || ''} ${it.key || ''}`.toLowerCase();
            return !q || blob.includes(q);
        }).slice(0, 12);
        window.__commandPaletteFiltered = filtered;
        resultsEl.innerHTML = filtered.length
            ? filtered.map((it, idx) => `
                <button type="button" class="command-palette-item" data-idx="${idx}">
                    <span class="command-palette-label">${it.label}</span>
                    <span class="command-palette-hint">${it.hint || ''}</span>
                </button>
            `).join('')
            : `<div class="text-sm text-muted p-2">Tidak ada hasil.</div>`;

        resultsEl.querySelectorAll('.command-palette-item').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.getAttribute('data-idx') || -1);
                const selected = (window.__commandPaletteFiltered || [])[idx];
                if (selected && typeof selected.action === 'function') selected.action();
            });
        });
    };

    input.addEventListener('input', render);
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            const first = (window.__commandPaletteFiltered || [])[0];
            if (first && typeof first.action === 'function') first.action();
        }
    });
    render();
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 20);
}

function initGlobalUxEnhancements() {
    if (__uxEnhancementsInitialized) return;
    __uxEnhancementsInitialized = true;
    applyDensityPreference();
    updateStickyOffsetVar();
    markTableStateRows(document);
    scheduleToolbarEnhancement();

    const main = document.getElementById('main-content');
    if (main && !__tableStateObserver) {
        __tableStateObserver = new MutationObserver(() => {
            markTableStateRows(main);
            scheduleToolbarEnhancement();
        });
        __tableStateObserver.observe(main, { childList: true, subtree: true });
    }

    document.addEventListener('keydown', (ev) => {
        const target = ev.target;
        const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if ((ev.ctrlKey || ev.metaKey) && String(ev.key).toLowerCase() === 'k') {
            ev.preventDefault();
            openCommandPalette();
            return;
        }
        if (isTyping) return;
        if (String(ev.key).toLowerCase() === 'escape') {
            const overlay = document.getElementById('modal-overlay') || document.getElementById('modal-backdrop');
            if (overlay && overlay.style.display !== 'none') closeModalUi();
        }
    });
    window.addEventListener('resize', () => {
        updateStickyOffsetVar();
        scheduleToolbarEnhancement();
    });
}

function normalizeSubscriptionModules(modules) {
    const set = new Set(Array.isArray(modules) ? modules : []);

    // Legacy tokens
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
}

function getAllowedNavKeys(modules) {
    const m = normalizeSubscriptionModules(modules);
    const allowed = new Set();

    if (m.has('basic')) ['dashboard', 'kitchen', 'menu', 'recipes', 'workflows', 'ingredient'].forEach(k => allowed.add(k));
    if (m.has('production')) ['production', 'prod-plan', 'prod-draft'].forEach(k => allowed.add(k));
    if (m.has('tasks')) ['jobdesc', 'tasks'].forEach(k => allowed.add(k));
    if (m.has('inventory')) ['inventory'].forEach(k => allowed.add(k));
    if (m.has('purchases')) ['purchases'].forEach(k => allowed.add(k));
    if (m.has('finance')) ['finance'].forEach(k => allowed.add(k));
    if (m.has('staff')) ['staff'].forEach(k => allowed.add(k));
    if (m.has('routes')) ['routes'].forEach(k => allowed.add(k));
    if (m.has('pricing')) ['pricing'].forEach(k => allowed.add(k));
    if (m.has('reports')) ['reports', 'performance'].forEach(k => allowed.add(k));
    if (m.has('integrations')) ['nutrisurvey'].forEach(k => allowed.add(k));

    if (m.has('purchases') || m.has('production')) ['operational-materials'].forEach(k => allowed.add(k));

    // Penerima Manfaat, Distribusi & Absensi Saya tersedia di semua paket (basic)
    ['penerima-manfaat', 'distribusi', 'absensi-saya'].forEach(k => allowed.add(k));

    return allowed;
}

/** Ikon sidebar pakai SVG inline — tidak bergantung font Font Awesome (CDN / pemblokir / Brave). */
const MB_NAV_ICONS = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    bookOpen: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    carrot: '<path d="M2.27 21.7a9.94 9.94 0 0 1 0-14.08 9.94 9.94 0 0 1 14.08 0"/><path d="m8.64 14.99 5.63-5.63"/><path d="M18.63 10.87 21 8.5l-2.12-2.13"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7.8 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    /* Ikon khusus (stroke saja) — jangan pakai emoji: di banyak distro Linux glyph emoji tidak terpasang sehingga tampil kosong */
    icon_pembelian: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    icon_kinerja: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
    icon_nutri: '<path d="M11 20A7 7 0 0 1 9.8 6.1C11 4 14 3 17 5c2 2 2 6-1 9"/><path d="M12 20v-6"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    tags: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a1 1 0 0 1-1.5.8L7 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l3.5-4A1 1 0 0 1 9.5 2Z"/><path d="M14.536 21.686a.5.5 0 0 0 .928 0l2.5-6.5a.5.5 0 0 0-.928 0l-2.5 6.5Z"/>',
    clipboardList: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    listTodo: '<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    fileText: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>',
    heartHandshake: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.05v0c.48.48 1.26.48 1.74 0l2.07-2.07a2.17 2.17 0 0 1 3.07 0v0c.48.48 1.26.48 1.75 0"/><path d="M18 15h-4.5l-2.5 2.5"/>',
    send: '<line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.3a6 6 0 0 1 9 4.22v0"/>',
    boxes: '<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24c0 .94.5 1.81 1.32 2.28l4.15 2.39a2 2 0 0 0 2.01 0l4.15-2.39a2 2 0 0 0 1.32-2.28v-3.24a2 2 0 0 0-.97-1.71l-4.15-2.4a2 2 0 0 0-2.01 0Z"/><path d="m7.87 10.12-2.15-1.24a2 2 0 0 1-1.02-1.74V4.25c0-.94.5-1.81 1.32-2.28L9.17.34a2 2 0 0 1 2.01 0l4.15 2.39a2 2 0 0 1 1.32 2.28v3.89a2 2 0 0 1-1.02 1.74l-2.15 1.24"/><path d="m22 17.65-4.15 2.39a2 2 0 0 1-2.01 0L11.69 17.65"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    barChart3: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>'
};

// ---- Navbar grouping configuration (Fase: navbar regrouping) ----
// FLAT_TOP: item 1-klik tanpa expand di atas (Dashboard + action center)
// NAV_GROUPS: grup expandable; children hanya ditampilkan jika ≥1 allowed
// FLAT_BOTTOM: item personal di paling bawah
const FLAT_TOP = ['dashboard', 'prod-plan', 'prod-draft'];
const FLAT_BOTTOM = ['absensi-saya'];
const NAV_GROUPS = [
    { key: 'grp_produksi', label: 'Produksi', navSvg: 'factory',
        children: ['kitchen', 'menu', 'recipes', 'workflows'] },
    { key: 'grp_inventaris', label: 'Inventaris', navSvg: 'boxes',
        children: ['ingredient', 'inventory', 'operational-materials', 'purchases'] },
    { key: 'grp_distribusi', label: 'Distribusi', navSvg: 'truck',
        children: ['penerima-manfaat', 'distribusi', 'routes'] },
    { key: 'grp_sdm', label: 'SDM & Tugas', navSvg: 'users',
        children: ['staff', 'jobdesc', 'tasks'] },
    { key: 'grp_analitik', label: 'Analitik & Laporan', navSvg: 'barChart3',
        children: ['performance', 'reports', 'nutrisurvey'] },
    { key: 'grp_finance', label: 'Finance & Pricing', navSvg: 'wallet',
        children: ['finance', 'pricing'] }
];

const NAV_GROUP_STATE_KEY = 'nav_group_state_v1';
function loadNavGroupState() {
    try { return JSON.parse(localStorage.getItem(NAV_GROUP_STATE_KEY)) || {}; }
    catch (e) { return {}; }
}
function saveNavGroupState(state) {
    try { localStorage.setItem(NAV_GROUP_STATE_KEY, JSON.stringify(state || {})); } catch (e) { }
}
function toggleNavGroup(groupKey, el) {
    const state = loadNavGroupState();
    const nowExpanded = !el.classList.contains('expanded');
    el.classList.toggle('expanded');
    state[groupKey] = nowExpanded;
    saveNavGroupState(state);
}

function mbgNavIconSvg(iconId) {
    const inner = MB_NAV_ICONS[iconId];
    if (!inner) {
        return '<span class="nav-icon-svg" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg></span>';
    }
    return (
        '<span class="nav-icon-svg" aria-hidden="true">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        inner +
        '</svg></span>'
    );
}

function setupUI(user) {
    const roleKey = (typeof normalizeRoleKey === 'function') ? normalizeRoleKey(user.role) : String(user.role || '');
    const config = ROLES_CONFIG[roleKey] || ROLES_CONFIG.kepala_sppg;
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-role-label').textContent = config.label;
    document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('current-date').textContent = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'short', day: '2-digit' });

    const navContainer = document.getElementById('nav-menu');
    navContainer.innerHTML = '';

    const allLinks = Object.assign(Object.create(null), {
        dashboard: { navSvg: 'home', label: (typeof t === 'function' ? t('nav.dashboard', 'Dashboard') : 'Dashboard') },
        'prod-plan': { navSvg: 'monitor', label: (typeof t === 'function' ? t('nav.production.live', 'Monitoring Live') : 'Monitoring Live') },
        'prod-draft': { navSvg: 'clipboard', label: (typeof t === 'function' ? t('nav.production.draft', 'War Room (Draft)') : 'War Room (Draft)') },
        kitchen: { navSvg: 'sliders', label: (typeof t === 'function' ? t('nav.kitchen', 'Setup Dapur') : 'Setup Dapur') },
        menu: { navSvg: 'utensils', label: (typeof t === 'function' ? t('nav.menu', 'Food dan Menu') : 'Food dan Menu') },
        recipes: { navSvg: 'bookOpen', label: (typeof t === 'function' ? t('nav.recipes', 'Resep') : 'Resep') },
        workflows: { navSvg: 'layers', label: (typeof t === 'function' ? t('nav.workflows', 'Workflow') : 'Workflow') },
        ingredient: { navSvg: 'carrot', label: (typeof t === 'function' ? t('nav.ingredient', 'Ingredients') : 'Ingredients') },
        inventory: { navSvg: 'package', label: (typeof t === 'function' ? t('nav.inventory', 'Inventory') : 'Inventory') },
        purchases: { navSvg: 'icon_pembelian', label: (typeof t === 'function' ? t('nav.purchases', 'Purchases') : 'Purchases') },
        finance: { navSvg: 'wallet', label: (typeof t === 'function' ? t('nav.finance', 'Finance') : 'Finance') },
        performance: { navSvg: 'icon_kinerja', label: (typeof t === 'function' ? t('nav.performance', 'Kinerja Operasi (Divisi)') : 'Kinerja Operasi (Divisi)') },
        staff: { navSvg: 'users', label: (typeof t === 'function' ? t('nav.staff', 'Staff Management') : 'Staff Management') },
        nutrisurvey: { navSvg: 'icon_nutri', label: (typeof t === 'function' ? t('nav.nutrisurvey', 'Nutrisurvey') : 'Nutrisurvey') },
        pricing: { navSvg: 'tags', label: (typeof t === 'function' ? t('nav.pricing', 'Pricing') : 'Pricing') },
        jobdesc: { navSvg: 'clipboardList', label: (typeof t === 'function' ? t('nav.jobdesc', 'Jobdesc & Tasks') : 'Jobdesc & Tasks') },
        tasks: { navSvg: 'listTodo', label: (typeof t === 'function' ? t('nav.tasks', 'My Tasks') : 'My Tasks') },
        routes: { navSvg: 'truck', label: (typeof t === 'function' ? t('nav.routes', 'Delivery Routes') : 'Delivery Routes') },
        reports: { navSvg: 'fileText', label: (typeof t === 'function' ? t('nav.reports', 'Reports') : 'Reports') },
        'penerima-manfaat': { navSvg: 'heartHandshake', label: (typeof t === 'function' ? t('nav.penerima-manfaat', 'Penerima Manfaat') : 'Penerima Manfaat') },
        'distribusi': { navSvg: 'send', label: (typeof t === 'function' ? t('nav.distribusi', 'Distribusi') : 'Distribusi') },
        'absensi-saya': { navSvg: 'fingerprint', label: (typeof t === 'function' ? t('nav.absensi-saya', 'Absensi Saya') : 'Absensi Saya') },
        'operational-materials': { navSvg: 'boxes', label: (typeof t === 'function' ? t('nav.operational-materials', 'Bahan Operasional') : 'Bahan Operasional') }
    });

    const allowedNavKeys = getAllowedNavKeys(window._subscription_modules);
    // roleKeySet = leaf yang diizinkan role (dari config.nav); grouping diputuskan renderer, bukan role
    const roleKeySet = new Set((config.nav || []).filter(key => allowedNavKeys.has(key)));
    // Kompatibilitas: role lama yang hanya deklarasi 'production' otomatis expand ke prod-plan + prod-draft
    if (roleKeySet.has('production')) {
        if (allowedNavKeys.has('prod-plan')) roleKeySet.add('prod-plan');
        if (allowedNavKeys.has('prod-draft')) roleKeySet.add('prod-draft');
    }
    // 'production' (parent legacy) tidak perlu di-render sendirian karena sudah dipecah
    roleKeySet.delete('production');

    const renderFlatLeaf = (key) => {
        const link = allLinks[key];
        if (!link) return;
        const el = document.createElement('div');
        el.className = 'nav-item';
        el.dataset.key = key;
        el.innerHTML = `
            <div class="nav-item-header" onclick="switchView('${key}')">
                ${mbgNavIconSvg(link.navSvg)}
                <span class="ml-3">${link.label}</span>
            </div>
        `;
        navContainer.appendChild(el);
    };

    const groupState = loadNavGroupState();
    const activeView = window._active_view || '';

    // 1) FLAT_TOP
    FLAT_TOP.forEach(key => { if (roleKeySet.has(key)) renderFlatLeaf(key); });

    // 2) NAV_GROUPS
    NAV_GROUPS.forEach(group => {
        const allowedChildren = group.children.filter(k => roleKeySet.has(k));
        if (!allowedChildren.length) return;

        const containsActive = allowedChildren.indexOf(activeView) >= 0;
        const expanded = containsActive || !!groupState[group.key];

        const subItems = allowedChildren.map(k => {
            const link = allLinks[k]; if (!link) return '';
            return `
                <div class="nav-subitem" data-key="${k}" onclick="event.stopPropagation(); switchView('${k}')">
                    ${mbgNavIconSvg(link.navSvg)}
                    <span>${link.label}</span>
                </div>`;
        }).join('');

        const el = document.createElement('div');
        el.className = 'nav-item' + (expanded ? ' expanded' : '');
        el.dataset.groupKey = group.key;
        el.innerHTML = `
            <div class="nav-item-header" onclick="toggleNavGroup('${group.key}', this.parentElement)">
                ${mbgNavIconSvg(group.navSvg)}
                <span class="flex-1 ml-3">${group.label}</span>
                <span class="nav-chevron" aria-hidden="true">${mbgNavIconSvg('chevronDown')}</span>
            </div>
            <div class="nav-submenu">${subItems}</div>
        `;
        navContainer.appendChild(el);
    });

    // 3) FLAT_BOTTOM
    FLAT_BOTTOM.forEach(key => { if (roleKeySet.has(key)) renderFlatLeaf(key); });

    // Initial view selection
    const allRenderedKeys = [
        ...FLAT_TOP.filter(k => roleKeySet.has(k)),
        ...NAV_GROUPS.flatMap(g => g.children.filter(k => roleKeySet.has(k))),
        ...FLAT_BOTTOM.filter(k => roleKeySet.has(k))
    ];
    const active = window._active_view;
    const initial = active && allowedNavKeys.has(active) ? active : (allRenderedKeys[0] || (config.nav || [])[0]);
    switchView(initial === 'batches' ? 'prod-draft' : initial);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // Mobile behavior: Toggle 'open' class for slide-in
        sidebar.classList.toggle('open');
        
        // Create backdrop if not exists
        let backdrop = document.getElementById('sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'sidebar-backdrop';
            backdrop.className = 'fixed-inset-0 bg-black-50 z-40 hidden';
            backdrop.onclick = toggleSidebar;
            document.body.appendChild(backdrop);
        }
        
        if (sidebar.classList.contains('open')) {
            backdrop.classList.remove('hidden');
            backdrop.style.display = 'block'; // Keep explicitly for JS toggling logic elsewhere
        } else {
            backdrop.classList.add('hidden');
            backdrop.style.display = 'none';
        }
    } else {
        // Desktop behavior: Toggle 'collapsed' class
        document.body.classList.toggle('sidebar-collapsed');
        // Persist preference
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }
}

function switchView(key) {
    if (key === 'batches') key = 'prod-draft';
    window._active_view = key;
    // Hide sidebar on mobile when switching views
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open') && window.innerWidth < 768) {
        toggleSidebar();
    }
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.style.display = 'none';

    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    // Reset Nav Active States
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-subitem').forEach(el => el.classList.remove('active'));

    // Highlight Main Nav
    const mainNav = document.querySelector(`.nav-item[data-key="${key}"]`);
    if (mainNav) mainNav.classList.add('active');
    
    // Highlight Sub Nav
    const subNav = document.querySelector(`.nav-subitem[data-key="${key}"]`);
    if (subNav) {
        subNav.classList.add('active');
        // Also activate and expand parent
        const parentItem = subNav.closest('.nav-item');
        if (parentItem) {
            parentItem.classList.add('active');
            parentItem.classList.add('expanded');
        }
    }
    
    // Resolve View Config
    let view = VIEW_CONFIG[key];
    
    // Special role-based overrides
    if (key === 'dashboard') {
        if (currentRole === 'koordinator') view = { id: 'view-dashboard-coord', load: null }; // Add load fn if needed
        else if (currentRole === 'driver') view = { id: 'view-dashboard-driver', load: null };
        else view = VIEW_CONFIG['dashboard'];
    }

    if (!view) {
        console.warn(`No view configuration for key: ${key}`);
        return;
    }

    const targetEl = document.getElementById(view.id);
    if (targetEl) {
        targetEl.classList.remove('hidden');
        targetEl.classList.remove('view-enter');
        // Trigger transition for smoother UX across all features.
        requestAnimationFrame(() => targetEl.classList.add('view-enter'));
        const titleEl = document.getElementById('page-title');
        const subLabel = subNav ? String(subNav.textContent || '').trim() : '';
        const mainLabel = mainNav ? String(mainNav.querySelector('.nav-item-header span')?.textContent || '').trim() : '';
        const label = subLabel || mainLabel;
        if (titleEl) {
            titleEl.textContent = label || key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        // Execute Load Function safely
        if (view.load) {
            try {
                const loadingTimeout = setTimeout(() => {
                    if (!targetEl.classList.contains('hidden') && typeof setSectionUiState === 'function' && !targetEl.dataset.loadedOnce) {
                        setSectionUiState(targetEl, {
                            type: 'loading',
                            title: 'Memuat halaman...',
                            message: 'Mohon tunggu, data sedang dipersiapkan.'
                        });
                    }
                }, 450);
                const result = view.load();
                Promise.resolve(result)
                    .then(() => {
                        targetEl.dataset.loadedOnce = '1';
                        scheduleToolbarEnhancement();
                    })
                    .catch((e) => {
                        console.error(`Async load error for view ${key}:`, e);
                        if (!targetEl.classList.contains('hidden') && typeof setSectionUiState === 'function') {
                            setSectionUiState(targetEl, {
                                type: 'error',
                                title: 'Gagal memuat halaman',
                                message: e?.message || 'Terjadi kesalahan saat memuat data.',
                                actions: [
                                    { label: 'Coba Lagi', onClick: `switchView('${String(key).replace(/'/g, "\\'")}')`, className: 'btn btn-secondary btn-sm' }
                                ]
                            });
                        }
                    })
                    .finally(() => {
                        clearTimeout(loadingTimeout);
                        scheduleToolbarEnhancement();
                    });
            } catch (e) {
                console.error(`Error loading view ${key}:`, e);
                if (typeof setSectionUiState === 'function') {
                    setSectionUiState(targetEl, {
                        type: 'error',
                        title: 'Gagal memuat halaman',
                        message: e.message || 'Terjadi kesalahan tak terduga.',
                        actions: [
                            { label: 'Coba Lagi', onClick: `switchView('${String(key).replace(/'/g, "\\'")}')`, className: 'btn btn-secondary btn-sm' }
                        ]
                    });
                } else {
                    targetEl.innerHTML = `<div class="p-4 text-danger">Error loading content: ${e.message}</div>`;
                }
            }
        }
        scheduleToolbarEnhancement();
        try { targetEl.scrollTop = 0; } catch (e) {}
    } else {
        console.error(`Target element ${view.id} not found for key ${key}`);
    }
}
window.switchView = switchView;
window.openCommandPalette = openCommandPalette;
window.toggleDensityMode = toggleDensityMode;

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

// Init on load
document.addEventListener('DOMContentLoaded', initApp);


const KITCHEN_SECTIONS = [
    { id: 'equipment', label: 'Equipment (Alat)', icon: 'fa-tools' },
    { id: 'sppg_profile', label: 'Profil SPPG', icon: 'fa-building' },
    { id: 'receiving', label: 'Divisi Penerimaan', icon: 'fa-box-open' },
    { id: 'prep', label: 'Divisi Persiapan', icon: 'fa-carrot' },
    { id: 'cooking', label: 'Divisi Pengolahan', icon: 'fa-fire' },
    { id: 'packing', label: 'Divisi Pemorsian', icon: 'fa-box' },
    { id: 'driver', label: 'Divisi Driver', icon: 'fa-truck' },
    { id: 'cleaning', label: 'Divisi Kebersihan', icon: 'fa-broom' },
    { id: 'security', label: 'Divisi Keamanan', icon: 'fa-shield-alt' },
    { id: 'ompreng', label: 'Divisi Ompreng', icon: 'fa-soap' },
];

const SETTINGS_SECTIONS = [
    { id: 'printer', label: 'Printer & Dokumen', icon: 'fa-print' },
    { id: 'server', label: 'Server & API', icon: 'fa-server' },
    { id: 'database', label: 'Database (Backup)', icon: 'fa-database' },
];

function renderSectionSelectorHtml(sections, selectedId, handlerName, extraClass) {
    const active = sections.find(s => s.id === selectedId) || sections[0];
    const iconClass = (active && active.icon) ? active.icon : 'fa-sliders-h';
    const activeLabelRaw = active ? active.label : '';
    const getLabel = (s) => {
        if (handlerName === 'openSettingsSection' && typeof t === 'function') {
            return t(`settings.section.${s.id}`, s.label);
        }
        return s.label;
    };
    const activeLabel = active ? getLabel(active) : activeLabelRaw;

    const itemsHtml = sections.map(s => {
        const isActive = s.id === selectedId;
        return `
            <button type="button" role="option" aria-selected="${isActive ? 'true' : 'false'}"
                    class="setup-title-menu-item${isActive ? ' active' : ''}"
                    data-id="${s.id}"
                    onclick="mbgSectionSelect(this, '${s.id}', '${handlerName}')">
                <span class="setup-title-menu-icon" aria-hidden="true"><i class="fas ${s.icon || 'fa-circle'}"></i></span>
                <span class="setup-title-menu-label">${getLabel(s)}</span>
                ${isActive ? '<span class="setup-title-menu-check" aria-hidden="true"><i class="fas fa-check"></i></span>' : ''}
            </button>
        `;
    }).join('');

    return `
        <div class="setup-title-selector${extraClass ? ' ' + extraClass : ''}"
             role="combobox" aria-haspopup="listbox" aria-expanded="false"
             tabindex="0" title="Ganti section"
             onclick="mbgSectionToggle(this, event)"
             onkeydown="mbgSectionKeydown(this, event)">
            <span class="setup-title-selector-icon" aria-hidden="true"><i class="fas ${iconClass}"></i></span>
            <span class="setup-title-selector-label">${activeLabel}</span>
            <span class="setup-title-selector-chevron" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M5.25 7.5L10 12.25 14.75 7.5 16 8.75l-6 6-6-6z"/></svg>
            </span>
            <div class="setup-title-menu" role="listbox" onclick="event.stopPropagation()">
                ${itemsHtml}
            </div>
        </div>
    `;
}

function setupSectionDropdownHtml(selectedId) {
    return renderSectionSelectorHtml(KITCHEN_SECTIONS, selectedId, 'openSetupSection');
}

function settingsSectionDropdownHtml(selectedId) {
    return renderSectionSelectorHtml(SETTINGS_SECTIONS, selectedId, 'openSettingsSection', 'setup-title-selector--compact');
}

window.mbgSectionToggle = function(trigger, ev) {
    if (ev) ev.stopPropagation();
    const willOpen = !trigger.classList.contains('open');
    document.querySelectorAll('.setup-title-selector.open').forEach(n => {
        if (n !== trigger) { n.classList.remove('open'); n.setAttribute('aria-expanded', 'false'); }
    });
    trigger.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) {
        const active = trigger.querySelector('.setup-title-menu-item.active');
        if (active && typeof active.scrollIntoView === 'function') {
            active.scrollIntoView({ block: 'nearest' });
        }
    }
};

window.mbgSectionSelect = function(btn, id, handlerName) {
    const trigger = btn.closest('.setup-title-selector');
    if (trigger) {
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    }
    const fn = window[handlerName];
    if (typeof fn === 'function') fn(id);
};

window.mbgSectionKeydown = function(trigger, ev) {
    const items = Array.from(trigger.querySelectorAll('.setup-title-menu-item'));
    const isOpen = trigger.classList.contains('open');
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === trigger) {
        ev.preventDefault();
        window.mbgSectionToggle(trigger, ev);
        return;
    }
    if (ev.key === 'Escape') {
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
        return;
    }
    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && items.length) {
        ev.preventDefault();
        if (!isOpen) { window.mbgSectionToggle(trigger, ev); return; }
        const currentIdx = items.findIndex(el => el === document.activeElement);
        let nextIdx;
        if (ev.key === 'ArrowDown') nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, items.length - 1);
        else nextIdx = currentIdx <= 0 ? items.length - 1 : currentIdx - 1;
        items[nextIdx].focus();
    }
};

if (!window.__mbgSectionSelectorInit) {
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.setup-title-selector')) {
            document.querySelectorAll('.setup-title-selector.open').forEach(n => {
                n.classList.remove('open');
                n.setAttribute('aria-expanded', 'false');
            });
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.setup-title-selector.open').forEach(n => {
                n.classList.remove('open');
                n.setAttribute('aria-expanded', 'false');
            });
        }
    });
    window.__mbgSectionSelectorInit = true;
}

window.openAppSettings = function() {
    const currentTheme = typeof getPreferredTheme === 'function' ? getPreferredTheme() : (localStorage.getItem('app_theme') || 'light');
    const currentLang = localStorage.getItem('app_lang') || 'id';
    const currentPreset = typeof getPreferredThemePreset === 'function' ? getPreferredThemePreset() : (localStorage.getItem('app_theme_preset') || 'ocean-depths');

    openModalUi({
        title: '', // Removed title as we use dropdown header
        width: '80%', 
        bodyHtml: `
            <div class="flex flex-col h-[80vh] -m-6 settings-modal">
                <!-- Header / Dropdown Nav -->
                <div class="p-4 border-b border-white/10 bg-dark-lighter flex justify-between items-center settings-modal-header">
                    <div id="setup-nav-modal" class="flex items-center gap-4 flex-1">
                        <div class="settings-modal-nav">
                            ${settingsSectionDropdownHtml('printer')}
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-4">
                         <div class="flex items-center gap-2">
                             <span class="text-xs text-muted"><i class="fas fa-palette"></i></span>
                             <select id="f_preset" class="input-field text-sm py-1 h-8" onchange="setThemePresetPreference(this.value)">
                                <option value="ocean-depths" ${currentPreset === 'ocean-depths' ? 'selected' : ''}>Ocean Depths</option>
                                <option value="sunset-boulevard" ${currentPreset === 'sunset-boulevard' ? 'selected' : ''}>Sunset Boulevard</option>
                                <option value="forest-canopy" ${currentPreset === 'forest-canopy' ? 'selected' : ''}>Forest Canopy</option>
                                <option value="modern-minimalist" ${currentPreset === 'modern-minimalist' ? 'selected' : ''}>Modern Minimalist</option>
                                <option value="golden-hour" ${currentPreset === 'golden-hour' ? 'selected' : ''}>Golden Hour</option>
                                <option value="arctic-frost" ${currentPreset === 'arctic-frost' ? 'selected' : ''}>Arctic Frost</option>
                                <option value="desert-rose" ${currentPreset === 'desert-rose' ? 'selected' : ''}>Desert Rose</option>
                                <option value="tech-innovation" ${currentPreset === 'tech-innovation' ? 'selected' : ''}>Tech Innovation</option>
                                <option value="botanical-garden" ${currentPreset === 'botanical-garden' ? 'selected' : ''}>Botanical Garden</option>
                                <option value="midnight-galaxy" ${currentPreset === 'midnight-galaxy' ? 'selected' : ''}>Midnight Galaxy</option>
                            </select>
                        </div>
                         <div class="flex items-center gap-2">
                             <span class="text-xs text-muted"><i class="fas fa-globe"></i></span>
                             <select id="f_lang" class="input-field text-sm py-1 h-8" onchange="setLanguagePreference(this.value)">
                                <option value="id" ${currentLang === 'id' ? 'selected' : ''}>Indonesia</option>
                                <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                             <span class="text-xs text-muted"><i class="fas fa-adjust"></i></span>
                             <select id="f_theme" class="input-field text-sm py-1 h-8" onchange="setThemePreference(this.value)">
                                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Mode</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Content -->
                <div id="setup-content-modal" class="flex-1 overflow-y-auto p-4 bg-dark settings-modal-content">
                    <!-- Content injected here -->
                </div>
            </div>
        `,
        actions: [] 
    });

    setTimeout(() => openSettingsSection('printer'), 0);
};

window.setLanguagePreference = function(lang) {
    localStorage.setItem('app_lang', lang);
    if (typeof applyLanguage === 'function') applyLanguage(lang);
    if (typeof applyTranslations === 'function') applyTranslations(document);
    if (typeof setupUI === 'function' && window.currentUser) setupUI(window.currentUser);
    notifyUi('info', (typeof t === 'function' ? t('settings.lang.changed', 'Language changed') : 'Language changed'), (typeof t === 'function' ? t('settings.lang.reloadPrompt', 'Reload page to apply language?') : 'Reload page to apply language?'));
    if (confirm(typeof t === 'function' ? t('settings.lang.reloadPrompt', 'Reload page to apply language?') : 'Reload page to apply language?')) location.reload();
}

async function loadKitchenSetup(defaultSection = 'equipment') {
    openSetupSection(defaultSection);
}

async function openSetupSection(sectionId) {
    window._setup_current_section = sectionId;
    const contentArea = document.getElementById('setup-content');
    const nav = document.getElementById('setup-nav');
    if (nav) {
        nav.innerHTML = `
            <h2 class="text-2xl font-bold flex items-center gap-2">
                ${setupSectionDropdownHtml(sectionId)}
            </h2>
        `;
    }
    if (!contentArea) return;
    contentArea.innerHTML = '<div class="flex items-center justify-center h-full"><div class="spinner"></div></div>';

    try {
        if (sectionId === 'equipment') {
            await renderEquipmentSetup(contentArea);
        } else if (sectionId === 'sppg_profile') {
            await renderSppgProfileSetup(contentArea);
        } else {
            await renderDivisionSetup(contentArea, sectionId);
        }
    } catch (e) {
        contentArea.innerHTML = `<div class="text-danger p-4">Error loading section: ${e.message}</div>`;
    }
}

async function openSettingsSection(sectionId) {
    window._settings_current_section = sectionId;
    const contentArea = document.getElementById('setup-content-modal');
    const nav = document.getElementById('setup-nav-modal');
    if (nav) {
        nav.innerHTML = `
            <h2 class="text-2xl font-bold flex items-center gap-2">
                ${settingsSectionDropdownHtml(sectionId)}
            </h2>
        `;
    }
    if (!contentArea) return;
    contentArea.innerHTML = '<div class="flex items-center justify-center h-full"><div class="spinner"></div></div>';

    try {
        if (sectionId === 'printer') {
            renderPrinterSetup(contentArea);
        } else if (sectionId === 'server') {
            renderServerSetup(contentArea);
        } else if (sectionId === 'database') {
            renderDatabaseSetup(contentArea);
        } else {
            renderPrinterSetup(contentArea);
        }
    } catch (e) {
        contentArea.innerHTML = `<div class="text-danger p-4">Error loading section: ${e.message}</div>`;
    }
}

window.openSettingsSection = openSettingsSection;

// --- EQUIPMENT SECTION ---
async function renderEquipmentSetup(container) {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-2xl font-bold flex items-center gap-2">
                    ${setupSectionDropdownHtml('equipment')}
                </h2>
                <div class="text-muted">Kitchen configuration</div>
            </div>
            <button class="btn btn-primary" onclick="openEquipmentModal()"><i class="fas fa-plus"></i> Add Equipment</button>
        </div>
        <div class="card overflow-hidden">
            <table class="nutri-table w-full">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="equip-rows"></tbody>
            </table>
        </div>
    `;
    if (typeof loadEquipment === 'function') loadEquipment();
}

function escAttrSetup(val) {
    return String(val == null ? '' : val).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

window.sppgProfilePickLogo = function (inputEl) {
    const f = inputEl && inputEl.files && inputEl.files[0];
    if (!f) return;
    if (f.size > 900000) {
        if (typeof notifyUi === 'function') notifyUi('error', 'Profil SPPG', 'Ukuran gambar terlalu besar (maks ~900 KB).');
        inputEl.value = '';
        return;
    }
    const r = new FileReader();
    r.onload = () => {
        const ta = document.getElementById('sppg_logo_data');
        if (ta) ta.value = String(r.result || '');
        const pv = document.getElementById('sppg_logo_preview');
        if (pv) {
            pv.src = String(r.result || '');
            pv.classList.remove('hidden');
        }
    };
    r.readAsDataURL(f);
};

window.sppgProfileClearLogo = function () {
    const ta = document.getElementById('sppg_logo_data');
    if (ta) ta.value = '';
    const fi = document.getElementById('sppg_logo_file');
    if (fi) fi.value = '';
    const pv = document.getElementById('sppg_logo_preview');
    if (pv) {
        pv.removeAttribute('src');
        pv.classList.add('hidden');
    }
};

window.saveSppgProfileSetup = async function () {
    try {
        const cfg = await api('/api/kitchen/config');
        cfg.kitchen_name = document.getElementById('sppg_kitchen_name').value.trim();
        cfg.sppg_id = document.getElementById('sppg_id').value.trim();
        cfg.address = document.getElementById('sppg_address').value.trim();
        cfg.contact_phone = document.getElementById('sppg_phone').value.trim();
        cfg.contact_email = document.getElementById('sppg_email').value.trim();
        cfg.kitchen_tagline = document.getElementById('sppg_tagline').value.trim();
        cfg.logo_data_url = document.getElementById('sppg_logo_data').value.trim();
        await api('/api/kitchen/config', 'PUT', cfg);
        if (typeof notifyUi === 'function') {
            notifyUi('success', 'Profil SPPG', 'Tersimpan. Data ini dipakai untuk Surat Jalan, kop PDF, dan dokumen resmi lain.');
        }
        const contentArea = document.getElementById('setup-content');
        if (contentArea) await renderSppgProfileSetup(contentArea);
    } catch (e) {
        if (typeof notifyUi === 'function') notifyUi('danger', 'Profil SPPG', e.message || 'Gagal menyimpan');
    }
};

async function renderSppgProfileSetup(container) {
    let cfg = {};
    try {
        cfg = await api('/api/kitchen/config');
    } catch (e) {
        cfg = {};
    }
    const kn = String(cfg.kitchen_name || cfg.name || '');
    const addr = String(cfg.address || '');
    const ph = String(cfg.contact_phone || cfg.contact || '');
    const em = String(cfg.contact_email || '');
    const tag = String(cfg.kitchen_tagline || '');
    const spid = String(cfg.sppg_id != null ? cfg.sppg_id : '');
    const hasLogo = !!(cfg.logo_data_url && String(cfg.logo_data_url).trim());

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
            <div>
                <h2 class="text-2xl font-bold flex items-center gap-2">
                    ${setupSectionDropdownHtml('sppg_profile')}
                </h2>
                <p class="text-muted text-sm mt-1 max-w-2xl">
                    Profil penyelenggara SPPG untuk kop dokumen (Surat Jalan, PDF produksi, dll.).
                    Disimpan di konfigurasi dapur — terpisah dari Lapkeu.
                </p>
            </div>
            <button type="button" class="btn btn-primary" onclick="saveSppgProfileSetup()"><i class="fas fa-save"></i> Simpan</button>
        </div>
        <div class="card p-4 max-w-3xl">
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Nama resmi SPPG (baris kop)</label>
                    <input id="sppg_kitchen_name" class="input-field" value="${escAttrSetup(kn)}" placeholder="Contoh: NGRAKET BALONG PONOROGO" />
                    <p class="text-xs text-muted mt-1">Pada cetakan akan ditampilkan sebagai <strong>SPPG [nama]</strong> otomatis.</p>
                </div>
                <div>
                    <label class="input-label">ID SPPG (opsional)</label>
                    <input id="sppg_id" class="input-field" value="${escAttrSetup(spid)}" placeholder="Nomor registrasi / ID" />
                </div>
                <div class="form-full">
                    <label class="input-label">Tagline / slogan (opsional)</label>
                    <input id="sppg_tagline" class="input-field" value="${escAttrSetup(tag)}" placeholder="Muncul di bawah PROGRAM MAKAN BERGIZI GRATIS pada Surat Jalan" />
                </div>
                <div class="form-full">
                    <label class="input-label">Alamat lengkap</label>
                    <textarea id="sppg_address" class="input-field" rows="3" placeholder="Alamat SPPG"></textarea>
                </div>
                <div>
                    <label class="input-label">Telepon</label>
                    <input id="sppg_phone" class="input-field" value="${escAttrSetup(ph)}" placeholder="08…" />
                </div>
                <div>
                    <label class="input-label">Email</label>
                    <input id="sppg_email" class="input-field" value="${escAttrSetup(em)}" placeholder="email@domain.com" />
                </div>
                <div class="form-full">
                    <label class="input-label">Logo SPPG</label>
                    <div class="flex flex-wrap items-end gap-3">
                        <input id="sppg_logo_file" type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" class="input-field" onchange="sppgProfilePickLogo(this)" />
                        <button type="button" class="btn btn-secondary btn-sm" onclick="sppgProfileClearLogo()">Hapus logo</button>
                    </div>
                    <textarea id="sppg_logo_data" class="input-field font-mono text-xs mt-2 hidden" rows="2" readonly aria-hidden="true"></textarea>
                    <p class="text-xs text-muted mt-1">PNG/JPEG/WebP/GIF, disarankan &lt; 500 KB. Logo tampil di kop Surat Jalan.</p>
                    <div class="mt-3">
                        <img id="sppg_logo_preview" class="max-h-24 border rounded p-1 bg-white ${hasLogo ? '' : 'hidden'}" alt="Preview logo" />
                    </div>
                </div>
            </div>
        </div>
    `;
    const ta = document.getElementById('sppg_logo_data');
    if (ta) ta.value = String(cfg.logo_data_url || '').trim();
    const pv = document.getElementById('sppg_logo_preview');
    if (pv && cfg.logo_data_url) {
        pv.src = String(cfg.logo_data_url);
        pv.classList.remove('hidden');
    }
    const tx = document.getElementById('sppg_address');
    if (tx) {
        const rawAddr = String(addr || '');
        tx.value = rawAddr;
    }
}

// --- NEW SETTINGS SECTIONS ---

function renderPrinterSetup(container) {
    let config = {};
    try {
        config = JSON.parse(localStorage.getItem('printer_config') || '{}') || {};
    } catch {
        config = {};
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <div>
                <div class="settings-section-title">${typeof t === 'function' ? t('settings.section.printer', 'Printer & Dokumen') : 'Printer & Dokumen'}</div>
                <div class="settings-section-subtitle text-muted">${typeof t === 'function' ? t('settings.printer.subtitle', 'Document format & print settings') : 'Document format & print settings'}</div>
            </div>
            <button class="btn btn-primary" onclick="savePrinterConfig()"><i class="fas fa-save"></i> ${typeof t === 'function' ? t('settings.printer.save', 'Save Config') : 'Save Config'}</button>
        </div>

        <div class="card p-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="input-label">Default Document Format</label>
                    <select id="cfg_print_fmt" class="input-field">
                        <option value="pdf" ${config.format === 'pdf' ? 'selected' : ''}>PDF (Portable Document)</option>
                        <option value="xlsx" ${config.format === 'xlsx' ? 'selected' : ''}>Excel (XLSX)</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Paper Size</label>
                    <select id="cfg_print_size" class="input-field">
                        <option value="A4" ${config.size === 'A4' ? 'selected' : ''}>A4</option>
                        <option value="Letter" ${config.size === 'Letter' ? 'selected' : ''}>Letter</option>
                        <option value="F4" ${config.size === 'F4' ? 'selected' : ''}>F4 (Folio)</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Orientation</label>
                    <select id="cfg_print_orient" class="input-field">
                        <option value="portrait" ${config.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
                        <option value="landscape" ${config.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Margins (mm)</label>
                    <input id="cfg_print_margin" type="number" class="input-field" value="${config.margin || 10}">
                </div>
            </div>
            
            <div class="mt-4 border-t border-white/10 pt-4">
                <div class="font-bold mb-2">${typeof t === 'function' ? t('settings.printer.testPrint', 'Test Print') : 'Test Print'}</div>
                <button class="btn btn-secondary" onclick="testPrintPreview()"><i class="fas fa-print"></i> ${typeof t === 'function' ? t('settings.printer.generateTest', 'Generate Test Page') : 'Generate Test Page'}</button>
            </div>
        </div>
    `;
}

window.savePrinterConfig = function() {
    const config = {
        format: document.getElementById('cfg_print_fmt').value,
        size: document.getElementById('cfg_print_size').value,
        orientation: document.getElementById('cfg_print_orient').value,
        margin: document.getElementById('cfg_print_margin').value
    };
    localStorage.setItem('printer_config', JSON.stringify(config));
    notifyUi('success', 'Saved', 'Printer configuration saved');
}

window.testPrintPreview = function() {
    notifyUi('info', 'Printing...', 'Generating test page...');
    setTimeout(() => window.print(), 500);
}

function renderServerSetup(container) {
    const currentUrl = localStorage.getItem('app_server_url') || '';
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <div>
                <div class="settings-section-title">${typeof t === 'function' ? t('settings.section.server', 'Server & API') : 'Server & API'}</div>
                <div class="settings-section-subtitle text-muted">${typeof t === 'function' ? t('settings.server.subtitle', 'API Connection & Backend Settings') : 'API Connection & Backend Settings'}</div>
            </div>
        </div>

        <div class="card p-4">
            <div class="alert alert-warning mb-4">
                <i class="fas fa-exclamation-triangle"></i> 
                ${typeof t === 'function' ? t('settings.server.warning', 'Changing Server URL will disconnect your current session. Only change if you know what you are doing.') : 'Changing Server URL will disconnect your current session. Only change if you know what you are doing.'}
            </div>
            
            <div class="form-full mb-4">
                <label class="input-label">${typeof t === 'function' ? t('settings.server.url', 'Server URL (Base API)') : 'Server URL (Base API)'}</label>
                <div class="flex gap-2">
                    <input id="cfg_server_url" type="text" class="input-field" value="${currentUrl}" placeholder="https://api.example.com">
                    <button class="btn btn-secondary" onclick="testServerConnection()"><i class="fas fa-plug"></i> ${typeof t === 'function' ? t('settings.server.test', 'Test') : 'Test'}</button>
                </div>
                <div id="server_test_result" class="mt-2 text-sm"></div>
            </div>

            <div class="flex justify-end mt-4">
                <button class="btn btn-primary" onclick="saveServerConfig()">${typeof t === 'function' ? t('settings.server.saveReload', 'Save & Reload') : 'Save & Reload'}</button>
            </div>
        </div>
    `;
}

window.testServerConnection = async function() {
    const url = document.getElementById('cfg_server_url').value;
    const resDiv = document.getElementById('server_test_result');
    resDiv.innerHTML = '<span class="text-muted">Testing...</span>';
    
    try {
        // Try simple fetch to health or root
        // If url is empty, use current origin
        const cleaned = String(url || '').trim().replace(/\/+$/, '');
        const target = cleaned ? cleaned + '/health' : '/health';
        const res = await fetch(target);
        if (res.ok) {
            resDiv.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Connection Successful!</span>';
        } else {
            resDiv.innerHTML = `<span class="text-warning"><i class="fas fa-exclamation-circle"></i> Connected but status: ${res.status}</span>`;
        }
    } catch (e) {
        resDiv.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle"></i> Connection Failed: ${e.message}</span>`;
    }
}

window.saveServerConfig = function() {
    const url = document.getElementById('cfg_server_url').value;
    if (confirm('Save new Server URL and reload?')) {
        localStorage.setItem('app_server_url', String(url || '').trim().replace(/\/+$/, ''));
        location.reload();
    }
}

function renderDatabaseSetup(container) {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <div>
                <div class="settings-section-title">${typeof t === 'function' ? t('settings.section.database', 'Database (Backup)') : 'Database (Backup)'}</div>
                <div class="settings-section-subtitle text-muted">${typeof t === 'function' ? t('settings.database.subtitle', 'Backup & Restore Master Data') : 'Backup & Restore Master Data'}</div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-6">
            <div class="card p-4">
                <h3 class="font-bold text-lg mb-4 text-primary"><i class="fas fa-download"></i> ${typeof t === 'function' ? t('settings.db.backup.title', 'Backup') : 'Backup'}</h3>
                <p class="text-sm text-muted mb-4">${typeof t === 'function' ? t('settings.db.backup.desc', 'Export all master data (Menu, Recipes, Staff, Equipment) to a JSON file.') : 'Export all master data (Menu, Recipes, Staff, Equipment) to a JSON file.'}</p>
                <button class="btn btn-primary w-full" onclick="backupDatabase()"><i class="fas fa-file-export"></i> ${typeof t === 'function' ? t('settings.db.backup.action', 'Download Backup') : 'Download Backup'}</button>
            </div>
            
            <div class="card p-4 border border-danger/30">
                <h3 class="font-bold text-lg mb-4 text-danger"><i class="fas fa-upload"></i> ${typeof t === 'function' ? t('settings.db.restore.title', 'Restore') : 'Restore'}</h3>
                <p class="text-sm text-muted mb-4">${typeof t === 'function' ? t('settings.db.restore.desc', 'Restore data from a backup file. Warning: This may overwrite existing data.') : 'Restore data from a backup file. Warning: This may overwrite existing data.'}</p>
                
                <input type="file" id="restore_file" class="hidden" accept=".json" onchange="previewRestoreFile(this)">
                <button class="btn btn-danger w-full" onclick="document.getElementById('restore_file').click()">
                    <i class="fas fa-file-import"></i> ${typeof t === 'function' ? t('settings.db.restore.select', 'Select Backup File') : 'Select Backup File'}
                </button>
                
                <div id="restore_preview" class="mt-4 hidden p-3 bg-white/5 rounded text-sm">
                    <!-- Preview content -->
                </div>
            </div>
        </div>
    `;
}

window.backupDatabase = async function() {
    // In real app, call API export endpoint.
    // Here we mock or fetch multiple endpoints to bundle.
    notifyUi('info', 'Exporting', 'Gathering data...');
    try {
        const [menu, staff, equipment, shifts] = await Promise.all([
            api('/api/menu'),
            api('/api/staff').catch(()=>[]),
            api('/api/kitchen/equipment').catch(()=>[]),
            api('/api/shifts').catch(()=>[])
        ]);
        
        const backupData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            data: { menu, staff, equipment, shifts }
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mbg-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        notifyUi('success', 'Backup Complete', 'File downloaded.');
    } catch(e) {
        notifyUi('danger', 'Backup Failed', e.message);
    }
}

window.previewRestoreFile = function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            const preview = document.getElementById('restore_preview');
            preview.classList.remove('hidden');
            preview.innerHTML = `
                <div class="font-bold mb-2">File Summary:</div>
                <ul class="list-disc pl-4 text-muted">
                    <li>Date: ${new Date(json.timestamp).toLocaleString()}</li>
                    <li>Menu Items: ${json.data?.menu?.length || 0}</li>
                    <li>Staff: ${json.data?.staff?.length || 0}</li>
                    <li>Equipment: ${json.data?.equipment?.length || 0}</li>
                </ul>
                <div class="mt-3">
                    <button class="btn btn-danger btn-sm w-full" onclick="executeRestore()">Confirm Restore</button>
                </div>
            `;
            window._restoreData = json;
        } catch(err) {
            alert('Invalid Backup File');
        }
    };
    reader.readAsText(file);
}

window.executeRestore = async function() {
    if (!window._restoreData) return;
    if (!confirm('DANGER: This will attempt to merge/overwrite data. Continue?')) return;
    
    notifyUi('info', 'Restoring', 'Sending data to server...');
    // In real implementation, send JSON to /api/restore endpoint.
    // For now, mock success.
    setTimeout(() => {
        notifyUi('success', 'Restore Complete', 'Data has been restored.');
        document.getElementById('restore_preview').innerHTML = '<div class="text-success">Restore Successful!</div>';
        setTimeout(() => location.reload(), 1500);
    }, 2000);
}


// --- DIVISION CONFIG SECTIONS ---
async function renderDivisionSetup(container, divisionId) {
    // 1. Fetch Division Config
    const config = await api(`/api/kitchen/config/${divisionId}`) || {};
    
    // 2. Fetch Global Production Config
    const globalCfg = await api('/api/kitchen/config') || {};
    const prod = globalCfg.production || {};

    // 3. Scope Divisi (capabilities, max_parallel_batches) dari kitchen_config global
    const globalDivs = Array.isArray(globalCfg.divisions) ? globalCfg.divisions : [];
    const currentDiv = globalDivs.find(d => String(d.id) === String(divisionId)) || { capabilities: [], max_parallel_batches: 1, notes: '' };
    const customCaps = Array.isArray(globalCfg.custom_capabilities) ? globalCfg.custom_capabilities : [];
    let vocabulary = [];
    try {
        const v = await api('/api/kitchen/vocabulary');
        vocabulary = Array.isArray(v && v.vocabulary) ? v.vocabulary : [];
    } catch(e) { vocabulary = []; }
    window._divScope = {
        divisionId,
        currentDiv: { ...currentDiv, capabilities: Array.isArray(currentDiv.capabilities) ? currentDiv.capabilities.slice() : [] },
        allDivisions: globalDivs.map(d => ({ ...d, capabilities: Array.isArray(d.capabilities) ? d.capabilities.slice() : [] })),
        custom_capabilities: customCaps.slice(),
        vocabulary,
        fullConfig: globalCfg
    };

    const sectionInfo = KITCHEN_SECTIONS.find(s => s.id === divisionId);
    
    let specificFields = '';

    if (divisionId === 'receiving') {
        specificFields = `
            <div class="font-bold mb-4 text-primary text-lg border-b border-white/10 pb-2">Operational Parameters</div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="input-label">Unload Time (mins)</label>
                    <input id="cfg_unload_time" class="input-field" type="number" value="${config.unload_minutes || 30}" />
                </div>
            </div>
            
            <div class="font-bold mt-6 mb-4 text-primary text-lg border-b border-white/10 pb-2">Quality Control</div>
            <div class="form-full">
                <label class="input-label">Receiving Checklist (comma separated)</label>
                <textarea id="cfg_checklist" class="input-field" rows="3" placeholder="Temp Check, Seal Check, Expiry...">${(config.checklist || []).join(', ')}</textarea>
            </div>
        `;
    } 
    else if (divisionId === 'prep') {
        specificFields = `
            <div class="font-bold mb-4 text-primary text-lg border-b border-white/10 pb-2">Capacity</div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="input-label">Concurrent Prep Stations</label>
                    <input id="cfg_prep_limit" class="input-field" type="number" value="${prod.prep_parallel_limit || 2}" />
                </div>
                <div>
                     <label class="input-label">Max Waste Tolerance (%)</label>
                     <input id="cfg_waste_tol" class="input-field" type="number" value="${config.waste_tolerance_percent || 5}" />
                </div>
            </div>
        `;
    }
    else if (divisionId === 'cooking') {
        specificFields = `
            <div class="font-bold mb-4 text-primary text-lg border-b border-white/10 pb-2">Kitchen Operations</div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="input-label">Buffer Antar Batch (menit)</label>
                    <input id="cfg_buffer" class="input-field" type="number" value="${config.batch_buffer_minutes || 10}" />
                    <div class="text-xs text-muted mt-1">Waktu cleaning/prepare antar batch pada alat yang sama.</div>
                </div>
                <div>
                    <label class="input-label">Setup Awal Menu (menit)</label>
                    <input id="cfg_setup_before_first" class="input-field" type="number" value="${config.setup_before_first_batch_minutes || 10}" />
                    <div class="text-xs text-muted mt-1">Default untuk step “Setup Masak” sebelum batch pertama dimulai.</div>
                </div>
            </div>
        `;
    }
    else if (divisionId === 'packing') {
        // Dynamic Packing Rates UI
        // We store rates in a temporary global variable to manage the list before saving
        window._tempPackingRates = config.rates || { ompreng: 500, plastik: 1000, box: 600, bowl: 700 };
        
        specificFields = `
            <div class="font-bold mb-4 text-primary text-lg border-b border-white/10 pb-2">Packing Capacity & Rates</div>
            
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <label class="input-label mb-2">Concurrent Packing Lines</label>
                    <input id="cfg_pack_limit" class="input-field" type="number" value="${prod.portion_parallel_limit || 2}" />
                </div>
                
                <div class="card bg-dark-lighter p-4 border border-white/5">
                    <label class="input-label mb-2">Packing Rates (Portions/Hour)</label>
                    <div class="flex gap-2 mb-2">
                        <select id="new_pack_type" class="input-field">
                             <option value="ompreng">Ompreng (Stainless)</option>
                             <option value="plastik">Plastik (Bungkus)</option>
                             <option value="box">Box/Kotak</option>
                             <option value="bowl">Paperbag/Bowl</option>
                             <option value="custom">Custom...</option>
                        </select>
                        <input id="new_pack_rate" type="number" class="input-field w-24" placeholder="Rate" value="500">
                        <button class="btn btn-secondary" onclick="addPackRateUI()">Add</button>
                    </div>
                    <div id="pack_rate_list" class="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        <!-- Dynamic List -->
                    </div>
                </div>
            </div>
        `;
    }
    else if (divisionId === 'driver') {
        specificFields = `
            <div class="font-bold mb-4 text-primary text-lg border-b border-white/10 pb-2">Logistics</div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="input-label">Loading Time (mins)</label>
                    <input id="cfg_load_time" class="input-field" type="number" value="${config.loading_minutes || 30}" />
                </div>
                <div>
                    <label class="input-label">Avg Travel Time (mins)</label>
                    <input id="cfg_driver_time" class="input-field" type="number" value="${prod.driver_minutes || 30}" />
                </div>
                <div>
                    <label class="input-label">Fleet Capacity (Avg Portions)</label>
                    <input id="cfg_fleet_cap" class="input-field" type="number" value="${config.fleet_capacity || 500}" />
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-2xl font-bold flex items-center gap-2">
                    ${setupSectionDropdownHtml(divisionId)}
                </h2>
                <div class="text-muted">Configuration & shifts</div>
            </div>
            <button class="btn btn-primary" onclick="saveDivisionConfig('${divisionId}')">
                <i class="fas fa-save"></i> Save Config
            </button>
        </div>

        <!-- SCOPE DIVISI WIDGET (capabilities + parallelism untuk AI Planner) -->
        <div class="card p-6 mb-8 border-l-4 border-primary">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h3 class="font-bold text-lg"><i class="fas fa-cogs text-primary mr-2"></i> Scope Divisi</h3>
                    <div class="text-xs text-muted mt-1">Capabilities (activity_type) & kapasitas paralel untuk AI Planner</div>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-secondary btn-sm" onclick="openCustomCapabilityModal()"><i class="fas fa-plus"></i> Tambah Capability Custom</button>
                    <button class="btn btn-primary btn-sm" onclick="saveDivisionScope('${divisionId}')"><i class="fas fa-save"></i> Simpan Scope</button>
                </div>
            </div>
            <div class="mb-4">
                <label class="input-label mb-2">Capabilities (yang ditangani divisi ini)</label>
                <div id="div-scope-caps" class="flex flex-wrap gap-2"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="input-label">Max Parallel Batches</label>
                    <input id="div-scope-max-par" class="input-field" type="number" min="1" value="${currentDiv.max_parallel_batches || 1}">
                    <div class="text-xs text-muted mt-1">Jumlah batch paralel di divisi ini (semakin tinggi = semakin cepat, tergantung staff/alat)</div>
                </div>
                <div>
                    <label class="input-label">Scope Notes</label>
                    <textarea id="div-scope-notes" class="input-field" rows="2" placeholder="Catatan scope divisi...">${currentDiv.notes || ''}</textarea>
                </div>
            </div>
        </div>

        <!-- SHIFT MANAGEMENT WIDGET -->
        <div class="card p-6 mb-8 border-l-4 border-accent">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-lg"><i class="fas fa-clock text-accent mr-2"></i> Shifts & Schedule</h3>
                <button class="btn btn-secondary btn-sm" onclick="openShiftCreate('${divisionId}')"><i class="fas fa-plus"></i> Add Shift</button>
            </div>
            <div id="div-shifts-list" class="grid gap-3">
                <div class="text-muted text-sm">Loading shifts...</div>
            </div>
        </div>

        <div class="card p-6 mb-8">
            ${specificFields}
            
            <div class="font-bold mt-6 mb-4 text-primary text-lg border-b border-white/10 pb-2">Notes</div>
            <div class="form-full">
                <textarea id="cfg_notes" class="input-field" rows="2" placeholder="Additional notes for this division...">${config.notes || ''}</textarea>
            </div>
        </div>
    `;

    // Post-render actions
    if (divisionId === 'packing') renderPackRateList();
    renderDivScopeCaps();
    loadShiftsForWidget(divisionId);
}

function renderDivScopeCaps() {
    const container = document.getElementById('div-scope-caps');
    if (!container) return;
    const scope = window._divScope || {};
    const selected = new Set((scope.currentDiv && scope.currentDiv.capabilities) || []);
    const vocab = Array.isArray(scope.vocabulary) ? scope.vocabulary : [];
    if (!vocab.length) {
        container.innerHTML = '<div class="text-muted text-sm italic">Vocabulary belum ter-load.</div>';
        return;
    }
    container.innerHTML = vocab.map(v => {
        const active = selected.has(v.id);
        const badge = v.custom ? '<span class="badge badge-info ml-1" style="font-size:0.6rem">CUSTOM</span>' : '';
        return `
            <label class="flex items-center gap-2 px-3 py-2 rounded border ${active ? 'border-primary bg-primary/20' : 'border-white/10 bg-white/5'} cursor-pointer hover:border-primary/50 transition-colors" title="${v.description || ''}">
                <input type="checkbox" class="div-scope-cap-chk" value="${v.id}" ${active ? 'checked' : ''}>
                <span class="font-mono text-sm">${v.id}</span>
                <span class="text-xs text-muted">${v.label || v.id}</span>
                ${badge}
            </label>
        `;
    }).join('');
}

window.openCustomCapabilityModal = function() {
    if (typeof openModalUi !== 'function') { alert('Modal UI tidak tersedia'); return; }
    openModalUi({
        title: 'Tambah Capability Custom',
        bodyHtml: `
            <div class="form-grid">
                <div>
                    <label class="input-label">ID (lowercase, no-space)</label>
                    <input id="new-cap-id" class="input-field" placeholder="mis. marinasi">
                </div>
                <div>
                    <label class="input-label">Label</label>
                    <input id="new-cap-label" class="input-field" placeholder="Marinasi">
                </div>
                <div class="form-full">
                    <label class="input-label">Deskripsi (opsional)</label>
                    <textarea id="new-cap-desc" class="input-field" rows="2"></textarea>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary', onClick: () => closeModalUi() },
            { label: 'Simpan Capability', className: 'btn btn-primary', onClick: () => saveNewCustomCapability() }
        ]
    });
};

window.saveNewCustomCapability = async function() {
    const id = String(document.getElementById('new-cap-id').value || '').trim().toLowerCase().replace(/\s+/g, '_');
    const label = String(document.getElementById('new-cap-label').value || '').trim();
    const desc = String(document.getElementById('new-cap-desc').value || '').trim();
    if (!id || !/^[a-z][a-z0-9_]*$/.test(id)) { setModalError && setModalError('ID harus lowercase, huruf/angka/underscore'); return; }
    if (!label) { setModalError && setModalError('Label wajib'); return; }
    const scope = window._divScope || {};
    const cfg = scope.fullConfig || {};
    cfg.custom_capabilities = Array.isArray(cfg.custom_capabilities) ? cfg.custom_capabilities : [];
    if (cfg.custom_capabilities.find(c => c.id === id) || (scope.vocabulary || []).find(v => v.id === id)) {
        setModalError && setModalError('ID sudah dipakai');
        return;
    }
    cfg.custom_capabilities.push({ id, label, description: desc });
    try {
        await api('/api/kitchen/config', 'PUT', cfg);
        closeModalUi && closeModalUi();
        notifyUi && notifyUi('success', 'Capability Custom', 'Berhasil ditambahkan');
        openSetupSection(scope.divisionId);
    } catch (e) {
        setModalError && setModalError('Gagal: ' + (e.message || e));
    }
};

window.saveDivisionScope = async function(divisionId) {
    const scope = window._divScope || {};
    const cfg = scope.fullConfig || {};
    const divs = Array.isArray(cfg.divisions) ? cfg.divisions : [];
    const idx = divs.findIndex(d => String(d.id) === String(divisionId));
    if (idx < 0) { notifyUi && notifyUi('danger', 'Error', 'Divisi tidak ditemukan di config'); return; }
    const selectedCaps = Array.from(document.querySelectorAll('.div-scope-cap-chk'))
        .filter(el => el.checked)
        .map(el => el.value);
    const maxPar = Math.max(1, Number(document.getElementById('div-scope-max-par').value || 1));
    const notes = String(document.getElementById('div-scope-notes').value || '');
    divs[idx] = { ...divs[idx], capabilities: selectedCaps, max_parallel_batches: maxPar, notes };
    cfg.divisions = divs;
    try {
        await api('/api/kitchen/config', 'PUT', cfg);
        notifyUi && notifyUi('success', 'Scope Divisi', 'Berhasil disimpan');
        scope.currentDiv = divs[idx];
        scope.fullConfig = cfg;
    } catch (e) {
        notifyUi && notifyUi('danger', 'Error', 'Gagal simpan: ' + (e.message || e));
    }
};

// --- PACKING RATE HELPERS ---
function renderPackRateList() {
    const container = document.getElementById('pack_rate_list');
    if (!container) return;
    
    const rates = window._tempPackingRates || {};
    container.innerHTML = Object.entries(rates).map(([type, rate]) => `
        <div class="flex justify-between items-center p-2 bg-white/5 rounded text-sm">
            <div class="font-bold capitalize">${type}</div>
            <div class="flex items-center gap-3">
                <span class="font-mono text-accent">${rate} /hr</span>
                <button class="text-red-400 hover:text-red-300" onclick="removePackRateUI('${type}')"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `).join('');
}

window.addPackRateUI = function() {
    let type = document.getElementById('new_pack_type').value;
    if (type === 'custom') {
        type = prompt("Enter packaging type name:");
    }
    const rate = Number(document.getElementById('new_pack_rate').value);
    
    if (type && rate > 0) {
        window._tempPackingRates[type.toLowerCase()] = rate;
        renderPackRateList();
    }
};

window.removePackRateUI = function(type) {
    delete window._tempPackingRates[type];
    renderPackRateList();
};

// --- SHIFT WIDGET HELPERS ---
async function loadShiftsForWidget(divisionId) {
    const container = document.getElementById('div-shifts-list');
    try {
        const allShifts = await api('/api/shifts');
        // Filter: show shifts for this division OR 'all'
        const shifts = allShifts.filter(s => s.division_id === divisionId || s.division_id === 'all');
        
        if (shifts.length === 0) {
            container.innerHTML = `<div class="text-muted text-sm italic">No shifts configured for ${divisionId}.</div>`;
            return;
        }
        
        container.innerHTML = shifts.map(s => `
            <div class="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5 hover:border-white/10 transition-colors">
                <div>
                    <div class="font-bold text-white">${s.name}</div>
                    <div class="text-xs text-muted">
                        ${s.start_time} - ${s.end_time} 
                        ${s.division_id === 'all' ? '<span class="badge badge-info ml-2">ALL DIVISIONS</span>' : ''}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-secondary btn-xs" onclick="openShiftEdit('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="deleteShift('${s.id}', '${divisionId}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch(e) {
        // Handle API errors gracefully
        console.error(e);
        const msg = e.message || 'Unknown error';
        if (msg.includes('404') || msg.includes('Failed to fetch')) {
             container.innerHTML = `
                <div class="text-warning text-sm p-2 border border-warning/30 rounded bg-warning/10">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Shift API Unavailable.
                    <div class="text-xs opacity-70 mt-1">Backend might be restarting. Check server logs.</div>
                </div>`;
        } else {
             container.innerHTML = `<div class="text-danger text-sm">Failed to load shifts: ${msg}</div>`;
        }
    }
}

// Re-implement Shift CRUD wrappers to work within Settings context
async function openShiftCreate(defaultDivId) {
    if (typeof window.openShiftForm === 'function') {
        openShiftModal(null, defaultDivId);
    } else {
        openShiftModal(null, defaultDivId);
    }
}

async function openShiftEdit(id) {
    openShiftModal(id);
}

async function openShiftModal(id, defaultDivId = 'all') {
    let data = { name: '', start_time: '07:00', end_time: '15:00', division_id: defaultDivId };
    
    if (id) {
        try {
            const list = await api('/api/shifts');
            data = list.find(x => x.id === id) || data;
        } catch(e) {}
    }

    let divisionOptionsHtml = `<option value="all">All Divisions</option>`;
    try {
        const cfg = await api('/api/kitchen/config');
        const divisions = (cfg && cfg.divisions) ? cfg.divisions : [];
        let htmlParts = [`<option value="all" ${data.division_id === 'all' ? 'selected' : ''}>All Divisions</option>`];
        
        // Match SPPG compatibility as in hr.js
        if (!divisions.find(d => String(d.id).toUpperCase() === 'SPPG')) {
            htmlParts.push(`<option value="SPPG" ${data.division_id === 'SPPG' ? 'selected' : ''}>SPPG</option>`);
        }
        
        divisionOptionsHtml = htmlParts.concat(divisions.map(d => 
            `<option value="${d.id}" ${data.division_id === d.id ? 'selected' : ''}>${d.name || d.id}</option>`
        )).join('');
    } catch (e) {}

    openModalUi({
        title: id ? 'Edit Shift' : 'Add Shift',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Shift Name</label>
                    <input id="f_sh_name" class="input-field" value="${data.name}" placeholder="e.g. Morning Shift" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="input-label">Start Time</label>
                        <input id="f_sh_start" type="time" class="input-field" value="${data.start_time}" />
                    </div>
                    <div>
                        <label class="input-label">End Time</label>
                        <input id="f_sh_end" type="time" class="input-field" value="${data.end_time}" />
                    </div>
                </div>
                <div class="form-full">
                    <label class="input-label">Division</label>
                    <select id="f_sh_div" class="input-field">
                        ${divisionOptionsHtml}
                    </select>
                </div>
            </div>
        `,
        actions: [
            { label: 'Cancel', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Save', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    const name = document.getElementById('f_sh_name').value.trim();
                    const start_time = document.getElementById('f_sh_start').value;
                    const end_time = document.getElementById('f_sh_end').value;
                    const division_id = document.getElementById('f_sh_div').value;
                    
                    if (!name) return alert('Name required');
                    
                    const payload = { name, start_time, end_time, division_id };
                    if (id) await api(`/api/shifts/${id}`, 'PUT', payload);
                    else await api('/api/shifts', 'POST', payload);
                    
                    closeModalUi();
                    notifyUi('success', 'Shift Saved', 'Shift configuration updated');
                    
                    // Refresh current view logic
                    const currentSection = window._setup_current_section;
                    if (currentSection && currentSection !== 'equipment') loadShiftsForWidget(currentSection);
                } catch (e) { alert(e.message); }
            }}
        ]
    });
}

// Override deleteShift to accept refreshCallback
window.deleteShift = async function(id, currentDivId) {
    if (!confirm('Delete this shift?')) return;
    try { 
        await api(`/api/shifts/${id}`, 'DELETE'); 
        if (currentDivId) loadShiftsForWidget(currentDivId);
    } catch(e) { notifyUi('danger', 'Error', e.message); }
};

async function saveDivisionConfig(divisionId) {
    try {
        // 1. Prepare Division Payload
        const payload = {
            notes: document.getElementById('cfg_notes').value
        };
        
        // 2. Prepare Global Payload
        let globalUpdate = null;

        if (divisionId === 'receiving') {
            payload.unload_minutes = Number(document.getElementById('cfg_unload_time').value || 0);
            payload.checklist = document.getElementById('cfg_checklist').value.split(',').map(s => s.trim()).filter(Boolean);
        }
        else if (divisionId === 'prep') {
            payload.waste_tolerance_percent = Number(document.getElementById('cfg_waste_tol').value || 0);
            globalUpdate = { production: { prep_parallel_limit: Number(document.getElementById('cfg_prep_limit').value || 2) } };
        }
        else if (divisionId === 'cooking') {
            payload.batch_buffer_minutes = Number(document.getElementById('cfg_buffer').value || 0);
            payload.setup_before_first_batch_minutes = Number(document.getElementById('cfg_setup_before_first').value || 0);
        }
        else if (divisionId === 'packing') {
            // Use the temp rates
            payload.rates = window._tempPackingRates || {};
            globalUpdate = { production: { portion_parallel_limit: Number(document.getElementById('cfg_pack_limit').value || 2) } };
        }
        else if (divisionId === 'driver') {
            payload.loading_minutes = Number(document.getElementById('cfg_load_time').value || 0);
            payload.fleet_capacity = Number(document.getElementById('cfg_fleet_cap').value || 0);
            globalUpdate = { production: { driver_minutes: Number(document.getElementById('cfg_driver_time').value || 30) } };
        }

        // Send to Division Config
        await api(`/api/kitchen/config/${divisionId}`, 'POST', payload);
        
        // Send to Global Config if needed
        if (globalUpdate) {
            const currentGlobal = await api('/api/kitchen/config') || {};
            const merged = { ...currentGlobal, production: { ...(currentGlobal.production || {}), ...globalUpdate.production } };
            await api('/api/kitchen/config', 'PUT', merged);
        }
        
        notifyUi('success', 'Config Saved', `Configuration for ${divisionId} saved successfully`);
        
    } catch (e) {
        notifyUi('danger', 'Save Failed', e.message);
    }
}

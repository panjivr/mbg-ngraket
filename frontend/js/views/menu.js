/** Baris ter-enrich untuk Library Menu (filter client-side). */
let _libraryMenuRowsForFilter = [];

/** Daftar Food & Food terpilih di workspace — harus di atas fungsi yang membacanya (library table, loadFoodsV2). */
let currentFoodList = [];
let currentFoodId = null;

function summariseFoodPackagingStack(f) {
    const stack = Array.isArray(f.packaging_stack) ? f.packaging_stack : [];
    if (!stack.length) return '<span class="text-muted">—</span>';
    const parts = stack.slice(0, 4).map(l => escapeHtmlMenu(String(l.material || l.material_type || '—')));
    const extra = stack.length > 4 ? ` <span class="text-muted text-xs">+${stack.length - 4}</span>` : '';
    return parts.join(' <span class="text-muted">→</span> ') + extra;
}

function formatFoodServedDateDisplay(f) {
    if (!f || !f.date_served) return '<span class="text-muted">—</span>';
    try {
        const d = new Date(f.date_served);
        if (isNaN(d.getTime())) return escapeHtmlMenu(String(f.date_served).slice(0, 10));
        return escapeHtmlMenu(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }));
    } catch (e) {
        return escapeHtmlMenu(String(f.date_served || '').slice(0, 10));
    }
}

function renderLibraryFoodTable(filterText) {
    const tbody = document.getElementById('library-food-rows');
    if (!tbody) return;
    const q = String(filterText || '').trim().toLowerCase();
    const all = Array.isArray(currentFoodList) ? currentFoodList : [];
    const list = all.filter(f => f && (!q || String(f.name || '').toLowerCase().includes(q)));
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">${all.length ? 'Tidak ada Food yang cocok dengan pencarian.' : 'Belum ada Food. Gunakan <b>Tambah</b> atau <b>Import</b>.'}</td></tr>`;
        return;
    }
    const fid = currentFoodId ? String(currentFoodId) : '';
    tbody.innerHTML = list.map(f => {
        const selected = fid && String(f.id) === fid;
        const rowStyle = selected ? ' style="background:rgba(59,130,246,0.09)"' : '';
        const idAttr = escapeAttrMenu(String(f.id));
        return `<tr${rowStyle}>
            <td class="font-medium">${escapeHtmlMenu(f.name || '—')}</td>
            <td class="text-xs">${summariseFoodPackagingStack(f)}</td>
            <td class="text-xs">${formatFoodServedDateDisplay(f)}</td>
            <td><div class="flex flex-wrap gap-1">
                <button type="button" class="btn btn-primary btn-sm" onclick="selectFoodForWorkspace('${idAttr}')" title="Buka Food ini di workspace (bagian atas halaman)"><i class="fas fa-crosshairs"></i> Kelola</button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="openEditFood('${idAttr}')" title="Edit final packaging"><i class="fas fa-pen"></i></button>
                <button type="button" class="btn btn-danger btn-sm" onclick="deleteFoodById('${idAttr}')" title="Hapus Food"><i class="fas fa-trash"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

function filterLibraryFoodTable(val) {
    renderLibraryFoodTable(val);
}

function _syncLibraryFoodTableSelection() {
    const searchFood = document.getElementById('library-food-search');
    if (typeof renderLibraryFoodTable === 'function') {
        renderLibraryFoodTable(searchFood ? searchFood.value : '');
    }
}

function renderLibraryMenuTable(filterText) {
    const tbody = document.getElementById('library-menu-rows');
    if (!tbody) return;
    const q = String(filterText || '').trim().toLowerCase();
    const list = (_libraryMenuRowsForFilter || []).filter(row => !q || row.searchHaystack.includes(q));
    if (!list.length) {
        const had = (_libraryMenuRowsForFilter || []).length;
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">${had ? 'Tidak ada menu yang cocok dengan pencarian.' : 'Belum ada menu di library.'}</td></tr>`;
        return;
    }
    const safeName = (s) => escapeHtmlMenu(String(s ?? ''));
    tbody.innerHTML = list.map(x => {
        const rowBg = x.orphanRecipe ? ' style="background:rgba(245,158,11,0.06)"' : '';
        const nameCell = x.orphanRecipe
            ? `<span>${safeName(x.raw.name || '-')}</span>
               <span class="ml-1 text-xs font-bold" style="color:#f59e0b" title="Resep tidak ada di library — Edit untuk pilih ulang"><i class="fas fa-exclamation-triangle"></i></span>`
            : safeName(x.raw.name || '-');
        const idAttr = escapeAttrMenu(String(x.raw.id));
        const fid = x.raw.food_id ? escapeAttrMenu(String(x.raw.food_id)) : '';
        const foodBtn = fid
            ? `<button type="button" class="btn btn-secondary btn-sm" onclick="selectFoodForWorkspace('${fid}')" title="Buka Food terkait di workspace (atas)"><i class="fas fa-link"></i></button>`
            : '';
        return `<tr${rowBg}>
            <td class="font-medium text-sm">${nameCell}</td>
            <td class="text-xs">${x.recipeHtml}</td>
            <td class="text-xs">${x.workflowHtml}</td>
            <td><div class="flex flex-wrap gap-1">
                <button type="button" class="btn btn-secondary btn-sm" onclick="openMenuEdit('${idAttr}')"><i class="fas fa-pen"></i></button>
                ${foodBtn}
                <button type="button" class="btn btn-danger btn-sm" onclick="deleteMenu('${idAttr}')"><i class="fas fa-trash"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

function filterLibraryMenuTable(val) {
    renderLibraryMenuTable(val);
}

async function loadMenu() {
    const tbody = document.getElementById('library-menu-rows');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted p-3">Memuat…</td></tr>`;
    try {
        const [rows, foods, recipes, workflows] = await Promise.all([
            api('/api/menu').catch(() => []),
            api('/api/foods').catch(() => []),
            api('/api/recipes').catch(() => []),
            api('/api/workflows').catch(() => [])
        ]);
        const foodById = new Map((foods || []).map(f => [String(f.id), f]));
        const recipeById = new Map((recipes || []).map(r => [String(r.id), r]));
        const workflowById = new Map((workflows || []).map(w => [String(w.id), w]));

        _libraryMenuRowsForFilter = (rows || []).map(r => {
            const f = r.food_id ? foodById.get(String(r.food_id)) : null;
            const recipe = r.recipe_id ? recipeById.get(String(r.recipe_id)) : null;
            const orphanRecipe = !!(r.recipe_id && !recipe);
            const workflow = r.workflow_recipe_id ? workflowById.get(String(r.workflow_recipe_id))
                : (r.workflow_id ? workflowById.get(String(r.workflow_id)) : null);
            const foodName = f ? (f.name || '—') : (r.food_id ? '(Food tidak ditemukan)' : '—');
            const recipeHtml = r.recipe_id
                ? (recipe ? escapeHtmlMenu(recipe.name || '') : `<span class="text-xs font-semibold" style="color:#f59e0b"><i class="fas fa-exclamation-triangle"></i> resep hilang</span>`)
                : '<span class="text-muted text-xs">—</span>';
            const workflowHtml = workflow
                ? escapeHtmlMenu(workflow.name || '')
                : '<span class="text-muted text-xs">—</span>';
            const searchHaystack = [
                foodName,
                r.name,
                recipe && recipe.name,
                workflow && workflow.name,
                String(r.cooking_time || '')
            ].filter(Boolean).join(' ').toLowerCase();
            return {
                raw: r,
                foodName,
                orphanRecipe,
                recipeHtml,
                workflowHtml,
                searchHaystack
            };
        });

        const searchEl = document.getElementById('library-menu-search');
        renderLibraryMenuTable(searchEl ? searchEl.value : '');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger p-3">Gagal memuat menu: ${escapeHtmlMenu(e.message || String(e))}</td></tr>`;
    }
}

async function deleteMenu(id) {
    try {
        const ok = await confirmUi({
            title: 'Hapus Menu',
            message: 'Yakin hapus menu ini?',
            confirmLabel: 'Hapus',
            cancelLabel: 'Batal',
            danger: true
        });
        if (!ok) return;
        await api(`/api/menu/${id}`, 'DELETE');
        notifyUi('success', 'Menu', 'Berhasil dihapus');
        await loadMenu();
        await onSelectFoodV2();
    } catch (e) {
        notifyUi('danger', 'Menu', 'Gagal hapus: ' + (e.message || 'Error'));
    }
}

async function openImportMenu() {
    openModalUi({
        title: 'Import Menu Harian/Mingguan',
        bodyHtml: `
            <div class="space-y-4">
                <div class="bg-blue-50 p-3 rounded text-sm text-blue-800">
                    <p class="font-bold mb-1">Panduan Import Menu:</p>
                    <ul class="list-disc pl-4 space-y-1">
                        <li>Gunakan template Excel yang disediakan.</li>
                        <li>Pastikan nama Food sudah ada di database.</li>
                        <li>Format tanggal: YYYY-MM-DD.</li>
                        <li>Waktu makan: Pagi/Siang/Sore.</li>
                    </ul>
                    <div class="mt-2">
                        <a href="/api/templates/download/menu" target="_blank" class="btn btn-sm btn-secondary"><i class="fas fa-download"></i> Download Template</a>
                    </div>
                </div>
                
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center" id="drop-zone-menu">
                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                    <p class="text-gray-600 mb-2">Drag & Drop file Excel di sini</p>
                    <p class="text-sm text-gray-400 mb-4">atau</p>
                    <input type="file" id="file-menu-import" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleFileSelectMenu(this)">
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('file-menu-import').click()">Pilih File</button>
                </div>

                <div id="preview-menu-container" class="hidden">
                    <h4 class="font-bold mb-2">Preview Data</h4>
                    <div class="table-responsive max-h-60 overflow-y-auto">
                        <table class="nutri-table w-full text-xs">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Waktu</th>
                                    <th>Menu</th>
                                    <th>Porsi</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="preview-menu-rows"></tbody>
                        </table>
                    </div>
                    <div class="mt-2 text-right">
                        <span id="preview-menu-summary" class="text-sm text-muted mr-2"></span>
                        <button class="btn btn-primary btn-sm" id="btn-process-menu" onclick="processImportMenu()" disabled>Proses Import</button>
                    </div>
                </div>
            </div>
        `,
        actions: [
            { label: 'Tutup', className: 'btn btn-secondary', onClick: () => closeModalUi() }
        ]
    });

    // Drag and drop handlers
    const dropZone = document.getElementById('drop-zone-menu');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('bg-gray-100');
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('bg-gray-100');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('bg-gray-100');
            const files = e.dataTransfer.files;
            if (files.length) handleFileSelectMenu({ files });
        });
    }
}

async function handleFileSelectMenu(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        notifyUi('info', 'Import', 'Membaca file...');
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/import/menu/preview', {
            method: 'POST',
            body: formData,
            headers: SESSION.token ? { 'Authorization': 'Bearer ' + SESSION.token, 'x-tenant-id': SESSION.tenant_id } : { 'x-tenant-id': SESSION.tenant_id }
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        renderMenuPreview(data);
    } catch (e) {
        notifyUi('danger', 'Import', 'Gagal membaca file: ' + e.message);
    }
}

function renderMenuPreview(data) {
    const container = document.getElementById('preview-menu-container');
    const tbody = document.getElementById('preview-menu-rows');
    const summary = document.getElementById('preview-menu-summary');
    const btn = document.getElementById('btn-process-menu');

    if (!container || !tbody) return;

    container.classList.remove('hidden');
    window._menuImportData = data.items;

    tbody.innerHTML = data.items.map(item => `
        <tr class="${item.valid ? '' : 'bg-red-50'}">
            <td>${item.date}</td>
            <td>${item.meal_time}</td>
            <td>${item.menu_name}</td>
            <td>${item.portions}</td>
            <td>${item.valid ? '<span class="text-success">OK</span>' : `<span class="text-danger" title="${item.error}">Error</span>`}</td>
        </tr>
    `).join('');

    const validCount = data.items.filter(i => i.valid).length;
    summary.textContent = `${validCount} valid, ${data.items.length - validCount} invalid`;
    btn.disabled = validCount === 0;
}

async function processImportMenu() {
    if (!window._menuImportData) return;
    
    try {
        const validItems = window._menuImportData.filter(i => i.valid);
        if (!validItems.length) return;

        notifyUi('info', 'Import', 'Memproses import...');
        
        const res = await api('/api/import/menu', 'POST', { items: validItems });
        
        notifyUi('success', 'Import', `Berhasil import ${res.imported} menu`);
        closeModalUi();
        loadMenu();
    } catch (e) {
        notifyUi('danger', 'Import', 'Gagal import: ' + e.message);
    }
}

async function openImportFood() {
    openModalUi({
        title: 'Import Food (Paket Makanan)',
        bodyHtml: `
            <div class="space-y-4">
                <div class="bg-blue-50 p-3 rounded text-sm text-blue-800">
                    <p class="font-bold mb-1">Panduan Import Food:</p>
                    <ul class="list-disc pl-4 space-y-1">
                        <li>Gunakan template Excel yang disediakan.</li>
                        <li>Kolom wajib: Nama, Kategori, Kalori, Satuan.</li>
                        <li>Pastikan format angka valid.</li>
                    </ul>
                    <div class="mt-2">
                        <a href="/api/templates/download/food" target="_blank" class="btn btn-sm btn-secondary"><i class="fas fa-download"></i> Download Template</a>
                    </div>
                </div>
                
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center" id="drop-zone-food">
                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                    <p class="text-gray-600 mb-2">Drag & Drop file Excel di sini</p>
                    <p class="text-sm text-gray-400 mb-4">atau</p>
                    <input type="file" id="file-food-import" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleFileSelectFood(this)">
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('file-food-import').click()">Pilih File</button>
                </div>

                <div id="preview-food-container" class="hidden">
                    <h4 class="font-bold mb-2">Preview Data</h4>
                    <div class="table-responsive max-h-60 overflow-y-auto">
                        <table class="nutri-table w-full text-xs">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Kategori</th>
                                    <th>Kalori</th>
                                    <th>Satuan</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="preview-food-rows"></tbody>
                        </table>
                    </div>
                    <div class="mt-2 text-right">
                        <span id="preview-food-summary" class="text-sm text-muted mr-2"></span>
                        <button class="btn btn-primary btn-sm" id="btn-process-food" onclick="processImportFood()" disabled>Proses Import</button>
                    </div>
                </div>
            </div>
        `,
        actions: [
            { label: 'Tutup', className: 'btn btn-secondary', onClick: () => closeModalUi() }
        ]
    });

    const dropZone = document.getElementById('drop-zone-food');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('bg-gray-100');
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('bg-gray-100');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('bg-gray-100');
            const files = e.dataTransfer.files;
            if (files.length) handleFileSelectFood({ files });
        });
    }
}

async function handleFileSelectFood(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        notifyUi('info', 'Import', 'Membaca file...');
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/import/food/preview', {
            method: 'POST',
            body: formData,
            headers: SESSION.token ? { 'Authorization': 'Bearer ' + SESSION.token, 'x-tenant-id': SESSION.tenant_id } : { 'x-tenant-id': SESSION.tenant_id }
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        renderFoodPreview(data);
    } catch (e) {
        notifyUi('danger', 'Import', 'Gagal membaca file: ' + e.message);
    }
}

function renderFoodPreview(data) {
    const container = document.getElementById('preview-food-container');
    const tbody = document.getElementById('preview-food-rows');
    const summary = document.getElementById('preview-food-summary');
    const btn = document.getElementById('btn-process-food');

    if (!container || !tbody) return;

    container.classList.remove('hidden');
    window._foodImportData = data.items;

    tbody.innerHTML = data.items.map(item => `
        <tr class="${item.valid ? '' : 'bg-red-50'}">
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.calories}</td>
            <td>${item.unit}</td>
            <td>${item.valid ? '<span class="text-success">OK</span>' : `<span class="text-danger" title="${item.error}">Error</span>`}</td>
        </tr>
    `).join('');

    const validCount = data.items.filter(i => i.valid).length;
    summary.textContent = `${validCount} valid, ${data.items.length - validCount} invalid`;
    btn.disabled = validCount === 0;
}

async function processImportFood() {
    if (!window._foodImportData) return;
    
    try {
        const validItems = window._foodImportData.filter(i => i.valid);
        if (!validItems.length) return;

        notifyUi('info', 'Import', 'Memproses import...');
        
        const res = await api('/api/import/food', 'POST', { items: validItems });
        
        notifyUi('success', 'Import', `Berhasil import ${res.imported} food`);
        closeModalUi();
        loadFoodsV2();
    } catch (e) {
        notifyUi('danger', 'Import', 'Gagal import: ' + e.message);
    }
}

async function openMenuCreate() {
    await openMenuForm(null);
}

async function openMenuEdit(id) {
    await openMenuForm(id);
}

async function openMenuForm(id) {
    try {
        const menus = await api('/api/menu');
        const ingredients = await api('/api/ingredients');
        let recipeList = [];
        try { recipeList = await api('/api/recipes'); } catch (e) { recipeList = []; }
        const m = id ? (menus || []).find(x => x.id === id) : { name: '', cooking_time: 60, batch_capacity: 50, portion_size: 1, ingredients: [], extra_packing_json: null, packaging_type: null };
        if (id && !m) return notifyUi('warning', 'Menu', 'Menu tidak ditemukan');

        const baseRecipeIdForWf = id ? String(m.recipe_id || '').trim() : '';
        const wfStored = id ? String(m.workflow_recipe_id || '').trim() : '';
        const wfSelectInitial = wfStored && wfStored !== baseRecipeIdForWf ? wfStored : '';
        const recipeOptsHtml =
            `<option value=""${wfSelectInitial ? '' : ' selected'}>Default — langkah di resep menu ini</option>` +
            (recipeList || [])
                .filter(r => r && r.id)
                .map(r => {
                    const rid = String(r.id);
                    const nm = String(r.name || rid).replace(/</g, '').replace(/"/g, '&quot;');
                    const sel = wfSelectInitial === rid ? ' selected' : '';
                    return `<option value="${rid}"${sel}>${nm}</option>`;
                })
                .join('');

        const ingById = new Map((ingredients || []).map(i => [String(i.id), i]));
        const ingOpt = (ingredients || []).map(i => `<option value="${i.id}">${i.name} (${i.unit || '-'})</option>`).join('');

        const stepsSourceRecipeId = (() => {
            const w = String(m.workflow_recipe_id || '').trim();
            const b = String(m.recipe_id || '').trim();
            if (w && w !== b) return w;
            return b;
        })();

        let currentSteps = [];
        if (stepsSourceRecipeId) {
            try {
                const s = await api(`/api/recipes/${stepsSourceRecipeId}/steps`);
                if (Array.isArray(s)) currentSteps = s;
            } catch (e) { console.error(e); }
        }

        let currentTools = [];
        if (m.recipe_id) {
            try { 
                const t = await api(`/api/recipes/${m.recipe_id}/tools`); 
                if (Array.isArray(t)) currentTools = t;
            } catch(e) { console.error(e); }
        }

        const ingredientsDraft = Array.isArray(m.ingredients) && m.ingredients.length
            ? m.ingredients.map(x => ({
                ingredient_id: String(x.ingredient_id || ''),
                quantity_per_portion: Number(x.quantity_per_portion ?? x.quantity ?? 0),
                cutting_enabled: !!x.cutting_enabled,
                cutting_duration_minutes: Number(x.cutting_duration_minutes || 0),
                cutting_output_per_duration: Number(x.cutting_output_per_duration || 0),
                washing_enabled: !!x.washing_enabled,
                washing_duration_minutes: Number(x.washing_duration_minutes || 0),
                washing_output_per_duration: Number(x.washing_output_per_duration || 0),
                peeling_enabled: !!x.peeling_enabled,
                peeling_duration_minutes: Number(x.peeling_duration_minutes || 0),
                peeling_output_per_duration: Number(x.peeling_output_per_duration || 0)
            }))
            : [];

        const extraPackingDraft = (() => {
            const xp = m.extra_packing_json;
            if (!xp || xp.enabled !== true) return { enabled: false, material_type: '', material_custom: '', quantity: 0, unit: 'pcs', duration_minutes: 0 };
            const mt = String(xp.material_type || '');
            const material = String(xp.material || m.packaging_type || '');
            const preset = ['plastik', 'cup', 'lainnya'];
            const inferredType = mt || (preset.includes(material) ? material : (material ? 'lainnya' : ''));
            return {
                enabled: true,
                material_type: inferredType,
                material_custom: inferredType === 'lainnya' ? material : '',
                quantity: Number(xp.quantity || 0),
                unit: String(xp.unit || 'pcs'),
                duration_minutes: Number(xp.duration_minutes || 0)
            };
        })();

        openSidebarUi({
            title: id ? 'Edit Menu & Workflow' : 'Tambah Menu Baru',
            bodyHtml: `
                <div class="flex border-b border-gray-200 mb-4 overflow-x-auto">
                    <button class="px-4 py-2 border-b-2 border-primary font-bold whitespace-nowrap" onclick="showTab('tab-general', this)"><i class="fas fa-info-circle mr-1"></i> Informasi Dasar</button>
                    <button class="px-4 py-2 border-b-2 border-transparent text-muted hover:text-primary whitespace-nowrap" onclick="showTab('tab-ingredients', this)"><i class="fas fa-carrot mr-1"></i> Bahan Baku</button>
                    <button class="px-4 py-2 border-b-2 border-transparent text-muted hover:text-primary whitespace-nowrap" onclick="showTab('tab-tools', this)"><i class="fas fa-utensils mr-1"></i> Alat Masak</button>
                    <button class="px-4 py-2 border-b-2 border-transparent text-muted hover:text-primary whitespace-nowrap" onclick="showTab('tab-packing', this)"><i class="fas fa-box-open mr-1"></i> Packing</button>
                    <button class="px-4 py-2 border-b-2 border-transparent text-muted hover:text-primary whitespace-nowrap" onclick="showTab('tab-workflow', this)"><i class="fas fa-tasks mr-1"></i> Workflow (Resep)</button>
                </div>

                <div id="tab-general" class="form-grid">
                    <div class="bg-blue-50 p-3 rounded mb-3 text-sm text-blue-800 flex items-start gap-2">
                        <i class="fas fa-lightbulb mt-1"></i>
                        <div><strong>Tips:</strong> Jumlah menu per porsi dipakai untuk perhitungan porsi.</div>
                    </div>

                    <div class="form-full">
                        <label class="input-label">Nama Menu <span class="text-red-500">*</span></label>
                        <input id="f_menu_name" class="input-field" value="${String(m.name || '').replace(/"/g, '&quot;')}" placeholder="Contoh: Ayam Kecap Mentega" />
                    </div>

                    <div class="form-full">
                        <label class="input-label">Jumlah Menu per Porsi</label>
                        <div class="flex items-center gap-2">
                            <input id="f_menu_portion_size" class="input-field" type="number" min="1" step="1" value="${Number(m.portion_size || 1)}" />
                            <span class="text-muted text-sm">menu / porsi</span>
                        </div>
                    </div>
                </div>

                <div id="tab-ingredients" class="hidden">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-sm text-muted">Ingredients (dynamic): tambah banyak bahan, dengan opsi cutting/washing/peeling.</div>
                        <button class="btn btn-primary btn-sm" id="btn-add-ingredient"><i class="fas fa-plus"></i> Tambah Bahan</button>
                    </div>
                    <div id="ingredients-container" class="flex flex-col gap-3"></div>
                </div>

                <div id="tab-tools" class="hidden">
                    <div class="text-sm text-muted mb-2">Alat masak yang digunakan.</div>
                    <div class="grid grid-cols-1 gap-3 mb-3">
                        <div class="form-full bg-gray-50 p-3 rounded border">
                            <label class="input-label mb-1">Tambah Alat ke Menu</label>
                            <div class="flex gap-2">
                                <select id="tool-select" class="input-field flex-grow">
                                    <option value="">-- Pilih Alat --</option>
                                </select>
                                <button class="btn btn-primary btn-sm" id="btn-add-tool-inline"><i class="fas fa-plus"></i> Tambah</button>
                            </div>
                            
                            <div class="mt-3 pt-3 border-t border-gray-200">
                                <label class="input-label mb-1">Atau Buat Alat Baru</label>
                                <div class="flex gap-2">
                                    <input id="tool-new-name" class="input-field flex-grow" placeholder="Nama Alat Baru" />
                                    <button class="btn btn-secondary btn-sm" id="btn-create-tool"><i class="fas fa-plus"></i> Buat</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="tools-container" class="flex flex-col gap-3"></div>
                </div>

                <div id="tab-packing" class="hidden">
                    <div class="bg-blue-50 p-3 rounded mb-3 text-sm text-blue-800 flex items-start gap-2">
                        <i class="fas fa-info-circle mt-1"></i>
                        <div>
                            <b>Pre-Packing Menu (Opsional)</b> — pembungkus <i>per-menu</i> SEBELUM
                            masuk wadah final. Misal: nasi dibungkus plastik kecil, buah dimasukkan
                            cup terpisah. <u>Kosongkan kalau menu ini langsung ditaruh di wadah
                            final</u> (paling umum).<br>
                            <i class="fas fa-arrow-right mr-1"></i>
                            <b>Final packing (ompreng / sterefoam / spunbound / plastik oval, dll.)
                            dikonfigurasi di menu "Foods"</b>, bukan di sini.
                        </div>
                    </div>
                    <div class="form-full mb-4">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="f_extra_pack_enabled" class="form-checkbox">
                            <span class="font-bold">Pre-Packing Menu ini?</span>
                        </label>
                        <div class="text-xs text-muted ml-6">Centang hanya jika menu ini butuh dibungkus sendiri dulu (mis. nasi plastik).</div>
                    </div>

                    <div id="extra-pack-fields" class="hidden pl-6 border-l-2 border-gray-200">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="form-full">
                                <label class="input-label">Bahan Pre-Packing</label>
                                <select id="f_xp_material_type" class="input-field">
                                    <option value="">-- Pilih --</option>
                                    <option value="plastik">Plastik Kecil</option>
                                    <option value="cup">Cup</option>
                                    <option value="lainnya">Lainnya</option>
                                </select>
                                <input id="f_xp_material_custom" class="input-field mt-2 hidden" placeholder="Tulis bahan lainnya" />
                            </div>
                            <div>
                                <label class="input-label">Jumlah per Batch</label>
                                <input id="f_xp_qty" type="number" class="input-field" min="0" step="0.1" />
                            </div>
                            <div>
                                <label class="input-label">Unit</label>
                                <input id="f_xp_unit" class="input-field" placeholder="pcs/g" />
                            </div>
                            <div>
                                <label class="input-label">Durasi per Batch (menit)</label>
                                <input id="f_xp_duration" type="number" class="input-field" min="0" />
                            </div>
                        </div>
                    </div>
                </div>

                <div id="tab-workflow" class="hidden">
                    <div class="form-full mb-3 p-3 rounded border border-gray-200 bg-gray-50">
                        <label class="input-label">Simpan langkah workflow ke resep</label>
                        <select id="f_workflow_recipe_external" class="input-field mt-1">${recipeOptsHtml}</select>
                        <div class="text-xs text-muted mt-2">Default: langkah divisi tersimpan di resep menu yang sama dengan bahan. Pilih resep lain untuk memakai template workflow terpisah (BOM &amp; alat masak tetap dari resep menu).</div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="input-label">Durasi Masak (menit)</label>
                            <input id="f_menu_cook" class="input-field" type="number" min="1" step="1" value="${Number(m.cooking_time || 60)}" />
                            <div id="cook-derived-hint" class="text-xs text-muted mt-1"></div>
                        </div>
                        <div>
                            <label class="input-label">Kapasitas Batch (porsi/batch)</label>
                            <input id="f_menu_cap" class="input-field" type="number" min="1" step="1" value="${Number(m.batch_capacity || 50)}" />
                        </div>
                    </div>

                    <div class="flex justify-between items-center mb-2">
                        <div class="text-sm text-muted"><i class="fas fa-list-ol"></i> Resep bisa manual atau dibuat otomatis.</div>
                        <div class="flex gap-2">
                            <button class="btn btn-secondary btn-sm" id="btn-auto-steps"><i class="fas fa-wand-magic-sparkles"></i> Otomatis</button>
                            <button class="btn btn-primary btn-sm" id="btn-add-step"><i class="fas fa-plus"></i> Tambah Langkah</button>
                        </div>
                    </div>
                    <div class="text-xs text-muted mb-2">
                        Kapasitas & durasi langkah <b>Masak</b> otomatis mengikuti input di atas. Kolom throughput dipakai untuk langkah yang butuh alat/stasiun khusus (mis. prep/packing).
                    </div>
                    <div class="card p-0 overflow-hidden workflow-table">
                        <div class="table-responsive">
                            <table class="nutri-table w-full">
                                <thead>
                                    <tr>
                                        <th width="40">#</th>
                                        <th>Langkah</th>
                                        <th>Divisi</th>
                                        <th width="80">Durasi</th>
                                        <th>Alat</th>
                                        <th width="140">Throughput/Alat</th>
                                        <th width="50"></th>
                                    </tr>
                                </thead>
                                <tbody id="workflow-steps-body">
                                    <tr><td colspan="7" class="text-center text-muted p-4">Belum ada langkah</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeSidebarUi() },
                { label: id ? 'Simpan Perubahan' : 'Simpan Menu', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setSidebarError('');
                        const name = document.getElementById('f_menu_name').value.trim();
                        if (!name) return setSidebarError('Nama menu wajib diisi');
                        const normalized = name.toLowerCase();
                        const dupe = (menus || []).find(x => String(x.id) !== String(id || '') && String(x.name || '').trim().toLowerCase() === normalized);
                        if (dupe) return setSidebarError('Nama menu sudah ada. Gunakan nama lain.');
                        const portion_size = Number(document.getElementById('f_menu_portion_size').value || 1);
                        if (!Number.isFinite(portion_size) || portion_size <= 0) return setSidebarError('Jumlah menu per porsi wajib > 0');
                        const cooking_time = Number(document.getElementById('f_menu_cook').value || 60);
                        const batch_capacity = Number(document.getElementById('f_menu_cap').value || 50);
                        if (!ingredientsDraft.length) return setSidebarError('Tambah minimal 1 bahan');
                        for (const r of ingredientsDraft) {
                            if (!String(r.ingredient_id || '').trim()) return setSidebarError('Pilih ingredient pada setiap baris');
                            const q = Number(r.quantity_per_portion || 0);
                            if (!Number.isFinite(q) || q <= 0) return setSidebarError('Jumlah bahan per porsi wajib > 0');
                        }

                        const xpEnabled = document.getElementById('f_extra_pack_enabled').checked;
                        const xpType = (document.getElementById('f_xp_material_type').value || '').trim();
                        const xpCustom = (document.getElementById('f_xp_material_custom').value || '').trim();
                        const xpMaterial = xpType === 'lainnya' ? xpCustom : xpType;
                        const xpData = xpEnabled ? {
                            enabled: true,
                            material_type: xpType,
                            material: xpMaterial,
                            quantity: Number(document.getElementById('f_xp_qty').value || 0),
                            unit: (document.getElementById('f_xp_unit').value || '').trim(),
                            duration_minutes: Number(document.getElementById('f_xp_duration').value || 0)
                        } : { enabled: false };

                        const payload = {
                            name,
                            cooking_time,
                            batch_capacity,
                            portion_size,
                            ingredients: ingredientsDraft.map(r => ({
                                ingredient_id: r.ingredient_id,
                                quantity_per_portion: Number(r.quantity_per_portion || 0),
                                cutting_enabled: !!r.cutting_enabled,
                                cutting_duration_minutes: Number(r.cutting_duration_minutes || 0),
                                cutting_output_per_duration: Number(r.cutting_output_per_duration || 0),
                                washing_enabled: !!r.washing_enabled,
                                washing_duration_minutes: Number(r.washing_duration_minutes || 0),
                                washing_output_per_duration: Number(r.washing_output_per_duration || 0),
                                peeling_enabled: !!r.peeling_enabled,
                                peeling_duration_minutes: Number(r.peeling_duration_minutes || 0),
                                peeling_output_per_duration: Number(r.peeling_output_per_duration || 0)
                            })),
                            tools: currentTools.map(t => ({
                                tool_id: t.tool_id,
                                batch_capacity: Number(t.batch_capacity || 0),
                                batch_duration_minutes: Number(t.batch_duration_minutes || 0)
                            })),
                            steps: currentSteps.map(s => ({
                                title: String(s.title || ''),
                                division_id: String(s.division_id || 'prep'),
                                duration_minutes: Number(s.duration_minutes || 0),
                                required_resource_type: String(s.required_resource_type || ''),
                                batch_capacity: Number(s.batch_capacity || 0),
                                batch_duration_minutes: Number(s.batch_duration_minutes || 0)
                            })),
                            extra_packing_json: xpData,
                            packaging_type: xpEnabled ? xpMaterial : null
                        };

                        const wfEl = document.getElementById('f_workflow_recipe_external');
                        const wfRaw = wfEl ? String(wfEl.value || '').trim() : '';
                        if (wfRaw && id && wfRaw === String(m.recipe_id || '').trim()) {
                            payload.workflow_recipe_id = null;
                        } else {
                            payload.workflow_recipe_id = wfRaw || null;
                        }

                        if (window.tempFoodId) payload.food_id = window.tempFoodId;

                        let menuId = id;
                        if (id) await api(`/api/menu/${id}`, 'PUT', payload);
                        else {
                            const res = await api('/api/menu', 'POST', payload);
                            menuId = res.id;
                        }

                        // Save Prep Details (Separate Table)
                        const prepItems = [];
                        ingredientsDraft.forEach(r => {
                            if (r.cutting_enabled) prepItems.push({ ingredient_id: r.ingredient_id, action_type: 'CUT', duration_per_kg_minutes: r.cutting_duration_minutes, is_enabled: true });
                            if (r.washing_enabled) prepItems.push({ ingredient_id: r.ingredient_id, action_type: 'WASH', duration_per_kg_minutes: r.washing_duration_minutes, is_enabled: true });
                            if (r.peeling_enabled) prepItems.push({ ingredient_id: r.ingredient_id, action_type: 'PEEL', duration_per_kg_minutes: r.peeling_duration_minutes, is_enabled: true });
                        });
                        if (menuId && prepItems.length) {
                            await api(`/api/menu/${menuId}/prep`, 'POST', { items: prepItems });
                        }

                        if (window.tempFoodId) await onSelectFoodV2();
                        else await loadMenu();

                        window.tempFoodId = null;
                        closeSidebarUi();
                        notifyUi('success', 'Menu', 'Berhasil disimpan');
                    } catch (e) {
                        setSidebarError(e.message || 'Gagal menyimpan');
                    }
                } }
            ]
        });

        window.showTab = (tabId, btn) => {
            const tabs = ['tab-general', 'tab-ingredients', 'tab-tools', 'tab-packing', 'tab-workflow'];
            tabs.forEach(t => document.getElementById(t)?.classList.add('hidden'));
            document.getElementById(tabId)?.classList.remove('hidden');
            if (btn && btn.parentElement) {
                btn.parentElement.querySelectorAll('button').forEach(b => {
                    b.classList.remove('border-primary', 'font-bold', 'text-blue-600');
                    b.classList.add('border-transparent', 'text-muted');
                });
                btn.classList.remove('border-transparent', 'text-muted');
                btn.classList.add('border-primary', 'font-bold', 'text-blue-600');
            }
        };

        const renderIngredients = () => {
            const c = document.getElementById('ingredients-container');
            if (!c) return;
            if (!ingredientsDraft.length) {
                c.innerHTML = '<div class="text-center text-muted text-sm p-4 border border-dashed rounded">Belum ada bahan</div>';
                return;
            }
            c.innerHTML = ingredientsDraft.map((r, idx) => {
                const ing = ingById.get(String(r.ingredient_id || '')) || null;
                const unit = ing ? String(ing.unit || '-') : '-';
                return `
                    <div class="card p-3 border bg-white" data-idx="${idx}">
                        <div class="flex justify-between items-center mb-2">
                            <div class="font-bold text-sm">Ingredient ${idx + 1}</div>
                            <button class="btn btn-danger btn-sm" type="button" data-act="rm-ing">Hapus</button>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="form-full">
                                <label class="input-label">Ingredient</label>
                                <select class="input-field" data-act="ing-select">
                                    <option value="">-- Pilih Bahan --</option>
                                    ${ingOpt}
                                </select>
                            </div>
                            <div class="form-full">
                                <label class="input-label">Jumlah per Porsi</label>
                                <div class="flex items-center gap-2">
                                    <input class="input-field" type="number" min="0" step="0.1" data-act="ing-qty" value="${Number(r.quantity_per_portion || 0)}" />
                                    <span class="text-muted text-sm">${unit}</span>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-xs mt-3">
                            <div class="border rounded p-2 ${r.cutting_enabled ? 'bg-blue-50 border-blue-200' : 'bg-white'}">
                                <label class="flex items-center gap-1 mb-1 cursor-pointer font-bold"><input type="checkbox" data-act="cutting-enabled" ${r.cutting_enabled ? 'checked' : ''}> Cutting</label>
                                ${r.cutting_enabled ? `<div class="space-y-1"><input type="number" class="input-field text-xs py-0.5" data-act="cutting-dur" placeholder="Durasi (menit)" value="${Number(r.cutting_duration_minutes || 0) || ''}"><input type="number" class="input-field text-xs py-0.5" data-act="cutting-out" placeholder="Hasil per durasi (g/pcs)" value="${Number(r.cutting_output_per_duration || 0) || ''}"></div>` : ''}
                            </div>
                            <div class="border rounded p-2 ${r.washing_enabled ? 'bg-blue-50 border-blue-200' : 'bg-white'}">
                                <label class="flex items-center gap-1 mb-1 cursor-pointer font-bold"><input type="checkbox" data-act="washing-enabled" ${r.washing_enabled ? 'checked' : ''}> Washing</label>
                                ${r.washing_enabled ? `<div class="space-y-1"><input type="number" class="input-field text-xs py-0.5" data-act="washing-dur" placeholder="Durasi (menit)" value="${Number(r.washing_duration_minutes || 0) || ''}"><input type="number" class="input-field text-xs py-0.5" data-act="washing-out" placeholder="Hasil per durasi (g/pcs)" value="${Number(r.washing_output_per_duration || 0) || ''}"></div>` : ''}
                            </div>
                            <div class="border rounded p-2 ${r.peeling_enabled ? 'bg-blue-50 border-blue-200' : 'bg-white'}">
                                <label class="flex items-center gap-1 mb-1 cursor-pointer font-bold"><input type="checkbox" data-act="peeling-enabled" ${r.peeling_enabled ? 'checked' : ''}> Peeling</label>
                                ${r.peeling_enabled ? `<div class="space-y-1"><input type="number" class="input-field text-xs py-0.5" data-act="peeling-dur" placeholder="Durasi (menit)" value="${Number(r.peeling_duration_minutes || 0) || ''}"><input type="number" class="input-field text-xs py-0.5" data-act="peeling-out" placeholder="Hasil per durasi (g/pcs)" value="${Number(r.peeling_output_per_duration || 0) || ''}"></div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            c.querySelectorAll('[data-act="ing-select"]').forEach((sel, idx) => {
                sel.value = ingredientsDraft[idx]?.ingredient_id || '';
            });
        };

        document.getElementById('btn-add-ingredient').addEventListener('click', (e) => {
            e.preventDefault();
            ingredientsDraft.push({
                ingredient_id: '',
                quantity_per_portion: 0,
                cutting_enabled: false,
                cutting_duration_minutes: 0,
                cutting_output_per_duration: 0,
                washing_enabled: false,
                washing_duration_minutes: 0,
                washing_output_per_duration: 0,
                peeling_enabled: false,
                peeling_duration_minutes: 0,
                peeling_output_per_duration: 0
            });
            renderIngredients();
        });

        document.getElementById('ingredients-container').addEventListener('click', (ev) => {
            const card = ev.target.closest('[data-idx]');
            if (!card) return;
            const idx = Number(card.getAttribute('data-idx'));
            const act = ev.target.getAttribute('data-act') || ev.target.closest('[data-act]')?.getAttribute('data-act');
            if (act === 'rm-ing') {
                ingredientsDraft.splice(idx, 1);
                renderIngredients();
            }
        });

        document.getElementById('ingredients-container').addEventListener('change', (ev) => {
            const card = ev.target.closest('[data-idx]');
            if (!card) return;
            const idx = Number(card.getAttribute('data-idx'));
            const act = ev.target.getAttribute('data-act');
            const row = ingredientsDraft[idx];
            if (!row) return;
            if (act === 'ing-select') { row.ingredient_id = String(ev.target.value || ''); renderIngredients(); return; }
            if (act === 'cutting-enabled') { row.cutting_enabled = !!ev.target.checked; renderIngredients(); return; }
            if (act === 'washing-enabled') { row.washing_enabled = !!ev.target.checked; renderIngredients(); return; }
            if (act === 'peeling-enabled') { row.peeling_enabled = !!ev.target.checked; renderIngredients(); return; }
        });

        document.getElementById('ingredients-container').addEventListener('input', (ev) => {
            const card = ev.target.closest('[data-idx]');
            if (!card) return;
            const idx = Number(card.getAttribute('data-idx'));
            const act = ev.target.getAttribute('data-act');
            const row = ingredientsDraft[idx];
            if (!row) return;
            if (act === 'ing-qty') row.quantity_per_portion = Number(ev.target.value || 0);
            if (act === 'cutting-dur') row.cutting_duration_minutes = Number(ev.target.value || 0);
            if (act === 'cutting-out') row.cutting_output_per_duration = Number(ev.target.value || 0);
            if (act === 'washing-dur') row.washing_duration_minutes = Number(ev.target.value || 0);
            if (act === 'washing-out') row.washing_output_per_duration = Number(ev.target.value || 0);
            if (act === 'peeling-dur') row.peeling_duration_minutes = Number(ev.target.value || 0);
            if (act === 'peeling-out') row.peeling_output_per_duration = Number(ev.target.value || 0);
        });

        const renderTools = () => {
            const container = document.getElementById('tools-container');
            if (!container) return;
            if (!currentTools.length) {
                container.innerHTML = '<div class="text-center text-muted text-sm p-4 border border-dashed rounded">Belum ada alat masak</div>';
                return;
            }
            container.innerHTML = currentTools.map((t, idx) => `
                <div class="card p-3 bg-gray-50 border relative">
                    <button class="absolute top-2 right-2 text-red-500 hover:text-red-700" type="button" data-act="rm-tool" data-idx="${idx}"><i class="fas fa-times"></i></button>
                    <div class="font-bold mb-2">${t.tool_name || '-'}</div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-xs text-muted">Kapasitas Batch (porsi/batch)</label>
                            <input type="number" class="input-field text-sm" data-idx="${idx}" data-key="batch_capacity" value="${t.batch_capacity || 0}">
                        </div>
                        <div>
                            <label class="text-xs text-muted">Durasi Batch (menit)</label>
                            <input type="number" class="input-field text-sm" data-idx="${idx}" data-key="batch_duration_minutes" value="${t.batch_duration_minutes || 0}">
                        </div>
                    </div>
                </div>
            `).join('');
        };

        const syncCookDefaultsFromTools = () => {
            const cookEl = document.getElementById('f_menu_cook');
            const capEl = document.getElementById('f_menu_cap');
            const hintEl = document.getElementById('cook-derived-hint');
            if (!cookEl || !capEl) return;

            const candidates = (currentTools || [])
                .map(t => ({
                    tool_name: String(t.tool_name || '').trim(),
                    cap: Number(t.batch_capacity || 0),
                    dur: Number(t.batch_duration_minutes || 0)
                }))
                .filter(x => Number.isFinite(x.cap) && x.cap > 0 && Number.isFinite(x.dur) && x.dur > 0);

            if (!candidates.length) {
                cookEl.disabled = false;
                capEl.disabled = false;
                if (hintEl) hintEl.textContent = 'Isi di tab Alat Masak agar durasi & kapasitas masak otomatis.';
                return;
            }

            candidates.sort((a, b) => (b.cap - a.cap) || (a.dur - b.dur));
            const best = candidates[0];

            cookEl.value = String(best.dur);
            capEl.value = String(best.cap);
            cookEl.disabled = true;
            capEl.disabled = true;
            if (hintEl) hintEl.textContent = `Otomatis dari alat: ${best.tool_name || 'Alat Masak'}.`;

            try { cookEl.dispatchEvent(new Event('input')); } catch (e) {}
            try { capEl.dispatchEvent(new Event('input')); } catch (e) {}
        };

        // Tools Container Listeners (Remove & Update)
        const toolsContainer = document.getElementById('tools-container');
        if (toolsContainer) {
            toolsContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-act="rm-tool"]');
                if (btn) {
                    e.preventDefault();
                    const idx = Number(btn.getAttribute('data-idx'));
                    if (currentTools[idx]) {
                        currentTools.splice(idx, 1);
                        renderTools();
                        syncCookDefaultsFromTools();
                    }
                }
            });
            
            toolsContainer.addEventListener('input', (e) => {
                const input = e.target.closest('input');
                if (!input) return;
                const idx = Number(input.getAttribute('data-idx'));
                const key = input.getAttribute('data-key');
                if (currentTools[idx] && key) {
                    currentTools[idx][key] = Number(input.value || 0);
                    syncCookDefaultsFromTools();
                }
            });
        }

        // Inline "Add Tool" Handler
        const btnAddToolInline = document.getElementById('btn-add-tool-inline');
        if (btnAddToolInline) {
            btnAddToolInline.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const sel = document.getElementById('tool-select');
                if (!sel) return;
                
                const toolId = sel.value;
                if (!toolId) return notifyUi('warning', 'Alat', 'Pilih alat terlebih dahulu');
                
                const toolName = sel.options[sel.selectedIndex].text;
                // Check duplicate
                if (currentTools.find(t => String(t.tool_id) === String(toolId))) {
                    return notifyUi('warning', 'Alat', 'Alat sudah ditambahkan');
                }
                
                currentTools.push({ tool_id: toolId, tool_name: toolName, batch_capacity: 0, batch_duration_minutes: 0 });
                renderTools();
                syncCookDefaultsFromTools();
                sel.value = ''; // Reset selection
            };
        }

        // Removed old modal-based btn-add-tool listener since element ID changed

        // Toggle Extra Packing Content
        const xpCheck = document.getElementById('f_extra_pack_enabled');
        if (xpCheck) {
            xpCheck.onclick = (e) => {
                const content = document.getElementById('extra-pack-fields');
                if (content) {
                    if (e.target.checked) content.classList.remove('hidden');
                    else content.classList.add('hidden');
                }
            };
            // Initial state
            const content = document.getElementById('extra-pack-fields');
            if (content && !xpCheck.checked) content.classList.add('hidden');
        }

        // Create Tool Handler (Inline)
        const btnCreateTool = document.getElementById('btn-create-tool');
        if (btnCreateTool) {
            btnCreateTool.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const nameInput = document.getElementById('tool-new-name');
                const name = nameInput.value.trim();
                if (!name) return notifyUi('warning', 'Alat', 'Nama alat wajib diisi');
                
                try {
                    notifyUi('info', 'Alat', 'Menyimpan...');
                    const res = await api('/api/tools', 'POST', { name, type: 'manual', capacity_portions: 0 });
                    await reloadToolsOptions();
                    nameInput.value = '';
                    
                    // Auto select the new tool
                    const sel = document.getElementById('tool-select');
                    if (sel) sel.value = res.id;
                    
                    notifyUi('success', 'Alat', 'Berhasil dibuat');
                } catch (err) {
                    notifyUi('danger', 'Alat', 'Gagal membuat alat: ' + err.message);
                }
            };
        }

        document.getElementById('f_xp_material_type').addEventListener('change', (e) => {
            const custom = document.getElementById('f_xp_material_custom_div');
            if (e.target.value === 'lainnya') custom.classList.remove('hidden');
            else custom.classList.add('hidden');
        });



        const reloadToolsOptions = async () => {
            let tools = [];
            try { tools = await api('/api/kitchen/equipment'); } catch(e) { tools = []; }
            
            // Store unique types for steps
            window._availableResourceTypes = [...new Set(tools.map(t => t.type || t.resource_type))].filter(Boolean).sort();
            
            // Update "Alat Masak" tab dropdown (if used for specific assignment)
            const sel = document.getElementById('tool-select');
            if (sel) sel.innerHTML = '<option value="">-- Pilih Alat --</option>' + tools.map(t => `<option value="${t.id}">${t.name} (${t.type || t.resource_type})</option>`).join('');
        };

        // Fix Duplicate Listeners (Remove old listeners by replacing element or just ensure new one overrides)
        // Since we are inside openMenuCreate which is called multiple times, we should be careful.
        // But here we are just fixing logic.
        
        // Removed old btn-add-tool listener above and replaced with modal version.
        // But wait, search/replace might have left old code if I targeted wrong block.
        // Let's ensure we clean up the old "btn-add-tool" block that used "tool-select".

        // Remove old direct add listener block if exists (it was in search block)
        // The search block covered the old implementation.

        // Extra Packing Visibility Logic
        const setExtraPackVisible = (checked) => {
            const el = document.getElementById('extra-pack-fields');
            if (!el) return;
            if (checked) el.classList.remove('hidden'); else el.classList.add('hidden');
        };

        const setExtraPackCustomVisible = (type) => {
            const el = document.getElementById('f_xp_material_custom');
            if (!el) return;
            if (type === 'lainnya') el.classList.remove('hidden'); else el.classList.add('hidden');
        };

        // Re-attach listeners cleanly
        const xpEnabled = document.getElementById('f_extra_pack_enabled');
        if (xpEnabled) {
             xpEnabled.removeEventListener('change', xpEnabled._listener); // naive remove
             xpEnabled._listener = (e) => setExtraPackVisible(!!e.target.checked);
             xpEnabled.addEventListener('change', xpEnabled._listener);
             // Init
             setExtraPackVisible(xpEnabled.checked);
        }

        const xpType = document.getElementById('f_xp_material_type');
        if (xpType) {
             xpType.removeEventListener('change', xpType._listener);
             xpType._listener = (e) => setExtraPackCustomVisible(String(e.target.value || ''));
             xpType.addEventListener('change', xpType._listener);
        }

        const renderSteps = () => {
            const tbody = document.getElementById('workflow-steps-body');
            if (!tbody) return;
            
            // Ensure currentSteps is valid
            if (!Array.isArray(currentSteps)) currentSteps = [];
            const cookDur = Math.max(0, Number(document.getElementById('f_menu_cook')?.value || 0));
            const cookCap = Math.max(0, Number(document.getElementById('f_menu_cap')?.value || 0));
            const cookIdxByTitle = currentSteps.findIndex(s => String(s?.division_id || '') === 'cooking' && /masak/i.test(String(s?.title || '')));
            const cookIdx = cookIdxByTitle >= 0 ? cookIdxByTitle : currentSteps.findIndex(s => String(s?.division_id || '') === 'cooking');
            if (cookIdx >= 0 && currentSteps[cookIdx]) {
                if (Number.isFinite(cookDur) && cookDur > 0) currentSteps[cookIdx].duration_minutes = cookDur;
                if (Number.isFinite(cookCap) && cookCap > 0) currentSteps[cookIdx].batch_capacity = cookCap;
            }

            if (!currentSteps.length) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-4">Belum ada langkah</td></tr>`;
                return;
            }
            const divLabel = (id) => {
                const x = String(id || '');
                if (x === 'prep') return 'Persiapan';
                if (x === 'cooking') return 'Dapur (Masak)';
                if (x === 'packing') return 'Packing';
                if (x === 'receiving') return 'Penerimaan';
                return x || '-';
            };
            const isSystemSetupStep = (s) => String(s?.division_id || '') === 'cooking' && /^setup masak$/i.test(String(s?.title || '').trim()) && !!s._system_generated;
            tbody.innerHTML = currentSteps.map((s, idx) => `
                <tr class="${isSystemSetupStep(s) ? 'workflow-system-step' : ''}">
                    <td>${idx + 1}</td>
                    <td><input class="input-field py-1 px-2 text-sm step-title" value="${String(s.title || '').replace(/"/g, '&quot;')}" placeholder="Nama Langkah" data-idx="${idx}" /></td>
                    <td>
                        <select class="input-field py-1 px-2 text-sm step-div" data-idx="${idx}" title="${divLabel(s.division_id).replace(/"/g, '&quot;')}">
                            <option value="prep" ${s.division_id === 'prep' ? 'selected' : ''}>Persiapan</option>
                            <option value="cooking" ${s.division_id === 'cooking' ? 'selected' : ''}>Dapur (Masak)</option>
                            <option value="packing" ${s.division_id === 'packing' ? 'selected' : ''}>Packing</option>
                            <option value="receiving" ${s.division_id === 'receiving' ? 'selected' : ''}>Penerimaan</option>
                        </select>
                    </td>
                    <td><input type="number" class="input-field py-1 px-2 text-sm step-dur" value="${Number(s.duration_minutes || 0)}" min="0" data-idx="${idx}" placeholder="Durasi (m)" /></td>
                    <td>
                        <select class="input-field py-1 px-2 text-sm step-tool" data-idx="${idx}" title="${String(s.required_resource_type || '').replace(/"/g, '&quot;')}">
                            <option value="">- Alat -</option>
                            ${(window._availableResourceTypes || []).map(type => `<option value="${type}" ${String(s.required_resource_type || '') === String(type) ? 'selected' : ''}>${type}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <input
                            type="number"
                            class="input-field py-1 px-2 text-sm step-cap"
                            value="${(s.batch_capacity != null && Number(s.batch_capacity) > 0) ? Number(s.batch_capacity) : ''}"
                            min="0"
                            step="1"
                            data-idx="${idx}"
                            placeholder="Porsi/alat"
                            ${String(s.division_id || '') === 'cooking' ? 'disabled' : (s.required_resource_type ? '' : 'disabled')}
                        />
                    </td>
                    <td><button class="text-red-500 hover:text-red-300 btn-del-step" data-idx="${idx}"><i class="fas fa-trash"></i></button></td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.step-title').forEach(el => el.addEventListener('input', e => { if(currentSteps[e.target.dataset.idx]) currentSteps[e.target.dataset.idx].title = e.target.value; }));
            tbody.querySelectorAll('.step-div').forEach(el => el.addEventListener('change', e => { 
                if (currentSteps[e.target.dataset.idx]) currentSteps[e.target.dataset.idx].division_id = e.target.value; 
                e.target.title = e.target.options[e.target.selectedIndex]?.textContent || '';
                renderSteps();
            }));
            tbody.querySelectorAll('.step-dur').forEach(el => el.addEventListener('input', e => { if(currentSteps[e.target.dataset.idx]) currentSteps[e.target.dataset.idx].duration_minutes = Number(e.target.value); }));
            tbody.querySelectorAll('.step-tool').forEach(el => el.addEventListener('change', e => { 
                if(currentSteps[e.target.dataset.idx]) {
                    currentSteps[e.target.dataset.idx].required_resource_type = e.target.value;
                    e.target.title = e.target.options[e.target.selectedIndex]?.textContent || '';
                    const cap = tbody.querySelector(`.step-cap[data-idx="${e.target.dataset.idx}"]`);
                    if (cap) cap.disabled = String(currentSteps[e.target.dataset.idx].division_id || '') === 'cooking' ? true : !e.target.value;
                }
            }));
            tbody.querySelectorAll('.step-cap').forEach(el => el.addEventListener('input', e => {
                if (currentSteps[e.target.dataset.idx]) currentSteps[e.target.dataset.idx].batch_capacity = Number(e.target.value || 0);
            }));
            tbody.querySelectorAll('.btn-del-step').forEach(el => el.addEventListener('click', e => { 
                e.preventDefault();
                const idx = Number(e.currentTarget.dataset.idx); 
                if (currentSteps[idx]) {
                    currentSteps.splice(idx, 1); 
                    renderSteps(); 
                }
            }));
        };

        const wfExternalSel = document.getElementById('f_workflow_recipe_external');
        if (wfExternalSel) {
            wfExternalSel.addEventListener('change', async () => {
                const v = String(wfExternalSel.value || '').trim();
                const target = v || baseRecipeIdForWf;
                if (!target) {
                    currentSteps = [];
                    renderSteps();
                    return;
                }
                try {
                    const s = await api(`/api/recipes/${target}/steps`);
                    currentSteps = Array.isArray(s) ? s.map(x => ({ ...x })) : [];
                    renderSteps();
                    notifyUi('success', 'Workflow', 'Langkah dimuat ulang dari resep yang dipilih.');
                } catch (err) {
                    notifyUi('danger', 'Workflow', (err && err.message) || 'Gagal memuat langkah');
                }
            });
        }

        // Improved Listener Attachment (Simpler & Safer with onclick)
        const btnAddStep = document.getElementById('btn-add-step');
        if (btnAddStep) {
            btnAddStep.onclick = (e) => {
                e.preventDefault(); 
                try {
                    if (!Array.isArray(currentSteps)) currentSteps = [];
                    currentSteps.push({ title: '', division_id: 'prep', duration_minutes: 10, required_resource_type: '', batch_capacity: 0 });
                    renderSteps();
                } catch (err) {
                    console.error(err);
                    notifyUi('danger', 'Workflow', 'Error adding step: ' + err.message);
                }
            };
        }
        
        const btnAuto = document.getElementById('btn-auto-steps');
        if (btnAuto) {
             btnAuto.onclick = (e) => {
                 e.preventDefault();
                 try {
                     const menuNameInput = document.getElementById('f_menu_name');
                     const menuName = menuNameInput ? (menuNameInput.value.trim() || 'Menu') : 'Menu';
                     
                     syncCookDefaultsFromTools();
                     const cookInput = document.getElementById('f_menu_cook');
                     const cook = cookInput ? Number(cookInput.value || 60) : 60;

                     const capInput = document.getElementById('f_menu_cap');
                     const cap = capInput ? Number(capInput.value || 50) : 50;
                     
                     const xpCheck = document.getElementById('f_extra_pack_enabled');
                     const xpEnabled = xpCheck ? xpCheck.checked : false;
                     
                     const xpDurInput = document.getElementById('f_xp_duration');
                     const xpDur = xpDurInput ? Number(xpDurInput.value || 0) : 0;
                     
                     const getCookingSetupMinutes = async () => {
                         try {
                             const cfg = await api('/api/kitchen/config/cooking');
                             const x = Number(cfg?.setup_before_first_batch_minutes ?? cfg?.batch_buffer_minutes ?? 10);
                             return Number.isFinite(x) ? Math.max(0, x) : 10;
                         } catch (e) {
                             return 10;
                         }
                     };

                     const steps = [];
                     
                     const byIng = (ingId) => {
                         const ing = ingById.get(String(ingId || ''));
                         return ing ? String(ing.name || '') : '';
                     };
                     
                     for (const r of ingredientsDraft) {
                         const n = byIng(r.ingredient_id);
                         if (r.washing_enabled) steps.push({ title: `Washing ${n}`, division_id: 'prep', duration_minutes: Number(r.washing_duration_minutes || 10) });
                         if (r.peeling_enabled) steps.push({ title: `Peeling ${n}`, division_id: 'prep', duration_minutes: Number(r.peeling_duration_minutes || 10) });
                         if (r.cutting_enabled) steps.push({ title: `Cutting ${n}`, division_id: 'prep', duration_minutes: Number(r.cutting_duration_minutes || 10) });
                     }
                     
                     if (!steps.length && ingredientsDraft.length) steps.push({ title: 'Persiapan bahan', division_id: 'prep', duration_minutes: 10 });
                     getCookingSetupMinutes().then((setupMins) => {
                        steps.push({ title: 'Setup Masak', division_id: 'cooking', duration_minutes: setupMins, _system_generated: true });
                         steps.push({ title: `Masak ${menuName}`, division_id: 'cooking', duration_minutes: Number.isFinite(cook) ? cook : 60, batch_capacity: Number.isFinite(cap) ? cap : 0 });
                         steps.push({ title: xpEnabled ? 'Extra Packing' : 'Packing', division_id: 'packing', duration_minutes: xpEnabled ? (Number.isFinite(xpDur) ? xpDur : 10) : 10 });

                         if (!Array.isArray(currentSteps)) currentSteps = [];
                         currentSteps.splice(0, currentSteps.length, ...steps);
                         renderSteps();
                         notifyUi('success', 'Workflow', 'Steps generated automatically');
                     }).catch(() => {
                         steps.push({ title: `Masak ${menuName}`, division_id: 'cooking', duration_minutes: Number.isFinite(cook) ? cook : 60, batch_capacity: Number.isFinite(cap) ? cap : 0 });
                         steps.push({ title: xpEnabled ? 'Extra Packing' : 'Packing', division_id: 'packing', duration_minutes: xpEnabled ? (Number.isFinite(xpDur) ? xpDur : 10) : 10 });

                         if (!Array.isArray(currentSteps)) currentSteps = [];
                         currentSteps.splice(0, currentSteps.length, ...steps);
                         renderSteps();
                         notifyUi('success', 'Workflow', 'Steps generated automatically');
                     });
                 } catch (err) {
                     console.error(err);
                     notifyUi('danger', 'Workflow', 'Error auto-generating steps: ' + err.message);
                 }
             };
        }
        
        const capEl = document.getElementById('f_menu_cap');
        if (capEl) capEl.addEventListener('input', () => renderSteps());
        const cookEl = document.getElementById('f_menu_cook');
        if (cookEl) cookEl.addEventListener('input', () => renderSteps());

        const initExtraPacking = () => {
            const cb = document.getElementById('f_extra_pack_enabled');
            cb.checked = !!extraPackingDraft.enabled;
            setExtraPackVisible(!!extraPackingDraft.enabled);
            document.getElementById('f_xp_material_type').value = extraPackingDraft.material_type || '';
            setExtraPackCustomVisible(extraPackingDraft.material_type);
            document.getElementById('f_xp_material_custom').value = extraPackingDraft.material_custom || '';
            document.getElementById('f_xp_qty').value = String(extraPackingDraft.quantity || 0);
            document.getElementById('f_xp_unit').value = extraPackingDraft.unit || 'pcs';
            document.getElementById('f_xp_duration').value = String(extraPackingDraft.duration_minutes || 0);
        };

        renderIngredients();
        renderTools();
        renderSteps();
        syncCookDefaultsFromTools();
        initExtraPacking();
        await reloadToolsOptions();
    } catch (e) {
        notifyUi('danger', 'Menu', 'Gagal membuka form: ' + e.message);
    }
}

// --- FOOD (PAKET PERMENUAN) LOGIC ---

async function loadFoodsV2(retry = 0) {
    const libFoodTbody = document.getElementById('library-food-rows');
    if (libFoodTbody && retry === 0) {
        libFoodTbody.innerHTML = `<tr><td colspan="4" class="text-muted p-3">Memuat…</td></tr>`;
    }

    const sel = document.getElementById('prod-food-select');
    if (retry === 0 && sel) sel.innerHTML = '<option>Loading...</option>';

    try {
        const foods = await api('/api/foods');
        let list = [];
        if (Array.isArray(foods)) list = foods;
        else if (foods && Array.isArray(foods.items)) list = foods.items;
        else if (foods && Array.isArray(foods.data)) list = foods.data;
        currentFoodList = list;

        const searchFood = document.getElementById('library-food-search');
        try {
            renderLibraryFoodTable(searchFood ? searchFood.value : '');
        } catch (renderErr) {
            console.error('[loadFoodsV2] renderLibraryFoodTable', renderErr);
            if (libFoodTbody) {
                const msg = renderErr && renderErr.message ? renderErr.message : String(renderErr);
                libFoodTbody.innerHTML = `<tr><td colspan="4" class="text-danger p-3">Gagal menampilkan daftar Food: ${escapeHtmlMenu(msg)}</td></tr>`;
            }
        }

        if (!sel) return;

        const tbody = document.getElementById('prod-menus-rows');
        if (!currentFoodList.length) {
            sel.innerHTML = '<option value="">Belum ada Food</option>';
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Silakan tambah Food baru</td></tr>`;
            return;
        }

        sel.innerHTML = '<option value="">-- Pilih Food --</option>' +
            currentFoodList.map(f => `<option value="${f.id}">${escapeHtmlMenu(f.name)}</option>`).join('');

        if (currentFoodId && currentFoodList.find(f => f.id === currentFoodId)) {
            sel.value = currentFoodId;
            onSelectFoodV2();
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Pilih Food di dropdown workspace di atas, atau klik <b>Kelola</b> pada <b>Library Food</b> di bawah.</td></tr>`;
        }
    } catch (e) {
        if (retry < 3) {
            console.warn(`Retrying load foods (${retry + 1}/3)...`);
            setTimeout(() => loadFoodsV2(retry + 1), 2000);
            return;
        }
        sel.innerHTML = '<option>Gagal memuat data</option>';
        if (libFoodTbody) {
            libFoodTbody.innerHTML = `<tr><td colspan="4" class="text-danger p-3">Gagal memuat Food: ${escapeHtmlMenu(e.message || String(e))}</td></tr>`;
        }
        console.error(e);
        const msg = e.message.includes('CANNOT GET') ? 'Server backend mati/tidak terhubung' : e.message;
        notifyUi('danger', 'Koneksi Server', 'Gagal load foods: ' + msg);
    }
}

async function deleteFoodById(foodId) {
    if (!foodId) return;
    const food = (Array.isArray(currentFoodList) ? currentFoodList : []).find(f => String(f.id) === String(foodId));
    const confirmed = await confirmUi({
        title: 'Hapus Food',
        message: `Hapus food "${food?.name || foodId}" beserta semua tautan menu & packaging-nya? Menu individu TIDAK ikut terhapus.`,
        confirmLabel: 'Hapus',
        cancelLabel: 'Batal',
        danger: true
    });
    if (!confirmed) return;
    try {
        await api(`/api/foods/${foodId}`, 'DELETE');
        if (String(currentFoodId) === String(foodId)) currentFoodId = null;
        notifyUi('success', 'Food', 'Food berhasil dihapus');
        await loadFoodsV2();
        if (typeof loadMenu === 'function') await loadMenu();
    } catch (e) {
        notifyUi('danger', 'Food', 'Gagal hapus: ' + e.message);
    }
}
window.deleteFoodById = deleteFoodById;

async function deleteFoodFromList() {
    if (!currentFoodId) return;
    return deleteFoodById(currentFoodId);
}
window.deleteFoodFromList = deleteFoodFromList;

async function onSelectFoodV2() {
    const sel = document.getElementById('prod-food-select');
    const id = sel ? sel.value : '';
    currentFoodId = id;
    const editBtn = document.getElementById('btn-edit-food');
    const delBtn  = document.getElementById('btn-delete-food');
    if (editBtn) editBtn.style.display = id ? '' : 'none';
    if (delBtn)  delBtn.style.display  = id ? '' : 'none';
    _syncLibraryFoodTableSelection();
    const tbody = document.getElementById('prod-menus-rows');
    if (!tbody) return;

    if (!id) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Pilih Food di dropdown workspace, atau klik <b>Kelola</b> pada Library Food di bawah.</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Loading menus...</td></tr>`;
    try {
        const [foodMenus, recipesArr, workflowsArr] = await Promise.all([
            api(`/api/foods/${id}/menus`).catch(() => []),
            api('/api/recipes').catch(() => []),
            api('/api/workflows').catch(() => [])
        ]);

        if (!foodMenus.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Belum ada menu di Food ini. Klik <b>Tautkan Menu</b> di sini, atau <b>Buat Menu Baru (Inline)</b> pada kartu Library Menu di bawah.</td></tr>`;
            _syncLibraryFoodTableSelection();
            return;
        }

        const recipeById   = new Map((recipesArr   || []).map(r => [String(r.id), r]));
        const workflowById = new Map((workflowsArr || []).map(w => [String(w.id), w]));

        tbody.innerHTML = foodMenus.map(m => {
            const recipe = m.recipe_id ? recipeById.get(String(m.recipe_id)) : null;
            const workflow = m.workflow_recipe_id ? workflowById.get(String(m.workflow_recipe_id))
                           : (m.workflow_id ? workflowById.get(String(m.workflow_id)) : null);
            const recipeCell = m.recipe_id
                ? (recipe
                    ? `<span>${escapeHtmlMenu(recipe.name)}</span>`
                    : `<span class="text-xs" style="color:#f59e0b" title="Resep hilang dari library"><i class="fas fa-exclamation-triangle"></i> resep hilang</span>`)
                : `<span class="text-muted text-xs">— belum pilih —</span>`;
            const workflowCell = workflow
                ? `<span>${escapeHtmlMenu(workflow.name)}</span>`
                : `<span class="text-muted text-xs">—</span>`;
            return `<tr>
                <td><b>${escapeHtmlMenu(m.name || '-')}</b></td>
                <td>${recipeCell}</td>
                <td>${workflowCell}</td>
                <td class="flex gap-2 flex-wrap">
                    <button class="btn btn-secondary btn-sm" onclick="openMenuEdit('${m.id}')"><i class="fas fa-pen"></i> Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="unlinkMenuFromFood('${m.id}')" title="Lepas tautan dari Food ini (menu tetap di library)"><i class="fas fa-unlink"></i> Lepas</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMenu('${m.id}')" title="Hapus menu ini dari library (dan semua food)"><i class="fas fa-trash"></i> Hapus</button>
                </td>
            </tr>`;
        }).join('');
        _syncLibraryFoodTableSelection();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Error: ${escapeHtmlMenu(e.message || String(e))}</td></tr>`;
        _syncLibraryFoodTableSelection();
    }
}

function selectFoodForWorkspace(foodId) {
    if (!foodId) return;
    const sel = document.getElementById('prod-food-select');
    if (!sel) return;
    const exists = (Array.isArray(currentFoodList) ? currentFoodList : []).some(f => String(f.id) === String(foodId));
    if (!exists) {
        notifyUi('warning', 'Food', 'Food tidak ada di daftar. Muat ulang halaman.');
        return;
    }
    sel.value = String(foodId);
    currentFoodId = String(foodId);
    void onSelectFoodV2();
    _syncLibraryFoodTableSelection();
    const card = document.getElementById('food-workspace-card');
    if (card && typeof card.scrollIntoView === 'function') {
        try {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {
            card.scrollIntoView(true);
        }
    }
}
window.selectFoodForWorkspace = selectFoodForWorkspace;

async function refreshFoodAndMenuLibraries() {
    try {
        await loadFoodsV2();
        if (typeof loadMenu === 'function') await loadMenu();
    } catch (e) {
        notifyUi('danger', 'Food & Menu', e.message || String(e));
    }
}
window.refreshFoodAndMenuLibraries = refreshFoodAndMenuLibraries;
window.filterLibraryFoodTable = filterLibraryFoodTable;
window.filterLibraryMenuTable = filterLibraryMenuTable;

async function unlinkMenuFromFood(menuId) {
    if (!currentFoodId) return notifyUi('warning', 'Food', 'Pilih Food terlebih dahulu');
    const ok = await confirmUi({
        title: 'Lepas Menu dari Food',
        message: 'Menu akan dilepas dari Food ini tapi tetap tersimpan di Library. Lanjutkan?',
        confirmLabel: 'Lepas',
        cancelLabel: 'Batal',
        danger: true
    });
    if (!ok) return;
    try {
        await api(`/api/foods/${currentFoodId}/menus/${menuId}`, 'DELETE');
        notifyUi('success', 'Food', 'Menu dilepas dari Food');
        await onSelectFoodV2();
        if (typeof loadMenu === 'function') await loadMenu();
    } catch (e) {
        notifyUi('danger', 'Food', 'Gagal lepas: ' + (e.message || 'Error'));
    }
}
window.unlinkMenuFromFood = unlinkMenuFromFood;

async function openCreateMenuInline() {
    if (!currentFoodId) {
        return notifyUi('warning', 'Menu', 'Pilih Food di workspace (bagian atas) terlebih dahulu — lalu buka lagi Buat Menu Baru (Inline) di Library Menu.');
    }
    window._inlineMenuTargetFoodId = currentFoodId;
    await openMenuForm(null);
}
window.openCreateMenuInline = openCreateMenuInline;

if (typeof window.openProductionHelp !== 'function') {
    window.openProductionHelp = function () {
        const panel = document.getElementById('production-help-panel');
        if (!panel) return;
        panel.classList.toggle('hidden');
    };
}

// ============================================================================
// FINAL PACKAGING STACK EDITOR (per Food)
// ----------------------------------------------------------------------------
// Stack = array layer [{ material, material_type, quantity, unit, units_per_hour }].
// Legacy API rows may still have duration_minutes (menit/batch) until disimpan ulang.
// Scheduler: menit untuk batch = (porsi_batch / units_per_hour) * 60  jika units_per_hour > 0.
// ============================================================================
window._foodPackStack = [];

function getFoodPackStackMountEl() {
    return document.querySelector('#sidebar-body #food-pack-stack');
}

/** Input type=date → ISO; aman jika kosong / invalid (tidak throw). */
function dateInputToIsoOrNull(dateStr) {
    const s = String(dateStr || '').trim();
    if (!s) return null;
    const d = new Date(s + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    try {
        return d.toISOString();
    } catch (e) {
        return null;
    }
}

const FOOD_PACK_MATERIALS = [
    { value: 'Ompreng',         hint: 'Wadah plastik bersekat (standar MBG)' },
    { value: 'Sterefoam',       hint: 'Styrofoam box' },
    { value: 'Spunbound',       hint: 'Tas spunbond / kain non-woven' },
    { value: 'Plastik Oval',    hint: 'Plastik oval/oblong' },
    { value: 'Paperbag',        hint: 'Tas kertas' },
    { value: 'Mika',            hint: 'Wadah mika bening' },
    { value: 'Plastik Wrap',    hint: 'Plastic wrap (seal)' },
    { value: 'Label / Stiker',  hint: 'Label identitas' },
    { value: 'Lainnya',         hint: 'Material lain' }
];

function renderFoodPackStackUi() {
    const box = getFoodPackStackMountEl();
    if (!box) return;
    const stack = window._foodPackStack || [];
    if (!stack.length) {
        box.innerHTML = `<div class="text-center text-muted text-xs py-6 border border-dashed rounded">
            Belum ada layer. Tambah minimal 1 wadah final (mis. <b>Ompreng</b>).
        </div>`;
        return;
    }
    box.innerHTML = stack.map((l, i) => {
        const isCustom = !FOOD_PACK_MATERIALS.find(x => x.value === l.material);
        const uphNum = Number(l.units_per_hour);
        const uphDisplay = (Number.isFinite(uphNum) && uphNum > 0) ? uphNum : '';
        const legacyDur = Number(l.duration_minutes);
        const legacyHint = (!uphDisplay && Number.isFinite(legacyDur) && legacyDur > 0)
            ? `<div class="text-[10px] text-amber-700 mt-0.5 leading-tight">Data lama: ${legacyDur} menit/batch. Isi kecepatan di atas untuk mengganti.</div>`
            : '';
        return `
        <div class="flex items-start gap-2 p-2 border rounded bg-white">
            <div class="flex flex-col items-center pt-5 shrink-0">
                <span class="badge badge-primary text-xs">${i + 1}</span>
                <span class="text-[10px] text-muted mt-0.5">Urutan</span>
            </div>
            <div class="flex-1 grid grid-cols-12 gap-2">
                <div class="col-span-4">
                    <label class="input-label text-xs">Material</label>
                    <select class="input-field input-field-sm" data-fpi="${i}" data-fpk="material_sel">
                        ${FOOD_PACK_MATERIALS.map(m => `<option value="${m.value}" ${m.value === l.material || (isCustom && m.value === 'Lainnya') ? 'selected' : ''}>${m.value}</option>`).join('')}
                    </select>
                    <div class="food-pack-custom-wrap mt-1 ${isCustom ? '' : 'hidden'}" data-fpi="${i}">
                        <label class="input-label text-xs">Nama kustom</label>
                        <input type="text" class="input-field input-field-sm" data-fpi="${i}" data-fpk="material_custom" placeholder="Contoh: ompreng khusus" value="${isCustom ? escapeAttrMenu(l.material) : ''}"/>
                    </div>
                </div>
                <div class="col-span-2">
                    <label class="input-label text-xs">Jumlah</label>
                    <input type="number" step="0.1" min="0" class="input-field input-field-sm" data-fpi="${i}" data-fpk="quantity" value="${l.quantity || 1}" placeholder="1"/>
                </div>
                <div class="col-span-2">
                    <label class="input-label text-xs">Satuan</label>
                    <input type="text" class="input-field input-field-sm" data-fpi="${i}" data-fpk="unit" value="${escapeAttrMenu(l.unit || 'pcs')}" placeholder="pcs"/>
                </div>
                <div class="col-span-3">
                    <label class="input-label text-xs">Kecepatan (unit/jam)</label>
                    <input type="number" step="1" min="0" class="input-field input-field-sm" data-fpi="${i}" data-fpk="units_per_hour" value="${uphDisplay}" placeholder="400"/>
                    ${legacyHint}
                </div>
                <div class="col-span-1 flex flex-col justify-end pt-5">
                    <div class="flex gap-1 justify-end flex-wrap">
                        <button type="button" class="btn btn-secondary btn-xs" title="Naik" onclick="moveFoodPackLayer(${i}, -1)" ${i === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="btn btn-secondary btn-xs" title="Turun" onclick="moveFoodPackLayer(${i}, 1)" ${i === stack.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="btn btn-danger btn-xs" title="Hapus layer" onclick="removeFoodPackLayer(${i})"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    box.querySelectorAll('[data-fpi]').forEach(el => {
        el.addEventListener('input',  () => syncFoodPackLayerFromUi(el));
        el.addEventListener('change', () => syncFoodPackLayerFromUi(el));
    });
}

function syncFoodPackLayerFromUi(el) {
    const i = Number(el.getAttribute('data-fpi'));
    const k = el.getAttribute('data-fpk');
    const stack = window._foodPackStack || [];
    if (!stack[i]) return;
    if (k === 'material_sel') {
        const val = el.value;
        const mount = el.closest('#food-pack-stack') || getFoodPackStackMountEl();
        const customWrap = mount ? mount.querySelector(`.food-pack-custom-wrap[data-fpi="${i}"]`) : null;
        if (val === 'Lainnya') {
            stack[i].material = '';
            if (customWrap) customWrap.classList.remove('hidden');
        } else {
            stack[i].material = val;
            if (customWrap) customWrap.classList.add('hidden');
        }
        stack[i].material_type = stack[i].material;
    } else if (k === 'material_custom') {
        const mountMc = el.closest('#food-pack-stack') || getFoodPackStackMountEl();
        const wrapMc = mountMc ? mountMc.querySelector(`.food-pack-custom-wrap[data-fpi="${i}"]`) : null;
        if (wrapMc && wrapMc.classList.contains('hidden')) return;
        stack[i].material = el.value.trim();
        stack[i].material_type = stack[i].material;
    } else if (k === 'quantity' || k === 'units_per_hour') {
        stack[i][k] = Number(el.value) || 0;
        if (k === 'units_per_hour' && stack[i][k] > 0) delete stack[i].duration_minutes;
    } else {
        stack[i][k] = el.value;
    }
}

function addFoodPackLayer(preset) {
    window._foodPackStack = window._foodPackStack || [];
    const defaults = {
        material: preset || 'Ompreng',
        material_type: preset || 'Ompreng',
        quantity: 1, unit: 'pcs', units_per_hour: 400
    };
    window._foodPackStack.push(defaults);
    renderFoodPackStackUi();
}
window.addFoodPackLayer = addFoodPackLayer;

function removeFoodPackLayer(i) {
    if (!window._foodPackStack) return;
    window._foodPackStack.splice(i, 1);
    renderFoodPackStackUi();
}
window.removeFoodPackLayer = removeFoodPackLayer;

function moveFoodPackLayer(i, dir) {
    const stack = window._foodPackStack;
    if (!stack) return;
    const j = i + dir;
    if (j < 0 || j >= stack.length) return;
    [stack[i], stack[j]] = [stack[j], stack[i]];
    renderFoodPackStackUi();
}
window.moveFoodPackLayer = moveFoodPackLayer;

function getFoodPackStackFromUi() {
    // Sync all inputs first (hanya stack di panel sidebar aktif)
    const box = getFoodPackStackMountEl();
    if (box) box.querySelectorAll('[data-fpi]').forEach(el => syncFoodPackLayerFromUi(el));
    // Filter layer kosong
    return (window._foodPackStack || [])
        .map((l, idx) => ({ ...l, order: idx }))
        .filter(l => l.material && l.material.length > 0);
}

function buildFoodFormHtml(food, menuOpts, isEdit) {
    const dateVal = food && food.date_served
        ? (String(food.date_served).slice(0, 10))
        : new Date().toISOString().split('T')[0];
    return `
        <div class="form-grid">
            <div class="form-full">
                <label class="input-label">Nama Food (Paket) <span class="text-red-500">*</span></label>
                <input id="f_food_name" class="input-field" placeholder="Contoh: Paket Siang A" value="${escapeAttrMenu(food?.name || '')}"/>
            </div>
            <div>
                <label class="input-label">Tanggal Penyajian</label>
                <input id="f_food_date" type="date" class="input-field" value="${dateVal}" />
            </div>
            <div>
                <label class="input-label">Packaging Legacy (opsional)</label>
                <select id="f_food_pack" class="input-field">
                    <option value="">— kosong —</option>
                    <option value="ompreng"   ${food?.packaging_type === 'ompreng' ? 'selected' : ''}>Ompreng</option>
                    <option value="sterefoam" ${food?.packaging_type === 'sterefoam' ? 'selected' : ''}>Sterefoam</option>
                    <option value="plastik"   ${food?.packaging_type === 'plastik' ? 'selected' : ''}>Plastik</option>
                    <option value="paperbag"  ${food?.packaging_type === 'paperbag' ? 'selected' : ''}>Paperbag</option>
                </select>
                <div class="text-xs text-muted mt-1">Field lama. Yang utama: <b>Final Packaging Stack</b> di bawah.</div>
            </div>
        </div>

        <div class="mt-4 border-t pt-4">
            <div class="flex justify-between items-center mb-2">
                <div>
                    <div class="font-bold text-amber-700"><i class="fas fa-box"></i> Final Packaging Stack</div>
                    <div class="text-xs text-muted">
                        Semua menu di food ini akan digabung ke wadah-wadah berikut
                        <b>secara berurutan</b>. Contoh: (1) Ompreng → (2) Wrap Plastik → (3) Label.
                        Untuk tiap layer, <b>Kecepatan (unit/jam)</b> = berapa unit selesai per jam di step itu
                        (mis. 400 ompreng/jam). Jadwal memakai rumus: lama batch ≈ (porsi dalam batch ÷ kecepatan) × 60 menit.
                    </div>
                </div>
                <div class="flex gap-2">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="addFoodPackLayer('Ompreng')"><i class="fas fa-plus"></i> Layer</button>
                </div>
            </div>
            <div id="food-pack-stack" class="flex flex-col gap-2"></div>
        </div>

        ${!isEdit ? `
        <div class="mt-4 border-t pt-4">
            <label class="input-label">Daftar Menu (opsional, bisa ditambah nanti)</label>
            <select id="f_food_menus" class="input-field" multiple size="6" style="height: 120px;">
                ${menuOpts}
            </select>
            <div class="text-xs text-muted mt-1">Tahan Ctrl/Cmd untuk memilih banyak menu.</div>
        </div>` : ''}

        <div class="mbg-food-inline-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="typeof closeSidebarUi==='function'&&closeSidebarUi()">Batal</button>
            ${isEdit
                ? `<button type="button" class="btn btn-primary btn-sm" id="mbg-edit-food-save" data-food-id="${escapeAttrMenu(food?.id || '')}">Simpan</button>`
                : `<button type="button" class="btn btn-primary btn-sm" id="mbg-create-food-save">Simpan</button>`
            }
        </div>
    `;
}

async function mbgSubmitCreateFoodFromSidebar() {
    if (window.__mbgFoodSaving) return 'mbg:skip_already_saving';
    window.__mbgFoodSaving = true;
    try {
        setSidebarError('');
        const nameEl = document.getElementById('f_food_name');
        const dateEl = document.getElementById('f_food_date');
        const packLegacyEl = document.getElementById('f_food_pack');
        const packMount = getFoodPackStackMountEl();
        if (!nameEl || !dateEl || !packLegacyEl || !packMount) {
            const msg = 'Form food tidak terbaca (DOM). Tutup panel lalu klik Tambah Food lagi.';
            setSidebarError(msg);
            if (typeof notifyUi === 'function') notifyUi('warning', 'Food', msg);
            return 'mbg:fail_no_dom';
        }
        const name = nameEl.value.trim();
        const date_served = dateEl.value;
        const packaging_type = packLegacyEl.value || null;
        const menu_item_ids = Array.from(document.getElementById('f_food_menus')?.selectedOptions || []).map(o => o.value);
        const packaging_stack = getFoodPackStackFromUi();

        if (!name) {
            setSidebarError('Nama food wajib diisi');
            return 'mbg:fail_validation_name';
        }
        if (!packaging_stack.length) {
            setSidebarError('Tambahkan minimal 1 layer Final Packaging (mis. Ompreng).');
            return 'mbg:fail_validation_stack';
        }

        await api('/api/foods', 'POST', {
            name,
            date_served: dateInputToIsoOrNull(date_served),
            packaging_type,
            packaging_stack,
            menu_item_ids
        });

        notifyUi('success', 'Food', 'Food berhasil dibuat');
        closeSidebarUi();
        await loadFoodsV2();
        return 'mbg:ok_saved';
    } catch (e) {
        setSidebarError('Gagal buat food: ' + (e && e.message ? e.message : String(e)));
        if (typeof notifyUi === 'function') notifyUi('danger', 'Food', (e && e.message) || String(e));
        return 'mbg:fail_api';
    } finally {
        window.__mbgFoodSaving = false;
    }
}
window.mbgSubmitCreateFoodFromSidebar = mbgSubmitCreateFoodFromSidebar;

async function mbgSubmitEditFoodFromSidebar(foodId) {
    if (window.__mbgFoodSaving) return 'mbg:skip_already_saving';
    window.__mbgFoodSaving = true;
    const id = String(foodId || '').trim();
    if (!id) {
        window.__mbgFoodSaving = false;
        setSidebarError('Food id hilang. Tutup panel dan buka Edit lagi.');
        return 'mbg:fail_no_food_id';
    }
    try {
        setSidebarError('');
        const nameEl = document.getElementById('f_food_name');
        const dateEl = document.getElementById('f_food_date');
        const packLegacyEl = document.getElementById('f_food_pack');
        const packMount = getFoodPackStackMountEl();
        if (!nameEl || !dateEl || !packLegacyEl || !packMount) {
            const msg = 'Form food tidak terbaca (DOM). Tutup panel lalu buka Edit Food lagi.';
            setSidebarError(msg);
            if (typeof notifyUi === 'function') notifyUi('warning', 'Food', msg);
            return 'mbg:fail_no_dom';
        }
        const name = nameEl.value.trim();
        const date_served = dateEl.value;
        const packaging_type = packLegacyEl.value || null;
        const packaging_stack = getFoodPackStackFromUi();
        if (!name) {
            setSidebarError('Nama food wajib diisi');
            return 'mbg:fail_validation_name';
        }
        if (!packaging_stack.length) {
            setSidebarError('Minimal 1 layer final packaging wajib.');
            return 'mbg:fail_validation_stack';
        }

        await api(`/api/foods/${id}`, 'PUT', {
            name,
            date_served: dateInputToIsoOrNull(date_served),
            packaging_type,
            packaging_stack
        });

        notifyUi('success', 'Food', 'Food berhasil diupdate');
        closeSidebarUi();
        await loadFoodsV2();
        return 'mbg:ok_saved';
    } catch (e) {
        setSidebarError('Gagal update food: ' + (e && e.message ? e.message : String(e)));
        if (typeof notifyUi === 'function') notifyUi('danger', 'Food', (e && e.message) || String(e));
        return 'mbg:fail_api';
    } finally {
        window.__mbgFoodSaving = false;
    }
}
window.mbgSubmitEditFoodFromSidebar = mbgSubmitEditFoodFromSidebar;

async function openCreateFood() {
    window.__mbgFoodSaving = false;
    let allMenus = [];
    try { allMenus = await api('/api/menu'); } catch(e) {}
    const menuOpts = (allMenus || []).map(m => `<option value="${escapeAttrMenu(m.id)}">${escapeAttrMenu(m.name || '')}</option>`).join('');

    window._foodPackStack = [
        { material: 'Ompreng', material_type: 'Ompreng', quantity: 1, unit: 'pcs', units_per_hour: 400 }
    ];

    openSidebarUi({
        title: 'Tambah Food (Paket Makanan)',
        bodyHtml: buildFoodFormHtml(null, menuOpts, false),
        actions: []
    });
    renderFoodPackStackUi();
}
window.openCreateFood = openCreateFood;

async function openEditFood(foodId) {
    if (!foodId) return;
    window.__mbgFoodSaving = false;
    try {
        const food = await api(`/api/foods/${foodId}`);
        window._foodPackStack = Array.isArray(food.packaging_stack) && food.packaging_stack.length
            ? food.packaging_stack.map(l => ({ ...l }))
            : [];

        openSidebarUi({
            title: `Edit Food: ${food.name}`,
            bodyHtml: buildFoodFormHtml(food, '', true),
            actions: []
        });
        renderFoodPackStackUi();
    } catch (e) {
        notifyUi('danger', 'Food', 'Gagal memuat food: ' + e.message);
    }
}
window.openEditFood = openEditFood;

async function openCreateFoodMenu() {
    await openAddMenuToFood();
}

// Modify openMenuForm to handle window.tempFoodId if needed
// (This requires updating openMenuForm in the previous block or here if we override it)

async function openAddMenuToFood() {
    if (!currentFoodId) return notifyUi('warning', 'Food', 'Pilih Food terlebih dahulu');
    try {
        const allMenus = await api('/api/menu');
        let existing = [];
        try { existing = await api(`/api/foods/${currentFoodId}/menus`); } catch (e) { existing = []; }
        const existingIds = new Set((existing || []).map(m => String(m.id)));
        const available = (allMenus || []).filter(m => !existingIds.has(String(m.id)));
        const opts = available.map(m => `<option value="${escapeAttrMenu(m.id)}">${escapeAttrMenu(m.name || '')}</option>`).join('');

        openSidebarUi({
            title: 'Tambah Menu ke Food',
            bodyHtml: `
                <div class="form-grid">
                    <div class="form-full">
                        <label class="input-label">Pilih Menu (yang sudah tersimpan)</label>
                        <select id="f_add_menu_ids" class="input-field" multiple size="8" style="height: 160px;">
                            ${opts}
                        </select>
                        <div class="text-xs text-muted mt-1">Pilih satu atau lebih menu. Menu akan ditautkan ke Food yang sedang dipilih.</div>
                    </div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeSidebarUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setSidebarError('');
                        const menu_ids = Array.from(document.getElementById('f_add_menu_ids').selectedOptions || []).map(o => o.value);
                        if (!menu_ids.length) return setSidebarError('Pilih minimal 1 menu');
                        await api(`/api/foods/${currentFoodId}/menus`, 'POST', { menu_ids });
                        closeSidebarUi();
                        notifyUi('success', 'Food', 'Menu berhasil ditambahkan');
                        await onSelectFoodV2();
                        await loadMenu();
                    } catch (e) {
                        setSidebarError(e.message || 'Gagal menambahkan menu');
                    }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Food', 'Gagal memuat menu: ' + e.message);
    }
}

// Export or expose functions globally if needed
window.loadFoodsV2 = loadFoodsV2;
window.onSelectFoodV2 = onSelectFoodV2;
window.openCreateFood = openCreateFood;
window.openCreateFoodMenu = openCreateFoodMenu;
window.openAddMenuToFood = openAddMenuToFood;
window.deleteMenu = deleteMenu;

// =====================================================================
// NEW MODEL (Fase 5) — simplified openMenuForm: pick recipe + workflow + packaging main/extra
// OVERRIDES the old openMenuForm declaration above via function-hoist order.
// =====================================================================
async function openMenuForm(id) {
    try {
        const [recipesArr, workflowsArr, menusArr, foodsArr] = await Promise.all([
            api('/api/recipes').catch(() => []),
            api('/api/workflows').catch(() => []),
            api('/api/menu').catch(() => []),
            api('/api/foods').catch(() => [])
        ]);
        const existing = id ? (menusArr || []).find(x => x.id === id) : null;
        if (id && !existing) { notifyUi('warning', 'Menu', 'Menu tidak ditemukan'); return; }

        let packagingStack = { main: [], extra: [] };
        try {
            if (existing && existing.packaging_stack_json) {
                const parsed = typeof existing.packaging_stack_json === 'string' ? JSON.parse(existing.packaging_stack_json) : existing.packaging_stack_json;
                if (parsed && typeof parsed === 'object') {
                    packagingStack.main = Array.isArray(parsed.main) ? parsed.main : [];
                    packagingStack.extra = Array.isArray(parsed.extra) ? parsed.extra : [];
                }
            }
        } catch (e) { packagingStack = { main: [], extra: [] }; }

        window._menuEditor = {
            id,
            existing,
            recipesArr,
            workflowsArr,
            foodsArr,
            packaging: packagingStack
        };

        const recipeOpts = ['<option value="">— pilih resep —</option>'].concat(
            (recipesArr || []).map(r => `<option value="${r.id}" ${existing && existing.recipe_id === r.id ? 'selected' : ''}>${escapeHtmlMenu(r.name)}</option>`)
        ).join('');
        const workflowOpts = ['<option value="">(opsional — gunakan workflow default/legacy)</option>'].concat(
            (workflowsArr || []).map(w => `<option value="${w.id}" ${existing && existing.workflow_id === w.id ? 'selected' : ''}>${escapeHtmlMenu(w.name)}</option>`)
        ).join('');
        const prefillFoodId = (!id && window._inlineMenuTargetFoodId) ? String(window._inlineMenuTargetFoodId) : '';
        const foodOpts = ['<option value="">(belum diassign ke Food)</option>'].concat(
            (foodsArr || []).map(f => {
                const selected = (existing && existing.food_id === f.id) || (prefillFoodId && String(f.id) === prefillFoodId);
                return `<option value="${f.id}" ${selected ? 'selected' : ''}>${escapeHtmlMenu(f.name)}</option>`;
            })
        ).join('');

        // Deteksi resep yang dirujuk sudah dihapus dari library
        const orphanRecipe = existing && existing.recipe_id &&
            !(recipesArr || []).find(r => r.id === existing.recipe_id);
        const orphanWarning = orphanRecipe ? `
            <div class="mb-3 p-3 rounded border border-yellow-400/40 bg-yellow-900/20 flex gap-2 items-start" style="color:#fbbf24">
                <i class="fas fa-exclamation-triangle mt-1"></i>
                <div>
                    <div class="font-bold text-sm">Resep tidak ditemukan</div>
                    <div class="text-xs mt-1">Resep yang sebelumnya dipilih sudah dihapus dari Library Resep.
                    Silakan pilih resep pengganti agar menu ini bisa dipakai dalam perencanaan produksi.</div>
                </div>
            </div>` : '';

        openSidebarUi({
            title: id ? 'Edit Menu' : 'Tambah Menu Baru',
            bodyHtml: `
                ${orphanWarning}
                <div class="form-grid">
                    <div class="form-full">
                        <label class="input-label">Nama Menu <span class="text-red-500">*</span></label>
                        <input id="mf-name" class="input-field" value="${escapeAttrMenu((existing && existing.name) || '')}">
                    </div>
                    <div>
                        <label class="input-label">Resep (Library) <span class="text-red-500">*</span></label>
                        <select id="mf-recipe" class="input-field">${recipeOpts}</select>
                        <div class="text-xs text-muted mt-1">BOM/ingredients disumber dari resep yang dipilih.</div>
                    </div>
                    <div>
                        <label class="input-label">Workflow Pengolahan (Library)</label>
                        <select id="mf-workflow" class="input-field">${workflowOpts}</select>
                        <div class="text-xs text-muted mt-1">Step teknis pemrosesan. Kosongkan jika menu ini pakai step langsung di resep/legacy.</div>
                    </div>
                    <div>
                        <label class="input-label">Food (Paket)</label>
                        <select id="mf-food" class="input-field">${foodOpts}</select>
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded p-3 mt-4 text-xs text-blue-800">
                    <i class="fas fa-info-circle mr-1"></i>
                    <b>Catatan:</b> Ini adalah <b>PRE-PACKING per-menu</b> (opsional, umumnya tidak dipakai).
                    Kosongkan keduanya kalau menu langsung dimasukkan ke wadah final.
                    <b>Final packing (ompreng, sterefoam, spunbound, plastik oval, dll.) diset di menu Foods</b>,
                    bukan di sini.
                </div>

                <div class="mt-4">
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <div class="font-bold">Pre-Packing setelah Masak (opsional)</div>
                            <div class="text-xs text-muted">Bungkus menu setelah keluar dari masak (mis. nasi hangat dibungkus plastik kecil sebelum masuk ompreng).</div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="addMenuPackLayer('main')"><i class="fas fa-plus"></i> Tambah Layer</button>
                    </div>
                    <div id="mf-pack-main" class="flex flex-col gap-2"></div>
                </div>

                <div class="mt-4">
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <div class="font-bold">Pre-Packing Tanpa Masak (opsional)</div>
                            <div class="text-xs text-muted">Untuk menu yang tidak dimasak (mis. buah, kerupuk) — dibungkus langsung setelah prep.</div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="addMenuPackLayer('extra')"><i class="fas fa-plus"></i> Tambah Layer</button>
                    </div>
                    <div id="mf-pack-extra" class="flex flex-col gap-2"></div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary', onClick: () => closeSidebarUi() },
                { label: id ? 'Simpan Perubahan' : 'Simpan Menu', className: 'btn btn-primary', onClick: () => saveMenuFromNewForm() }
            ]
        });

        renderMenuPackLayers('main');
        renderMenuPackLayers('extra');
    } catch (e) {
        notifyUi('danger', 'Menu', 'Gagal membuka form: ' + (e.message || e));
    }
}

function renderMenuPackLayers(kind) {
    const box = document.getElementById('mf-pack-' + kind);
    if (!box) return;
    const ed = window._menuEditor;
    const layers = (ed && ed.packaging && ed.packaging[kind]) || [];
    if (!layers.length) { box.innerHTML = '<div class="text-muted text-sm italic">Belum ada layer.</div>'; return; }
    box.innerHTML = layers.map((l, idx) => `
        <div class="flex gap-2 items-center p-2 bg-white/5 rounded border border-white/10">
            <input class="input-field flex-1" placeholder="material (plastik, cup, box, dll)" value="${escapeAttrMenu(l.material || '')}" onchange="updateMenuPackLayer('${kind}', ${idx}, 'material', this.value)">
            <input type="number" class="input-field" style="width:90px" placeholder="Qty" value="${l.quantity || 1}" onchange="updateMenuPackLayer('${kind}', ${idx}, 'quantity', Number(this.value))">
            <select class="input-field" style="width:90px" onchange="updateMenuPackLayer('${kind}', ${idx}, 'unit', this.value)">
                <option value="pcs" ${l.unit === 'pcs' ? 'selected' : ''}>pcs</option>
                <option value="gram" ${l.unit === 'gram' ? 'selected' : ''}>gram</option>
            </select>
            <input type="number" class="input-field" style="width:110px" placeholder="Durasi (mnt)" value="${l.duration_minutes || 0}" onchange="updateMenuPackLayer('${kind}', ${idx}, 'duration_minutes', Number(this.value))">
            <button class="btn btn-danger btn-xs" onclick="removeMenuPackLayer('${kind}', ${idx})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

window.addMenuPackLayer = function(kind) {
    const ed = window._menuEditor;
    if (!ed) return;
    ed.packaging[kind].push({ material: '', quantity: 1, unit: 'pcs', duration_minutes: 0 });
    renderMenuPackLayers(kind);
};
window.updateMenuPackLayer = function(kind, idx, field, value) {
    const ed = window._menuEditor;
    if (!ed || !ed.packaging[kind][idx]) return;
    ed.packaging[kind][idx][field] = value;
};
window.removeMenuPackLayer = function(kind, idx) {
    const ed = window._menuEditor;
    if (!ed) return;
    ed.packaging[kind].splice(idx, 1);
    renderMenuPackLayers(kind);
};

window.saveMenuFromNewForm = async function() {
    const ed = window._menuEditor;
    if (!ed) return;
    const name = String(document.getElementById('mf-name').value || '').trim();
    if (!name) { setSidebarError && setSidebarError('Nama wajib'); return; }
    const recipeId = String(document.getElementById('mf-recipe').value || '');
    if (!recipeId) { setSidebarError && setSidebarError('Resep wajib dipilih'); return; }
    const workflowId = String(document.getElementById('mf-workflow').value || '') || null;
    const foodId = String(document.getElementById('mf-food').value || '') || null;
    const inlineTargetFoodId = (!ed.id && window._inlineMenuTargetFoodId) ? String(window._inlineMenuTargetFoodId) : '';
    const payload = {
        name,
        recipe_id: recipeId,
        workflow_id: workflowId,
        food_id: foodId,
        packaging_stack_json: ed.packaging
    };
    try {
        let savedMenuId = ed.id || null;
        if (ed.id) {
            await api('/api/menu/' + ed.id, 'PUT', payload);
            notifyUi('success', 'Menu', 'Berhasil diperbarui');
        } else {
            const created = await api('/api/menu', 'POST', payload);
            savedMenuId = (created && (created.id || created.menu_id)) || null;
            notifyUi('success', 'Menu', 'Berhasil dibuat');
        }

        // Inline mode: auto-link menu ke Food aktif (food_menu_items) bila belum terhubung via menu.food_id.
        if (!ed.id && inlineTargetFoodId && savedMenuId) {
            try {
                await api(`/api/foods/${inlineTargetFoodId}/menus`, 'POST', { menu_ids: [savedMenuId] });
            } catch (linkErr) {
                notifyUi('warning', 'Menu', 'Menu tersimpan, tapi gagal tautkan ke Food: ' + (linkErr.message || linkErr));
            }
        }

        window._inlineMenuTargetFoodId = null;
        closeSidebarUi && closeSidebarUi();
        if (typeof loadMenu === 'function') loadMenu();
        if (typeof loadFoodsV2 === 'function') loadFoodsV2();
        if (typeof onSelectFoodV2 === 'function') onSelectFoodV2();
    } catch (e) {
        setSidebarError && setSidebarError('Gagal: ' + (e.message || e));
    }
};

function escapeHtmlMenu(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttrMenu(s) { return escapeHtmlMenu(s); }

window.openMenuForm = openMenuForm;
window.openMenuCreate = openMenuCreate;
window.openMenuEdit = openMenuEdit;

/** Simpan food: tangkap pointer di document (fase capture). Pakai pointerdown + target Element/composedPath — click saja sering tidak terkirim (target teks / host / HMR). */
function mbgFoodFormSavePointerCapture(ev) {
    let n = ev.target;
    while (n && n.nodeType !== 1) n = n.parentNode;
    const el = n;
    const path = typeof ev.composedPath === 'function' ? ev.composedPath() : [];
    const byPath = (id) => {
        for (let i = 0; i < path.length; i++) {
            const x = path[i];
            if (x && x.nodeType === 1 && x.id === id) return x;
        }
        return null;
    };
    const createHit = byPath('mbg-create-food-save') || (el && el.closest ? el.closest('#mbg-create-food-save') : null);
    const createCanonical = document.getElementById('mbg-create-food-save');
    if (
        createHit &&
        createCanonical &&
        createHit === createCanonical &&
        createHit.closest('#sidebar-body')
    ) {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof mbgSubmitCreateFoodFromSidebar === 'function') void mbgSubmitCreateFoodFromSidebar();
        return;
    }
    const editHit = byPath('mbg-edit-food-save') || (el && el.closest ? el.closest('#mbg-edit-food-save') : null);
    const editCanonical = document.getElementById('mbg-edit-food-save');
    if (
        editHit &&
        editCanonical &&
        editHit === editCanonical &&
        editHit.closest('#sidebar-body')
    ) {
        ev.preventDefault();
        ev.stopPropagation();
        const fid = editHit.getAttribute('data-food-id') || '';
        if (typeof mbgSubmitEditFoodFromSidebar === 'function') void mbgSubmitEditFoodFromSidebar(fid);
    }
}
(function mbgBindFoodFormSaveCapture() {
    const prev = window.__mbgFoodFormSaveCaptureFn;
    if (typeof prev === 'function') {
        try {
            document.removeEventListener('pointerdown', prev, true);
            document.removeEventListener('click', prev, true);
        } catch (e) {}
    }
    window.__mbgFoodFormSaveCaptureFn = mbgFoodFormSavePointerCapture;
    document.addEventListener('pointerdown', mbgFoodFormSavePointerCapture, true);
    document.addEventListener('click', mbgFoodFormSavePointerCapture, true);
})();

// Initial load
// document.addEventListener('DOMContentLoaded', loadFoodsV2); // Already called in app.js setupUI usually?


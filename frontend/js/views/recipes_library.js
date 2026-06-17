/**
 * Library Resep — standalone CRUD.
 * Menu & workflow di-pisah: resep hanya BOM + alat.
 */

async function loadRecipesLibrary() {
    const body = document.getElementById('recipes-library-body');
    if (!body) return;
    body.innerHTML = '<div class="card p-4 text-muted">Memuat resep...</div>';
    try {
        const rows = await api('/api/recipes');
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
            body.innerHTML = `
                <div class="card p-6 text-center">
                    <div class="text-muted mb-3">Belum ada resep.</div>
                    <button class="btn btn-primary" onclick="openRecipeEditor(null)"><i class="fas fa-plus"></i> Tambah Resep Pertama</button>
                </div>`;
            return;
        }
        body.innerHTML = `
            <div class="card overflow-hidden">
                <table class="nutri-table w-full">
                    <thead>
                        <tr>
                            <th>Nama Resep</th>
                            <th>Ingredient</th>
                            <th>Cooking Time</th>
                            <th>Batch Cap</th>
                            <th>Portion</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map(r => {
                            const ingCount = Array.isArray(r.ingredients) ? r.ingredients.length : 0;
                            return `
                                <tr>
                                    <td class="font-bold">${escapeHtml(r.name || '')}</td>
                                    <td>${ingCount} bahan</td>
                                    <td>${r.cooking_time || 0} mnt</td>
                                    <td>${r.batch_capacity || 0}</td>
                                    <td>${r.portion_size || 1}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-xs" onclick="openRecipeEditor('${r.id}')"><i class="fas fa-edit"></i></button>
                                        <button class="btn btn-danger btn-xs" onclick="deleteRecipe('${r.id}', '${escapeHtml(r.name || '')}')"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        body.innerHTML = `<div class="card p-4 text-danger">Gagal load: ${escapeHtml(e.message || String(e))}</div>`;
    }
}
window.loadRecipesLibrary = loadRecipesLibrary;

async function openRecipeEditor(recipeId) {
    const isEdit = !!recipeId;
    let data = { name: '', instructions: '', ingredients: [], tools: [], cooking_time: 60, batch_capacity: 50, portion_size: 1 };
    if (isEdit) {
        try { data = await api('/api/recipes/' + recipeId); } catch (e) { notifyUi('danger', 'Error', e.message || String(e)); return; }
    }
    const ings = await safeList('/api/ingredients');
    const tools = await safeList('/api/kitchen/equipment').catch(() => []);
    const initIngs = Array.isArray(data.ingredients) ? data.ingredients.map(i => ({ ...i })) : [];
    // Saat tambah resep baru, sediakan 1 baris bahan kosong agar langsung bisa diisi
    if (!isEdit && initIngs.length === 0) initIngs.push({ ingredient_id: '', qty_per_portion: 0, unit: 'gram' });
    window._recipeEditor = {
        id: recipeId,
        data,
        allIngredients: ings,
        allTools: tools,
        tempIngs: initIngs,
        tempTools: Array.isArray(data.tools) ? data.tools.map(t => ({ ...t })) : []
    };

    openModalUi({
        title: isEdit ? 'Edit Resep' : 'Tambah Resep',
        width: '90%',
        bodyHtml: `
            <div class="form-grid">
                <div>
                    <label class="input-label">Nama Resep *</label>
                    <input id="re-name" class="input-field" value="${escapeAttr(data.name || '')}">
                </div>
                <div>
                    <label class="input-label">Cooking Time (menit)</label>
                    <input id="re-cooking-time" type="number" class="input-field" value="${data.cooking_time || 60}">
                </div>
                <div>
                    <label class="input-label">Batch Capacity (porsi/batch)</label>
                    <input id="re-batch-cap" type="number" class="input-field" value="${data.batch_capacity || 50}">
                </div>
                <div>
                    <label class="input-label">Portion Size</label>
                    <input id="re-portion" type="number" class="input-field" value="${data.portion_size || 1}">
                </div>
                <div class="form-full">
                    <label class="input-label">Instruksi / Deskripsi</label>
                    <textarea id="re-instructions" class="input-field" rows="2">${escapeHtml(data.instructions || '')}</textarea>
                </div>
            </div>

            <div class="mt-4">
                <div class="flex justify-between items-center mb-2">
                    <div class="font-bold">Bill of Materials (Ingredients)</div>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary btn-sm" onclick="recipeToggleQuickIng()" title="Buat bahan baru langsung di sini">
                            <i class="fas fa-seedling"></i> Bahan Baru
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="addRecipeIngRow()">
                            <i class="fas fa-plus"></i> Tambah Bahan
                        </button>
                    </div>
                </div>

                <!-- Inline quick-add ingredient form -->
                <div id="re-quick-ing" style="display:none" class="mb-3 p-3 rounded border border-blue-400/30 bg-blue-900/10">
                    <div class="text-sm font-bold mb-2" style="color:var(--color-accent,#60a5fa)">
                        <i class="fas fa-seedling"></i> Tambah Bahan Baru ke Master
                    </div>
                    <div class="flex gap-2 flex-wrap items-end">
                        <div style="flex:2;min-width:140px">
                            <label class="input-label" style="font-size:11px">Nama Bahan *</label>
                            <input id="re-qi-name" class="input-field" placeholder="cth: Beras, Gula Pasir…">
                        </div>
                        <div style="flex:1;min-width:90px">
                            <label class="input-label" style="font-size:11px">Satuan</label>
                            <select id="re-qi-unit" class="input-field">
                                <option value="gram">gram</option>
                                <option value="pcs">pcs</option>
                            </select>
                        </div>
                        <div style="flex:1;min-width:110px">
                            <label class="input-label" style="font-size:11px">Harga Est. (Rp/kg)</label>
                            <input id="re-qi-price" type="number" class="input-field" placeholder="opsional" min="0">
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-primary btn-sm" onclick="recipeQuickAddIng()">
                                <i class="fas fa-check"></i> Simpan & Pakai
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="recipeToggleQuickIng()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div id="re-qi-error" class="text-danger text-sm mt-1" style="display:none"></div>
                </div>

                <div id="re-ings-list" class="flex flex-col gap-2"></div>
            </div>

            <div class="mt-4">
                <div class="flex justify-between items-center mb-2">
                    <div class="font-bold">Alat Masak (opsional - untuk referensi)</div>
                    <button class="btn btn-secondary btn-sm" onclick="addRecipeToolRow()"><i class="fas fa-plus"></i> Tambah Alat</button>
                </div>
                <div id="re-tools-list" class="flex flex-col gap-2"></div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary', onClick: () => closeModalUi() },
            { label: isEdit ? 'Simpan Perubahan' : 'Simpan Resep', className: 'btn btn-primary', onClick: () => saveRecipeFromEditor() }
        ]
    });
    renderRecipeIngs();
    renderRecipeTools();
}
window.openRecipeEditor = openRecipeEditor;

function renderRecipeIngs() {
    const box = document.getElementById('re-ings-list');
    if (!box) return;
    const ed = window._recipeEditor || {};
    const ings = ed.tempIngs || [];
    const master = ed.allIngredients || [];
    if (!ings.length) {
        box.innerHTML = '<div class="text-muted text-sm italic">Belum ada bahan.</div>';
        return;
    }
    box.innerHTML = ings.map((ing, idx) => {
        const opts = master.map(m => `<option value="${m.id}" ${m.id === ing.ingredient_id ? 'selected' : ''}>${escapeHtml(m.name || '')}</option>`).join('');
        return `
            <div class="flex gap-2 items-center p-2 bg-white/5 rounded border border-white/10">
                <select class="input-field flex-1" onchange="updateRecipeIng(${idx}, 'ingredient_id', this.value)">
                    <option value="">— pilih bahan —</option>
                    ${opts}
                </select>
                <input type="number" class="input-field" style="width:100px" placeholder="Qty/porsi" value="${ing.qty_per_portion || 0}" onchange="updateRecipeIng(${idx}, 'qty_per_portion', this.value)" step="0.01">
                <select class="input-field" style="width:90px" onchange="updateRecipeIng(${idx}, 'unit', this.value)">
                    <option value="gram" ${ing.unit === 'gram' ? 'selected' : ''}>gram</option>
                    <option value="pcs" ${ing.unit === 'pcs' ? 'selected' : ''}>pcs</option>
                </select>
                <button class="btn btn-danger btn-xs" onclick="removeRecipeIng(${idx})"><i class="fas fa-times"></i></button>
            </div>
        `;
    }).join('');
}

function renderRecipeTools() {
    const box = document.getElementById('re-tools-list');
    if (!box) return;
    const ed = window._recipeEditor || {};
    const tools = ed.tempTools || [];
    const master = ed.allTools || [];
    if (!tools.length) {
        box.innerHTML = '<div class="text-muted text-sm italic">Belum ada alat.</div>';
        return;
    }
    box.innerHTML = tools.map((tl, idx) => {
        const opts = master.map(m => `<option value="${m.id}" ${m.id === tl.tool_id ? 'selected' : ''}>${escapeHtml(m.name || '')}</option>`).join('');
        return `
            <div class="flex gap-2 items-center p-2 bg-white/5 rounded border border-white/10">
                <select class="input-field flex-1" onchange="updateRecipeTool(${idx}, 'tool_id', this.value)">
                    <option value="">— pilih alat —</option>
                    ${opts}
                </select>
                <input type="number" class="input-field" style="width:110px" placeholder="Batch cap" value="${tl.batch_capacity || 0}" onchange="updateRecipeTool(${idx}, 'batch_capacity', this.value)">
                <input type="number" class="input-field" style="width:110px" placeholder="Durasi (mnt)" value="${tl.batch_duration_minutes || 0}" onchange="updateRecipeTool(${idx}, 'batch_duration_minutes', this.value)">
                <button class="btn btn-danger btn-xs" onclick="removeRecipeTool(${idx})"><i class="fas fa-times"></i></button>
            </div>
        `;
    }).join('');
}

window.addRecipeIngRow = function() {
    const ed = window._recipeEditor;
    if (!ed) return;
    ed.tempIngs.push({ ingredient_id: '', qty_per_portion: 0, unit: 'gram' });
    renderRecipeIngs();
};
window.updateRecipeIng = function(idx, field, value) {
    const ed = window._recipeEditor;
    if (!ed || !ed.tempIngs[idx]) return;
    if (field === 'qty_per_portion' || field === 'batch_capacity') value = Number(value);
    ed.tempIngs[idx][field] = value;
};
window.removeRecipeIng = function(idx) {
    const ed = window._recipeEditor;
    if (!ed) return;
    ed.tempIngs.splice(idx, 1);
    renderRecipeIngs();
};
window.addRecipeToolRow = function() {
    const ed = window._recipeEditor;
    if (!ed) return;
    ed.tempTools.push({ tool_id: '', batch_capacity: 0, batch_duration_minutes: 0 });
    renderRecipeTools();
};
window.updateRecipeTool = function(idx, field, value) {
    const ed = window._recipeEditor;
    if (!ed || !ed.tempTools[idx]) return;
    if (field === 'batch_capacity' || field === 'batch_duration_minutes') value = Number(value);
    ed.tempTools[idx][field] = value;
};
window.removeRecipeTool = function(idx) {
    const ed = window._recipeEditor;
    if (!ed) return;
    ed.tempTools.splice(idx, 1);
    renderRecipeTools();
};

window.saveRecipeFromEditor = async function() {
    const ed = window._recipeEditor;
    if (!ed) return;
    const name = String(document.getElementById('re-name').value || '').trim();
    if (!name) { setModalError && setModalError('Nama wajib'); return; }
    const payload = {
        name,
        instructions: String(document.getElementById('re-instructions').value || ''),
        cooking_time: Number(document.getElementById('re-cooking-time').value || 60),
        batch_capacity: Number(document.getElementById('re-batch-cap').value || 50),
        portion_size: Number(document.getElementById('re-portion').value || 1),
        ingredients: ed.tempIngs.filter(i => i.ingredient_id),
        tools: ed.tempTools.filter(t => t.tool_id)
    };
    try {
        if (ed.id) {
            await api('/api/recipes/' + ed.id, 'PUT', payload);
            notifyUi('success', 'Resep', 'Berhasil diperbarui');
        } else {
            await api('/api/recipes', 'POST', payload);
            notifyUi('success', 'Resep', 'Berhasil dibuat');
        }
        closeModalUi && closeModalUi();
        loadRecipesLibrary();
    } catch (e) {
        setModalError && setModalError('Gagal: ' + (e.message || e));
    }
};

/** Toggle panel quick-add bahan baru */
window.recipeToggleQuickIng = function() {
    const panel = document.getElementById('re-quick-ing');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : '';
    if (!isOpen) {
        const n = document.getElementById('re-qi-name');
        if (n) { n.value = ''; n.focus(); }
        const u = document.getElementById('re-qi-unit');
        if (u) u.value = 'gram';
        const p = document.getElementById('re-qi-price');
        if (p) p.value = '';
        const err = document.getElementById('re-qi-error');
        if (err) err.style.display = 'none';
    }
};

/** Simpan bahan baru ke server, masukkan ke allIngredients, tambah 1 row baru pre-selected */
window.recipeQuickAddIng = async function() {
    const nameEl  = document.getElementById('re-qi-name');
    const unitEl  = document.getElementById('re-qi-unit');
    const priceEl = document.getElementById('re-qi-price');
    const errEl   = document.getElementById('re-qi-error');

    const name  = String(nameEl?.value || '').trim();
    const unit  = unitEl?.value || 'gram';
    const price = priceEl?.value ? Number(priceEl.value) : null;

    if (!name) {
        if (errEl) { errEl.textContent = 'Nama bahan wajib diisi.'; errEl.style.display = ''; }
        nameEl?.focus();
        return;
    }

    const btn = document.querySelector('#re-quick-ing .btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const payload = { name, unit };
        if (price !== null && !isNaN(price)) payload.estimated_price = price;

        const created = await api('/api/ingredients', 'POST', payload);
        const newIng = { id: created.id || created.ingredient_id || payload.id, name, unit };

        // Masukkan ke master list editor agar semua select dropdown terupdate
        const ed = window._recipeEditor;
        if (ed) {
            ed.allIngredients.push(newIng);
            // Tambah 1 row baru langsung pre-select bahan yang baru dibuat
            ed.tempIngs.push({ ingredient_id: newIng.id, qty_per_portion: 0, unit });
            renderRecipeIngs();
        }

        // Tutup panel & reset
        window.recipeToggleQuickIng();
        notifyUi && notifyUi('success', 'Bahan', `"${name}" berhasil ditambahkan`);
    } catch (e) {
        const msg = e.message || String(e);
        if (errEl) { errEl.textContent = 'Gagal: ' + msg; errEl.style.display = ''; }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Simpan & Pakai'; }
    }
};

window.deleteRecipe = async function(id, name) {
    if (!confirm(`Hapus resep "${name}"?`)) return;
    try {
        await api('/api/recipes/' + id, 'DELETE');
        notifyUi('success', 'Resep', 'Berhasil dihapus');
        loadRecipesLibrary();
    } catch (e) {
        notifyUi('danger', 'Gagal', e.message || String(e));
    }
};

function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
async function safeList(path) {
    try { const r = await api(path); return Array.isArray(r) ? r : []; } catch (e) { return []; }
}

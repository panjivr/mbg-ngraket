
async function loadInventory() {
    const tbody = document.getElementById('inventory-rows');
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api('/api/inventory/items');
        const html = (rows || []).map(r => {
            const qty = Number(r.quantity || 0);
            const price = Number(r.estimated_price || 0);
            const val = qty * price;
            return `<tr>
                <td>${r.name || '-'}</td>
                <td class="font-mono">${qty.toFixed(2)}</td>
                <td>${r.unit || '-'}</td>
                <td>${formatRp(price)}</td>
                <td>${formatRp(val)}</td>
                <td class="flex gap-2">
                    <button class="btn btn-primary btn-sm" onclick="openInventoryAdjust('${r.ingredient_id}','${String(r.name || '').replace(/'/g, '')}','${String(r.unit || '').replace(/'/g, '')}',${qty})">Edit</button>
                    <button class="btn btn-secondary btn-sm" onclick="openInventoryHistory('${r.ingredient_id}','${String(r.name || '').replace(/'/g, '')}')">History</button>
                </td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="6" class="text-muted">Belum ada inventory</td></tr>`;
        const moveTbody = document.getElementById('inventory-movements-rows');
        if (moveTbody) {
            moveTbody.innerHTML = `<tr><td colspan="5" class="text-muted">Loading...</td></tr>`;
            const moves = await api('/api/inventory/movements/recent?limit=20');
            const moveHtml = (moves || []).map(m => {
                const delta = Number(m.delta || 0);
                const sign = delta > 0 ? '+' : '';
                return `<tr>
                    <td>${formatDateTime(m.at)}</td>
                    <td>${m.name || '-'}</td>
                    <td class="font-mono">${sign}${delta.toFixed(2)}</td>
                    <td class="font-mono">${Number(m.qty_after || 0).toFixed(2)}</td>
                    <td>${m.note || '-'}</td>
                </tr>`;
            }).join('');
            moveTbody.innerHTML = moveHtml || `<tr><td colspan="5" class="text-muted">Belum ada movements</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Gagal load inventory: ${e.message}</td></tr>`;
    }
}

async function openInventoryAdjust(ingredientId, name, unit, currentQty) {
    const modeId = 'inv_mode';
    const valId = 'inv_val';
    const noteId = 'inv_note';
    openModalUi({
        title: `Edit Stok: ${name || '-'}`,
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <div class="text-sm text-muted">Stok saat ini: <span class="font-mono">${Number(currentQty || 0).toFixed(2)} ${unit || ''}</span></div>
                </div>
                <div>
                    <label class="input-label">Mode</label>
                    <select id="${modeId}" class="input-field">
                        <option value="set">Set (Stock Opname)</option>
                        <option value="add">Tambah</option>
                        <option value="sub">Kurangi</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Nilai</label>
                    <input id="${valId}" class="input-field" type="number" step="0.01" value="${Number(currentQty || 0).toFixed(2)}" />
                </div>
                <div class="form-full">
                    <label class="input-label">Catatan</label>
                    <input id="${noteId}" class="input-field" placeholder="Contoh: stock opname, barang rusak, koreksi" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const mode = document.getElementById(modeId).value;
                    const value = Number(document.getElementById(valId).value || 0);
                    const note = document.getElementById(noteId).value || '';
                    await api('/api/inventory/adjust', 'POST', { ingredient_id: ingredientId, mode, value, note });
                    closeModalUi();
                    notifyUi('success', 'Inventory', 'Stok tersimpan');
                    await loadInventory();
                    await loadDashboard();
                } catch (e) {
                    setModalError(e.message || 'Gagal simpan');
                }
            } }
        ]
    });
}

async function openInventoryHistory(ingredientId, name) {
    try {
        const rows = await api(`/api/inventory/${encodeURIComponent(ingredientId)}/movements?limit=50`);
        const body = (rows || []).map(r => `
            <tr>
                <td class="text-sm">${formatDateTime(r.at)}</td>
                <td class="font-mono text-sm">${r.movement_type || '-'}</td>
                <td class="font-mono text-sm">${Number(r.qty_before || 0).toFixed(2)}</td>
                <td class="font-mono text-sm">${Number(r.qty_after || 0).toFixed(2)}</td>
                <td class="font-mono text-sm">${Number(r.delta || 0).toFixed(2)}</td>
                <td class="text-sm">${(r.note || '')}</td>
            </tr>
        `).join('');
        openModalUi({
            title: `History Stok: ${name || '-'}`,
            bodyHtml: `
                <div class="card" style="padding:12px; max-height:520px; overflow:auto;">
                    <table class="table">
                        <thead><tr><th>Waktu</th><th>Type</th><th>Before</th><th>After</th><th>Delta</th><th>Catatan</th></tr></thead>
                        <tbody>${body || `<tr><td colspan="6" class="text-muted">Belum ada history</td></tr>`}</tbody>
                    </table>
                </div>
            `,
            actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
        });
    } catch (e) {
        notifyUi('danger', 'Inventory', 'Gagal load history: ' + e.message);
    }
}

async function loadIngredients() {
    const tbody = document.getElementById('ingredients-rows');
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Loading...</td></tr>`;
    try {
        const rows = await api('/api/ingredients');
        const html = (rows || []).map(r => `<tr>
            <td>${r.name || '-'}</td>
            <td>${r.unit || '-'}</td>
            <td>${formatRp(r.estimated_price || 0)}</td>
            <td class="flex gap-2">
                <button class="btn btn-secondary btn-sm" onclick="openIngredientEdit('${r.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteIngredient('${r.id}')">Hapus</button>
            </td>
        </tr>`).join('');
        tbody.innerHTML = html || `<tr><td colspan="4" class="text-muted">Belum ada ingredient</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Gagal load ingredients: ${e.message}</td></tr>`;
    }
}

async function openIngredientCreate() {
    await openIngredientForm(null);
}

async function openIngredientEdit(id) {
    await openIngredientForm(id);
}

async function openIngredientForm(id) {
    try {
        const list = await api('/api/ingredients');
        const ing = id ? (list || []).find(x => x.id === id) : { name: '', unit: 'kg', estimated_price: 0 };
        if (id && !ing) return notifyUi('warning', 'Ingredients', 'Ingredient tidak ditemukan');

        const unit = ing.unit || 'kg';
        const price = Number(ing.estimated_price || 0);
        const initialQtyField = id ? '' : `
            <div>
                <label class="input-label">Initial Quantity</label>
                <input id="f_ing_initial_qty" class="input-field" type="number" step="0.01" min="0" value="0" />
            </div>
        `;

        openModalUi({
            title: id ? 'Edit Ingredient' : 'Tambah Ingredient',
            bodyHtml: `
                <div class="form-grid">
                    <div class="form-full">
                        <label class="input-label">Nama</label>
                        <input id="f_ing_name" class="input-field" value="${String(ing.name || '').replace(/"/g, '&quot;')}" placeholder="Contoh: Beras" />
                    </div>
                    <div>
                        <label class="input-label">Unit</label>
                        <select id="f_ing_unit" class="input-field">
                            <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                            <option value="liter" ${unit === 'liter' ? 'selected' : ''}>liter</option>
                            <option value="pcs" ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                        </select>
                    </div>
                    <div>
                        <label class="input-label">Harga Estimasi</label>
                        <input id="f_ing_price" class="input-field" type="number" step="1" min="0" value="${price}" />
                    </div>
                    ${initialQtyField}
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: id ? 'Simpan' : 'Tambah', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setModalError('');
                        const name = document.getElementById('f_ing_name').value.trim();
                        const unit = document.getElementById('f_ing_unit').value;
                        const estimated_price = Number(document.getElementById('f_ing_price').value || 0);
                        if (!name) return setModalError('Nama wajib diisi');
                        let initial_qty = 0;
                        if (!id) {
                            initial_qty = Number(document.getElementById('f_ing_initial_qty').value || 0);
                            if (!Number.isFinite(initial_qty)) return setModalError('Initial quantity harus angka');
                            if (initial_qty < 0) return setModalError('Quantity must be non-negative');
                        }
                        if (id) {
                            await api(`/api/ingredients/${id}`, 'PUT', { name, unit, estimated_price });
                        } else {
                            await api('/api/ingredients', 'POST', { name, unit, estimated_price, initial_qty });
                        }
                        closeModalUi();
                        notifyUi('success', 'Ingredients', 'Berhasil disimpan');
                        await loadIngredients();
                        await loadInventory();
                    } catch (e) {
                        setModalError(e.message || 'Gagal menyimpan');
                    }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Ingredients', 'Gagal membuka form: ' + e.message);
    }
}

async function deleteIngredient(id) {
    const ok = await confirmUi({ title: 'Hapus Ingredient', message: 'Hapus ingredient ini?', confirmLabel: 'Hapus', cancelLabel: 'Batal', danger: true });
    if (!ok) return;
    try {
        await api(`/api/ingredients/${id}`, 'DELETE');
        notifyUi('success', 'Ingredients', 'Berhasil dihapus');
        await loadIngredients();
        await loadInventory();
    } catch (e) {
        notifyUi('danger', 'Ingredients', 'Gagal hapus ingredient: ' + e.message);
    }
}

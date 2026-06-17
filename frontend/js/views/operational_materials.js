// ─── Operational Materials Management ───────────────────────────────────────

async function loadOperationalMaterials() {
    const container = document.getElementById('view-operational-materials');
    if (!container) return;

    container.innerHTML = `
        <div class="view-header">
            <div>
                <h2 class="view-title">${typeof t === 'function' ? t('nav.operational-materials', 'Bahan Operasional') : 'Bahan Operasional'}</h2>
                <p class="view-subtitle">Kelola bahan operasional (tali rafia, plastik extra, dll.) yang digunakan dalam produksi.</p>
            </div>
            <button class="btn btn-primary" onclick="openAddOpMaterial()"><i class="fas fa-plus mr-2"></i>Tambah Material</button>
        </div>
        <div id="op-materials-table-wrapper" class="card mt-4">
            <div class="text-center text-muted p-6"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat data...</div>
        </div>
    `;

    await refreshOpMaterialsTable();
}

async function refreshOpMaterialsTable() {
    const wrapper = document.getElementById('op-materials-table-wrapper');
    if (!wrapper) return;

    try {
        const items = await api('/api/procurement/operational-materials');
        if (!items || !items.length) {
            wrapper.innerHTML = `
                <div class="text-center p-8 text-muted">
                    <i class="fas fa-boxes fa-3x mb-4 opacity-30"></i>
                    <p>Belum ada bahan operasional.</p>
                    <p class="text-xs mt-2">Klik "Tambah Material" untuk menambahkan item seperti plastik, tali rafia, stiker, dll.</p>
                </div>`;
            return;
        }

        const rows = items.map((m, i) => `
            <tr>
                <td>${i + 1}</td>
                <td class="font-bold">${m.name}</td>
                <td>${m.unit}</td>
                <td class="font-mono">${Number(m.qty_per_portion || 0).toFixed(4)}</td>
                <td class="font-mono">${formatRp(m.estimated_price)}</td>
                <td class="flex gap-1">
                    <button class="btn btn-secondary btn-xs" onclick="openEditOpMaterial('${m.id}', '${m.name.replace(/'/g, "\\'")}', '${m.unit}', ${m.qty_per_portion}, ${m.estimated_price})"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="deleteOpMaterial('${m.id}', '${m.name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        wrapper.innerHTML = `
            <div class="table-responsive">
                <table class="nutri-table w-full">
                    <thead>
                        <tr>
                            <th style="width:40px;">#</th>
                            <th>Nama Material</th>
                            <th>Satuan</th>
                            <th>Qty / Porsi</th>
                            <th>Estimasi Harga</th>
                            <th style="width:100px;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="text-xs text-muted mt-3 p-2" style="border-left: 3px solid var(--border);">
                <i class="fas fa-info-circle mr-1"></i>
                <strong>Qty / Porsi</strong> menentukan berapa banyak material ini dibutuhkan per porsi saat kalkulasi material di War Room.
                <strong>Estimasi Harga</strong> digunakan sebagai default saat sumber harga "Database Tenant" dipilih.
            </div>
        `;
    } catch (e) {
        wrapper.innerHTML = `<div class="text-danger p-4">Gagal memuat data: ${e.message}</div>`;
    }
}

function openAddOpMaterial() {
    openModalUi({
        title: 'Tambah Bahan Operasional',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Nama Material</label>
                    <input id="opm_name" class="input-field" placeholder="Contoh: Tali Rafia, Plastik Wrap, Stiker">
                </div>
                <div>
                    <label class="input-label">Satuan</label>
                    <select id="opm_unit" class="input-field">
                        <option value="pcs">pcs</option>
                        <option value="meter">meter</option>
                        <option value="roll">roll</option>
                        <option value="lembar">lembar</option>
                        <option value="kg">kg</option>
                        <option value="liter">liter</option>
                        <option value="pack">pack</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Qty per Porsi</label>
                    <input id="opm_qty" class="input-field" type="number" step="0.0001" min="0" value="1" placeholder="0.5">
                    <div class="text-xs text-muted mt-1">Berapa unit per porsi produksi</div>
                </div>
                <div>
                    <label class="input-label">Estimasi Harga (Rp)</label>
                    <input id="opm_price" class="input-field" type="number" step="1" min="0" value="0" placeholder="0">
                    <div class="text-xs text-muted mt-1">Harga per unit</div>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const name = document.getElementById('opm_name').value.trim();
                    const unit = document.getElementById('opm_unit').value;
                    const qty_per_portion = parseFloat(document.getElementById('opm_qty').value) || 0;
                    const estimated_price = parseFloat(document.getElementById('opm_price').value) || 0;
                    if (!name) return setModalError('Nama material wajib diisi');

                    await api('/api/procurement/operational-materials', 'POST', { name, unit, qty_per_portion, estimated_price });
                    closeModalUi();
                    notifyUi('success', 'Bahan Operasional', `${name} berhasil ditambahkan`);
                    await refreshOpMaterialsTable();
                } catch (e) { setModalError(e.message || 'Gagal menyimpan'); }
            } }
        ]
    });
}

function openEditOpMaterial(id, name, unit, qtyPerPortion, estimatedPrice) {
    openModalUi({
        title: `Edit: ${name}`,
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Nama Material</label>
                    <input id="opm_e_name" class="input-field" value="${name}">
                </div>
                <div>
                    <label class="input-label">Satuan</label>
                    <select id="opm_e_unit" class="input-field">
                        ${['pcs','meter','roll','lembar','kg','liter','pack'].map(u => `<option value="${u}" ${u === unit ? 'selected' : ''}>${u}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="input-label">Qty per Porsi</label>
                    <input id="opm_e_qty" class="input-field" type="number" step="0.0001" min="0" value="${qtyPerPortion}">
                </div>
                <div>
                    <label class="input-label">Estimasi Harga (Rp)</label>
                    <input id="opm_e_price" class="input-field" type="number" step="1" min="0" value="${estimatedPrice}">
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                try {
                    setModalError('');
                    const n = document.getElementById('opm_e_name').value.trim();
                    const u = document.getElementById('opm_e_unit').value;
                    const q = parseFloat(document.getElementById('opm_e_qty').value) || 0;
                    const p = parseFloat(document.getElementById('opm_e_price').value) || 0;
                    if (!n) return setModalError('Nama material wajib diisi');

                    await api(`/api/procurement/operational-materials/${id}`, 'PUT', { name: n, unit: u, qty_per_portion: q, estimated_price: p });
                    closeModalUi();
                    notifyUi('success', 'Bahan Operasional', `${n} berhasil diupdate`);
                    await refreshOpMaterialsTable();
                } catch (e) { setModalError(e.message || 'Gagal menyimpan'); }
            } }
        ]
    });
}

async function deleteOpMaterial(id, name) {
    const ok = await confirmUi({ title: 'Hapus Material', message: `Hapus "${name}" dari daftar bahan operasional?`, confirmLabel: 'Hapus', cancelLabel: 'Batal', danger: true });
    if (!ok) return;

    try {
        await api(`/api/procurement/operational-materials/${id}`, 'DELETE');
        notifyUi('success', 'Bahan Operasional', `${name} berhasil dihapus`);
        await refreshOpMaterialsTable();
    } catch (e) {
        notifyUi('danger', 'Bahan Operasional', 'Gagal menghapus: ' + e.message);
    }
}

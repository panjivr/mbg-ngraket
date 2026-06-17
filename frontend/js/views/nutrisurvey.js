
const NUTRI = {
    inited: false,
    status: null,
    nutrients: [],
    nutrientByCode: new Map(),
    targetSets: [],
    menus: [],
    currentMenu: null,
    currentCalc: null,
    diaryDay: null,
    diaryEntries: [],
    diaryCalc: null,
    diaryDirty: false
};

const NUTRI_MAINTENANCE = true;

function nutriSetMaintenanceMode(on) {
    const maint = document.getElementById('nutri-maintenance');
    const live = document.getElementById('nutri-live');
    if (maint) maint.classList.toggle('hidden', !on);
    if (live) live.classList.toggle('hidden', !!on);
}

function nutriDefaultCodes() {
    const pickFirstByCode = (codes) => {
        for (const c of (codes || [])) {
            if (NUTRI.nutrientByCode && NUTRI.nutrientByCode.has(c)) return c;
        }
        return null;
    };
    const pickFirstByText = (needles) => {
        const ns = Array.isArray(NUTRI.nutrients) ? NUTRI.nutrients : [];
        const want = (needles || []).map(s => String(s).toLowerCase()).filter(Boolean);
        for (const n of ns) {
            const text = `${n.code} ${n.name} ${n.label} ${n.unit}`.toLowerCase();
            if (want.some(w => text.includes(w))) return n.code;
        }
        return null;
    };
    const out = [];
    const energy = pickFirstByCode(['GJ']) || pickFirstByText(['energy', 'energi']);
    const protein = pickFirstByText(['protein']);
    const fat = pickFirstByText(['fat', 'lemak']);
    const carbs = pickFirstByText(['carbohydrate', 'karbo', 'carb']);
    [energy, protein, fat, carbs].forEach(c => {
        if (c && !out.includes(c)) out.push(c);
    });
    return out.length ? out : ['GJ', 'ZE', 'ZK', 'ZF'];
}

function nutriLoadSelectedCodes() {
    const raw = localStorage.getItem('nutri_cols') || '';
    const codes = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : nutriDefaultCodes();
    const valid = codes.filter(c => NUTRI.nutrientByCode.has(c));
    const fallback = nutriDefaultCodes().filter(c => NUTRI.nutrientByCode.has(c));
    const out = valid.length ? valid : fallback;
    localStorage.setItem('nutri_cols', out.join(','));
    return out;
}

async function initNutriSurvey() {
    if (NUTRI_MAINTENANCE) {
        nutriSetMaintenanceMode(true);
        const s = document.getElementById('nutri_status');
        if (s) s.textContent = 'Under Maintenance';
        const ds = document.getElementById('nutri_diary_status');
        if (ds) ds.textContent = 'Under Maintenance';
        return;
    }
    try {
        nutriSetMaintenanceMode(false);
        const [status, nutrients, sets, menus] = await Promise.all([
            api('/api/nutri/status'),
            api('/api/nutri/nutrients'),
            api('/api/nutri/targets/sets'),
            api('/api/menu')
        ]);
        NUTRI.status = status;
        NUTRI.nutrients = nutrients || [];
        NUTRI.nutrientByCode = new Map((NUTRI.nutrients || []).map(n => [n.code, n]));
        NUTRI.targetSets = sets || [];
        NUTRI.menus = menus || [];

        const sel = document.getElementById('nutri_menu_select');
        sel.innerHTML = (NUTRI.menus || []).map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        if (!sel.value && NUTRI.menus.length) sel.value = NUTRI.menus[0].id;

        const ts = document.getElementById('nutri_target_set');
        const tsOpt = ['(no target)', ...NUTRI.targetSets];
        ts.innerHTML = tsOpt.map(v => `<option value="${v === '(no target)' ? '' : v}">${v}</option>`).join('');
        if (!ts.value) ts.value = '';

        const note = [];
        note.push(`Foods: ${(status && status.foods) ? status.foods : 0}`);
        note.push(`With values: ${(status && status.foods_with_values) ? status.foods_with_values : 0}`);
        note.push(`Nutrients: ${(status && status.nutrient_count) ? status.nutrient_count : 0}`);
        if (status && status.foods_with_values === 0) note.push('Data nutrisi belum siap (klik Setup Data)');
        document.getElementById('nutri_status').textContent = note.join(' • ');
        NUTRI.inited = true;
        initNutriDiary();
        await loadNutriMenu();
    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e || 'Gagal load');
        let hint = '';
        if (msg.includes('Cannot GET /api/nutri')) {
            hint = ' • Endpoint NutriSurvey belum ada di server yang sedang berjalan. Pastikan server yang dipakai adalah frontend/server.js versi terbaru, lalu restart server.';
        }
        document.getElementById('nutri_status').textContent = 'Gagal load NutriSurvey: ' + msg + hint;
        const ds = document.getElementById('nutri_diary_status');
        if (ds) ds.textContent = 'Gagal load Nutri Diary: ' + msg;
    }
}

function openNutriDataHelp() {
    const status = NUTRI.status || {};
    const foods = Number(status.foods || 0);
    const withValues = Number(status.foods_with_values || 0);
    const nutrients = Number(status.nutrient_count || 0);
    const ready = (foods > 0 && withValues > 0 && nutrients > 0);
    const body = ready ? `
        <div class="text-sm text-muted">
            Data nutrisi sudah siap.
            <br/><br/>
            Kalau angka nutrisi masih kosong, biasanya karena ingredient belum di-link ke database nutrisi.
            Pakai tombol <span class="font-bold">Link</span> atau isi <span class="font-bold">Manual</span>.
        </div>
    ` : `
        <div class="text-sm text-muted">
            Kolom kalori/protein tidak muncul biasanya karena <span class="font-bold">database nutrisi belum diimport</span>.
            <br/><br/>
            Langkah setup (sekali saja):
            <ol style="margin-left:18px; margin-top:8px;">
                <li>Pastikan folder <span class="font-bold">Nutr</span> ada di root project (sejajar folder <span class="font-bold">frontend</span>).</li>
                <li>Pastikan file ini ada: <span class="font-bold">sprache.dat</span>, <span class="font-bold">lp.lpf</span>, dan terutama <span class="font-bold">bls.dat</span>.</li>
                <li>Jalankan perintah: <span class="font-bold">node import_nutr_data.js</span> dari folder <span class="font-bold">frontend</span>.</li>
                <li>Restart server aplikasi.</li>
            </ol>
            <br/>
            Setelah itu, klik <span class="font-bold">Columns</span> lalu cari “protein” atau “energy” untuk memilih kolom.
            <br/><br/>
            Status saat ini: Foods=${foods}, With values=${withValues}, Nutrients=${nutrients}
        </div>
    `;
    openModalUi({
        title: 'Setup Data Nutrisi',
        bodyHtml: body,
        actions: [{ label: 'Tutup', className: 'btn btn-primary btn-sm', onClick: () => closeModalUi() }]
    });
}

async function loadNutriMenu() {
    if (!NUTRI.inited) return;
    const menuId = document.getElementById('nutri_menu_select').value;
    const targetSet = document.getElementById('nutri_target_set').value || null;
    if (!menuId) return;
    try {
        const codes = nutriLoadSelectedCodes();
        const calc = await api('/api/nutri/calc/menu', 'POST', { menu_id: menuId, nutrient_codes: codes, target_set: targetSet });
        NUTRI.currentCalc = calc;
        NUTRI.currentMenu = (NUTRI.menus || []).find(m => m.id === menuId) || null;
        renderNutriCalc(calc);
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal calculate: ' + e.message);
    }
}

async function nutriCalculate() {
    if (!NUTRI.inited) return;
    const menuId = document.getElementById('nutri_menu_select').value;
    const targetSet = document.getElementById('nutri_target_set').value || null;
    if (!menuId) return;
    if (!NUTRI.currentCalc || !Array.isArray(NUTRI.currentCalc.detail)) return loadNutriMenu();
    try {
        const codes = nutriLoadSelectedCodes();
        const items_override = NUTRI.currentCalc.detail.map((r, idx) => ({
            ingredient_id: r.ingredient_id,
            qty_g: Math.max(0, Number(document.getElementById(`nutri_qty_${idx}`)?.value || 0))
        })).filter(x => x.ingredient_id);
        const calc = await api('/api/nutri/calc/menu', 'POST', {
            menu_id: menuId,
            nutrient_codes: codes,
            target_set: targetSet,
            items_override
        });
        NUTRI.currentCalc = calc;
        NUTRI.currentMenu = (NUTRI.menus || []).find(m => m.id === menuId) || null;
        renderNutriCalc(calc);
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal calculate: ' + e.message);
    }
}

function openNutriTargetHelp() {
    openModalUi({
        title: 'Apa itu Target / Standar Gizi?',
        bodyHtml: `
            <div class="text-sm text-muted">
                Target adalah <span class="font-bold">batas minimal–maksimal</span> (range) untuk total zat gizi yang dijadikan acuan.
                Fungsinya untuk <span class="font-bold">cek cepat</span> apakah total menu/hari itu terlalu rendah atau terlalu tinggi dibanding standar.
                <br/><br/>
                Di MBG, Target biasanya dipakai untuk validasi (QA) dan bisa dibiarkan <span class="font-bold">(no target)</span> kalau belum punya standar yang dipakai.
                <br/><br/>
                Catatan: Nilai yang tampil di tabel NutriSurvey adalah <span class="font-bold">per porsi</span> (berdasarkan qty gram per porsi).
                Sementara di Nutri Diary, totalnya adalah <span class="font-bold">akumulasi harian</span> sesuai jumlah porsi yang kamu input.
            </div>
        `,
        actions: [{ label: 'Tutup', className: 'btn btn-primary btn-sm', onClick: () => closeModalUi() }]
    });
}

function nutriFormatValue(code, v) {
    if (v === null || v === undefined) return '-';
    if (!Number.isFinite(Number(v))) return '-';
    if (code === 'GJ') return (Number(v) / 4.184).toFixed(1);
    return Number(v).toFixed(2);
}

function nutriHeaderLabel(code) {
    const n = NUTRI.nutrientByCode.get(code);
    if (!n) return code;
    if (code === 'GJ') return 'Energy (kcal)';
    const unit = n.unit ? ` (${n.unit.trim()})` : '';
    return `${n.label || n.name}${unit}`;
}

function renderNutriCalc(calc) {
    const codes = (calc && calc.nutrient_codes) ? calc.nutrient_codes : [];
    const head = document.getElementById('nutri_head');
    const rowsEl = document.getElementById('nutri_rows');
    const foot = document.getElementById('nutri_foot');

    head.innerHTML = `
        <tr>
            <th>Ingredient</th>
            <th style="width:140px">Qty per Porsi (g)</th>
            <th style="width:160px">Link</th>
            ${codes.map(c => `<th>${nutriHeaderLabel(c)}</th>`).join('')}
        </tr>
    `;

    const detail = (calc && calc.detail) ? calc.detail : [];
    rowsEl.innerHTML = detail.map((r, idx) => {
        const src = String(r.source || (r.nutr_code ? 'nutrisurvey' : 'unlinked'));
        const badge = src === 'manual'
            ? `<span class="badge" style="background:rgba(59,130,246,0.12);color:var(--primary)">Manual</span>`
            : (r.nutr_code ? `<span class="badge" style="background:rgba(34,197,94,0.1);color:var(--success)">Linked</span>` : `<span class="badge" style="background:rgba(245,158,11,0.1);color:var(--warning)">Unlinked</span>`);
        const btnLink = r.nutr_code ? '' : `<button class="btn btn-secondary btn-sm" onclick="openNutriLinkIngredient('${r.ingredient_id}')">Link</button>`;
        const btnManual = `<button class="btn btn-secondary btn-sm" onclick="openNutriManualIngredient('${r.ingredient_id}')">Manual</button>`;
        const btnUnlink = r.nutr_code ? `<button class="btn btn-danger btn-sm" onclick="nutriUnlinkIngredient('${r.ingredient_id}')">Unlink</button>` : '';
        return `
            <tr>
                <td>${r.ingredient_name || '-'}</td>
                <td><input id="nutri_qty_${idx}" type="number" min="0" step="0.01" class="input-field" value="${Number(r.qty_g || 0)}" /></td>
                <td class="flex gap-2 items-center">${badge}${btnLink}${btnManual}${btnUnlink}</td>
                ${codes.map(c => `<td>${nutriFormatValue(c, r.values ? r.values[c] : null)}</td>`).join('')}
            </tr>
        `;
    }).join('') || `<tr><td colspan="${3 + codes.length}" class="text-muted">Tidak ada ingredient pada menu</td></tr>`;

    const totals = (calc && calc.totals) ? calc.totals : {};
    const targets = (calc && calc.targets) ? calc.targets : null;

    const totalRow = `
        <tr class="font-bold" style="background: rgba(255,255,255,0.05)">
            <td>TOTAL (per porsi)</td>
            <td colspan="2" class="text-muted">${detail.reduce((a, r) => a + Number(r.qty_g || 0), 0).toFixed(0)} g</td>
            ${codes.map(c => `<td class="text-primary">${nutriFormatValue(c, totals[c])}</td>`).join('')}
        </tr>
    `;

    const targetRow = targets ? `
        <tr>
            <td class="text-muted">Target (acuan)</td>
            <td colspan="2" class="text-muted">${calc.target_set || '-'}</td>
            ${codes.map(c => {
                const t = targets[c];
                if (!t) return `<td class="text-muted">-</td>`;
                const min = (t.min === null || t.min === undefined) ? '-' : String(t.min);
                const max = (t.max === null || t.max === undefined) ? '-' : String(t.max);
                return `<td class="text-muted">${min}${max !== '-' ? '–' + max : ''}</td>`;
            }).join('')}
        </tr>
    ` : '';

    foot.innerHTML = totalRow + targetRow;
}

async function openNutriLinkIngredient(ingredientId) {
    const qId = 'nutri_link_query';
    const listId = 'nutri_link_list';
    openModalUi({
        title: 'Link Ingredient ke Database Nutr',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Cari Food (kode / nama)</label>
                    <input id="${qId}" class="input-field" placeholder="Contoh: Z004103 atau banana" />
                </div>
                <div class="form-full">
                    <div class="text-sm text-muted mb-2">Hasil</div>
                    <div class="card" style="padding:12px; max-height:320px; overflow:auto;">
                        <div id="${listId}" class="text-sm text-muted">Ketik untuk mencari...</div>
                    </div>
                </div>
            </div>
        `,
        actions: [
            { label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }
        ]
    });

    const inp = document.getElementById(qId);
    const listEl = document.getElementById(listId);
    let last = '';

    async function runSearch() {
        const q = inp.value.trim();
        if (q === last) return;
        last = q;
        if (!q) { listEl.textContent = 'Ketik untuk mencari...'; return; }
        try {
            const rows = await api(`/api/nutri/foods?query=${encodeURIComponent(q)}&limit=20`);
            const html = (rows || []).map(r => `
                <div class="flex justify-between items-center" style="padding:8px 6px; border-bottom:1px solid var(--border);">
                    <div>
                        <div class="font-bold" style="font-size:0.95em">${r.name}</div>
                        <div class="text-muted text-sm">${r.code}</div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="nutriSelectFood('${ingredientId}','${r.code.replace(/'/g, '')}')">Pilih</button>
                </div>
            `).join('');
            listEl.innerHTML = html || `<div class="text-muted text-sm">Tidak ditemukan</div>`;
        } catch (e) {
            listEl.innerHTML = `<div class="text-muted text-sm">Gagal cari: ${e.message}</div>`;
        }
    }

    inp.addEventListener('input', () => { setTimeout(runSearch, 250); });
}

async function nutriSelectFood(ingredientId, nutrCode) {
    try {
        await api('/api/nutri/link-ingredient', 'POST', { ingredient_id: ingredientId, nutr_code: nutrCode });
        notifyUi('success', 'NutriSurvey', 'Ingredient berhasil di-link');
        closeModalUi();
        await loadIngredients();
        await loadNutriMenu();
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal link: ' + e.message);
    }
}

async function nutriUnlinkIngredient(ingredientId) {
    const ok = await confirmUi({ title: 'Unlink Ingredient', message: 'Hapus link ke database Nutri untuk ingredient ini?', confirmLabel: 'Unlink', cancelLabel: 'Batal', danger: true });
    if (!ok) return;
    try {
        await api('/api/nutri/unlink-ingredient', 'POST', { ingredient_id: ingredientId, clear_manual: false });
        notifyUi('success', 'NutriSurvey', 'Ingredient di-unlink');
        await loadIngredients();
        await loadNutriMenu();
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal unlink: ' + e.message);
    }
}

async function openNutriManualIngredient(ingredientId) {
    try {
        const codes = nutriLoadSelectedCodes();
        const ingredients = await api('/api/ingredients');
        const ing = (ingredients || []).find(x => x.id === ingredientId);
        const existing = (ing && ing.nutrition_info && ing.nutrition_info.manual_nutrients) ? ing.nutrition_info.manual_nutrients : {};
        const body = `
            <div class="text-sm text-muted mb-3">Isi nilai per 100g. Kosongkan jika tidak ada.</div>
            <div class="form-grid">
                ${codes.map(c => `
                    <div>
                        <label class="input-label">${nutriHeaderLabel(c)} per 100g</label>
                        <input id="f_manual_${c}" class="input-field" type="number" step="0.0001" value="${(existing && existing[c] !== undefined && existing[c] !== null) ? Number(existing[c]) : ''}" />
                    </div>
                `).join('')}
            </div>
        `;

        openModalUi({
            title: 'Manual Nutrients (Unlinked)',
            bodyHtml: body,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setModalError('');
                        const per100 = {};
                        codes.forEach(c => {
                            const v = document.getElementById(`f_manual_${c}`).value;
                            if (v !== null && v !== undefined && String(v).trim() !== '') per100[c] = Number(v);
                        });
                        await api('/api/nutri/ingredient/manual-values', 'POST', { ingredient_id: ingredientId, per100 });
                        closeModalUi();
                        notifyUi('success', 'NutriSurvey', 'Manual nutrients tersimpan');
                        await loadIngredients();
                        await loadNutriMenu();
                    } catch (e) {
                        setModalError(e.message || 'Gagal simpan');
                    }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal membuka form: ' + e.message);
    }
}

async function openNutriAddIngredient() {
    try {
        const menuId = document.getElementById('nutri_menu_select').value;
        if (!menuId) return;
        const ingredients = await api('/api/ingredients');
        const opt = (ingredients || []).map(i => `<option value="${i.id}">${i.name} (${i.unit || '-'})</option>`).join('');
        openModalUi({
            title: 'Add Ingredient ke Menu',
            bodyHtml: `
                <div class="form-grid">
                    <div class="form-full">
                        <label class="input-label">Ingredient</label>
                        <select id="f_nutri_add_ing" class="input-field">${opt}</select>
                    </div>
                    <div>
                        <label class="input-label">Qty (g)</label>
                        <input id="f_nutri_add_qty" class="input-field" type="number" min="0.01" step="0.01" value="10" />
                    </div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Tambah', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setModalError('');
                        const ingId = document.getElementById('f_nutri_add_ing').value;
                        const qty = Number(document.getElementById('f_nutri_add_qty').value || 0);
                        if (!ingId) return setModalError('Ingredient wajib dipilih');
                        if (!qty) return setModalError('Qty wajib diisi');
                        const calc = NUTRI.currentCalc;
                        const base = (calc && Array.isArray(calc.detail)) ? calc.detail.map(r => ({ ingredient_id: r.ingredient_id, qty_g: Number(r.qty_g || 0) })) : [];
                        base.push({ ingredient_id: ingId, qty_g: qty });
                        await api('/api/nutri/menu/update-ingredients', 'POST', { menu_id: menuId, items: base });
                        closeModalUi();
                        notifyUi('success', 'NutriSurvey', 'Ingredient ditambahkan');
                        await loadNutriMenu();
                    } catch (e) {
                        setModalError(e.message || 'Gagal tambah ingredient');
                    }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal membuka form: ' + e.message);
    }
}

async function openNutriLinkMissing() {
    const calc = NUTRI.currentCalc;
    if (!calc || !Array.isArray(calc.detail)) return notifyUi('warning', 'NutriSurvey', 'Belum ada hasil calculate');
    const missing = calc.detail.filter(r => !r.nutr_code);
    if (!missing.length) return notifyUi('success', 'NutriSurvey', 'Semua ingredient sudah linked');
    const body = missing.map(r => `
        <div class="flex justify-between items-center" style="padding:8px 6px; border-bottom:1px solid var(--border);">
            <div>
                <div class="font-bold" style="font-size:0.95em">${r.ingredient_name}</div>
                <div class="text-muted text-sm">${r.ingredient_id}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="closeModalUi(); openNutriLinkIngredient('${r.ingredient_id}')">Link</button>
        </div>
    `).join('');
    openModalUi({
        title: 'Link Missing Ingredients',
        bodyHtml: `<div class="card" style="padding:12px; max-height:420px; overflow:auto;">${body}</div>`,
        actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
    });
}

async function saveNutriMenuRecipe() {
    const calc = NUTRI.currentCalc;
    if (!calc || !NUTRI.currentMenu) return notifyUi('warning', 'NutriSurvey', 'Tidak ada menu yang dipilih');
    try {
        const items = Array.isArray(calc.detail) ? calc.detail.map((r, idx) => ({
            ingredient_id: r.ingredient_id,
            qty_g: Number(document.getElementById(`nutri_qty_${idx}`).value || 0)
        })).filter(x => x.ingredient_id && x.qty_g > 0) : [];
        await api('/api/nutri/menu/update-ingredients', 'POST', { menu_id: calc.menu_id, items });
        notifyUi('success', 'NutriSurvey', 'Qty tersimpan ke Menu');
        await loadNutriMenu();
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal simpan qty: ' + e.message);
    }
}

function openNutriColumns() {
    const selected = new Set((localStorage.getItem('nutri_cols') || '').split(',').map(s => s.trim()).filter(Boolean));
    const qId = 'f_nutri_col_q';
    const listId = 'f_nutri_col_list';
    openModalUi({
        title: 'Pilih Kolom Nutrien',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Search</label>
                    <input id="${qId}" class="input-field" placeholder="Contoh: protein / Vit. C / ZK" />
                </div>
                <div class="form-full">
                    <div class="card" style="padding:12px; max-height:420px; overflow:auto;">
                        <div id="${listId}"></div>
                    </div>
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                const checks = Array.from(document.querySelectorAll('input[data-nutri-col="1"]') || []);
                const pick = checks.filter(c => c.checked).map(c => c.value);
                if (!pick.length) return setModalError('Minimal pilih 1 kolom');
                localStorage.setItem('nutri_cols', pick.join(','));
                closeModalUi();
                await loadNutriMenu();
            } }
        ]
    });

    function renderList(filter) {
        const f = String(filter || '').toLowerCase();
        const rows = (NUTRI.nutrients || []).filter(n => {
            const s = `${n.code} ${n.name} ${n.label} ${n.unit}`.toLowerCase();
            return !f || s.includes(f);
        }).slice(0, 250);
        document.getElementById(listId).innerHTML = rows.map(n => {
            const checked = selected.has(n.code);
            const unit = n.unit ? `(${n.unit.trim()})` : '';
            return `
                <label style="display:flex; gap:10px; align-items:flex-start; padding:8px 6px; border-bottom:1px solid var(--border); cursor:pointer;">
                    <input data-nutri-col="1" type="checkbox" value="${n.code}" ${checked ? 'checked' : ''} />
                    <div>
                        <div class="font-bold" style="font-size:0.95em">${n.label || n.name} ${unit}</div>
                        <div class="text-muted text-sm">${n.code}</div>
                    </div>
                </label>
            `;
        }).join('');
    }

    renderList('');
    document.getElementById(qId).addEventListener('input', (e) => renderList(e.target.value));
}

function exportNutriJson() {
    const calc = NUTRI.currentCalc;
    if (!calc) return notifyUi('warning', 'NutriSurvey', 'Belum ada hasil calculate');
    try {
        const blob = new Blob([JSON.stringify(calc, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safe = String(calc.menu_name || 'nutrisurvey').replace(/[^a-z0-9]+/gi, '_');
        a.href = url;
        a.download = `${safe}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        notifyUi('success', 'NutriSurvey', 'Export JSON dibuat');
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal export: ' + e.message);
    }
}

async function openNutriHistory() {
    try {
        const menuId = document.getElementById('nutri_menu_select').value;
        const qs = menuId ? `?menu_id=${encodeURIComponent(menuId)}&limit=100` : '?limit=100';
        const rows = await api(`/api/nutri/history${qs}`);
        const body = (rows || []).map(r => `
            <div class="flex justify-between items-center" style="padding:10px 6px; border-bottom:1px solid var(--border);">
                <div>
                    <div class="font-bold" style="font-size:0.95em">${r.menu_name || '-'}</div>
                    <div class="text-muted text-sm">${formatDateTime(r.at)} • Missing: ${r.missing_count || 0}${(r.energy_kcal !== null && r.energy_kcal !== undefined) ? ` • Energy: ${Number(r.energy_kcal).toFixed(1)} kcal` : ''}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="openNutriHistoryDetail('${r.id}')">Detail</button>
            </div>
        `).join('') || `<div class="text-muted text-sm">Belum ada history</div>`;

        openModalUi({
            title: 'History Kalkulasi Gizi',
            bodyHtml: `<div class="card" style="padding:12px; max-height:520px; overflow:auto;">${body}</div>`,
            actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
        });
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal load history: ' + e.message);
    }
}

async function openNutriHistoryDetail(id) {
    try {
        const calc = await api(`/api/nutri/history/${encodeURIComponent(id)}`);
        closeModalUi();
        if (!calc) return notifyUi('warning', 'NutriSurvey', 'Detail tidak ditemukan');
        NUTRI.currentCalc = calc;
        renderNutriCalc(calc);
        notifyUi('success', 'NutriSurvey', 'Detail history ditampilkan');
    } catch (e) {
        notifyUi('danger', 'NutriSurvey', 'Gagal load detail: ' + e.message);
    }
}

function nutriTodayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function nutriDiarySetStatus() {
    const el = document.getElementById('nutri_diary_status');
    if (!el) return;
    const date = document.getElementById('nutri_diary_date')?.value || '';
    const title = document.getElementById('nutri_diary_title')?.value || '';
    const dirty = NUTRI.diaryDirty ? ' • Unsaved' : '';
    el.textContent = `${date || '-'}${title ? ' • ' + title : ''}${dirty}`;
}

function nutriDiaryMarkDirty() {
    NUTRI.diaryDirty = true;
    nutriDiarySetStatus();
}

function initNutriDiary() {
    const dateEl = document.getElementById('nutri_diary_date');
    if (dateEl && !dateEl.value) dateEl.value = nutriTodayIso();

    const ts = document.getElementById('nutri_diary_target_set');
    if (ts) {
        const tsOpt = ['(no target)', ...(NUTRI.targetSets || [])];
        ts.innerHTML = tsOpt.map(v => `<option value="${v === '(no target)' ? '' : v}">${v}</option>`).join('');
        if (!ts.value) ts.value = '';
    }

    NUTRI.diaryDay = null;
    NUTRI.diaryEntries = [];
    NUTRI.diaryCalc = null;
    NUTRI.diaryDirty = false;
    nutriDiarySetStatus();
    nutriDiaryLoadSelectedDate();
}

async function nutriDiaryLoadSelectedDate() {
    if (!NUTRI.inited) return;
    try {
        const date = document.getElementById('nutri_diary_date')?.value || nutriTodayIso();
        const target_set = document.getElementById('nutri_diary_target_set')?.value || null;
        const title = document.getElementById('nutri_diary_title')?.value || null;
        if (!date) return;

        const r = await api(`/api/nutri/diary/day?date=${encodeURIComponent(date)}`);
        if (!r || !r.day) {
            const created = await api('/api/nutri/diary/day', 'POST', { date, title, target_set });
            NUTRI.diaryDay = created ? created.day : null;
            NUTRI.diaryEntries = [];
        } else {
            NUTRI.diaryDay = r.day;
            NUTRI.diaryEntries = Array.isArray(r.entries) ? r.entries.map(e => ({
                id: e.id,
                entry_type: e.entry_type,
                ref_id: e.ref_id,
                name: e.name,
                qty_g: e.qty_g,
                portions: e.portions
            })) : [];
        }

        const titleEl = document.getElementById('nutri_diary_title');
        if (titleEl) titleEl.value = (NUTRI.diaryDay && NUTRI.diaryDay.title) ? NUTRI.diaryDay.title : '';
        const ts = document.getElementById('nutri_diary_target_set');
        if (ts) ts.value = (NUTRI.diaryDay && NUTRI.diaryDay.target_set) ? NUTRI.diaryDay.target_set : '';

        NUTRI.diaryCalc = null;
        NUTRI.diaryDirty = false;
        nutriDiarySetStatus();
        renderNutriDiary();
    } catch (e) {
        notifyUi('danger', 'Nutri Diary', 'Gagal load: ' + e.message);
    }
}

function nutriDiaryClear() {
    NUTRI.diaryEntries = [];
    NUTRI.diaryCalc = null;
    nutriDiaryMarkDirty();
    renderNutriDiary();
}

function nutriDiaryRemoveEntry(idx) {
    NUTRI.diaryEntries.splice(idx, 1);
    NUTRI.diaryCalc = null;
    nutriDiaryMarkDirty();
    renderNutriDiary();
}

function nutriDiaryUpdateEntry(idx) {
    const e = NUTRI.diaryEntries[idx];
    if (!e) return;
    const p = Number(document.getElementById(`nutri_diary_portions_${idx}`)?.value || 0);
    e.portions = p;
    if (e.entry_type === 'food') {
        const q = Number(document.getElementById(`nutri_diary_qty_${idx}`)?.value || 0);
        e.qty_g = q;
    }
    nutriDiaryMarkDirty();
}

async function nutriDiarySave() {
    try {
        const date = document.getElementById('nutri_diary_date')?.value || nutriTodayIso();
        if (!date) return;
        const title = document.getElementById('nutri_diary_title')?.value || null;
        const target_set = document.getElementById('nutri_diary_target_set')?.value || null;

        if (!NUTRI.diaryDay || !NUTRI.diaryDay.id) {
            const created = await api('/api/nutri/diary/day', 'POST', { date, title, target_set });
            NUTRI.diaryDay = created ? created.day : null;
        }
        if (!NUTRI.diaryDay || !NUTRI.diaryDay.id) throw new Error('Diary day belum terbentuk');

        const payload = (NUTRI.diaryEntries || []).map(e => ({
            id: e.id || null,
            entry_type: e.entry_type,
            ref_id: e.ref_id,
            name: e.name || null,
            qty_g: e.entry_type === 'food' ? Number(e.qty_g || 0) : null,
            portions: Number(e.portions || 1)
        }));

        const saved = await api(`/api/nutri/diary/day/${encodeURIComponent(NUTRI.diaryDay.id)}`, 'PUT', {
            title,
            target_set,
            entries: payload
        });
        NUTRI.diaryDay = saved ? saved.day : NUTRI.diaryDay;
        NUTRI.diaryEntries = Array.isArray(saved?.entries) ? saved.entries.map(e => ({
            id: e.id,
            entry_type: e.entry_type,
            ref_id: e.ref_id,
            name: e.name,
            qty_g: e.qty_g,
            portions: e.portions
        })) : NUTRI.diaryEntries;
        NUTRI.diaryDirty = false;
        nutriDiarySetStatus();
        notifyUi('success', 'Nutri Diary', 'Tersimpan');
        renderNutriDiary();
    } catch (e) {
        notifyUi('danger', 'Nutri Diary', 'Gagal simpan: ' + e.message);
    }
}

async function nutriDiaryCalc() {
    try {
        if (NUTRI.diaryDirty) await nutriDiarySave();
        if (!NUTRI.diaryDay || !NUTRI.diaryDay.id) throw new Error('Diary day belum terbentuk');
        const codes = nutriLoadSelectedCodes();
        const target_set = document.getElementById('nutri_diary_target_set')?.value || null;
        const calc = await api(`/api/nutri/diary/day/${encodeURIComponent(NUTRI.diaryDay.id)}/calc`, 'POST', {
            nutrient_codes: codes,
            target_set
        });
        NUTRI.diaryCalc = calc;
        renderNutriDiary();
        notifyUi('success', 'Nutri Diary', 'Kalkulasi selesai');
    } catch (e) {
        notifyUi('danger', 'Nutri Diary', 'Gagal calculate: ' + e.message);
    }
}

function openNutriDiaryAddMenu() {
    const menuOpt = (NUTRI.menus || []).map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    openModalUi({
        title: 'Add Menu ke Diary',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Menu</label>
                    <select id="f_diary_menu" class="input-field">${menuOpt}</select>
                </div>
                <div>
                    <label class="input-label">Jumlah Porsi</label>
                    <input id="f_diary_portions" class="input-field" type="number" min="0.01" step="0.01" value="1" />
                </div>
                <div class="form-full">
                    <label class="input-label">Nama (Opsional)</label>
                    <input id="f_diary_name" class="input-field" placeholder="Kosongkan untuk pakai nama menu" />
                </div>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
            { label: 'Tambah', className: 'btn btn-primary btn-sm', onClick: () => {
                const ref_id = document.getElementById('f_diary_menu')?.value || '';
                const portions = Number(document.getElementById('f_diary_portions')?.value || 0);
                const name = document.getElementById('f_diary_name')?.value || '';
                if (!ref_id) return setModalError('Menu wajib dipilih');
                if (!portions || portions <= 0) return setModalError('Jumlah porsi wajib diisi');
                NUTRI.diaryEntries.push({ id: null, entry_type: 'menu', ref_id, name: name || null, qty_g: null, portions });
                NUTRI.diaryCalc = null;
                nutriDiaryMarkDirty();
                closeModalUi();
                renderNutriDiary();
            } }
        ]
    });
}

function openNutriDiaryAddFood() {
    const qId = 'nutri_diary_food_query';
    const listId = 'nutri_diary_food_list';
    openModalUi({
        title: 'Add Food (Database) ke Diary',
        bodyHtml: `
            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Cari Food (kode / nama)</label>
                    <input id="${qId}" class="input-field" placeholder="Contoh: Z004103 atau banana" />
                </div>
                <div>
                    <label class="input-label">Qty per Porsi (g)</label>
                    <input id="f_diary_food_qty" class="input-field" type="number" min="0.01" step="0.01" value="100" />
                </div>
                <div>
                    <label class="input-label">Jumlah Porsi</label>
                    <input id="f_diary_food_portions" class="input-field" type="number" min="0.01" step="0.01" value="1" />
                </div>
                <div class="form-full">
                    <div class="text-sm text-muted mb-2">Hasil</div>
                    <div class="card" style="padding:12px; max-height:320px; overflow:auto;">
                        <div id="${listId}" class="text-sm text-muted">Ketik untuk mencari...</div>
                    </div>
                </div>
            </div>
        `,
        actions: [{ label: 'Tutup', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() }]
    });

    const inp = document.getElementById(qId);
    const listEl = document.getElementById(listId);
    let last = '';

    async function runSearch() {
        const q = inp.value.trim();
        if (q === last) return;
        last = q;
        if (!q) { listEl.textContent = 'Ketik untuk mencari...'; return; }
        try {
            const rows = await api(`/api/nutri/foods?query=${encodeURIComponent(q)}&limit=20`);
            const html = (rows || []).map(r => `
                <div class="flex justify-between items-center" style="padding:8px 6px; border-bottom:1px solid var(--border);">
                    <div>
                        <div class="font-bold" style="font-size:0.95em">${r.name}</div>
                        <div class="text-muted text-sm">${r.code}</div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="nutriDiaryPickFood('${r.code.replace(/'/g, '')}','${String(r.name || '').replace(/'/g, '')}')">Pilih</button>
                </div>
            `).join('');
            listEl.innerHTML = html || `<div class="text-muted text-sm">Tidak ditemukan</div>`;
        } catch (e) {
            listEl.innerHTML = `<div class="text-muted text-sm">Gagal cari: ${e.message}</div>`;
        }
    }

    inp.addEventListener('input', () => { setTimeout(runSearch, 250); });
}

function nutriDiaryPickFood(code, name) {
    const qty_g = Number(document.getElementById('f_diary_food_qty')?.value || 0);
    const portions = Number(document.getElementById('f_diary_food_portions')?.value || 0);
    if (!qty_g || qty_g <= 0) return setModalError('Qty per porsi wajib diisi');
    if (!portions || portions <= 0) return setModalError('Jumlah porsi wajib diisi');
    NUTRI.diaryEntries.push({ id: null, entry_type: 'food', ref_id: code, name: name || null, qty_g, portions });
    NUTRI.diaryCalc = null;
    nutriDiaryMarkDirty();
    closeModalUi();
    renderNutriDiary();
}

function renderNutriDiary() {
    const codes = NUTRI.inited ? nutriLoadSelectedCodes() : [];
    const head = document.getElementById('nutri_diary_head');
    const rowsEl = document.getElementById('nutri_diary_rows');
    const foot = document.getElementById('nutri_diary_foot');
    if (!head || !rowsEl || !foot) return;

    head.innerHTML = `
        <tr>
            <th>Item</th>
            <th style="width:90px">Type</th>
            <th style="width:140px">Porsi</th>
            <th style="width:140px">Qty (g)</th>
            ${codes.map(c => `<th>${nutriHeaderLabel(c)}</th>`).join('')}
            <th style="width:90px">Action</th>
        </tr>
    `;

    const calc = NUTRI.diaryCalc;
    const detail = (calc && Array.isArray(calc.detail)) ? calc.detail : [];

    rowsEl.innerHTML = (NUTRI.diaryEntries || []).map((e, idx) => {
        const d = detail[idx] || null;
        const values = d && d.values ? d.values : null;
        const typeLabel = e.entry_type === 'menu' ? 'Menu' : 'Food';
        const qtyDisabled = e.entry_type === 'food' ? '' : 'disabled';
        const qtyVal = e.entry_type === 'food' ? Number(e.qty_g || 0) : '';
        const missing = d && Number(d.missing_count || 0) > 0 ? `<span class="badge warning ml-2">Missing</span>` : '';
        return `
            <tr>
                <td>${(e.name || '').trim() || e.ref_id || '-'} ${missing}</td>
                <td class="text-muted">${typeLabel}</td>
                <td><input id="nutri_diary_portions_${idx}" type="number" min="0.01" step="0.01" class="input-field" value="${Number(e.portions || 1)}" oninput="nutriDiaryUpdateEntry(${idx})" /></td>
                <td><input id="nutri_diary_qty_${idx}" type="number" min="0.01" step="0.01" class="input-field" value="${qtyVal}" ${qtyDisabled} oninput="nutriDiaryUpdateEntry(${idx})" /></td>
                ${codes.map(c => `<td>${nutriFormatValue(c, values ? values[c] : null)}</td>`).join('')}
                <td><button class="btn btn-danger btn-sm" onclick="nutriDiaryRemoveEntry(${idx})">Hapus</button></td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="${5 + codes.length}" class="text-muted">Belum ada item di diary</td></tr>`;

    const totals = (calc && calc.totals) ? calc.totals : null;
    const targets = (calc && calc.targets) ? calc.targets : null;
    const totalRow = totals ? `
        <tr class="font-bold" style="background: rgba(255,255,255,0.05)">
            <td>TOTAL</td>
            <td colspan="3" class="text-muted">${calc.title || ''}</td>
            ${codes.map(c => `<td class="text-primary">${nutriFormatValue(c, totals[c])}</td>`).join('')}
            <td></td>
        </tr>
    ` : `
        <tr class="font-bold" style="background: rgba(255,255,255,0.05)">
            <td>TOTAL</td>
            <td colspan="${4 + codes.length}" class="text-muted">Klik Calculate untuk melihat total</td>
            <td></td>
        </tr>
    `;

    const targetRow = targets ? `
        <tr>
            <td class="text-muted">Target</td>
            <td colspan="3" class="text-muted">${calc.target_set || '-'}</td>
            ${codes.map(c => {
                const t = targets[c];
                if (!t) return `<td class="text-muted">-</td>`;
                const min = (t.min === null || t.min === undefined) ? '-' : String(t.min);
                const max = (t.max === null || t.max === undefined) ? '-' : String(t.max);
                return `<td class="text-muted">${min}${max !== '-' ? '–' + max : ''}</td>`;
            }).join('')}
            <td></td>
        </tr>
    ` : '';

    foot.innerHTML = totalRow + targetRow;
    nutriDiarySetStatus();
}

/**
 * Library Workflow Pengolahan — CRUD + DAG step editor.
 *
 * Workflow = list of steps dengan depends_on_step_ids (DAG).
 * Metadata per step: activity_type, required_resource_type, required_skill_level,
 * parallelizable, qc_required, temperature_celsius, hygiene_level, ingredient_refs,
 * ingredient_group, notes, duration_minutes_per_batch, batch_capacity.
 */

async function loadWorkflowsLibrary() {
    const body = document.getElementById('workflows-library-body');
    if (!body) return;
    body.innerHTML = '<div class="card p-4 text-muted">Memuat workflows...</div>';
    try {
        const rows = await api('/api/workflows');
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
            body.innerHTML = `
                <div class="card p-6 text-center">
                    <div class="text-muted mb-3">Belum ada workflow.</div>
                    <button class="btn btn-primary" onclick="openWorkflowEditor(null)"><i class="fas fa-plus"></i> Tambah Workflow Pertama</button>
                </div>`;
            return;
        }
        body.innerHTML = `
            <div class="card overflow-hidden">
                <table class="nutri-table w-full">
                    <thead>
                        <tr>
                            <th>Nama Workflow</th>
                            <th>Kategori</th>
                            <th>Deskripsi</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map(w => `
                            <tr>
                                <td class="font-bold">${wfEscape(w.name || '')}</td>
                                <td><span class="badge">${wfEscape(w.category || '')}</span></td>
                                <td class="text-sm text-muted">${wfEscape(w.description || '')}</td>
                                <td>
                                    <button type="button" class="btn btn-secondary btn-xs" onclick='openWorkflowEditor(${JSON.stringify(w.id)})'><i class="fas fa-edit"></i> Edit</button>
                                    <button type="button" class="btn btn-danger btn-xs" onclick='deleteWorkflow(${JSON.stringify(w.id)}, ${JSON.stringify(String(w.name || ''))})'><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        body.innerHTML = `<div class="card p-4 text-danger">Gagal load: ${wfEscape(e.message || String(e))}</div>`;
    }
}
window.loadWorkflowsLibrary = loadWorkflowsLibrary;

async function openWorkflowEditor(workflowId) {
    const isEdit = !!workflowId;
    let header = { name: '', category: 'cooking', description: '' };
    let steps = [];
    if (isEdit) {
        try { header = await api('/api/workflows/' + workflowId); } catch (e) { notifyUi('danger', 'Error', e.message || String(e)); return; }
        try { steps = await api('/api/workflows/' + workflowId + '/steps'); } catch (e) { steps = []; }
    }
    // Vocabulary
    let vocabulary = [];
    try { const v = await api('/api/kitchen/vocabulary'); vocabulary = Array.isArray(v && v.vocabulary) ? v.vocabulary : []; } catch (e) { vocabulary = []; }
    // Ingredients master
    let masterIngs = [];
    try { masterIngs = await api('/api/ingredients') || []; } catch (e) { masterIngs = []; }

    window._wfEditor = {
        id: workflowId,
        header: { ...header },
        steps: (steps || []).map((s, idx) => ({
            id: s.id || ('WS_tmp_' + Date.now() + '_' + idx),
            step_order: s.step_order || (idx + 1),
            title: s.title || '',
            description: s.description || '',
            activity_type: s.activity_type || 'prep',
            duration_minutes_per_batch: Number(s.duration_minutes_per_batch || 0),
            batch_capacity: Number(s.batch_capacity || 0),
            required_resource_type: s.required_resource_type || '',
            required_skill_level: s.required_skill_level || 'junior',
            depends_on_step_ids: Array.isArray(s.depends_on_step_ids) ? s.depends_on_step_ids.slice() : [],
            parallelizable: !!s.parallelizable,
            qc_required: !!s.qc_required,
            temperature_celsius: s.temperature_celsius != null ? Number(s.temperature_celsius) : null,
            hygiene_level: s.hygiene_level || 'medium',
            ingredient_refs: Array.isArray(s.ingredient_refs) ? s.ingredient_refs.slice() : [],
            ingredient_group: s.ingredient_group || '',
            notes: s.notes || ''
        })),
        vocabulary,
        masterIngs
    };

    openModalUi({
        title: isEdit ? 'Edit Workflow Pengolahan' : 'Tambah Workflow Pengolahan',
        width: '95%',
        bodyHtml: `
            <div class="form-grid">
                <div>
                    <label class="input-label">Nama Workflow *</label>
                    <input id="wf-name" class="input-field" value="${wfAttr(header.name || '')}">
                </div>
                <div>
                    <label class="input-label">Kategori</label>
                    <select id="wf-category" class="input-field">
                        ${['cooking','prep','pack','qc','other'].map(c => `<option value="${c}" ${c === (header.category || 'cooking') ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-full">
                    <label class="input-label">Deskripsi</label>
                    <textarea id="wf-description" class="input-field" rows="2">${wfEscape(header.description || '')}</textarea>
                </div>
            </div>

            <div class="mt-4 flex justify-between items-center">
                <div>
                    <div class="font-bold">Workflow Steps (DAG)</div>
                    <div class="text-xs text-muted">Step dengan tanpa dependency akan dijalankan paralel. Gunakan <b>Depends on</b> untuk chain.</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="addWorkflowStep()"><i class="fas fa-plus"></i> Tambah Step</button>
            </div>
            <div id="wf-steps-list" class="flex flex-col gap-3 mt-2"></div>

            <div class="mt-4">
                <div class="font-bold">Preview DAG</div>
                <pre id="wf-dag-preview" class="p-2 bg-white/5 rounded text-xs" style="white-space:pre-wrap; max-height:200px; overflow:auto;"></pre>
            </div>
        `,
        actions: [
            { label: 'Batal', className: 'btn btn-secondary', onClick: () => closeModalUi() },
            { label: isEdit ? 'Simpan Perubahan' : 'Simpan Workflow', className: 'btn btn-primary', onClick: () => saveWorkflowFromEditor() }
        ]
    });
    renderWfSteps();
    renderWfDagPreview();
}
window.openWorkflowEditor = openWorkflowEditor;

function renderWfSteps() {
    const box = document.getElementById('wf-steps-list');
    if (!box) return;
    const ed = window._wfEditor || {};
    const steps = ed.steps || [];
    const vocab = ed.vocabulary || [];
    if (!steps.length) {
        box.innerHTML = '<div class="text-muted text-sm italic">Belum ada step.</div>';
        return;
    }
    const vocabOpts = vocab.filter(v => v.id !== 'pack').map(v => `<option value="${v.id}">${v.id} — ${wfEscape(v.label || v.id)}</option>`).join('');
    box.innerHTML = steps.map((s, idx) => {
        const depsOpts = steps.filter((_, i) => i !== idx).map(other =>
            `<option value="${other.id}" ${s.depends_on_step_ids.includes(other.id) ? 'selected' : ''}>${other.step_order}. ${wfEscape(other.title || '(untitled)')}</option>`
        ).join('');
        return `
            <div class="card p-3 border border-white/10">
                <div class="flex justify-between items-start mb-2">
                    <div class="font-bold">Step ${idx + 1}</div>
                    <div class="flex gap-1">
                        <button class="btn btn-secondary btn-xs" onclick="moveWfStep(${idx}, -1)"${idx === 0 ? ' disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button class="btn btn-secondary btn-xs" onclick="moveWfStep(${idx}, 1)"${idx === steps.length - 1 ? ' disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                        <button class="btn btn-danger btn-xs" onclick="removeWfStep(${idx})"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="input-label">Title *</label>
                        <input class="input-field" value="${wfAttr(s.title)}" onchange="updateWfStep(${idx}, 'title', this.value)">
                    </div>
                    <div>
                        <label class="input-label">Activity Type</label>
                        <select class="input-field" onchange="updateWfStep(${idx}, 'activity_type', this.value)">
                            ${vocabOpts.replace(`value="${s.activity_type}"`, `value="${s.activity_type}" selected`)}
                        </select>
                    </div>
                    <div>
                        <label class="input-label">Duration / Batch (menit)</label>
                        <input type="number" class="input-field" value="${s.duration_minutes_per_batch}" onchange="updateWfStep(${idx}, 'duration_minutes_per_batch', Number(this.value))">
                    </div>
                    <div>
                        <label class="input-label">Batch Capacity (porsi/batch)</label>
                        <input type="number" class="input-field" value="${s.batch_capacity}" onchange="updateWfStep(${idx}, 'batch_capacity', Number(this.value))">
                    </div>
                    <div>
                        <label class="input-label">Required Resource</label>
                        <input class="input-field" placeholder="mis. stove, chopper" value="${wfAttr(s.required_resource_type)}" onchange="updateWfStep(${idx}, 'required_resource_type', this.value)">
                    </div>
                    <div>
                        <label class="input-label">Skill Level</label>
                        <select class="input-field" onchange="updateWfStep(${idx}, 'required_skill_level', this.value)">
                            ${['junior','mid','senior'].map(k => `<option value="${k}" ${k === s.required_skill_level ? 'selected' : ''}>${k}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="input-label">Temperature (°C)</label>
                        <input type="number" class="input-field" value="${s.temperature_celsius != null ? s.temperature_celsius : ''}" onchange="updateWfStep(${idx}, 'temperature_celsius', this.value === '' ? null : Number(this.value))">
                    </div>
                    <div>
                        <label class="input-label">Hygiene Level</label>
                        <select class="input-field" onchange="updateWfStep(${idx}, 'hygiene_level', this.value)">
                            ${['low','medium','high','critical'].map(k => `<option value="${k}" ${k === s.hygiene_level ? 'selected' : ''}>${k}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex items-center gap-3 mt-5">
                        <label class="flex items-center gap-1">
                            <input type="checkbox" ${s.parallelizable ? 'checked' : ''} onchange="updateWfStep(${idx}, 'parallelizable', this.checked)">
                            <span class="text-sm">Parallelizable</span>
                        </label>
                        <label class="flex items-center gap-1">
                            <input type="checkbox" ${s.qc_required ? 'checked' : ''} onchange="updateWfStep(${idx}, 'qc_required', this.checked)">
                            <span class="text-sm">QC Required</span>
                        </label>
                    </div>
                    <div class="col-span-3">
                        <label class="input-label">Depends on Steps (multi)</label>
                        <select multiple class="input-field" size="3" onchange="updateWfStepDeps(${idx}, this)">
                            ${depsOpts}
                        </select>
                        <div class="text-xs text-muted">Ctrl/Cmd+click untuk pilih banyak. Kosongkan = root step (boleh mulai duluan).</div>
                    </div>
                    <div class="col-span-3">
                        <label class="input-label">Ingredient Group (opsional)</label>
                        <input class="input-field" placeholder="mis. 'fruit' atau 'main_dish' - untuk branching DAG" value="${wfAttr(s.ingredient_group)}" onchange="updateWfStep(${idx}, 'ingredient_group', this.value)">
                    </div>
                    <div class="col-span-3">
                        <label class="input-label">Notes</label>
                        <input class="input-field" value="${wfAttr(s.notes)}" onchange="updateWfStep(${idx}, 'notes', this.value)">
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderWfDagPreview() {
    const el = document.getElementById('wf-dag-preview');
    if (!el) return;
    const ed = window._wfEditor || {};
    const steps = ed.steps || [];
    if (!steps.length) { el.textContent = '(kosong)'; return; }
    const byId = new Map(steps.map(s => [s.id, s]));
    // detect cycle via topological attempt
    const indeg = new Map(steps.map(s => [s.id, (s.depends_on_step_ids || []).filter(id => byId.has(id)).length]));
    const queue = steps.filter(s => indeg.get(s.id) === 0).map(s => s.id);
    let visited = 0;
    const order = [];
    const tmpDeg = new Map(indeg);
    while (queue.length) {
        const id = queue.shift();
        order.push(id);
        visited++;
        for (const s of steps) {
            if ((s.depends_on_step_ids || []).includes(id)) {
                tmpDeg.set(s.id, tmpDeg.get(s.id) - 1);
                if (tmpDeg.get(s.id) === 0) queue.push(s.id);
            }
        }
    }
    const cycle = visited !== steps.length;
    let preview = '';
    for (const s of steps) {
        const deps = (s.depends_on_step_ids || []).map(id => byId.has(id) ? `Step ${byId.get(id).step_order}` : '?').join(', ');
        const flags = [];
        if (s.parallelizable) flags.push('parallel');
        if (s.qc_required) flags.push('qc');
        if (s.ingredient_group) flags.push(`group=${s.ingredient_group}`);
        preview += `[${s.step_order}] ${s.title || '(untitled)'} <${s.activity_type}> ${s.duration_minutes_per_batch}m/batch`;
        if (deps) preview += ` <- depends: ${deps}`;
        if (flags.length) preview += ` {${flags.join(', ')}}`;
        preview += '\n';
    }
    if (cycle) preview += '\nWARNING: Cycle terdeteksi di DAG - steps tidak akan bisa di-schedule.';
    el.textContent = preview;
}

window.addWorkflowStep = function() {
    const ed = window._wfEditor;
    if (!ed) return;
    const n = ed.steps.length;
    ed.steps.push({
        id: 'WS_tmp_' + Date.now() + '_' + n,
        step_order: n + 1,
        title: '',
        description: '',
        activity_type: 'prep',
        duration_minutes_per_batch: 0,
        batch_capacity: 0,
        required_resource_type: '',
        required_skill_level: 'junior',
        depends_on_step_ids: n > 0 ? [ed.steps[n - 1].id] : [],
        parallelizable: false,
        qc_required: false,
        temperature_celsius: null,
        hygiene_level: 'medium',
        ingredient_refs: [],
        ingredient_group: '',
        notes: ''
    });
    renderWfSteps();
    renderWfDagPreview();
};

window.updateWfStep = function(idx, field, value) {
    const ed = window._wfEditor;
    if (!ed || !ed.steps[idx]) return;
    ed.steps[idx][field] = value;
    renderWfDagPreview();
};

window.updateWfStepDeps = function(idx, selectEl) {
    const ed = window._wfEditor;
    if (!ed || !ed.steps[idx] || !selectEl) return;
    const selected = Array.from(selectEl.options).filter(o => o.selected).map(o => o.value);
    ed.steps[idx].depends_on_step_ids = selected;
    renderWfDagPreview();
};

window.removeWfStep = function(idx) {
    const ed = window._wfEditor;
    if (!ed) return;
    const removedId = ed.steps[idx] && ed.steps[idx].id;
    ed.steps.splice(idx, 1);
    ed.steps.forEach((s, i) => {
        s.step_order = i + 1;
        if (removedId) s.depends_on_step_ids = s.depends_on_step_ids.filter(id => id !== removedId);
    });
    renderWfSteps();
    renderWfDagPreview();
};

window.moveWfStep = function(idx, dir) {
    const ed = window._wfEditor;
    if (!ed) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= ed.steps.length) return;
    const tmp = ed.steps[idx]; ed.steps[idx] = ed.steps[newIdx]; ed.steps[newIdx] = tmp;
    ed.steps.forEach((s, i) => s.step_order = i + 1);
    renderWfSteps();
    renderWfDagPreview();
};

window.saveWorkflowFromEditor = async function() {
    const ed = window._wfEditor;
    if (!ed) return;
    const name = String(document.getElementById('wf-name').value || '').trim();
    if (!name) { setModalError && setModalError('Nama wajib'); return; }
    const category = String(document.getElementById('wf-category').value || 'cooking');
    const description = String(document.getElementById('wf-description').value || '');
    // Validate DAG
    const byId = new Map(ed.steps.map(s => [s.id, s]));
    const indeg = new Map(ed.steps.map(s => [s.id, (s.depends_on_step_ids || []).filter(id => byId.has(id)).length]));
    const queue = ed.steps.filter(s => indeg.get(s.id) === 0).map(s => s.id);
    let visited = 0;
    const tmpDeg = new Map(indeg);
    while (queue.length) {
        const id = queue.shift();
        visited++;
        for (const s of ed.steps) {
            if ((s.depends_on_step_ids || []).includes(id)) {
                tmpDeg.set(s.id, tmpDeg.get(s.id) - 1);
                if (tmpDeg.get(s.id) === 0) queue.push(s.id);
            }
        }
    }
    if (visited !== ed.steps.length) { setModalError && setModalError('DAG mengandung cycle — tidak bisa disimpan'); return; }
    const roots = ed.steps.filter(s => !s.depends_on_step_ids.length);
    if (ed.steps.length > 0 && roots.length === 0) { setModalError && setModalError('Minimal 1 step harus tanpa dependency (root)'); return; }
    for (const s of ed.steps) {
        if (!s.title || !s.title.trim()) { setModalError && setModalError('Semua step wajib title'); return; }
        if (String(s.activity_type).toLowerCase() === 'pack') { setModalError && setModalError("activity_type='pack' di-reserve untuk auto-gen dari menu.packaging_stack"); return; }
    }

    try {
        let id = ed.id;
        if (id) {
            await api('/api/workflows/' + id, 'PUT', { name, category, description });
        } else {
            const created = await api('/api/workflows', 'POST', { name, category, description });
            id = created.id;
        }
        // Submit steps
        await api('/api/workflows/' + id + '/steps', 'PUT', { steps: ed.steps });
        notifyUi('success', 'Workflow', 'Berhasil disimpan');
        closeModalUi && closeModalUi();
        loadWorkflowsLibrary();
    } catch (e) {
        setModalError && setModalError('Gagal: ' + (e.message || e));
    }
};

window.deleteWorkflow = async function(id, name) {
    if (!confirm(`Hapus workflow "${name}"?`)) return;
    try {
        await api('/api/workflows/' + encodeURIComponent(id), 'DELETE');
        notifyUi('success', 'Workflow', 'Berhasil dihapus');
        loadWorkflowsLibrary();
    } catch (e) {
        const data = e && e.data;
        const blocked = data && (data.code === 'WORKFLOW_IN_USE' || /masih dipakai oleh menu/i.test(String(e.message || '')));
        if (blocked) {
            const again = confirm(
                'Workflow ini masih dipakai oleh minimal satu menu (Food & Menu).\n\n' +
                'OK = lepaskan penautan workflow dari semua menu tersebut lalu hapus workflow (admin).\n' +
                'Batal = biarkan; ubah workflow lewat Edit menu jika tidak ingin melepaskan otomatis.'
            );
            if (!again) return;
            try {
                await api('/api/workflows/' + encodeURIComponent(id) + '?detach=1', 'DELETE');
                notifyUi('success', 'Workflow', 'Berhasil dihapus (penautan workflow pada menu telah dilepas).');
                loadWorkflowsLibrary();
            } catch (e2) {
                notifyUi('danger', 'Gagal', e2.message || String(e2));
            }
            return;
        }
        notifyUi('danger', 'Gagal', e.message || String(e));
    }
};

function wfEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function wfAttr(s) { return wfEscape(s); }

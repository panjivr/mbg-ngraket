
async function loadTasks() {
    const tbody = document.getElementById('tasks-rows');
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Memuat tugas...</td></tr>`;
    try {
        const rows = await api('/api/tasks');
        const html = (rows || []).map(r => {
            const qtyBadge = r.portion_count
                ? `<span class="chip bg-primary text-white" style="font-size:0.7rem;">${r.portion_count} porsi</span>`
                : '';
            let layerBadge = '';
            try {
                const q = r.quantity_detail_json ? JSON.parse(r.quantity_detail_json) : null;
                if (q && q.layer && q.layer.units_total) {
                    layerBadge = `<span class="chip bg-warning" style="font-size:0.7rem;">${q.layer.units_total} ${q.layer.unit || 'pcs'}${q.layer.material ? ' ' + q.layer.material : ''}</span>`;
                }
            } catch (e) { /* ignore */ }
            return `<tr>
                <td>${r.title || '-'}${(qtyBadge || layerBadge) ? '<div class="mt-1 flex gap-1 flex-wrap">' + qtyBadge + layerBadge + '</div>' : ''}</td>
                <td>${r.description || '-'}</td>
                <td>${r.assigned_to_name || '-'}</td>
                <td>${formatDateTime(r.due_date)}</td>
                <td>${r.status || '-'}</td>
                <td>
                    ${r.status !== 'DONE' ? `<button class="btn btn-primary btn-sm" onclick="setTaskStatus('${r.id}','DONE')">Done</button>` : ''}
                </td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html || `<tr><td colspan="6" class="text-muted">Belum ada task</td></tr>`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Gagal memuat tugas: ${e.message}</td></tr>`;
    }
}

async function loadMyTasks() {
    const container = document.getElementById('mytasks-list');
    container.innerHTML = `<div class="text-muted">Loading...</div>`;
    try {
        const resp = await api('/api/tasks/my');
        const list = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.tasks) ? resp.tasks : []);
        const actor = (resp && resp.actor) ? resp.actor : null;

        let headerHtml = '';
        if (actor) {
            const scopeLabel = actor.can_see_all
                ? 'Lihat semua tugas tenant'
                : (actor.division_id
                    ? `Divisi: <strong>${actor.division_id}</strong> + tugas yang ditugaskan ke Anda`
                    : 'Hanya tugas yang ditugaskan ke Anda');
            headerHtml = `
                <div class="text-xs text-muted mb-2">
                    Login sebagai <strong>${actor.role || '-'}</strong> · ${scopeLabel}
                </div>
            `;
        }

        const html = list.map(t => {
            const status = String(t.status || 'PENDING').toUpperCase();
            const isDone = (status === 'DONE' || status === 'COMPLETED');
            const isRunning = (status === 'IN_PROGRESS');
            const timeLabel = t.start_time
                ? formatDateTime(t.start_time)
                : (t.due_date ? `Due: ${formatDateTime(t.due_date)}` : '');
            const divLabel = t.division_id ? `Divisi: ${t.division_id}` : '';
            const completedLabel = isDone && t.completed_at ? `Selesai: ${formatDateTime(t.completed_at)}` : '';
            const portionBadge = t.portion_count
                ? `<span class="chip bg-primary text-white" style="font-size:0.7rem;">${t.portion_count} porsi${t.total_portions ? ' / ' + t.total_portions : ''}</span>`
                : '';
            let layerBadge = '';
            try {
                const q = t.quantity_detail_json ? JSON.parse(t.quantity_detail_json) : null;
                if (q && q.layer && q.layer.units_total) {
                    layerBadge = `<span class="chip bg-warning" style="font-size:0.7rem;">${q.layer.units_total} ${q.layer.unit || 'pcs'}${q.layer.material ? ' ' + q.layer.material : ''}</span>`;
                }
            } catch (e) { /* ignore */ }
            return `
                <div class="card p-3 mb-2 flex justify-between items-center">
                    <div>
                        <div class="font-bold">${t.title || '-'}</div>
                        ${(portionBadge || layerBadge) ? `<div class="flex gap-1 flex-wrap mt-1">${portionBadge}${layerBadge}</div>` : ''}
                        <div class="text-sm text-muted mt-1">${t.description || ''}</div>
                        <div class="text-xs text-muted mt-1">
                            ${[divLabel, timeLabel, completedLabel].filter(Boolean).join(' · ') || '-'}
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="chip ${isDone ? 'bg-success' : (isRunning ? 'bg-info' : 'bg-warning')}">${status}</span>
                        <div class="mt-1">
                            ${!isDone && !isRunning ? `<button class="btn btn-sm btn-secondary" onclick="setTaskStatus('${t.id}','IN_PROGRESS')" title="Mulai">Mulai</button>` : ''}
                            ${!isDone ? `<button class="btn btn-sm btn-primary ml-1" onclick="setTaskStatus('${t.id}','DONE')" title="Tandai selesai"><i class="fas fa-check"></i></button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = headerHtml + (html || `<div class="text-muted">Tidak ada tugas untuk Anda</div>`);
    } catch (e) {
        container.innerHTML = `<div class="text-muted">Gagal load: ${e.message}</div>`;
    }
}

async function openTaskCreate() {
    try {
        const staff = await api('/api/staff');
        const staffOpt = (staff || []).map(s => `<option value="${s.id}">${s.name} (${s.role})</option>`).join('');
        
        openModalUi({
            title: 'Buat Task',
            bodyHtml: `
                <div class="form-grid">
                    <div class="form-full">
                        <label class="input-label">Judul Task</label>
                        <input id="f_task_title" class="input-field" placeholder="Contoh: Belanja Pasar" />
                    </div>
                    <div class="form-full">
                        <label class="input-label">Deskripsi</label>
                        <textarea id="f_task_desc" class="input-field" rows="2"></textarea>
                    </div>
                    <div>
                        <label class="input-label">Assign To</label>
                        <select id="f_task_assign" class="input-field">${staffOpt}</select>
                    </div>
                    <div>
                        <label class="input-label">Due Date</label>
                        <input id="f_task_due" class="input-field" type="datetime-local" />
                    </div>
                </div>
            `,
            actions: [
                { label: 'Batal', className: 'btn btn-secondary btn-sm', onClick: () => closeModalUi() },
                { label: 'Simpan', className: 'btn btn-primary btn-sm', onClick: async () => {
                    try {
                        setModalError('');
                        const title = document.getElementById('f_task_title').value.trim();
                        const description = document.getElementById('f_task_desc').value.trim();
                        const assigned_to_id = document.getElementById('f_task_assign').value;
                        const due = document.getElementById('f_task_due').value;
                        if (!title) return setModalError('Judul wajib');
                        const due_date = due ? new Date(due).toISOString() : null;
                        await api('/api/tasks', 'POST', { title, description, assigned_to_id, due_date });
                        closeModalUi();
                        notifyUi('success', 'Tasks', 'Task dibuat');
                        await loadTasks();
                        await loadMyTasks();
                        await loadDashboard();
                    } catch (e) { setModalError(e.message || 'Gagal simpan'); }
                } }
            ]
        });
    } catch (e) {
        notifyUi('danger', 'Tasks', 'Gagal buka form: ' + e.message);
    }
}

async function setTaskStatus(id, status) {
    try {
        await api(`/api/tasks/${id}/status`, 'PUT', { status });
        notifyUi('success', 'Tasks', 'Status updated');
        // Refresh all potentially affected views
        if (!document.getElementById('tasks-rows').closest('.hidden')) await loadTasks();
        if (!document.getElementById('mytasks-list').closest('.hidden')) await loadMyTasks();
        if (!document.getElementById('dash-tasks-rows').closest('.hidden')) await loadDashboard();
    } catch (e) {
        notifyUi('danger', 'Tasks', 'Gagal update: ' + e.message);
    }
}

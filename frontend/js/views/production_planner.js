
// Production Planner "War Room" (V4 Draft & Publish Workflow)

window._draftData = null;
window._draftConfig = null;

async function openProductionPlanner() {
    const container = document.getElementById('view-production-planner');
    if (!container) return console.error('Planner container not found');

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h3 class="font-bold text-2xl flex items-center gap-2"><i class="fas fa-chess-board text-primary"></i> Production War Room</h3>
                <div class="text-sm text-muted">Draft, Simulate, and Publish Production Plans</div>
            </div>
            <div class="flex gap-2">
                 <button class="btn btn-secondary btn-sm" onclick="loadPlans()"><i class="fas fa-list"></i> List Plans</button>
                 <button class="btn btn-primary btn-sm" onclick="initDraftConfig()"><i class="fas fa-plus"></i> New Draft</button>
            </div>
        </div>

        <div id="planner-workspace" class="flex flex-col gap-4">
            <!-- Draft Config / Result will be rendered here -->
            <div class="card flex items-center justify-center p-12 text-muted bg-dark-lighter border-dashed border-2 border-white/10">
                <div class="text-center">
                    <i class="fas fa-magic fa-3x mb-4 opacity-30"></i>
                    <p class="text-lg">Start by creating a new draft or selecting an existing plan.</p>
                    <button class="btn btn-primary mt-6 px-8" onclick="initDraftConfig()"><i class="fas fa-plus mr-2"></i> Create New Draft</button>
                </div>
            </div>
        </div>
    `;
}

async function initDraftConfig() {
    try {
        const foods = await api('/api/foods'); // Use correct endpoint for foods list
        if (!foods || !foods.length) return notifyUi('warning', 'Planner', 'Buat Food & Menu dulu.');
        
        const opt = foods.map(f => {
            // f.menu_count might not be available directly unless backend returns it, 
            // but usually /api/foods is simple list.
            return `<option value="${f.id}">${f.name}</option>`;
        }).join('');
        
        const today     = new Date().toISOString().slice(0, 10);
        const todayDist = today; // default distribution = same day
        // Default production start: today 03:00 (bisa lintas hari karena pakai datetime-local)
        const defaultProdStart = `${today}T03:00`;
        
        const html = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <!-- Config Panel -->
                <div class="card lg:col-span-1">
                    <h4 class="font-bold mb-4 border-b border-white/10 pb-2 text-primary">1. Configuration</h4>
                    <div class="form-grid">
                        <div class="form-full">
                            <label class="input-label">Food Package</label>
                            <select id="draft_food" class="input-field">${opt}</select>
                        </div>

                        <div class="form-full">
                            <label class="input-label">Tanggal & Jam Mulai Produksi</label>
                            <input id="draft_production_start_dt" type="datetime-local" class="input-field" value="${defaultProdStart}">
                            <div class="text-xs text-muted mt-1">
                                AI menjadwalkan <b>maju dari sini</b>, mempertimbangkan
                                <b>shift tiap divisi</b> (prep → masak → packing → driver),
                                lalu memeriksa apakah semua selesai sebelum
                                <b>jam delivery</b> di wave.
                            </div>
                        </div>

                        <div class="form-full">
                            <label class="input-label">Tanggal Distribusi (default tanggal wave)</label>
                            <input id="draft_distribution_date" type="date" class="input-field" value="${todayDist}"
                                   onchange="draftSyncWaveDates(this.value)">
                            <div class="text-xs text-muted mt-1">
                                Default tanggal untuk setiap wave di bawah. Bisa di-override per wave jika distribusi berbeda hari.
                            </div>
                        </div>
                        
                        <div class="form-full mt-2">
                            <div class="flex justify-between items-center mb-2">
                                <label class="input-label">Delivery Waves</label>
                                <button class="btn btn-secondary btn-xs" onclick="addDraftWaveRow()">+ Add Wave</button>
                            </div>
                            <div class="bg-dark-overlay rounded border border-white/5 p-3 mb-3">
                                <div class="flex justify-between items-center gap-3">
                                    <div style="min-width:200px">
                                        <label class="input-label">Qty Source</label>
                                        <select id="draft_qty_source" class="input-field mt-1" onchange="onDraftQtySourceChanged()">
                                            <option value="manual" selected>Manual</option>
                                            <option value="auto_pm">Auto dari Penerima Manfaat</option>
                                        </select>
                                    </div>
                                    <div style="flex:1">
                                        <div id="draft_pm_info" class="text-xs text-muted"></div>
                                        <button id="draft_fill_from_pm_btn" class="btn btn-secondary btn-xs mt-2" style="display:none" onclick="fillDraftWavesFromPenerimaManfaat()">
                                            <i class="fas fa-wand-magic mr-1"></i> Isi otomatis
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-dark-overlay rounded border border-white/5 overflow-hidden">
                                <table class="w-full text-sm" id="draft_waves_table">
                                    <thead class="bg-white/5 text-xs uppercase text-muted">
                                        <tr>
                                            <th class="p-2 text-left" style="min-width:170px">Tanggal & Jam Delivery</th>
                                            <th class="p-2 text-left" style="width:90px">Qty Porsi</th>
                                            <th class="p-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="draft_waves_tbody">
                                        <!-- Rows -->
                                    </tbody>
                                </table>
                            </div>
                            <div class="text-xs text-muted mt-2 text-right font-bold">
                                Total: <span id="draft_wave_sum" class="text-accent">0</span> Portions
                            </div>
                        </div>

                        <div class="form-full pt-4 border-t border-white/10 flex flex-col gap-2">
                            <button class="btn btn-primary w-full py-3 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all" onclick="runAIPlanner()">
                                <i class="fas fa-robot mr-2"></i> Plan with AI (rule-v1)
                            </button>
                            <div class="text-center">
                                <button class="text-xs text-muted hover:text-white underline bg-transparent border-0 cursor-pointer" onclick="runDraftSimulation()" title="Mode lama — dipakai jika ada masalah dengan AI planner">
                                    mode lama (legacy simulate)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Result Panel -->
                <div class="lg:col-span-2 flex flex-col gap-4">
                    <div class="card h-full min-h-[400px]" id="draft-result-card">
                        <div class="flex flex-col items-center justify-center h-full text-muted opacity-50 py-12">
                            <i class="fas fa-chart-gantt fa-4x mb-4"></i>
                            <p class="text-lg">Hasil plan AI akan muncul di sini</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('planner-workspace').innerHTML = html;
        // Default 2 waves: pakai distribution date + jam default
        addDraftWaveRow(`${todayDist}T06:00`, 500);
        addDraftWaveRow(`${todayDist}T11:00`, 500);
        updateDraftWaveSum();
        
    } catch(e) {
        notifyUi('danger', 'Planner', e.message);
    }
}

/**
 * @param {string} datetime  Full datetime-local value "YYYY-MM-DDTHH:MM" atau hanya "HH:MM".
 *                           Jika hanya waktu, otomatis diprefix dengan tanggal distribusi.
 * @param {number} qty
 */
function addDraftWaveRow(datetime = '', qty = 0) {
    const tbody = document.getElementById('draft_waves_tbody');
    if (!tbody) return;

    // Normalkan ke datetime-local format (YYYY-MM-DDTHH:MM)
    let dtValue = String(datetime).trim();
    if (/^\d{1,2}:\d{2}$/.test(dtValue)) {
        // Hanya jam — prefix dengan tanggal distribusi atau hari ini
        const distDate = document.getElementById('draft_distribution_date')?.value
            || new Date().toISOString().slice(0, 10);
        dtValue = `${distDate}T${dtValue.padStart(5, '0')}`;
    }

    const tr = document.createElement('tr');
    tr.className = "border-b border-white/5 last:border-0";
    tr.innerHTML = `
        <td class="p-1">
            <input type="datetime-local" class="input-field py-1 draft-wave-time" style="min-width:170px" value="${dtValue}">
        </td>
        <td class="p-1">
            <input type="number" class="input-field py-1 h-8 draft-wave-qty text-center" style="width:80px"
                   value="${qty}" min="0" oninput="updateDraftWaveSum()">
        </td>
        <td class="p-1 text-center">
            <button class="text-red-400 hover:text-red-300 transition-colors"
                    onclick="this.closest('tr').remove(); updateDraftWaveSum();">
                <i class="fas fa-times"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    updateDraftWaveSum();
}

/**
 * Sinkronkan bagian tanggal semua wave ke tanggal distribusi baru.
 * Dipanggil saat user mengubah #draft_distribution_date.
 */
window.draftSyncWaveDates = function(newDate) {
    if (!newDate) return;
    document.querySelectorAll('.draft-wave-time').forEach(inp => {
        const cur = String(inp.value || '');
        const timePart = cur.includes('T') ? cur.split('T')[1] : cur;
        if (timePart) inp.value = `${newDate}T${timePart}`;
    });
};

function updateDraftWaveSum() {
    const qtys = document.querySelectorAll('.draft-wave-qty');
    let sum = 0;
    qtys.forEach(el => sum += Number(el.value || 0));
    const sumEl = document.getElementById('draft_wave_sum');
    if (sumEl) sumEl.textContent = sum.toLocaleString();
}

function computePorsiFromPenerimaManfaatForPlanner() {
    if (typeof pmGetAll !== 'function' || typeof pmGetPorsi !== 'function') {
        throw new Error('Fungsi penerima manfaat belum tersedia. Pastikan script `penerima-manfaat.js` sudah ter-load.');
    }
    const lokasiList = pmGetAll('lokasi') || [];
    if (!lokasiList.length) throw new Error('Belum ada data penerima manfaat. Isi dulu di menu `Penerima Manfaat`.');

    let kecil = 0;
    let besar = 0;
    let pj = 0;

    for (const l of lokasiList) {
        const p = pmGetPorsi(l) || { kecil: 0, besar: 0 };
        kecil += parseInt(p.kecil) || 0;
        besar += parseInt(p.besar) || 0;
        if (l.pj_id) pj += 1;
    }

    const total = kecil + besar + pj;
    return { kecil, besar, pj, total };
}

function renderDraftPmInfo() {
    const infoEl = document.getElementById('draft_pm_info');
    if (!infoEl) return;
    try {
        const { kecil, besar, pj, total } = computePorsiFromPenerimaManfaatForPlanner();
        infoEl.textContent = `PM: ${kecil} Kecil | ${besar} Besar | PJ: ${pj} | Total: ${total} Portions`;
        infoEl.style.color = 'var(--text-muted)';
    } catch (e) {
        infoEl.textContent = e.message || 'Gagal menghitung porsi dari penerima manfaat';
        infoEl.style.color = 'var(--warning,#e09800)';
    }
}

window.onDraftQtySourceChanged = function() {
    const src = document.getElementById('draft_qty_source')?.value || 'manual';
    const btn = document.getElementById('draft_fill_from_pm_btn');
    if (!btn) return;

    if (src === 'auto_pm') {
        btn.style.display = 'inline-flex';
        renderDraftPmInfo();
    } else {
        btn.style.display = 'none';
    }
};

window.fillDraftWavesFromPenerimaManfaat = function() {
    const src = document.getElementById('draft_qty_source')?.value || 'manual';
    if (src !== 'auto_pm') return notifyUi('warning', 'Qty Source', 'Pilih dulu mode Auto dari Penerima Manfaat.');

    let pmTotals;
    try {
        pmTotals = computePorsiFromPenerimaManfaatForPlanner();
    } catch (e) {
        return notifyUi('danger', 'Porsi PM', e.message);
    }

    const rows = document.querySelectorAll('#draft_waves_tbody tr');
    const qtyInputs = document.querySelectorAll('.draft-wave-qty');

    const n = Math.max(0, qtyInputs.length || 0);
    if (!n) return notifyUi('warning', 'Waves', 'Belum ada delivery wave. Tambahkan dulu.');

    const total = Math.max(0, pmTotals.total || 0);
    if (!total) return notifyUi('warning', 'Porsi PM', 'Total porsi dari penerima manfaat masih 0.');

    const base = Math.floor(total / n);
    const rem = total % n;

    qtyInputs.forEach((inp, idx) => {
        const q = base + (idx < rem ? 1 : 0);
        inp.value = String(q);
    });

    updateDraftWaveSum();
    notifyUi('success', 'Auto Qty', `Isi otomatis waves = ${total} portions (dibagi ${n} wave).`);
};

async function runDraftSimulation() {
    const foodId = document.getElementById('draft_food').value;
    // Support both old (draft_production_date) and new (draft_production_start_dt) fields
    const prodStartDt    = document.getElementById('draft_production_start_dt')?.value || '';
    const productionDate = prodStartDt ? prodStartDt.slice(0, 10)
        : (document.getElementById('draft_production_date')?.value || '');
    const distributionDate = document.getElementById('draft_distribution_date')?.value || productionDate;
    if (!productionDate)   return notifyUi('warning', 'Simulation', 'Production date wajib diisi');
    if (!distributionDate) return notifyUi('warning', 'Simulation', 'Distribution date wajib diisi');

    // Collect waves (datetime-local)
    const waves = [];
    document.querySelectorAll('#draft_waves_tbody tr').forEach(tr => {
        const tInput = tr.querySelector('.draft-wave-time');
        const qInput = tr.querySelector('.draft-wave-qty');
        if (tInput && qInput) {
            const dtRaw = String(tInput.value || '');
            const q = Number(qInput.value || 0);
            if (dtRaw && q > 0) {
                const targetTime = dtRaw.length >= 16 ? dtRaw + ':00' : `${distributionDate}T${dtRaw}:00`;
                waves.push({ target_time: targetTime, portion_count: q });
            }
        }
    });
    
    if (!waves.length) return notifyUi('warning', 'Simulation', 'Add at least one delivery wave');
    
    const btn = document.querySelector('button[onclick="runDraftSimulation()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Simulating...';
    
    try {
        const payload = {
            food_id: foodId,
            plan_date: productionDate,
            production_date: productionDate,
            distribution_date: distributionDate,
            waves: waves
        };
        
        // Save Draft State first
        const draftRes = await api('/api/plans/draft', 'POST', {
            plan_date: productionDate,
            data: payload
        });
        window._warRoomDraftId = draftRes && draftRes.id ? String(draftRes.id) : null;

        const simulated = await simulateDraftPlan(payload);
        window._warRoomLastSim = simulated;
        window._warRoomLastConfig = payload;
        renderDraftResult(simulated, payload);
        notifyUi('success', 'Simulation', 'Draft simulated successfully');
        
    } catch (e) {
        notifyUi('danger', 'Simulation', e.message);
        const card = document.getElementById('draft-result-card');
        if (card) card.innerHTML = `<div class="text-danger p-4 text-center">Error: ${e.message}</div>`;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

function safeNum(n, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fallback;
}

function addMs(isoOrMs, deltaMs) {
    const t = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
    return t + deltaMs;
}

function toIso(ms) {
    return new Date(ms).toISOString();
}

function pickLine(lines) {
    let bestIdx = 0;
    let best = lines[0] || 0;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i] < best) {
            best = lines[i];
            bestIdx = i;
        }
    }
    return { idx: bestIdx, at: best };
}

function equipRowType(e) {
    return String(e?.type || e?.resource_type || e?.resourceType || '').trim();
}

function equipRowActive(e) {
    const st = String(e?.status ?? '').trim().toUpperCase();
    if (!st) return true;
    if (st === 'ACTIVE' || st === 'READY' || st === 'OPERATIONAL' || st === 'AVAILABLE') return true;
    if (st === 'INACTIVE' || st === 'BROKEN' || st === 'MAINTENANCE' || st === 'DELETED' || st === 'OUT_OF_ORDER' || st === 'DOWN') return false;
    return true;
}

function normalizeShiftClock(t) {
    const s = String(t || '').trim();
    if (!s) return '00:00:00';
    if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
    return s;
}

function coerceShiftsArray(v) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
        if (Array.isArray(v.data)) return v.data;
        if (Array.isArray(v.shifts)) return v.shifts;
        if (Array.isArray(v.rows)) return v.rows;
    }
    return [];
}

function normalizeShiftDivisionKey(raw) {
    const x = String(raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
    const aliases = {
        all: 'all',
        semua: 'all',
        prep: 'prep',
        preparation: 'prep',
        persiapan: 'prep',
        cook: 'cooking',
        cooking: 'cooking',
        pengolahan: 'cooking',
        kitchen: 'cooking',
        pack: 'packing',
        packing: 'packing',
        pemorsian: 'packing',
        portioning: 'packing',
        driver: 'driver',
        pengantaran: 'driver'
    };
    if (aliases[x]) return aliases[x];
    if (x.includes('prep') || x.includes('persiap')) return 'prep';
    if (x.includes('cook') || x.includes('masak') || x.includes('olah')) return 'cooking';
    if (x.includes('pack') || x.includes('porsi')) return 'packing';
    if (x.includes('driver') || x.includes('kirim') || x.includes('antar')) return 'driver';
    if (x.includes('all') || x.includes('semua')) return 'all';
    return x;
}

function plannerTaskTypesForShiftDivision(raw) {
    const d = normalizeShiftDivisionKey(raw);
    if (d === 'all') return ['prep', 'cooking', 'packing', 'driver'];
    if (d === 'prep') return ['prep'];
    if (d === 'cooking') return ['cooking'];
    if (d === 'packing') return ['packing'];
    if (d === 'driver') return ['driver'];
    return [];
}

function mergeOverlappingShiftSegments(raw) {
    if (!raw || !raw.length) return [];
    const segs = [...raw].sort((a, b) => a.startMs - b.startMs);
    const out = [];
    for (const s of segs) {
        if (!out.length || s.startMs > out[out.length - 1].endMs) {
            out.push({ startMs: s.startMs, endMs: s.endMs });
        } else {
            out[out.length - 1].endMs = Math.max(out[out.length - 1].endMs, s.endMs);
        }
    }
    return out;
}

function buildDivisionShiftSegments(planDate, shiftsList) {
    const types = ['prep', 'cooking', 'packing', 'driver'];
    const buckets = Object.fromEntries(types.map(t => [t, []]));
    const rows = coerceShiftsArray(shiftsList);
    for (const sh of rows) {
        const divRaw = sh?.division_id ?? sh?.divisionId;
        const taskTypes = plannerTaskTypesForShiftDivision(divRaw);
        if (!taskTypes.length) continue;
        const stStr = normalizeShiftClock(sh.start_time ?? sh.startTime);
        const enStr = normalizeShiftClock(sh.end_time ?? sh.endTime);
        const dayStart = new Date(`${planDate}T${stStr}`).getTime();
        let dayEnd = new Date(`${planDate}T${enStr}`).getTime();
        if (!Number.isFinite(dayStart) || !Number.isFinite(dayEnd)) continue;
        if (dayEnd <= dayStart) dayEnd += 24 * 60 * 60 * 1000;
        const seg = { startMs: dayStart, endMs: dayEnd };
        for (const tt of taskTypes) buckets[tt].push(seg);
    }
    const out = {};
    for (const tt of types) {
        out[tt] = mergeOverlappingShiftSegments(buckets[tt]);
    }
    return out;
}

function shiftAnchorMs(segments, fallbackMs) {
    if (!segments || !segments.length) return fallbackMs;
    return Math.max(fallbackMs, segments[0].startMs);
}

function placeInShiftSegments(segments, earliestMs, durationMs) {
    if (!Number.isFinite(earliestMs) || durationMs <= 0) {
        const s = earliestMs;
        return { start: s, end: s + durationMs, segmentEnd: null };
    }
    if (!segments || !segments.length) {
        const s = earliestMs;
        return { start: s, end: s + durationMs, segmentEnd: null };
    }
    const DAY_MS = 24 * 60 * 60 * 1000;
    const MAX_DAY_LOOKAHEAD = 14;
    for (let dayOffset = 0; dayOffset <= MAX_DAY_LOOKAHEAD; dayOffset++) {
        const offsetMs = dayOffset * DAY_MS;
        for (const seg of segments) {
            const segStart = seg.startMs + offsetMs;
            const segEnd = seg.endMs + offsetMs;
            const s = Math.max(earliestMs, segStart);
            const e = s + durationMs;
            if (e <= segEnd) return { start: s, end: e, segmentEnd: segEnd };
        }
    }
    const last = segments[segments.length - 1];
    const segStart = last.startMs + MAX_DAY_LOOKAHEAD * DAY_MS;
    const segEnd = last.endMs + MAX_DAY_LOOKAHEAD * DAY_MS;
    const s = Math.max(earliestMs, segStart);
    const e = s + durationMs;
    return { start: s, end: e, segmentEnd: segEnd };
}

function placeInShiftSegmentsStrict(segments, earliestMs, durationMs) {
    const placed = placeInShiftSegments(segments, earliestMs, durationMs);
    if (!segments || !segments.length) return { ...placed, strictOk: false };
    const ok = Number.isFinite(placed.segmentEnd) && placed.end <= placed.segmentEnd;
    return { ...placed, strictOk: ok };
}

function firstPositiveNum(...vals) {
    for (const v of vals) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return NaN;
}

function computeTotalPrepMinutes(menuRow, totalPortions, portionSize) {
    const ings = Array.isArray(menuRow?.ingredients) ? menuRow.ingredients : [];
    let totalMinutes = 0;

    for (const r of ings) {
        const qtyPerPortion = safeNum(r.quantity_per_portion ?? r.quantity ?? 0, 0);
        const requiredQty = qtyPerPortion * totalPortions * Math.max(1, portionSize);

        const addOp = (enabledKey, durKey, outKey) => {
            const enabled = !!r[enabledKey];
            if (!enabled) return;
            const dur = safeNum(r[durKey], 0);
            const out = safeNum(r[outKey], 0);
            if (dur <= 0 || out <= 0 || requiredQty <= 0) return;
            totalMinutes += (requiredQty / out) * dur;
        };

        addOp('washing_enabled', 'washing_duration_minutes', 'washing_output_per_duration');
        addOp('peeling_enabled', 'peeling_duration_minutes', 'peeling_output_per_duration');
        addOp('cutting_enabled', 'cutting_duration_minutes', 'cutting_output_per_duration');
    }

    return Math.max(0, totalMinutes);
}

async function simulateDraftPlan(config) {
    const foodId = String(config?.food_id || '').trim();
    const productionDateRaw = String(config?.production_date || config?.plan_date || '').trim();
    const distributionDateRaw = String(config?.distribution_date || config?.production_date || config?.plan_date || '').trim();
    const wavesIn = Array.isArray(config?.waves) ? [...config.waves] : [];
    if (!foodId) throw new Error('Food Package belum dipilih');
    if (!productionDateRaw) throw new Error('Tanggal produksi belum diisi');
    if (!distributionDateRaw) throw new Error('Tanggal distribusi belum diisi');
    if (!wavesIn.length) throw new Error('Tambahkan minimal 1 delivery wave');

    const normalizeDateToISO = (s) => {
        const t = String(s || '').trim();
        if (!t) return '';
        // Already ISO date
        const isoMatch = t.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) return isoMatch[1];
        // dd/mm/yyyy or dd-mm-yyyy
        const dmyMatch = t.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        // Fallback: try Date parse and re-emit stable ISO date part
        const dt = new Date(t);
        if (Number.isFinite(dt.getTime())) return dt.toISOString().slice(0, 10);
        return t;
    };

    const productionDate = normalizeDateToISO(productionDateRaw);
    const distributionDate = normalizeDateToISO(distributionDateRaw);

    const parseTargetMs = (val) => {
        const s = String(val || '').trim();
        if (!s) return NaN;
        if (/^\d{2}:\d{2}$/.test(s)) return new Date(`${distributionDate}T${s}:00`).getTime();
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return new Date(s).getTime();
        return new Date(s).getTime();
    };

    const waves = wavesIn
        .map(w => ({
            portion_count: Math.max(0, safeNum(w?.portion_count, 0)),
            target_ms: parseTargetMs(w?.target_time),
            target_time_raw: String(w?.target_time || '')
        }))
        .filter(w => w.portion_count > 0 && Number.isFinite(w.target_ms));

    if (!waves.length) throw new Error('Delivery wave tidak valid');
    waves.sort((a, b) => a.target_ms - b.target_ms);

    const totalPortions = waves.reduce((acc, w) => acc + w.portion_count, 0);
    if (totalPortions <= 0) throw new Error('Total porsi harus > 0');

    const [menus, globalCfg, cookCfg, packCfg, prepCfg, schedCfg, equipment, shifts] = await Promise.all([
        api(`/api/foods/${foodId}/menus`),
        api('/api/kitchen/config'),
        api('/api/kitchen/config/cooking'),
        api('/api/kitchen/config/packing'),
        api('/api/kitchen/config/prep').catch(() => ({})),
        api('/api/kitchen/config/scheduler').catch(() => ({})),
        api('/api/kitchen/equipment').catch(() => []),
        api('/api/shifts').catch(() => [])
    ]);

    const menuRows = Array.isArray(menus) ? menus : [];
    if (!menuRows.length) throw new Error('Food Package belum punya menu');

    const warnings = [];

    const schedObj = schedCfg && typeof schedCfg === 'object' && !Array.isArray(schedCfg) ? schedCfg : {};
    const prod = { ...(globalCfg?.production || {}) };
    if (schedObj.production && typeof schedObj.production === 'object') {
        Object.assign(prod, schedObj.production);
    }
    for (const k of ['driver_minutes', 'prep_parallel_limit', 'portion_parallel_limit']) {
        const n = Number(schedObj[k]);
        if (Number.isFinite(n) && n >= 0) prod[k] = n;
    }

    const prepParallel = Math.max(1, safeNum(firstPositiveNum(prod.prep_parallel_limit, prepCfg?.parallel_workers, prepCfg?.max_parallel, prepCfg?.prep_parallel_limit), 2));
    const packParallel = Math.max(1, safeNum(firstPositiveNum(prod.portion_parallel_limit, packCfg?.parallel_lines, packCfg?.max_parallel, packCfg?.portion_parallel_limit), 2));
    const driverMinutes = Math.max(0, safeNum(prod.driver_minutes, 30));

    const setupMinutesDefault = Math.max(0, safeNum(cookCfg?.setup_before_first_batch_minutes, 10));
    const cookBufferMinutes = Math.max(0, safeNum(cookCfg?.batch_buffer_minutes, 10));
    const packRates = packCfg?.rates || {};

    const shiftRows = coerceShiftsArray(shifts);
    const shiftSegments = buildDivisionShiftSegments(productionDate, shiftRows);
    const hasAnyShift = shiftRows.length > 0;
    const strictShiftMode = hasAnyShift;
    if (!hasAnyShift) {
        throw new Error('Data shift tidak ditemukan. Simulasi sekarang mewajibkan shift per divisi agar jadwal tidak fallback ke jam bebas.');
    }
    if (
        hasAnyShift &&
        !shiftSegments.prep.length &&
        !shiftSegments.cooking.length &&
        !shiftSegments.packing.length &&
        !shiftSegments.driver.length
    ) {
        throw new Error('Data shift ada, tetapi tidak ada divisi produksi yang cocok (prep/cooking/packing/driver). Cek value Division di menu Shift.');
    }

    const equipmentRows = Array.isArray(equipment) ? equipment : [];
    const equipById = new Map(equipmentRows.map(e => [String(e.id), e]));
    const cookTypeCounts = new Map();
    for (const e of equipmentRows) {
        if (!equipRowActive(e)) continue;
        const t = equipRowType(e);
        if (!t) continue;
        cookTypeCounts.set(t, (cookTypeCounts.get(t) || 0) + 1);
    }

    const inferToolType = (menuName) => {
        const n = String(menuName || '').trim().toLowerCase();
        if (/\bnasi\b|\bberas\b|\bbubur\b/.test(n)) return 'rice_cooker';
        if (/\bsop\b|\bsayur\b|\brebus\b|\bsemur\b|\bgulai\b|\brendang\b/.test(n)) return 'stock_pot';
        if (/\bgoreng\b|\bfried\b|\bperkedel\b|\btempe\b|\btahu\b/.test(n)) return 'fryer';
        if (/\bsteam\b|\bkukus\b/.test(n)) return 'steamer';
        if (/\bpanggang\b|\boven\b/.test(n)) return 'oven';
        if (/\bikan\b/.test(n)) return 'fryer';
        return 'stock_pot';
    };

    const inferPackagingType = (menuName) => {
        const n = String(menuName || '').trim().toLowerCase();
        if (/\bsusu\b|\bminuman\b|\bteh\b|\bjus\b|\bjelly\b|\bpudding\b/.test(n)) return 'cup';
        if (/\bbuah\b|\bpisang\b|\bjeruk\b|\bmelon\b|\bapel\b/.test(n)) return 'plastik';
        return 'ompreng';
    };

    const getPackRatePerHour = (type) => {
        const t = String(type || '').trim();
        const rate = safeNum(packRates?.[t], 0);
        if (rate > 0) return rate;
        return 500;
    };

    const computePrepMinutesForPortions = (menuRow, portions, portionSize) => {
        const totalPortionsLocal = Math.max(0, safeNum(portions, 0));
        const ps = Math.max(1, safeNum(portionSize, 1));
        if (totalPortionsLocal <= 0) return 0;
        const ings = Array.isArray(menuRow?.ingredients) ? menuRow.ingredients : [];
        let totalMinutes = 0;

        for (const r of ings) {
            const qtyPerPortion = safeNum(r.quantity_per_portion ?? r.quantity ?? 0, 0);
            const requiredQty = qtyPerPortion * totalPortionsLocal * ps;
            const addOp = (enabledKey, durKey, outKey) => {
                const enabled = !!r[enabledKey];
                if (!enabled) return;
                const dur = safeNum(r[durKey], 0);
                const out = safeNum(r[outKey], 0);
                if (dur <= 0 || out <= 0 || requiredQty <= 0) return;
                totalMinutes += (requiredQty / out) * dur;
            };
            addOp('washing_enabled', 'washing_duration_minutes', 'washing_output_per_duration');
            addOp('peeling_enabled', 'peeling_duration_minutes', 'peeling_output_per_duration');
            addOp('cutting_enabled', 'cutting_duration_minutes', 'cutting_output_per_duration');
        }
        return Math.max(0, totalMinutes);
    };

    const metaList = await Promise.all(menuRows.map(async (m) => {
        const recipeId = String(m?.recipe_id || '').trim();
        const wfRid = String(m?.workflow_recipe_id || '').trim();
        const stepsRecipeId = wfRid && wfRid !== recipeId ? wfRid : recipeId;
        const name = String(m?.name || 'Menu');
        const portionSize = Math.max(1, safeNum(m?.portion_size, 1));

        let packagingType = String(m?.packaging_type || '').trim();
        if (!packagingType) packagingType = inferPackagingType(name);

        let extraPacking = m?.extra_packing_json || null;
        if (extraPacking && typeof extraPacking === 'string') {
            try { extraPacking = JSON.parse(extraPacking); } catch { extraPacking = null; }
        }
        if (!extraPacking || typeof extraPacking !== 'object') extraPacking = { enabled: false };

        let steps = [];
        let tools = [];
        if (stepsRecipeId) {
            try { steps = await api(`/api/recipes/${stepsRecipeId}/steps`); } catch { steps = []; }
        }
        if (recipeId) {
            try { tools = await api(`/api/recipes/${recipeId}/tools`); } catch { tools = []; }
        }

        const toolsArr = Array.isArray(tools) ? tools : [];
        const primaryTool = toolsArr
            .filter(t => t && t.tool_id)
            .sort((a, b) => safeNum(b.batch_capacity, 0) - safeNum(a.batch_capacity, 0))[0] || null;

        const toolId = primaryTool ? String(primaryTool.tool_id) : '';
        const toolType = (toolId && equipById.get(toolId)) ? equipRowType(equipById.get(toolId)) : '';
        const inferredToolType = toolType || inferToolType(name);

        const rawCap = safeNum(primaryTool?.batch_capacity ?? m?.batch_capacity, 0);
        const rawDur = safeNum(primaryTool?.batch_duration_minutes ?? m?.cooking_time, 0);
        const batchCap = Math.max(1, rawCap > 0 ? rawCap : 50);
        const cookMin = Math.max(1, rawDur > 0 ? rawDur : 60);

        if (!(rawCap > 0)) warnings.push(`Batch capacity kosong untuk "${name}", pakai default 50.`);
        if (!(rawDur > 0)) warnings.push(`Durasi masak kosong untuk "${name}", pakai default 60 menit.`);

        return {
            menu_id: String(m?.id || ''),
            recipe_id: recipeId,
            steps_recipe_id: stepsRecipeId,
            name,
            portionSize,
            packagingType,
            extraPacking,
            toolType: inferredToolType,
            batchCap,
            cookMin,
            steps: Array.isArray(steps) ? steps : [],
            raw: m
        };
    }));

    const cookPools = new Map();
    const ensureCookPool = (toolType) => {
        const key = String(toolType || '').trim() || 'cooking';
        if (cookPools.has(key)) return cookPools.get(key);
        const n = Math.max(1, safeNum(cookTypeCounts.get(key), 0));
        const pool = Array.from({ length: n }, () => 0);
        cookPools.set(key, pool);
        return pool;
    };

    const earliestTarget = waves[0].target_ms;
    const firstDeadline = earliestTarget - driverMinutes * 60000;

    if (!shiftSegments.cooking.length) throw new Error('Shift Cooking belum ada untuk tanggal produksi. Tambahkan shift dengan division=Cooking di menu HR/Shift.');
    if (!shiftSegments.packing.length) throw new Error('Shift Packing belum ada untuk tanggal produksi. Tambahkan shift dengan division=Packing di menu HR/Shift.');

    const prepAnchor = shiftSegments.prep.length
        ? shiftSegments.prep[0].startMs
        : shiftSegments.cooking[0].startMs;
    const cookAnchor = shiftSegments.cooking[0].startMs;
    const packAnchor = shiftSegments.packing[0].startMs;

    if (!shiftSegments.prep.length) warnings.push('Shift Prep tidak ada; tahap prep dimulai dari awal shift Cooking.');

    const scheduleFloorMs = Math.min(prepAnchor, cookAnchor, packAnchor);

    const fmtAnchor = (ms) => new Date(ms).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    warnings.push(
        `Forward-schedule dari shift: Prep=${fmtAnchor(prepAnchor)}, Cook=${fmtAnchor(cookAnchor)}, Pack=${fmtAnchor(packAnchor)}`
    );

    const prepAvail = Array.from({ length: prepParallel }, () => prepAnchor);
    const packAvail = Array.from({ length: packParallel }, () => packAnchor);
    for (const meta of metaList) ensureCookPool(meta.toolType);
    for (const pool of cookPools.values()) {
        for (let i = 0; i < pool.length; i++) pool[i] = cookAnchor;
    }

    const timeline = [];
    const plannedUnitsByMenu = new Map();
    const lastPackEndByMenu = new Map();
    const waveFinishMs = [];
    const shiftSpill = { prep: false, cooking: false, packing: false };

    const scheduleOnPool = (pool, earliest) => {
        const picked = pickLine(pool);
        const st = Math.max(earliest, picked.at);
        return { idx: picked.idx, start: st };
    };

    const pushTask = (type, title, start, end, batchNo, extra = null) => {
        const base = { type, title, startTime: toIso(start), endTime: toIso(end), batchNo };
        if (extra && typeof extra === 'object') {
            if (extra.menuId != null) base.menuId = extra.menuId;
            if (extra.menuName != null) base.menuName = extra.menuName;
            if (extra.batchPortions != null) base.batchPortions = extra.batchPortions;
            if (extra.activity_type != null) base.activity_type = extra.activity_type;
        }
        timeline.push(base);
    };

    const markSegmentSpill = (segmentEnd, endMs, key) => {
        if (
            segmentEnd != null &&
            Number.isFinite(segmentEnd) &&
            Number.isFinite(endMs) &&
            endMs > segmentEnd + 60000
        ) {
            shiftSpill[key] = true;
        }
    };

    const scheduleBatch = (meta, batchNo, batchPortions) => {
        const units = Math.max(0, safeNum(batchPortions, 0));
        const portions = meta.portionSize > 0 ? (units / meta.portionSize) : units;

        let cursor = scheduleFloorMs;

        // ─── Prep Scheduling (Step-driven if steps exist) ────────────────────
        // Uses meta.steps (from recipe_steps) as main driver so workflow input is not ignored.
        const prepSteps = Array.isArray(meta.steps)
            ? meta.steps.filter(s => String(normalizeShiftDivisionKey(s?.division_id || s?.divisionId || '')).trim() === 'prep')
            : [];

        const rawIngredients = Array.isArray(meta.raw?.ingredients) ? meta.raw.ingredients : [];
        const findIngByName = (name) => {
            const n = String(name || '').trim().toLowerCase();
            if (!n) return null;
            return rawIngredients.find(i => String(i?.ingredient_name || '').trim().toLowerCase() === n) || null;
        };

        const requiredQtyForIng = (qtyPerPortion, portionSize) => {
            // quantity_per_portion is per "menu portion", while `portions` is output porsi.
            // Therefore total menu portion count is: portions * portionSize.
            return safeNum(qtyPerPortion, 0) * safeNum(portions, 0) * Math.max(1, safeNum(portionSize, 1));
        };

        const effectivePrepSegments = shiftSegments.prep && shiftSegments.prep.length ? shiftSegments.prep : shiftSegments.cooking;
        const strictForPrep = strictShiftMode && shiftSegments.prep && shiftSegments.prep.length > 0;

        const isPersiapanBahanOnly =
            prepSteps.length === 1 && /^persiapan bahan$/i.test(String(prepSteps[0]?.title || '').trim());

        const canAutoSplitPrep =
            rawIngredients.some(i => !!i?.washing_enabled || !!i?.peeling_enabled || !!i?.cutting_enabled);

        const buildAutoPrepStepsFromIngredients = () => {
            // Generate steps in stable order: washing -> peeling -> cutting, by ingredient name.
            const sorted = [...rawIngredients].sort((a, b) =>
                String(a?.ingredient_name || '').localeCompare(String(b?.ingredient_name || ''), 'id'),
            );
            const steps = [];
            const pushIfEnabled = (ing, op, enabledKey) => {
                if (!ing || !ing[enabledKey]) return;
                const name = String(ing?.ingredient_name || '').trim();
                if (!name) return;
                steps.push({ title: `${op} ${name}` });
            };
            for (const ing of sorted) pushIfEnabled(ing, 'Washing', 'washing_enabled');
            for (const ing of sorted) pushIfEnabled(ing, 'Peeling', 'peeling_enabled');
            for (const ing of sorted) pushIfEnabled(ing, 'Cutting', 'cutting_enabled');
            return steps;
        };

        const prepStepsToRun =
            isPersiapanBahanOnly && canAutoSplitPrep ? buildAutoPrepStepsFromIngredients() : prepSteps;

        if (prepStepsToRun.length) {
            for (const step of prepStepsToRun) {
                const title = String(step?.title || '').trim();
                if (!title) continue;

                let stepDurMinutes = 0;

                // Aggregate fallback step
                if (/^persiapan bahan$/i.test(title)) {
                    const prepMin = computePrepMinutesForPortions(meta.raw, portions, meta.portionSize);
                    stepDurMinutes = Math.max(0, prepMin);
                } else {
                    const m = /^(washing|peeling|cutting)\s+(.+)$/i.exec(title);
                    if (m) {
                        const op = String(m[1] || '').toLowerCase(); // washing/peeling/cutting
                        const ingName = String(m[2] || '').trim();
                        const ing = findIngByName(ingName);
                        if (ing && ing.ingredient_id) {
                            const qtyPerPortion = safeNum(ing.quantity_per_portion ?? 0, 0);
                            const requiredQty = requiredQtyForIng(qtyPerPortion, meta.portionSize);

                            const durKey = `${op}_duration_minutes`; // washing_duration_minutes
                            const outKey = `${op}_output_per_duration`; // washing_output_per_duration
                            const out = safeNum(ing[outKey] ?? 0, 0);
                            const durFromIng = safeNum(ing[durKey] ?? 0, 0);
                            const durFromStep = safeNum(step?.duration_minutes, 0);
                            const dur = durFromStep > 0 ? durFromStep : durFromIng;

                            if (requiredQty > 0 && out > 0 && dur > 0) {
                                // durationMinutes = (qtyNeeded / throughputPerDuration) * dur
                                stepDurMinutes = (requiredQty / out) * dur;
                            } else {
                                // If mapping/throughput data is incomplete, at least use the edited step duration.
                                stepDurMinutes = safeNum(step?.duration_minutes, 0) || 0;
                            }
                        } else {
                            // Ingredient name mapping failed; fall back to the edited step duration.
                            stepDurMinutes = safeNum(step?.duration_minutes, 0) || 0;
                        }
                    }
                }

                const stepDur = Math.max(0, stepDurMinutes);
                if (stepDur <= 0) continue;

                const pr = scheduleOnPool(prepAvail, cursor);
                const intv = strictForPrep
                    ? placeInShiftSegmentsStrict(effectivePrepSegments, pr.start, stepDur * 60000)
                    : placeInShiftSegments(effectivePrepSegments, pr.start, stepDur * 60000);

                if (strictForPrep && !intv.strictOk) {
                    throw new Error('Shift Prep tidak ditemukan/invalid untuk tanggal produksi.');
                }

                const pStart = intv.start;
                const pEnd = intv.end;
                prepAvail[pr.idx] = pEnd;
                markSegmentSpill(intv.segmentEnd, pEnd, 'prep');
                pushTask('prep', `${title} (Batch ${batchNo})`, pStart, pEnd, batchNo);
                cursor = pEnd;
            }
        } else {
            // Legacy aggregate prep fallback
            const prepMin = computePrepMinutesForPortions(meta.raw, portions, meta.portionSize);
            const prepDur = Math.max(0, prepMin);
            if (prepDur > 0) {
                const pr = scheduleOnPool(prepAvail, cursor);
                const intv = strictForPrep
                    ? placeInShiftSegmentsStrict(effectivePrepSegments, pr.start, prepDur * 60000)
                    : placeInShiftSegments(effectivePrepSegments, pr.start, prepDur * 60000);

                if (strictForPrep && !intv.strictOk) {
                    throw new Error('Shift Prep tidak ditemukan/invalid untuk tanggal produksi.');
                }

                const pStart = intv.start;
                const pEnd = intv.end;
                prepAvail[pr.idx] = pEnd;
                markSegmentSpill(intv.segmentEnd, pEnd, 'prep');
                pushTask('prep', `Prep ${meta.name} (Batch ${batchNo})`, pStart, pEnd, batchNo);
                cursor = pEnd;
            }
        }

        const cookPool = ensureCookPool(meta.toolType);
        const cr = scheduleOnPool(cookPool, cursor);
        let cStart = cr.start;

        const withMenuIfGeneric = (title, genericRe) => {
            const t = String(title || '').trim();
            if (!t) return meta.name ? String(meta.name) : '';
            const hasMenu = meta.name && t.toLowerCase().includes(String(meta.name).trim().toLowerCase());
            if (hasMenu) return t;
            if (genericRe && genericRe.test(t)) return meta.name ? `${t} ${meta.name}` : t;
            return t;
        };

        const divCook = (s) => {
            const d = String(s?.division_id || '').trim().toLowerCase();
            return d === 'cooking' || d === 'cook';
        };
        const setupStep = (Array.isArray(meta.steps) ? meta.steps : []).find(s => divCook(s) && /^setup masak$/i.test(String(s?.title || '').trim()));
        const stepsHasSetup = !!setupStep;
        const setupMin = stepsHasSetup ? Math.max(0, safeNum(setupStep?.duration_minutes, setupMinutesDefault)) : setupMinutesDefault;
        const setupMs = batchNo === 1 && setupMin > 0 ? setupMin * 60000 : 0;

        const cookStep = (Array.isArray(meta.steps) ? meta.steps : []).find(s => divCook(s) && /^masak\\b/i.test(String(s?.title || '').trim()));
        const cookMin = cookStep ? safeNum(cookStep?.duration_minutes, meta.cookMin) : meta.cookMin;
        const cookMs = Math.max(0, cookMin) * 60000;
        const cookBlockMs = setupMs + cookMs;
        const cookIntv = strictShiftMode
            ? placeInShiftSegmentsStrict(shiftSegments.cooking, cStart, cookBlockMs)
            : placeInShiftSegments(shiftSegments.cooking, cStart, cookBlockMs);
        if (strictShiftMode && !cookIntv.strictOk) {
            throw new Error('Shift Cooking tidak ditemukan/invalid untuk tanggal produksi.');
        }
        cStart = cookIntv.start;
        let walk = cStart;
        if (batchNo === 1 && setupMin > 0) {
            const sEnd = walk + setupMs;
            const rawSetupTitle = setupStep && setupStep.title ? String(setupStep.title) : 'Setup Masak';
            const setupTitle = withMenuIfGeneric(rawSetupTitle, /^setup\\s*masak$/i);
            pushTask('cooking', `${setupTitle} (Batch ${batchNo})`, walk, sEnd, batchNo);
            walk = sEnd;
        }

        const cookEnd = walk + cookMs;
        cookPool[cr.idx] = cookEnd + cookBufferMinutes * 60000;
        markSegmentSpill(cookIntv.segmentEnd, cookEnd, 'cooking');
        const rawCookTitle = cookStep && cookStep.title ? String(cookStep.title) : 'Masak';
        const cookTitle = withMenuIfGeneric(rawCookTitle, /^masak\\b/i);
        pushTask('cooking', `${cookTitle} (Batch ${batchNo}, ${units} porsi)`, walk, cookEnd, batchNo, {
            menuId: meta.menu_id,
            menuName: meta.name,
            batchPortions: units,
            activity_type: 'cook'
        });
        cursor = cookEnd;

        // Will be filled by packing scheduling; used for return feasibility calc.
        let packEnd = cursor;

        // ─── Packing Scheduling (step-driven if packing steps exist) ──────
        const packingSteps = Array.isArray(meta.steps)
            ? meta.steps.filter(s => String(normalizeShiftDivisionKey(s?.division_id || s?.divisionId || '')).trim() === 'packing')
            : [];

        const strictForPacking = strictShiftMode && shiftSegments.packing && shiftSegments.packing.length > 0;

        if (packingSteps.length) {
            const extraStep = packingSteps.find(s => /^extra packing$/i.test(String(s?.title || '').trim()) || /extra\\s+packing/i.test(String(s?.title || '')));
            const packStep = packingSteps.find(s => /^packing$/i.test(String(s?.title || '').trim()) || /\\bpacking\\b/i.test(String(s?.title || '')));

            const xpMin = extraStep ? Math.max(0, safeNum(extraStep?.duration_minutes, 0)) : Math.max(0, safeNum(meta.extraPacking?.duration_minutes, 0));
            const shouldDoExtra = (meta.extraPacking && meta.extraPacking.enabled === true) || !!extraStep;
            if (shouldDoExtra && xpMin > 0) {
                const xpIntv = strictForPacking
                    ? placeInShiftSegmentsStrict(shiftSegments.packing, cursor, xpMin * 60000)
                    : placeInShiftSegments(shiftSegments.packing, cursor, xpMin * 60000);
                if (strictForPacking && !xpIntv.strictOk) {
                    throw new Error('Shift Packing tidak ditemukan/invalid untuk tanggal produksi.');
                }
                const xpStart = xpIntv.start;
                const xpEnd = xpIntv.end;
                markSegmentSpill(xpIntv.segmentEnd, xpEnd, 'packing');
                const rawXpTitle = String(extraStep?.title || 'Extra Packing');
                const xpTitle = withMenuIfGeneric(rawXpTitle, /^extra\\s*packing$/i);
                pushTask('packing', `${xpTitle} (Batch ${batchNo})`, xpStart, xpEnd, batchNo);
                cursor = xpEnd;
            }

            const packMinOverride = packStep ? Math.max(0, safeNum(packStep?.duration_minutes, 0)) : 0;
            const ratePerHour = getPackRatePerHour(meta.packagingType);
            const ratePerMin = ratePerHour / 60;
            const packMinRate = ratePerMin > 0 ? (units / ratePerMin) : 0;
            const finalPackMin = packMinOverride > 0 ? packMinOverride : packMinRate;
            const packDur = Math.max(1, Math.ceil(finalPackMin));

            const pk = scheduleOnPool(packAvail, cursor);
            const pkIntv = strictForPacking
                ? placeInShiftSegmentsStrict(shiftSegments.packing, pk.start, packDur * 60000)
                : placeInShiftSegments(shiftSegments.packing, pk.start, packDur * 60000);
            if (strictForPacking && !pkIntv.strictOk) {
                throw new Error('Shift Packing tidak ditemukan/invalid untuk tanggal produksi.');
            }
            const packStart = pkIntv.start;
            packEnd = pkIntv.end;
            packAvail[pk.idx] = packEnd;
            markSegmentSpill(pkIntv.segmentEnd, packEnd, 'packing');
            const rawPackTitle = String(packStep?.title || 'Packing');
            const packTitle = withMenuIfGeneric(rawPackTitle, /^packing$/i);
            pushTask('packing', `${packTitle} (Batch ${batchNo})`, packStart, packEnd, batchNo);
        } else {
            // Legacy packing fallback
            const xpEnabled = meta.extraPacking && meta.extraPacking.enabled === true;
            if (xpEnabled) {
                const xpMin = Math.max(0, safeNum(meta.extraPacking.duration_minutes, 0));
                if (xpMin > 0) {
                    const xpIntv = strictShiftMode
                        ? placeInShiftSegmentsStrict(shiftSegments.packing, cursor, xpMin * 60000)
                        : placeInShiftSegments(shiftSegments.packing, cursor, xpMin * 60000);
                    if (strictShiftMode && !xpIntv.strictOk) {
                        throw new Error('Shift Packing tidak ditemukan/invalid untuk tanggal produksi.');
                    }
                    const xpStart = xpIntv.start;
                    const xpEnd = xpIntv.end;
                    markSegmentSpill(xpIntv.segmentEnd, xpEnd, 'packing');
                    pushTask('packing', `Extra Packing ${meta.name} (Batch ${batchNo})`, xpStart, xpEnd, batchNo);
                    cursor = xpEnd;
                }
            }

            const ratePerHour = getPackRatePerHour(meta.packagingType);
            const ratePerMin = ratePerHour / 60;
            const packMin = ratePerMin > 0 ? (units / ratePerMin) : 0;
            const packDur = Math.max(1, Math.ceil(packMin));

            const pk = scheduleOnPool(packAvail, cursor);
            const pkIntv = strictShiftMode
                ? placeInShiftSegmentsStrict(shiftSegments.packing, pk.start, packDur * 60000)
                : placeInShiftSegments(shiftSegments.packing, pk.start, packDur * 60000);
            if (strictShiftMode && !pkIntv.strictOk) {
                throw new Error('Shift Packing tidak ditemukan/invalid untuk tanggal produksi.');
            }
            const packStart = pkIntv.start;
            packEnd = pkIntv.end;
            packAvail[pk.idx] = packEnd;
            markSegmentSpill(pkIntv.segmentEnd, packEnd, 'packing');
            pushTask('packing', `Packing ${meta.name} (Batch ${batchNo})`, packStart, packEnd, batchNo);
        }

        return { packEndMs: packEnd };
    };

    for (let w = 0; w < waves.length; w++) {
        const wave = waves[w];
        const cumulative = waves.slice(0, w + 1).reduce((a, x) => a + x.portion_count, 0);

        const pending = [];
        for (const meta of metaList) {
            const needUnits = cumulative * meta.portionSize;
            const alreadyUnits = plannedUnitsByMenu.get(meta.menu_id) || 0;
            let addUnits = Math.max(0, needUnits - alreadyUnits);
            if (addUnits <= 0) continue;
            let batchNo = Math.floor(alreadyUnits / meta.batchCap) + 1;
            while (addUnits > 0) {
                const units = Math.min(meta.batchCap, addUnits);
                pending.push({ meta, batchNo, units });
                addUnits -= units;
                batchNo += 1;
            }
        }

        pending.sort((a, b) => (b.meta.cookMin - a.meta.cookMin) || String(a.meta.name).localeCompare(String(b.meta.name)));

        for (const p of pending) {
            const res = scheduleBatch(p.meta, p.batchNo, p.units);
            plannedUnitsByMenu.set(p.meta.menu_id, (plannedUnitsByMenu.get(p.meta.menu_id) || 0) + p.units);
            lastPackEndByMenu.set(p.meta.menu_id, res.packEndMs);
        }

        let waveFinish = 0;
        for (const meta of metaList) waveFinish = Math.max(waveFinish, safeNum(lastPackEndByMenu.get(meta.menu_id), scheduleFloorMs));
        waveFinishMs.push(waveFinish);
    }

    const deadlines = waves.map(w => w.target_ms - driverMinutes * 60000);
    const slackMsList = deadlines.map((d, i) => d - (waveFinishMs[i] || 0));
    const worstSlackMs = slackMsList.length ? Math.min(...slackMsList) : 0;
    const feasible = worstSlackMs >= -60000;
    const worstSlack = Math.floor(worstSlackMs / 60000);

    if (shiftSpill.prep) warnings.push('Beberapa tugas Prep melewati akhir shift Prep.');
    if (shiftSpill.cooking) warnings.push('Beberapa tugas Masak melewati akhir shift Cooking.');
    if (shiftSpill.packing) warnings.push('Beberapa tugas Packing melewati akhir shift Packing.');

    for (let i = 0; i < waves.length; i++) {
        const tStart = waves[i].target_ms - driverMinutes * 60000;
        pushTask('driver', `Delivery Wave ${i + 1} (${waves[i].portion_count} porsi)`, tStart, waves[i].target_ms, i + 1);
    }

    if (setupMinutesDefault < 0 || cookBufferMinutes < 0) warnings.push('Config cooking tidak valid (angka negatif).');
    if (!equipmentRows.length) warnings.push('Data alat masak belum ada. Scheduler memakai asumsi minimal 1 alat per tipe.');
    for (const meta of metaList) {
        if (!meta.recipe_id) warnings.push(`Menu "${meta.name}" belum terhubung recipe_id.`);
        if (!meta.packagingType) warnings.push(`Packaging type kosong untuk "${meta.name}", pakai default rate.`);
        const rate = getPackRatePerHour(meta.packagingType);
        if (!(rate > 0)) warnings.push(`Packing rate tidak valid untuk "${meta.packagingType}".`);
        const cookCount = cookTypeCounts.get(meta.toolType);
        if (!cookCount) warnings.push(`Alat masak tipe "${meta.toolType}" belum ada (menu: ${meta.name}).`);
    }

    return {
        feasibility: {
            status: feasible ? 'FEASIBLE' : 'NOT FEASIBLE',
            slack_minutes: worstSlack
        },
        timeline,
        warnings: [...new Set(warnings)]
    };
}

async function runAIPlanner() {
    try {
        const foodId = document.getElementById('draft_food').value;
        // Production start: datetime-local "YYYY-MM-DDTHH:MM"
        const prodStartDt = document.getElementById('draft_production_start_dt')?.value || null;
        const distDate    = document.getElementById('draft_distribution_date')?.value || '';
        // planDate = tanggal DISTRIBUSI (bukan tanggal produksi).
        // Shift windows di-anchor ke hari distribusi; engine lookBackDays=1 sudah
        // mencakup produksi malam sebelumnya. Kalau tidak ada distDate, fallback
        // ke tanggal production start.
        const planDate    = distDate || (prodStartDt ? prodStartDt.slice(0, 10) : '');
        // ISO full string untuk engine (tambah detik + Z? Jangan — engine pakai local.
        // Biarkan "YYYY-MM-DDTHH:MM:00" tanpa Z supaya diparse sebagai local time
        // browser; server juga akan parse dengan tzOffsetMinutes yang dikirim header.
        const prodStart   = prodStartDt ? (prodStartDt + ':00') : null;

        if (!foodId)   return notifyUi('warning', 'AI Planner', 'Pilih Food terlebih dahulu');
        if (!planDate) return notifyUi('warning', 'AI Planner', 'Tentukan Tanggal Distribusi');
        if (!prodStart) return notifyUi('warning', 'AI Planner', 'Tentukan Tanggal & Jam Mulai Produksi');

        const waves = [];
        const rows = document.querySelectorAll('#draft_waves_tbody tr');
        rows.forEach((row, idx) => {
            // Nilai dari datetime-local: "YYYY-MM-DDTHH:MM"
            const dtRaw = row.querySelector('.draft-wave-time')?.value || '';
            const q = Number(row.querySelector('.draft-wave-qty')?.value || 0);
            if (dtRaw && q > 0) {
                // Kirim full datetime (YYYY-MM-DDTHH:MM:00) sebagai delivery_time
                // agar server TIDAK memaksa tanggalnya ke planDate.
                const deliveryFull = dtRaw.length >= 16 ? dtRaw + ':00' : dtRaw;
                const timeOnly     = dtRaw.includes('T') ? dtRaw.split('T')[1] : dtRaw;
                waves.push({
                    wave_number: idx + 1,
                    delivery_time: deliveryFull,        // full ISO → server pakai apa adanya
                    delivery_datetime: deliveryFull,    // backup field
                    delivery_hhmm: timeOnly,            // info saja
                    portion_count: q
                });
            }
        });
        if (!waves.length) return notifyUi('warning', 'AI Planner', 'Minimal 1 wave dengan qty > 0');

        // Validasi: delivery harus SETELAH production start
        const psMs = new Date(prodStart).getTime();
        for (const w of waves) {
            const dMs = new Date(w.delivery_time).getTime();
            if (isFinite(psMs) && isFinite(dMs) && dMs <= psMs) {
                return notifyUi('warning', 'AI Planner',
                    `Wave ${w.wave_number}: jam delivery harus lebih lambat dari jam mulai produksi.`);
            }
        }

        const card = document.getElementById('draft-result-card');
        if (card) card.innerHTML = '<div class="flex items-center justify-center py-16 text-muted"><i class="fas fa-spinner fa-spin fa-3x mr-3"></i><span class="text-lg">AI sedang menyusun rencana...</span></div>';

        // Simpan draft lebih dulu agar dapat draftId untuk Publish & Material step
        const wavesForDraft = waves.map(w => ({
            wave_number: w.wave_number,
            portion_count: w.portion_count,
            target_time: w.delivery_datetime || w.delivery_time,
            delivery_time: w.delivery_time
        }));
        const draftPayload = {
            food_id: foodId,
            production_date: planDate,
            distribution_date: distDate,
            production_start_time: prodStart,
            waves: wavesForDraft,
            source: 'ai-planner'
        };
        let draftId = window._warRoomDraftId || null;
        try {
            const draftRes = await api('/api/plans/draft', 'POST', draftPayload);
            draftId = draftRes && draftRes.id ? draftRes.id : draftId;
            window._warRoomDraftId = draftId;
        } catch (e) {
            // Draft save gagal tidak halangi AI — tapi publish nanti akan error
            notifyUi('warning', 'Draft', 'Draft tidak tersimpan: ' + (e.message || e) + ' — fitur Publish mungkin tidak tersedia.');
        }

        const ctx = { foodId, planDate, distDate, prodStart, waves: wavesForDraft, draftId };
        window._warRoomLastConfig = { food_id: foodId, production_date: planDate, distribution_date: distDate, waves: wavesForDraft };
        window._draftConfig       = window._warRoomLastConfig;

        const food = await api(`/api/foods/${foodId}`).catch(() => null);
        const foodMenus = (food && Array.isArray(food.menus)) ? food.menus : [];
        if (!foodMenus.length) {
            const menus = await api(`/api/menu?food_id=${foodId}`).catch(() => []);
            if (Array.isArray(menus)) menus.forEach(m => foodMenus.push({ id: m.id, name: m.name }));
        }
        if (!foodMenus.length) { if (card) card.innerHTML = '<div class="text-danger p-6">Food ini tidak punya menu.</div>'; return; }

        const results = [];
        for (const m of foodMenus) {
            const body = { menu_id: m.id, plan_date: planDate, production_start_time: prodStart, waves, distribution_date: distDate, engineVersion: 'rule-v1' };
            try {
                const r = await api('/api/plans/draft/plan-ai', 'POST', body);
                results.push({ menu: m, result: r });
            } catch (e) {
                results.push({ menu: m, result: { error: e.message } });
            }
        }

        // ── FINAL PACKING (food-level) ──────────────────────────────────────────
        // Setelah semua menu timeline selesai, jadwalkan final-pack di divisi
        // packing yang menggabungkan seluruh menu ke 1 wadah (ompreng/stereofoam/
        // spunbound/plastik oval, dst). Mulai dari max(endTime semua menu timeline).
        let finalPackResult = null;
        try {
            // Cari latest endTime dari semua menu timeline yang feasible
            let latestEndIso = null;
            let latestEndMs  = 0;
            for (const r of results) {
                const tl = r?.result?.timeline || [];
                for (const t of tl) {
                    const ms = new Date(t.endTime || t.endIso || 0).getTime();
                    if (ms > latestEndMs) { latestEndMs = ms; latestEndIso = t.endTime || t.endIso; }
                }
            }
            const totalPortions = waves.reduce((s, w) => s + Number(w.portion_count || 0), 0);
            if (latestEndIso && totalPortions > 0) {
                finalPackResult = await api('/api/plans/draft/plan-ai-finalpack', 'POST', {
                    food_id: foodId,
                    plan_date: planDate,                 // distribusi
                    ready_after_time: latestEndIso,
                    total_portions: totalPortions,
                    batch_capacity: 50
                });
            }
        } catch (e) {
            console.warn('Final pack scheduling gagal:', e);
            finalPackResult = { error: e.message, timeline: [], warnings: ['Final pack gagal dijadwalkan: ' + e.message] };
        }

        // Re-check feasibility vs delivery SETELAH final pack ditambahkan
        // (timeline end bisa bergeser → mungkin lewat wave paling awal)
        if (finalPackResult && Array.isArray(finalPackResult.timeline) && finalPackResult.timeline.length) {
            const fpLatestEnd = Math.max(...finalPackResult.timeline.map(t => new Date(t.endTime).getTime()));
            const earliestWaveMs = Math.min(...waves.map(w => new Date(w.delivery_time).getTime()).filter(t => !isNaN(t)));
            if (isFinite(fpLatestEnd) && isFinite(earliestWaveMs) && fpLatestEnd > earliestWaveMs) {
                finalPackResult.feasibility = { status: 'NOT_FEASIBLE' };
                (finalPackResult.warnings = finalPackResult.warnings || []).push(
                    `Final packing baru selesai ${new Date(fpLatestEnd).toLocaleString('id-ID')} — melewati wave paling awal ${new Date(earliestWaveMs).toLocaleString('id-ID')}.`
                );
            }
        }

        renderAIPlannerResult(results, ctx, finalPackResult);
    } catch (e) {
        notifyUi('danger', 'AI Planner', e.message);
        const card = document.getElementById('draft-result-card');
        if (card) card.innerHTML = `<div class="text-danger p-6"><b>Gagal:</b> ${e.message}</div>`;
    }
}

function renderAIPlannerResult(results, ctx, finalPackResult) {
    const card = document.getElementById('draft-result-card');
    if (!card) return;
    const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
    const fmtFull = (iso) => { try { return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

    const menusFeasible = results.length > 0 && results.every(r => r.result && r.result.feasibility && r.result.feasibility.status === 'FEASIBLE');
    const fpFeasible    = !finalPackResult || !finalPackResult.feasibility || finalPackResult.feasibility.status === 'FEASIBLE';
    const allFeasible   = menusFeasible && fpFeasible;
    const anyError      = results.some(r => r.result && r.result.error) || (finalPackResult && finalPackResult.error);

    // ── Gabungkan semua timeline ke format yang dipakai commit endpoint ──────
    // commit expects: { type (divisionId), title, startTime, endTime, batchNo }
    const combinedTimeline = [];
    results.forEach(({ menu, result }) => {
        if (!result || result.error || !Array.isArray(result.timeline)) return;
        result.timeline.forEach(t => {
            const mid = menu && menu.id != null && String(menu.id).trim() ? String(menu.id) : null;
            combinedTimeline.push({
                type:      t.divisionId || t.activity_type || 'prep',
                title:     `${t.stepTitle || t.stepId}${menu.name ? ' — ' + menu.name : ''}`,
                startTime: t.startTime,
                endTime:   t.endTime,
                batchNo:   t.batchIndex || 1,
                batchCount: t.batchCount || null,
                batchPortions: t.batchPortions != null ? t.batchPortions : null,
                batchCapacity: t.batchCapacity != null ? t.batchCapacity : null,
                totalPortions: t.totalPortions != null ? t.totalPortions : null,
                layer: t.layer || null,
                // Harus null eksplisit: JSON.stringify buang properti jika `menu.id` undefined → server tidak dapat menuName-only fallback
                menuId:    mid,
                menuName:  menu && menu.name != null ? String(menu.name) : null,
                activity_type: t.activity_type
            });
        });
    });

    // Append final-pack (food-level) ke combinedTimeline
    if (finalPackResult && Array.isArray(finalPackResult.timeline)) {
        finalPackResult.timeline.forEach(t => {
            combinedTimeline.push({
                type:      'packing',
                title:     `[FINAL PACK] ${t.stepTitle || 'Final Packing'}`,
                startTime: t.startTime,
                endTime:   t.endTime,
                batchNo:   t.batchIndex || 1,
                batchCount: t.batchCount || null,
                batchPortions: t.batchPortions != null ? t.batchPortions : null,
                batchCapacity: t.batchCapacity != null ? t.batchCapacity : null,
                totalPortions: t.totalPortions != null ? t.totalPortions : null,
                layer: t.layer || null,
                menuId:    null,
                menuName:  '(Food-level)',
                activity_type: 'pack',
                isFinalPack: true
            });
        });
    }

    // Simpan ke globals supaya Publish, Hitung Material, dan PO bisa dipakai
    const allWarnings = [
        ...results.flatMap(r => (Array.isArray(r.result?.warnings) ? r.result.warnings : [])),
        ...((finalPackResult && Array.isArray(finalPackResult.warnings)) ? finalPackResult.warnings : [])
    ];
    window._warRoomLastSim = {
        feasibility: { status: allFeasible ? 'FEASIBLE' : 'NOT_FEASIBLE', slack_minutes: 0 },
        timeline: combinedTimeline,
        warnings: allWarnings,
        finalPack: finalPackResult || null
    };

    // ── HTML: header + action buttons ───────────────────────────────────────
    const badge = allFeasible
        ? '<span class="badge badge-success"><i class="fas fa-check mr-1"></i>FEASIBLE</span>'
        : '<span class="badge badge-danger"><i class="fas fa-times mr-1"></i>NOT FEASIBLE</span>';

    const publishBtn = `<button class="btn btn-success" onclick="commitDraftToJobdesc()"><i class="fas fa-rocket mr-1"></i> Publish ke Jobdesc</button>`;
    const materialBtn = allFeasible
        ? `<button class="btn btn-primary" onclick="openMaterialCalcStep()"><i class="fas fa-calculator mr-1"></i> Hitung Material</button>`
        : '';

    const actionRow = anyError
        ? `<div class="text-xs text-danger">Ada error pada salah satu menu — perbaiki resep/workflow dahulu.</div>`
        : `<div class="flex flex-wrap gap-2">${materialBtn}${publishBtn}</div>`;

    // ── HTML: per-menu detail ─────────────────────────────────────────────────
    let menusHtml = '';
    results.forEach(({ menu, result }) => {
        menusHtml += `<div class="mb-4 border border-white/10 rounded-lg overflow-hidden">`;
        menusHtml += `<div class="bg-white/5 px-4 py-2 flex justify-between items-center flex-wrap gap-2">
            <b class="text-sm">Menu: ${menu.name || menu.id}</b>`;

        if (result.error) {
            menusHtml += `<span class="badge badge-danger">ERROR</span></div>
                <div class="p-3 text-danger text-xs">${result.error}</div></div>`;
            return;
        }

        const f = result.feasibility || {};
        const fBadge = f.status === 'FEASIBLE'
            ? `<span class="badge badge-success text-xs">FEASIBLE</span>`
            : `<span class="badge badge-danger text-xs">${f.status || 'UNKNOWN'}</span>`;
        menusHtml += `<div class="flex items-center gap-2">${fBadge}<span class="text-xs text-muted">slack ${f.slackMinutes ?? f.slack_minutes ?? 0}m</span></div></div>`;

        if (Array.isArray(result.warnings) && result.warnings.length) {
            menusHtml += `<div class="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
                <div class="font-bold text-yellow-400 text-xs mb-1"><i class="fas fa-triangle-exclamation"></i> Warnings</div>
                <ul class="list-disc list-inside text-xs text-yellow-200">${result.warnings.map(w => `<li>${typeof w === 'string' ? w : JSON.stringify(w)}</li>`).join('')}</ul>
            </div>`;
        }

        if (Array.isArray(result.proposals) && result.proposals.length) {
            menusHtml += `<div class="px-4 py-2 bg-orange-500/10 border-b border-orange-500/20">
                <div class="font-bold text-orange-400 text-xs mb-2"><i class="fas fa-lightbulb"></i> Proposals dari AI</div>
                ${result.proposals.map((p, i) => `<div class="text-xs mb-1 pl-2 border-l-2 border-orange-400">
                    ${i + 1}. <b>${p.kind || p.type || ''}</b>: ${p.reason || p.description || JSON.stringify(p)}
                </div>`).join('')}
            </div>`;
        }

        const timeline = Array.isArray(result.timeline) ? result.timeline : [];
        if (!timeline.length) {
            menusHtml += `<div class="p-3 text-muted text-xs">Tidak ada jadwal.</div></div>`;
            return;
        }

        // Group by division untuk tampilan
        const byDiv = {};
        timeline.forEach(t => {
            const k = t.divisionName || t.divisionId || '—';
            if (!byDiv[k]) byDiv[k] = [];
            byDiv[k].push(t);
        });

        // Ringkasan per-menu: total porsi + batch
        const menuTotalPortions = timeline.reduce((m, t) => Math.max(m, Number(t.totalPortions || 0)), 0);
        const menuBatchCount = timeline.reduce((m, t) => Math.max(m, Number(t.batchCount || 0)), 0);
        if (menuTotalPortions || menuBatchCount) {
            menusHtml += `<div class="px-4 py-2 bg-white/5 border-b border-white/5 text-xs flex flex-wrap gap-x-4 gap-y-1">
                ${menuTotalPortions ? `<span><b class="text-primary">Total porsi:</b> ${menuTotalPortions.toLocaleString('id-ID')}</span>` : ''}
                ${menuBatchCount ? `<span><b class="text-primary">Jumlah batch:</b> ${menuBatchCount}</span>` : ''}
            </div>`;
        }

        menusHtml += `<div class="p-3">`;
        Object.entries(byDiv).forEach(([div, tasks]) => {
            tasks.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            // Total porsi terjadwal di divisi ini (= sum batchPortions)
            const divPortions = tasks.reduce((s, t) => s + (Number(t.batchPortions) || 0), 0);
            menusHtml += `<div class="mb-3">
                <div class="font-bold text-xs text-primary mb-1 uppercase tracking-wide flex flex-wrap items-center gap-2">
                    <span>${div}</span>
                    <span class="text-muted font-normal">(${tasks.length} task${divPortions ? ' · ' + divPortions.toLocaleString('id-ID') + ' porsi' : ''})</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead class="text-muted bg-white/5">
                            <tr>
                                <th class="p-1 text-left">Step</th>
                                <th class="p-1">Batch</th>
                                <th class="p-1">Jumlah</th>
                                <th class="p-1">Mulai</th>
                                <th class="p-1">Selesai</th>
                                <th class="p-1">Durasi</th>
                            </tr>
                        </thead>
                        <tbody>`;
            let cumulative = 0;
            tasks.forEach(t => {
                const dur = t.startTime && t.endTime
                    ? Math.round((new Date(t.endTime) - new Date(t.startTime)) / 60000) : 0;
                const startDisp = fmtTime(t.startTime);
                const endDisp   = fmtTime(t.endTime);
                const bPort = Number(t.batchPortions) || 0;
                cumulative += bPort;
                const totalP = Number(t.totalPortions) || 0;
                const batchNum = t.batchIndex ?? '-';
                const batchTot = t.batchCount ? `/${t.batchCount}` : '';
                let qtyCell = '-';
                if (bPort) {
                    const layerStr = (t.layer && t.layer.units_total)
                        ? `<div class="text-[10px] text-muted">${t.layer.units_total} ${t.layer.unit || 'pcs'}${t.layer.material ? ' · ' + t.layer.material : ''}</div>`
                        : '';
                    const cumStr = totalP
                        ? `<div class="text-[10px] text-muted">kumulatif ${cumulative}/${totalP}</div>`
                        : '';
                    qtyCell = `<div><b>${bPort}</b> porsi</div>${layerStr}${cumStr}`;
                }
                menusHtml += `<tr class="border-b border-white/5 hover:bg-white/3">
                    <td class="p-1">${t.stepTitle || t.stepId || '-'}</td>
                    <td class="p-1 text-center">${batchNum}${batchTot}</td>
                    <td class="p-1 text-center">${qtyCell}</td>
                    <td class="p-1 text-center font-mono">${startDisp}</td>
                    <td class="p-1 text-center font-mono">${endDisp}</td>
                    <td class="p-1 text-center">${dur}m</td>
                </tr>`;
            });
            menusHtml += `</tbody></table></div></div>`;
        });
        menusHtml += `</div></div>`;
    });

    // ── Final Packing (food-level) section ─────────────────────────────────
    let finalPackHtml = '';
    if (finalPackResult && !finalPackResult.error) {
        const fpBadge = fpFeasible
            ? `<span class="badge badge-success text-xs">FEASIBLE</span>`
            : `<span class="badge badge-danger text-xs">NOT FEASIBLE</span>`;
        const stack = Array.isArray(finalPackResult.stack) ? finalPackResult.stack : [];
        const fpTimeline = Array.isArray(finalPackResult.timeline) ? finalPackResult.timeline : [];

        finalPackHtml = `
        <div class="mb-4 border-2 border-amber-500/40 rounded-lg overflow-hidden bg-amber-500/5">
            <div class="bg-amber-500/15 px-4 py-2 flex justify-between items-center flex-wrap gap-2">
                <b class="text-sm text-amber-300">
                    <i class="fas fa-box mr-1"></i>Final Packing (Food-level, semua menu digabung)
                </b>
                <div class="flex items-center gap-2">${fpBadge}<span class="text-xs text-muted">${fpTimeline.length} task</span></div>
            </div>`;

        const totalPortionsFP = Number(finalPackResult.totalPortions || 0);
        const batchCountFP    = Number(finalPackResult.batchCount || 0);
        const batchCapFP      = Number(finalPackResult.batchCapacity || 0);
        const layerTotals     = Array.isArray(finalPackResult.layerTotals) ? finalPackResult.layerTotals : [];

        if (totalPortionsFP || batchCountFP) {
            finalPackHtml += `<div class="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs flex flex-wrap gap-x-4 gap-y-1">
                ${totalPortionsFP ? `<span><b class="text-amber-300">Total porsi:</b> ${totalPortionsFP.toLocaleString('id-ID')}</span>` : ''}
                ${batchCountFP ? `<span><b class="text-amber-300">Batch:</b> ${batchCountFP}${batchCapFP ? ' × ' + batchCapFP + ' porsi' : ''}</span>` : ''}
            </div>`;
        }

        if (stack.length) {
            const stackRows = stack.map((l, i) => {
                const lt = layerTotals[i];
                const speedTxt = (Number(l.units_per_hour) > 0)
                    ? `${l.units_per_hour}/jam`
                    : (Number(l.duration_minutes) > 0 ? `${l.duration_minutes}m/batch` : '—');
                const totalTxt = lt
                    ? `<b>${lt.units_total.toLocaleString('id-ID')}</b> ${lt.unit || ''}${lt.material ? ' (' + lt.material + ')' : ''}`
                    : `${l.material || ''}`;
                return `<tr class="border-b border-white/5">
                    <td class="p-1 text-center">${i + 1}</td>
                    <td class="p-1">${l.material || '-'}</td>
                    <td class="p-1 text-center">${l.quantity || 1} ${l.unit || 'pcs'}/porsi</td>
                    <td class="p-1 text-center font-mono text-[11px]">${speedTxt}</td>
                    <td class="p-1 text-right">${totalTxt}</td>
                </tr>`;
            }).join('');
            finalPackHtml += `<div class="px-4 py-2 border-b border-amber-500/20 text-xs">
                <b class="text-amber-300">Stack & Kebutuhan Total:</b>
                <div class="overflow-x-auto mt-1">
                    <table class="w-full text-xs">
                        <thead class="text-muted bg-white/5">
                            <tr>
                                <th class="p-1">#</th>
                                <th class="p-1 text-left">Material</th>
                                <th class="p-1">Qty/porsi</th>
                                <th class="p-1">Kecepatan</th>
                                <th class="p-1 text-right">Total dibutuhkan</th>
                            </tr>
                        </thead>
                        <tbody>${stackRows}</tbody>
                    </table>
                </div>
            </div>`;
        } else {
            finalPackHtml += `<div class="px-4 py-2 text-xs text-yellow-300 bg-yellow-500/10">
                <i class="fas fa-exclamation-triangle"></i> Food belum punya stack final packaging.
                Buka menu <b>Foods</b> dan isi <b>Final Packaging</b> (ompreng/sterefoam/wrap/dll).
            </div>`;
        }

        if (Array.isArray(finalPackResult.warnings) && finalPackResult.warnings.length) {
            finalPackHtml += `<div class="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
                <div class="font-bold text-yellow-400 text-xs mb-1"><i class="fas fa-triangle-exclamation"></i> Warnings</div>
                <ul class="list-disc list-inside text-xs text-yellow-200">${finalPackResult.warnings.map(w => `<li>${typeof w === 'string' ? w : JSON.stringify(w)}</li>`).join('')}</ul>
            </div>`;
        }

        if (fpTimeline.length) {
            const sorted = [...fpTimeline].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            // Kumulatif per layer (layer_index → cumulative units)
            const cumByLayer = {};
            finalPackHtml += `<div class="p-3 overflow-x-auto">
                <table class="w-full text-xs">
                    <thead class="text-muted bg-white/5">
                        <tr>
                            <th class="p-1 text-left">Layer</th>
                            <th class="p-1">Batch</th>
                            <th class="p-1">Porsi</th>
                            <th class="p-1">Unit material</th>
                            <th class="p-1">Mulai</th>
                            <th class="p-1">Selesai</th>
                            <th class="p-1">Durasi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map(t => {
                            const dur = t.startTime && t.endTime
                                ? Math.round((new Date(t.endTime) - new Date(t.startTime)) / 60000) : 0;
                            const bPort = Number(t.batchPortions) || 0;
                            const totalP = Number(t.totalPortions) || 0;
                            const L = t.layer || null;
                            const li = L ? L.layer_index : -1;
                            if (li >= 0) cumByLayer[li] = (cumByLayer[li] || 0) + (L.units_total || 0);
                            const unitCell = L
                                ? `<b>${(L.units_total || 0).toLocaleString('id-ID')}</b> ${L.unit || ''}<div class="text-[10px] text-muted">kumulatif ${cumByLayer[li].toLocaleString('id-ID')}${layerTotals[li] ? '/' + layerTotals[li].units_total.toLocaleString('id-ID') : ''}</div>`
                                : '-';
                            const portionCell = bPort
                                ? `${bPort}${totalP ? '<div class="text-[10px] text-muted">dari ' + totalP + '</div>' : ''}`
                                : '-';
                            return `<tr class="border-b border-white/5">
                                <td class="p-1">${t.stepTitle || ''}</td>
                                <td class="p-1 text-center">${t.batchIndex ?? '-'}${t.batchCount ? '/' + t.batchCount : ''}</td>
                                <td class="p-1 text-center">${portionCell}</td>
                                <td class="p-1 text-center">${unitCell}</td>
                                <td class="p-1 text-center font-mono">${fmtTime(t.startTime)}</td>
                                <td class="p-1 text-center font-mono">${fmtTime(t.endTime)}</td>
                                <td class="p-1 text-center">${dur}m</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>`;
        }
        finalPackHtml += `</div>`;
    } else if (finalPackResult && finalPackResult.error) {
        finalPackHtml = `<div class="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            <b><i class="fas fa-times-circle"></i> Final Pack Error:</b> ${finalPackResult.error}
        </div>`;
    }

    card.innerHTML = `
        <div class="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-white/10 pb-4">
            <div>
                <h4 class="font-bold text-lg flex items-center gap-2">
                    <i class="fas fa-robot text-primary"></i> AI Plan Result ${badge}
                </h4>
                <div class="text-xs text-muted mt-1">
                    Mulai Produksi: <b>${ctx.prodStart ? ctx.prodStart.replace('T', ' ').slice(0, 16) : ctx.planDate + ' (auto)'}</b>
                    | Distribusi: ${ctx.distDate || ctx.planDate}
                    | ${results.length} menu | ${combinedTimeline.length} task${(() => {
                        const tp = Math.max(0, ...results.map(r => Number((r.result && r.result.totalPortions) || 0)));
                        const fptp = Number(finalPackResult && finalPackResult.totalPortions || 0);
                        const totalP = Math.max(tp, fptp);
                        return totalP ? ' | <b class="text-primary">' + totalP.toLocaleString('id-ID') + ' porsi</b>' : '';
                    })()}
                </div>
            </div>
            ${actionRow}
        </div>

        <div class="overflow-y-auto pr-1 custom-scrollbar" style="max-height: 55vh;">
            ${menusHtml}
            ${finalPackHtml}
        </div>

        <div id="material-calc-section" class="hidden mt-4"></div>
        <div id="po-create-section" class="hidden mt-4"></div>
    `;
}

function renderDraftResult(data, config) {
    const card = document.getElementById('draft-result-card');
    if (!card) return;
    
    const isFeasible = data.feasibility && data.feasibility.status === 'FEASIBLE';
    const badgeClass = isFeasible ? 'badge-success' : 'badge-danger';
    const slack = data.feasibility ? data.feasibility.slack_minutes : 0;
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    
    // Group timeline by division
    const timeline = data.timeline || [];
    const divisions = {};
    timeline.forEach(t => {
        const d = t.type || 'general';
        if (!divisions[d]) divisions[d] = [];
        divisions[d].push(t);
    });
    
    const divOrder = ['receiving', 'prep', 'cooking', 'packing', 'driver'];
    const sortedDivs = Object.keys(divisions).sort((a,b) => {
        const ia = divOrder.indexOf(a);
        const ib = divOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    let timelineHtml = '';
    sortedDivs.forEach(div => {
        const tasks = divisions[div].sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
        timelineHtml += `
            <div class="mb-4">
                <div class="font-bold uppercase text-xs text-muted mb-2 border-b border-white/10 pb-1 flex items-center gap-2">
                    <i class="fas fa-circle text-[8px] text-accent"></i> ${div}
                </div>
                <div class="flex flex-col gap-1 pl-3 border-l border-white/5">
                    ${tasks.map(t => {
                        const start = new Date(t.startTime);
                        const end = new Date(t.endTime);
                        const dur = Math.round((end - start) / 60000);
                        const bPort = Number(t.batchPortions) || 0;
                        const layerInfo = t.layer && t.layer.units_total
                            ? ` · ${t.layer.units_total} ${t.layer.unit || 'pcs'}${t.layer.material ? ' ' + t.layer.material : ''}`
                            : '';
                        const qtyLabel = bPort
                            ? `<span class="font-mono text-accent">${bPort} porsi</span>${layerInfo ? '<span class="text-muted">' + layerInfo + '</span>' : ''}`
                            : '';
                        return `
                            <div class="flex justify-between items-center p-2 bg-dark-overlay rounded border border-white/5 text-xs hover:bg-white/5 transition-colors group">
                                <div class="flex-1">
                                    <div class="font-bold text-white group-hover:text-accent transition-colors">${t.title || t.menuId || 'Task'}</div>
                                    <div class="text-muted text-[10px]">${t.type === 'driver' ? ('Wave #' + t.batchNo) : ('Batch #' + t.batchNo + (t.batchCount ? '/' + t.batchCount : ''))}${qtyLabel ? ' · ' + qtyLabel : ''}</div>
                                </div>
                                <div class="text-right">
                                    <div class="font-mono text-accent">${formatTime(start)} - ${formatTime(end)}</div>
                                    <div class="font-mono opacity-50 text-[10px]">${dur}m</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    // Store config for publishing
    window._draftConfig = config;

    const warningsHtml = warnings.length
        ? `
            <div class="mb-4 p-3 rounded border border-white/10 bg-dark-overlay">
                <div class="font-bold text-xs uppercase text-accent mb-2">Perlu Dicek</div>
                <div class="text-xs text-muted flex flex-col gap-1">
                    ${warnings.map(w => `<div>• ${String(w).replace(/</g, '&lt;')}</div>`).join('')}
                </div>
            </div>
        `
        : '';

    const publishBtnHtml = `<button class="btn btn-success shadow-lg" onclick="commitDraftToJobdesc()"><i class="fas fa-rocket mr-1"></i> Publish ke Jobdesc</button>`;
    const nextStepBtn = isFeasible
        ? `<div class="flex gap-2">
             <button class="btn btn-primary shadow-lg" onclick="openMaterialCalcStep()"><i class="fas fa-calculator mr-1"></i> Hitung Material</button>
             ${publishBtnHtml}
           </div>`
        : `<div class="flex items-center gap-2">
             <span class="text-xs text-danger">Simulasi tidak feasible — perbaiki konfigurasi.</span>
             ${publishBtnHtml}
           </div>`;

    card.innerHTML = `
        <div class="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <div>
                <h4 class="font-bold text-lg text-primary">Simulation Results</h4>
                <div class="flex items-center gap-2 mt-1">
                    <span class="badge ${badgeClass} text-xs">${isFeasible ? 'FEASIBLE' : 'NOT FEASIBLE'}</span>
                    <span class="text-xs text-muted">Slack: ${slack} mins</span>
                </div>
            </div>
            ${nextStepBtn}
        </div>
        
        <div class="overflow-y-auto pr-2 custom-scrollbar" style="max-height: 400px;">
            ${warningsHtml}
            ${timelineHtml || '<div class="text-center text-muted py-8">No timeline generated</div>'}
        </div>

        <div id="material-calc-section" class="hidden mt-4"></div>
        <div id="po-create-section" class="hidden mt-4"></div>
    `;
}

function formatTime(d) {
    const dt = new Date(d);
    const datePart = dt.toISOString().slice(0, 10); // YYYY-MM-DD (stable, no locale)
    const timePart = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
}

// ─── Material Calculation Step ──────────────────────────────────────────────

/**
 * `loadPlans()` / detail plan mengganti isi #planner-workspace tanpa blok simulasi War Room,
 * sehingga #material-calc-section & #po-create-section hilang. Siapkan shell di bawah konten workspace
 * agar "Mulai procurement" / Edit procurement tetap bisa menampilkan Hitung Material & PO.
 */
function mbgEnsurePlannerProcurementUiShell() {
    const ws = document.getElementById('planner-workspace');
    if (!ws) return;
    const mat = document.getElementById('material-calc-section');
    const po = document.getElementById('po-create-section');
    if (mat && po) return;
    if (!mat && !po) {
        const wrap = document.createElement('div');
        wrap.id = 'planner-procurement-shell';
        wrap.className = 'mt-4 flex flex-col gap-4';
        wrap.innerHTML = `
            <div id="material-calc-section" class="hidden"></div>
            <div id="po-create-section" class="hidden"></div>
        `;
        ws.appendChild(wrap);
        return;
    }
    if (mat && !po) {
        const div = document.createElement('div');
        div.id = 'po-create-section';
        div.className = 'hidden';
        mat.insertAdjacentElement('afterend', div);
        return;
    }
    if (!mat && po) {
        const div = document.createElement('div');
        div.id = 'material-calc-section';
        div.className = 'hidden';
        po.insertAdjacentElement('beforebegin', div);
    }
}

function mbgPlannerNormUnit(u) {
    return String(u == null ? '' : u).trim().toLowerCase();
}

/** Opsi satuan untuk harga (nilai value sinkron dengan backend / server.js). */
function mbgPlannerPriceUnitChoices(qtyUnit) {
    const qu = mbgPlannerNormUnit(qtyUnit);
    const mass = [
        { value: 'gram', label: 'per g' },
        { value: 'kg', label: 'per kg' },
        { value: 'mg', label: 'per mg' }
    ];
    const vol = [
        { value: 'ml', label: 'per ml' },
        { value: 'liter', label: 'per L' }
    ];
    if (['g', 'gr', 'gram', 'grams', 'mg', 'kg', 'kilo', 'kilogram', 'kilograms'].includes(qu)) return mass;
    if (['ml', 'cc', 'l', 'lt', 'ltr', 'liter', 'litre'].includes(qu)) return vol;
    const u = String(qtyUnit || 'pcs').trim() || 'pcs';
    return [{ value: u, label: `per ${u}` }];
}

function mbgPlannerSelectedPriceUnitValue(m) {
    const choices = mbgPlannerPriceUnitChoices(m.unit);
    const p = (m.price_unit != null && String(m.price_unit).trim()) ? String(m.price_unit).trim() : String(m.unit || '');
    const nu = mbgPlannerNormUnit;
    const hit = choices.find(c => nu(c.value) === nu(p));
    return hit ? hit.value : choices[0].value;
}

/** Gram per 1 satuan harga/qty (sinkron dengan server.js). */
function mbgPlannerGramsPerUnit(u) {
    const x = mbgPlannerNormUnit(u);
    switch (x) {
        case 'mg': return 0.001;
        case 'g':
        case 'gr':
        case 'gram':
        case 'grams': return 1;
        case 'kg':
        case 'kilo':
        case 'kilogram':
        case 'kilograms': return 1000;
        default: return null;
    }
}

function mbgPlannerMlPerUnit(u) {
    const x = mbgPlannerNormUnit(u);
    switch (x) {
        case 'ml':
        case 'cc': return 1;
        case 'l':
        case 'lt':
        case 'ltr':
        case 'liter':
        case 'litre': return 1000;
        default: return null;
    }
}

/** Skala angka harga saat ganti "per X" → "per Y" supaya nilai uang per basis massa/volume tetap. */
function mbgPlannerConvertPriceBetweenUnits(price, fromUnit, toUnit) {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) return p;
    const f = mbgPlannerNormUnit(fromUnit);
    const t = mbgPlannerNormUnit(toUnit);
    if (!f || !t || f === t) return p;
    const gf = mbgPlannerGramsPerUnit(f);
    const gt = mbgPlannerGramsPerUnit(t);
    if (gf != null && gt != null && gf > 0) {
        return p * (gt / gf);
    }
    const mf = mbgPlannerMlPerUnit(f);
    const mt = mbgPlannerMlPerUnit(t);
    if (mf != null && mt != null && mf > 0) {
        return p * (mt / mf);
    }
    return p;
}

function openMaterialCalcStep() {
    mbgEnsurePlannerProcurementUiShell();
    const section = document.getElementById('material-calc-section');
    if (!section) return;

    section.classList.remove('hidden');
    section.innerHTML = `
        <div class="card" style="border-left: 4px solid var(--accent);">
            <h4 class="font-bold mb-3">2. Hitung Kebutuhan Material</h4>
            <p class="text-sm text-muted mb-4">Pilih sumber estimasi harga untuk menghitung seluruh bahan baku & operasional.</p>

            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Sumber Harga</label>
                    <div class="flex flex-col gap-2" id="price-source-options">
                        <label class="flex items-start gap-3 p-3 rounded border border-white/10 hover:bg-white/5 cursor-pointer">
                            <input type="radio" name="price_source" value="database" checked class="mt-1">
                            <div>
                                <div class="font-bold text-sm">Database Tenant</div>
                                <div class="text-xs text-muted">Gunakan <code>estimated_price</code> dari master ingredient & operational materials tenant ini.</div>
                            </div>
                        </label>
                        <label class="flex items-start gap-3 p-3 rounded border border-white/10 hover:bg-white/5 cursor-pointer">
                            <input type="radio" name="price_source" value="siskaperbapo" class="mt-1">
                            <div>
                                <div class="font-bold text-sm">Siskaperbapo (Harga Pasar)</div>
                                <div class="text-xs text-muted">Ambil harga pasar dari data Siskaperbapo yang tersinkronisasi.</div>
                            </div>
                        </label>
                        <label class="flex items-start gap-3 p-3 rounded border border-white/10 hover:bg-white/5 cursor-pointer">
                            <input type="radio" name="price_source" value="manual" class="mt-1">
                            <div>
                                <div class="font-bold text-sm">Isi Manual</div>
                                <div class="text-xs text-muted">Semua harga dimulai dari Rp 0 — isi sendiri per item di tabel material.</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="form-full pt-3 flex justify-end">
                    <button class="btn btn-primary px-6" onclick="runMaterialCalc()">
                        <i class="fas fa-calculator mr-2"></i> Hitung Material
                    </button>
                </div>
            </div>

            <div id="material-calc-result" class="mt-4"></div>
        </div>
    `;

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runMaterialCalc() {
    if (!window._draftConfig) return notifyUi('warning', 'Material', 'Draft config belum ada.');

    const priceSource = document.querySelector('input[name="price_source"]:checked')?.value || 'database';
    const foodId = window._draftConfig.food_id;
    const totalPortions = window._draftConfig.waves.reduce((a, w) => a + (w.portion_count || 0), 0);

    const resultDiv = document.getElementById('material-calc-result');
    if (resultDiv) resultDiv.innerHTML = `<div class="text-center text-muted p-4"><i class="fas fa-spinner fa-spin mr-2"></i>Menghitung material...</div>`;

    try {
        if (!window._draftPlanId) {
            const draftRes = await api('/api/procurement/plans/draft', 'POST', {
                food_id: foodId,
                plan_date: window._draftConfig.plan_date,
                target_portions: totalPortions,
                plan_data: window._draftConfig
            });
            window._draftPlanId = draftRes.id;
        }

        const materials = await api(`/api/procurement/plans/${window._draftPlanId}/materials/calculate`, 'POST', {
            food_id: foodId,
            total_portions: totalPortions,
            price_source: priceSource
        });

        renderMaterialResult(materials, priceSource);
    } catch (e) {
        if (resultDiv) resultDiv.innerHTML = `<div class="text-danger p-3">Gagal menghitung material: ${e.message}</div>`;
    }
}

function renderMaterialResult(materials, priceSource) {
    const resultDiv = document.getElementById('material-calc-result');
    if (!resultDiv) return;

    if (!materials || !materials.length) {
        resultDiv.innerHTML = `<div class="text-muted p-3">Tidak ada material yang dihitung. Pastikan food package memiliki recipe dengan ingredient.</div>`;
        return;
    }

    const sourceLabel = { database: 'Database Tenant', siskaperbapo: 'Siskaperbapo', manual: 'Manual' };
    const grandTotal = materials.reduce((a, m) => a + m.estimated_total, 0);

    const rows = materials.map(m => {
        const choices = mbgPlannerPriceUnitChoices(m.unit);
        const selVal = mbgPlannerSelectedPriceUnitValue(m);
        const opts = choices.map(c => `<option value="${c.value}"${c.value === selVal ? ' selected' : ''}>${c.label}</option>`).join('');
        return `
        <tr>
            <td>${m.material_name}</td>
            <td><span class="badge ${m.material_type === 'ingredient' ? 'badge-primary' : 'badge-muted'}" style="font-size:0.6rem;">${m.material_type}</span></td>
            <td class="font-mono">${m.quantity_needed.toFixed(2)} ${m.unit}</td>
            <td>
                <input type="number" class="input-field mat-price-input" style="width:100px; height:26px; padding:2px 6px; font-size:0.75rem;"
                       data-mid="${m.id}" value="${m.estimated_price_per_unit}" step="1" min="0"
                       onchange="syncMaterialPlanRow('${m.id}')">
                <div class="text-[0.65rem] text-muted leading-tight mt-0.5 mat-price-hint" data-mid="${m.id}">Angka = harga per <span class="mat-price-hint-unit">${selVal}</span></div>
            </td>
            <td>
                <select class="input-field mat-price-unit" data-mid="${m.id}" data-prev-price-unit="${selVal}" style="min-width:5.5rem; height:26px; padding:2px 4px; font-size:0.75rem;"
                        onchange="syncMaterialPlanRow('${m.id}')">${opts}</select>
            </td>
            <td class="font-mono mat-total" data-mid="${m.id}">${formatRp(m.estimated_total)}</td>
            <td class="text-xs text-muted">${m.price_source}</td>
        </tr>`;
    }).join('');

    resultDiv.innerHTML = `
        <div class="mt-3">
            <div class="flex justify-between items-center mb-2">
                <div class="font-bold text-sm">Kebutuhan Material</div>
                <span class="text-xs text-muted">Sumber: ${sourceLabel[priceSource] || priceSource}</span>
            </div>
            <div class="table-responsive">
                <table class="nutri-table w-full">
                    <thead>
                        <tr><th>Item</th><th>Tipe</th><th>Qty</th><th>Harga <span class="text-muted font-normal">(sesuai kolom satuan)</span></th><th>Satuan harga</th><th>Total</th><th>Sumber</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="text-right font-bold mt-2" id="mat-grand-total">Grand Total: ${formatRp(grandTotal)}</div>
            <div class="text-xs text-muted mt-1">Ubah &quot;Satuan harga&quot; lalu isi angka: itu harga per satuan tersebut (bukan per satuan qty). Saat ganti satuan, angka harga diubah otomatis agar total tetap sama; Anda bisa mengoreksi angkanya setelahnya.</div>

            <div class="flex justify-end mt-4 gap-2">
                <button class="btn btn-secondary" onclick="openMaterialCalcStep()"><i class="fas fa-redo mr-1"></i> Hitung Ulang</button>
                <button class="btn btn-primary" onclick="openPOCreateStep()"><i class="fas fa-file-invoice mr-1"></i> Buat Purchase Order</button>
            </div>
        </div>
    `;
}

async function syncMaterialPlanRow(materialId) {
    if (!window._draftPlanId) return;
    const inp = document.querySelector(`input.mat-price-input[data-mid="${materialId}"]`);
    const sel = document.querySelector(`select.mat-price-unit[data-mid="${materialId}"]`);
    if (!inp || !sel) return;
    const prev = sel.getAttribute('data-prev-price-unit') || sel.value;
    const cur = sel.value;
    if (prev !== cur) {
        const p0 = parseFloat(inp.value);
        if (Number.isFinite(p0) && p0 >= 0) {
            const conv = mbgPlannerConvertPriceBetweenUnits(p0, prev, cur);
            if (Number.isFinite(conv) && conv >= 0) {
                inp.value = String(Math.round(conv));
            }
        }
    }
    sel.setAttribute('data-prev-price-unit', cur);
    const hintUnit = document.querySelector(`.mat-price-hint[data-mid="${materialId}"] .mat-price-hint-unit`);
    if (hintUnit) hintUnit.textContent = cur;
    await updateMaterialPrice(materialId, inp.value, cur);
}

async function updateMaterialPrice(materialId, newPrice, explicitPriceUnit) {
    if (!window._draftPlanId) return;
    const price = parseFloat(newPrice);
    if (!Number.isFinite(price) || price < 0) return;
    const sel = document.querySelector(`select.mat-price-unit[data-mid="${materialId}"]`);
    const priceUnit = explicitPriceUnit !== undefined && explicitPriceUnit !== null
        ? explicitPriceUnit
        : (sel ? sel.value : '');

    try {
        const res = await api(`/api/procurement/plans/${window._draftPlanId}/materials/${materialId}`, 'PUT', {
            estimated_price_per_unit: price,
            price_unit: priceUnit
        });

        const totalCell = document.querySelector(`.mat-total[data-mid="${materialId}"]`);
        if (totalCell) totalCell.textContent = formatRp(res.estimated_total);

        const selAfter = document.querySelector(`select.mat-price-unit[data-mid="${materialId}"]`);
        const pu = (res && res.price_unit != null && String(res.price_unit).trim()) ? String(res.price_unit).trim() : priceUnit;
        if (selAfter && pu) {
            selAfter.setAttribute('data-prev-price-unit', pu);
            const hintUnit = document.querySelector(`.mat-price-hint[data-mid="${materialId}"] .mat-price-hint-unit`);
            if (hintUnit) hintUnit.textContent = pu;
        }

        const grandEl = document.getElementById('mat-grand-total');
        if (grandEl && res.plan_material_total !== undefined) {
            grandEl.textContent = `Grand Total: ${formatRp(res.plan_material_total)}`;
        }
    } catch (e) {
        notifyUi('danger', 'Material', 'Gagal update harga: ' + e.message);
    }
}

// ─── PO Creation Step ───────────────────────────────────────────────────────

function mbgPlannerEscHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function mbgBindPoVisibilityUi() {
    const wrap = document.getElementById('po-private-suppliers-wrap');
    const list = document.getElementById('po-private-suppliers-list');
    if (!wrap || !list) return;
    const sync = () => {
        const v = document.querySelector('input[name="po_visibility"]:checked')?.value;
        wrap.classList.toggle('hidden', v !== 'private');
    };
    document.querySelectorAll('input[name="po_visibility"]').forEach(el => {
        el.addEventListener('change', sync);
    });
    sync();
    try {
        const rows = await api('/api/procurement/active-suppliers', 'GET');
        if (!Array.isArray(rows) || !rows.length) {
            list.innerHTML =
                '<div class="text-xs text-warning">Belum ada supplier aktif. Aktifkan supplier di Developer Console → Supplier Management.</div>';
            return;
        }
        list.innerHTML = rows
            .map(s => {
                const sid = String(s.id || '').trim();
                if (!sid) return '';
                const label = s.company_name || s.name || s.email || sid;
                return `<label class="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer">
                    <input type="checkbox" class="po-invite-supplier" value="${sid.replace(/"/g, '')}">
                    <span class="text-sm">${mbgPlannerEscHtml(label)}</span>
                    <span class="text-xs text-muted ml-auto">${mbgPlannerEscHtml(s.email || '')}</span>
                </label>`;
            })
            .filter(Boolean)
            .join('');
    } catch (e) {
        list.innerHTML = `<div class="text-xs text-danger">Gagal memuat supplier: ${mbgPlannerEscHtml((e && e.message) || String(e))}</div>`;
    }
}

function openPOCreateStep() {
    mbgEnsurePlannerProcurementUiShell();
    const section = document.getElementById('po-create-section');
    if (!section) return;

    section.classList.remove('hidden');
    section.innerHTML = `
        <div class="card" style="border-left: 4px solid var(--accent);">
            <h4 class="font-bold mb-3">3. Buat Purchase Order</h4>
            <p class="text-sm text-muted mb-4">Kirimkan kebutuhan material ke supplier. Pilih visibilitas PO.</p>

            <div class="form-grid">
                <div class="form-full">
                    <label class="input-label">Visibilitas PO</label>
                    <div class="flex flex-col gap-2">
                        <label class="flex items-start gap-3 p-3 rounded border border-white/10 hover:bg-white/5 cursor-pointer">
                            <input type="radio" name="po_visibility" value="public" checked class="mt-1">
                            <div>
                                <div class="font-bold text-sm">Public</div>
                                <div class="text-xs text-muted">Semua supplier aktif bisa melihat dan mengajukan bid.</div>
                            </div>
                        </label>
                        <label class="flex items-start gap-3 p-3 rounded border border-white/10 hover:bg-white/5 cursor-pointer">
                            <input type="radio" name="po_visibility" value="private" class="mt-1">
                            <div>
                                <div class="font-bold text-sm">Private</div>
                                <div class="text-xs text-muted">Hanya supplier tertentu yang Anda pilih.</div>
                            </div>
                        </label>
                        <label class="flex items-start gap-3 p-3 rounded border border-white/10 hover:bg-white/5 cursor-pointer">
                            <input type="radio" name="po_visibility" value="fixed_price" class="mt-1">
                            <div>
                                <div class="font-bold text-sm">Fixed Price (First Come First Served)</div>
                                <div class="text-xs text-muted">Supplier pertama yang claim langsung mendapat order. Tidak ada bidding.</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div id="po-private-suppliers-wrap" class="form-full hidden">
                    <label class="input-label">Supplier undangan (wajib untuk Private)</label>
                    <div id="po-private-suppliers-list" class="flex flex-col gap-1 max-h-52 overflow-y-auto p-2 rounded border border-white/10 bg-dark-overlay/30"></div>
                    <div class="text-xs text-muted mt-1">Hanya supplier yang dicentang yang akan melihat PO ini di portal supplier.</div>
                </div>

                <div>
                    <label class="input-label">Deadline Pengiriman</label>
                    <input id="po_deadline" type="datetime-local" class="input-field">
                </div>
                <div>
                    <label class="input-label">Catatan</label>
                    <input id="po_notes" class="input-field" placeholder="Catatan untuk supplier...">
                </div>

                <div class="form-full flex justify-between items-center pt-3 border-t border-white/10">
                    <div class="text-xs text-muted">
                        <i class="fas fa-info-circle mr-1"></i>
                        PO akan dikirim ke supplier portal. Anda juga bisa print PO untuk supplier offline.
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary" onclick="printPO()"><i class="fas fa-print mr-1"></i> Print PO</button>
                        <button class="btn btn-primary" onclick="submitPO()"><i class="fas fa-paper-plane mr-1"></i> Kirim PO</button>
                    </div>
                </div>
            </div>

            <div id="po-result" class="mt-4"></div>
        </div>
    `;

    mbgBindPoVisibilityUi();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitPO() {
    if (!window._draftPlanId) return notifyUi('warning', 'PO', 'Plan belum dibuat.');

    const visibility = document.querySelector('input[name="po_visibility"]:checked')?.value || 'public';
    const deadline = document.getElementById('po_deadline')?.value || null;
    const notes = document.getElementById('po_notes')?.value || '';

    let invited_supplier_ids;
    if (visibility === 'private') {
        invited_supplier_ids = Array.from(document.querySelectorAll('input.po-invite-supplier:checked'))
            .map(i => String(i.value || '').trim())
            .filter(Boolean);
        if (!invited_supplier_ids.length) {
            return notifyUi('warning', 'PO', 'PO private: centang minimal satu supplier undangan.');
        }
    }

    try {
        const payload = {
            visibility,
            delivery_deadline: deadline ? new Date(deadline).toISOString() : null,
            notes: notes || null
        };
        if (visibility === 'private' && invited_supplier_ids && invited_supplier_ids.length) {
            payload.invited_supplier_ids = invited_supplier_ids;
        }

        const res = await api(`/api/procurement/plans/${window._draftPlanId}/po`, 'POST', payload);
        notifyUi('success', 'Purchase Order', `PO ${res.po_number} berhasil dibuat!`);

        const resultDiv = document.getElementById('po-result');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="p-4 rounded border border-white/10 bg-dark-overlay mt-3">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-bold text-lg text-success"><i class="fas fa-check-circle mr-1"></i> PO Terkirim</div>
                            <div class="text-sm font-mono mt-1">${res.po_number}</div>
                            <div class="text-xs text-muted mt-1">Visibility: ${res.visibility} | Status: ${res.status}</div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button class="btn btn-secondary btn-sm" onclick="printPO()"><i class="fas fa-print mr-1"></i> Print PO</button>
                            <button class="btn btn-primary btn-sm" onclick="viewPlanDetail('${window._draftPlanId}')"><i class="fas fa-eye mr-1"></i> Lihat ringkasan pengadaan</button>
                        </div>
                    </div>
                    <div class="mt-3 p-2 text-xs text-muted" style="border-left: 3px solid var(--border);">
                        <i class="fas fa-hourglass-half mr-1"></i>
                        Menunggu bid dari supplier. Setelah bid diapprove, plan bisa di-publish.
                    </div>
                    ${res.production_plan_code ? `
                    <div class="mt-3 p-2 text-xs" style="border-left: 3px solid var(--success);">
                        <i class="fas fa-clipboard-list mr-1 text-success"></i>
                        Plan produksi <span class="font-mono font-bold">${res.production_plan_code}</span> sudah dibuat (status PO_SENT).
                        Untuk menulis task ke Jobdesc: buka <b>Daftar Production Plans</b> lalu klik <b>Posting Jobdesc</b> pada plan tersebut.
                    </div>` : ''}
                </div>
            `;
        }
    } catch (e) {
        notifyUi('danger', 'PO', 'Gagal membuat PO: ' + e.message);
    }
}

async function printPO(planIdOverride) {
    const procurementPlanId = String(planIdOverride || window._draftPlanId || '').trim();
    if (!procurementPlanId) return notifyUi('warning', 'Print', 'Plan pengadaan tidak diketahui.');

    try {
        const detail = await api(`/api/procurement/plans/${procurementPlanId}`);
        const plan = detail.plan;
        const materials = detail.materials || [];
        const po = detail.po;

        const matRows = materials.map((m, i) => {
            const pu = (m.price_unit != null && String(m.price_unit).trim()) ? String(m.price_unit).trim() : String(m.unit || '');
            return `
            <tr>
                <td style="border:1px solid #ccc; padding:6px; text-align:center;">${i + 1}</td>
                <td style="border:1px solid #ccc; padding:6px;">${m.material_name}</td>
                <td style="border:1px solid #ccc; padding:6px; text-align:center;">${m.material_type}</td>
                <td style="border:1px solid #ccc; padding:6px; text-align:right;">${m.quantity_needed.toFixed(2)}</td>
                <td style="border:1px solid #ccc; padding:6px; text-align:center;">${m.unit}</td>
                <td style="border:1px solid #ccc; padding:6px; text-align:right;">${Number(m.estimated_price_per_unit).toLocaleString('id-ID')}</td>
                <td style="border:1px solid #ccc; padding:6px; text-align:center;">${pu}</td>
                <td style="border:1px solid #ccc; padding:6px; text-align:right;">${Number(m.estimated_total).toLocaleString('id-ID')}</td>
            </tr>`;
        }).join('');

        const grandTotal = materials.reduce((a, m) => a + m.estimated_total, 0);
        const poNumber = po ? po.po_number : `DRAFT-${String(procurementPlanId).slice(0, 8).toUpperCase()}`;
        const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html><head><title>Purchase Order ${poNumber}</title>
            <style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px;} table{border-collapse:collapse;width:100%;} h2{margin:0;}</style>
        </head><body>
            <div style="text-align:center; margin-bottom:20px;">
                <h2>PURCHASE ORDER</h2>
                <div style="font-size:14px; font-weight:bold; margin-top:4px;">${poNumber}</div>
                <div style="font-size:11px; color:#666; margin-top:2px;">${today}</div>
            </div>
            <table style="margin-bottom:20px;">
                <tr><td style="width:120px;"><strong>Target Porsi</strong></td><td>: ${plan.target_portions || 0}</td></tr>
                <tr><td><strong>Status Plan</strong></td><td>: ${plan.status}</td></tr>
                ${po ? `<tr><td><strong>Deadline</strong></td><td>: ${po.delivery_deadline || '-'}</td></tr>` : ''}
                ${po && po.notes ? `<tr><td><strong>Catatan</strong></td><td>: ${po.notes}</td></tr>` : ''}
            </table>
            <table>
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th style="border:1px solid #ccc; padding:6px; width:30px;">No</th>
                        <th style="border:1px solid #ccc; padding:6px;">Item</th>
                        <th style="border:1px solid #ccc; padding:6px;">Tipe</th>
                        <th style="border:1px solid #ccc; padding:6px;">Qty</th>
                        <th style="border:1px solid #ccc; padding:6px;">Unit</th>
                        <th style="border:1px solid #ccc; padding:6px;">Harga</th>
                        <th style="border:1px solid #ccc; padding:6px;">Satuan harga</th>
                        <th style="border:1px solid #ccc; padding:6px;">Total</th>
                    </tr>
                </thead>
                <tbody>${matRows}</tbody>
                <tfoot>
                    <tr style="font-weight:bold; background:#f9f9f9;">
                        <td colspan="7" style="border:1px solid #ccc; padding:6px; text-align:right;">Grand Total</td>
                        <td style="border:1px solid #ccc; padding:6px; text-align:right;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                    </tr>
                </tfoot>
            </table>
            <div style="margin-top:40px; display:flex; justify-content:space-between;">
                <div style="text-align:center; width:45%;">
                    <div style="margin-bottom:60px;">Pemesan,</div>
                    <div style="border-top:1px solid #000; padding-top:4px;">(_________________)</div>
                </div>
                <div style="text-align:center; width:45%;">
                    <div style="margin-bottom:60px;">Supplier,</div>
                    <div style="border-top:1px solid #000; padding-top:4px;">(_________________)</div>
                </div>
            </div>
        </body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 500);
    } catch (e) {
        notifyUi('danger', 'Print', 'Gagal memuat data PO: ' + e.message);
    }
}

// ─── Original Publish (direct, skip PO) ─────────────────────────────────────

async function publishDraft() {
    if (!window._draftConfig) return;

    if (!confirm('Publish this plan? It will become active immediately.')) return;

    try {
        notifyUi('info', 'Publishing', 'Creating production plan...');

        const draftRes = await api('/api/procurement/plans/draft', 'POST', {
            food_id: window._draftConfig.food_id,
            plan_date: window._draftConfig.plan_date,
            target_portions: window._draftConfig.waves.reduce((a, w) => a + (w.portion_count || 0), 0),
            plan_data: window._draftConfig
        });

        if (draftRes && draftRes.id) {
            await api(`/api/procurement/plans/${draftRes.id}/publish`, 'POST');
            notifyUi('success', 'Published', 'Plan created and published!');
            loadPlans();
        }
    } catch (e) {
        notifyUi('danger', 'Publish', e.message);
    }
}

// ─── Plan List ──────────────────────────────────────────────────────────────

/**
 * Plan status PO_SENT (baru dari kirim PO): jalankan simulasi War Room dari plan_data pengadaan,
 * lalu user klik Publish ke Jobdesc — commit memakai existing_plan_id.
 */
async function startJobdescPostFromProcurement(productionPlanId, procurementPlanId) {
    const prodId = String(productionPlanId || '').trim();
    const procId = String(procurementPlanId || '').trim();
    if (!prodId || !procId) {
        notifyUi('warning', 'Posting Jobdesc', 'ID plan pengadaan tidak lengkap. Hubungkan ulang dari alur kebutuhan material.');
        return;
    }
    window._commitExistingPlanId = prodId;
    try {
        const proc = await api(`/api/procurement/plans/${procId}`);
        const pd = proc && proc.plan && proc.plan.plan_data != null ? proc.plan.plan_data : null;
        const planData = pd && typeof pd === 'object' ? pd : {};
        const foodId = String(planData.food_id || proc.plan?.food_id || '').trim();
        const planDate = String(planData.plan_date || proc.plan?.plan_date || '').trim();
        const wavesRaw = Array.isArray(planData.waves) ? planData.waves : [];
        const waves = wavesRaw.map(w => ({
            portion_count: Number(w.portion_count || 0),
            target_time: String(w.target_time || w.delivery_datetime || w.delivery_time || '').trim()
        })).filter(w => w.portion_count > 0 && w.target_time);
        if (!foodId || !waves.length) {
            window._commitExistingPlanId = null;
            notifyUi('danger', 'Posting Jobdesc', 'Data wave atau food pada pengadaan tidak lengkap. Lengkapi lewat War Room manual (food, tanggal, wave).');
            return;
        }
        const distributionDate = String(planData.distribution_date || planData.plan_date || planDate).trim() || planDate;
        const payload = {
            food_id: foodId,
            plan_date: planDate,
            production_date: planDate,
            distribution_date: distributionDate,
            waves
        };
        const draftRes = await api('/api/plans/draft', 'POST', { plan_date: planDate, data: payload });
        const newDraftId = draftRes && draftRes.id ? String(draftRes.id) : null;
        if (!newDraftId) throw new Error('Gagal membuat draft simulasi');
        window._warRoomDraftId = newDraftId;
        const simulated = await simulateDraftPlan(payload);
        window._warRoomLastSim = simulated;
        window._warRoomLastConfig = payload;
        window._draftConfig = payload;
        if (typeof switchView === 'function') switchView('prod-draft');
        setTimeout(() => {
            const card = document.getElementById('draft-result-card');
            if (card) renderDraftResult(simulated, payload);
        }, 400);
        notifyUi('success', 'Posting Jobdesc', 'Simulasi siap. Periksa timeline lalu klik Publish ke Jobdesc untuk menulis task ke Jobdesc.');
    } catch (e) {
        window._commitExistingPlanId = null;
        notifyUi('danger', 'Posting Jobdesc', e.message || String(e));
    }
}

/** Samakan bentuk plan_data server dengan `_draftConfig` War Room / material. */
function mbgNormalizeDraftConfigFromServer(planData) {
    const o = planData && typeof planData === 'object' ? { ...planData } : {};
    const waves = Array.isArray(o.waves)
        ? o.waves.map(w => ({
            portion_count: Number(w.portion_count || 0),
            target_time: String(w.target_time || w.delivery_datetime || w.delivery_time || '').trim()
        })).filter(w => w.portion_count > 0 && w.target_time)
        : [];
    const pd = String(o.plan_date || o.production_date || '').trim().slice(0, 10);
    const dist = String(o.distribution_date || pd || '').trim().slice(0, 10);
    return {
        food_id: String(o.food_id || '').trim(),
        plan_date: pd || dist,
        production_date: String(o.production_date || pd || dist).slice(0, 10),
        distribution_date: dist || pd,
        waves
    };
}

/**
 * `VIEW_CONFIG` memakai key `prod-draft` untuk War Room (`view-production-planner`).
 * Key `production_planner` tidak terdaftar → `switchView` menyembunyikan semua `.view-section` lalu return = layar kosong.
 * Hindari `switchView('prod-draft')` jika sudah di War Room: `openProductionPlanner()` mengganti seluruh isi container dan menghapus daftar plan.
 */
function mbgSwitchToWarRoomIfNeeded() {
    if (typeof switchView !== 'function') return;
    const ws = document.getElementById('planner-workspace');
    if (window._active_view === 'prod-draft' && ws) return;
    switchView('prod-draft');
}

/**
 * Plan sudah Jobdesc tanpa lewat Hitung Material: buat draft `local_procurement_plans` dari wave + food plan, lalu buka langkah material.
 */
async function startProcurementFromPlanList(productionPlanId) {
    const pid = String(productionPlanId || '').trim();
    if (!pid) return;
    try {
        if (typeof notifyUi === 'function') {
            notifyUi('info', 'Pengadaan', 'Menyiapkan draft dari plan produksi dan wave delivery…');
        }
        const res = await api('/api/procurement/plans/from-production-plan', 'POST', { production_plan_id: pid });
        window._warRoomDraftId = null;
        window._warRoomLastSim = null;
        window._warRoomLastConfig = null;
        window._commitExistingPlanId = null;
        window._draftPlanId = res.id;
        window._draftConfig = mbgNormalizeDraftConfigFromServer(res.plan_data || {});
        if (!window._draftConfig.food_id || !window._draftConfig.waves.length) {
            window._draftPlanId = null;
            window._draftConfig = null;
            if (typeof notifyUi === 'function') {
                notifyUi('danger', 'Pengadaan', 'Data food atau wave tidak lengkap; tidak bisa melanjutkan.');
            }
            return;
        }
        mbgSwitchToWarRoomIfNeeded();
        const msg = res.already_linked
            ? 'Draft pengadaan sudah ada untuk plan ini. Lanjutkan Hitung Material atau PO di bawah.'
            : 'Pilih sumber harga, lalu klik Hitung Material. Setelah itu Anda bisa buat PO seperti biasa.';
        setTimeout(() => {
            openMaterialCalcStep();
            if (typeof notifyUi === 'function') notifyUi('success', 'Pengadaan', msg);
        }, 400);
    } catch (e) {
        if (typeof notifyUi === 'function') {
            notifyUi('danger', 'Pengadaan', (e && e.message) ? e.message : String(e));
        }
    }
}

/**
 * Buka draft pengadaan yang sudah terikat (sama alur Hitung Material / PO).
 */
async function editProcurementFromPlanList(procurementPlanId) {
    const procId = String(procurementPlanId || '').trim();
    if (!procId) return;
    try {
        if (typeof notifyUi === 'function') notifyUi('info', 'Pengadaan', 'Memuat draft pengadaan…');
        const detail = await api(`/api/procurement/plans/${procId}`);
        const plan = detail.plan || {};
        let planData = plan.plan_data && typeof plan.plan_data === 'object' ? { ...plan.plan_data } : {};
        if (!planData.food_id && plan.food_id) planData.food_id = plan.food_id;
        if (!planData.plan_date && plan.plan_date) planData.plan_date = plan.plan_date;
        window._warRoomDraftId = null;
        window._warRoomLastSim = null;
        window._warRoomLastConfig = null;
        window._commitExistingPlanId = null;
        window._draftPlanId = procId;
        window._draftConfig = mbgNormalizeDraftConfigFromServer(planData);
        mbgSwitchToWarRoomIfNeeded();
        setTimeout(() => {
            openMaterialCalcStep();
            const mats = Array.isArray(detail.materials) ? detail.materials : [];
            if (mats.length) {
                const mapped = mats.map(m => ({
                    id: m.id,
                    ingredient_id: m.ingredient_id,
                    material_name: m.material_name,
                    material_type: m.material_type || 'ingredient',
                    quantity_needed: Number(m.quantity_needed) || 0,
                    unit: m.unit || '',
                    price_unit: (m.price_unit != null && String(m.price_unit).trim())
                        ? String(m.price_unit).trim()
                        : String(m.unit || ''),
                    estimated_price_per_unit: Number(m.estimated_price_per_unit) || 0,
                    estimated_total: Number(m.estimated_total) || 0,
                    price_source: m.price_source || 'database'
                }));
                const ps = mapped[0] && mapped[0].price_source ? mapped[0].price_source : 'database';
                renderMaterialResult(mapped, ps);
            }
            if (typeof notifyUi === 'function') {
                notifyUi('success', 'Pengadaan', 'Draft siap. Sunting harga / satuan atau lanjut ke Buat Purchase Order.');
            }
        }, 400);
    } catch (e) {
        if (typeof notifyUi === 'function') {
            notifyUi('danger', 'Pengadaan', (e && e.message) ? e.message : String(e));
        }
    }
}

/** Plan CANCELLED: aktifkan lagi di server — jobdesc (task + batch) dan delivery wave kembali PENDING; plan jadi PUBLISHED (tanpa War Room / plan baru). */
window.restartProductionAfterCancellation = async function (planId, planCodeLabel) {
    if (!planId) return;
    const label = planCodeLabel || String(planId).slice(0, 8);
    const ok = typeof confirmUi === 'function'
        ? await confirmUi({
            title: 'Mulai ulang setelah dibatalkan',
            message: `Aktifkan kembali plan <strong>${String(label)}</strong>? Jobdesc (task dan batch) serta delivery wave yang sempat dibatalkan akan dikembalikan ke <strong>PENDING</strong> agar operasional bisa lanjut — tanpa membuat draft plan baru.`,
            confirmLabel: 'Ya, mulai ulang',
            cancelLabel: 'Batal',
            danger: false
        })
        : confirm(`Aktifkan kembali plan ${label}?`);
    if (!ok) return;
    try {
        const res = await api(`/api/plans/${encodeURIComponent(planId)}/reactivate`, 'POST', {});
        const parts = [];
        if (Number(res.tasks_reopened) > 0) parts.push(`${res.tasks_reopened} task`);
        if (Number(res.batches_reopened) > 0) parts.push(`${res.batches_reopened} batch`);
        if (Number(res.deliveries_reopened) > 0) parts.push(`${res.deliveries_reopened} delivery`);
        const detail = parts.length ? ` Dibuka kembali: ${parts.join(', ')}.` : '';
        if (typeof notifyUi === 'function') {
            notifyUi('success', 'Mulai ulang', `Plan ${label} aktif lagi.${detail}`);
        }
        if (typeof loadPlans === 'function') await loadPlans();
    } catch (e) {
        if (typeof notifyUi === 'function') notifyUi('danger', 'Mulai ulang', (e && e.message) ? e.message : String(e));
    }
};

async function loadPlans() {
    const ws = document.getElementById('planner-workspace');
    if (!ws) return;

    ws.innerHTML = `<div class="card p-8 text-center text-muted"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat daftar plan...</div>`;

    try {
        const plans = await api('/api/plans');
        const list = Array.isArray(plans) ? plans : [];

        if (!list.length) {
            ws.innerHTML = `
                <div class="card p-8 text-center text-muted">
                    <i class="fas fa-inbox fa-3x mb-4 opacity-30"></i>
                    <p>Belum ada production plan.</p>
                    <button class="btn btn-primary mt-4" onclick="initDraftConfig()">
                        <i class="fas fa-plus mr-2"></i> Buat Draft Baru
                    </button>
                </div>`;
            return;
        }

        const statusBadge = (s) => {
            const map = {
                'DRAFT': 'badge-muted', 'SIMULATED': 'badge-warning', 'PO_SENT': 'badge-info',
                'APPROVED': 'badge-success', 'PUBLISHED': 'badge-success', 'IN_PROGRESS': 'badge-primary',
                'COMPLETED': 'badge-success', 'CANCELLED': 'badge-danger'
            };
            return `<span class="badge ${map[String(s).toUpperCase()] || 'badge-muted'}">${s || '-'}</span>`;
        };

        const rows = list.map(p => {
            const code = p.code || String(p.id).slice(0, 8);
            const tgl  = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
            const stats = p.stats || {};
            const delivery = p.target_delivery_time
                ? new Date(p.target_delivery_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-';
            const cancelled = String(p.status || '').toUpperCase() === 'CANCELLED';
            const cancelNote = cancelled
                ? '<div class="text-xs text-danger mt-1 leading-tight">Jobdesc dan delivery dibatalkan</div>'
                : '';
            const restartBtn = cancelled
                ? `<button type="button" class="btn btn-primary btn-xs" onclick='restartProductionAfterCancellation(${JSON.stringify(p.id)}, ${JSON.stringify(code)})' title="Kembalikan jobdesc dan delivery wave ke PENDING; plan kembali aktif (tanpa buat plan baru)">
                        <i class="fas fa-redo-alt"></i> Mulai ulang
                    </button>`
                : '';
            const statTasks = Number(stats.tasks || 0);
            const procLink = String(p.procurement_plan_id || p.source_procurement_plan_id || '').trim();
            const hasProcurement = !!p.has_procurement || !!procLink;
            const jobdescPostBtn = (String(p.status || '').toUpperCase() === 'PO_SENT' && statTasks === 0 && procLink)
                ? `<button type="button" class="btn btn-success btn-xs" title="Simulasi dari data pengadaan, lalu publish task ke Jobdesc"
                        onclick='startJobdescPostFromProcurement(${JSON.stringify(p.id)}, ${JSON.stringify(procLink)})'>
                        <i class="fas fa-rocket"></i> Posting Jobdesc
                    </button>`
                : '';
            const startProcurementBtn = (!cancelled && !hasProcurement)
                ? `<button type="button" class="btn btn-primary btn-xs" title="Plan ini belum punya pengadaan (mis. publish Jobdesc tanpa Hitung Material). Buat draft dari wave & food di Jobdesc, lalu hitung material & PO."
                        onclick='startProcurementFromPlanList(${JSON.stringify(p.id)})'>
                        <i class="fas fa-shopping-basket"></i> Mulai procurement
                    </button>`
                : '';
            const editProcurementBtn = (!cancelled && hasProcurement && procLink)
                ? `<button type="button" class="btn btn-secondary btn-xs" title="Buka kembali kebutuhan material, harga, dan PO untuk plan ini."
                        onclick='editProcurementFromPlanList(${JSON.stringify(procLink)})'>
                        <i class="fas fa-edit"></i> Edit procurement
                    </button>`
                : '';
            return `
            <tr class="hover:bg-white/5">
                <td class="font-mono font-bold">${code}</td>
                <td>${statusBadge(p.status)}${cancelNote}</td>
                <td class="font-mono text-center">${p.target_portions || 0}</td>
                <td class="text-center text-xs">${delivery}</td>
                <td class="text-center text-xs">
                    <span title="Tasks">${stats.tasks || 0} task</span> /
                    <span title="Batches">${stats.batches || 0} batch</span>
                </td>
                <td class="text-xs text-muted">${tgl}</td>
                <td>
                    <div class="flex gap-1 flex-wrap">
                        <button type="button" class="btn btn-secondary btn-xs" onclick='viewPlanDetail(${JSON.stringify(p.id)})' title="Detail Jobdesc / ringkasan">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${startProcurementBtn}
                        ${editProcurementBtn}
                        ${jobdescPostBtn}
                        ${restartBtn}
                        <button type="button" class="btn btn-danger btn-xs" onclick='deletePlan(${JSON.stringify(p.id)}, ${JSON.stringify(code)})'>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        ws.innerHTML = `
            <div class="card">
                <div class="flex flex-wrap justify-between items-center mb-3 gap-2">
                    <div>
                        <div class="font-bold text-lg">Daftar Production Plans</div>
                        <div class="text-xs text-muted">${list.length} plan tersimpan</div>
                        <div class="text-xs text-muted max-w-xl mt-1 leading-snug">
                            Tanpa lewat <b>Hitung Material</b> lalu publish Jobdesc? Gunakan <b>Mulai procurement</b> pada baris plan.
                            Jika pengadaan sudah pernah dibuat, gunakan <b>Edit procurement</b>.
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary btn-sm" onclick="loadPlans()">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="initDraftConfig()">
                            <i class="fas fa-plus"></i> Buat Draft Baru
                        </button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="nutri-table w-full text-sm">
                        <thead>
                            <tr>
                                <th>Kode</th>
                                <th>Status</th>
                                <th class="text-center">Porsi</th>
                                <th class="text-center">Distribusi</th>
                                <th class="text-center">Tasks / Batch</th>
                                <th>Dibuat</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
    } catch (e) {
        ws.innerHTML = `<div class="card p-4 text-danger">Gagal memuat plans: ${e.message}</div>`;
    }
}

window.deletePlan = async function(planId, code) {
    const ok = typeof confirmUi === 'function'
        ? await confirmUi({
            title: 'Hapus Plan',
            message: `Hapus plan <b>${code}</b>?<br><span class="text-xs text-muted">Semua tasks, batches, deliveries, dan jobdesc terkait akan ikut terhapus.</span>`,
            confirmLabel: 'Hapus',
            cancelLabel: 'Batal',
            danger: true
          })
        : confirm(`Hapus plan ${code}? Semua tasks & deliveries terkait akan ikut terhapus.`);
    if (!ok) return;
    try {
        await api(`/api/plans/${planId}`, 'DELETE');
        notifyUi('success', 'Plan', `Plan ${code} berhasil dihapus.`);
        loadPlans();
    } catch (e) {
        notifyUi('danger', 'Hapus Plan', e.message || String(e));
    }
};

// ─── Plan Detail + Receiving ────────────────────────────────────────────────

/**
 * Ringkasan plan pengadaan (local_procurement_plans + material + PO).
 * ID ini berbeda dari plan Jobdesc (`plans`); jangan memakai /api/plans/.../details.
 */
async function renderProcurementPlanDetail(ws, planId) {
    const pid = String(planId || '').trim();
    if (!pid) {
        ws.innerHTML = `<div class="card p-4 text-danger">ID tidak valid.</div>`;
        return;
    }
    let detail;
    try {
        detail = await api(`/api/procurement/plans/${pid}`);
    } catch (e) {
        ws.innerHTML = `<div class="card p-4 text-danger">Gagal memuat pengadaan: ${e.message || e}</div>`;
        return;
    }
    const plan = detail.plan || {};
    const materials = Array.isArray(detail.materials) ? detail.materials : [];
    const po = detail.po || null;
    const bids = Array.isArray(detail.bids) ? detail.bids : [];
    const grand = materials.reduce((a, m) => a + (Number(m.estimated_total) || 0), 0);
    const statusBadge = (s) => {
        const map = {
            DRAFT: 'badge-muted', SIMULATED: 'badge-warning', PO_SENT: 'badge-info',
            PUBLISHED: 'badge-success', APPROVED: 'badge-success', CANCELLED: 'badge-danger'
        };
        const k = String(s || '').toUpperCase();
        return `<span class="badge ${map[k] || 'badge-muted'}">${s || '-'}</span>`;
    };
    const matRows = materials.map((m, i) => {
        const pu = (m.price_unit != null && String(m.price_unit).trim()) ? String(m.price_unit).trim() : String(m.unit || '');
        return `<tr>
            <td class="text-center">${i + 1}</td>
            <td>${m.material_name || '-'}</td>
            <td><span class="badge ${m.material_type === 'ingredient' ? 'badge-primary' : 'badge-muted'}" style="font-size:0.6rem;">${m.material_type || ''}</span></td>
            <td class="font-mono">${Number(m.quantity_needed || 0).toFixed(2)} ${m.unit || ''}</td>
            <td class="font-mono text-right">${Number(m.estimated_price_per_unit || 0).toLocaleString('id-ID')}</td>
            <td class="text-xs">${pu}</td>
            <td class="font-mono text-right">${formatRp(m.estimated_total || 0)}</td>
        </tr>`;
    }).join('');

    const poVis = po ? String(po.visibility || '').toLowerCase() : '';
    const bidsManagementHtml =
        !po || poVis === 'fixed_price'
            ? ''
            : (() => {
                  const bidRows = bids
                      .map(b => {
                          const st = String(b.status || 'pending').toLowerCase();
                          const badge =
                              st === 'approved' ? 'badge-success' : st === 'rejected' ? 'badge-danger' : 'badge-warning';
                          const itemsLines = (Array.isArray(b.items) ? b.items : [])
                              .slice(0, 12)
                              .map(
                                  it =>
                                      `<div class="text-[0.7rem] font-mono leading-tight">${mbgPlannerEscHtml(String(it.material_name || it.material_id || '-'))}: ${Number(it.offered_qty || 0).toFixed(2)} × ${formatRp(it.offered_price_per_unit || 0)}</div>`
                              )
                              .join('');
                          const more =
                              b.items && b.items.length > 12
                                  ? `<div class="text-[0.65rem] text-muted">+${b.items.length - 12} baris…</div>`
                                  : '';
                          const actions =
                              st === 'pending'
                                  ? `<div class="flex flex-wrap gap-1 mt-1">
                            <button type="button" class="btn btn-success btn-xs" onclick='reviewBidAction(${JSON.stringify(pid)}, ${JSON.stringify(b.id)}, "approve")'>Pilih bid ini</button>
                            <button type="button" class="btn btn-secondary btn-xs" onclick='reviewBidAction(${JSON.stringify(pid)}, ${JSON.stringify(b.id)}, "reject")'>Tolak</button>
                        </div>`
                                  : '';
                          let when = '-';
                          if (b.submitted_at) {
                              try {
                                  when = new Date(b.submitted_at).toLocaleString('id-ID', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  });
                              } catch (_) {
                                  when = '-';
                              }
                          }
                          return `<tr class="align-top">
                    <td class="text-xs whitespace-nowrap">${when}</td>
                    <td class="text-xs">
                        <div class="font-medium">${mbgPlannerEscHtml(String(b.supplier_name || '-'))}</div>
                        ${b.supplier_company ? `<div class="text-muted">${mbgPlannerEscHtml(String(b.supplier_company))}</div>` : ''}
                        ${b.supplier_email ? `<div class="text-muted font-mono text-[0.65rem]">${mbgPlannerEscHtml(String(b.supplier_email))}</div>` : ''}
                    </td>
                    <td class="font-mono text-xs text-right whitespace-nowrap">${formatRp(b.total_amount || 0)}</td>
                    <td class="text-center"><span class="badge ${badge}">${st.toUpperCase()}</span></td>
                    <td class="text-xs">${b.notes ? mbgPlannerEscHtml(String(b.notes)) : '—'}</td>
                    <td class="text-xs">
                        <div class="max-h-28 overflow-y-auto pr-1">${itemsLines}${more}</div>
                        ${actions}
                    </td>
                </tr>`;
                      })
                      .join('');
                  return `<div class="card mb-4">
                <div class="font-bold mb-2 flex justify-between items-center flex-wrap gap-2">
                    <span><i class="fas fa-gavel mr-1 text-primary"></i> Bid supplier</span>
                    <span class="text-xs text-muted font-normal">${bids.length} entri</span>
                </div>
                <p class="text-xs text-muted mb-3">Pilih <strong>Pilih bid ini</strong> untuk menetapkan pemenang; bid pending lain pada PO ini otomatis ditolak. PO <strong>fixed price</strong> tidak memakai daftar ini (pemenang lewat Claim di portal supplier).</p>
                ${
                    bids.length
                        ? `<div class="table-responsive">
                    <table class="nutri-table w-full text-xs">
                        <thead><tr><th>Waktu</th><th>Supplier</th><th>Total</th><th>Status</th><th>Catatan</th><th>Rincian &amp; aksi</th></tr></thead>
                        <tbody>${bidRows}</tbody>
                    </table>
                </div>`
                        : '<div class="text-sm text-muted text-center py-4">Belum ada bid. Supplier mengirim bid dari portal supplier setelah membuka PO.</div>'
                }
            </div>`;
              })();

    ws.innerHTML = `
        <div class="flex flex-wrap justify-between items-start gap-3 mb-4">
            <div>
                <button class="btn btn-secondary btn-xs mb-2" onclick="loadPlans()">
                    <i class="fas fa-arrow-left mr-1"></i> Kembali
                </button>
                <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="font-bold text-lg">Ringkasan pengadaan</h4>
                    ${statusBadge(plan.status)}
                </div>
                <div class="text-xs text-muted mt-1 font-mono">ID: ${pid.slice(0, 8)}…</div>
            </div>
            <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-secondary btn-sm" onclick='printPO(${JSON.stringify(pid)})'><i class="fas fa-print mr-1"></i> Print PO</button>
            </div>
        </div>
        <div class="card mb-4">
            <div class="grid gap-3 text-sm" style="display:grid; grid-template-columns: repeat(auto-fit,minmax(140px,1fr))">
                <div><div class="text-muted text-xs">Target porsi</div><div class="font-bold text-lg">${plan.target_portions || 0}</div></div>
                <div><div class="text-muted text-xs">Estimasi material</div><div class="font-bold text-lg">${formatRp(plan.material_total != null ? plan.material_total : grand)}</div></div>
                <div><div class="text-muted text-xs">PO</div><div class="font-bold">${po ? (po.po_number || '-') : '—'}</div></div>
            </div>
            <p class="text-xs text-muted mt-3 mb-0 border-t border-white/10 pt-3">
                Ini rencana <strong>pengadaan / PO</strong>, bukan plan Jobdesc (task &amp; batch).
                Untuk membuat task di Jobdesc, gunakan <strong>War Room</strong> lalu <strong>Publish ke Jobdesc</strong>.
            </p>
        </div>
        <div class="card mb-4">
            <div class="font-bold mb-2">Material</div>
            <div class="table-responsive">
                <table class="nutri-table w-full text-xs">
                    <thead><tr><th>#</th><th>Item</th><th>Tipe</th><th>Qty</th><th>Harga</th><th>Satuan harga</th><th>Total</th></tr></thead>
                    <tbody>${matRows || '<tr><td colspan="7" class="text-muted text-center p-4">Tidak ada baris material.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
        ${po ? `<div class="card mb-4"><div class="font-bold mb-2">Purchase order</div>
            <div class="text-sm"><span class="text-muted">Nomor:</span> <span class="font-mono">${po.po_number || '-'}</span></div>
            <div class="text-sm"><span class="text-muted">Status:</span> ${po.status || '-'}</div>
            <div class="text-sm"><span class="text-muted">Visibility:</span> ${po.visibility || '-'}</div>
        </div>` : ''}
        ${bidsManagementHtml}`;
}

async function viewPlanDetail(planId) {
    const ws = document.getElementById('planner-workspace');
    if (!ws) return;

    const pid = String(planId || '').trim();
    if (!pid) {
        ws.innerHTML = `<div class="card p-4 text-danger">ID plan tidak valid.</div>`;
        return;
    }

    ws.innerHTML = `<div class="card p-8 text-center text-muted"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat detail plan...</div>`;

    try {
        let detail;
        try {
            detail = await api(`/api/plans/${pid}/details`);
        } catch (e1) {
            const msg = String((e1 && e1.message) || e1 || '');
            if (/404|plan not found|tidak ditemukan|cannot get|not found/i.test(msg)) {
                await renderProcurementPlanDetail(ws, pid);
                return;
            }
            throw e1;
        }
        const plan    = detail.plan    || {};
        const tasks   = detail.tasks   || [];
        const batches = detail.batches || [];
        const stats   = detail.stats   || {};
        // procurement fields no longer used here — kept as empty for compatibility
        const materials = [];
        const po = null;
        const bids = [];

        const statusBadge = (s) => {
            const map = {
                'DRAFT': 'badge-muted', 'SIMULATED': 'badge-warning', 'PO_SENT': 'badge-info',
                'APPROVED': 'badge-success', 'PUBLISHED': 'badge-success', 'IN_PROGRESS': 'badge-primary',
                'COMPLETED': 'badge-success', 'CANCELLED': 'badge-danger',
                'PENDING': 'badge-muted', 'pending': 'badge-muted', 'approved': 'badge-success'
            };
            return `<span class="badge ${map[s] || 'badge-muted'}">${s || '-'}</span>`;
        };
        const fmtT = (iso) => { try { return iso ? new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '-'; } catch { return iso || '-'; } };

        // ── Timeline tasks per divisi ────────────────────────────────────────
        const byDiv = {};
        tasks.forEach(t => {
            const k = t.division_name || t.division_id || 'Umum';
            if (!byDiv[k]) byDiv[k] = [];
            byDiv[k].push(t);
        });
        const divOrder = ['receiving', 'prep', 'Divisi Persiapan', 'cooking', 'Divisi Pengolahan', 'packing', 'Divisi Pemorsian', 'driver', 'Divisi Driver'];
        const divKeys = Object.keys(byDiv).sort((a, b) => {
            const ia = divOrder.findIndex(d => a.toLowerCase().includes(d.toLowerCase()));
            const ib = divOrder.findIndex(d => b.toLowerCase().includes(d.toLowerCase()));
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        });

        const timelineHtml = divKeys.length ? divKeys.map(div => {
            const divTasks = byDiv[div].sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
            return `
            <div class="mb-4">
                <div class="font-bold text-xs uppercase tracking-wide text-primary mb-2 pb-1 border-b border-white/10">
                    <i class="fas fa-circle text-[6px] mr-1"></i>${div}
                    <span class="text-muted font-normal">(${divTasks.length} task)</span>
                </div>
                <div class="flex flex-col gap-1 pl-2">
                    ${divTasks.map(t => `
                    <div class="flex justify-between items-center p-2 rounded bg-white/3 border border-white/5 text-xs">
                        <div class="flex-1">
                            <span class="font-medium">${t.title || 'Task'}</span>
                            ${t.duration_minutes ? `<span class="text-muted ml-1">${t.duration_minutes}m</span>` : ''}
                        </div>
                        <div class="font-mono text-muted text-right shrink-0 ml-3">
                            ${fmtT(t.start_time)} → ${fmtT(t.end_time)}
                        </div>
                        <span class="ml-2 shrink-0">${statusBadge(t.status)}</span>
                    </div>`).join('')}
                </div>
            </div>`;
        }).join('') : '<div class="text-muted text-sm text-center py-4">Belum ada task terjadwal.</div>';

        // ── Batches ──────────────────────────────────────────────────────────
        const batchRows = batches.map(b => `
            <tr>
                <td class="font-mono">${b.code || b.id?.slice(0,8)}</td>
                <td>${b.menu_name || '-'}</td>
                <td class="text-center">${b.batch_number || '-'}</td>
                <td class="text-center">${b.batch_size || '-'}</td>
                <td class="text-xs">${fmtT(b.start_time)}</td>
                <td class="text-xs">${fmtT(b.end_time)}</td>
                <td>${statusBadge(b.status)}</td>
            </tr>`).join('');

        const batchHtml = batches.length ? `
            <div class="card mt-4">
                <div class="font-bold mb-3"><i class="fas fa-layer-group mr-1 text-primary"></i>Batches Masak</div>
                <div class="table-responsive">
                    <table class="nutri-table w-full text-xs">
                        <thead><tr><th>Kode</th><th>Menu</th><th>Batch#</th><th>Ukuran</th><th>Mulai</th><th>Selesai</th><th>Status</th></tr></thead>
                        <tbody>${batchRows}</tbody>
                    </table>
                </div>
            </div>` : '';

        const code = plan.code || pid.slice(0, 8);
        const slackLabel = stats.slack_minutes != null
            ? `<span class="text-xs ${stats.slack_minutes < 0 ? 'text-danger' : 'text-success'}">Slack: ${stats.slack_minutes}m</span>`
            : '';

        ws.innerHTML = `
            <div class="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                    <button class="btn btn-secondary btn-xs mb-2" onclick="loadPlans()">
                        <i class="fas fa-arrow-left mr-1"></i> Kembali
                    </button>
                    <div class="flex items-center gap-2 flex-wrap">
                        <h4 class="font-bold text-lg font-mono">${code}</h4>
                        ${statusBadge(plan.status)}
                        ${slackLabel}
                    </div>
                    <div class="text-xs text-muted mt-1">Dibuat: ${fmtT(plan.created_at)}</div>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-danger btn-sm" onclick='deletePlan(${JSON.stringify(pid)}, ${JSON.stringify(code)})'>
                        <i class="fas fa-trash mr-1"></i> Hapus Plan
                    </button>
                </div>
            </div>

            <!-- Summary strip -->
            <div class="card mb-4">
                <div class="grid gap-4 text-sm" style="display:grid; grid-template-columns: repeat(auto-fit,minmax(120px,1fr))">
                    <div>
                        <div class="text-muted text-xs">Target Porsi</div>
                        <div class="font-bold text-lg">${plan.target_portions || 0}</div>
                    </div>
                    <div>
                        <div class="text-muted text-xs">Total Tasks</div>
                        <div class="font-bold text-lg">${tasks.length}</div>
                    </div>
                    <div>
                        <div class="text-muted text-xs">Batches</div>
                        <div class="font-bold text-lg">${batches.length}</div>
                    </div>
                    <div>
                        <div class="text-muted text-xs">Target Distribusi</div>
                        <div class="font-bold">${fmtT(plan.target_delivery_time)}</div>
                    </div>
                    <div>
                        <div class="text-muted text-xs">Mulai Produksi</div>
                        <div class="font-bold">${fmtT(stats.earliest_start_time)}</div>
                    </div>
                    <div>
                        <div class="text-muted text-xs">Selesai Produksi</div>
                        <div class="font-bold">${fmtT(stats.latest_end_time)}</div>
                    </div>
                </div>
            </div>

            <!-- Timeline per divisi -->
            <div class="card mb-4">
                <div class="font-bold mb-3"><i class="fas fa-timeline mr-1 text-primary"></i>Timeline Jobdesc per Divisi</div>
                <div class="overflow-y-auto" style="max-height:50vh">
                    ${timelineHtml}
                </div>
            </div>

            ${batchHtml}
        `;
    } catch (e) {
        ws.innerHTML = `<div class="card p-4 text-danger">Gagal memuat detail: ${e.message}</div>`;
    }
}

async function reviewBidAction(planId, bidId, action) {
    const dec = String(action || '').toLowerCase();
    if (!['approve', 'reject'].includes(dec)) return;
    const pid = String(planId || '').trim();
    const bid = String(bidId || '').trim();
    if (!pid || !bid) return;

    if (dec === 'approve') {
        const ok =
            typeof confirmUi === 'function'
                ? await confirmUi({
                      title: 'Pilih pemenang bid',
                      message:
                          'Bid lain pada PO ini yang masih pending akan otomatis ditolak. Supplier yang menang bisa melihat status di portal.',
                      confirmLabel: 'Ya, pilih bid ini',
                      cancelLabel: 'Batal',
                      danger: false,
                  })
                : confirm('Pilih bid ini sebagai pemenang?');
        if (!ok) return;
    } else {
        const ok =
            typeof confirmUi === 'function'
                ? await confirmUi({
                      title: 'Tolak bid',
                      message: 'Tolak bid dari supplier ini?',
                      confirmLabel: 'Tolak',
                      cancelLabel: 'Batal',
                      danger: true,
                  })
                : confirm('Tolak bid ini?');
        if (!ok) return;
    }

    try {
        await api(`/api/procurement/plans/${pid}/po/bids/${bid}/review`, 'PUT', { decision: dec });
        notifyUi('success', 'Bid', dec === 'approve' ? 'Bid dipilih sebagai pemenang.' : 'Bid ditolak.');
        viewPlanDetail(pid);
    } catch (e) {
        notifyUi('danger', 'Bid', (e && e.message) ? e.message : String(e));
    }
}

async function publishPlanById(planId) {
    if (!confirm('Publish plan ini? Akan langsung aktif.')) return;

    try {
        await api(`/api/procurement/plans/${planId}/publish`, 'POST');
        notifyUi('success', 'Publish', 'Plan berhasil dipublish!');
        viewPlanDetail(planId);
    } catch (e) {
        notifyUi('danger', 'Publish', e.message);
    }
}

// ─── Receiving Section ──────────────────────────────────────────────────────

async function loadReceivingSection(planId) {
    const section = document.getElementById('receiving-section');
    if (!section) return;

    try {
        const items = await api(`/api/procurement/plans/${planId}/receiving`);

        if (!items || !items.length) {
            section.innerHTML = `
                <div class="card">
                    <div class="font-bold mb-2">Penerimaan Barang</div>
                    <p class="text-muted text-sm">Belum ada material yang perlu diterima.</p>
                </div>`;
            return;
        }

        const allComplete = items.every(i => i.is_complete);

        const rows = items.map(item => {
            const pct = item.quantity_needed > 0 ? Math.min(100, Math.round((item.received_qty / item.quantity_needed) * 100)) : 0;
            const statusIcon = item.is_complete
                ? '<i class="fas fa-check-circle text-success"></i>'
                : (item.received_qty > 0 ? '<i class="fas fa-clock text-warning"></i>' : '<i class="fas fa-circle text-muted" style="font-size:0.6rem;"></i>');

            return `
                <tr data-material-id="${item.id}" data-type="${item.material_type}">
                    <td>
                        ${statusIcon}
                        <span class="ml-2">${item.material_name}</span>
                        <span class="badge ${item.material_type === 'ingredient' ? 'badge-primary' : 'badge-muted'}" style="font-size:0.55rem; margin-left:4px;">${item.material_type}</span>
                    </td>
                    <td class="font-mono">${item.quantity_needed.toFixed(2)} ${item.unit}</td>
                    <td class="font-mono">${item.received_qty.toFixed(2)} ${item.unit}</td>
                    <td class="font-mono">${item.remaining.toFixed(2)}</td>
                    <td>
                        <div class="flex items-center gap-1">
                            <div style="flex:1; height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
                                <div style="width:${pct}%; height:100%; background:${item.is_complete ? 'var(--success)' : 'var(--accent)'}; border-radius:3px;"></div>
                            </div>
                            <span class="text-xs font-mono" style="min-width:32px; text-align:right;">${pct}%</span>
                        </div>
                    </td>
                    <td>
                        ${item.is_complete
                            ? '<span class="text-xs text-success font-bold">Lengkap</span>'
                            : `<input type="number" class="input-field recv-qty-input" style="width:80px; height:28px; padding:2px 6px; font-size:0.75rem;"
                                     data-mid="${item.id}" min="0" step="0.01" max="${item.remaining.toFixed(2)}"
                                     placeholder="${item.remaining.toFixed(2)}" value="${item.remaining > 0 ? item.remaining.toFixed(2) : ''}">`
                        }
                    </td>
                </tr>`;
        }).join('');

        section.innerHTML = `
            <div class="card" style="border-left: 4px solid var(--accent);">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <div class="font-bold">Penerimaan Barang</div>
                        <div class="text-xs text-muted mt-1">Centang dan isi jumlah yang diterima. Stok inventory akan otomatis ter-update untuk bahan baku (ingredient).</div>
                    </div>
                    <div class="flex gap-2">
                        ${allComplete
                            ? '<span class="badge badge-success"><i class="fas fa-check mr-1"></i> Semua Diterima</span>'
                            : `<button class="btn btn-secondary btn-sm" onclick="loadReceivingSection('${planId}')"><i class="fas fa-sync"></i></button>
                               <button class="btn btn-primary btn-sm" onclick="submitReceiving('${planId}')"><i class="fas fa-truck-loading mr-1"></i> Konfirmasi Terima</button>`
                        }
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="nutri-table w-full">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Dibutuhkan</th>
                                <th>Diterima</th>
                                <th>Sisa</th>
                                <th>Progress</th>
                                <th>Qty Terima</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                ${allComplete ? '' : `
                    <div class="mt-3 p-2 text-xs text-muted" style="border-left: 3px solid var(--border);">
                        <i class="fas fa-info-circle mr-1"></i>
                        Isi jumlah yang diterima pada kolom "Qty Terima", lalu klik "Konfirmasi Terima".
                        Bahan baku (ingredient) akan otomatis menambah stok inventory. Bahan operasional hanya tercatat di plan.
                    </div>
                `}
            </div>`;
    } catch (e) {
        section.innerHTML = `<div class="card p-4 text-danger">Gagal memuat data penerimaan: ${e.message}</div>`;
    }
}

async function submitReceiving(planId) {
    const inputs = document.querySelectorAll('.recv-qty-input');
    const items = [];

    inputs.forEach(inp => {
        const qty = parseFloat(inp.value);
        const mid = inp.getAttribute('data-mid');
        if (mid && qty > 0 && Number.isFinite(qty)) {
            items.push({ material_id: mid, received_qty: qty });
        }
    });

    if (!items.length) {
        return notifyUi('warning', 'Receiving', 'Tidak ada item yang diisi qty-nya.');
    }

    if (!confirm(`Konfirmasi penerimaan ${items.length} item? Stok inventory akan diperbarui.`)) return;

    try {
        const res = await api(`/api/procurement/plans/${planId}/receiving`, 'POST', { items });
        const msg = `${res.items_received || 0} item diterima, ${res.stock_updated || 0} stok inventory di-update.`;
        notifyUi('success', 'Receiving', msg);

        if (res.all_complete) {
            notifyUi('info', 'PO', 'Semua item sudah diterima. PO status: Delivered.');
        }

        loadReceivingSection(planId);
    } catch (e) {
        notifyUi('danger', 'Receiving', e.message);
    }
}

// ─── Publish War Room draft → plan + batches + tasks per divisi + deliveries ─

async function commitDraftToJobdesc() {
    const draftId = window._warRoomDraftId;
    const sim = window._warRoomLastSim;
    const cfg = window._warRoomLastConfig;

    if (!draftId) return notifyUi('warning', 'Publish', 'Draft belum tersimpan. Jalankan Simulate dulu.');
    if (!sim || !Array.isArray(sim.timeline) || !sim.timeline.length) {
        return notifyUi('warning', 'Publish', 'Timeline simulasi belum ada. Jalankan Simulate dulu.');
    }

    const isFeasible = !!(sim.feasibility && sim.feasibility.status === 'FEASIBLE');
    const warnMsg = isFeasible
        ? 'Publish plan dari War Room? Akan membuat tasks per divisi (Jobdesc) dan order delivery.'
        : 'Simulasi belum FEASIBLE. Tetap publish? Tasks per divisi & delivery akan tetap dibuat, tapi risikonya meleset dari deadline.';
    const ok = typeof confirmUi === 'function'
        ? await confirmUi({ title: 'Publish ke Jobdesc', message: warnMsg, confirmLabel: 'Publish', cancelLabel: 'Batal', danger: !isFeasible })
        : confirm(warnMsg);
    if (!ok) return;

    try {
        notifyUi('info', 'Publish', 'Menerbitkan plan & membuat tasks per divisi...');
        const foodId = (cfg && cfg.food_id) || (typeof window !== 'undefined' && window._draftConfig && window._draftConfig.food_id) || null;
        const payload = {
            food_id: foodId || undefined,
            production_date: cfg ? (cfg.production_date || cfg.plan_date) : undefined,
            waves: cfg ? cfg.waves : undefined,
            timeline: sim.timeline
        };
        const ep = String(typeof window !== 'undefined' && window._commitExistingPlanId || '').trim();
        if (ep) payload.existing_plan_id = ep;
        const res = await api(`/api/plans/draft/${draftId}/commit`, 'POST', payload);
        notifyUi(
            'success',
            'Publish',
            `Plan ${res.plan_code} dibuat. ${res.tasks_created || 0} task di Jobdesc, ${res.batches_created || 0} batch masak, ${res.deliveries_created || 0} delivery.`
        );

        window._warRoomDraftId = null;
        window._commitExistingPlanId = null;

        const goTasks = typeof confirmUi === 'function'
            ? await confirmUi({ title: 'Lihat Jobdesc', message: 'Plan sudah diterbitkan. Buka halaman Jobdesc & Tasks sekarang?', confirmLabel: 'Buka', cancelLabel: 'Nanti' })
            : confirm('Plan sudah diterbitkan. Buka halaman Jobdesc & Tasks sekarang?');
        if (goTasks && typeof switchView === 'function') switchView('jobdesc');
    } catch (e) {
        window._commitExistingPlanId = null;
        notifyUi('danger', 'Publish', e && e.message ? e.message : 'Gagal publish plan');
    }
}

// ─── Expose globals ─────────────────────────────────────────────────────────

window.loadPlans = loadPlans;
window.viewPlanDetail = viewPlanDetail;
window.reviewBidAction = reviewBidAction;
window.publishPlanById = publishPlanById;
window.loadReceivingSection = loadReceivingSection;
window.submitReceiving = submitReceiving;
window.openMaterialCalcStep = openMaterialCalcStep;
window.runMaterialCalc = runMaterialCalc;
window.syncMaterialPlanRow = syncMaterialPlanRow;
window.updateMaterialPrice = updateMaterialPrice;
window.openPOCreateStep = openPOCreateStep;
window.submitPO = submitPO;
window.printPO = printPO;
window.commitDraftToJobdesc = commitDraftToJobdesc;
window.startJobdescPostFromProcurement = startJobdescPostFromProcurement;
window.startProcurementFromPlanList = startProcurementFromPlanList;
window.editProcurementFromPlanList = editProcurementFromPlanList;

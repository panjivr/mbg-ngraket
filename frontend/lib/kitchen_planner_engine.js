/**
 * Kitchen Planner Engine (rule-v1) — Pipeline + DAG + Batch Pipelining + Shift Gating.
 *
 * Desain keputusan:
 *  - Workflow = DAG (workflow_steps.depends_on_step_ids eksplisit)
 *  - Batch-level pipelining: (step_k, batch_i) = 1 task node. Successor batch mulai
 *    ketika SATU batch predecessor selesai (tidak full-completion).
 *  - Shift gating + accumulation: kalau ready_time di luar shift divisi penerima,
 *    start digeser ke shift segment berikutnya (natural accumulation).
 *  - Hybrid scheduling: backward dari delivery_time + validate ke production_start_time.
 *  - Pack virtual steps (main + extra) di-inject caller via `workflowSteps`.
 *
 * Extensible: registerEngine(name, fn) untuk swap ke ML/LLM kelak.
 */

const MIN_MS = 60 * 1000;

const engines = {
    'rule-v1': planProductionRuleV1
};

function registerEngine(name, fn) {
    if (!name || typeof fn !== 'function') throw new Error('registerEngine: name + fn required');
    engines[String(name)] = fn;
}

async function planProduction(params) {
    const version = String(params && params.engineVersion || 'rule-v1');
    const fn = engines[version];
    if (!fn) throw new Error(`Engine "${version}" tidak terdaftar`);
    return await fn(params);
}

// =====================================================================
// SHIFT NORMALIZATION
// =====================================================================

function parseHHMMToMinutes(s) {
    const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Bangun semua shift segment untuk 1 divisi di window [anchorDate - lookBackDays, anchorDate + lookAheadDays].
 * Handle overnight shift (start > end) dengan geser end ke hari berikutnya.
 * Return: array { startMs, endMs } ter-urut.
 *
 * @param {number} tzOffsetMinutes  getTimezoneOffset() convention: WIB = -420 (UTC+7).
 *                                  Dipakai agar "midnight lokal" = anchor, bukan UTC midnight.
 *                                  Default: -420 (WIB).
 */
function buildShiftSegments(shifts, anchorDateIso, lookBackDays = 1, lookAheadDays = 2, tzOffsetMinutes = -420) {
    const segments = [];
    if (!Array.isArray(shifts) || !shifts.length) return segments;

    // Hitung epoch UTC untuk "local midnight of anchorDate".
    //
    // JS convention: getTimezoneOffset() = (UTC - local) dalam menit.
    // WIB (UTC+7) → offset = -420. Jogja 23-Apr 00:00 WIB = 22-Apr 17:00 UTC.
    //
    // Date.UTC(Y, Mo-1, D) mengembalikan epoch UTC "midnight UTC" di tanggal itu.
    // Untuk mendapat epoch dari "local midnight" di tanggal yang sama:
    //   localMidnight_ms = UTC_midnight_ms + tzOffsetMinutes * 60000
    // (tzOffsetMinutes negatif untuk zona timur → menambah nilai negatif = mundur jam).
    const anchorLocalMs = new Date(anchorDateIso + 'T00:00:00.000Z').getTime() + tzOffsetMinutes * MIN_MS;
    if (isNaN(anchorLocalMs)) return segments;

    for (let dayOffset = -lookBackDays; dayOffset <= lookAheadDays; dayOffset++) {
        for (const sh of shifts) {
            if (!sh || !sh.start_time || !sh.end_time) continue;
            const startMin = parseHHMMToMinutes(sh.start_time);
            const endMin = parseHHMMToMinutes(sh.end_time);
            if (startMin == null || endMin == null) continue;
            const dayBaseMs = anchorLocalMs + dayOffset * 24 * 60 * MIN_MS;
            let startMs = dayBaseMs + startMin * MIN_MS;
            let endMs = dayBaseMs + endMin * MIN_MS;
            if (endMs <= startMs) endMs += 24 * 60 * MIN_MS; // overnight shift
            segments.push({ startMs, endMs, name: sh.name || '', shiftId: sh.id });
        }
    }
    segments.sort((a, b) => a.startMs - b.startMs);
    return segments;
}

/**
 * Find next shift segment yang berisi atau dimulai setelah `tMs`.
 * Return start_time efektif dari segment itu, atau null kalau tidak ada.
 */
function nextShiftSegmentStart(segments, tMs) {
    if (!segments || !segments.length) return null;
    for (const seg of segments) {
        if (tMs <= seg.startMs) return { segStart: seg.startMs, segEnd: seg.endMs };
        if (tMs >= seg.startMs && tMs < seg.endMs) return { segStart: tMs, segEnd: seg.endMs };
    }
    return null;
}

// =====================================================================
// DAG TOPO SORT + CYCLE DETECT
// =====================================================================

function topoSortSteps(steps) {
    const byId = new Map(steps.map(s => [String(s.id), s]));
    const indeg = new Map();
    const deps = new Map();
    for (const s of steps) {
        const ds = Array.isArray(s.depends_on_step_ids) ? s.depends_on_step_ids.map(String).filter(id => byId.has(id)) : [];
        deps.set(String(s.id), ds);
        indeg.set(String(s.id), ds.length);
    }
    const queue = [];
    for (const [id, deg] of indeg.entries()) if (deg === 0) queue.push(id);
    // stable by step_order
    queue.sort((a, b) => (byId.get(a).step_order || 0) - (byId.get(b).step_order || 0));
    const successors = new Map();
    for (const s of steps) successors.set(String(s.id), []);
    for (const [id, ds] of deps.entries()) for (const d of ds) successors.get(d).push(id);

    const result = [];
    const visited = new Set();
    while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        result.push(byId.get(id));
        for (const succ of (successors.get(id) || [])) {
            indeg.set(succ, (indeg.get(succ) || 0) - 1);
            if (indeg.get(succ) === 0) queue.push(succ);
        }
        queue.sort((a, b) => (byId.get(a).step_order || 0) - (byId.get(b).step_order || 0));
    }
    if (result.length !== steps.length) {
        throw new Error('Cycle detected di workflow_steps.depends_on_step_ids');
    }
    return result;
}

// =====================================================================
// ROUTING (step -> divisi berdasar activity_type + capabilities)
// =====================================================================

function stringSimilarity(a, b) {
    const sa = String(a || '').toLowerCase();
    const sb = String(b || '').toLowerCase();
    if (!sa || !sb) return 0;
    if (sa === sb) return 1;
    if (sa.includes(sb) || sb.includes(sa)) return 0.7;
    let common = 0;
    for (const ch of new Set(sa)) if (sb.includes(ch)) common++;
    return common / Math.max(sa.length, sb.length);
}

function routeStepToDivision(step, divisions, loadMap, warnings) {
    const at = String(step.activity_type || '').toLowerCase();
    const matched = (divisions || []).filter(d => Array.isArray(d.capabilities) && d.capabilities.includes(at));
    if (matched.length === 1) return { divisionId: matched[0].id, rationale: `capability "${at}" cocok hanya di ${matched[0].name}` };
    if (matched.length > 1) {
        // Tie-breaker: prefer loading paling longgar
        let best = matched[0];
        let bestScore = -Infinity;
        for (const d of matched) {
            const load = loadMap.get(d.id) || 0;
            const cap = (d.max_parallel_batches || 1);
            const score = cap - load;
            if (score > bestScore) { bestScore = score; best = d; }
        }
        return { divisionId: best.id, rationale: `capability "${at}" multi-match, prefer ${best.name} (load=${loadMap.get(best.id) || 0}, cap=${best.max_parallel_batches})` };
    }
    // Fallback similarity
    let bestDiv = null, bestSim = 0;
    for (const d of (divisions || [])) {
        for (const cap of (d.capabilities || [])) {
            const sim = stringSimilarity(at, cap);
            if (sim > bestSim) { bestSim = sim; bestDiv = d; }
        }
    }
    if (bestDiv && bestSim >= 0.3) {
        warnings.push({ level: 'warn', message: `Activity "${at}" tidak persis match capabilities - fallback ke ${bestDiv.name} (similarity ${bestSim.toFixed(2)}). Tambahkan ke Scope Divisi kalau benar.`, stepId: step.id });
        return { divisionId: bestDiv.id, rationale: `fallback similarity ${bestSim.toFixed(2)} ke ${bestDiv.name}` };
    }
    const cooking = (divisions || []).find(d => d.id === 'cooking');
    if (cooking) {
        warnings.push({ level: 'error', message: `Activity "${at}" tidak ada divisi yang handle - fallback ke Divisi Pengolahan`, stepId: step.id });
        return { divisionId: 'cooking', rationale: `fallback ultimate ke Pengolahan` };
    }
    warnings.push({ level: 'error', message: `Activity "${at}" tidak ada divisi yang handle dan Divisi Pengolahan juga tidak ada`, stepId: step.id });
    return { divisionId: (divisions[0] && divisions[0].id) || null, rationale: 'last resort' };
}

// =====================================================================
// SCHEDULER CORE (pipeline + shift gating + accumulation)
// =====================================================================

/**
 * Schedule satu "chunk" (tiap menu / tiap wave compiled).
 * Return { timeline, assignment }.
 *
 * @param {Array} steps - hasil topoSortSteps (sudah dalam urutan DAG)
 * @param {number} batchCount
 * @param {Map<divId, Array<{startMs,endMs}>>} segmentsByDiv
 * @param {Object} divMap - divId -> division profile
 * @param {Array} warnings - untuk push warning
 * @param {Object} assignMap - stepId -> divisionId (pre-routed)
 */
function scheduleChunk(steps, batchCount, segmentsByDiv, divMap, assignMap, warnings, earliestAllowedMs = 0) {
    // node = (stepId, batchIdx) ; key = `${stepId}|${batchIdx}`
    const endTimes = new Map(); // key -> endMs
    const timeline = [];
    // division free-slots: divId -> array of free timestamps (size = max_parallel_batches)
    const divSlots = new Map();
    for (const [divId, div] of divMap.entries()) {
        const parallel = Math.max(1, div.max_parallel_batches || 1);
        divSlots.set(divId, new Array(parallel).fill(earliestAllowedMs || 0));
    }

    for (const step of steps) {
        const sid = String(step.id);
        const divId = assignMap[sid];
        const div = divMap.get(divId);
        const segments = segmentsByDiv.get(divId) || [];
        const duration = Math.max(1, Number(step.duration_minutes_per_batch || 0)) * MIN_MS;
        const bCap = Math.max(1, Number(step.batch_capacity || 1));
        const stepBatchCount = Math.max(1, Math.ceil(batchCount * 1)); // batch_capacity scaling kalau kita mau bagi lebih halus
        // keep it simple: pakai batchCount sebagai batch count untuk semua step (target porsi / batch_capacity terbesar)

        for (let bi = 0; bi < batchCount; bi++) {
            // ready_time = max end of predecessors (batch bi)
            let readyMs = earliestAllowedMs || 0;
            const preds = Array.isArray(step.depends_on_step_ids) ? step.depends_on_step_ids : [];
            for (const pid of preds) {
                const k = `${pid}|${bi}`;
                const prevEnd = endTimes.get(k);
                if (prevEnd == null) continue; // tolerate missing (custom graphs)
                if (prevEnd > readyMs) readyMs = prevEnd;
            }

            // shift gate
            let startMs = readyMs;
            if (segments.length) {
                const seg = nextShiftSegmentStart(segments, Math.max(readyMs, 1));
                if (!seg) {
                    warnings.push({ level: 'error', message: `Divisi "${div ? div.name : divId}" tidak punya shift yang cukup untuk step ${step.title} batch ${bi + 1}`, stepId: sid });
                    continue;
                }
                startMs = seg.segStart;
            }

            // division parallel-slot: earliest slot
            const slots = divSlots.get(divId);
            if (slots && slots.length) {
                let earliestSlotIdx = 0;
                for (let i = 1; i < slots.length; i++) if (slots[i] < slots[earliestSlotIdx]) earliestSlotIdx = i;
                startMs = Math.max(startMs, slots[earliestSlotIdx]);
                // re-check shift boundary after slot-wait
                if (segments.length) {
                    const seg2 = nextShiftSegmentStart(segments, startMs);
                    if (!seg2) {
                        warnings.push({ level: 'error', message: `Batch ${bi + 1} step ${step.title} tidak muat di shift divisi`, stepId: sid });
                        continue;
                    }
                    startMs = seg2.segStart;
                }
                const endMs = startMs + duration;
                slots[earliestSlotIdx] = endMs;
                endTimes.set(`${sid}|${bi}`, endMs);
                timeline.push({
                    stepId: sid,
                    divisionId: divId,
                    batchIndex: bi,
                    startMs, endMs,
                    title: step.title,
                    activity_type: step.activity_type,
                    ingredient_group: step.ingredient_group || null,
                    startIso: new Date(startMs).toISOString(),
                    endIso: new Date(endMs).toISOString()
                });
            }
        }
    }

    return { timeline, endTimes };
}

// =====================================================================
// MAIN RULE-V1
// =====================================================================

async function planProductionRuleV1(params) {
    const {
        workflowSteps = [],
        divisions = [],
        planDate,                   // "YYYY-MM-DD"
        productionStartTime = null, // ISO (earliest window engine BOLEH mulai)
        waves = [],                 // [{wave_number, portion_count, delivery_time}]
        lookBackDays = 1,
        lookAheadDays = 2,
        tzOffsetMinutes = -420      // Default WIB (UTC+7). Kirim dari server via header X-Tz-Offset-Minutes
    } = params || {};

    const warnings = [];
    const proposals = [];

    if (!planDate) return { feasible: false, warnings: [{ level: 'error', message: 'planDate wajib' }], proposals: [], timeline: [], assignment: [], engineVersion: 'rule-v1' };
    if (!Array.isArray(waves) || !waves.length) return { feasible: false, warnings: [{ level: 'error', message: 'waves wajib berisi minimal 1 entry' }], proposals: [], timeline: [], assignment: [], engineVersion: 'rule-v1' };
    if (!Array.isArray(workflowSteps) || !workflowSteps.length) return { feasible: false, warnings: [{ level: 'error', message: 'workflowSteps kosong' }], proposals: [], timeline: [], assignment: [], engineVersion: 'rule-v1' };

    // Build division map + shift segments (dengan timezone offset lokal)
    const divMap = new Map();
    const segmentsByDiv = new Map();
    for (const d of divisions) {
        divMap.set(d.id, d);
        const shifts = Array.isArray(d.shifts) ? d.shifts : [];
        const segs = buildShiftSegments(shifts, planDate, lookBackDays, lookAheadDays, tzOffsetMinutes);
        segmentsByDiv.set(d.id, segs);
        // Warn kalau divisi punya kapabilitas (akan dapat step) tapi tidak punya shift
        // sama sekali -> engine tidak akan menggating jam kerjanya (jadwal bebas).
        const hasCaps = Array.isArray(d.capabilities) && d.capabilities.length > 0;
        if (hasCaps && segs.length === 0) {
            warnings.push({
                level: 'warn',
                message: `Divisi "${d.name || d.id}" tidak memiliki shift aktif pada ${planDate} (±${lookBackDays}/${lookAheadDays} hari). Jadwal divisi ini TIDAK dibatasi jam kerja. Tambahkan shift di Setup Kitchen › Shift & HR.`
            });
        }
    }

    // Routing (step -> divisi) + initial load map
    const loadMap = new Map();
    const assignment = [];
    const assignMap = {};
    for (const s of workflowSteps) {
        const r = routeStepToDivision(s, divisions, loadMap, warnings);
        assignment.push({ stepId: s.id, divisionId: r.divisionId, rationale: r.rationale });
        assignMap[String(s.id)] = r.divisionId;
        loadMap.set(r.divisionId, (loadMap.get(r.divisionId) || 0) + 1);
    }

    // Topo sort
    let sortedSteps;
    try { sortedSteps = topoSortSteps(workflowSteps); }
    catch (e) {
        return { feasible: false, warnings: [{ level: 'error', message: e.message }], proposals: [], timeline: [], assignment, engineVersion: 'rule-v1' };
    }

    // Aggregate target_portions dari waves untuk batch count
    const totalPortions = waves.reduce((sum, w) => sum + Number(w.portion_count || 0), 0);
    if (totalPortions <= 0) return { feasible: false, warnings: [{ level: 'error', message: 'total portions di waves = 0' }], proposals: [], timeline: [], assignment, engineVersion: 'rule-v1' };

    // Batch count = ceil(totalPortions / min(batch_capacity across cook/plate steps))
    const coreBatchCaps = sortedSteps
        .filter(s => ['cook', 'plate'].includes(String(s.activity_type)))
        .map(s => Number(s.batch_capacity || 0))
        .filter(n => n > 0);
    const minBatchCap = coreBatchCaps.length ? Math.min(...coreBatchCaps) : 50;
    const batchCount = Math.max(1, Math.ceil(totalPortions / minBatchCap));

    // Earliest allowed ms: production_start_time (clamp) kalau ada, else anchor ke midnight LOKAL planDate
    let earliestAllowedMs = 0;
    if (productionStartTime) {
        const pstMs = new Date(productionStartTime).getTime();
        if (!isNaN(pstMs)) earliestAllowedMs = pstMs;
    }
    if (!earliestAllowedMs) {
        // Midnight lokal = UTC midnight + tzOffsetMinutes (tzOffsetMinutes negatif untuk zona timur)
        const anchorMs = new Date(planDate + 'T00:00:00.000Z').getTime() + tzOffsetMinutes * MIN_MS;
        if (!isNaN(anchorMs)) earliestAllowedMs = anchorMs;
    }

    // Run scheduler
    const { timeline } = scheduleChunk(sortedSteps, batchCount, segmentsByDiv, divMap, assignMap, warnings, earliestAllowedMs);

    // ---------------------------------------------------------------
    // Feasibility checks
    //   1) Timeline start >= productionStartTime (jika di-set)
    //   2) Timeline end   <= earliest delivery_time wave
    //      (wave paling awal HARUS sudah siap sebelum dikirim)
    // ---------------------------------------------------------------
    let feasible = true;
    const earliestTimelineStart = timeline.length ? Math.min(...timeline.map(t => t.startMs)) : null;
    const latestTimelineEnd     = timeline.length ? Math.max(...timeline.map(t => t.endMs))   : null;

    // Check 1: start time
    if (productionStartTime) {
        const pstMs = new Date(productionStartTime).getTime();
        if (!isNaN(pstMs) && earliestTimelineStart != null && earliestTimelineStart < pstMs) {
            feasible = false;
            const earliestItem = timeline.find(t => t.startMs === earliestTimelineStart);
            if (earliestItem) {
                const div = divMap.get(earliestItem.divisionId);
                proposals.push({
                    kind: 'shift_division_earlier',
                    divisionId: earliestItem.divisionId,
                    currentStartTime: new Date(earliestTimelineStart).toISOString(),
                    proposedStartTime: new Date(earliestTimelineStart).toISOString(),
                    reason: `Divisi ${div ? div.name : earliestItem.divisionId} perlu masuk ${new Date(earliestTimelineStart).toLocaleString('id-ID')}, lebih awal dari production_start_time ${new Date(pstMs).toLocaleString('id-ID')}. Sesuaikan shift atau geser production_start_time lebih awal.`
                });
            }
            warnings.push({
                level: 'error',
                message: `Timeline dimulai ${new Date(earliestTimelineStart).toLocaleString('id-ID')} — lebih awal dari jam mulai produksi yang kamu set (${new Date(pstMs).toLocaleString('id-ID')}).`
            });
        }
    }

    // Check 2: delivery time (SELALU dicek, meskipun productionStartTime kosong)
    const deliveryTimes = waves
        .map(w => new Date(w.delivery_time).getTime())
        .filter(t => !isNaN(t) && t > 0);
    const earliestDeliveryMs = deliveryTimes.length ? Math.min(...deliveryTimes) : 0;
    const latestDeliveryMs   = deliveryTimes.length ? Math.max(...deliveryTimes) : 0;

    if (latestTimelineEnd != null && earliestDeliveryMs > 0 && latestTimelineEnd > earliestDeliveryMs) {
        // Timeline selesai setelah wave paling awal → tidak feasible
        feasible = false;
        warnings.push({
            level: 'error',
            message: `Timeline produksi baru selesai ${new Date(latestTimelineEnd).toLocaleString('id-ID')}, padahal wave paling awal harus dikirim ${new Date(earliestDeliveryMs).toLocaleString('id-ID')}. Kurang ${Math.ceil((latestTimelineEnd - earliestDeliveryMs) / 60000)} menit.`
        });
        if (latestDeliveryMs > 0) {
            proposals.push({
                kind: 'delay_delivery',
                proposedDeliveryTime: new Date(latestTimelineEnd + 30 * MIN_MS).toISOString(),
                reason: `Opsi: geser delivery wave paling awal ke ~${new Date(latestTimelineEnd + 30 * MIN_MS).toLocaleString('id-ID')} (timeline + 30 menit buffer).`
            });
        }
        proposals.push({
            kind: 'start_earlier',
            proposedProductionStart: productionStartTime
                ? new Date(new Date(productionStartTime).getTime() - Math.ceil((latestTimelineEnd - earliestDeliveryMs) / MIN_MS) * MIN_MS - 30 * MIN_MS).toISOString()
                : null,
            reason: `Opsi: majukan jam mulai produksi ~${Math.ceil((latestTimelineEnd - earliestDeliveryMs) / 60000) + 30} menit lebih awal.`
        });
        proposals.push({
            kind: 'reduce_portions',
            proposedPortionsMax: Math.floor(totalPortions * 0.8),
            reason: `Opsi: kurangi total porsi ke ~${Math.floor(totalPortions * 0.8)} supaya muat di window.`
        });
    }

    // Equipment / stove warnings untuk divisi cooking
    const cooking = divMap.get('cooking');
    if (cooking) {
        const needsStove = sortedSteps.filter(s => String(s.required_resource_type || '').toLowerCase() === 'stove').length;
        const stoves = (cooking.equipmentSummary || []).filter(e => String(e.type || '').toLowerCase().includes('kompor') || String(e.name || '').toLowerCase().includes('kompor') || String(e.type || '').toLowerCase() === 'stove').reduce((s, e) => s + Number(e.quantity || 1), 0);
        if (needsStove > 0 && stoves === 0) warnings.push({ level: 'warn', message: `Workflow butuh ${needsStove} step kompor tapi kitchen_equipment tidak punya kompor. Tambahkan di master alat.` });
    }

    return {
        timeline,
        assignment,
        warnings,
        proposals,
        feasible,
        batchCount,
        totalPortions,
        engineVersion: 'rule-v1'
    };
}

module.exports = {
    planProduction,
    registerEngine,
    // Export helpers untuk testing
    _internals: {
        buildShiftSegments,
        nextShiftSegmentStart,
        topoSortSteps,
        routeStepToDivision,
        scheduleChunk,
        normalizeUnitAndQty: null
    }
};

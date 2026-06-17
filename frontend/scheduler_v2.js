
/**
 * Advanced Scheduler with Heuristic Resource Allocation
 * Supports: Pipelining, Equipment Constraints, Staggered Deliveries, Custom Workflows
 */

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

function subMinutes(date, minutes) {
    return new Date(date.getTime() - minutes * 60000);
}

// --- GENERIC WORKFLOW HELPERS ---

function getStepDuration(step, portions, menu, rates) {
    const dur = Number(step.duration_minutes || 0);
    // If division is 'prep' or 'packing', we might want to use rates if duration is 0
    if (dur > 0) return dur; // Fixed duration from step definition (per batch usually)

    // Fallback to rates if duration is not set in step but standard division logic applies
    if (step.division_id === 'prep') {
        return Math.ceil((portions / (rates.prep_per_hour || 50)) * 60);
    }
    if (step.division_id === 'packing') {
        return Math.ceil((portions / (rates.pack_per_hour || 100)) * 60);
    }
    if (step.division_id === 'receiving') return 60; // Standard 1 hour
    if (step.division_id === 'driver') return 30; // Standard 30 mins
    
    return 15; // Default fallback
}

// --- BACKWARD SCHEDULER (Deadline Driven) ---

function calculateGenericBackward(deliveries, menu, equipmentList, rates, existingUsage) {
    // Sort deliveries: latest first
    const sortedDeliveries = [...deliveries].sort((a, b) => new Date(b.time) - new Date(a.time));
    const schedule = [];
    
    // We treat steps as a sequence.
    // Last step ends at delivery time (or before driver).
    // Actually, usually "Driver" is the last step.
    // If workflow has explicit steps, we follow them.
    
    const steps = menu.steps || [];
    
    for (const delivery of sortedDeliveries) {
        let currentTime = new Date(delivery.time);
        const timeline = {};
        const portions = delivery.portions;

        // Iterate steps in REVERSE
        for (let i = steps.length - 1; i >= 0; i--) {
            const step = steps[i];
            const divId = step.division_id;
            let duration = getStepDuration(step, portions, menu, rates);
            
            // Special logic for cooking: simple estimate for backward pass
            if (divId === 'cooking') {
                // If duration is per batch, and we have multiple batches
                const cap = menu.batch_capacity || 50;
                const numBatches = Math.ceil(portions / cap);
                // Assume serialized cooking for worst-case backward planning
                // Or use parallel limit?
                // Let's use simple serialized estimate: numBatches * duration
                // BUT if we have max_parallel_batches in config, we could optimize.
                // For now, let's keep it simple:
                const baseDur = duration > 0 ? duration : (menu.cook_minutes || 60);
                // If we have 4 stoves, we can do 4 batches at once.
                // Duration = ceil(numBatches / 4) * baseDur
                // Let's assume 4 stoves generic
                const parallel = 4;
                const cycles = Math.ceil(numBatches / parallel);
                duration = cycles * baseDur + 10; // +10 buffer
            }

            const end = new Date(currentTime);
            const start = subMinutes(end, duration);
            
            timeline[step.title || divId] = { start, end };
            currentTime = start;
        }

        schedule.push({
            delivery_id: delivery.id || 'new',
            delivery_time: delivery.time,
            portions: portions,
            timeline: timeline // Note: structure is different from fixed standard!
        });
    }
    
    return {
        schedule,
        equipmentUsage: existingUsage || new Map(), // Return usage for chaining
        feasibility: { feasible: true, earliest_start: new Date() } // Simplified
    };
}

// --- FORWARD SCHEDULER (Start Time Driven) ---

function calculateGenericForward(startTime, deliveries, menu, equipmentList, rates, existingUsage) {
    const sortedDeliveries = [...deliveries].sort((a, b) => new Date(a.time) - new Date(b.time));
    const schedule = [];
    const steps = menu.steps || [];

    // Map equipment usage if we want detailed resource tracking
    // For generic steps, we'll simplify: Serialized steps per delivery.
    // But we should track "Global Start" for shared resources like Prep?
    // Let's just do simple chain per delivery for now to support the feature.

    let globalNextAvailable = new Date(startTime);

    for (const delivery of sortedDeliveries) {
        let currentTime = new Date(globalNextAvailable);
        const timeline = {};
        const portions = delivery.portions;

        for (const step of steps) {
            const divId = step.division_id;
            let duration = getStepDuration(step, portions, menu, rates);
            
            if (divId === 'cooking') {
                 // Similar logic to backward but forward
                 const cap = menu.batch_capacity || 50;
                 const numBatches = Math.ceil(portions / cap);
                 const baseDur = duration > 0 ? duration : (menu.cook_minutes || 60);
                 const parallel = 4;
                 const cycles = Math.ceil(numBatches / parallel);
                 duration = cycles * baseDur + 10;
            }

            const start = new Date(currentTime);
            const end = addMinutes(start, duration);
            
            timeline[step.title || divId] = { start, end };
            currentTime = end;
        }

        schedule.push({
            delivery_id: delivery.id || 'new',
            delivery_time: currentTime, // Resulting time
            target_time: delivery.time,
            portions: portions,
            timeline: timeline
        });
        
        // Next delivery starts when?
        // Maybe pipelined?
        // For simple safety, let's say next delivery starts 30 mins after this one started?
        // Or completely parallel?
        // Let's assume parallel execution is possible, so reset to global start?
        // No, that assumes infinite resources.
        // Let's advance global start slightly to stagger.
        globalNextAvailable = addMinutes(globalNextAvailable, 15);
    }

    return {
        schedule,
        equipmentUsage: existingUsage || new Map(),
        feasibility: {
            feasible: true,
            earliest_start: startTime,
            completion_time: schedule.length ? schedule[schedule.length - 1].delivery_time : startTime
        }
    };
}


/**
 * @param {Array} deliveries - [{ time: Date, portions: number }]
 * @param {Object} menu - { cook_minutes: number, packaging_type: string, steps: Array }
 * @param {Array} equipment - [{ id, name, type, capacity_portions }]
 * @param {Object} rates - { prep_per_hour: number, pack_per_hour: number }
 * @param {Map} existingUsage - Optional shared usage map
 */
function calculateScheduleV2(deliveries, menu, equipmentList, rates, existingUsage) {
    if (menu.steps && menu.steps.length > 0) {
        return calculateGenericBackward(deliveries, menu, equipmentList, rates, existingUsage);
    }

    // 1. Sort deliveries (latest first for backward scheduling)
    const sortedDeliveries = [...deliveries].sort((a, b) => new Date(b.time) - new Date(a.time));

    const schedule = [];
    const equipmentUsage = existingUsage || new Map(); // Map<eqId, Array<{start: Date, end: Date}>>

    // Filter equipment types
    const cookingEquipment = equipmentList.filter(e => e.type === 'stove' || e.type === 'steamer');
    if (cookingEquipment.length === 0) {
        cookingEquipment.push({ id: 'generic', name: 'Generic Stove', capacity_portions: 100000 });
    }

    // Process each delivery batch
    for (const delivery of sortedDeliveries) {
        const deliveryTime = new Date(delivery.time);
        const portions = delivery.portions;

        const driverMinutes = Number.isFinite(Number(menu.driver_minutes)) ? Number(menu.driver_minutes) : 30;
        const receivingMinutes = Number.isFinite(Number(menu.receiving_minutes)) ? Number(menu.receiving_minutes) : 60;
        const coolingMinutes = Number.isFinite(Number(menu.cooling_minutes)) ? Number(menu.cooling_minutes) : 0;
        const bufferMinutes = Number.isFinite(Number(menu.buffer_minutes)) ? Number(menu.buffer_minutes) : 10;

        // --- 5. DRIVER ---
        const driverStart = subMinutes(deliveryTime, driverMinutes);

        // --- 4. PACKING ---
        const packDuration = Number.isFinite(Number(menu.pack_minutes_override))
            ? Math.ceil(Number(menu.pack_minutes_override))
            : Math.ceil((portions / rates.pack_per_hour) * 60);
        const packEnd = driverStart;
        const packStart = subMinutes(packEnd, packDuration);

        // --- 3.5 COOLING ---
        const coolingEnd = packStart;
        const coolingStart = subMinutes(coolingEnd, coolingMinutes);

        // --- 3. COOKING (Resource Constrained) ---
        let remainingPortions = portions;
        const batches = [];
        
        // Sort equipment by capacity desc
        const sortedEquipment = [...cookingEquipment].sort((a, b) => b.capacity_portions - a.capacity_portions);

        while (remainingPortions > 0) {
            let bestOption = null;

            // Find best equipment that allows starting as late as possible (closest to packStart)
            for (const eq of sortedEquipment) {
                const batchSize = Math.min(remainingPortions, eq.capacity_portions);
                const cookDuration = (menu.cook_minutes || 60) + 10; // +10 mins buffer
                
                // Tentative slot
                let proposedEnd = coolingStart;
                let proposedStart = subMinutes(proposedEnd, cookDuration);
                
                // Check collision with this equipment's usage
                const usage = equipmentUsage.get(eq.id) || [];
                
                let collision = true;
                while (collision) {
                    collision = false;
                    for (const u of usage) {
                        // Check overlap: (StartA < EndB) and (EndA > StartB)
                        if (proposedStart < u.end && proposedEnd > u.start) {
                            // Overlap! Must start earlier.
                            proposedEnd = new Date(u.start);
                            proposedStart = subMinutes(proposedEnd, cookDuration);
                            collision = true;
                            break; 
                        }
                    }
                }

                // Evaluate option
                if (!bestOption || proposedStart > bestOption.start) {
                    bestOption = {
                        equipment: eq,
                        batchSize: batchSize,
                        start: proposedStart,
                        end: proposedEnd
                    };
                }
            }

            // Commit best option
            if (bestOption) {
                const eqId = bestOption.equipment.id;
                const currentUsage = equipmentUsage.get(eqId) || [];
                currentUsage.push({ start: bestOption.start, end: bestOption.end });
                equipmentUsage.set(eqId, currentUsage);

                batches.push({
                    equipment: bestOption.equipment.name,
                    size: bestOption.batchSize,
                    start: bestOption.start,
                    end: bestOption.end
                });

                remainingPortions -= bestOption.batchSize;
            } else {
                break;
            }
        }
        
        const cookStart = new Date(Math.min(...batches.map(b => b.start)));
        
        // --- 2. PREP ---
        const prepDuration = Number.isFinite(Number(menu.prep_minutes_override))
            ? Math.ceil(Number(menu.prep_minutes_override))
            : Math.ceil((portions / rates.prep_per_hour) * 60);
        const prepEnd = subMinutes(cookStart, bufferMinutes);
        const prepStart = subMinutes(prepEnd, prepDuration);
        
        // --- 1. RECEIVING ---
        const receiveEnd = prepStart;
        const receiveStart = subMinutes(receiveEnd, receivingMinutes);

        schedule.push({
            delivery_id: delivery.id || 'new',
            delivery_time: deliveryTime,
            portions: portions,
            timeline: {
                receiving: { start: receiveStart, end: receiveEnd },
                prep: { start: prepStart, end: prepEnd },
                cooking: { batches: batches },
                cooling: { start: coolingStart, end: coolingEnd },
                packing: { start: packStart, end: packEnd },
                driver: { start: driverStart, end: deliveryTime }
            }
        });
    }

    schedule.sort((a, b) => a.timeline.receiving.start - b.timeline.receiving.start);
    
    return {
        schedule,
        equipmentUsage,
        feasibility: {
            feasible: true,
            earliest_start: schedule.length ? schedule[0].timeline.receiving.start : new Date()
        }
    };
}

/**
 * Forward Scheduling (Earliest Start)
 * @param {Date} startTime - When to start the first task (Receiving/Prep)
 * @param {Array} deliveries - [{ time: string|Date, portions: number }] (Time is treated as target/label)
 * @param {Object} menu 
 * @param {Array} equipmentList 
 * @param {Object} rates 
 * @param {Map} existingUsage - Optional shared usage map
 */
function calculateForwardSchedule(startTime, deliveries, menu, equipmentList, rates, existingUsage) {
    if (menu.steps && menu.steps.length > 0) {
        return calculateGenericForward(startTime, deliveries, menu, equipmentList, rates, existingUsage);
    }

    // 1. Sort deliveries by time (just to have an order)
    const sortedDeliveries = [...deliveries].sort((a, b) => new Date(a.time) - new Date(b.time));

    const schedule = [];
    const equipmentUsage = existingUsage || new Map(); // Map<eqId, Date> (next available time)

    // Filter equipment
    const cookingEquipment = equipmentList.filter(e => e.type === 'stove' || e.type === 'steamer');
    if (cookingEquipment.length === 0) {
        cookingEquipment.push({ id: 'generic', name: 'Generic Stove', capacity_portions: 100000 });
    }

    // Initialize equipment availability
    const receivingStart = new Date(startTime);
    const receivingEnd = addMinutes(receivingStart, 60);
    const globalPrepStart = receivingEnd;
        const globalCookStart = addMinutes(globalPrepStart, bufferMinutes);

    // Initialize only if not present
    cookingEquipment.forEach(eq => {
        if (!equipmentUsage.has(eq.id)) equipmentUsage.set(eq.id, globalCookStart);
    });

    for (const delivery of sortedDeliveries) {
        const portions = delivery.portions;

        const driverMinutes = Number.isFinite(Number(menu.driver_minutes)) ? Number(menu.driver_minutes) : 30;
        const coolingMinutes = Number.isFinite(Number(menu.cooling_minutes)) ? Number(menu.cooling_minutes) : 0;
        const bufferMinutes = Number.isFinite(Number(menu.buffer_minutes)) ? Number(menu.buffer_minutes) : 10;

        // --- 1. RECEIVING ---
        // --- 2. PREP ---
        const prepDuration = Number.isFinite(Number(menu.prep_minutes_override))
            ? Math.ceil(Number(menu.prep_minutes_override))
            : Math.ceil((portions / rates.prep_per_hour) * 60);
        
        let myPrepStart = globalPrepStart;
        if (schedule.length > 0) {
            const last = schedule[schedule.length - 1];
            myPrepStart = last.timeline.prep.end;
        }
        const myPrepEnd = addMinutes(myPrepStart, prepDuration);

        // --- 3. COOKING ---
        let remainingPortions = portions;
        const batches = [];
        const sortedEquipment = [...cookingEquipment].sort((a, b) => b.capacity_portions - a.capacity_portions);

        while (remainingPortions > 0) {
            let bestOption = null;

            // Find equipment with EARLIEST availability
            for (const eq of sortedEquipment) {
                const batchSize = Math.min(remainingPortions, eq.capacity_portions);
                const cookDuration = (menu.cook_minutes || 60) + 10; // +10 mins buffer
                
                let readyAt = equipmentUsage.get(eq.id);
                const minStart = addMinutes(myPrepStart, bufferMinutes); 
                let start = (readyAt > minStart) ? readyAt : minStart;
                
                let end = addMinutes(start, cookDuration);

                if (!bestOption || start < bestOption.start) {
                    bestOption = {
                        equipment: eq,
                        batchSize: batchSize,
                        start: start,
                        end: end
                    };
                }
            }

            if (bestOption) {
                const eqId = bestOption.equipment.id;
                equipmentUsage.set(eqId, bestOption.end); 

                batches.push({
                    equipment: bestOption.equipment.name,
                    size: bestOption.batchSize,
                    start: bestOption.start,
                    end: bestOption.end
                });

                remainingPortions -= bestOption.batchSize;
            } else {
                break;
            }
        }

        const cookEnd = new Date(Math.max(...batches.map(b => b.end)));
        const cookStart = new Date(Math.min(...batches.map(b => b.start)));

        // --- 4. PACKING ---
        const packStart = addMinutes(cookEnd, coolingMinutes); 
        const packDuration = Number.isFinite(Number(menu.pack_minutes_override))
            ? Math.ceil(Number(menu.pack_minutes_override))
            : Math.ceil((portions / rates.pack_per_hour) * 60);
        const packEnd = addMinutes(packStart, packDuration);

        // --- 5. DRIVER ---
        const driverStart = packEnd;
        const driverEnd = addMinutes(driverStart, driverMinutes);

        schedule.push({
            delivery_id: delivery.id || 'new',
            delivery_time: driverEnd, // This is the RESULTING delivery time
            target_time: delivery.time, // Original target
            portions: portions,
            timeline: {
                receiving: { start: receivingStart, end: receivingEnd },
                prep: { start: myPrepStart, end: myPrepEnd },
                cooking: { batches: batches },
                cooling: { start: cookEnd, end: packStart },
                packing: { start: packStart, end: packEnd },
                driver: { start: driverStart, end: driverEnd }
            }
        });
    }

    return {
        schedule,
        equipmentUsage,
        feasibility: {
            feasible: true,
            earliest_start: startTime,
            completion_time: schedule.length ? schedule[schedule.length - 1].timeline.driver.end : startTime
        }
    };
}

module.exports = { calculateScheduleV2, calculateForwardSchedule };

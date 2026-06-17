
/**
 * Scheduler V4 - Event-Driven Industrial Kitchen Scheduler
 * 
 * Principles:
 * 1. Deterministic Behavior (No randomness)
 * 2. Strict Priority: Deadline > Bottleneck > Equipment
 * 3. Single Global Timeline (Discrete Event Simulation)
 */

const EVENTS = {
    SIMULATION_START: 'SIMULATION_START',
    TASK_COMPLETED: 'TASK_COMPLETED',
    DELIVERY_DEADLINE: 'DELIVERY_DEADLINE',
    RESOURCE_FREED: 'RESOURCE_FREED'
};

const DIVISIONS = {
    PREP: 'prep',
    COOK: 'cook',
    PORTION: 'portion',
    PACKING: 'packing'
};

const RESOURCE_TYPES = {
    WORKER: 'worker',
    EQUIPMENT: 'equipment'
};

// --- Helper Functions ---
function addMinutes(date, minutes) {
    return new Date(new Date(date).getTime() + minutes * 60000);
}

function getMinutesDiff(start, end) {
    return (new Date(end) - new Date(start)) / 60000;
}

function formatTime(date) {
    const d = new Date(date);
    return d.toISOString().substring(11, 16); // "HH:mm"
}

// --- Core Classes ---

class SimulationEngine {
    constructor(config, orders, equipmentList, menus, startDateTime) {
        this.config = config || {};
        this.orders = orders; // [{ deliveryTime, items: [{ menuId, portions }] }]
        this.equipmentList = equipmentList || [];
        this.menus = menus || {}; // menuId -> menuDetails (cook_minutes, batch_capacity, etc)
        this.startDateTime = new Date(startDateTime);
        
        this.currentTime = new Date(startDateTime);
        this.eventQueue = []; // Priority Queue by time
        this.readyQueue = []; // Tasks ready to be executed
        this.activeTasks = []; // Currently running tasks
        this.completedTasks = [];
        
        this.resources = new ResourceManager(config, equipmentList);
        this.inventory = new InventoryManager(); // Tracks intermediate stock
        
        // Metrics
        this.metrics = {
            maxDelay: 0,
            bottlenecks: {},
            equipmentUsage: {}
        };
    }

    // Main Execution Loop
    run() {
        // 1. Initialize
        this.initializeJobs();
        // Schedule Start Event
        this.scheduleEvent(this.startDateTime, EVENTS.SIMULATION_START, null);

        // 2. Loop
        let iterations = 0;
        const MAX_ITERATIONS = 50000; // Safety break

        while (this.eventQueue.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            
            // Pop earliest event
            this.eventQueue.sort((a, b) => a.time - b.time);
            const currentEvent = this.eventQueue.shift();
            
            // Advance time
            if (currentEvent.time > this.currentTime) {
                this.currentTime = new Date(currentEvent.time);
            }

            // Process Event
            this.processEvent(currentEvent);

            // Try to assign resources to ready tasks
            this.assignResources();
        }

        return this.generateOutput();
    }

    initializeJobs() {
        // Break down orders into Wave Jobs
        // We work BACKWARDS from delivery to create initial demand?
        // NO, V4 is Forward Simulation. We create DEMAND tasks.
        
        // Sort orders by time
        this.orders.sort((a, b) => new Date(a.deliveryTime) - new Date(b.deliveryTime));

        this.orders.forEach((wave, waveIdx) => {
            wave.items.forEach(item => {
                const menu = this.menus[item.menuId] || {};
                const ingredients = menu.ingredients || [];
                
                // Collect specific prep actions from menu_ingredient_prep
                const prepActions = {}; // type -> { duration: 0, items: [] }
                let hasSpecificPrep = false;

                ingredients.forEach(ing => {
                    // ing.prep_actions is attached by server.js
                    const actions = ing.prep_actions || []; 
                    if (actions.length > 0) {
                        hasSpecificPrep = true;
                        actions.forEach(act => {
                            const type = act.action_type || 'GENERAL'; // CUT, WASH, PEEL
                            if (!prepActions[type]) prepActions[type] = { duration: 0, items: [] };
                            
                            // Estimate Duration
                            // quantity is usually per portion (grams). Convert to KG.
                            const qtyPerPortion = Number(ing.quantity || 0);
                            const totalKg = (qtyPerPortion * item.portions) / 1000;
                            const rate = Number(act.duration_per_kg_minutes) || 5;
                            const dur = totalKg * rate;
                            
                            prepActions[type].duration += dur;
                            if (!prepActions[type].items.includes(ing.ingredient_name || ing.name)) {
                                prepActions[type].items.push(ing.ingredient_name || ing.name);
                            }
                        });
                    }
                });

                if (hasSpecificPrep) {
                    // Create granular tasks
                    Object.keys(prepActions).forEach(actionType => {
                        const data = prepActions[actionType];
                        const duration = Math.ceil(Math.max(5, data.duration)); // Min 5 mins
                        
                        const task = {
                            id: `prep_${actionType}_${waveIdx}_${item.menuId}`,
                            type: DIVISIONS.PREP,
                            subtype: actionType,
                            menuId: item.menuId,
                            waveIdx: waveIdx,
                            deadline: new Date(wave.deliveryTime),
                            portions: item.portions,
                            status: 'PENDING',
                            dependencies: [],
                            durationMinutes: duration, // Explicit duration
                            title: `${actionType.toUpperCase()} - ${menu.name || item.menuId}`
                        };
                        task.priority = this.calculatePriority(task);
                        this.readyQueue.push(task);
                    });
                } else {
                    // Fallback: Generic PREP Task
                    const prepTask = {
                        id: `prep_${waveIdx}_${item.menuId}`,
                        type: DIVISIONS.PREP,
                        subtype: 'GENERAL',
                        menuId: item.menuId,
                        waveIdx: waveIdx,
                        deadline: new Date(wave.deliveryTime),
                        portions: item.portions,
                        status: 'PENDING',
                        dependencies: [],
                        ingredients: menu.ingredients || [],
                        title: `PREP - ${menu.name || item.menuId}`
                    };
                    prepTask.priority = this.calculatePriority(prepTask);
                    this.readyQueue.push(prepTask);
                }
            });
        });
    }

    calculatePriority(task) {
        // STRICT PRIORITY: 
        // 1. Delivery Deadline (timestamp)
        // 2. Bottleneck Score (inverse of rate) - TODO
        
        // Lower score = Higher Priority
        // Base: Deadline Timestamp
        let score = task.deadline.getTime();
        
        // Tie-breaker: Bottleneck / Complexity
        // If menu is "hard" (long cook time), prioritize slightly
        // const menu = this.menus[task.menuId];
        // if (menu && menu.cook_minutes > 60) score -= 1000 * 60; // 1 minute bonus
        
        return score;
    }

    scheduleEvent(time, type, data) {
        this.eventQueue.push({ time: new Date(time), type, data });
    }

    processEvent(event) {
        switch (event.type) {
            case EVENTS.SIMULATION_START:
                console.log(`Simulation started at ${this.currentTime.toISOString()}`);
                break;
                
            case EVENTS.TASK_COMPLETED:
                this.handleTaskCompletion(event.data);
                break;
                
            case EVENTS.RESOURCE_FREED:
                // Resource is explicitly freed (maybe maintenance or shift change)
                break;
        }
    }

    handleTaskCompletion(task) {
        // 1. Log completion
        task.endTime = new Date(this.currentTime);
        this.completedTasks.push(task);
        
        // 2. Free Resource
        this.resources.free(task.resourceId);
        
        // 3. Update Inventory (Generate intermediate output)
        if (task.type === DIVISIONS.PREP) {
            // Check if all PREP tasks for this menu/wave are completed
            const pendingPrep = this.readyQueue.some(t => 
                t.type === DIVISIONS.PREP && 
                t.waveIdx === task.waveIdx && 
                t.menuId === task.menuId
            ) || this.activeTasks.some(t => 
                t.type === DIVISIONS.PREP && 
                t.waveIdx === task.waveIdx && 
                t.menuId === task.menuId &&
                t.id !== task.id
            );

            if (!pendingPrep) {
                // Prep finished -> Create Cook Task
                this.createCookTask(task);
            }
        } else if (task.type === DIVISIONS.COOK) {
            // Cook finished -> Create Portion Task
            this.createPortionTask(task);
        } else if (task.type === DIVISIONS.PORTION) {
            // Portion finished -> Ready for Packing/Delivery
            // For now assume Portion includes Packing
            this.inventory.add(task.menuId, 'packed', task.portions);
        }
    }


    createCookTask(prepTask) {
        // Cook Task depends on Prep
        // BATCHING LOGIC
        const menu = this.menus[prepTask.menuId] || {};
        const batchCapacity = menu.batch_capacity || 50; // Default capacity
        let remainingPortions = prepTask.portions;
        let batchNo = 1;

        while (remainingPortions > 0) {
            const currentBatchSize = Math.min(remainingPortions, batchCapacity);
            
            const cookTask = {
                id: `cook_${prepTask.waveIdx}_${prepTask.menuId}_b${batchNo}`,
                type: DIVISIONS.COOK,
                menuId: prepTask.menuId,
                waveIdx: prepTask.waveIdx,
                batchNo: batchNo,
                deadline: prepTask.deadline,
                portions: currentBatchSize,
                status: 'PENDING',
                dependencies: [`prep_${prepTask.waveIdx}_${prepTask.menuId}`] // Depends on PREP completion
            };
            
            cookTask.priority = this.calculatePriority(cookTask);
            this.readyQueue.push(cookTask);
            
            remainingPortions -= currentBatchSize;
            batchNo++;
        }
    }

    createPortionTask(cookTask) {
        // Portion Task depends on Cook Batch
        // Portioning can be done per batch or aggregated?
        // Let's do per batch flow for now
        const portionTask = {
            id: `portion_${cookTask.waveIdx}_${cookTask.menuId}_b${cookTask.batchNo}`,
            type: DIVISIONS.PORTION,
            menuId: cookTask.menuId,
            waveIdx: cookTask.waveIdx,
            deadline: cookTask.deadline,
            portions: cookTask.portions,
            batchNo: cookTask.batchNo, // Carry over batch no
            status: 'PENDING',
            dependencies: [cookTask.id]
        };
        portionTask.priority = this.calculatePriority(portionTask);
        this.readyQueue.push(portionTask);
    }

    assignResources() {
        // Sort ready queue by strict priority
        this.readyQueue.sort((a, b) => a.priority - b.priority);

        // Try to assign each task
        const unassignedTasks = [];
        
        while (this.readyQueue.length > 0) {
            const task = this.readyQueue.shift();
            
            // Check resource availability
            const resource = this.resources.findAvailable(task.type, task.menuId);
            
            if (resource) {
                // Assign
                this.resources.allocate(resource.id);
                task.resourceId = resource.id;
                task.startTime = new Date(this.currentTime);
                
                // Calculate Duration
                const duration = this.calculateDuration(task, resource);
                const finishTime = addMinutes(this.currentTime, duration);
                
                // Schedule Completion
                this.scheduleEvent(finishTime, EVENTS.TASK_COMPLETED, task);
                this.activeTasks.push(task);
            } else {
                unassignedTasks.push(task);
            }
        }
        
        // Put back unassigned tasks
        this.readyQueue = unassignedTasks;
    }
    
    calculateDuration(task, resource) {
        if (task.durationMinutes) return task.durationMinutes;

        const menu = this.menus[task.menuId] || {};
        
        if (task.type === DIVISIONS.PREP) {
            // Rate based: portions / rate
            const rate = this.config.prep_rate || 500; // portions per hour default
            return Math.ceil((task.portions / rate) * 60);
        }
        
        if (task.type === DIVISIONS.COOK) {
            // Fixed duration per batch usually
            const baseTime = menu.cook_minutes || 60;
            return baseTime + 5; // +5 mins buffer
        }
        
        if (task.type === DIVISIONS.PORTION) {
            // Rate based (configurable per packaging type)
            // config.packing.rates should have the rates
            const rates = (this.config.packing && this.config.packing.rates) ? this.config.packing.rates : {};
            const packType = menu.packaging_type ? menu.packaging_type.toLowerCase() : 'ompreng';
            
            // Get rate for this type, default to global rate or 600
            const typeRate = rates[packType] || rates['ompreng'] || this.config.portion_rate || 600;
            
            return Math.ceil((task.portions / typeRate) * 60);
        }
        
        return 15;
    }

    generateOutput() {
        return {
            timeline: this.completedTasks,
            feasibility: this.checkFeasibility(),
            shiftBoard: this.generateShiftBoardData(),
            metrics: this.metrics
        };
    }

    checkFeasibility() {
        // Check if all items met deadline
        const lateItems = this.completedTasks.filter(t => t.type === DIVISIONS.PORTION && t.endTime > t.deadline);
        
        let explanation = "";
        let status = 'FEASIBLE';
        
        if (lateItems.length > 0) {
            status = 'NOT_FEASIBLE';
            const maxDelay = Math.max(...lateItems.map(t => getMinutesDiff(t.deadline, t.endTime)));
            const delayMinutes = Math.ceil(maxDelay) + 15; // +15 mins buffer
            const suggestedStart = addMinutes(this.startDateTime, -delayMinutes);
            
            explanation = `Terdapat ${lateItems.length} batch terlambat. Maksimal ${Math.ceil(maxDelay)} menit. Disarankan mulai: ${formatTime(suggestedStart)} (H-${this.getDayDiff(suggestedStart, this.orders[0].deliveryTime)})`;
            
            return { 
                status, 
                explanation, 
                lateItems, 
                suggested_start_time: suggestedStart.toISOString(),
                delay_minutes: maxDelay
            };
        } else {
            const lastTask = this.completedTasks.sort((a,b) => b.endTime - a.endTime)[0];
            const buffer = lastTask ? getMinutesDiff(lastTask.endTime, lastTask.deadline) : 0;
            explanation = `Semua target tercapai. Produksi selesai ${Math.ceil(buffer)} menit sebelum deadline terakhir.`;
            
            return { status, explanation, lateItems };
        }
    }

    getDayDiff(d1, d2) {
        const date1 = new Date(d1).setHours(0,0,0,0);
        const date2 = new Date(d2).setHours(0,0,0,0);
        return Math.round((date2 - date1) / 86400000);
    }

    generateShiftBoardData() {
        // Group by division/resource for the Shift Board UI
        const board = {
            cook: {},
            portion: {},
            driver: {}
        };
        
        // 1. Cook Board: Group by Equipment
        this.completedTasks.filter(t => t.type === DIVISIONS.COOK).forEach(t => {
            // Get Resource Name
            const res = this.resources.resources.find(r => r.id === t.resourceId);
            const resName = res ? res.name : t.resourceId;
            
            // Get Menu Name
            const menuName = this.menus[t.menuId] ? this.menus[t.menuId].name : t.menuId;

            if (!board.cook[resName]) board.cook[resName] = [];
            board.cook[resName].push({
                start: formatTime(t.startTime),
                end: formatTime(t.endTime),
                menu: menuName,
                batch: `Batch ${t.batchNo} (${t.portions} porsi)`
            });
        });
        
        // 2. Portion Board: Group by Line
        this.completedTasks.filter(t => t.type === DIVISIONS.PORTION).forEach(t => {
            // Get Resource Name (Line 1, Line 2...)
            const res = this.resources.resources.find(r => r.id === t.resourceId);
            const resName = res ? (res.name || res.id).replace('portion_line_', 'Line ') : t.resourceId;
            
            // Get Menu Name
            const menuName = this.menus[t.menuId] ? this.menus[t.menuId].name : t.menuId;

            if (!board.portion[resName]) board.portion[resName] = [];
            board.portion[resName].push({
                start: formatTime(t.startTime),
                end: formatTime(t.endTime),
                menu: menuName,
                info: `Wave ${t.waveIdx + 1}`
            });
        });

        // 3. Driver Board: Group by Wave
        this.orders.forEach((wave, idx) => {
            const waveId = `Wave ${idx + 1}`;
            const deadline = new Date(wave.deliveryTime);
            board.driver[waveId] = {
                deadline: formatTime(deadline),
                loading: formatTime(addMinutes(deadline, -30)), // Assume 30 mins loading
                departure: formatTime(addMinutes(deadline, -15)) // Assume 15 mins travel buffer
            };
        });
        
        return board;
    }

}

class ResourceManager {
    constructor(config, equipmentList) {
        this.resources = [];
        
        // Initialize Equipment
        equipmentList.forEach(eq => {
            this.resources.push({
                id: eq.id,
                name: eq.name,
                type: DIVISIONS.COOK, // Assuming all equipment is for cooking for now
                status: 'IDLE',
                capabilities: ['generic_stove'] // TODO: Map capabilities
            });
        });

        // Initialize Virtual Lines for Prep/Portion
        // Assume infinite or config-based lines
        for (let i = 1; i <= (config.prep_lines || 2); i++) {
            this.resources.push({ id: `prep_line_${i}`, type: DIVISIONS.PREP, status: 'IDLE' });
        }
        for (let i = 1; i <= (config.portion_lines || 2); i++) {
            this.resources.push({ id: `portion_line_${i}`, type: DIVISIONS.PORTION, status: 'IDLE' });
        }
    }

    findAvailable(type, menuId) {
        // Simple match: first idle resource of correct type
        // TODO: Equipment capability matching
        return this.resources.find(r => r.type === type && r.status === 'IDLE');
    }

    allocate(resourceId) {
        const res = this.resources.find(r => r.id === resourceId);
        if (res) res.status = 'BUSY';
    }

    free(resourceId) {
        const res = this.resources.find(r => r.id === resourceId);
        if (res) res.status = 'IDLE';
    }
}

class InventoryManager {
    constructor() {
        this.stock = {}; // menuId -> { raw: 0, prep: 0, cooked: 0, packed: 0 }
    }

    add(menuId, stage, qty) {
        if (!this.stock[menuId]) this.stock[menuId] = { raw: 0, prep: 0, cooked: 0, packed: 0 };
        this.stock[menuId][stage] += qty;
    }
}

module.exports = { SimulationEngine };

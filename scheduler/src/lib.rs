use serde::{Deserialize, Serialize};
use time::{Duration, OffsetDateTime};
use uuid::Uuid;
use std::collections::{HashMap, BinaryHeap, VecDeque};
use std::cmp::Ordering;

use shared::BatchPlanItem;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ResourceInfo {
    pub id: Option<Uuid>, // Optional specific resource ID, but usually we schedule by type
    pub resource_type: String, // e.g. "Mixer", "Oven", "PrepStation"
    pub count: i32, // How many available in pool
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct RecipeStepReq {
    pub step_order: i32,
    pub description: String,
    pub duration_minutes: i64,
    pub required_resources: Vec<(String, i32)>, // (resource_type, count_needed)
    pub division_id: Option<Uuid>, // Optional division constraint
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct MenuItemInfo {
    pub id: Uuid,
    pub steps: Vec<RecipeStepReq>, // Steps for one batch of this item
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PlanRequest {
    pub target_portions: i32,
    pub menu_items: Vec<MenuItemInfo>,
    pub resources: Vec<ResourceInfo>, // Available resources
    pub start_time: OffsetDateTime, // When can we start?
    pub target_delivery_time: OffsetDateTime,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PlanResult {
    pub feasible: bool,
    pub lateness_minutes: i64,
    pub bottleneck_rate: f64,
    pub batches: Vec<BatchPlanItem>,
    pub timeline: Vec<(String, Vec<(OffsetDateTime, OffsetDateTime)>)>, // resource_type -> usage windows
}

#[derive(Default)]
pub struct Scheduler;

// Internal structs for simulation
#[derive(Debug, Clone, Eq, PartialEq)]
struct ScheduledEvent {
    time: i64, // Minutes from start
    event_type: EventType,
}

#[derive(Debug, Clone, Eq, PartialEq)]
enum EventType {
    StepStart { job_id: usize, step_idx: usize },
    StepEnd { job_id: usize, step_idx: usize },
}

impl Ord for ScheduledEvent {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse for min-heap (earliest time first)
        other.time.cmp(&self.time)
            .then_with(|| other.event_type_rank().cmp(&self.event_type_rank()))
    }
}

impl PartialOrd for ScheduledEvent {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl ScheduledEvent {
    fn event_type_rank(&self) -> u8 {
        match self.event_type {
            EventType::StepEnd { .. } => 0, // Process ends before starts at same time
            EventType::StepStart { .. } => 1,
        }
    }
}

struct Job {
    id: usize,
    menu_item_id: Uuid,
    steps: Vec<RecipeStepReq>,
    current_step_idx: usize,
    batch_size: i32,
    start_time: Option<i64>, // Minutes from plan start
    end_time: Option<i64>,
}

impl Scheduler {
    pub fn make_plan(&self, req: &PlanRequest) -> PlanResult {
        // 1. Initialize Resources
        let mut available_resources: HashMap<String, i32> = HashMap::new();
        for r in &req.resources {
            *available_resources.entry(r.resource_type.clone()).or_insert(0) += r.count;
        }

        // 2. Create Jobs (Batches)
        // Heuristic: Batch size = 50 portions (hardcoded for now, should be dynamic)
        let batch_size = 50;
        let total_batches = (req.target_portions as f64 / batch_size as f64).ceil() as usize;
        
        let mut jobs: Vec<Job> = Vec::new();
        let mut job_counter = 0;

        for _ in 0..total_batches {
            // Round-robin menu items
            if req.menu_items.is_empty() { break; }
            let menu_idx = job_counter % req.menu_items.len();
            let menu_item = &req.menu_items[menu_idx];
            
            jobs.push(Job {
                id: job_counter,
                menu_item_id: menu_item.id,
                steps: menu_item.steps.clone(),
                current_step_idx: 0,
                batch_size,
                start_time: None,
                end_time: None,
            });
            job_counter += 1;
        }

        // 3. Discrete Event Simulation
        // We use a simple time-stepped or event-based approach.
        // Since resources are constrained, we can't just schedule everything at T=0.
        // We maintain a "Ready Queue" of jobs waiting for resources.
        
        let mut current_time = 0; // Minutes from start
        let mut completed_jobs = 0;
        let total_jobs = jobs.len();
        
        // Track resource usage for timeline
        // resource_type -> list of (start, end) in minutes
        let mut resource_usage: HashMap<String, Vec<(i64, i64)>> = HashMap::new();
        
        // Active steps: job_id -> step_idx
        let mut active_steps: HashMap<usize, usize> = HashMap::new();
        
        // Queue of jobs ready for their next step
        // We prioritize jobs that have already started to reduce WIP (Work In Progress)
        let mut ready_queue: VecDeque<usize> = VecDeque::new();
        for job in &jobs {
            ready_queue.push_back(job.id);
        }

        // Simulation Loop
        // We advance time in 1-minute increments for simplicity in this version, 
        // or jump to next event. Let's use event jumping.
        
        let mut event_queue: BinaryHeap<ScheduledEvent> = BinaryHeap::new();
        
        // Initial scheduling attempt
        // We try to start as many jobs as possible at T=0
        
        // We need a loop that continues until all jobs are done.
        while completed_jobs < total_jobs {
            // 1. Process events at current_time
            while let Some(evt) = event_queue.peek() {
                if evt.time > current_time {
                    break;
                }
                
                let evt = event_queue.pop().unwrap();
                match evt.event_type {
                    EventType::StepEnd { job_id, step_idx } => {
                        // Release resources
                        let job = &mut jobs[job_id];
                        let step = &job.steps[step_idx];
                        for (res_type, count) in &step.required_resources {
                            *available_resources.get_mut(res_type).unwrap() += count;
                        }
                        
                        // Log usage
                        // (Simplified logging, assumes continuous usage from start to end of step)
                        
                        // Advance job
                        job.current_step_idx += 1;
                        active_steps.remove(&job_id);
                        
                        if job.current_step_idx >= job.steps.len() {
                            job.end_time = Some(current_time);
                            completed_jobs += 1;
                        } else {
                            // Job is ready for next step
                            // Push to front to prioritize finishing existing jobs (reduce WIP)
                            ready_queue.push_front(job_id);
                        }
                    },
                    EventType::StepStart { .. } => {
                        // Just a marker, logic handled below in allocation
                    }
                }
            }

            // 2. Try to schedule ready jobs
            let q_len = ready_queue.len();
            
            for _ in 0..q_len {
                if let Some(job_id) = ready_queue.pop_front() {
                    let job = &mut jobs[job_id];
                    let step = &job.steps[job.current_step_idx];
                    
                    // Check resources
                    let mut can_schedule = true;
                    for (res_type, count) in &step.required_resources {
                        let available = available_resources.get(res_type).copied().unwrap_or(0);
                        if available < *count {
                            can_schedule = false;
                            break;
                        }
                    }
                    
                    if can_schedule {
                        // Allocate resources
                        for (res_type, count) in &step.required_resources {
                            *available_resources.get_mut(res_type).unwrap() -= count;
                            // Log usage start
                            resource_usage.entry(res_type.clone()).or_default().push((current_time, current_time + step.duration_minutes));
                        }
                        
                        // Start step
                        if job.current_step_idx == 0 {
                            job.start_time = Some(current_time);
                        }
                        
                        event_queue.push(ScheduledEvent {
                            time: current_time + step.duration_minutes,
                            event_type: EventType::StepEnd { job_id, step_idx: job.current_step_idx },
                        });
                        
                        active_steps.insert(job_id, job.current_step_idx);
                    } else {
                        // Put back in queue
                        ready_queue.push_back(job_id);
                    }
                }
            }
            
            // If no events scheduled and we have ready jobs but no resources, we have a deadlock or just full capacity.
            // If event_queue is empty and ready_queue is not, we have a problem (deadlock or missing resources).
            if event_queue.is_empty() && !ready_queue.is_empty() {
                // Determine if it's a deadlock (resource needed > total available)
                // For now, break to avoid infinite loop
                println!("Deadlock detected or insufficient resources.");
                break;
            }
            
            // 3. Advance time
            if let Some(evt) = event_queue.peek() {
                current_time = evt.time;
            } else if completed_jobs < total_jobs {
                // Should not happen unless deadlock handled above
                break;
            }
        }

        // 4. Build Result
        let plan_start = req.start_time;
        let mut final_batches = Vec::new();
        let mut max_end_time = plan_start;

        for job in jobs {
            if let (Some(start), Some(end)) = (job.start_time, job.end_time) {
                let start_dt = plan_start + Duration::minutes(start);
                let end_dt = plan_start + Duration::minutes(end);
                
                if end_dt > max_end_time {
                    max_end_time = end_dt;
                }
                
                final_batches.push(BatchPlanItem {
                    division_id: Uuid::nil(), // TODO: Map back to division if needed
                    menu_item_id: job.menu_item_id,
                    batch_size: job.batch_size,
                    start_time: start_dt,
                    end_time: end_dt,
                });
            }
        }
        
        let timeline_res = resource_usage.into_iter().map(|(k, v)| {
            let windows = v.into_iter().map(|(s, e)| {
                (plan_start + Duration::minutes(s), plan_start + Duration::minutes(e))
            }).collect();
            (k, windows)
        }).collect();

        let lateness_minutes = if max_end_time > req.target_delivery_time {
            (max_end_time - req.target_delivery_time).whole_minutes()
        } else {
            0
        };

        PlanResult {
            feasible: lateness_minutes <= 0,
            lateness_minutes,
            bottleneck_rate: 0.0, // TODO: calculate utilization
            batches: final_batches,
            timeline: timeline_res,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::OffsetDateTime;

    #[test]
    fn make_plan_returns_batches() {
        let start = OffsetDateTime::now_utc();
        let req = PlanRequest {
            target_portions: 120,
            menu_items: vec![MenuItemInfo {
                id: Uuid::new_v4(),
                steps: vec![
                    RecipeStepReq {
                        step_order: 1,
                        description: "Prep".to_string(),
                        duration_minutes: 10,
                        required_resources: vec![("PrepStation".to_string(), 1)],
                        division_id: None,
                    },
                    RecipeStepReq {
                        step_order: 2,
                        description: "Cook".to_string(),
                        duration_minutes: 15,
                        required_resources: vec![("Oven".to_string(), 1)],
                        division_id: None,
                    },
                ],
            }],
            resources: vec![
                ResourceInfo {
                    id: None,
                    resource_type: "PrepStation".to_string(),
                    count: 1,
                },
                ResourceInfo {
                    id: None,
                    resource_type: "Oven".to_string(),
                    count: 1,
                },
            ],
            start_time: start,
            target_delivery_time: start + Duration::minutes(120),
        };

        let res = Scheduler::default().make_plan(&req);
        assert!(!res.batches.is_empty());
        assert_eq!(res.lateness_minutes, 0);
    }
}

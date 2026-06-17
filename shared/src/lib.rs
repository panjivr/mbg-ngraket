use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub struct DivisionCapacity {
    pub division_id: Uuid,
    pub capacity_per_batch: i32,
    pub max_parallel_batches: i32,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct BatchPlanItem {
    pub division_id: Uuid,
    pub menu_item_id: Uuid,
    pub batch_size: i32,
    pub start_time: OffsetDateTime,
    pub end_time: OffsetDateTime,
}

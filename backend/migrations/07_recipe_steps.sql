-- 07_recipe_steps.sql

CREATE TABLE IF NOT EXISTS recipe_steps (
    id UUID PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    description TEXT NOT NULL,
    division_type TEXT NOT NULL, -- 'preparation', 'processing' (kitchen), 'portioning', 'packaging'
    estimated_duration_minutes INT DEFAULT 15,
    UNIQUE(recipe_id, step_order)
);

-- Add target_role to batch_checklist to assign specific tasks to specific roles
ALTER TABLE batch_checklist ADD COLUMN IF NOT EXISTS target_role TEXT; 
-- e.g. 'koordinator_pengolahan', 'koordinator_pemorsian'

-- Update production_plans to have a more descriptive status
-- status: 'draft', 'confirmed', 'in_progress', 'completed'

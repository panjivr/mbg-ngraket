-- 12_kitchen_resources.sql

CREATE TABLE IF NOT EXISTS kitchen_resources (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- 'STOVE', 'OVEN', 'STEAMER', 'FRYER', 'OTHER'
    capacity INT DEFAULT 1,
    status TEXT DEFAULT 'READY', -- 'READY', 'MAINTENANCE', 'BUSY'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link recipe steps to required resources
-- This allows defining that a step needs "1 Stove" or "2 Mixers"
CREATE TABLE IF NOT EXISTS recipe_step_requirements (
    id UUID PRIMARY KEY,
    step_id UUID NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- Matches kitchen_resources.resource_type
    quantity_needed INT DEFAULT 1,
    UNIQUE(step_id, resource_type)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kitchen_resources_tenant ON kitchen_resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_step_requirements_step ON recipe_step_requirements(step_id);

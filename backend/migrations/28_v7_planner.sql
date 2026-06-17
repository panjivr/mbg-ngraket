-- 28_v7_planner.sql

CREATE TABLE IF NOT EXISTS delivery_waves (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    wave_number INT NOT NULL,
    target_time TIMESTAMPTZ NOT NULL,
    portion_count INT NOT NULL,
    driver_id UUID REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_waves_plan ON delivery_waves(tenant_id, plan_id);

CREATE TABLE IF NOT EXISTS production_drafts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_drafts_tenant_date ON production_drafts(tenant_id, plan_date);

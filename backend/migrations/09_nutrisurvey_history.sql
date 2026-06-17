CREATE TABLE IF NOT EXISTS nutr_calc_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    menu_name TEXT NOT NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_email TEXT,
    target_set TEXT,
    nutrient_codes TEXT NOT NULL,
    totals JSONB NOT NULL,
    detail JSONB NOT NULL,
    missing_count INT NOT NULL DEFAULT 0,
    energy_kcal DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutr_calc_runs_tenant_at ON nutr_calc_runs (tenant_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_nutr_calc_runs_menu_at ON nutr_calc_runs (menu_id, at DESC);


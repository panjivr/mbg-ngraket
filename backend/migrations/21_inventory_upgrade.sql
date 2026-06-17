-- =============================================================================
-- Migration 21: Inventory Upgrade — stock_movements extra columns + receiving
-- =============================================================================

-- ─── Extend stock_movements with before/after/delta/note ────────────────────
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS qty_before DOUBLE PRECISION DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS qty_after  DOUBLE PRECISION DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS delta      DOUBLE PRECISION DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS note       TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_occurred
    ON stock_movements(tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient
    ON stock_movements(tenant_id, ingredient_id, occurred_at DESC);

-- ─── Extend plan_materials with receiving tracking ──────────────────────────
ALTER TABLE plan_materials ADD COLUMN IF NOT EXISTS received_qty DOUBLE PRECISION DEFAULT 0;
ALTER TABLE plan_materials ADD COLUMN IF NOT EXISTS received_at  TIMESTAMPTZ;
ALTER TABLE plan_materials ADD COLUMN IF NOT EXISTS received_by  TEXT;

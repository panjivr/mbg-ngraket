-- =============================================================================
-- Migration 22: Fundamental Fixes
--   1. Staff ↔ Users linking
--   2. audit_logs.user_id nullable fix
--   3. Missing indexes
--   4. Rename duplicate migration 16 (handled at file level)
-- =============================================================================

-- ─── 1. Staff ↔ Users linking ───────────────────────────────────────────────

ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS division TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id) WHERE user_id IS NOT NULL;

-- Attempt to link existing staff to users by matching name + tenant_id
UPDATE staff s
   SET user_id = u.id, email = u.email
  FROM users u
 WHERE s.tenant_id = u.tenant_id
   AND LOWER(TRIM(s.name)) = LOWER(TRIM(u.name))
   AND s.user_id IS NULL;

-- ─── 2. audit_logs.user_id nullable ─────────────────────────────────────────

ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- ─── 3. Missing indexes for performance ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_finance_transactions_tenant_occurred
    ON finance_transactions(tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_category
    ON finance_transactions(tenant_id, category);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_occurred
    ON audit_logs(tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_production_batches_plan
    ON production_batches(plan_id);

CREATE INDEX IF NOT EXISTS idx_production_batches_division
    ON production_batches(division_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient
    ON recipe_ingredients(ingredient_id);

CREATE INDEX IF NOT EXISTS idx_batch_checklist_batch
    ON batch_checklist(batch_id);

CREATE INDEX IF NOT EXISTS idx_production_plans_tenant_status
    ON production_plans(tenant_id, status);

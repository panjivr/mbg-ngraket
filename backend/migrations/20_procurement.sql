-- =============================================================================
-- Migration 20: Procurement — Suppliers (platform-level), PO, Bidding, Materials
-- =============================================================================

-- ─── Suppliers: platform-level entity (NOT tenant-scoped) ───────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL,
    name            TEXT NOT NULL,
    company_name    TEXT,
    contact_phone   TEXT,
    address         TEXT,
    password_hash   TEXT NOT NULL DEFAULT '',
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    orders_taken_this_period INT NOT NULL DEFAULT 0,
    period_reset_at TIMESTAMPTZ DEFAULT now(),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(email)
);

-- ─── Operational materials config per tenant (tali rafia, plastik, dll) ─────
CREATE TABLE IF NOT EXISTS operational_materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    unit            TEXT NOT NULL DEFAULT 'pcs',
    qty_per_portion DOUBLE PRECISION NOT NULL DEFAULT 0,
    estimated_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

-- ─── Plan materials: generated requirement list per plan ────────────────────
CREATE TABLE IF NOT EXISTS plan_materials (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id                 UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    ingredient_id           UUID REFERENCES ingredients(id),
    material_name           TEXT NOT NULL,
    material_type           TEXT NOT NULL DEFAULT 'ingredient',
    quantity_needed         DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit                    TEXT NOT NULL DEFAULT '',
    estimated_price_per_unit DOUBLE PRECISION NOT NULL DEFAULT 0,
    estimated_total         DOUBLE PRECISION NOT NULL DEFAULT 0,
    price_source            TEXT NOT NULL DEFAULT 'manual',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_materials_plan ON plan_materials(plan_id);

-- ─── Purchase orders: PO from tenant ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id             UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    po_number           TEXT,
    visibility          TEXT NOT NULL DEFAULT 'public',
    target_supplier_ids UUID[] DEFAULT '{}',
    fixed_total_price   DOUBLE PRECISION,
    status              TEXT NOT NULL DEFAULT 'open',
    delivery_deadline   TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_plan ON purchase_orders(plan_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- ─── Supplier bids ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_bids (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending',
    total_amount    DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes           TEXT,
    submitted_at    TIMESTAMPTZ,
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_bids_po ON supplier_bids(po_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bids_supplier ON supplier_bids(supplier_id);

-- ─── Supplier bid items: line-item detail per bid ───────────────────────────
CREATE TABLE IF NOT EXISTS supplier_bid_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id                  UUID NOT NULL REFERENCES supplier_bids(id) ON DELETE CASCADE,
    material_id             UUID NOT NULL REFERENCES plan_materials(id) ON DELETE CASCADE,
    offered_qty             DOUBLE PRECISION NOT NULL DEFAULT 0,
    offered_price_per_unit  DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes                   TEXT
);

CREATE INDEX IF NOT EXISTS idx_supplier_bid_items_bid ON supplier_bid_items(bid_id);

-- ─── Extend production_plans with plan_data and material_total ──────────────
ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS plan_data JSONB;
ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS material_total DOUBLE PRECISION DEFAULT 0;

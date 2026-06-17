-- 13_v7_master_data.sql

-- A. Staff & Shift Management
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'cook', 'prep', 'packer', 'driver'
    skills_json JSONB DEFAULT '[]'::jsonb, -- ['grill', 'fry', 'cut']
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Shift Pagi", "Shift Siang"
    start_time TEXT NOT NULL, -- "05:00"
    end_time TEXT NOT NULL, -- "13:00"
    division_id TEXT NOT NULL, -- 'receiving', 'prep', 'cooking', 'packing', 'driver', 'cleaning', 'security', 'all'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Recipe & Resource Mapping Updates
-- (Sudah sebagian di 12_kitchen_resources, kita pastikan kolom lengkap)
-- recipe_steps sudah ada di 07_recipe_steps, update kolom resource
ALTER TABLE recipe_steps ADD COLUMN IF NOT EXISTS required_resource_type TEXT; -- 'STOVE', 'OVEN', etc.
ALTER TABLE recipe_steps ADD COLUMN IF NOT EXISTS batch_capacity DOUBLE PRECISION; -- e.g. 50 porsi
ALTER TABLE recipe_steps ADD COLUMN IF NOT EXISTS batch_duration_minutes INT; -- e.g. 20 menit

-- C. Ingredient Prep Details
CREATE TABLE IF NOT EXISTS menu_ingredient_prep (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'CUT', 'WASH', 'PEEL'
    duration_per_kg_minutes INT DEFAULT 10,
    is_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(menu_item_id, ingredient_id, action_type)
);

-- D. Extra Packing Configuration (Sudah ada di 11_food_management sebagai extra_packing_json di recipes)
-- Kita tambahkan helper table jika ingin relasi lebih ketat, tapi JSONB di recipes sudah cukup fleksibel.
-- Namun, plan.md meminta di MENU, bukan recipe. Kita tambahkan di menu_items untuk override.
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS extra_packing_json JSONB DEFAULT NULL; 
-- Format JSON: { type: "plastik", quantity: 1, duration_per_item_seconds: 5 }

-- E. Delivery Waves
CREATE TABLE IF NOT EXISTS delivery_waves (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    wave_number INT NOT NULL, -- 1, 2, 3
    target_time TIMESTAMPTZ NOT NULL, -- "YYYY-MM-DD 09:00:00+07"
    portion_count INT NOT NULL, -- 500
    driver_id UUID REFERENCES staff(id) ON DELETE SET NULL, -- Assigned Driver from Staff
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. Draft Plan (Production Drafts)
CREATE TABLE IF NOT EXISTS production_drafts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    data_json JSONB NOT NULL, -- Menyimpan struktur timeline sementara (drag-and-drop state)
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. Settings (Key-Value Store for Tenant Settings)
CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key TEXT NOT NULL, -- 'theme', 'printer_config', 'server_url', etc.
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_ingredient_prep_menu ON menu_ingredient_prep(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_delivery_waves_plan ON delivery_waves(plan_id);
CREATE INDEX IF NOT EXISTS idx_production_drafts_date ON production_drafts(tenant_id, plan_date);

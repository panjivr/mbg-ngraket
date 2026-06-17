-- Create foods table for grouping menu items (Paket Permenuan)
CREATE TABLE IF NOT EXISTS foods (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Add food_id to menu_items to link them to a food package
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS food_id UUID REFERENCES foods(id) ON DELETE SET NULL;

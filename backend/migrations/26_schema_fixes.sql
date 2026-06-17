-- Add missing columns referenced by Rust code

-- packaging_type for recipes table (used by menu.rs)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS packaging_type TEXT;

-- packaging_type for foods table (used by menu.rs)  
ALTER TABLE foods ADD COLUMN IF NOT EXISTS packaging_type TEXT DEFAULT 'ompreng';

-- updated_at for inventory table (used by inventory.rs)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

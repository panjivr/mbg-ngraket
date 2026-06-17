-- Create tools table
CREATE TABLE IF NOT EXISTS tools (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE(tenant_id, name)
);

-- Update foods table
ALTER TABLE foods ADD COLUMN IF NOT EXISTS date_served TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE foods ADD COLUMN IF NOT EXISTS packaging_type TEXT DEFAULT 'ompreng';

-- Create food_menu_items (Many-to-Many relationship for Food <-> Menu)
CREATE TABLE IF NOT EXISTS food_menu_items (
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, menu_item_id)
);

-- Update recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS portion_size DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS extra_packing_json JSONB DEFAULT '{}'::jsonb;
-- extra_packing_json structure: { enabled: bool, packing_material_id: uuid, quantity: number, unit: text, duration_minutes: number }

-- Update recipe_ingredients table with processing details
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS cutting_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS cutting_duration_minutes DOUBLE PRECISION DEFAULT 0;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS cutting_output_per_duration DOUBLE PRECISION DEFAULT 0;

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS washing_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS washing_duration_minutes DOUBLE PRECISION DEFAULT 0;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS washing_output_per_duration DOUBLE PRECISION DEFAULT 0;

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS peeling_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS peeling_duration_minutes DOUBLE PRECISION DEFAULT 0;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS peeling_output_per_duration DOUBLE PRECISION DEFAULT 0;

-- Create recipe_tools table
CREATE TABLE IF NOT EXISTS recipe_tools (
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    batch_capacity DOUBLE PRECISION NOT NULL, -- in gram/pcs
    batch_duration_minutes DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (recipe_id, tool_id)
);

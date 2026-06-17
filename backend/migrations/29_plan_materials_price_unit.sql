-- Satuan harga tersendiri (mis. kebutuhan gram, harga per kg) untuk plan_materials
ALTER TABLE plan_materials ADD COLUMN IF NOT EXISTS price_unit TEXT NOT NULL DEFAULT '';

UPDATE plan_materials SET price_unit = unit
WHERE price_unit IS NULL OR TRIM(COALESCE(price_unit, '')) = '';

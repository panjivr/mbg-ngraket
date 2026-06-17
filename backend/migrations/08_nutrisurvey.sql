CREATE TABLE IF NOT EXISTS nutr_nutrients (
    code TEXT PRIMARY KEY,
    name TEXT,
    label TEXT,
    unit TEXT,
    decimals INT NOT NULL DEFAULT 0,
    idx INT NOT NULL
);

CREATE TABLE IF NOT EXISTS nutr_foods (
    code TEXT PRIMARY KEY,
    name TEXT,
    nutr_values BYTEA
);

CREATE TABLE IF NOT EXISTS nutr_targets (
    id UUID PRIMARY KEY,
    target_set TEXT NOT NULL,
    label TEXT NOT NULL,
    min DOUBLE PRECISION,
    max DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS nutr_meta (
    key TEXT PRIMARY KEY,
    value TEXT
);

ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS nutr_code TEXT;

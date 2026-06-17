-- Portal relawan: kode staff + PIN disimpan di tabel staff (selaras dengan form HR).
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_code TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_tenant_staff_code
    ON staff (tenant_id, staff_code)
    WHERE staff_code IS NOT NULL AND btrim(staff_code) <> '';

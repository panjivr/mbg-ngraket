-- Subscription and Licensing Schema
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'TRIAL'; -- TRIAL, PRO
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_end_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS license_keys (
    key_code TEXT PRIMARY KEY, -- e.g., "MBG-A1B2-C3D4"
    plan_duration_days INT NOT NULL, -- 30, 365
    generated_by UUID NOT NULL, -- Platform Admin ID
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'UNUSED', -- USED, UNUSED, REVOKED
    used_by_tenant_id UUID, -- Null until used
    used_at TIMESTAMPTZ
);

-- Separate table for Platform Admins (Developers) vs Tenant Users
-- Or simply use a specific tenant_id '0000...00' for platform admins
-- For simplicity in this architecture, we keep users table but enforce strict separation in logic.

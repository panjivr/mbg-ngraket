-- 17_platform_auth.sql
-- Users for the platform admin/developer portal (MBG Console)

CREATE TABLE IF NOT EXISTS platform_users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', -- 'developer', 'admin', 'staff'
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL -- Optional, for platform staff tied to a tenant
);

-- Ensure users have necessary auth fields if not already present
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_code TEXT;
CREATE INDEX IF NOT EXISTS idx_users_staff_code ON users(tenant_id, staff_code);

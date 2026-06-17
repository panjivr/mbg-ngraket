-- 06_roles_and_audit.sql

-- Audit Logs for security and transparency
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhance Ingredients for Nutrisurvey feature
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS nutrition_info JSONB DEFAULT '{}';

-- Enhance Batch Checklist for QC and Photo Proof
ALTER TABLE batch_checklist ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE batch_checklist ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;
ALTER TABLE batch_checklist ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES users(id);

-- Add 'role_detail' to users if we want to be specific, or just rely on 'role' text.
-- We will enforce role values in the application logic.
-- Valid roles: 'kepala_sppg', 'ahli_gizi', 'asisten_lapangan', 'koordinator_pengolahan', 'koordinator_pemorsian', etc.

-- Add status to production_batches for tracking progress more granularly
ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'pending'; 
-- status: pending, in_progress, quality_check, completed

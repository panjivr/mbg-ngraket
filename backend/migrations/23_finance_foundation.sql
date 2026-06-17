-- =============================================================================
-- Migration 23: Finance Foundation
--   - COA (Chart of Accounts)
--   - Journals & Journal Lines (double-entry accounting)
--   - Finance sheets data (spreadsheet-like import storage)
--   - Finance setup key-value
-- =============================================================================

-- ─── 1. Chart of Accounts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_coa (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_code  TEXT NOT NULL,
    account_name  TEXT NOT NULL,
    account_group TEXT NOT NULL DEFAULT 'asset',
    normal_balance TEXT NOT NULL DEFAULT 'debit',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, account_code)
);
CREATE INDEX IF NOT EXISTS idx_finance_coa_tenant ON finance_coa(tenant_id);

-- ─── 2. Journals ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_journals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journal_no    TEXT NOT NULL,
    journal_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    description   TEXT DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'draft',
    created_at    TIMESTAMPTZ DEFAULT now(),
    posted_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_finance_journals_tenant ON finance_journals(tenant_id, journal_date DESC);

CREATE TABLE IF NOT EXISTS finance_journal_lines (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id    UUID NOT NULL REFERENCES finance_journals(id) ON DELETE CASCADE,
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_code  TEXT NOT NULL,
    description   TEXT DEFAULT '',
    debit         DOUBLE PRECISION DEFAULT 0,
    credit        DOUBLE PRECISION DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON finance_journal_lines(journal_id);

-- ─── 3. Finance Setup (key-value config) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_setup (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key           TEXT NOT NULL,
    value         TEXT DEFAULT '',
    source_row    INT DEFAULT 0,
    updated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, key)
);
CREATE INDEX IF NOT EXISTS idx_finance_setup_tenant ON finance_setup(tenant_id);

-- ─── 4. Finance Sheets (spreadsheet storage) ────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_sheets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sheet_name    TEXT NOT NULL,
    row_no        INT NOT NULL,
    cells         JSONB NOT NULL DEFAULT '{}',
    updated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, sheet_name, row_no)
);
CREATE INDEX IF NOT EXISTS idx_finance_sheets_tenant_sheet ON finance_sheets(tenant_id, sheet_name);

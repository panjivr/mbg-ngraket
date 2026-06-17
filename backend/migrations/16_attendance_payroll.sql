CREATE TABLE IF NOT EXISTS staff_shift_assignments (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, staff_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_tenant_date ON staff_shift_assignments(tenant_id, work_date);
CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_staff_date ON staff_shift_assignments(staff_id, work_date);

CREATE TABLE IF NOT EXISTS attendance_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    note TEXT,
    meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_events_tenant_staff_time ON attendance_events(tenant_id, staff_id, occurred_at);

CREATE TABLE IF NOT EXISTS attendance_daily (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    minutes_worked INT NOT NULL DEFAULT 0,
    late_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PRESENT',
    note TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, staff_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_daily_tenant_date ON attendance_daily(tenant_id, work_date);

CREATE TABLE IF NOT EXISTS staff_compensation (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    pay_type TEXT NOT NULL,
    rate DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, staff_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_staff_compensation_staff_effective ON staff_compensation(staff_id, effective_from);

CREATE TABLE IF NOT EXISTS payroll_periods (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    posted_at TIMESTAMPTZ,
    UNIQUE (tenant_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_tenant_dates ON payroll_periods(tenant_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    pay_type TEXT NOT NULL,
    rate DOUBLE PRECISION NOT NULL,
    minutes_worked INT NOT NULL DEFAULT 0,
    gross DOUBLE PRECISION NOT NULL,
    deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
    net DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    breakdown_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, period_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_period ON payroll_items(period_id);

ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL;

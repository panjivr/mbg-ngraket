-- 18_billing_system.sql
-- Advanced Billing and Subscription Management

CREATE TABLE IF NOT EXISTS subscription_plans (
    code TEXT PRIMARY KEY, -- 'TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'
    name TEXT NOT NULL,
    price_monthly DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IDR',
    features JSONB NOT NULL DEFAULT '{}', -- e.g. {"max_users": 5, "modules": ["inventory", "finance"]}
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_code TEXT NOT NULL REFERENCES subscription_plans(code),
    status TEXT NOT NULL DEFAULT 'TRIALING', -- 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED'
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    grace_end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES tenant_subscriptions(id),
    invoice_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'VOID', 'REFUNDED'
    due_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    external_id TEXT, -- Payment gateway reference
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial plans
INSERT INTO subscription_plans (code, name, price_monthly, features, limits)
VALUES 
('TRIAL', 'Uji Coba', 0, '{"modules": ["all"]}', '{"max_users": 3, "days": 14}'),
('BASIC', 'Dasar', 150000, '{"modules": ["inventory", "finance"]}', '{"max_users": 10}'),
('PRO', 'Profesional', 500000, '{"modules": ["all"]}', '{"max_users": 50}')
ON CONFLICT (code) DO NOTHING;

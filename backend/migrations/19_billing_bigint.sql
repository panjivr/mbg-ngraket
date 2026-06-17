-- 19_billing_bigint.sql
-- Use BIGINT for money values (store as smallest currency unit, e.g. Rupiah)

ALTER TABLE subscription_plans
    ALTER COLUMN price_monthly TYPE BIGINT
    USING COALESCE(price_monthly::text::numeric::bigint, 0);

ALTER TABLE invoices
    ALTER COLUMN amount TYPE BIGINT
    USING COALESCE(amount::text::numeric::bigint, 0);


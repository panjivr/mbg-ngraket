// Shared by runtime migrations and the standalone initializer.
export const MOBILE_SCHEMA = `
CREATE TABLE IF NOT EXISTS mobile_sessions (
 id UUID PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 access_hash TEXT NOT NULL UNIQUE, refresh_hash TEXT NOT NULL UNIQUE,
 access_until TIMESTAMPTZ NOT NULL, refresh_until TIMESTAMPTZ NOT NULL,
 revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mobile_sessions_user ON mobile_sessions(user_id);
CREATE OR REPLACE FUNCTION revoke_mobile_password_sessions() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE mobile_sessions SET revoked_at=now() WHERE user_id=NEW.id AND revoked_at IS NULL;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS mobile_password_reset ON users;
CREATE TRIGGER mobile_password_reset AFTER UPDATE OF password_hash ON users FOR EACH ROW
 WHEN (OLD.password_hash IS DISTINCT FROM NEW.password_hash) EXECUTE FUNCTION revoke_mobile_password_sessions();
CREATE TABLE IF NOT EXISTS mobile_login_limits (
 key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, until_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance_requests (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request_id UUID NOT NULL, result JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id, request_id)
);
CREATE TABLE IF NOT EXISTS attendance_corrections (
 id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 sppg_id INTEGER NOT NULL REFERENCES sppg(id), attendance_id INTEGER REFERENCES attendance(id) ON DELETE SET NULL,
 check_in TIMESTAMPTZ NOT NULL, check_out TIMESTAMPTZ,
 alasan TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','disetujui','ditolak')),
 reviewed_by INTEGER REFERENCES users(id), reviewed_at TIMESTAMPTZ, catatan_admin TEXT,
 original JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(check_out IS NULL OR check_out > check_in)
);
CREATE UNIQUE INDEX IF NOT EXISTS correction_pending ON attendance_corrections(attendance_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS employee_notification_reads (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 notification_key TEXT NOT NULL, read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id, notification_key)
);
`;

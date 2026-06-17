-- Create the role the dump assigns ownership to (objects are usable by the
-- superuser POSTGRES_USER regardless). Idempotent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mbgadmin') THEN
    CREATE ROLE mbgadmin LOGIN PASSWORD 'mbgadmin';
  END IF;
END
$$;

-- PROPOSED / NOT DEPLOYED. Isolated D1B prototype only. Not a Supabase migration.
-- Execute only inside an explicitly isolated test transaction/database. Never linked Production.
CREATE ROLE d1b_operations NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE SCHEMA d1b_operational;
REVOKE ALL ON SCHEMA d1b_operational FROM PUBLIC, anon, authenticated;
CREATE TABLE d1b_operational.gate (id boolean PRIMARY KEY CHECK(id));
INSERT INTO d1b_operational.gate VALUES(true);
CREATE TABLE d1b_operational.snapshots (
  id uuid PRIMARY KEY, caller_key text NOT NULL, quota_key text NOT NULL,
  expires_at bigint NOT NULL, bytes integer NOT NULL CHECK(bytes>0), sealed text NOT NULL
);
CREATE INDEX ON d1b_operational.snapshots(expires_at);
CREATE INDEX ON d1b_operational.snapshots(quota_key);
CREATE TABLE d1b_operational.sessions (
  id uuid PRIMARY KEY, mode text NOT NULL, epoch integer NOT NULL CHECK(epoch>0),
  nonce text NOT NULL, expires_at bigint NOT NULL
);
CREATE INDEX ON d1b_operational.sessions(expires_at);
CREATE TABLE d1b_operational.rates (
  key text PRIMARY KEY, window_bucket bigint NOT NULL, hits integer NOT NULL CHECK(hits>0)
);
REVOKE ALL ON ALL TABLES IN SCHEMA d1b_operational FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA d1b_operational TO d1b_operations;
GRANT SELECT,UPDATE ON d1b_operational.gate TO d1b_operations;
GRANT SELECT,INSERT,UPDATE,DELETE ON d1b_operational.snapshots,d1b_operational.sessions,d1b_operational.rates TO d1b_operations;
-- No business-table grants, RLS changes, public functions or SECURITY DEFINER.
-- Hosting-specific LOGIN/password provisioning is deliberately NOT included.

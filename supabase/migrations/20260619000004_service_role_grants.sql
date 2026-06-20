-- Harbor — grant full table access to service_role.
-- service_role is the server-side identity (Edge Functions in M3, plus admin
-- tooling). It bypasses RLS, but BYPASSRLS does not grant table privileges —
-- it still needs explicit GRANTs, which tables created via the admin role
-- don't inherit automatically.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;

alter default privileges in schema public
  grant all on tables to service_role;

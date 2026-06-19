-- Harbor — table privileges.
-- RLS (migration 0002) decides WHICH rows a caller sees; these grants decide
-- whether a role can touch the tables at all. Tables created via the admin role
-- don't inherit Supabase's automatic anon/authenticated grants, so we set them
-- explicitly.
--
-- Only `authenticated` is granted — every Harbor table is private to a
-- household, so the logged-out `anon` role gets nothing (and there are no
-- sequences to grant; all keys are uuid/composite).

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

-- Future tables created by this role inherit the same grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

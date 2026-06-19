-- Harbor — M1 row-level security.
-- A member sees only their own household's data. Identity comes from the login:
-- member.auth_user_id links a Supabase auth user to a household member.
--
-- The seed and any service-role / postgres access bypass RLS, so seeding works
-- before any auth users exist. The app uses the anon key + an authenticated
-- session, so an un-linked or logged-out client sees nothing.

create or replace function current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from member where auth_user_id = auth.uid() limit 1;
$$;

alter table household         enable row level security;
alter table member            enable row level security;
alter table target            enable row level security;
alter table ingredient        enable row level security;
alter table product           enable row level security;
alter table recipe            enable row level security;
alter table recipe_line       enable row level security;
alter table product_selection enable row level security;
alter table moment            enable row level security;
alter table moment_assignment enable row level security;
alter table shopping_check    enable row level security;
alter table activity_log      enable row level security;
alter table weight_log        enable row level security;
alter table sleep_log         enable row level security;
alter table biometric         enable row level security;

-- ── Tables that carry household_id directly ────────────────────────────────
create policy household_rw on household for all
  using (id = current_household_id())
  with check (id = current_household_id());

create policy member_rw on member for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy ingredient_rw on ingredient for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy recipe_rw on recipe for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy product_selection_rw on product_selection for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy moment_rw on moment for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy shopping_check_rw on shopping_check for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

-- ── Child tables: scope via their parent ───────────────────────────────────
create policy target_rw on target for all
  using (exists (select 1 from member m
                 where m.id = target.member_id and m.household_id = current_household_id()))
  with check (exists (select 1 from member m
                 where m.id = target.member_id and m.household_id = current_household_id()));

create policy product_rw on product for all
  using (exists (select 1 from ingredient i
                 where i.id = product.ingredient_id and i.household_id = current_household_id()))
  with check (exists (select 1 from ingredient i
                 where i.id = product.ingredient_id and i.household_id = current_household_id()));

create policy recipe_line_rw on recipe_line for all
  using (exists (select 1 from recipe r
                 where r.id = recipe_line.recipe_id and r.household_id = current_household_id()))
  with check (exists (select 1 from recipe r
                 where r.id = recipe_line.recipe_id and r.household_id = current_household_id()));

create policy moment_assignment_rw on moment_assignment for all
  using (exists (select 1 from moment mo
                 where mo.id = moment_assignment.moment_id and mo.household_id = current_household_id()))
  with check (exists (select 1 from moment mo
                 where mo.id = moment_assignment.moment_id and mo.household_id = current_household_id()));

-- ── Health logs: scope via member ──────────────────────────────────────────
create policy activity_log_rw on activity_log for all
  using (exists (select 1 from member m
                 where m.id = activity_log.member_id and m.household_id = current_household_id()))
  with check (exists (select 1 from member m
                 where m.id = activity_log.member_id and m.household_id = current_household_id()));

create policy weight_log_rw on weight_log for all
  using (exists (select 1 from member m
                 where m.id = weight_log.member_id and m.household_id = current_household_id()))
  with check (exists (select 1 from member m
                 where m.id = weight_log.member_id and m.household_id = current_household_id()));

create policy sleep_log_rw on sleep_log for all
  using (exists (select 1 from member m
                 where m.id = sleep_log.member_id and m.household_id = current_household_id()))
  with check (exists (select 1 from member m
                 where m.id = sleep_log.member_id and m.household_id = current_household_id()));

create policy biometric_rw on biometric for all
  using (exists (select 1 from member m
                 where m.id = biometric.member_id and m.household_id = current_household_id()))
  with check (exists (select 1 from member m
                 where m.id = biometric.member_id and m.household_id = current_household_id()));

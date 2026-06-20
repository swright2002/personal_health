-- The "prescription" — the per-member, machine-checkable rules the Nutrition
-- Agent (RD) maintains and the planner reads (planner Phase 2). Grounded in
-- docs/nutrition-health-knowledge-base.md. A flexible rule table because rules
-- are many, vary per member, carry provenance, and the agent edits them over time.

create table prescription (
  member_id           uuid primary key references member(id) on delete cascade,
  energy_strategy     text check (energy_strategy in ('deficit', 'maintenance', 'surplus')),
  energy_delta_kcal   integer not null default 0,   -- e.g. -400 deficit, 0 maintenance
  reference_weight_kg numeric,                       -- for g/kg targets (anchor, not current weight)
  summary             text,                          -- the agent's plain-language headline
  updated_at          timestamptz not null default now()
);

create table prescription_rule (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references member(id) on delete cascade,
  kind       text not null check (kind in ('floor', 'ceiling', 'pattern', 'micronutrient', 'nudge')),
  category   text,                          -- macro|energy|cancer|cardio|sleep|activity|skin|hydration|vegan|clinical|parkinsons
  key        text not null,                 -- protein|fiber|fatty_fish|sodium|b12|strength_training|...
  comparator text check (comparator in ('>=', '<=', '=', 'range')),
  value      numeric,
  value_max  numeric,                       -- for range
  unit       text,                          -- g|mg|mcg|g/kg|pct|serving|session|min|drink|IU
  period     text,                          -- day|week|meal
  scope      text not null default 'all',   -- all|run_day|rest_day (conditional targets)
  health_tag text,                          -- maps to recipe.health_tags for `pattern` rules
  evidence   text check (evidence in ('strong', 'moderate', 'associational', 'limited', 'expert_opinion')),
  source     text,                          -- citation
  rationale  text,                          -- the "why", shown to the user
  active     boolean not null default true,
  origin     text not null default 'seed',  -- seed|agent|user
  created_at timestamptz not null default now()
);
create index prescription_rule_member_idx on prescription_rule (member_id) where active;

alter table prescription      enable row level security;
alter table prescription_rule enable row level security;
create policy prescription_rw on prescription for all to authenticated
  using (exists (select 1 from member m where m.id = prescription.member_id and m.household_id = current_household_id()))
  with check (exists (select 1 from member m where m.id = prescription.member_id and m.household_id = current_household_id()));
create policy prescription_rule_rw on prescription_rule for all to authenticated
  using (exists (select 1 from member m where m.id = prescription_rule.member_id and m.household_id = current_household_id()))
  with check (exists (select 1 from member m where m.id = prescription_rule.member_id and m.household_id = current_household_id()));
grant select, insert, update, delete on prescription, prescription_rule to authenticated;
grant all on prescription, prescription_rule to service_role;

-- Align the existing daily macro floor with the KB (Spencer's CHD-grade fiber 38).
update target set fiber = 38 where member_id = '22222222-2222-2222-2222-222222222222' and kind in ('run_day', 'rest_day');

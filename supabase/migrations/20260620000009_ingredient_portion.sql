-- Ingredient portion weights — the bridge that lets a per-100g product fill a
-- recipe line measured in cups/tbsp/cans. Each row is the grams in ONE of `unit`
-- for that ingredient. Volume rows (cup/tbsp/tsp) double as a density anchor (the
-- units converter derives g/ml from any volume row); count/container rows (can)
-- give an exact weight. Mass units (oz, lb) are universal — no row needed.

create table ingredient_portion (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  unit          text not null,                 -- 'cup' | 'tbsp' | 'tsp' | 'can' | 'each' | ...
  grams         numeric not null,              -- grams in ONE of `unit`
  source        text not null default 'seed',  -- seed | fdc | llm | manual
  created_at    timestamptz not null default now(),
  unique (ingredient_id, unit)
);
create index ingredient_portion_ingredient_idx on ingredient_portion (ingredient_id);

alter table ingredient_portion enable row level security;
create policy ingredient_portion_rw on ingredient_portion for all to authenticated
  using (exists (select 1 from ingredient i
                 where i.id = ingredient_portion.ingredient_id and i.household_id = current_household_id()))
  with check (exists (select 1 from ingredient i
                 where i.id = ingredient_portion.ingredient_id and i.household_id = current_household_id()));
grant select, insert, update, delete on ingredient_portion to authenticated;
grant all on ingredient_portion to service_role;

-- Seed natural portions for the seed household's ingredients (standard cooking
-- references). One anchor per ingredient — the unit its recipe lines use.
insert into ingredient_portion (ingredient_id, unit, grams, source)
select i.id, v.unit, v.grams, 'seed'
from (values
  -- cup ingredients (grams per 1 cup)
  ('almondmilk', 'cup', 240),
  ('berries',    'cup', 144),
  ('broccoli',   'cup', 91),
  ('coconutmilk','cup', 240),
  ('cucumber',   'cup', 120),
  ('feta',       'cup', 150),
  ('kale',       'cup', 67),
  ('lentils',    'cup', 198),
  ('oats',       'cup', 160),
  ('quinoa',     'cup', 185),
  ('spinach',    'cup', 30),
  ('tempeh',     'cup', 166),
  ('walnuts',    'cup', 117),
  -- tbsp ingredients (grams per 1 tbsp)
  ('chia',       'tbsp', 12),
  ('dill',       'tbsp', 3),
  ('lemon',      'tbsp', 15),
  ('oliveoil',   'tbsp', 13.5),
  -- tsp ingredients (grams per 1 tsp)
  ('cumin',      'tsp', 2),
  -- can ingredients (grams per 1 drained can)
  ('chickpeas',  'can', 240),
  ('whitebeans', 'can', 240)
) as v(ing_key, unit, grams)
join ingredient i on i.household_id = '11111111-1111-1111-1111-111111111111' and i.key = v.ing_key
on conflict (ingredient_id, unit) do nothing;

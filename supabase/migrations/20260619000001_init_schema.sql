-- Harbor — M1 schema (PLAN.md §2).
-- The three-layer food spine (recipe → recipe_line → product, via an abstract
-- ingredient) plus household, members, targets, the per-person "moment" meal
-- plan, shopping checkoffs, and reserved health-log tables for later modules.
--
-- Production refinement (PLAN §2a): a product's nutrition is stored *per its own
-- serving* and the recipe line carries quantity + unit, so scaled nutrition is
-- COMPUTED, never pre-baked:
--   line nutrition = product.nutrition × (recipe_line.quantity / product.serving_size)

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ── Household & members ────────────────────────────────────────────────────
create table household (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table member (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references household(id) on delete cascade,
  auth_user_id  uuid unique references auth.users(id) on delete set null,  -- login → who you see
  name          text not null,
  short         text not null,                 -- "You", "Jacq"
  initials      text not null,
  diet          text not null default 'Omnivore',
  accent_color  text,                          -- hex; null = use the theme accent
  role          text not null default 'member' check (role in ('owner','member')),
  created_at    timestamptz not null default now()
);
create index member_household_idx on member (household_id);

-- Per member, per day-kind. Which kind applies on a given date is decided by the
-- UI/agents (run vs rest), not stored here.
create table target (
  id        uuid primary key default gen_random_uuid(),
  member_id uuid not null references member(id) on delete cascade,
  kind      text not null check (kind in ('run_day','rest_day','maintenance')),
  kcal      integer not null,
  protein   integer not null,
  carbs     integer not null,
  fat       integer not null,
  fiber     integer not null,
  unique (member_id, kind)
);

-- ── Food spine ─────────────────────────────────────────────────────────────
create table ingredient (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references household(id) on delete cascade,
  key           text not null,                 -- catalog slug, e.g. 'lentils'
  label         text not null,                 -- 'cooked green lentils'
  pantry        boolean not null default false,-- staple assumed on hand
  created_at    timestamptz not null default now(),
  unique (household_id, key)
);
create index ingredient_household_idx on ingredient (household_id);

-- A specific purchasable item that can fill an ingredient line. Where real labels live.
create table product (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  store         text not null,                 -- 'Default' | 'Whole Foods' | 'Garden' | ...
  brand         text not null,
  size          text,                          -- human label: '16 oz dry'
  price         numeric(10,2),                 -- null = pantry / Default (no price)
  serving_size  numeric not null default 1,    -- the amount the nutrition below is measured per
  serving_unit  text not null,                 -- 'cup' | 'tbsp' | 'tsp' | 'oz' | 'can' | 'each'
  kcal          numeric not null default 0,
  protein       numeric not null default 0,    -- grams
  carbs         numeric not null default 0,    -- grams
  fat           numeric not null default 0,    -- grams
  fiber         numeric not null default 0,    -- grams
  sodium        numeric not null default 0,    -- mg
  note          text,
  is_default    boolean not null default false,-- the generic recipe-book assumption
  created_at    timestamptz not null default now(),
  unique (ingredient_id, store)
);
create index product_ingredient_idx on product (ingredient_id);

create table recipe (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references household(id) on delete cascade,
  slug          text not null,                 -- stable handle, e.g. 'bowl'
  name          text not null,
  slot          text not null check (slot in ('Breakfast','Lunch','Dinner','Snack')),
  prep_time     text,                          -- the handoff's `time`, e.g. '25 min'
  servings      integer not null default 1,    -- natural yield; scale at plan time
  img           text,
  vegan         boolean not null default false,
  tags          text[] not null default '{}',
  note          text,
  created_at    timestamptz not null default now(),
  unique (household_id, slug)
);
create index recipe_household_idx on recipe (household_id);

-- Ordered ingredient lines. Quantity lives HERE (not on the ingredient).
create table recipe_line (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipe(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete restrict,
  quantity      numeric not null,
  unit          text not null,
  position      integer not null default 0,
  unique (recipe_id, ingredient_id)
);
create index recipe_line_recipe_idx on recipe_line (recipe_id);

-- Which product fills each ingredient line. Drives BOTH nutrition and shopping.
create table product_selection (
  household_id  uuid not null references household(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  product_id    uuid not null references product(id) on delete cascade,
  updated_at    timestamptz not null default now(),
  primary key (household_id, ingredient_id)
);

-- ── Meal plan (per-person "moment" model) ──────────────────────────────────
-- One eating occasion on a date. `cooked_servings` is reserved for leftovers
-- (PLAN §2c) — stays null in v1 (every meal a fresh cook).
create table moment (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references household(id) on delete cascade,
  date            date not null,
  label           text not null,               -- 'Breakfast','Morning snack',...
  position        integer not null default 0,
  mode            text not null check (mode in ('shared','separate')),
  cooked_servings integer,                      -- reserved; null in v1
  created_at      timestamptz not null default now()
);
create index moment_household_date_idx on moment (household_id, date);

-- One row per participant. No row = that person skips this moment.
-- `servings` (eaten) drives that person's nutrition. `leftover_source` is reserved.
create table moment_assignment (
  id              uuid primary key default gen_random_uuid(),
  moment_id       uuid not null references moment(id) on delete cascade,
  member_id       uuid not null references member(id) on delete cascade,
  recipe_id       uuid references recipe(id) on delete set null,
  servings        numeric not null default 1,  -- eaten
  leftover_source uuid references moment(id) on delete set null,  -- reserved; null in v1
  unique (moment_id, member_id)
);
create index moment_assignment_moment_idx on moment_assignment (moment_id);

-- ── Shopping (the list is generated from the plan; only checkoff state persists) ──
create table shopping_check (
  household_id  uuid not null references household(id) on delete cascade,
  week          date not null,                 -- the week's anchor date (Monday)
  product_id    uuid not null references product(id) on delete cascade,
  checked       boolean not null default false,
  updated_at    timestamptz not null default now(),
  primary key (household_id, week, product_id)
);

-- ── Reserved seats for later modules (§2e) — schema-ready, empty in M1 ──────
create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references member(id) on delete cascade,
  date         date not null,
  kind         text,                            -- 'run','strength',...
  distance_km  numeric,
  duration_min numeric,
  active_kcal  numeric,
  source       text not null default 'manual' check (source in ('manual','healthkit')),
  created_at   timestamptz not null default now()
);
create index activity_log_member_date_idx on activity_log (member_id, date);

create table weight_log (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references member(id) on delete cascade,
  date       date not null,
  weight_kg  numeric not null,
  source     text not null default 'manual' check (source in ('manual','healthkit')),
  created_at timestamptz not null default now()
);
create index weight_log_member_date_idx on weight_log (member_id, date);

create table sleep_log (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references member(id) on delete cascade,
  date         date not null,
  duration_min numeric,
  source       text not null default 'manual' check (source in ('manual','healthkit')),
  created_at   timestamptz not null default now()
);
create index sleep_log_member_date_idx on sleep_log (member_id, date);

create table biometric (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references member(id) on delete cascade,
  date       date not null,
  kind       text not null,                     -- 'resting_hr',...
  value      numeric not null,
  unit       text,
  source     text not null default 'manual' check (source in ('manual','healthkit')),
  created_at timestamptz not null default now()
);
create index biometric_member_date_idx on biometric (member_id, date);

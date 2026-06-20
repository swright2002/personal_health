-- Harbor — Product & Nutrition Engine schema (feature A).
-- Implements docs/product-engine-spec.md §G. All additive except deliberate
-- relaxations on `product` (drop the one-product-per-store constraint so an
-- ingredient can hold many real candidate products) and a `product_selection`
-- PK change (to allow per-member selections alongside the household default).
-- Diet hierarchy: 0 omnivore ⊃ 1 pescetarian ⊃ 2 vegetarian ⊃ 3 vegan.

-- ── product: real-label fields (nutrition stays per the product's serving) ──
alter table product
  add column name             text,                 -- display name, e.g. 'Nutella Hazelnut Spread' (brand is separate)
  add column ingredients_text text,
  add column diet_level       smallint check (diet_level between 0 and 3),
  add column diet_status      text check (diet_status in ('confirmed','derived','maybe','unknown')),
  add column allergens        text[] not null default '{}',
  add column allergen_traces  text[] not null default '{}',
  add column gluten_free      boolean,              -- tri-state: true / false / null=unverified
  add column analysis_source  text,                 -- off|fdc_foundation|fdc_sr_legacy|fdc_branded|manufacturer|llm|seed|manual|unavailable
  add column source_url       text,
  add column source_ref       text,                 -- external id (OFF code / FDC fdcId)
  add column barcode          text,                 -- GTIN-14 canonical (until the 0008 product_package split)
  add column net_weight_g     numeric,              -- optional; feeds the §2a food/package clustering later
  add column servings_per_container numeric;

-- Let an ingredient hold many candidate products (auto default + manual picks +
-- cached lookups); real products aren't store-specific.
alter table product drop constraint if exists product_ingredient_id_store_key;
alter table product alter column store drop not null;
create index if not exists product_barcode_idx on product (barcode) where barcode is not null;

-- ── member: structured diet + allergies/restrictions (today: only `diet text`) ──
alter table member
  add column diet_level   smallint check (diet_level between 0 and 3),
  add column allergies    text[] not null default '{}',   -- Big-9 keys the member must avoid
  add column restrictions text[] not null default '{}';   -- e.g. 'gluten_free'
update member set diet_level = case lower(diet)
  when 'vegan' then 3 when 'vegetarian' then 2 when 'pescetarian' then 1 else 0 end;

-- ── ingredient: category + canonical key (routes lookup + ranking) ──
alter table ingredient
  add column category      text,   -- produce|grain|legume|dairy|meat|fish|oil|spice|sweetener|sauce|additive|snack|other
  add column canonical_key text;   -- OFF-style 'en:flour'

-- ── product_selection: per-member resolution + auto/manual stickiness ──
-- member_id null = the household default. PK can't hold a nullable column, so we
-- drop it and enforce uniqueness with two partial indexes (also upsert targets).
alter table product_selection
  add column source    text not null default 'auto' check (source in ('manual','auto','import')),
  add column member_id uuid references member(id) on delete cascade;
alter table product_selection drop constraint product_selection_pkey;
create unique index product_selection_hh_default_idx
  on product_selection (household_id, ingredient_id) where member_id is null;
create unique index product_selection_member_idx
  on product_selection (household_id, ingredient_id, member_id) where member_id is not null;

-- ── allergen: FDA Big-9 reference (+ mollusc for EU-14 extensibility) ──
create table allergen (
  key      text primary key,
  label    text not null,
  scheme   text not null default 'fda_big9',
  position int
);
insert into allergen (key, label, scheme, position) values
  ('milk','Milk','fda_big9',1),
  ('egg','Egg','fda_big9',2),
  ('fish','Fish','fda_big9',3),
  ('crustacean_shellfish','Crustacean shellfish','fda_big9',4),
  ('tree_nuts','Tree nuts','fda_big9',5),
  ('peanuts','Peanuts','fda_big9',6),
  ('wheat','Wheat','fda_big9',7),
  ('soybeans','Soybeans','fda_big9',8),
  ('sesame','Sesame','fda_big9',9),
  ('mollusc','Mollusc','eu14',10)
on conflict (key) do nothing;

-- ── food_term: keyword dictionary driving the diet/allergen scan (spec §E) ──
-- vegan/vegetarian/pescetarian_ok: true=ok, false=disqualifying, null=says nothing.
create table food_term (
  term           text primary key,   -- lowercase match surface
  canonical      text not null,
  allergen_key   text references allergen(key),
  vegan          boolean,
  vegetarian     boolean,
  pescetarian_ok boolean,
  gluten         boolean not null default false,
  ambiguous      boolean not null default false
);
insert into food_term (term, canonical, allergen_key, vegan, vegetarian, pescetarian_ok, gluten, ambiguous) values
  -- MILK
  ('milk','milk','milk',false,true,true,false,false),
  ('whole milk','milk','milk',false,true,true,false,false),
  ('skim milk','milk','milk',false,true,true,false,false),
  ('milk powder','milk','milk',false,true,true,false,false),
  ('nonfat dry milk','milk','milk',false,true,true,false,false),
  ('cream','milk','milk',false,true,true,false,false),
  ('butter','milk','milk',false,true,true,false,false),
  ('butterfat','milk','milk',false,true,true,false,false),
  ('whey','milk','milk',false,true,true,false,false),
  ('whey protein','milk','milk',false,true,true,false,false),
  ('casein','milk','milk',false,true,true,false,false),
  ('caseinate','milk','milk',false,true,true,false,false),
  ('sodium caseinate','milk','milk',false,true,true,false,false),
  ('lactose','milk','milk',false,true,true,false,false),
  ('ghee','milk','milk',false,true,true,false,false),
  ('cheese','milk','milk',false,true,true,false,false),
  ('yogurt','milk','milk',false,true,true,false,false),
  -- EGG
  ('egg','egg','egg',false,true,true,false,false),
  ('egg white','egg','egg',false,true,true,false,false),
  ('egg yolk','egg','egg',false,true,true,false,false),
  ('albumen','egg','egg',false,true,true,false,false),
  ('ovalbumin','egg','egg',false,true,true,false,false),
  ('mayonnaise','egg','egg',false,true,true,false,false),
  -- FISH (pescetarian-ok, vegetarian-fail)
  ('fish','fish','fish',false,false,true,false,false),
  ('anchovy','fish','fish',false,false,true,false,false),
  ('anchovies','fish','fish',false,false,true,false,false),
  ('fish sauce','fish','fish',false,false,true,false,false),
  ('tuna','fish','fish',false,false,true,false,false),
  ('salmon','fish','fish',false,false,true,false,false),
  ('cod','fish','fish',false,false,true,false,false),
  ('sardine','fish','fish',false,false,true,false,false),
  ('fish gelatin','fish','fish',false,false,true,false,false),
  ('isinglass','fish','fish',false,false,true,false,false),
  ('worcestershire','fish','fish',false,false,true,false,true),
  -- CRUSTACEAN SHELLFISH
  ('shrimp','crustacean_shellfish','crustacean_shellfish',false,false,true,false,false),
  ('prawn','crustacean_shellfish','crustacean_shellfish',false,false,true,false,false),
  ('crab','crustacean_shellfish','crustacean_shellfish',false,false,true,false,false),
  ('lobster','crustacean_shellfish','crustacean_shellfish',false,false,true,false,false),
  ('crawfish','crustacean_shellfish','crustacean_shellfish',false,false,true,false,false),
  -- MOLLUSC (EU-14; not a Big-9 allergen gate but diet-disqualifying)
  ('oyster','mollusc','mollusc',false,false,true,false,false),
  ('clam','mollusc','mollusc',false,false,true,false,false),
  ('mussel','mollusc','mollusc',false,false,true,false,false),
  ('squid','mollusc','mollusc',false,false,true,false,false),
  ('oyster sauce','mollusc','mollusc',false,false,true,false,false),
  -- TREE NUTS
  ('almond','tree_nuts','tree_nuts',true,true,true,false,false),
  ('hazelnut','tree_nuts','tree_nuts',true,true,true,false,false),
  ('walnut','tree_nuts','tree_nuts',true,true,true,false,false),
  ('cashew','tree_nuts','tree_nuts',true,true,true,false,false),
  ('pecan','tree_nuts','tree_nuts',true,true,true,false,false),
  ('pistachio','tree_nuts','tree_nuts',true,true,true,false,false),
  ('macadamia','tree_nuts','tree_nuts',true,true,true,false,false),
  ('coconut','tree_nuts','tree_nuts',true,true,true,false,false),
  -- PEANUTS
  ('peanut','peanuts','peanuts',true,true,true,false,false),
  ('peanut butter','peanuts','peanuts',true,true,true,false,false),
  ('groundnut','peanuts','peanuts',true,true,true,false,false),
  ('arachis oil','peanuts','peanuts',true,true,true,false,false),
  -- WHEAT (allergen + gluten)
  ('wheat','wheat','wheat',true,true,true,true,false),
  ('wheat flour','wheat','wheat',true,true,true,true,false),
  ('semolina','wheat','wheat',true,true,true,true,false),
  ('durum','wheat','wheat',true,true,true,true,false),
  ('spelt','wheat','wheat',true,true,true,true,false),
  ('farro','wheat','wheat',true,true,true,true,false),
  ('vital wheat gluten','wheat','wheat',true,true,true,true,false),
  ('seitan','wheat','wheat',true,true,true,true,false),
  ('flour','wheat','wheat',true,true,true,true,true),
  -- SOYBEANS
  ('soy','soybeans','soybeans',true,true,true,false,false),
  ('soybean','soybeans','soybeans',true,true,true,false,false),
  ('soy lecithin','soybeans','soybeans',true,true,true,false,false),
  ('soybean oil','soybeans','soybeans',true,true,true,false,false),
  ('tofu','soybeans','soybeans',true,true,true,false,false),
  ('edamame','soybeans','soybeans',true,true,true,false,false),
  ('soy protein','soybeans','soybeans',true,true,true,false,false),
  -- SESAME
  ('sesame','sesame','sesame',true,true,true,false,false),
  ('tahini','sesame','sesame',true,true,true,false,false),
  ('sesame oil','sesame','sesame',true,true,true,false,false),
  -- GLUTEN CEREALS (restriction, not a Big-9 allergen)
  ('barley','barley',null,true,true,true,true,false),
  ('rye','rye',null,true,true,true,true,false),
  ('malt','malt',null,true,true,true,true,false),
  ('malt extract','malt',null,true,true,true,true,false),
  ('oats','oats',null,true,true,true,true,false),
  ('triticale','triticale',null,true,true,true,true,false),
  ('brewers yeast','brewers_yeast',null,true,true,true,true,true),
  -- HIDDEN NON-VEGAN / NON-VEG (diet-disqualifying, not allergens)
  ('gelatin','gelatin',null,false,false,true,false,false),
  ('gelatine','gelatin',null,false,false,true,false,false),
  ('beef gelatin','gelatin',null,false,false,false,false,false),
  ('carmine','carmine',null,false,false,true,false,false),
  ('cochineal','carmine',null,false,false,true,false,false),
  ('rennet','rennet',null,false,true,true,false,true),
  ('shellac','shellac',null,false,true,true,false,false),
  ('confectioners glaze','shellac',null,false,true,true,false,false),
  ('lard','lard',null,false,false,false,false,false),
  ('tallow','tallow',null,false,false,false,false,false),
  ('suet','suet',null,false,false,false,false,false),
  ('chicken','chicken',null,false,false,false,false,false),
  ('beef','beef',null,false,false,false,false,false),
  ('pork','pork',null,false,false,false,false,false),
  ('honey','honey',null,false,true,true,false,false),
  ('beeswax','beeswax',null,false,true,true,false,false),
  ('l-cysteine','l_cysteine',null,false,false,true,false,true),
  ('mono- and diglycerides','mono_diglycerides',null,true,true,true,false,true),
  ('natural flavors','natural_flavors',null,true,true,true,false,true),
  ('vitamin d3','vitamin_d3',null,true,true,true,false,true)
on conflict (term) do nothing;

-- ── ingredient_synonym: learned dedup cache (global seed rows have household_id null) ──
create table ingredient_synonym (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references household(id) on delete cascade,
  surface       text not null,
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  source        text,
  confidence    numeric,
  created_at    timestamptz not null default now()
);
create index ingredient_synonym_surface_idx on ingredient_synonym (surface);

-- ── recipe_line_product: per-recipe-line product override (member_id null = recipe-wide) ──
create table recipe_line_product (
  recipe_line_id uuid not null references recipe_line(id) on delete cascade,
  member_id      uuid references member(id) on delete cascade,
  product_id     uuid not null references product(id) on delete cascade,
  primary key (recipe_line_id, member_id)
);

-- ── RLS + grants (follow the live 0002/0003/0004 pattern) ──
alter table allergen            enable row level security;
alter table food_term           enable row level security;
alter table ingredient_synonym  enable row level security;
alter table recipe_line_product enable row level security;

-- Reference tables: world-readable to signed-in users; writes via service_role (bypasses RLS).
create policy allergen_read  on allergen  for select to authenticated using (true);
create policy food_term_read on food_term for select to authenticated using (true);

-- Synonyms: global rows readable by all; household rows scoped; writes only to own household.
create policy ingredient_synonym_read on ingredient_synonym for select to authenticated
  using (household_id is null or household_id = current_household_id());
create policy ingredient_synonym_write on ingredient_synonym for all to authenticated
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

-- Line overrides: scope through recipe_line → recipe.household_id.
create policy recipe_line_product_rw on recipe_line_product for all to authenticated
  using (exists (select 1 from recipe_line rl join recipe r on r.id = rl.recipe_id
                 where rl.id = recipe_line_product.recipe_line_id and r.household_id = current_household_id()))
  with check (exists (select 1 from recipe_line rl join recipe r on r.id = rl.recipe_id
                 where rl.id = recipe_line_product.recipe_line_id and r.household_id = current_household_id()));

grant select on allergen, food_term to authenticated;
grant select, insert, update, delete on ingredient_synonym, recipe_line_product to authenticated;
grant all on allergen, food_term, ingredient_synonym, recipe_line_product to service_role;

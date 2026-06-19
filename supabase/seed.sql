-- Harbor — M1 seed. Ports the prototype's DATA(), defaultDay() and
-- personTargets() (design/Harbor Meal Planner.dc.html) into the real schema.
--
-- Nutrition parity: the prototype stores each product's nutrition pre-scaled to
-- the ingredient's recipe quantity. Here that quantity becomes BOTH the
-- product's serving_size and the recipe line's quantity, so the computed
-- line nutrition (nutrition × quantity / serving_size) reproduces the prototype
-- numbers exactly (ratio = 1) while the model stays production-correct.
--
-- Idempotent: deleting the demo household cascades to everything below it.

delete from household where id = '11111111-1111-1111-1111-111111111111';

-- ── Household & members ────────────────────────────────────────────────────
insert into household (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Harbor Demo Household');

-- auth_user_id is null until a real Supabase auth user is linked (see supabase/README.md).
insert into member (id, household_id, name, short, initials, diet, accent_color, role) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Spencer', 'You',  'S', 'Omnivore', null,      'owner'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Jacq',    'Jacq', 'J', 'Vegan',    '#cf6963', 'member');

insert into target (member_id, kind, kcal, protein, carbs, fat, fiber) values
  ('22222222-2222-2222-2222-222222222222', 'run_day',     2200, 145, 250, 62, 30),
  ('22222222-2222-2222-2222-222222222222', 'rest_day',    1850, 140, 165, 60, 30),
  ('33333333-3333-3333-3333-333333333333', 'maintenance', 1850,  95, 230, 55, 38);

-- ── Ingredients (catalog) ──────────────────────────────────────────────────
insert into ingredient (household_id, key, label, pantry) values
  ('11111111-1111-1111-1111-111111111111', 'lentils',     'cooked green lentils',       false),
  ('11111111-1111-1111-1111-111111111111', 'kale',        'chopped kale',               false),
  ('11111111-1111-1111-1111-111111111111', 'quinoa',      'cooked quinoa',              false),
  ('11111111-1111-1111-1111-111111111111', 'oliveoil',    'extra-virgin olive oil',     true),
  ('11111111-1111-1111-1111-111111111111', 'feta',        'crumbled feta',              false),
  ('11111111-1111-1111-1111-111111111111', 'lemon',       'lemon juice',                true),
  ('11111111-1111-1111-1111-111111111111', 'cumin',       'ground cumin',               true),
  ('11111111-1111-1111-1111-111111111111', 'salmon',      'salmon fillet',              false),
  ('11111111-1111-1111-1111-111111111111', 'broccoli',    'broccoli florets',           false),
  ('11111111-1111-1111-1111-111111111111', 'oats',        'steel-cut oats',             false),
  ('11111111-1111-1111-1111-111111111111', 'berries',     'mixed berries',              false),
  ('11111111-1111-1111-1111-111111111111', 'walnuts',     'walnuts',                    false),
  ('11111111-1111-1111-1111-111111111111', 'chia',        'chia seeds',                 false),
  ('11111111-1111-1111-1111-111111111111', 'almondmilk',  'unsweetened almond milk',    false),
  ('11111111-1111-1111-1111-111111111111', 'cucumber',    'cucumbers, smashed',         false),
  ('11111111-1111-1111-1111-111111111111', 'whitebeans',  'cannellini beans, drained',  false),
  ('11111111-1111-1111-1111-111111111111', 'dill',        'fresh dill',                 true),
  ('11111111-1111-1111-1111-111111111111', 'tofu',        'firm tofu',                  false),
  ('11111111-1111-1111-1111-111111111111', 'spinach',     'baby spinach',               false),
  ('11111111-1111-1111-1111-111111111111', 'tempeh',      'tempeh, cubed',              false),
  ('11111111-1111-1111-1111-111111111111', 'chickpeas',   'chickpeas, drained',         false),
  ('11111111-1111-1111-1111-111111111111', 'coconutmilk', 'light coconut milk',         false);

-- ── Products (real labels). nutrition is per (serving_size serving_unit). ───
-- Columns: ing_key, store, brand, size, price, serving_size, serving_unit, kcal, protein, carbs, fat, fiber, sodium, note
insert into product (ingredient_id, store, brand, size, price, serving_size, serving_unit, kcal, protein, carbs, fat, fiber, sodium, note, is_default)
select i.id, v.store, v.brand, v.size, v.price, v.serving_size, v.serving_unit,
       v.kcal, v.protein, v.carbs, v.fat, v.fiber, v.sodium, nullif(v.note, ''), (v.store = 'Default')
from (values
  ('lentils','Default','Generic green lentils','—',null::numeric,1,'cup',230,18,40,0.8,15,4,'Recipe-book default'),
  ('lentils','Whole Foods','365 Organic Green Lentils','16 oz dry',2.49,1,'cup',230,18,40,0.8,15,4,''),
  ('lentils','Trader Joe''s','Steamed Lentils','17.6 oz · pre-cooked',2.99,1,'cup',210,15,36,1,13,55,'Heat & serve'),
  ('lentils','Online','Bob''s Red Mill Petite Lentils','27 oz dry',4.79,1,'cup',230,18,40,0.8,15,4,''),

  ('kale','Default','Generic kale','—',null,2,'cup',67,4,13,1,5,58,''),
  ('kale','Whole Foods','Organic Lacinato Kale','1 bunch',2.99,2,'cup',67,4,13,1,5,58,''),
  ('kale','Target','Good & Gather Chopped Kale','16 oz bag',2.49,2,'cup',70,4,13,1,5,60,'Pre-washed'),
  ('kale','King Soopers','Simple Truth Organic Kale','5 oz',2.79,2,'cup',67,4,13,1,5,58,''),

  ('quinoa','Default','Generic quinoa','—',null,0.5,'cup',111,4,20,1.8,3,7,''),
  ('quinoa','Trader Joe''s','Organic Tri-Color Quinoa','16 oz',3.49,0.5,'cup',111,4,20,1.8,3,7,''),
  ('quinoa','Whole Foods','365 White Quinoa','16 oz',4.49,0.5,'cup',111,4,20,1.8,3,7,''),

  ('oliveoil','Default','Generic EVOO','—',null,1,'tbsp',119,0,0,14,0,0,''),
  ('oliveoil','Trader Joe''s','Spanish EVOO','16.9 oz',6.99,1,'tbsp',119,0,0,14,0,0,''),
  ('oliveoil','King Soopers','Private Selection EVOO','16.9 oz',9.99,1,'tbsp',119,0,0,14,0,0,''),

  ('feta','Default','Generic feta','—',null,0.25,'cup',100,5,1.5,8,0,320,''),
  ('feta','Whole Foods','365 Crumbled Feta','6 oz',3.99,0.25,'cup',100,5,1.5,8,0,320,''),
  ('feta','Trader Joe''s','Feta Cheese','8 oz',3.49,0.25,'cup',90,5,1,7,0,300,'Lower sodium'),

  ('lemon','Default','Generic lemon','—',null,1,'tbsp',4,0,1,0,0,0,''),
  ('lemon','Whole Foods','Organic Lemons','each',0.79,1,'tbsp',4,0,1,0,0,0,''),

  ('cumin','Default','Generic ground cumin','—',null,0.5,'tsp',4,0,0.5,0.2,0.3,2,''),

  ('salmon','Default','Generic salmon','—',null,6,'oz',350,34,0,22,0,80,''),
  ('salmon','Whole Foods','Wild Sockeye Salmon','per lb',17.99,6,'oz',310,40,0,16,0,75,'Wild · leaner'),
  ('salmon','King Soopers','Atlantic Salmon Fillet','per lb',9.99,6,'oz',350,34,0,22,0,80,''),

  ('broccoli','Default','Generic broccoli','—',null,2,'cup',110,8,16,4,8,60,''),
  ('broccoli','Trader Joe''s','Organic Broccoli Florets','12 oz',2.49,2,'cup',110,8,16,4,8,60,''),
  ('broccoli','Target','Good & Gather Broccoli','12 oz',1.99,2,'cup',110,8,16,4,8,60,''),

  ('oats','Default','Generic steel-cut oats','—',null,0.5,'cup',150,5,27,2.5,4,0,''),
  ('oats','Whole Foods','365 Steel Cut Oats','24 oz',3.49,0.5,'cup',150,5,27,2.5,4,0,''),
  ('oats','Trader Joe''s','Steel Cut Oats','30 oz',3.99,0.5,'cup',150,5,27,2.5,4,0,''),

  ('berries','Default','Generic berries','—',null,0.5,'cup',40,0.5,10,0.3,4,0,''),
  ('berries','Trader Joe''s','Frozen Mixed Berries','16 oz',3.49,0.5,'cup',40,0.5,10,0.3,4,0,''),
  ('berries','Whole Foods','365 Organic Blueberries','10 oz',3.99,0.5,'cup',42,0.5,11,0.3,3.5,0,''),

  ('walnuts','Default','Generic walnuts','—',null,0.25,'cup',190,4,4,19,2,0,''),
  ('walnuts','Trader Joe''s','Walnut Halves & Pieces','16 oz',6.99,0.25,'cup',190,4,4,19,2,0,''),

  ('chia','Default','Generic chia seeds','—',null,3,'tbsp',180,6,16,12,14,5,''),
  ('chia','Whole Foods','365 Chia Seeds','12 oz',5.99,3,'tbsp',180,6,16,12,14,5,''),

  ('almondmilk','Default','Generic almond milk','—',null,1,'cup',30,1,1,2.5,1,170,''),
  ('almondmilk','Trader Joe''s','Unsweetened Almond Beverage','32 oz',2.49,1,'cup',30,1,1,2.5,1,150,''),

  ('cucumber','Default','Generic cucumber','—',null,2,'cup',30,1.4,7,0.2,2,4,''),
  ('cucumber','Garden','Home-grown cucumbers','from your garden',0,2,'cup',30,1.4,7,0.2,2,4,'Using your surplus'),
  ('cucumber','Whole Foods','Organic Cucumbers','each',0.99,2,'cup',30,1.4,7,0.2,2,4,''),

  ('whitebeans','Default','Generic white beans','—',null,1,'can',250,16,45,1,11,20,''),
  ('whitebeans','Trader Joe''s','Cannellini Beans','15 oz',1.29,1,'can',250,16,45,1,11,20,''),
  ('whitebeans','King Soopers','Simple Truth Organic Cannellini','15 oz',1.49,1,'can',250,16,45,1,11,20,''),

  ('dill','Default','Generic fresh dill','—',null,2,'tbsp',4,0.3,0.7,0,0.2,1,''),
  ('dill','Garden','Home-grown dill','from your garden',0,2,'tbsp',4,0.3,0.7,0,0.2,1,''),

  ('tofu','Default','Generic firm tofu','—',null,6,'oz',180,18,4,11,2,15,''),
  ('tofu','Trader Joe''s','Organic Firm Tofu','16 oz',1.99,6,'oz',180,18,4,11,2,15,''),
  ('tofu','Whole Foods','365 Organic Firm Tofu','14 oz',2.29,6,'oz',180,18,4,11,2,15,''),

  ('spinach','Default','Generic spinach','—',null,2,'cup',14,2,2,0,1.3,48,''),
  ('spinach','Target','Good & Gather Baby Spinach','10 oz',2.49,2,'cup',14,2,2,0,1.3,48,''),
  ('spinach','Whole Foods','Organic Baby Spinach','5 oz',2.99,2,'cup',14,2,2,0,1.3,48,''),

  ('tempeh','Default','Generic tempeh','—',null,1,'cup',320,31,16,18,14,15,''),
  ('tempeh','Whole Foods','Lightlife Organic Tempeh','8 oz',2.99,1,'cup',320,31,16,18,14,15,''),
  ('tempeh','King Soopers','Simple Truth Tempeh','8 oz',3.29,1,'cup',320,31,16,18,14,15,''),

  ('chickpeas','Default','Generic chickpeas','—',null,1,'can',270,15,45,4,12,30,''),
  ('chickpeas','Trader Joe''s','Garbanzo Beans','15 oz',1.19,1,'can',270,15,45,4,12,30,''),
  ('chickpeas','King Soopers','Simple Truth Organic Chickpeas','15 oz',1.39,1,'can',270,15,45,4,12,30,''),

  ('coconutmilk','Default','Generic light coconut milk','—',null,1,'cup',150,1.5,3,14,0,30,''),
  ('coconutmilk','Trader Joe''s','Light Coconut Milk','13.5 oz',1.49,1,'cup',150,1.5,3,14,0,30,''),
  ('coconutmilk','Whole Foods','365 Light Coconut Milk','13.5 oz',1.79,1,'cup',150,1.5,3,14,0,30,'')
) as v(ing_key, store, brand, size, price, serving_size, serving_unit, kcal, protein, carbs, fat, fiber, sodium, note)
join ingredient i on i.household_id = '11111111-1111-1111-1111-111111111111' and i.key = v.ing_key;

-- ── Recipes ────────────────────────────────────────────────────────────────
insert into recipe (household_id, slug, name, slot, prep_time, servings, img, vegan, tags, note) values
  ('11111111-1111-1111-1111-111111111111','bowl','Lentil & Kale Power Bowl','Lunch','25 min',2,'lentil bowl photo',false,
    array['High fiber','Plant protein','Folate'],
    'Fiber-forward with folate and plant protein — supports colon health and steady energy for a wt-loss day.'),
  ('11111111-1111-1111-1111-111111111111','salmon','Salmon, Quinoa & Roasted Broccoli','Dinner','30 min',2,'salmon plate photo',false,
    array['Omega-3','Cruciferous','High protein'],
    'Omega-3s for cognitive aging; cruciferous broccoli adds fiber and colon-protective compounds.'),
  ('11111111-1111-1111-1111-111111111111','oats','Steel-Cut Oats, Berries & Walnuts','Breakfast','15 min',1,'oatmeal bowl photo',false,
    array['Beta-glucan','Omega-3 (ALA)'],
    'Soluble beta-glucan fiber plus walnut ALA — a brain- and heart-friendly start.'),
  ('11111111-1111-1111-1111-111111111111','chia','Vanilla Chia Pudding','Snack','5 min + chill',1,'chia pudding photo',false,
    array['Fiber','Omega-3 (ALA)'],
    'A make-ahead snack delivering ~14g fiber to help you hit the daily 30g goal.'),
  ('11111111-1111-1111-1111-111111111111','cukesalad','Smashed Cucumber & White Bean Salad','Lunch','15 min',2,'cucumber salad photo',false,
    array['Garden cucumbers','High fiber','Plant protein'],
    'Built around your garden cucumbers — crunchy and hydrating, with white beans adding 12g fiber and plant protein to stay full on a rest day.'),
  ('11111111-1111-1111-1111-111111111111','tofuscramble','Turmeric Tofu Scramble','Breakfast','15 min',1,'tofu scramble photo',true,
    array['Vegan','High protein','Iron'],
    'A plant-based breakfast with 18g protein plus iron from tofu and spinach — fortify with nutritional yeast for B12.'),
  ('11111111-1111-1111-1111-111111111111','tempehbowl','Tempeh & Quinoa Green Bowl','Lunch','25 min',2,'tempeh bowl photo',true,
    array['Vegan','High fiber','Complete protein'],
    'Fermented tempeh gives complete plant protein and gut-friendly fiber over quinoa and kale.'),
  ('11111111-1111-1111-1111-111111111111','chickpeacurry','Chickpea & Spinach Coconut Curry','Dinner','30 min',2,'chickpea curry photo',true,
    array['Vegan','High fiber','Iron'],
    'Iron-rich chickpeas and spinach in a light coconut sauce — 12g fiber and hearty with no animal products.');

-- ── Recipe lines (ordered; quantity = the product serving so nutrition × qty/serving = 1) ──
insert into recipe_line (recipe_id, ingredient_id, quantity, unit, position)
select r.id, i.id, v.quantity, v.unit, v.position
from (values
  ('bowl','lentils',1,'cup',0),
  ('bowl','kale',2,'cup',1),
  ('bowl','quinoa',0.5,'cup',2),
  ('bowl','oliveoil',1,'tbsp',3),
  ('bowl','feta',0.25,'cup',4),
  ('bowl','lemon',1,'tbsp',5),
  ('bowl','cumin',0.5,'tsp',6),

  ('salmon','salmon',6,'oz',0),
  ('salmon','broccoli',2,'cup',1),
  ('salmon','quinoa',0.5,'cup',2),
  ('salmon','oliveoil',1,'tbsp',3),
  ('salmon','lemon',1,'tbsp',4),

  ('oats','oats',0.5,'cup',0),
  ('oats','berries',0.5,'cup',1),
  ('oats','walnuts',0.25,'cup',2),

  ('chia','chia',3,'tbsp',0),
  ('chia','almondmilk',1,'cup',1),

  ('cukesalad','cucumber',2,'cup',0),
  ('cukesalad','whitebeans',1,'can',1),
  ('cukesalad','feta',0.25,'cup',2),
  ('cukesalad','dill',2,'tbsp',3),
  ('cukesalad','oliveoil',1,'tbsp',4),
  ('cukesalad','lemon',1,'tbsp',5),

  ('tofuscramble','tofu',6,'oz',0),
  ('tofuscramble','spinach',2,'cup',1),
  ('tofuscramble','oliveoil',1,'tbsp',2),

  ('tempehbowl','tempeh',1,'cup',0),
  ('tempehbowl','quinoa',0.5,'cup',1),
  ('tempehbowl','kale',2,'cup',2),
  ('tempehbowl','oliveoil',1,'tbsp',3),
  ('tempehbowl','lemon',1,'tbsp',4),

  ('chickpeacurry','chickpeas',1,'can',0),
  ('chickpeacurry','coconutmilk',1,'cup',1),
  ('chickpeacurry','spinach',2,'cup',2),
  ('chickpeacurry','quinoa',0.5,'cup',3)
) as v(recipe_slug, ing_key, quantity, unit, position)
join recipe r     on r.household_id = '11111111-1111-1111-1111-111111111111' and r.slug = v.recipe_slug
join ingredient i on i.household_id = '11111111-1111-1111-1111-111111111111' and i.key  = v.ing_key;

-- ── Product selections (the prototype's default `selected` map) ─────────────
insert into product_selection (household_id, ingredient_id, product_id)
select '11111111-1111-1111-1111-111111111111', i.id, p.id
from (values
  ('lentils','Whole Foods'),
  ('kale','Target'),
  ('quinoa','Trader Joe''s'),
  ('feta','Whole Foods'),
  ('salmon','King Soopers'),
  ('broccoli','Trader Joe''s'),
  ('oats','Whole Foods'),
  ('berries','Trader Joe''s'),
  ('walnuts','Trader Joe''s'),
  ('chia','Whole Foods'),
  ('almondmilk','Trader Joe''s'),
  ('oliveoil','Trader Joe''s'),
  ('lemon','Whole Foods'),
  ('cucumber','Garden'),
  ('whitebeans','Trader Joe''s'),
  ('dill','Garden'),
  ('tofu','Trader Joe''s'),
  ('spinach','Target'),
  ('tempeh','Whole Foods'),
  ('chickpeas','Trader Joe''s'),
  ('coconutmilk','Trader Joe''s')
) as sel(ing_key, store)
join ingredient i on i.household_id = '11111111-1111-1111-1111-111111111111' and i.key = sel.ing_key
join product p    on p.ingredient_id = i.id and p.store = sel.store;

-- ── Sample day (defaultDay) for Thu 2026-06-18 — a run day for Spencer ──────
insert into moment (id, household_id, date, label, position, mode) values
  ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','2026-06-18','Breakfast',      0,'shared'),
  ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','2026-06-18','Morning snack',  1,'separate'),
  ('a0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','2026-06-18','Lunch',          2,'separate'),
  ('a0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','2026-06-18','Afternoon snack',3,'separate'),
  ('a0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','2026-06-18','Dinner',         4,'separate'),
  ('a0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','2026-06-18','Evening snack',  5,'shared');

-- One row per participant; a skipped person simply has no row.
insert into moment_assignment (moment_id, member_id, recipe_id, servings)
select v.moment_id::uuid, v.member_id::uuid, r.id, 1
from (values
  ('a0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','oats'),          -- Breakfast (shared)
  ('a0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','oats'),
  ('a0000000-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','chia'),          -- Morning snack (Jacq only)
  ('a0000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','bowl'),          -- Lunch
  ('a0000000-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','tempehbowl'),
  ('a0000000-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','chia'),          -- Afternoon snack (Jacq only)
  ('a0000000-0000-0000-0000-000000000005','22222222-2222-2222-2222-222222222222','salmon'),        -- Dinner
  ('a0000000-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','chickpeacurry'),
  ('a0000000-0000-0000-0000-000000000006','22222222-2222-2222-2222-222222222222','chia'),          -- Evening snack (shared)
  ('a0000000-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333','chia')
) as v(moment_id, member_id, recipe_slug)
join recipe r on r.household_id = '11111111-1111-1111-1111-111111111111' and r.slug = v.recipe_slug;

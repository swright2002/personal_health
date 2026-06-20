-- Harbor — recipe import readiness (M2.5).
-- Provenance + cached per-serving nutrition on `recipe`, and a looser
-- `recipe_line` so imported recipes can store raw lines before they're resolved
-- to ingredients/products. Additive — the existing seed keeps working (it's
-- backfilled to source_type='seed' with its computed nutrition cached below).

alter table recipe
  add column source_type text not null default 'manual'
    check (source_type in ('manual','url_import','photo_import','seed','licensed_pack')),
  add column source_url text,            -- citation / link-back for URL imports
  add column source_attribution text,    -- site name, or "From <Book>, p.NN"
  add column nutrition_source text check (nutrition_source in ('imported','computed')),
  add column kcal numeric,               -- cached per-serving nutrition
  add column protein numeric,
  add column carbs numeric,
  add column fat numeric,
  add column fiber numeric,
  add column sodium numeric;

alter table recipe_line
  add column raw_text text,               -- the verbatim ingredient line
  add column name text,                   -- parsed ingredient name (later)
  add column note text,                   -- prep note ("minced", "divided")
  add column group_heading text;          -- "For the sauce", etc.
alter table recipe_line alter column ingredient_id drop not null;
alter table recipe_line alter column quantity drop not null;
alter table recipe_line alter column unit drop not null;
alter table recipe_line drop constraint if exists recipe_line_recipe_id_ingredient_id_key;

-- Backfill the prototype seed: mark as 'seed' and cache its computed per-serving
-- nutrition, so every recipe (seed + imported) has display nutrition.
update recipe set source_type = 'seed' where source_type = 'manual';

with rn as (
  select r.id,
         sum(p.kcal    * rl.quantity / nullif(p.serving_size,0)) / r.servings as kcal,
         sum(p.protein * rl.quantity / nullif(p.serving_size,0)) / r.servings as protein,
         sum(p.carbs   * rl.quantity / nullif(p.serving_size,0)) / r.servings as carbs,
         sum(p.fat     * rl.quantity / nullif(p.serving_size,0)) / r.servings as fat,
         sum(p.fiber   * rl.quantity / nullif(p.serving_size,0)) / r.servings as fiber,
         sum(p.sodium  * rl.quantity / nullif(p.serving_size,0)) / r.servings as sodium
  from recipe r
  join recipe_line rl on rl.recipe_id = r.id
  join product_selection ps on ps.household_id = r.household_id and ps.ingredient_id = rl.ingredient_id
  join product p on p.id = ps.product_id
  group by r.id, r.servings
)
update recipe set
  kcal = round(rn.kcal), protein = round(rn.protein), carbs = round(rn.carbs),
  fat = round(rn.fat), fiber = round(rn.fiber, 1), sodium = round(rn.sodium),
  nutrition_source = 'computed'
from rn where recipe.id = rn.id;

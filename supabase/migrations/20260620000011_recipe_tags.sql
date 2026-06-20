-- Recipe-level diet/allergen + health-pattern tags (planner Phase 1).
-- diet_level/diet_status/allergens mirror the product model so the planner can
-- safely auto-pick per member (Jacq vegan). health_tags map recipes to the food
-- patterns a dietitian prescribes (fatty fish 2x/wk, cruciferous daily, limit
-- red meat, fiber from whole grains/legumes, etc.).
alter table recipe
  add column diet_level  smallint check (diet_level between 0 and 3),
  add column diet_status text check (diet_status in ('confirmed', 'derived', 'maybe', 'unknown')),
  add column allergens   text[] not null default '{}',
  add column health_tags text[] not null default '{}';

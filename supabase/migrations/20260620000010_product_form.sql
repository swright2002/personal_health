-- Cooked/dry form on products, so the picker can show it and a future Plan layer
-- can reason about it. The engine detects the form from the product name/category
-- at resolution time; ranking prefers a product whose form matches the recipe's
-- ingredient (cooked-for-cooked), which keeps per-100g nutrition on the right basis.
alter table product add column form text check (form in ('cooked', 'canned', 'dry', 'raw'));

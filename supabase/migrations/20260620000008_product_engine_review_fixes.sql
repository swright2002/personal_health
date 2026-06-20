-- Adversarial-review fixes for feature A that need DDL.

-- 1) Reference tables are read-only at runtime; revoke the write privileges they
--    inherited from the 0003 default-privilege grant so a future permissive write
--    policy can't make the safety dictionary user-writable (service_role keeps all).
revoke insert, update, delete on allergen, food_term from authenticated;

-- 2) recipe_line_product: its PK (recipe_line_id, member_id) forces member_id NOT
--    NULL, so the documented recipe-WIDE override (member_id null) was unconstructible.
--    Mirror product_selection: drop the PK, enforce uniqueness with partial indexes.
alter table recipe_line_product drop constraint recipe_line_product_pkey;
create unique index recipe_line_product_recipe_wide_idx
  on recipe_line_product (recipe_line_id) where member_id is null;
create unique index recipe_line_product_member_idx
  on recipe_line_product (recipe_line_id, member_id) where member_id is not null;

-- Fitness Tracker: meal aggregates
-- Lets a meal_preset (a saved "meal" made of multiple foods) be logged as a
-- single food_logs row instead of exploding into one row per ingredient.
-- Each meal_preset gets its own synthetic `foods` row (source = 'meal') whose
-- macros are the sum of its items at 1 serving (serving_size = 100,
-- serving_unit = 'piece'), so the existing macrosForQuantity()/food_logs
-- machinery works unchanged and the meal can still be scaled (0.5x, 2x, ...)
-- like any other logged food.

alter table foods drop constraint if exists foods_source_check;
alter table foods add constraint foods_source_check check (source in ('off', 'usda', 'manual', 'meal'));

alter table meal_presets add column if not exists food_id uuid references foods(id) on delete set null;

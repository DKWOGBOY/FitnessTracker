-- Fitness Tracker: recipe servings
-- A meal preset can now say how many servings it yields (e.g. a soup recipe
-- that makes 6 servings), so logging "1 serving" divides the recipe's total
-- macros by that count instead of always logging the whole batch as "1
-- meal". Existing presets default to 1 serving (today's exact behavior).

alter table meal_presets add column if not exists servings_count numeric not null default 1;

-- Fitness Tracker: switch food-search API provider to CalorieAPI
-- Open Food Facts and USDA are replaced as live search sources by a single
-- CalorieAPI integration (see calorieapi-integration-spec.md) - existing
-- foods already imported from 'off'/'usda' keep that source value (nothing
-- migrates or re-fetches them), new imports use 'calorieapi' instead.

alter table foods drop constraint if exists foods_source_check;
alter table foods add constraint foods_source_check
  check (source in ('off', 'usda', 'calorieapi', 'manual', 'meal'));

alter table foods add column if not exists is_verified boolean not null default false;

-- Fitness Tracker: Recipes tab (Spoonacular)
-- A recipe is logged the same way a meal preset's aggregate is: a cached
-- `foods` row (source='spoonacular', source_id=Spoonacular's recipe id)
-- with a single "1 serving" food_servings row (grams_equivalent=100, same
-- trick meal presets already use) - so logging a recipe reuses all the
-- existing serving/quantity/macro machinery with no schema changes to
-- food_logs. `recipes` itself just caches what the Spoonacular API
-- returned (for the tab's own browsing/detail/favorites UI) and links to
-- that food row once one has been created, lazily, only when first logged.

alter table foods drop constraint if exists foods_source_check;
alter table foods add constraint foods_source_check
  check (source in ('off', 'usda', 'calorieapi', 'spoonacular', 'manual', 'meal'));

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_id text not null,
  title text not null,
  image_url text,
  servings numeric,
  ready_in_minutes numeric,
  calories_per_serving numeric not null default 0,
  protein_g_per_serving numeric not null default 0,
  carbs_g_per_serving numeric not null default 0,
  fat_g_per_serving numeric not null default 0,
  fiber_g_per_serving numeric,
  sugar_g_per_serving numeric,
  sodium_mg_per_serving numeric,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  food_id uuid references foods(id) on delete set null,
  cached_at timestamptz not null default now()
);

create unique index if not exists recipes_user_source_idx on recipes(user_id, source_id);
create index if not exists recipes_user_id_idx on recipes(user_id);

alter table recipes enable row level security;

drop policy if exists "recipes_select_own" on recipes;
drop policy if exists "recipes_insert_own" on recipes;
drop policy if exists "recipes_update_own" on recipes;
drop policy if exists "recipes_delete_own" on recipes;

create policy "recipes_select_own" on recipes for select using (user_id = auth.uid());
create policy "recipes_insert_own" on recipes for insert with check (user_id = auth.uid());
create policy "recipes_update_own" on recipes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recipes_delete_own" on recipes for delete using (user_id = auth.uid());

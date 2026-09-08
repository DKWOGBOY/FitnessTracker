-- Fitness Tracker: serving-size model
-- Replaces foods.serving_size/serving_unit with a proper per-food list of
-- named servings (each with its own gram/ml equivalent), so e.g. rice can be
-- logged in cups OR grams while chicken stays in grams. See the "Serving
-- Size Model" spec addendum.

create table if not exists food_servings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_id uuid not null references foods(id) on delete cascade,
  label text not null,
  grams_equivalent numeric not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists food_servings_food_id_idx on food_servings(food_id);
create index if not exists food_servings_user_id_idx on food_servings(user_id);

alter table food_servings enable row level security;

create policy "food_servings_select_own" on food_servings for select using (user_id = auth.uid());
create policy "food_servings_insert_own" on food_servings for insert with check (user_id = auth.uid());
create policy "food_servings_update_own" on food_servings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "food_servings_delete_own" on food_servings for delete using (user_id = auth.uid());

-- Give every existing food a default 100-unit serving before dropping the
-- old per-food serving_size/serving_unit columns. Per product decision,
-- this does NOT try to preserve each food's old custom serving_size as its
-- own row - historical food_logs quantities may recompute to slightly
-- different totals after this migration, which is an accepted tradeoff.
insert into food_servings (food_id, user_id, label, grams_equivalent, is_default)
select
  f.id,
  f.user_id,
  case when f.serving_unit = 'ml' then '100 ml' else '100 g' end,
  100,
  true
from foods f
where not exists (select 1 from food_servings fs where fs.food_id = f.id);

-- foods: serving_unit becomes the food's base measurement unit (g or ml)
-- rather than a display serving; serving_size is fully replaced by
-- food_servings.grams_equivalent.
alter table foods rename column serving_unit to base_unit;
alter table foods drop constraint if exists foods_serving_unit_check;
update foods set base_unit = 'g' where base_unit not in ('g', 'ml');
alter table foods add constraint foods_base_unit_check check (base_unit in ('g', 'ml'));
alter table foods drop column if exists serving_size;

-- food_logs: which serving was used for this entry (nullable - if null,
-- app code treats it as a plain 100-unit multiplier).
alter table food_logs add column if not exists serving_id uuid references food_servings(id) on delete set null;

-- meal_preset_items: same, each ingredient line needs to know its serving.
alter table meal_preset_items add column if not exists serving_id uuid references food_servings(id) on delete set null;

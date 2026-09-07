-- Fitness Tracker: initial schema
-- All tables are scoped to auth.uid() via RLS from the moment they are created.

create extension if not exists pgcrypto;

-- foods ----------------------------------------------------------------

create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  serving_size numeric not null default 100,
  serving_unit text not null default 'g' check (serving_unit in ('g', 'ml', 'oz', 'piece')),
  source text not null default 'manual' check (source in ('off', 'usda', 'manual')),
  source_id text,
  is_frequent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists foods_user_id_idx on foods(user_id);
create index if not exists foods_name_idx on foods using gin (to_tsvector('simple', name));
create unique index if not exists foods_source_dedup_idx
  on foods(user_id, source, source_id)
  where source_id is not null;

alter table foods enable row level security;

create policy "foods_select_own" on foods for select using (user_id = auth.uid());
create policy "foods_insert_own" on foods for insert with check (user_id = auth.uid());
create policy "foods_update_own" on foods for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "foods_delete_own" on foods for delete using (user_id = auth.uid());

-- food_logs --------------------------------------------------------------

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_id uuid not null references foods(id) on delete cascade,
  log_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  quantity numeric not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_id_idx on food_logs(user_id);
create index if not exists food_logs_log_date_idx on food_logs(log_date);

alter table food_logs enable row level security;

create policy "food_logs_select_own" on food_logs for select using (user_id = auth.uid());
create policy "food_logs_insert_own" on food_logs for insert with check (user_id = auth.uid());
create policy "food_logs_update_own" on food_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "food_logs_delete_own" on food_logs for delete using (user_id = auth.uid());

-- weight_logs --------------------------------------------------------------

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric not null,
  notes text
);

create index if not exists weight_logs_user_id_idx on weight_logs(user_id);
create index if not exists weight_logs_log_date_idx on weight_logs(log_date);

alter table weight_logs enable row level security;

create policy "weight_logs_select_own" on weight_logs for select using (user_id = auth.uid());
create policy "weight_logs_insert_own" on weight_logs for insert with check (user_id = auth.uid());
create policy "weight_logs_update_own" on weight_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "weight_logs_delete_own" on weight_logs for delete using (user_id = auth.uid());

-- targets --------------------------------------------------------------

create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  effective_date date not null,
  calories numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null
);

create index if not exists targets_user_id_idx on targets(user_id);
create index if not exists targets_effective_date_idx on targets(effective_date);

alter table targets enable row level security;

create policy "targets_select_own" on targets for select using (user_id = auth.uid());
create policy "targets_insert_own" on targets for insert with check (user_id = auth.uid());
create policy "targets_update_own" on targets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "targets_delete_own" on targets for delete using (user_id = auth.uid());

-- meal_presets & meal_preset_items ------------------------------------------

create table if not exists meal_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  default_meal text not null check (default_meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now()
);

create index if not exists meal_presets_user_id_idx on meal_presets(user_id);

alter table meal_presets enable row level security;

create policy "meal_presets_select_own" on meal_presets for select using (user_id = auth.uid());
create policy "meal_presets_insert_own" on meal_presets for insert with check (user_id = auth.uid());
create policy "meal_presets_update_own" on meal_presets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meal_presets_delete_own" on meal_presets for delete using (user_id = auth.uid());

create table if not exists meal_preset_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  preset_id uuid not null references meal_presets(id) on delete cascade,
  food_id uuid not null references foods(id) on delete cascade,
  quantity numeric not null default 1
);

create index if not exists meal_preset_items_user_id_idx on meal_preset_items(user_id);
create index if not exists meal_preset_items_preset_id_idx on meal_preset_items(preset_id);

alter table meal_preset_items enable row level security;

create policy "meal_preset_items_select_own" on meal_preset_items for select using (user_id = auth.uid());
create policy "meal_preset_items_insert_own" on meal_preset_items for insert with check (user_id = auth.uid());
create policy "meal_preset_items_update_own" on meal_preset_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meal_preset_items_delete_own" on meal_preset_items for delete using (user_id = auth.uid());

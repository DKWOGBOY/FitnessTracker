-- Fitness Tracker: per-user settings
-- Single row per user. Starts with just the weigh-in reminder threshold -
-- needs to live server-side (not localStorage, like the water target) since
-- the scheduled push-notification function reads it with no browser/user
-- session available.

create table if not exists user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  weigh_in_reminder_days integer not null default 7,
  created_at timestamptz not null default now()
);

alter table user_settings enable row level security;

drop policy if exists "user_settings_select_own" on user_settings;
drop policy if exists "user_settings_insert_own" on user_settings;
drop policy if exists "user_settings_update_own" on user_settings;
drop policy if exists "user_settings_delete_own" on user_settings;

create policy "user_settings_select_own" on user_settings for select using (user_id = auth.uid());
create policy "user_settings_insert_own" on user_settings for insert with check (user_id = auth.uid());
create policy "user_settings_update_own" on user_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_settings_delete_own" on user_settings for delete using (user_id = auth.uid());

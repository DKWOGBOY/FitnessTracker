-- Fitness Tracker: water tracking
-- One row per user per day; the Log tab's water bar upserts this directly
-- (drag = set the day's total litres), rather than accumulating discrete
-- entries like food_logs does.

create table if not exists water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date date not null,
  litres numeric not null default 0,
  unique (user_id, log_date)
);

create index if not exists water_logs_user_id_idx on water_logs(user_id);
create index if not exists water_logs_log_date_idx on water_logs(log_date);

alter table water_logs enable row level security;

create policy "water_logs_select_own" on water_logs for select using (user_id = auth.uid());
create policy "water_logs_insert_own" on water_logs for insert with check (user_id = auth.uid());
create policy "water_logs_update_own" on water_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "water_logs_delete_own" on water_logs for delete using (user_id = auth.uid());

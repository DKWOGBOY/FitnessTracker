-- Fitness Tracker: push notifications (weigh-in reminder)
-- One row per browser/device subscription (a user could have several - phone
-- + desktop). `last_reminder_sent_date` guards against re-notifying every
-- time the scheduled check runs while someone stays overdue - it only nags
-- again once a further REMIND_AFTER_DAYS has passed since the last nudge.
--
-- The scheduled Netlify function that reads across every user's rows uses
-- the service-role key (bypasses RLS by design, same as any other trusted
-- server-side job) - these policies only govern the client's own access.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  last_reminder_sent_date date,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on push_subscriptions;
drop policy if exists "push_subscriptions_update_own" on push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on push_subscriptions;

create policy "push_subscriptions_select_own" on push_subscriptions for select using (user_id = auth.uid());
create policy "push_subscriptions_insert_own" on push_subscriptions for insert with check (user_id = auth.uid());
create policy "push_subscriptions_update_own" on push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_subscriptions_delete_own" on push_subscriptions for delete using (user_id = auth.uid());

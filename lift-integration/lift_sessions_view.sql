-- Run this against LIFT's Supabase project (mywjrpuixxkdttmekhlq), NOT
-- biteTrack's project. It's kept outside supabase/migrations/ specifically
-- so `supabase db push` for biteTrack never tries to apply it here.
--
-- LIFT stores its entire app state as one jsonb blob per user in `lift_data`
-- (columns: user_id, state, updated_at) - there's no per-session table to
-- query directly. This view unnests state->'sessions' into rows so
-- biteTrack can read it as a normal table via PostgREST.
--
-- UPDATED: now that LIFT has multiple real users, this view uses
-- `security_invoker = true` (Postgres 15+) so it runs with the PERMISSIONS
-- OF WHOEVER IS QUERYING IT, not the view's owner - meaning lift_data's own
-- row-level security (assumed to be `user_id = auth.uid()`, the normal
-- Supabase pattern) applies exactly as it would for a direct query. Combined
-- with biteTrack now signing in to a real LIFT user session (Settings ->
-- LIFT account) before querying, each person only ever sees their own rows.
--
-- Requirement: lift_data must already have RLS enabled with a policy like
--   create policy "lift_data_select_own" on lift_data for select
--   using (user_id = auth.uid());
-- If that policy doesn't exist yet, add it first - without it, either
-- nobody can read anything (RLS enabled, no policy) or everyone can read
-- everything (RLS disabled), and this view can't fix that on its own.

-- UPDATED: LIFT now records running-specific detail (distance, moving/
-- elapsed time, avg heart rate) on cardio sessions. The JSON key names
-- below (distanceKm, movingTime, elapsedTime, avgHr) are a best guess
-- following this view's existing camelCase convention (dayName, activity,
-- duration, effort) - CONFIRM THEM against LIFT's actual session object
-- shape and fix the `s.value ->> '...'` keys below if they differ before
-- applying this. Units assumed: distance in km, times in minutes, heart
-- rate in bpm - adjust the numeric conversion if LIFT stores them
-- differently (e.g. seconds instead of minutes).
create or replace view public.lift_sessions_for_bitetrack
with (security_invoker = true) as
select
  s.value ->> 'id' as id,
  (s.value ->> 'date')::timestamptz as session_at,
  coalesce(s.value ->> 'type', 'strength') as session_type,
  s.value ->> 'dayName' as day_name,
  s.value ->> 'activity' as cardio_activity,
  nullif(s.value ->> 'duration', '')::numeric as duration_minutes,
  nullif(s.value ->> 'effort', '')::numeric as cardio_effort,
  s.value -> 'exercises' as exercises,
  nullif(s.value ->> 'distanceKm', '')::numeric as distance_km,
  nullif(s.value ->> 'movingTime', '')::numeric as moving_time_minutes,
  nullif(s.value ->> 'elapsedTime', '')::numeric as elapsed_time_minutes,
  nullif(s.value ->> 'avgHr', '')::numeric as avg_heart_rate_bpm,
  lift_data.user_id
from lift_data
cross join lateral jsonb_array_elements(coalesce(lift_data.state -> 'sessions', '[]'::jsonb)) as s(value);

grant select on public.lift_sessions_for_bitetrack to authenticated;

-- Revoke the old anon grant from the first version of this view (it's no
-- longer needed now that biteTrack authenticates as a real LIFT user, and
-- anon has no auth.uid() to match RLS against anyway, but no reason to
-- leave the grant lying around).
revoke select on public.lift_sessions_for_bitetrack from anon;

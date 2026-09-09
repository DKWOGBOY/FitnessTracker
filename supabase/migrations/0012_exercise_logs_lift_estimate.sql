-- Fitness Tracker: automatic calorie-burn estimate from LIFT sessions
-- `source` distinguishes a manually-typed entry from one this app derived
-- itself from a connected LIFT workout (MET-based estimate - LIFT has no
-- calorie tracking of its own). `lift_session_id` is LIFT's session id
-- (a separate Supabase project, so this is just a text reference, not an
-- FK) - the unique index lets the client upsert-by-session instead of
-- inserting a duplicate every time the estimate is recomputed.

alter table exercise_logs add column if not exists source text not null default 'manual' check (source in ('manual', 'lift_estimate'));
alter table exercise_logs add column if not exists lift_session_id text;

create unique index if not exists exercise_logs_lift_session_idx
  on exercise_logs(user_id, lift_session_id)
  where lift_session_id is not null;

-- Fitness Tracker: fix the LIFT-estimate upsert conflict target
-- 0012's unique index was partial (`where lift_session_id is not null`),
-- but Postgres can only match ON CONFLICT (user_id, lift_session_id) against
-- a partial index if the same predicate is repeated in the ON CONFLICT
-- clause itself - and PostgREST's upsert (what the client's .upsert() call
-- generates) doesn't do that, so every upsert failed with "no unique or
-- exclusion constraint matching the ON CONFLICT specification". A plain
-- (non-partial) unique index works instead: Postgres never treats two NULLs
-- as conflicting, so manual entries (lift_session_id = null) still never
-- collide with each other.

drop index if exists exercise_logs_lift_session_idx;

create unique index if not exists exercise_logs_lift_session_idx
  on exercise_logs(user_id, lift_session_id);

-- Fitness Tracker: exercise calories burned
-- Manual, standalone log of "I did X and it burned Y kcal" - independent of
-- the read-only LIFT integration (which has no calorie estimate of its own).
-- Multiple entries per day, like food_logs, since someone might log a walk
-- and a gym session on the same day.

create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date date not null,
  name text not null,
  calories_burned numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists exercise_logs_user_id_idx on exercise_logs(user_id);
create index if not exists exercise_logs_log_date_idx on exercise_logs(log_date);

alter table exercise_logs enable row level security;

drop policy if exists "exercise_logs_select_own" on exercise_logs;
drop policy if exists "exercise_logs_insert_own" on exercise_logs;
drop policy if exists "exercise_logs_update_own" on exercise_logs;
drop policy if exists "exercise_logs_delete_own" on exercise_logs;

create policy "exercise_logs_select_own" on exercise_logs for select using (user_id = auth.uid());
create policy "exercise_logs_insert_own" on exercise_logs for insert with check (user_id = auth.uid());
create policy "exercise_logs_update_own" on exercise_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exercise_logs_delete_own" on exercise_logs for delete using (user_id = auth.uid());

-- Extend the Log page's single-round-trip RPC (0005) to include today's
-- exercise logs alongside everything else it already bundles.
create or replace function get_log_page_data(p_date date, p_streak_start date)
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'foods', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.name)
      from foods f
      where f.source <> 'meal'
    ), '[]'::jsonb),

    'food_servings', coalesce((
      select jsonb_agg(to_jsonb(s))
      from food_servings s
    ), '[]'::jsonb),

    'food_logs', coalesce((
      select jsonb_agg(
        to_jsonb(l) || jsonb_build_object('food', to_jsonb(f), 'serving', to_jsonb(sv))
        order by l.created_at
      )
      from food_logs l
      join foods f on f.id = l.food_id
      left join food_servings sv on sv.id = l.serving_id
      where l.log_date = p_date
    ), '[]'::jsonb),

    'targets', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.effective_date)
      from targets t
    ), '[]'::jsonb),

    'meal_presets', coalesce((
      select jsonb_agg(
        to_jsonb(mp) || jsonb_build_object(
          'food', to_jsonb(mf),
          'items', coalesce((
            select jsonb_agg(
              to_jsonb(mpi) || jsonb_build_object('food', to_jsonb(itf), 'serving', to_jsonb(itsv))
            )
            from meal_preset_items mpi
            join foods itf on itf.id = mpi.food_id
            left join food_servings itsv on itsv.id = mpi.serving_id
            where mpi.preset_id = mp.id
          ), '[]'::jsonb)
        )
        order by mp.created_at desc
      )
      from meal_presets mp
      left join foods mf on mf.id = mp.food_id
    ), '[]'::jsonb),

    'exercise_logs', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at)
      from exercise_logs e
      where e.log_date = p_date
    ), '[]'::jsonb),

    'streak_food_dates', coalesce((
      select jsonb_agg(distinct fl.log_date)
      from food_logs fl
      where fl.log_date >= p_streak_start
    ), '[]'::jsonb),

    'streak_weight_dates', coalesce((
      select jsonb_agg(distinct wl.log_date)
      from weight_logs wl
      where wl.log_date >= p_streak_start
    ), '[]'::jsonb),

    'water_litres', coalesce((
      select wl.litres
      from water_logs wl
      where wl.log_date = p_date
      limit 1
    ), 0)
  );
$$;

grant execute on function get_log_page_data(date, date) to authenticated;

-- Fitness Tracker: Log page single-round-trip data function
-- The Log page's first load was firing 8 separate parallel REST requests
-- (foods, food_servings, food_logs, targets, meal_presets, food_logs +
-- weight_logs for the streak lookback, water_logs), each paying its own
-- network round-trip cost even though the payloads are tiny. This bundles
-- all of it into one RPC call so the page waits on one request instead of
-- the slowest of eight.
--
-- security invoker (the default) means this runs with the caller's role,
-- so every table's existing RLS "select own rows" policy still applies
-- exactly as it would for a direct query - this function does not bypass
-- row-level security.

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

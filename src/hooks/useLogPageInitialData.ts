import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { shiftDate, todayStr } from "../lib/dates";
import type { Food, FoodLogWithFood, FoodServing, MealPresetWithItems, Target } from "../lib/types";

export interface LogPageInitialData {
  foods: Food[];
  servings: FoodServing[];
  logs: FoodLogWithFood[];
  targets: Target[];
  presets: MealPresetWithItems[];
  streakFoodDates: string[];
  streakWeightDates: string[];
  waterLitres: number;
}

interface LogPageRpcRow {
  foods: Food[];
  food_servings: FoodServing[];
  food_logs: FoodLogWithFood[];
  targets: Target[];
  meal_presets: MealPresetWithItems[];
  streak_food_dates: string[];
  streak_weight_dates: string[];
  water_litres: number;
}

/**
 * One RPC round trip that seeds every hook the Log page needs on first
 * mount (foods, servings, today's logs, targets, meal presets, streak date
 * sets, water), instead of 8 separate parallel requests each paying their
 * own network round-trip cost. Fetched exactly once - date navigation
 * afterward is handled by each hook's own normal per-date refetch.
 */
export function useLogPageInitialData(date: string) {
  const [data, setData] = useState<LogPageInitialData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedOnce = useRef(false);

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    const streakStart = shiftDate(todayStr(), -400);
    supabase
      .rpc("get_log_page_data", { p_date: date, p_streak_start: streakStart })
      .then(({ data: row, error: err }) => {
        if (err) {
          setError(err.message);
          return;
        }
        const r = row as unknown as LogPageRpcRow;
        setData({
          foods: r.foods,
          servings: r.food_servings,
          logs: r.food_logs,
          targets: r.targets,
          presets: r.meal_presets,
          streakFoodDates: r.streak_food_dates,
          streakWeightDates: r.streak_weight_dates,
          waterLitres: r.water_litres,
        });
      });
  }, [date]);

  return { data, loading: !data && !error, error };
}

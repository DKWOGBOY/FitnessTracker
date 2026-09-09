import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { MEALS, macrosForLog, sumMacros, type Food, type FoodServing, type Macros, type Meal } from "../lib/types";

const ZERO_MACROS: Macros = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
};

/**
 * Aggregates every food_logs row between fromDate and toDate (inclusive)
 * into totals across the whole range and a per-meal breakdown (for the
 * calories detail pie chart) - one query instead of re-deriving each view
 * separately.
 */
export function useLogAggregates(fromDate: string, toDate: string) {
  const [totals, setTotals] = useState<Macros>(ZERO_MACROS);
  const [byMeal, setByMeal] = useState<Record<Meal, Macros>>(() => {
    const init = {} as Record<Meal, Macros>;
    for (const m of MEALS) init[m] = ZERO_MACROS;
    return init;
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("food_logs")
        .select("meal, quantity, food:foods(*), serving:food_servings(*)")
        .gte("log_date", fromDate)
        .lte("log_date", toDate);

      const rows = (data ?? []) as unknown as {
        meal: Meal;
        quantity: number;
        food: Food;
        serving: FoodServing | null;
      }[];

      const mealAcc = {} as Record<Meal, Macros>;
      for (const m of MEALS) mealAcc[m] = ZERO_MACROS;
      let totalAcc = ZERO_MACROS;

      for (const row of rows) {
        if (!row.food) continue;
        const m = macrosForLog(row);
        mealAcc[row.meal] = sumMacros([mealAcc[row.meal], m]);
        totalAcc = sumMacros([totalAcc, m]);
      }

      setTotals(totalAcc);
      setByMeal(mealAcc);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { totals, byMeal, loading, refresh };
}

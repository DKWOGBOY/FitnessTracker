import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { macrosForLog, type Food, type FoodServing, type Macros } from "../lib/types";

export interface DayMacros extends Macros {
  date: string;
}

export function useFoodLogsRange(fromDate: string | null) {
  const [days, setDays] = useState<DayMacros[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("food_logs")
        .select("log_date, quantity, food:foods(*), serving:food_servings(*)")
        .order("log_date", { ascending: true });
      if (fromDate) query = query.gte("log_date", fromDate);
      const { data } = await query;

      const byDate = new Map<string, Macros>();
      for (const row of (data ?? []) as unknown as {
        log_date: string;
        quantity: number;
        food: Food;
        serving: FoodServing | null;
      }[]) {
        const m = macrosForLog(row);
        const existing = byDate.get(row.log_date) ?? {
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 0,
        };
        byDate.set(row.log_date, {
          calories: existing.calories + m.calories,
          protein_g: existing.protein_g + m.protein_g,
          carbs_g: existing.carbs_g + m.carbs_g,
          fat_g: existing.fat_g + m.fat_g,
          fiber_g: existing.fiber_g + m.fiber_g,
          sugar_g: existing.sugar_g + m.sugar_g,
          sodium_mg: existing.sodium_mg + m.sodium_mg,
        });
      }

      const result = Array.from(byDate.entries())
        .map(([date, m]) => ({ date, ...m }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDays(result);
    } finally {
      setLoading(false);
    }
  }, [fromDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { days, loading, refresh };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Food } from "../lib/types";

export interface FoodHistoryEntry {
  food: Food;
  count: number;
  lastQuantity: number;
  lastLoggedAt: string;
}

const HISTORY_SCAN_LIMIT = 500;
const HISTORY_RESULT_LIMIT = 30;

export function useFoodLogHistory() {
  const [entries, setEntries] = useState<FoodHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("food_logs")
        .select("food_id, quantity, created_at, food:foods(*)")
        .order("created_at", { ascending: false })
        .limit(HISTORY_SCAN_LIMIT);

      const byFood = new Map<string, FoodHistoryEntry>();
      for (const row of (data ?? []) as unknown as {
        food_id: string;
        quantity: number;
        created_at: string;
        food: Food | null;
      }[]) {
        if (!row.food) continue;
        const existing = byFood.get(row.food_id);
        if (existing) {
          existing.count += 1;
        } else {
          byFood.set(row.food_id, {
            food: row.food,
            count: 1,
            lastQuantity: row.quantity,
            lastLoggedAt: row.created_at,
          });
        }
      }

      const result = Array.from(byFood.values()).sort(
        (a, b) => b.count - a.count || b.lastLoggedAt.localeCompare(a.lastLoggedAt),
      );
      setEntries(result.slice(0, HISTORY_RESULT_LIMIT));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}

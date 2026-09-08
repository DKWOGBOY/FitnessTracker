import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { FoodLogWithFood, Meal } from "../lib/types";

const SELECT = "*, food:foods(*), serving:food_servings(*)";

/** `seedLogs`, when provided, is already-fetched data for this exact date
 * (e.g. from the Log page's single consolidated RPC) - the hook skips its
 * own initial fetch for that first date and uses it directly. Any later
 * date change still refetches normally. */
export function useFoodLogs(date: string, seedLogs?: FoodLogWithFood[]) {
  const [logs, setLogs] = useState<FoodLogWithFood[]>(seedLogs ?? []);
  const [loading, setLoading] = useState(!seedLogs);
  const [error, setError] = useState<string | null>(null);
  const skipNextFetch = useRef(!!seedLogs);

  const refresh = useCallback(async () => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("food_logs")
        .select(SELECT)
        .eq("log_date", date)
        .order("created_at", { ascending: true });
      if (err) setError(err.message);
      else setLogs((data ?? []) as unknown as FoodLogWithFood[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load food logs.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addLog(foodId: string, meal: Meal, quantity: number, servingId: string | null) {
    // user_id defaults to auth.uid() server-side - no need to fetch/send it.
    const { data, error: err } = await supabase
      .from("food_logs")
      .insert({ food_id: foodId, log_date: date, meal, quantity, serving_id: servingId })
      .select(SELECT)
      .single();
    if (err) throw err;
    setLogs((prev) => [...prev, data as unknown as FoodLogWithFood]);
  }

  async function updateLog(
    id: string,
    changes: { quantity?: number; meal?: Meal; created_at?: string; serving_id?: string | null },
  ) {
    const { data, error: err } = await supabase
      .from("food_logs")
      .update(changes)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (err) throw err;
    setLogs((prev) => prev.map((l) => (l.id === id ? (data as unknown as FoodLogWithFood) : l)));
  }

  async function deleteLog(id: string) {
    const { error: err } = await supabase.from("food_logs").delete().eq("id", id);
    if (err) throw err;
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  return { logs, loading, error, refresh, addLog, updateLog, deleteLog };
}

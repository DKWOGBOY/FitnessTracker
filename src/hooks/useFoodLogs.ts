import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { FoodLogWithFood, Meal } from "../lib/types";

export function useFoodLogs(date: string) {
  const [logs, setLogs] = useState<FoodLogWithFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("food_logs")
        .select("*, food:foods(*)")
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

  async function addLog(foodId: string, meal: Meal, quantity: number) {
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("food_logs").insert({
      food_id: foodId,
      log_date: date,
      meal,
      quantity,
      user_id: userData.user?.id,
    });
    if (err) throw err;
    await refresh();
  }

  async function updateLog(id: string, changes: { quantity?: number; meal?: Meal }) {
    const { error: err } = await supabase.from("food_logs").update(changes).eq("id", id);
    if (err) throw err;
    await refresh();
  }

  async function deleteLog(id: string) {
    const { error: err } = await supabase.from("food_logs").delete().eq("id", id);
    if (err) throw err;
    await refresh();
  }

  return { logs, loading, error, refresh, addLog, updateLog, deleteLog };
}

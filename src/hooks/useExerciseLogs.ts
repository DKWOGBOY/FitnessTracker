import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ExerciseLog } from "../lib/types";

/** `seedLogs`, when provided, is already-fetched data for this exact date
 * (e.g. from the Log page's single consolidated RPC) - the hook skips its
 * own initial fetch for that first date and uses it directly. Any later
 * date change still refetches normally. */
export function useExerciseLogs(date: string, seedLogs?: ExerciseLog[]) {
  const [logs, setLogs] = useState<ExerciseLog[]>(seedLogs ?? []);
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
        .from("exercise_logs")
        .select("*")
        .eq("log_date", date)
        .order("created_at", { ascending: true });
      if (err) setError(err.message);
      else setLogs((data ?? []) as ExerciseLog[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exercise logs.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addLog(name: string, caloriesBurned: number) {
    // user_id defaults to auth.uid() server-side - no need to fetch/send it.
    const { data, error: err } = await supabase
      .from("exercise_logs")
      .insert({ name, calories_burned: caloriesBurned, log_date: date })
      .select()
      .single();
    if (err) throw err;
    setLogs((prev) => [...prev, data as ExerciseLog]);
  }

  async function deleteLog(id: string) {
    const { error: err } = await supabase.from("exercise_logs").delete().eq("id", id);
    if (err) throw err;
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  return { logs, loading, error, refresh, addLog, deleteLog };
}

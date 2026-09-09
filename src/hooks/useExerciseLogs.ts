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

  async function deleteLog(id: string) {
    const { error: err } = await supabase.from("exercise_logs").delete().eq("id", id);
    if (err) throw err;
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  /** Upserts an auto-derived LIFT estimate by lift_session_id (see the
   * unique index in 0012) - re-running this with an updated calorie figure
   * replaces the existing row instead of creating a duplicate. */
  async function upsertLiftEstimate(liftSessionId: string, name: string, caloriesBurned: number) {
    const { data, error: err } = await supabase
      .from("exercise_logs")
      .upsert(
        { lift_session_id: liftSessionId, name, calories_burned: caloriesBurned, source: "lift_estimate", log_date: date },
        { onConflict: "user_id,lift_session_id" },
      )
      .select()
      .single();
    if (err) throw err;
    const row = data as ExerciseLog;
    setLogs((prev) => {
      const existing = prev.find((l) => l.id === row.id);
      return existing ? prev.map((l) => (l.id === row.id ? row : l)) : [...prev, row];
    });
  }

  return { logs, loading, error, refresh, deleteLog, upsertLiftEstimate };
}

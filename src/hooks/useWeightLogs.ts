import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { WeightLog } from "../lib/types";

/** Weight logs for a single day (usually 0 or 1 entries, but supports more). */
export function useWeightLogsForDate(date: string) {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("log_date", date)
        .order("log_date", { ascending: true });
      setLogs((data ?? []) as WeightLog[]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addWeight(weightKg: number, notes?: string) {
    // user_id defaults to auth.uid() server-side - no need to fetch/send it.
    const { data, error: err } = await supabase
      .from("weight_logs")
      .insert({ log_date: date, weight_kg: weightKg, notes: notes ?? null })
      .select()
      .single();
    if (err) throw err;
    setLogs((prev) => [...prev, data as WeightLog]);
  }

  async function updateWeight(id: string, weightKg: number, notes?: string) {
    const { data, error: err } = await supabase
      .from("weight_logs")
      .update({ weight_kg: weightKg, notes: notes ?? null })
      .eq("id", id)
      .select()
      .single();
    if (err) throw err;
    setLogs((prev) => prev.map((l) => (l.id === id ? (data as WeightLog) : l)));
  }

  async function deleteWeight(id: string) {
    const { error: err } = await supabase.from("weight_logs").delete().eq("id", id);
    if (err) throw err;
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  return { logs, loading, refresh, addWeight, updateWeight, deleteWeight };
}

/** Weight logs across a date range, for Trends. */
export function useWeightLogsRange(fromDate: string | null) {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("weight_logs").select("*").order("log_date", { ascending: true });
      if (fromDate) query = query.gte("log_date", fromDate);
      const { data } = await query;
      setLogs((data ?? []) as WeightLog[]);
    } finally {
      setLoading(false);
    }
  }, [fromDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, loading, refresh };
}

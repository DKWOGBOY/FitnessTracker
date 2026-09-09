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

/** The very first and most recent weight entries across all dates - cheap
 * (order+limit 1 each) way to get "Start"/"Current"/"days since" without
 * fetching the whole history. Used by the weekly weigh-in reminder and the
 * Weight overview card. */
export function useWeightSummary() {
  const [first, setFirst] = useState<WeightLog | null>(null);
  const [last, setLast] = useState<WeightLog | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: firstData }, { data: lastData }] = await Promise.all([
        supabase.from("weight_logs").select("*").order("log_date", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("weight_logs").select("*").order("log_date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setFirst((firstData as WeightLog) ?? null);
      setLast((lastData as WeightLog) ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { first, last, loading, refresh };
}

const DEFAULT_WEIGHT_KG = 70;

/** The weight to use for a given day's calorie-burn estimate: the closest
 * logged weight on or before that date (most accurate for a past date),
 * falling back to the closest one after it (e.g. the user's very first
 * weigh-in happened after this date), falling back to a generic default if
 * nothing has ever been logged. */
export function useNearestWeight(date: string) {
  const [weightKg, setWeightKg] = useState(DEFAULT_WEIGHT_KG);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: onOrBefore } = await supabase
        .from("weight_logs")
        .select("weight_kg")
        .lte("log_date", date)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (onOrBefore) {
        setWeightKg(onOrBefore.weight_kg);
        setIsDefault(false);
        return;
      }
      const { data: after } = await supabase
        .from("weight_logs")
        .select("weight_kg")
        .gt("log_date", date)
        .order("log_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (after) {
        setWeightKg(after.weight_kg);
        setIsDefault(false);
      } else {
        setWeightKg(DEFAULT_WEIGHT_KG);
        setIsDefault(true);
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { weightKg, isDefault, loading };
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

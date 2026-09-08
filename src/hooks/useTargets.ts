import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Target } from "../lib/types";

export function useTargets() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("targets")
        .select("*")
        .order("effective_date", { ascending: true });
      setTargets((data ?? []) as Target[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addTarget(input: Omit<Target, "id" | "user_id">) {
    // user_id defaults to auth.uid() server-side - no need to fetch/send it.
    const { data, error: err } = await supabase.from("targets").insert(input).select().single();
    if (err) throw err;
    setTargets((prev) =>
      [...prev, data as Target].sort((a, b) => a.effective_date.localeCompare(b.effective_date)),
    );
  }

  /** Returns the target row effective on the given date (most recent row with effective_date <= date). */
  function targetForDate(date: string): Target | null {
    const applicable = targets.filter((t) => t.effective_date <= date);
    if (applicable.length === 0) return null;
    return applicable[applicable.length - 1];
  }

  const currentTarget = targets.length > 0 ? targets[targets.length - 1] : null;

  return { targets, loading, refresh, addTarget, targetForDate, currentTarget };
}

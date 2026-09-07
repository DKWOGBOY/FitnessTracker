import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { shiftDate, todayStr } from "../lib/dates";

/** Consecutive days (ending today or yesterday) with at least one food or weight log. */
export function useStreak(refreshKey: unknown) {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function compute() {
      setLoading(true);
      try {
        const lookbackStart = shiftDate(todayStr(), -400);

        const [{ data: foodDates }, { data: weightDates }] = await Promise.all([
          supabase.from("food_logs").select("log_date").gte("log_date", lookbackStart),
          supabase.from("weight_logs").select("log_date").gte("log_date", lookbackStart),
        ]);

        const dateSet = new Set<string>();
        for (const row of foodDates ?? []) dateSet.add(row.log_date as string);
        for (const row of weightDates ?? []) dateSet.add(row.log_date as string);

        let count = 0;
        let cursor = todayStr();
        // Today may not have a log yet; don't break the streak until yesterday fails too.
        if (!dateSet.has(cursor)) {
          cursor = shiftDate(cursor, -1);
        }
        while (dateSet.has(cursor)) {
          count += 1;
          cursor = shiftDate(cursor, -1);
        }

        if (!cancelled) setStreak(count);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    compute();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { streak, loading };
}

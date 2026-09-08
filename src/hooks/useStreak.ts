import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { shiftDate, todayStr } from "../lib/dates";

/** Consecutive days (ending today or yesterday) with at least one food or
 * weight log, given the distinct log dates seen within the lookback window. */
function computeStreak(foodDates: string[], weightDates: string[]): number {
  const dateSet = new Set<string>([...foodDates, ...weightDates]);

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
  return count;
}

export interface StreakSeed {
  foodDates: string[];
  weightDates: string[];
}

/** `seed`, when provided, is the distinct log-date sets already fetched
 * elsewhere (e.g. from the Log page's single consolidated RPC) - the streak
 * is computed from it immediately and the hook skips its own initial fetch.
 * Any later `refreshKey` change still recomputes normally over the network. */
export function useStreak(refreshKey: unknown, seed?: StreakSeed) {
  const [streak, setStreak] = useState(() => (seed ? computeStreak(seed.foodDates, seed.weightDates) : 0));
  const [loading, setLoading] = useState(!seed);
  const skipNextFetch = useRef(!!seed);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    let cancelled = false;

    async function compute() {
      setLoading(true);
      try {
        const lookbackStart = shiftDate(todayStr(), -400);

        const [{ data: foodDates }, { data: weightDates }] = await Promise.all([
          supabase.from("food_logs").select("log_date").gte("log_date", lookbackStart),
          supabase.from("weight_logs").select("log_date").gte("log_date", lookbackStart),
        ]);

        if (!cancelled) {
          setStreak(
            computeStreak(
              (foodDates ?? []).map((r) => r.log_date as string),
              (weightDates ?? []).map((r) => r.log_date as string),
            ),
          );
        }
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

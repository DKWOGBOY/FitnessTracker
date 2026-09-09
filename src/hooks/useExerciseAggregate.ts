import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/** Total calories burned (manual exercise_logs) between fromDate and toDate
 * (inclusive) - the Trends calorie screen's counterpart to useLogAggregates. */
export function useExerciseAggregate(fromDate: string, toDate: string) {
  const [burned, setBurned] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("exercise_logs")
        .select("calories_burned")
        .gte("log_date", fromDate)
        .lte("log_date", toDate);
      setBurned((data ?? []).reduce((sum, row) => sum + (row.calories_burned as number), 0));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { burned, loading, refresh };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/** `seedLitres`, when provided, is already-fetched data for this exact date
 * (e.g. from the Log page's single consolidated RPC) - the hook skips its
 * own initial fetch for that first date and uses it directly. Any later
 * date change still refetches normally. */
export function useWaterLog(date: string, seedLitres?: number) {
  const [litres, setLitresState] = useState(seedLitres ?? 0);
  const [loading, setLoading] = useState(seedLitres === undefined);
  const skipNextFetch = useRef(seedLitres !== undefined);

  const refresh = useCallback(async () => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("water_logs")
        .select("litres")
        .eq("log_date", date)
        .maybeSingle();
      setLitresState(data?.litres ?? 0);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function setLitres(value: number) {
    setLitresState(value);
    // user_id defaults to auth.uid() server-side - no need to fetch/send it,
    // but the (user_id, log_date) unique constraint still needs naming here.
    const { error } = await supabase
      .from("water_logs")
      .upsert({ log_date: date, litres: value }, { onConflict: "user_id,log_date" });
    if (error) throw error;
  }

  return { litres, loading, setLitres };
}

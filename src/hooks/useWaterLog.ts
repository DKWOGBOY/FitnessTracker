import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useWaterLog(date: string) {
  const [litres, setLitresState] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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

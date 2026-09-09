import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const DEFAULT_WEIGH_IN_REMINDER_DAYS = 7;

export function useUserSettings() {
  const [weighInReminderDays, setWeighInReminderDays] = useState(DEFAULT_WEIGH_IN_REMINDER_DAYS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("user_settings").select("*").maybeSingle();
      setWeighInReminderDays(data?.weigh_in_reminder_days ?? DEFAULT_WEIGH_IN_REMINDER_DAYS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function updateWeighInReminderDays(days: number) {
    setWeighInReminderDays(days);
    // user_id defaults to auth.uid() server-side - no need to fetch/send it.
    await supabase.from("user_settings").upsert({ weigh_in_reminder_days: days }, { onConflict: "user_id" });
  }

  return { weighInReminderDays, loading, refresh, updateWeighInReminderDays };
}

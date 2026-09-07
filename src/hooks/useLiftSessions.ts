import { useCallback, useEffect, useState } from "react";
import { liftEnabled, liftSupabase } from "../lib/liftClient";
import type { LiftSessionRow } from "../lib/liftTypes";

export function useLiftSessions(enabled: boolean) {
  const [sessions, setSessions] = useState<LiftSessionRow[]>([]);
  const [loading, setLoading] = useState(liftEnabled && enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!liftEnabled || !liftSupabase || !enabled) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await liftSupabase
        .from("lift_sessions_for_bitetrack")
        .select("*")
        .order("session_at", { ascending: false });
      if (err) setError(err.message);
      else {
        setSessions((data ?? []) as LiftSessionRow[]);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load LIFT sessions.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh };
}

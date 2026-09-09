import { useCallback, useEffect, useState } from "react";
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from "../lib/push";

export function usePushSubscription() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sub = await getExistingSubscription();
      setSubscribed(!!sub);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function subscribe() {
    setError(null);
    try {
      await subscribeToPush();
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable notifications.");
    }
  }

  async function unsubscribe() {
    setError(null);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable notifications.");
    }
  }

  return { supported: isPushSupported(), subscribed, loading, error, subscribe, unsubscribe };
}

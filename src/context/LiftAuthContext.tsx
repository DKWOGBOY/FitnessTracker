import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { liftEnabled, liftSupabase } from "../lib/liftClient";

interface LiftAuthContextValue {
  enabled: boolean;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const LiftAuthContext = createContext<LiftAuthContextValue | undefined>(undefined);

export function LiftAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(liftEnabled);

  useEffect(() => {
    if (!liftEnabled || !liftSupabase) {
      setLoading(false);
      return;
    }

    liftSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = liftSupabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value: LiftAuthContextValue = {
    enabled: liftEnabled,
    session,
    loading,
    signIn: async (email, password) => {
      if (!liftSupabase) throw new Error("LIFT integration is not configured.");
      const { error } = await liftSupabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      if (!liftSupabase) return;
      await liftSupabase.auth.signOut();
    },
  };

  return <LiftAuthContext.Provider value={value}>{children}</LiftAuthContext.Provider>;
}

export function useLiftAuth(): LiftAuthContextValue {
  const ctx = useContext(LiftAuthContext);
  if (!ctx) throw new Error("useLiftAuth must be used within LiftAuthProvider");
  return ctx;
}

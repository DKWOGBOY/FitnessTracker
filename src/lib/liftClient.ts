import { createClient } from "@supabase/supabase-js";

const liftUrl = import.meta.env.VITE_LIFT_SUPABASE_URL as string | undefined;
const liftAnonKey = import.meta.env.VITE_LIFT_SUPABASE_ANON_KEY as string | undefined;

export const liftEnabled = Boolean(liftUrl && liftAnonKey);

export const liftSupabase = liftEnabled
  ? createClient(liftUrl!, liftAnonKey!, {
      auth: {
        storageKey: "lift-auth",
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

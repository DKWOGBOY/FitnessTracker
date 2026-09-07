import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type Mode = "password" | "magic-link";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "magic-link") {
        const { error: err } = await supabase.auth.signInWithOtp({ email });
        if (err) throw err;
        setMessage("Check your email for a magic sign-in link.");
      } else if (isSignUp) {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setMessage("Account created. Check your email to confirm, then sign in.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div className="brand">
            bite<span>track</span>
          </div>
          <p className="text-muted" style={{ marginTop: 6, fontSize: 13 }}>
            Sign in to log your food and weight.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {mode === "password" && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <p className="error-text" style={{ marginBottom: 10 }}>{error}</p>}
          {message && (
            <p className="text-muted" style={{ marginBottom: 10, fontSize: 13 }}>
              {message}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy
              ? "Please wait..."
              : mode === "magic-link"
                ? "Send magic link"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          {mode === "password" ? (
            <>
              <button className="btn-ghost btn" onClick={() => setIsSignUp((s) => !s)}>
                {isSignUp ? "Have an account? Sign in" : "New here? Create account"}
              </button>
              <button className="btn-ghost btn" onClick={() => setMode("magic-link")}>
                Use magic link
              </button>
            </>
          ) : (
            <button className="btn-ghost btn" onClick={() => setMode("password")}>
              Use password instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

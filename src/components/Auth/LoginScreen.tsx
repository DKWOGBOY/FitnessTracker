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

  async function handleForgotPassword() {
    setError(null);
    setMessage(null);
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter your email above first, then tap \"Forgot password\".");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) throw err;
      setMessage("Check your email for a password reset link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <header className="login-header">
        <span className="login-header-k" aria-hidden="true">
          K
        </span>
        <div className="login-header-brand">KOUR</div>
        <div className="login-header-tagline">Calories · macros · weight</div>
      </header>

      <main className="login-body">
        <form onSubmit={handleSubmit}>
          <div className="login-fields">
            <input
              id="email"
              className="login-input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            {mode === "password" && (
              <input
                id="password"
                className="login-input"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            )}
          </div>

          {error && (
            <p className="error-text" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
          {message && (
            <p className="text-muted" style={{ marginTop: 12, fontSize: 13 }}>
              {message}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={busy}>
            {busy
              ? "One moment…"
              : mode === "magic-link"
                ? "Send magic link"
                : isSignUp
                  ? "Create account"
                  : "Continue"}
          </button>

          {mode === "password" && !isSignUp && (
            <button type="button" className="login-forgot" onClick={handleForgotPassword} disabled={busy}>
              Forgot password
            </button>
          )}
        </form>

        <div className="login-switch-row">
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
      </main>
    </div>
  );
}

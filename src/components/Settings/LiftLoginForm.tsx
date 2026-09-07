import { useState, type FormEvent } from "react";
import { useLiftAuth } from "../../context/LiftAuthContext";

export default function LiftLoginForm() {
  const { enabled, session, loading, signIn, signOut } = useLiftAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 8 }}>LIFT account</h3>
        <p className="text-muted" style={{ fontSize: 13 }}>
          LIFT integration isn't configured (missing VITE_LIFT_SUPABASE_URL / VITE_LIFT_SUPABASE_ANON_KEY).
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in to LIFT.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ marginBottom: 12 }}>LIFT account</h3>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 8 }}>
          <div className="spinner" />
        </div>
      ) : session ? (
        <div className="flex-between">
          <span className="text-muted" style={{ fontSize: 13 }}>
            Connected as {session.user.email}
          </span>
          <button className="btn btn-secondary" onClick={() => signOut()}>
            Disconnect
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Log in with your LIFT account so the Exercise card only shows your own workouts.
          </p>
          <div className="field">
            <label htmlFor="lift-email">LIFT email</label>
            <input
              id="lift-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="lift-password">LIFT password</label>
            <input
              id="lift-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="error-text" style={{ marginBottom: 10 }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Connecting..." : "Connect LIFT account"}
          </button>
        </form>
      )}
    </div>
  );
}

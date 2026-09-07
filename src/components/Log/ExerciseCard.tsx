import { useEffect, useMemo, useState } from "react";
import { useLiftSessions } from "../../hooks/useLiftSessions";
import { useLiftAuth } from "../../context/LiftAuthContext";
import { IconChevronDown } from "../icons";

interface Props {
  date: string;
}

export default function ExerciseCard({ date }: Props) {
  const { enabled, session: liftSession } = useLiftAuth();
  const { sessions, loading, error } = useLiftSessions(!!liftSession);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [date]);

  const session = useMemo(
    () => sessions.find((s) => s.session_at?.slice(0, 10) === date) ?? null,
    [sessions, date],
  );

  if (!enabled) return null;

  return (
    <div className="card">
      <div
        className="flex-between"
        style={{ cursor: session ? "pointer" : "default" }}
        onClick={() => session && setExpanded((e) => !e)}
      >
        <h3>{session ? session.day_name ?? session.cardio_activity ?? "Exercise" : "Exercise"}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {session?.duration_minutes != null && <strong>{Math.round(session.duration_minutes)} min</strong>}
          {session && (
            <span
              style={{
                display: "inline-flex",
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            >
              <IconChevronDown className="icon" />
            </span>
          )}
        </div>
      </div>

      {!liftSession ? (
        <p className="empty-state">Log into LIFT in Settings to see your workouts here.</p>
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <p className="error-text" style={{ fontSize: 13, marginTop: 8 }}>
          Couldn't load LIFT data: {error}
        </p>
      ) : !session ? (
        <p className="empty-state">No workout logged in LIFT today.</p>
      ) : (
        expanded && (
          <div style={{ marginTop: 8 }}>
            {session.session_type === "cardio" ? (
              <div className="log-row">
                <div className="list-row-sub">Effort {session.cardio_effort ?? "-"}/5</div>
              </div>
            ) : (session.exercises ?? []).length === 0 ? (
              <p className="empty-state">No exercises recorded.</p>
            ) : (
              (session.exercises ?? []).map((ex) => (
                <div className="log-row" key={ex.exId}>
                  <span className="log-row-title">{ex.name}</span>
                  <div className="list-row-sub">
                    {ex.sets.length === 0
                      ? "No sets recorded"
                      : ex.sets.map((set) => `${set.reps}×${set.weight}kg`).join(", ")}
                  </div>
                </div>
              ))
            )}
          </div>
        )
      )}
    </div>
  );
}

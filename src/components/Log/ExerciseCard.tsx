import { useEffect, useMemo, useState } from "react";
import { useLiftSessions } from "../../hooks/useLiftSessions";
import { useLiftAuth } from "../../context/LiftAuthContext";
import { useNearestWeight } from "../../hooks/useWeightLogs";
import { estimateLiftCalories } from "../../lib/liftCalorieEstimate";
import type { ExerciseLog } from "../../lib/types";
import { IconChevronDown, IconClose } from "../icons";
import Energy from "../Energy";

interface Props {
  date: string;
  logs: ExerciseLog[];
  onDelete: (id: string) => Promise<void>;
  onUpsertLiftEstimate: (liftSessionId: string, name: string, caloriesBurned: number) => Promise<void>;
}

export default function ExerciseCard({ date, logs, onDelete, onUpsertLiftEstimate }: Props) {
  const { enabled, session: liftSession } = useLiftAuth();
  const { sessions, loading, error } = useLiftSessions(!!liftSession);
  const { weightKg, loading: weightLoading } = useNearestWeight(date);
  const [expanded, setExpanded] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  useEffect(() => {
    setExpanded(false);
  }, [date]);

  const session = useMemo(
    () => sessions.find((s) => s.session_at?.slice(0, 10) === date) ?? null,
    [sessions, date],
  );

  // Auto-derives a calorie-burn estimate from the LIFT session for this day
  // (no manual entry) - re-runs whenever the session or weight changes, but
  // is a no-op once the stored estimate already matches (upsertLiftEstimate
  // updates `logs`, which would otherwise retrigger this effect forever).
  useEffect(() => {
    if (!session || weightLoading) return;
    const estimated = estimateLiftCalories(session, weightKg);
    if (estimated == null) return;
    const existing = logs.find((l) => l.lift_session_id === session.id);
    if (existing && existing.calories_burned === estimated) return;
    const name = session.day_name ?? session.cardio_activity ?? (session.session_type === "cardio" ? "Cardio" : "Strength training");
    onUpsertLiftEstimate(session.id, name, estimated)
      .then(() => setEstimateError(null))
      .catch((err) => setEstimateError(err instanceof Error ? err.message : "Failed to save the calorie estimate."));
  }, [session, weightKg, weightLoading, logs, onUpsertLiftEstimate]);

  return (
    <div className="card">
      {enabled && (
        <>
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

          <div style={{ height: 1, background: "var(--color-border)", margin: "12px 0" }} />
        </>
      )}

      <h3>Calories burned</h3>

      {estimateError && (
        <p className="error-text" style={{ fontSize: 13, marginTop: 4 }}>
          Couldn't save the LIFT calorie estimate: {estimateError}
        </p>
      )}

      {logs.length === 0 ? (
        <p className="empty-state">No LIFT workout logged today.</p>
      ) : (
        logs.map((log) => (
          <div className="log-row" key={log.id}>
            <div className="flex-between">
              <span className="log-row-title">
                {log.name}
                {log.source === "lift_estimate" && (
                  <span className="badge badge-muted" style={{ fontSize: 9, verticalAlign: "middle", marginLeft: 6 }}>
                    Estimated
                  </span>
                )}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Energy kcal={log.calories_burned} />
                {log.source === "manual" && (
                  <button className="btn btn-ghost" onClick={() => onDelete(log.id)} aria-label="Delete">
                    <IconClose className="icon" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

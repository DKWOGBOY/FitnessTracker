import { useEffect, useMemo, useState } from "react";
import { useLiftSessions } from "../../hooks/useLiftSessions";
import { useLiftAuth } from "../../context/LiftAuthContext";
import { useNearestWeight } from "../../hooks/useWeightLogs";
import { estimateLiftCalories } from "../../lib/liftCalorieEstimate";
import type { ExerciseLog } from "../../lib/types";
import { IconChevronDown } from "../icons";
import Energy from "../Energy";

interface Props {
  date: string;
  logs: ExerciseLog[];
  onUpsertLiftEstimate: (liftSessionId: string, name: string, caloriesBurned: number) => Promise<void>;
}

/** A collapsed-by-default "Training" bar reflecting the day's LIFT session,
 * auto-estimated (no manual entry) - expands to the same exercises/sets or
 * cardio-effort detail as before. Renders nothing when LIFT isn't
 * connected. */
export default function ExerciseCard({ date, logs, onUpsertLiftEstimate }: Props) {
  const { enabled, session: liftSession } = useLiftAuth();
  const { sessions, loading, error } = useLiftSessions(!!liftSession);
  const { weightKg, loading: weightLoading } = useNearestWeight(date);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [date]);

  const session = useMemo(
    () => sessions.find((s) => s.session_at?.slice(0, 10) === date) ?? null,
    [sessions, date],
  );

  const estimatedCalories = session && !weightLoading ? estimateLiftCalories(session, weightKg) : null;

  // Auto-derives a calorie-burn estimate from the LIFT session for this day
  // (no manual entry) - re-runs whenever the session or weight changes, but
  // is a no-op once the stored estimate already matches (upsertLiftEstimate
  // updates `logs`, which would otherwise retrigger this effect forever).
  useEffect(() => {
    if (!session || estimatedCalories == null) return;
    const existing = logs.find((l) => l.lift_session_id === session.id);
    if (existing && existing.calories_burned === estimatedCalories) return;
    const name =
      session.day_name ?? session.cardio_activity ?? (session.session_type === "cardio" ? "Cardio" : "Strength training");
    onUpsertLiftEstimate(session.id, name, estimatedCalories)
      .then(() => setEstimateError(null))
      .catch((err) => setEstimateError(err instanceof Error ? err.message : "Failed to save the calorie estimate."));
  }, [session, estimatedCalories, logs, onUpsertLiftEstimate]);

  if (!enabled) return null;

  if (!liftSession) {
    return <p className="empty-state">Log into LIFT in Settings to see your workouts here.</p>;
  }
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
        <div className="spinner" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="error-text" style={{ fontSize: 13 }}>
        Couldn't load LIFT data: {error}
      </p>
    );
  }
  if (!session) {
    return <p className="empty-state">No workout logged in LIFT today.</p>;
  }

  const subtitle =
    session.session_type === "cardio"
      ? session.cardio_activity ?? "Cardio"
      : (session.exercises ?? []).map((ex) => ex.name).join(" · ") || "Strength training";
  const durationLabel = session.duration_minutes != null ? `${Math.round(session.duration_minutes)} min` : null;

  return (
    <>
      <div className="training-card">
        <div
          className="training-bar"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded((cur) => !cur)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="meal-card-name">{session.day_name ?? "Training"}</div>
            <div className="training-bar-sub">
              {subtitle}
              {durationLabel && ` — ${durationLabel}`}
            </div>
          </div>
          {estimatedCalories != null && (
            <span className="training-bar-val">
              +<Energy kcal={estimatedCalories} withUnit={false} />
            </span>
          )}
          <span
            style={{
              display: "inline-flex",
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 0.15s ease",
            }}
          >
            <IconChevronDown className="icon" />
          </span>
        </div>

        {expanded && (
          <div className="training-items">
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
        )}
      </div>
      {estimateError && (
        <p className="error-text" style={{ fontSize: 13, marginTop: 8 }}>
          Couldn't save the LIFT calorie estimate: {estimateError}
        </p>
      )}
    </>
  );
}

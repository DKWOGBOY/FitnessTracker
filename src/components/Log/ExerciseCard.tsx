import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useLiftSessions } from "../../hooks/useLiftSessions";
import { useLiftAuth } from "../../context/LiftAuthContext";
import { useNearestWeight } from "../../hooks/useWeightLogs";
import { estimateLiftCalories, formatPace } from "../../lib/liftCalorieEstimate";
import type { ExerciseLog } from "../../lib/types";
import type { LiftSessionRow } from "../../lib/liftTypes";
import { IconChevronDown } from "../icons";
import Energy from "../Energy";

interface Props {
  date: string;
  logs: ExerciseLog[];
  onUpsertLiftEstimate: (liftSessionId: string, name: string, caloriesBurned: number) => Promise<void>;
}

/** Renders one collapsed-by-default card per LIFT session logged for the
 * day - LIFT now allows both a cardio and a weight-training session on the
 * same date, so this is a list rather than a single card. Renders nothing
 * when LIFT isn't connected. */
export default function ExerciseCard({ date, logs, onUpsertLiftEstimate }: Props) {
  const { enabled, session: liftSession } = useLiftAuth();
  const { sessions, loading, error } = useLiftSessions(!!liftSession);
  const { weightKg, loading: weightLoading } = useNearestWeight(date);

  const todaysSessions = useMemo(
    () => sessions.filter((s) => s.session_at?.slice(0, 10) === date),
    [sessions, date],
  );

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
  if (todaysSessions.length === 0) {
    return <p className="empty-state">No workout logged in LIFT today.</p>;
  }

  return (
    <>
      {todaysSessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          date={date}
          logs={logs}
          weightKg={weightKg}
          weightLoading={weightLoading}
          onUpsertLiftEstimate={onUpsertLiftEstimate}
        />
      ))}
    </>
  );
}

function SessionCard({
  session,
  date,
  logs,
  weightKg,
  weightLoading,
  onUpsertLiftEstimate,
}: {
  session: LiftSessionRow;
  date: string;
  logs: ExerciseLog[];
  weightKg: number;
  weightLoading: boolean;
  onUpsertLiftEstimate: (liftSessionId: string, name: string, caloriesBurned: number) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  useEffect(() => {
    setExpanded(false);
  }, [date]);

  const estimatedCalories = !weightLoading ? estimateLiftCalories(session, weightKg) : null;

  // Auto-derives a calorie-burn estimate from the LIFT session (no manual
  // entry) - re-runs whenever the session or weight changes, but is a no-op
  // once the stored estimate already matches (upsertLiftEstimate updates
  // `logs`, which would otherwise retrigger this effect forever).
  useEffect(() => {
    if (estimatedCalories == null) return;
    const existing = logs.find((l) => l.lift_session_id === session.id);
    if (existing && existing.calories_burned === estimatedCalories) return;
    const name =
      session.day_name ?? session.cardio_activity ?? (session.session_type === "cardio" ? "Cardio" : "Strength training");
    onUpsertLiftEstimate(session.id, name, estimatedCalories)
      .then(() => setEstimateError(null))
      .catch((err) => setEstimateError(err instanceof Error ? err.message : "Failed to save the calorie estimate."));
  }, [session, estimatedCalories, logs, onUpsertLiftEstimate]);

  const cardTitle = session.session_type === "cardio" ? "Cardio" : "Weight Training";
  const workoutName =
    session.day_name ?? session.cardio_activity ?? (session.session_type === "cardio" ? "Cardio" : "Strength training");
  const timeLabel = session.session_at ? format(parseISO(session.session_at), "h:mm a") : null;
  const pace = session.session_type === "cardio" ? formatPace(session) : null;

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
            <div className="meal-card-name">{cardTitle}</div>
            <div className="training-bar-sub">
              {workoutName}
              {timeLabel && ` — ${timeLabel}`}
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
              session.distance_km != null ? (
                <>
                  <div className="log-row">
                    <div className="flex-between">
                      <span className="log-row-title">Distance</span>
                      <span>{session.distance_km.toFixed(2)} km</span>
                    </div>
                  </div>
                  {pace && (
                    <div className="log-row">
                      <div className="flex-between">
                        <span className="log-row-title">Avg pace</span>
                        <span>{pace}</span>
                      </div>
                    </div>
                  )}
                  {session.moving_time_minutes != null && (
                    <div className="log-row">
                      <div className="flex-between">
                        <span className="log-row-title">Moving time</span>
                        <span>{Math.round(session.moving_time_minutes)} min</span>
                      </div>
                    </div>
                  )}
                  {session.elapsed_time_minutes != null && (
                    <div className="log-row">
                      <div className="flex-between">
                        <span className="log-row-title">Elapsed time</span>
                        <span>{Math.round(session.elapsed_time_minutes)} min</span>
                      </div>
                    </div>
                  )}
                  {session.avg_heart_rate_bpm != null && (
                    <div className="log-row">
                      <div className="flex-between">
                        <span className="log-row-title">Avg heart rate</span>
                        <span>{Math.round(session.avg_heart_rate_bpm)} bpm</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="log-row">
                  <div className="list-row-sub">Effort {session.cardio_effort ?? "-"}/5</div>
                </div>
              )
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

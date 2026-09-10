import type { LiftSessionRow } from "./liftTypes";

/** LIFT has no calorie tracking of its own, so this is always an estimate:
 * distance-based for a run (the most reliable signal available - running's
 * energy cost per km is fairly constant across a wide range of paces, so
 * this beats a duration/effort guess whenever real GPS distance exists),
 * MET-based (duration x effort) otherwise. */
const CARDIO_METS_BY_EFFORT: Record<number, number> = {
  1: 4, // easy walk / light cycling
  2: 5.5,
  3: 7, // moderate jog
  4: 10, // vigorous run
  5: 13, // very vigorous (sprints, hard interval work)
};
const STRENGTH_METS = 6;
const DEFAULT_CARDIO_EFFORT = 3;

/** ~1.036 kcal burned per kg of body weight per km run (a widely-used
 * running-economy constant, sometimes called Cameron's formula / the ACSM
 * running equation) - roughly "1 kcal per kg per km", independent of pace. */
const RUNNING_KCAL_PER_KG_PER_KM = 1.036;

function isRunningActivity(session: LiftSessionRow): boolean {
  return session.cardio_activity?.toLowerCase().includes("run") ?? false;
}

/** Returns null when there isn't enough data to estimate at all. */
export function estimateLiftCalories(session: LiftSessionRow, weightKg: number): number | null {
  if (session.session_type === "cardio") {
    if (isRunningActivity(session) && session.distance_km != null && session.distance_km > 0) {
      return Math.round(session.distance_km * weightKg * RUNNING_KCAL_PER_KG_PER_KM);
    }
    if (session.duration_minutes == null || session.duration_minutes <= 0) return null;
    const mets =
      CARDIO_METS_BY_EFFORT[session.cardio_effort ?? DEFAULT_CARDIO_EFFORT] ??
      CARDIO_METS_BY_EFFORT[DEFAULT_CARDIO_EFFORT];
    return Math.round(mets * weightKg * (session.duration_minutes / 60));
  }

  if (session.duration_minutes == null || session.duration_minutes <= 0) return null;
  return Math.round(STRENGTH_METS * weightKg * (session.duration_minutes / 60));
}

/** mm:ss/km pace label - from LIFT's own moving time when available (more
 * accurate than elapsed time, which includes stops), otherwise derived from
 * distance + duration. Returns null without enough data to compute either. */
export function formatPace(session: LiftSessionRow): string | null {
  if (session.distance_km == null || session.distance_km <= 0) return null;
  const minutes = session.moving_time_minutes ?? session.duration_minutes;
  if (minutes == null || minutes <= 0) return null;
  const secondsPerKm = (minutes * 60) / session.distance_km;
  const mm = Math.floor(secondsPerKm / 60);
  const ss = Math.round(secondsPerKm % 60);
  return `${mm}:${String(ss).padStart(2, "0")}/km`;
}

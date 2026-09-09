import type { LiftSessionRow } from "./liftTypes";

/** LIFT has no calorie tracking of its own (no heart rate/power data
 * either), so this is a rough MET-based estimate: kcal = METs x weight_kg x
 * hours. cardio_effort (1-5, self-reported) stands in for intensity since
 * that's all LIFT records for a cardio session; strength sessions get a
 * flat rate since LIFT doesn't rate their effort at all. */
const CARDIO_METS_BY_EFFORT: Record<number, number> = {
  1: 4, // easy walk / light cycling
  2: 5.5,
  3: 7, // moderate jog
  4: 10, // vigorous run
  5: 13, // very vigorous (sprints, hard interval work)
};
const STRENGTH_METS = 6;
const DEFAULT_CARDIO_EFFORT = 3;

/** Returns null when there isn't enough data to estimate (no duration
 * recorded for the session). */
export function estimateLiftCalories(session: LiftSessionRow, weightKg: number): number | null {
  if (session.duration_minutes == null || session.duration_minutes <= 0) return null;

  const mets =
    session.session_type === "cardio"
      ? CARDIO_METS_BY_EFFORT[session.cardio_effort ?? DEFAULT_CARDIO_EFFORT] ?? CARDIO_METS_BY_EFFORT[DEFAULT_CARDIO_EFFORT]
      : STRENGTH_METS;

  return Math.round(mets * weightKg * (session.duration_minutes / 60));
}

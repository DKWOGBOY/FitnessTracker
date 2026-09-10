export interface LiftExerciseSet {
  reps: number;
  weight: number;
  done: boolean;
}

export interface LiftExercise {
  exId: string;
  variant: string;
  name: string;
  sets: LiftExerciseSet[];
}

export interface LiftSessionRow {
  id: string;
  session_at: string;
  session_type: "strength" | "cardio";
  day_name: string | null;
  cardio_activity: string | null;
  duration_minutes: number | null;
  cardio_effort: number | null;
  exercises: LiftExercise[] | null;
  /** Running-specific detail LIFT now records - all null for other cardio
   * activities (or older sessions logged before LIFT tracked these). */
  distance_km: number | null;
  moving_time_minutes: number | null;
  elapsed_time_minutes: number | null;
  avg_heart_rate_bpm: number | null;
}

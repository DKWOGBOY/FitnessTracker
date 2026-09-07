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
}

export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "cut" | "maintain" | "bulk";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little to no exercise)",
  light: "Light (1-3 days/week)",
  moderate: "Moderate (3-5 days/week)",
  active: "Active (6-7 days/week)",
  very_active: "Very active (physical job + training)",
};

export const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  cut: -500,
  maintain: 0,
  bulk: 300,
};

export interface TdeeInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

// Mifflin-St Jeor equation
export function calculateBmr({ weightKg, heightCm, age, sex }: TdeeInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTdee(input: TdeeInput): TdeeResult {
  const bmr = calculateBmr(input);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel];
  const targetCalories = Math.round(tdee + GOAL_CALORIE_ADJUSTMENT[input.goal]);

  // Protein: 2g/kg bodyweight, Fat: 0.8g/kg bodyweight, remainder from carbs
  const proteinG = Math.round(input.weightKg * 2);
  const fatG = Math.round(input.weightKg * 0.8);
  const remainingCalories = targetCalories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remainingCalories / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    proteinG,
    fatG,
    carbsG,
  };
}

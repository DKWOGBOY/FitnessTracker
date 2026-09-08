export type BaseUnit = "g" | "ml";

/** Pure unit conversions (mass-to-mass, volume-to-volume) that hold for any
 * food regardless of density, so they're safe to auto-add to every food's
 * serving list. A "1 cup" of a solid food is NOT one of these - that's
 * food-specific and must come from the API or manual entry. */
export const STANDARD_SERVINGS: Record<BaseUnit, { label: string; grams_equivalent: number }[]> = {
  g: [
    { label: "1 oz", grams_equivalent: 28.35 },
    { label: "1 lb", grams_equivalent: 453.6 },
  ],
  ml: [
    { label: "1 tsp", grams_equivalent: 4.93 },
    { label: "1 tbsp", grams_equivalent: 14.79 },
    { label: "1 fl oz", grams_equivalent: 29.57 },
    { label: "1 cup", grams_equivalent: 236.59 },
  ],
};
/** "off"/"usda" are historical - foods already imported from those sources
 * before the switch to CalorieAPI keep them, but nothing creates them anymore. */
export type FoodSource = "off" | "usda" | "calorieapi" | "manual" | "meal";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export interface Food {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  base_unit: BaseUnit;
  source: FoodSource;
  source_id: string | null;
  is_frequent: boolean;
  /** CalorieAPI-imported foods with curated macros + real household portions;
   * false for manual entries and foods from other sources. Shown as a badge. */
  is_verified: boolean;
  created_at: string;
}

export type FoodInput = Omit<Food, "id" | "user_id" | "created_at">;

/** A named way to log a food - "1 cup, cooked", "1 slice", or the mandatory "100g" fallback. */
export interface FoodServing {
  id: string;
  user_id: string;
  food_id: string;
  label: string;
  grams_equivalent: number;
  is_default: boolean;
  created_at: string;
}

export type FoodServingInput = Omit<FoodServing, "id" | "user_id" | "food_id" | "created_at">;

export interface FoodLog {
  id: string;
  user_id: string;
  food_id: string;
  serving_id: string | null;
  log_date: string;
  meal: Meal;
  quantity: number;
  created_at: string;
}

export interface FoodLogWithFood extends FoodLog {
  food: Food;
  serving: FoodServing | null;
}

export interface WeightLog {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number;
  notes: string | null;
}

export interface Target {
  id: string;
  user_id: string;
  effective_date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealPreset {
  id: string;
  user_id: string;
  name: string;
  default_meal: Meal;
  food_id: string | null;
  created_at: string;
}

export interface MealPresetItem {
  id: string;
  user_id: string;
  preset_id: string;
  food_id: string;
  serving_id: string | null;
  quantity: number;
}

export interface MealPresetWithItems extends MealPreset {
  items: (MealPresetItem & { food: Food; serving: FoodServing | null })[];
  food: Food | null;
}

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Every macro on `foods` is per 100g/100ml; `gramsEquivalent` converts a
 * chosen serving (or a raw gram/ml amount) into that same 100-unit basis. */
export function macrosForServing(food: Food, gramsEquivalent: number, quantity: number): Macros {
  const factor = (quantity * gramsEquivalent) / 100;
  return {
    calories: food.calories * factor,
    protein_g: food.protein_g * factor,
    carbs_g: food.carbs_g * factor,
    fat_g: food.fat_g * factor,
  };
}

/** Convenience wrapper for anything shaped like a food log / preset item -
 * falls back to a 100-unit serving if none is set (legacy rows, meal
 * aggregates before their default serving loads, etc). */
export function macrosForLog(entry: { food: Food; serving?: FoodServing | null; quantity: number }): Macros {
  return macrosForServing(entry.food, entry.serving?.grams_equivalent ?? 100, entry.quantity);
}

export function defaultServing(servings: FoodServing[]): FoodServing | null {
  return servings.find((s) => s.is_default) ?? servings[0] ?? null;
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein_g: acc.protein_g + m.protein_g,
      carbs_g: acc.carbs_g + m.carbs_g,
      fat_g: acc.fat_g + m.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

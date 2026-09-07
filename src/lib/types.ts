export type ServingUnit = "g" | "ml" | "oz" | "piece";
export type FoodSource = "off" | "usda" | "manual";
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
  serving_size: number;
  serving_unit: ServingUnit;
  source: FoodSource;
  source_id: string | null;
  is_frequent: boolean;
  created_at: string;
}

export type FoodInput = Omit<Food, "id" | "user_id" | "created_at">;

export interface FoodLog {
  id: string;
  user_id: string;
  food_id: string;
  log_date: string;
  meal: Meal;
  quantity: number;
  created_at: string;
}

export interface FoodLogWithFood extends FoodLog {
  food: Food;
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
  created_at: string;
}

export interface MealPresetItem {
  id: string;
  user_id: string;
  preset_id: string;
  food_id: string;
  quantity: number;
}

export interface MealPresetWithItems extends MealPreset {
  items: (MealPresetItem & { food: Food })[];
}

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export function macrosForQuantity(food: Food, quantity: number): Macros {
  const factor = (quantity * food.serving_size) / 100;
  return {
    calories: food.calories * factor,
    protein_g: food.protein_g * factor,
    carbs_g: food.carbs_g * factor,
    fat_g: food.fat_g * factor,
  };
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

import { useFoods } from "../hooks/useFoods";
import { useMealPresets } from "../hooks/useMealPresets";
import { supabase } from "../lib/supabase";
import { todayStr } from "../lib/dates";
import type { Meal } from "../lib/types";
import FoodSearchModal from "./Log/FoodSearchModal";

interface Props {
  initialMeal: Meal;
  onClose: () => void;
}

/**
 * A standalone instance of the food search/add modal for the quick-add FAB
 * when it's used from a tab other than Log - the Log tab's own instance
 * (already sharing state with what's on screen there) keeps handling it
 * when you're already on that tab. Always logs to today, matching what the
 * FAB has always meant ("log something right now").
 */
export default function QuickAddModal({ initialMeal, onClose }: Props) {
  const { foods, servingsByFood, addFood, refresh: refreshFoods } = useFoods();
  const { presets, savePreset, deletePreset } = useMealPresets();

  async function addLog(foodId: string, meal: Meal, quantity: number, servingId: string | null) {
    // user_id defaults to auth.uid() server-side - no need to fetch/send it.
    const { error } = await supabase
      .from("food_logs")
      .insert({ food_id: foodId, log_date: todayStr(), meal, quantity, serving_id: servingId });
    if (error) throw error;
  }

  return (
    <FoodSearchModal
      foods={foods}
      servingsByFood={servingsByFood}
      presets={presets}
      initialMeal={initialMeal}
      onClose={onClose}
      onAdd={addLog}
      onFoodCreated={() => refreshFoods()}
      onDeletePreset={deletePreset}
      onCreateFood={addFood}
      onSaveMeal={savePreset}
    />
  );
}

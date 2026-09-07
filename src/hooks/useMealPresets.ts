import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { macrosForQuantity, type Food, type Meal, type MealPresetWithItems } from "../lib/types";

async function computeAggregateMacros(items: { foodId: string; quantity: number }[]) {
  const { data: foodRows } = await supabase
    .from("foods")
    .select("*")
    .in(
      "id",
      items.map((i) => i.foodId),
    );
  const foodsById = new Map(((foodRows ?? []) as Food[]).map((f) => [f.id, f]));

  return items.reduce(
    (acc, i) => {
      const food = foodsById.get(i.foodId);
      if (!food) return acc;
      const m = macrosForQuantity(food, i.quantity);
      return {
        calories: acc.calories + m.calories,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function useMealPresets() {
  const [presets, setPresets] = useState<MealPresetWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("meal_presets")
        .select("*, items:meal_preset_items(*, food:foods(*)), food:foods!meal_presets_food_id_fkey(*)")
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as MealPresetWithItems[];

      // Backfill: any preset saved before aggregate foods existed won't have
      // food_id yet. Compute and attach one now so it behaves like the rest.
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      for (const preset of rows) {
        if (preset.food_id || preset.items.length === 0) continue;
        const totals = await computeAggregateMacros(
          preset.items.map((i) => ({ foodId: i.food_id, quantity: i.quantity })),
        );
        const { data: aggFood } = await supabase
          .from("foods")
          .insert({
            name: preset.name,
            ...totals,
            serving_size: 100,
            serving_unit: "piece",
            source: "meal",
            source_id: null,
            is_frequent: false,
            user_id: userId,
          })
          .select()
          .single();
        if (aggFood) {
          await supabase.from("meal_presets").update({ food_id: aggFood.id }).eq("id", preset.id);
          preset.food_id = aggFood.id;
          preset.food = aggFood as Food;
        }
      }

      setPresets(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function savePreset(
    name: string,
    defaultMeal: Meal,
    items: { foodId: string; quantity: number }[],
  ) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const totals = await computeAggregateMacros(items);

    const { data: aggFood, error: aggErr } = await supabase
      .from("foods")
      .insert({
        name,
        ...totals,
        serving_size: 100,
        serving_unit: "piece",
        source: "meal",
        source_id: null,
        is_frequent: false,
        user_id: userId,
      })
      .select()
      .single();
    if (aggErr) throw aggErr;

    const { data: preset, error: presetErr } = await supabase
      .from("meal_presets")
      .insert({ name, default_meal: defaultMeal, user_id: userId, food_id: aggFood.id })
      .select()
      .single();
    if (presetErr) throw presetErr;

    const { error: itemsErr } = await supabase.from("meal_preset_items").insert(
      items.map((i) => ({
        preset_id: preset.id,
        food_id: i.foodId,
        quantity: i.quantity,
        user_id: userId,
      })),
    );
    if (itemsErr) throw itemsErr;
    await refresh();
  }

  async function deletePreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    const { error: err } = await supabase.from("meal_presets").delete().eq("id", id);
    if (err) throw err;
    if (preset?.food_id) {
      await supabase.from("foods").delete().eq("id", preset.food_id);
    }
    await refresh();
  }

  return { presets, loading, refresh, savePreset, deletePreset };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { macrosForLog, type Food, type FoodServing, type Meal, type MealPresetWithItems } from "../lib/types";

export interface PresetItemInput {
  foodId: string;
  servingId: string | null;
  quantity: number;
}

async function computeAggregateMacros(items: PresetItemInput[]) {
  const servingIds = items.map((i) => i.servingId).filter((s): s is string => !!s);
  const [foodsRes, servingsRes] = await Promise.all([
    supabase
      .from("foods")
      .select("*")
      .in(
        "id",
        items.map((i) => i.foodId),
      ),
    servingIds.length
      ? supabase.from("food_servings").select("*").in("id", servingIds)
      : Promise.resolve({ data: [] as FoodServing[] }),
  ]);
  const foodsById = new Map(((foodsRes.data ?? []) as Food[]).map((f) => [f.id, f]));
  const servingsById = new Map(((servingsRes.data ?? []) as FoodServing[]).map((s) => [s.id, s]));

  return items.reduce(
    (acc, i) => {
      const food = foodsById.get(i.foodId);
      if (!food) return acc;
      const serving = i.servingId ? servingsById.get(i.servingId) ?? null : null;
      const m = macrosForLog({ food, serving, quantity: i.quantity });
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

/** Every meal-aggregate food is "1 piece = the whole meal" so it can be
 * logged/scaled through the exact same machinery as a normal food. */
async function ensureAggregateServing(foodId: string) {
  const { data: existing } = await supabase
    .from("food_servings")
    .select("id")
    .eq("food_id", foodId)
    .maybeSingle();
  if (existing) return;
  await supabase
    .from("food_servings")
    .insert({ food_id: foodId, label: "1 meal", grams_equivalent: 100, is_default: true });
}

export function useMealPresets() {
  const [presets, setPresets] = useState<MealPresetWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("meal_presets")
        .select(
          "*, items:meal_preset_items(*, food:foods(*), serving:food_servings(*)), food:foods!meal_presets_food_id_fkey(*)",
        )
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as MealPresetWithItems[];

      // Backfill: any preset saved before aggregate foods existed won't have
      // food_id yet. Compute and attach one now so it behaves like the rest.
      // (user_id defaults to auth.uid() server-side on the insert below.)
      for (const preset of rows) {
        if (preset.food_id || preset.items.length === 0) continue;
        const totals = await computeAggregateMacros(
          preset.items.map((i) => ({ foodId: i.food_id, servingId: i.serving_id, quantity: i.quantity })),
        );
        const { data: aggFood } = await supabase
          .from("foods")
          .insert({
            name: preset.name,
            ...totals,
            base_unit: "g",
            source: "meal",
            source_id: null,
            is_frequent: false,
          })
          .select()
          .single();
        if (aggFood) {
          await ensureAggregateServing(aggFood.id);
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

  async function savePreset(name: string, defaultMeal: Meal, items: PresetItemInput[]) {
    // user_id defaults to auth.uid() server-side on every insert below.
    const totals = await computeAggregateMacros(items);

    const { data: aggFood, error: aggErr } = await supabase
      .from("foods")
      .insert({
        name,
        ...totals,
        base_unit: "g",
        source: "meal",
        source_id: null,
        is_frequent: false,
      })
      .select()
      .single();
    if (aggErr) throw aggErr;
    await ensureAggregateServing(aggFood.id);

    const { data: preset, error: presetErr } = await supabase
      .from("meal_presets")
      .insert({ name, default_meal: defaultMeal, food_id: aggFood.id })
      .select()
      .single();
    if (presetErr) throw presetErr;

    const { error: itemsErr } = await supabase.from("meal_preset_items").insert(
      items.map((i) => ({
        preset_id: preset.id,
        food_id: i.foodId,
        serving_id: i.servingId,
        quantity: i.quantity,
      })),
    );
    if (itemsErr) throw itemsErr;
    await refresh();
  }

  async function updatePreset(id: string, name: string, items: PresetItemInput[]) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) throw new Error("Preset not found.");

    const totals = await computeAggregateMacros(items);

    if (preset.food_id) {
      const { error: foodErr } = await supabase
        .from("foods")
        .update({ name, ...totals })
        .eq("id", preset.food_id);
      if (foodErr) throw foodErr;
    }

    const { error: presetErr } = await supabase.from("meal_presets").update({ name }).eq("id", id);
    if (presetErr) throw presetErr;

    const { error: deleteItemsErr } = await supabase.from("meal_preset_items").delete().eq("preset_id", id);
    if (deleteItemsErr) throw deleteItemsErr;

    const { error: insertItemsErr } = await supabase.from("meal_preset_items").insert(
      items.map((i) => ({
        preset_id: id,
        food_id: i.foodId,
        serving_id: i.servingId,
        quantity: i.quantity,
      })),
    );
    if (insertItemsErr) throw insertItemsErr;

    await refresh();
  }

  async function deletePreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    const { error: err } = await supabase.from("meal_presets").delete().eq("id", id);
    if (err) throw err;
    if (preset?.food_id) {
      await supabase.from("foods").delete().eq("id", preset.food_id);
    }
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  return { presets, loading, refresh, savePreset, updatePreset, deletePreset };
}

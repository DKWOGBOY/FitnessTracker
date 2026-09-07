import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Meal, MealPresetWithItems } from "../lib/types";

export function useMealPresets() {
  const [presets, setPresets] = useState<MealPresetWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("meal_presets")
        .select("*, items:meal_preset_items(*, food:foods(*))")
        .order("created_at", { ascending: false });
      setPresets((data ?? []) as unknown as MealPresetWithItems[]);
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

    const { data: preset, error: presetErr } = await supabase
      .from("meal_presets")
      .insert({ name, default_meal: defaultMeal, user_id: userId })
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
    const { error: err } = await supabase.from("meal_presets").delete().eq("id", id);
    if (err) throw err;
    await refresh();
  }

  return { presets, loading, refresh, savePreset, deletePreset };
}

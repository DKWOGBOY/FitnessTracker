import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { STANDARD_SERVINGS, type Food, type FoodInput, type FoodServing, type FoodServingInput } from "../lib/types";

/** Builds the full serving list for a food: the mandatory 100-unit row, any
 * extra rows the caller supplied, and the standard unit conversions for this
 * base unit (oz/lb, or tsp/tbsp/fl oz/cup) that aren't already covered by a
 * caller-supplied label. Honors whichever row is flagged default (falling
 * back to the 100-unit row if none is marked). */
function buildServingRows(baseUnit: "g" | "ml", extra: FoodServingInput[]) {
  const hasDefault = extra.some((s) => s.is_default);
  const existingLabels = new Set(extra.map((s) => s.label.trim().toLowerCase()));
  const standard = STANDARD_SERVINGS[baseUnit].filter((s) => !existingLabels.has(s.label.toLowerCase()));
  return [
    { label: `100 ${baseUnit}`, grams_equivalent: 100, is_default: !hasDefault },
    ...extra.map((s) => ({ ...s, is_default: !!s.is_default })),
    ...standard.map((s) => ({ ...s, is_default: false })),
  ];
}

export function useFoods() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [servings, setServings] = useState<FoodServing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [foodsRes, servingsRes] = await Promise.all([
        supabase.from("foods").select("*").neq("source", "meal").order("name", { ascending: true }),
        supabase.from("food_servings").select("*"),
      ]);
      if (foodsRes.error) setError(foodsRes.error.message);
      else setFoods((foodsRes.data ?? []) as Food[]);
      setServings((servingsRes.data ?? []) as FoodServing[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load foods.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const servingsByFood = useMemo(() => {
    const map = new Map<string, FoodServing[]>();
    for (const s of servings) {
      const list = map.get(s.food_id);
      if (list) list.push(s);
      else map.set(s.food_id, [s]);
    }
    return map;
  }, [servings]);

  async function refreshServings() {
    const { data } = await supabase.from("food_servings").select("*");
    setServings((data ?? []) as FoodServing[]);
  }

  async function addFood(input: FoodInput, extraServings: FoodServingInput[] = []): Promise<Food> {
    // user_id defaults to auth.uid() server-side - no need to fetch/send it.
    const { data, error: err } = await supabase.from("foods").insert(input).select().single();
    if (err) throw err;
    const food = data as Food;
    setFoods((prev) => [...prev, food].sort((a, b) => a.name.localeCompare(b.name)));

    const rows = buildServingRows(input.base_unit, extraServings);
    const { error: servErr } = await supabase
      .from("food_servings")
      .insert(rows.map((r) => ({ ...r, food_id: food.id })));
    if (servErr) throw servErr;
    await refreshServings();

    return food;
  }

  async function updateFood(id: string, input: Partial<FoodInput>, extraServings?: FoodServingInput[]) {
    const { data, error: err } = await supabase.from("foods").update(input).eq("id", id).select().single();
    if (err) throw err;
    const food = data as Food;
    setFoods((prev) => prev.map((f) => (f.id === id ? food : f)).sort((a, b) => a.name.localeCompare(b.name)));

    if (extraServings) {
      const { error: delErr } = await supabase.from("food_servings").delete().eq("food_id", id);
      if (delErr) throw delErr;
      const rows = buildServingRows(food.base_unit, extraServings);
      const { error: servErr } = await supabase
        .from("food_servings")
        .insert(rows.map((r) => ({ ...r, food_id: id })));
      if (servErr) throw servErr;
      await refreshServings();
    }
  }

  async function deleteFood(id: string) {
    const { error: err } = await supabase.from("foods").delete().eq("id", id);
    if (err) throw err;
    setFoods((prev) => prev.filter((f) => f.id !== id));
    setServings((prev) => prev.filter((s) => s.food_id !== id));
  }

  async function toggleFrequent(id: string, isFrequent: boolean) {
    await updateFood(id, { is_frequent: isFrequent });
  }

  return {
    foods,
    servings,
    servingsByFood,
    loading,
    error,
    refresh,
    addFood,
    updateFood,
    deleteFood,
    toggleFrequent,
  };
}

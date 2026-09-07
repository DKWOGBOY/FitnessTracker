import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Food, FoodInput } from "../lib/types";

export function useFoods() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("foods")
        .select("*")
        .order("name", { ascending: true });
      if (err) setError(err.message);
      else setFoods((data ?? []) as Food[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load foods.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addFood(input: FoodInput): Promise<Food> {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error: err } = await supabase
      .from("foods")
      .insert({ ...input, user_id: userData.user?.id })
      .select()
      .single();
    if (err) throw err;
    await refresh();
    return data as Food;
  }

  async function updateFood(id: string, input: Partial<FoodInput>) {
    const { error: err } = await supabase.from("foods").update(input).eq("id", id);
    if (err) throw err;
    await refresh();
  }

  async function deleteFood(id: string) {
    const { error: err } = await supabase.from("foods").delete().eq("id", id);
    if (err) throw err;
    await refresh();
  }

  async function toggleFrequent(id: string, isFrequent: boolean) {
    await updateFood(id, { is_frequent: isFrequent });
  }

  return { foods, loading, error, refresh, addFood, updateFood, deleteFood, toggleFrequent };
}

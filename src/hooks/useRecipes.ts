import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { RecipeDetail } from "../lib/recipeApi";
import type { Food, FoodServing, Recipe } from "../lib/types";

/** Manages the local `recipes` cache (search/detail results the user has
 * viewed, favorites) and lazily creates the loggable `foods` row for a
 * recipe the first time it's actually logged. */
export function useRecipes() {
  const [cached, setCached] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("recipes").select("*").order("cached_at", { ascending: false });
      setCached((data ?? []) as Recipe[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Upserts the cache row for a recipe the user just viewed (search result
   * or detail view) - user_id defaults to auth.uid() server-side. */
  async function cacheRecipe(detail: RecipeDetail): Promise<Recipe> {
    const { data, error } = await supabase
      .from("recipes")
      .upsert(
        {
          source_id: detail.sourceId,
          title: detail.title,
          image_url: detail.imageUrl,
          servings: detail.servings,
          ready_in_minutes: detail.readyInMinutes,
          calories_per_serving: detail.caloriesPerServing,
          protein_g_per_serving: detail.proteinGPerServing,
          carbs_g_per_serving: detail.carbsGPerServing,
          fat_g_per_serving: detail.fatGPerServing,
          fiber_g_per_serving: detail.fiberGPerServing,
          sugar_g_per_serving: detail.sugarGPerServing,
          sodium_mg_per_serving: detail.sodiumMgPerServing,
          ingredients: detail.ingredients,
          instructions: detail.instructions,
          cached_at: new Date().toISOString(),
        },
        { onConflict: "user_id,source_id" },
      )
      .select()
      .single();
    if (error) throw error;
    const row = data as Recipe;
    setCached((prev) => {
      const existing = prev.find((r) => r.id === row.id);
      return existing ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev];
    });
    return row;
  }

  async function toggleFavorite(id: string, isFavorite: boolean) {
    const { error } = await supabase.from("recipes").update({ is_favorite: isFavorite }).eq("id", id);
    if (error) throw error;
    setCached((prev) => prev.map((r) => (r.id === id ? { ...r, is_favorite: isFavorite } : r)));
  }

  /** Returns the loggable food + its "1 serving" serving for this recipe,
   * creating them the first time (mirrors the meal-preset aggregate trick:
   * grams_equivalent=100 on a single serving row so quantity 1 logs exactly
   * the per-serving macros already cached on the recipe). */
  async function ensureFoodForRecipe(recipe: Recipe): Promise<{ food: Food; serving: FoodServing }> {
    if (recipe.food_id) {
      const [{ data: food }, { data: serving }] = await Promise.all([
        supabase.from("foods").select("*").eq("id", recipe.food_id).maybeSingle(),
        supabase.from("food_servings").select("*").eq("food_id", recipe.food_id).maybeSingle(),
      ]);
      if (food && serving) return { food: food as Food, serving: serving as FoodServing };
    }

    const { data: food, error } = await supabase
      .from("foods")
      .insert({
        name: recipe.title,
        calories: recipe.calories_per_serving,
        protein_g: recipe.protein_g_per_serving,
        carbs_g: recipe.carbs_g_per_serving,
        fat_g: recipe.fat_g_per_serving,
        fiber_g: recipe.fiber_g_per_serving,
        sugar_g: recipe.sugar_g_per_serving,
        sodium_mg: recipe.sodium_mg_per_serving,
        base_unit: "g",
        source: "spoonacular",
        source_id: recipe.source_id,
        is_frequent: false,
        is_verified: true,
      })
      .select()
      .single();
    if (error) throw error;

    const { data: serving, error: servErr } = await supabase
      .from("food_servings")
      .insert({ food_id: food.id, label: "1 serving", grams_equivalent: 100, is_default: true })
      .select()
      .single();
    if (servErr) throw servErr;

    await supabase.from("recipes").update({ food_id: food.id }).eq("id", recipe.id);
    setCached((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, food_id: food.id } : r)));

    return { food: food as Food, serving: serving as FoodServing };
  }

  return { cached, loading, refresh, cacheRecipe, toggleFavorite, ensureFoodForRecipe };
}

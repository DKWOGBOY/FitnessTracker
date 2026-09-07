import { supabase } from "./supabase";
import type { Food, FoodInput, ServingUnit } from "./types";

/**
 * Normalization layer: every external food API response is mapped into this
 * canonical shape before it is shown to the user or written to `foods`.
 * All macros are per-100g/100ml; serving_unit is restricted to a fixed enum.
 */
export interface NormalizedFoodCandidate extends FoodInput {
  source: "off" | "usda";
  source_id: string;
}

function normalizeUnit(raw: string | undefined | null): ServingUnit {
  const u = (raw ?? "").trim().toLowerCase();
  if (u.startsWith("ml") || u.includes("milliliter")) return "ml";
  if (u.startsWith("oz") || u.includes("ounce")) return "oz";
  if (u.includes("piece") || u.includes("serving") || u.includes("unit")) return "piece";
  return "g";
}

// --- Open Food Facts -------------------------------------------------------

interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number>;
}

export async function searchOpenFoodFacts(
  query: string,
): Promise<NormalizedFoodCandidate[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query,
  )}&search_simple=1&action=process&json=1&page_size=20`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`);
  const data = await res.json();
  const products: OffProduct[] = data.products ?? [];

  return products
    .filter((p) => p.product_name && p.nutriments?.["energy-kcal_100g"] != null)
    .map((p) => {
      const n = p.nutriments!;
      const name = p.brands ? `${p.product_name} (${p.brands})` : p.product_name!;
      return {
        name,
        calories: n["energy-kcal_100g"] ?? 0,
        protein_g: n["proteins_100g"] ?? 0,
        carbs_g: n["carbohydrates_100g"] ?? 0,
        fat_g: n["fat_100g"] ?? 0,
        serving_size: 100,
        serving_unit: normalizeUnit(p.serving_size),
        is_frequent: false,
        source: "off" as const,
        source_id: p.code,
      };
    });
}

// --- USDA FoodData Central --------------------------------------------------

interface UsdaNutrient {
  nutrientName: string;
  value: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  foodNutrients: UsdaNutrient[];
}

function usdaNutrient(nutrients: UsdaNutrient[], name: string): number {
  return nutrients.find((n) => n.nutrientName === name)?.value ?? 0;
}

export async function searchUsda(
  query: string,
  apiKey: string,
): Promise<NormalizedFoodCandidate[]> {
  if (!apiKey) throw new Error("USDA API key is not configured (VITE_USDA_API_KEY).");

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
    query,
  )}&pageSize=20&api_key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`);
  const data = await res.json();
  const foods: UsdaFood[] = data.foods ?? [];

  return foods.map((f) => ({
    name: f.description,
    calories: usdaNutrient(f.foodNutrients, "Energy"),
    protein_g: usdaNutrient(f.foodNutrients, "Protein"),
    carbs_g: usdaNutrient(f.foodNutrients, "Carbohydrate, by difference"),
    fat_g: usdaNutrient(f.foodNutrients, "Total lipid (fat)"),
    serving_size: 100,
    serving_unit: "g" as const,
    is_frequent: false,
    source: "usda" as const,
    source_id: String(f.fdcId),
  }));
}

// --- Dedup safeguard --------------------------------------------------------

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function macrosClose(a: NormalizedFoodCandidate, b: Food, tolerancePct = 8): boolean {
  const within = (x: number, y: number) => {
    if (x === 0 && y === 0) return true;
    const denom = Math.max(Math.abs(x), Math.abs(y), 1);
    return (Math.abs(x - y) / denom) * 100 <= tolerancePct;
  };
  return (
    within(a.calories, b.calories) &&
    within(a.protein_g, b.protein_g) &&
    within(a.carbs_g, b.carbs_g) &&
    within(a.fat_g, b.fat_g)
  );
}

/**
 * Checks the personal `foods` table for an existing entry that matches a
 * newly-fetched API candidate: exact source+source_id recall first, then a
 * fuzzy name+macro match to catch the same food added twice from different
 * sources. Returns the existing row if one is found, otherwise null.
 */
export async function findExistingMatch(
  candidate: NormalizedFoodCandidate,
): Promise<Food | null> {
  const { data: exact } = await supabase
    .from("foods")
    .select("*")
    .eq("source", candidate.source)
    .eq("source_id", candidate.source_id)
    .maybeSingle();
  if (exact) return exact as Food;

  const { data: all } = await supabase.from("foods").select("*");
  if (!all) return null;

  const candidateName = normalizeName(candidate.name);
  const fuzzy = (all as Food[]).find(
    (f) => normalizeName(f.name) === candidateName && macrosClose(candidate, f),
  );
  return fuzzy ?? null;
}

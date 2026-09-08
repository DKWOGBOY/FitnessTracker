import { supabase } from "./supabase";
import type { Food, FoodInput } from "./types";

/** CalorieAPI doesn't send Access-Control-Allow-Origin, so a browser blocks
 * calling it directly - every request instead goes through this app's own
 * Netlify Function (netlify/functions/calorieapi.mts), which holds the real
 * API key server-side and forwards the request. */
const PROXY_BASE = "/.netlify/functions/calorieapi";

/**
 * Normalization layer: the CalorieAPI response is mapped into this
 * canonical shape before it is shown to the user or written to `foods`.
 * All macros are per-100g (CalorieAPI doesn't do per-100ml liquids
 * separately - grams is its universal basis). `extraServings` holds any
 * named portion CalorieAPI supplied (its `verified_portions`), on top of
 * the mandatory 100g serving every food gets automatically at insert time.
 */
export interface NormalizedFoodCandidate extends FoodInput {
  source: "calorieapi";
  source_id: string;
  extraServings: { label: string; grams_equivalent: number; is_default?: boolean }[];
}

export interface FoodSuggestion {
  id: number;
  name: string;
  /** CalorieAPI overloads this field: a real brand name, "" for none, or
   * literally the string "Verified" for a verified generic (non-branded)
   * food - see `isVerifiedSuggestion`. */
  brand_name: string | null;
}

export function isVerifiedSuggestion(s: FoodSuggestion): boolean {
  return s.brand_name === "Verified";
}

export function brandLabel(s: FoodSuggestion): string | null {
  return s.brand_name && s.brand_name !== "Verified" ? s.brand_name : null;
}

class CalorieApiError extends Error {}

/** Maps CalorieAPI's documented error responses to a specific, actionable
 * message instead of a generic "request failed". */
async function calorieApiFetch(query: string): Promise<any> {
  const res = await fetch(`${PROXY_BASE}?${query}`);
  if (res.ok) return res.json();

  switch (res.status) {
    case 429:
      throw new CalorieApiError("Search is rate-limited right now - wait a moment and try again.");
    case 402:
      throw new CalorieApiError("Monthly search quota reached - try again next billing cycle, or add the food manually.");
    case 403:
      throw new CalorieApiError("CalorieAPI request was rejected (plan/coverage limit) - try adding the food manually.");
    case 423:
      throw new CalorieApiError("CalorieAPI account is on a temporary hold - contact CalorieAPI support.");
    case 404:
      return null;
    case 500:
      throw new CalorieApiError("CalorieAPI key is not configured on the server.");
    default:
      throw new CalorieApiError(`Food search failed (${res.status}).`);
  }
}

/** Lightweight typeahead - cheap on quota, used purely to render a dropdown
 * of candidates before the user picks one. */
export async function suggestFoods(query: string): Promise<FoodSuggestion[]> {
  const data = await calorieApiFetch(`endpoint=suggest&q=${encodeURIComponent(query)}`);
  return (data ?? []) as FoodSuggestion[];
}

interface CalorieApiPortion {
  grams: number;
  label: string;
}

interface CalorieApiFood {
  id: number;
  name: string;
  brand_name?: string | null;
  is_verified: boolean;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  verified_portions?: CalorieApiPortion[];
  default_portion?: CalorieApiPortion;
}

/** Fetches the full food record once the user picks a suggestion - only
 * called on selection, not per keystroke, since it's the more expensive call. */
export async function getFoodDetails(id: number): Promise<NormalizedFoodCandidate> {
  const f = (await calorieApiFetch(`endpoint=food&id=${encodeURIComponent(String(id))}`)) as CalorieApiFood | null;
  if (!f) throw new CalorieApiError("That food could not be found.");

  const defaultGrams = f.default_portion?.grams;
  const portions = (f.verified_portions ?? []).filter((p) => p.grams !== 100);
  const extraServings = portions.map((p) => ({
    label: p.label,
    grams_equivalent: p.grams,
    is_default: defaultGrams != null && p.grams === defaultGrams,
  }));

  return {
    name: f.brand_name && f.brand_name !== "Verified" ? `${f.name} (${f.brand_name})` : f.name,
    calories: f.calories_100g,
    protein_g: f.protein_100g,
    carbs_g: f.carbs_100g,
    fat_g: f.fat_100g,
    base_unit: "g",
    is_frequent: false,
    is_verified: f.is_verified,
    source: "calorieapi",
    source_id: String(f.id),
    extraServings,
  };
}

// --- Dedup against locally-cached foods -------------------------------------

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
 * newly-fetched API candidate: exact source+source_id recall first (the
 * food was already imported before), then a fuzzy name+macro match to
 * catch the same food added twice. Returns the existing row if found.
 */
export async function findExistingMatch(candidate: NormalizedFoodCandidate): Promise<Food | null> {
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
  const fuzzy = (all as Food[]).find((f) => normalizeName(f.name) === candidateName && macrosClose(candidate, f));
  return fuzzy ?? null;
}

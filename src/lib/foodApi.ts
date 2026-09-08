import { supabase } from "./supabase";
import type { BaseUnit, Food, FoodInput } from "./types";

/**
 * Normalization layer: every external food API response is mapped into this
 * canonical shape before it is shown to the user or written to `foods`.
 * All macros are per-100g/100ml. `extraServings` holds any named serving
 * (e.g. "1 cup (240ml)") the source API supplied, on top of the mandatory
 * 100g/100ml serving every food gets automatically at insert time.
 */
export interface NormalizedFoodCandidate extends FoodInput {
  source: "off" | "usda";
  source_id: string;
  extraServings: { label: string; grams_equivalent: number }[];
  /** Ranking signals used by `rankCandidates` - not persisted to `foods`. */
  isAustralian?: boolean;
  isGeneric?: boolean;
  popularity?: number;
  recommended?: boolean;
}

/** Parses a raw serving-size string like "30 g" or "1 cup (240 ml)" into a
 * label + gram/ml amount. Returns null if no g/ml quantity can be found. */
function parseServingString(raw: string | undefined | null): { label: string; grams_equivalent: number } | null {
  if (!raw) return null;
  const match = raw.match(/([\d.]+)\s*(kg|g|l|ml)\b/i);
  if (!match) return null;
  let value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = match[2].toLowerCase();
  if (unit === "kg" || unit === "l") value *= 1000;
  return { label: raw.trim(), grams_equivalent: value };
}

// --- Open Food Facts -------------------------------------------------------

interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number>;
  countries_tags?: string[];
  unique_scans_n?: number;
}

function offEnergy(n: Record<string, number>): { value: number; unit: BaseUnit } | null {
  if (n["energy-kcal_100g"] != null) return { value: n["energy-kcal_100g"], unit: "g" };
  if (n["energy-kcal_100ml"] != null) return { value: n["energy-kcal_100ml"], unit: "ml" };
  return null;
}

export async function searchOpenFoodFacts(
  query: string,
): Promise<NormalizedFoodCandidate[]> {
  const fields = "code,product_name,brands,serving_size,nutriments,countries_tags,unique_scans_n";
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query,
  )}&search_simple=1&action=process&json=1&page_size=20&fields=${fields}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`);
  const data = await res.json();
  const products: OffProduct[] = data.products ?? [];

  return products
    .filter((p) => p.product_name && p.nutriments && offEnergy(p.nutriments))
    .map((p) => {
      const n = p.nutriments!;
      const energy = offEnergy(n)!;
      const suffix = energy.unit === "ml" ? "_100ml" : "_100g";
      const name = p.brands ? `${p.product_name} (${p.brands})` : p.product_name!;
      const extra = parseServingString(p.serving_size);
      return {
        name,
        calories: energy.value,
        protein_g: n[`proteins${suffix}`] ?? 0,
        carbs_g: n[`carbohydrates${suffix}`] ?? 0,
        fat_g: n[`fat${suffix}`] ?? 0,
        base_unit: energy.unit,
        is_frequent: false,
        source: "off" as const,
        source_id: p.code,
        extraServings: extra ? [extra] : [],
        isAustralian: p.countries_tags?.includes("en:australia") ?? false,
        isGeneric: !p.brands,
        popularity: p.unique_scans_n ?? 0,
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
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  /** "Foundation"/"SR Legacy" are plain generic foods; "Branded" is a specific product. */
  dataType?: string;
}

/** Foundation/SR Legacy/Survey entries are generic ("Chicken, breast, raw");
 * Branded entries are specific packaged products. Higher = more standard. */
function usdaGenericRank(dataType: string | undefined): number {
  switch (dataType) {
    case "Foundation":
      return 3;
    case "SR Legacy":
      return 2;
    case "Survey (FNDDS)":
      return 1;
    default:
      return 0;
  }
}

function usdaNutrient(nutrients: UsdaNutrient[], name: string): number {
  return nutrients.find((n) => n.nutrientName === name)?.value ?? 0;
}

function usdaServingUnit(raw: string | undefined): BaseUnit | null {
  const u = (raw ?? "").trim().toLowerCase();
  if (u.startsWith("g")) return "g";
  if (u.startsWith("ml")) return "ml";
  return null;
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

  return foods.map((f) => {
    const servingUnit = usdaServingUnit(f.servingSizeUnit);
    const extraServings =
      f.servingSize && servingUnit
        ? [
            {
              label: f.householdServingFullText?.trim() || `${f.servingSize}${servingUnit} serving`,
              grams_equivalent: f.servingSize,
            },
          ]
        : [];
    return {
      name: f.description,
      calories: usdaNutrient(f.foodNutrients, "Energy"),
      protein_g: usdaNutrient(f.foodNutrients, "Protein"),
      carbs_g: usdaNutrient(f.foodNutrients, "Carbohydrate, by difference"),
      fat_g: usdaNutrient(f.foodNutrients, "Total lipid (fat)"),
      base_unit: "g" as const,
      is_frequent: false,
      source: "usda" as const,
      source_id: String(f.fdcId),
      extraServings,
      isGeneric: usdaGenericRank(f.dataType) >= 2,
      popularity: usdaGenericRank(f.dataType) * 25,
    };
  });
}

// --- Ranking ----------------------------------------------------------------

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** How closely a candidate's name matches the search query: exact/prefix
 * matches score highest, word-overlap scores partially, and each extra word
 * beyond the query (brand names, prep descriptors) is penalized - a plain
 * "Chicken Breast" should outrank "Chicken Breast Fillets Crumbed Frozen". */
function nameMatchScore(name: string, query: string): number {
  const n = normalizeName(name);
  const q = normalizeName(query);
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  const nWords = n.split(" ");
  const qWords = q.split(" ");
  const qSet = new Set(qWords);
  const overlap = nWords.filter((w) => qSet.has(w)).length;
  if (overlap === 0) return 0;
  const extraWords = Math.max(0, nWords.length - qWords.length);
  return overlap * 15 - extraWords * 4;
}

/**
 * Sorts search results so the most "standard" match comes first: close name
 * match, generic (unbranded / Foundation-USDA) foods over specific branded
 * products, Australian products preferred, then popularity as a tiebreak.
 * Flags the single best match as `recommended` when it's a strong, generic
 * match for the query - the UI shows this with a green star.
 */
export function rankCandidates(
  candidates: NormalizedFoodCandidate[],
  query: string,
): NormalizedFoodCandidate[] {
  const scored = candidates.map((c) => {
    const nameScore = nameMatchScore(c.name, query);
    const genericBonus = c.isGeneric ? 30 : 0;
    const auBonus = c.isAustralian ? 20 : 0;
    const popularityBonus = Math.min(20, Math.log10((c.popularity ?? 0) + 1) * 8);
    return { candidate: c, nameScore, score: nameScore + genericBonus + auBonus + popularityBonus };
  });
  scored.sort((a, b) => b.score - a.score);

  return scored.map(({ candidate, nameScore }, i) => ({
    ...candidate,
    recommended: i === 0 && candidate.isGeneric === true && nameScore >= 30,
  }));
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

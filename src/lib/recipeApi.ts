const PROXY_BASE = "/.netlify/functions/spoonacular";

export class RecipeApiError extends Error {}

export interface QuotaInfo {
  left: number | null;
  used: number | null;
}

export interface RecipeSummary {
  sourceId: string;
  title: string;
  imageUrl: string | null;
  servings: number | null;
  readyInMinutes: number | null;
  caloriesPerServing: number;
  proteinGPerServing: number;
  carbsGPerServing: number;
  fatGPerServing: number;
}

export interface RecipeDetail extends RecipeSummary {
  fiberGPerServing: number | null;
  sugarGPerServing: number | null;
  sodiumMgPerServing: number | null;
  ingredients: string[];
  instructions: string[];
}

export interface RecipeSearchParams {
  query?: string;
  diet?: string;
  maxReadyTime?: number;
  minProtein?: number;
  maxCalories?: number;
  minCalories?: number;
  maxCarbs?: number;
  minCarbs?: number;
  maxFat?: number;
  minFat?: number;
  number?: number;
  cuisine?: string;
  type?: string;
  /** Comma-separated - Spoonacular allows several intolerances at once. */
  intolerances?: string;
  includeIngredients?: string;
  excludeIngredients?: string;
  sort?: string;
}

interface SpoonacularNutrient {
  name: string;
  amount: number;
  unit: string;
}

function findNutrient(nutrients: SpoonacularNutrient[] | undefined, name: string): number | null {
  const n = nutrients?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return n ? n.amount : null;
}

async function proxyFetch(query: string): Promise<{ body: any; quota: QuotaInfo }> {
  const res = await fetch(`${PROXY_BASE}?${query}`);
  const quota: QuotaInfo = {
    left: res.headers.get("x-api-quota-left") ? parseFloat(res.headers.get("x-api-quota-left")!) : null,
    used: res.headers.get("x-api-quota-used") ? parseFloat(res.headers.get("x-api-quota-used")!) : null,
  };

  if (res.ok) return { body: await res.json(), quota };

  switch (res.status) {
    case 402:
      throw new RecipeApiError("Daily recipe search quota reached - try again tomorrow, or add the meal manually.");
    case 401:
    case 403:
      throw new RecipeApiError("Recipe search request was rejected - check the Spoonacular API key.");
    case 404:
      throw new RecipeApiError("That recipe could not be found.");
    case 500:
      throw new RecipeApiError("Spoonacular key is not configured on the server.");
    default:
      throw new RecipeApiError(`Recipe search failed (${res.status}).`);
  }
}

interface SpoonacularSearchResult {
  id: number;
  title: string;
  image?: string | null;
  servings?: number | null;
  readyInMinutes?: number | null;
  nutrition?: { nutrients: SpoonacularNutrient[] };
}

function normalizeSummary(r: SpoonacularSearchResult): RecipeSummary {
  const nutrients = r.nutrition?.nutrients;
  return {
    sourceId: String(r.id),
    title: r.title,
    imageUrl: r.image ?? null,
    servings: r.servings ?? null,
    readyInMinutes: r.readyInMinutes ?? null,
    caloriesPerServing: findNutrient(nutrients, "Calories") ?? 0,
    proteinGPerServing: findNutrient(nutrients, "Protein") ?? 0,
    carbsGPerServing: findNutrient(nutrients, "Carbohydrates") ?? 0,
    fatGPerServing: findNutrient(nutrients, "Fat") ?? 0,
  };
}

/** `number` defaults to a modest 12 server-side (see spoonacular.mts) -
 * complexSearch's cost scales with result count plus nutrition/filter
 * flags, so keeping this low matters for the free tier's daily cap. */
export async function searchRecipes(params: RecipeSearchParams): Promise<{ results: RecipeSummary[]; quota: QuotaInfo }> {
  const query = new URLSearchParams({ endpoint: "search" });
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") query.set(key, String(value));
  }
  const { body, quota } = await proxyFetch(query.toString());
  const results = ((body?.results ?? []) as SpoonacularSearchResult[]).map(normalizeSummary);
  return { results, quota };
}

interface SpoonacularRecipeDetail extends SpoonacularSearchResult {
  extendedIngredients?: { original: string }[];
  analyzedInstructions?: { steps: { step: string }[] }[];
}

export async function getRecipeDetail(sourceId: string): Promise<{ detail: RecipeDetail; quota: QuotaInfo }> {
  const { body, quota } = await proxyFetch(`endpoint=detail&id=${encodeURIComponent(sourceId)}`);
  const r = body as SpoonacularRecipeDetail;
  const nutrients = r.nutrition?.nutrients;
  const instructions = (r.analyzedInstructions ?? []).flatMap((group) => group.steps.map((s) => s.step));

  const detail: RecipeDetail = {
    ...normalizeSummary(r),
    fiberGPerServing: findNutrient(nutrients, "Fiber"),
    sugarGPerServing: findNutrient(nutrients, "Sugar"),
    sodiumMgPerServing: findNutrient(nutrients, "Sodium"),
    ingredients: (r.extendedIngredients ?? []).map((i) => i.original),
    instructions,
  };
  return { detail, quota };
}

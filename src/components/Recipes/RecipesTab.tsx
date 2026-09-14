import { useState } from "react";
import { searchRecipes, RecipeApiError, type QuotaInfo, type RecipeSearchParams, type RecipeSummary } from "../../lib/recipeApi";
import { useRecipes } from "../../hooks/useRecipes";
import { useTargets } from "../../hooks/useTargets";
import { useLogAggregates } from "../../hooks/useLogAggregates";
import { todayStr } from "../../lib/dates";
import { IconCheck, IconFilter, IconSearch, IconShuffle } from "../icons";
import Energy from "../Energy";
import RecipeDetailModal from "./RecipeDetailModal";

const DIET_OPTIONS = [
  { value: "", label: "Any diet" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescetarian", label: "Pescatarian" },
  { value: "ketogenic", label: "Keto" },
  { value: "paleo", label: "Paleo" },
];

const CUISINE_OPTIONS = [
  "African", "American", "British", "Cajun", "Caribbean", "Chinese", "Eastern European",
  "European", "French", "German", "Greek", "Indian", "Irish", "Italian", "Japanese",
  "Jewish", "Korean", "Latin American", "Mediterranean", "Mexican", "Middle Eastern",
  "Nordic", "Southern", "Spanish", "Thai", "Vietnamese",
];

/** Spoonacular's own intolerance vocabulary has "Peanut" and "Tree Nut" as
 * separate values with no combined "Nuts" option - one "Nuts" chip here
 * maps to both underlying values so avoiding nuts is a single tap. */
const INTOLERANCE_OPTIONS: { label: string; values: string[] }[] = [
  { label: "Dairy", values: ["Dairy"] },
  { label: "Egg", values: ["Egg"] },
  { label: "Gluten", values: ["Gluten"] },
  { label: "Grain", values: ["Grain"] },
  { label: "Nuts", values: ["Peanut", "Tree Nut"] },
  { label: "Seafood", values: ["Seafood"] },
  { label: "Sesame", values: ["Sesame"] },
  { label: "Shellfish", values: ["Shellfish"] },
  { label: "Soy", values: ["Soy"] },
  { label: "Sulfite", values: ["Sulfite"] },
  { label: "Wheat", values: ["Wheat"] },
];

interface RemainingMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export default function RecipesTab() {
  const { cached, cacheRecipe, toggleFavorite, ensureFoodForRecipe } = useRecipes();
  const { targetForDate } = useTargets();
  const target = targetForDate(todayStr());
  const { totals: consumed } = useLogAggregates(todayStr(), todayStr());

  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [maxReadyTime, setMaxReadyTime] = useState("");
  const [includeIngredients, setIncludeIngredients] = useState("");
  const [excludeIngredients, setExcludeIngredients] = useState("");
  const [avoid, setAvoid] = useState<Set<string>>(new Set());
  const [fitMacros, setFitMacros] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [results, setResults] = useState<RecipeSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [openSourceId, setOpenSourceId] = useState<string | null>(null);

  const favorites = cached.filter((r) => r.is_favorite);
  const activeFilterCount = (fitMacros ? 1 : 0) + avoid.size;

  const remaining: RemainingMacros | null = target
    ? {
        calories: target.calories - consumed.calories,
        protein_g: target.protein_g - consumed.protein_g,
        carbs_g: target.carbs_g - consumed.carbs_g,
        fat_g: target.fat_g - consumed.fat_g,
      }
    : null;

  function toggleAvoid(name: string) {
    setAvoid((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const params: RecipeSearchParams = {};
      if (query.trim()) params.query = query.trim();
      if (diet) params.diet = diet;
      if (cuisine) params.cuisine = cuisine;
      if (maxReadyTime) params.maxReadyTime = parseFloat(maxReadyTime);
      if (maxCalories) params.maxCalories = parseFloat(maxCalories);
      if (avoid.size > 0) {
        const values = INTOLERANCE_OPTIONS.filter((o) => avoid.has(o.label)).flatMap((o) => o.values);
        params.intolerances = values.join(",");
      }
      if (includeIngredients.trim()) params.includeIngredients = includeIngredients.trim();
      if (excludeIngredients.trim()) params.excludeIngredients = excludeIngredients.trim();

      if (fitMacros && remaining) {
        // A soft floor on protein (not the full remaining amount) so the
        // filter doesn't demand one recipe single-handedly finish the
        // day's protein target - it should just meaningfully contribute.
        if (remaining.calories > 0) params.maxCalories = Math.round(remaining.calories);
        if (remaining.protein_g > 0) params.minProtein = Math.round(remaining.protein_g * 0.4);
        if (remaining.carbs_g > 0) params.maxCarbs = Math.round(remaining.carbs_g);
        if (remaining.fat_g > 0) params.maxFat = Math.round(remaining.fat_g);
      }

      const { results, quota } = await searchRecipes(params);
      setResults(results);
      setQuota(quota);
    } catch (err) {
      setError(err instanceof RecipeApiError ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch();
  }

  function handleApplyFilters() {
    setSheetOpen(false);
    runSearch();
  }

  return (
    <div className="tab-page page-transition-in">
      <h2 style={{ marginBottom: 16 }}>Recipes</h2>

      <form onSubmit={handleSearchSubmit} className="recipe-search-row">
        <div className="search-pill">
          <IconSearch className="icon" />
          <input
            type="search"
            placeholder="Search recipes, ingredients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="button" className="filter-btn" aria-label="Filters" onClick={() => setSheetOpen(true)}>
          <IconFilter className="icon" />
          {activeFilterCount > 0 && <span className="filter-btn-badge">{activeFilterCount}</span>}
        </button>
      </form>

      <button
        type="button"
        className="btn btn-secondary btn-block"
        style={{ marginTop: 10 }}
        onClick={() => setOpenSourceId("random")}
      >
        <IconShuffle className="icon" /> Surprise me
      </button>

      {quota && quota.left != null && (
        <p className="text-muted" style={{ fontSize: 11, textAlign: "center", marginTop: 8, marginBottom: 0 }}>
          {Math.max(0, Math.floor(quota.left))} recipe searches left today
        </p>
      )}

      {error && (
        <p className="error-text" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      {results === null && favorites.length > 0 && (
        <>
          <div className="recipe-meta-row">
            <span className="recipe-count">Favorites</span>
          </div>
          <RecipeList recipes={favorites.map(recipeToSummary)} onOpen={setOpenSourceId} />
        </>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <div className="spinner" />
        </div>
      ) : results !== null ? (
        <>
          <div className="recipe-meta-row">
            <span className="recipe-count">{results.length} recipe{results.length === 1 ? "" : "s"}</span>
            <button type="button" className="recipe-sort" onClick={() => setSheetOpen(true)}>
              Filters
            </button>
          </div>
          {results.length === 0 ? (
            <div className="empty" style={{ textAlign: "center", padding: "44px 0" }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>Nothing matches those filters</h3>
              <p className="text-muted" style={{ marginTop: 10, fontSize: 14 }}>
                Try clearing "Fits my remaining macros today", or widen the max kcal.
              </p>
            </div>
          ) : (
            <RecipeList recipes={results} onOpen={setOpenSourceId} />
          )}
        </>
      ) : null}

      {sheetOpen && (
        <div className="sheet-overlay" onClick={() => setSheetOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grabber" />
            <div className="sheet-head">
              <h2>Filters</h2>
              <button type="button" className="sheet-done" onClick={() => setSheetOpen(false)}>
                Done
              </button>
            </div>

            <button
              type="button"
              className={fitMacros ? "fits-row active" : "fits-row"}
              onClick={() => setFitMacros((v) => !v)}
            >
              <span className="fits-box">
                <IconCheck className="icon" />
              </span>
              <span style={{ flex: 1 }}>
                <span className="fits-label" style={{ display: "block" }}>
                  Fits my remaining macros today
                </span>
                <span className="fits-sub" style={{ display: "block" }}>
                  {remaining
                    ? `${Math.round(remaining.calories).toLocaleString()} kcal · ${Math.round(remaining.protein_g)}P · ${Math.round(remaining.carbs_g)}C · ${Math.round(remaining.fat_g)}F left`
                    : "Set a target in Settings to use this"}
                </span>
              </span>
            </button>

            <div className="field-row" style={{ marginTop: 18 }}>
              <div className="field">
                <label>Diet</label>
                <select value={diet} onChange={(e) => setDiet(e.target.value)}>
                  {DIET_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Cuisine</label>
                <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                  <option value="">Any</option>
                  {CUISINE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Max kcal</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Any"
                  value={maxCalories}
                  onChange={(e) => setMaxCalories(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Max mins</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Any"
                  value={maxReadyTime}
                  onChange={(e) => setMaxReadyTime(e.target.value)}
                />
              </div>
            </div>

            <div className="field-row" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Include</label>
                <input
                  type="text"
                  placeholder="e.g. chicken, rice"
                  value={includeIngredients}
                  onChange={(e) => setIncludeIngredients(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Exclude</label>
                <input
                  type="text"
                  placeholder="e.g. peanuts"
                  value={excludeIngredients}
                  onChange={(e) => setExcludeIngredients(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="section-title" style={{ margin: "0 0 8px" }}>
                Avoid
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {INTOLERANCE_OPTIONS.map(({ label }) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => toggleAvoid(label)}
                    className={avoid.has(label) ? "range-toggle-chip active" : "range-toggle-chip"}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={handleApplyFilters}>
              Show recipes
            </button>
          </div>
        </div>
      )}

      {openSourceId && (
        <RecipeDetailModal
          sourceId={openSourceId}
          cached={cached}
          cacheRecipe={cacheRecipe}
          toggleFavorite={toggleFavorite}
          ensureFoodForRecipe={ensureFoodForRecipe}
          onClose={() => setOpenSourceId(null)}
          onLogged={() => {}}
        />
      )}
    </div>
  );
}

function recipeToSummary(r: {
  source_id: string;
  title: string;
  image_url: string | null;
  servings: number | null;
  ready_in_minutes: number | null;
  calories_per_serving: number;
  protein_g_per_serving: number;
  carbs_g_per_serving: number;
  fat_g_per_serving: number;
}): RecipeSummary {
  return {
    sourceId: r.source_id,
    title: r.title,
    imageUrl: r.image_url,
    servings: r.servings,
    readyInMinutes: r.ready_in_minutes,
    caloriesPerServing: r.calories_per_serving,
    proteinGPerServing: r.protein_g_per_serving,
    carbsGPerServing: r.carbs_g_per_serving,
    fatGPerServing: r.fat_g_per_serving,
  };
}

function RecipeList({ recipes, onOpen }: { recipes: RecipeSummary[]; onOpen: (sourceId: string) => void }) {
  return (
    <div className="recipe-list">
      {recipes.map((r) => (
        <button key={r.sourceId} className="recipe-card" onClick={() => onOpen(r.sourceId)}>
          {r.imageUrl ? (
            <img src={r.imageUrl} alt="" className="recipe-thumb" />
          ) : (
            <div className="recipe-thumb" />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="recipe-card-name">{r.title}</div>
            <div className="recipe-card-meta">
              <Energy kcal={r.caloriesPerServing} /> · {Math.round(r.proteinGPerServing)}P /{" "}
              {Math.round(r.carbsGPerServing)}C / {Math.round(r.fatGPerServing)}F
            </div>
            {r.readyInMinutes && <span className="recipe-card-tag">{r.readyInMinutes} min</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

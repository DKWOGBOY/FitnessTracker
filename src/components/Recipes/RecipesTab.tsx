import { useState } from "react";
import { searchRecipes, RecipeApiError, type QuotaInfo, type RecipeSearchParams, type RecipeSummary } from "../../lib/recipeApi";
import { useRecipes } from "../../hooks/useRecipes";
import { useTargets } from "../../hooks/useTargets";
import { useLogAggregates } from "../../hooks/useLogAggregates";
import { todayStr } from "../../lib/dates";
import { IconSearch, IconStar } from "../icons";
import Energy from "../Energy";
import RecipeDetailModal from "./RecipeDetailModal";

const DIET_OPTIONS = [
  { value: "", label: "Any diet" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten free", label: "Gluten free" },
  { value: "ketogenic", label: "Keto" },
  { value: "paleo", label: "Paleo" },
];

const CUISINE_OPTIONS = [
  "African", "American", "British", "Cajun", "Caribbean", "Chinese", "Eastern European",
  "European", "French", "German", "Greek", "Indian", "Irish", "Italian", "Japanese",
  "Jewish", "Korean", "Latin American", "Mediterranean", "Mexican", "Middle Eastern",
  "Nordic", "Southern", "Spanish", "Thai", "Vietnamese",
];

const MEAL_TYPE_OPTIONS = [
  { value: "main course", label: "Main course" },
  { value: "side dish", label: "Side dish" },
  { value: "breakfast", label: "Breakfast" },
  { value: "soup", label: "Soup" },
  { value: "salad", label: "Salad" },
  { value: "appetizer", label: "Appetizer" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
  { value: "beverage", label: "Beverage" },
  { value: "bread", label: "Bread" },
  { value: "sauce", label: "Sauce" },
];

const INTOLERANCE_OPTIONS = [
  "Dairy", "Egg", "Gluten", "Grain", "Peanut", "Seafood", "Sesame", "Shellfish", "Soy", "Sulfite", "Tree Nut", "Wheat",
];

const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "popularity", label: "Popularity" },
  { value: "healthiness", label: "Healthiness" },
  { value: "time", label: "Time" },
  { value: "calories", label: "Calories" },
  { value: "protein", label: "Protein" },
];

export default function RecipesTab() {
  const { cached, cacheRecipe, toggleFavorite, ensureFoodForRecipe } = useRecipes();
  const { targetForDate } = useTargets();
  const target = targetForDate(todayStr());
  const { totals: consumed } = useLogAggregates(todayStr(), todayStr());

  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [maxReadyTime, setMaxReadyTime] = useState("");
  const [fitMacros, setFitMacros] = useState(false);

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [cuisine, setCuisine] = useState("");
  const [mealType, setMealType] = useState("");
  const [intolerances, setIntolerances] = useState<Set<string>>(new Set());
  const [includeIngredients, setIncludeIngredients] = useState("");
  const [excludeIngredients, setExcludeIngredients] = useState("");
  const [sort, setSort] = useState("");

  const [results, setResults] = useState<RecipeSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [openSourceId, setOpenSourceId] = useState<string | null>(null);

  const favorites = cached.filter((r) => r.is_favorite);

  function toggleIntolerance(name: string) {
    setIntolerances((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params: RecipeSearchParams = {};
      if (query.trim()) params.query = query.trim();
      if (diet) params.diet = diet;
      if (maxReadyTime) params.maxReadyTime = parseFloat(maxReadyTime);
      if (maxCalories) params.maxCalories = parseFloat(maxCalories);
      if (cuisine) params.cuisine = cuisine;
      if (mealType) params.type = mealType;
      if (intolerances.size > 0) params.intolerances = [...intolerances].join(",");
      if (includeIngredients.trim()) params.includeIngredients = includeIngredients.trim();
      if (excludeIngredients.trim()) params.excludeIngredients = excludeIngredients.trim();
      if (sort) params.sort = sort;

      if (fitMacros && target) {
        const remainingCalories = target.calories - consumed.calories;
        const remainingProtein = target.protein_g - consumed.protein_g;
        const remainingCarbs = target.carbs_g - consumed.carbs_g;
        const remainingFat = target.fat_g - consumed.fat_g;
        // A soft floor on protein (not the full remaining amount) so the
        // filter doesn't demand one recipe single-handedly finish the
        // day's protein target - it should just meaningfully contribute.
        if (remainingCalories > 0) params.maxCalories = Math.round(remainingCalories);
        if (remainingProtein > 0) params.minProtein = Math.round(remainingProtein * 0.4);
        if (remainingCarbs > 0) params.maxCarbs = Math.round(remainingCarbs);
        if (remainingFat > 0) params.maxFat = Math.round(remainingFat);
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

  return (
    <div className="tab-page page-transition-in">
      <h2 style={{ marginBottom: 16 }}>Recipes</h2>

      <form onSubmit={handleSearch}>
        <div className="search-pill" style={{ marginBottom: 10 }}>
          <IconSearch className="icon" />
          <input
            type="text"
            placeholder="Search recipes, ingredients, cuisine..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="field-row" style={{ marginBottom: 10 }}>
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
            <label>Max kcal</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={maxCalories}
              onChange={(e) => setMaxCalories(e.target.value)}
              placeholder="Any"
            />
          </div>
          <div className="field">
            <label>Max mins</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={maxReadyTime}
              onChange={(e) => setMaxReadyTime(e.target.value)}
              placeholder="Any"
            />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginBottom: 10, paddingLeft: 0 }}
          onClick={() => setShowMoreFilters((v) => !v)}
        >
          {showMoreFilters ? "Hide more filters" : "More filters"}
        </button>

        {showMoreFilters && (
          <>
            <div className="field-row" style={{ marginBottom: 10 }}>
              <div className="field">
                <label>Cuisine</label>
                <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                  <option value="">Any cuisine</option>
                  {CUISINE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Meal type</label>
                <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                  <option value="">Any type</option>
                  {MEAL_TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row" style={{ marginBottom: 10 }}>
              <div className="field">
                <label>Include ingredients</label>
                <input
                  type="text"
                  placeholder="e.g. chicken, rice"
                  value={includeIngredients}
                  onChange={(e) => setIncludeIngredients(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Exclude ingredients</label>
                <input
                  type="text"
                  placeholder="e.g. peanuts"
                  value={excludeIngredients}
                  onChange={(e) => setExcludeIngredients(e.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 10 }}>
              <label>Sort by</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Intolerances</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {INTOLERANCE_OPTIONS.map((name) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => toggleIntolerance(name)}
                    className={intolerances.has(name) ? "range-toggle-chip active" : "range-toggle-chip"}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13 }}>
          <input type="checkbox" checked={fitMacros} onChange={(e) => setFitMacros(e.target.checked)} />
          Fits my remaining macros today{!target && " (set a target in Settings first)"}
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

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
          <div className="section-title">Favorites</div>
          <RecipeGrid recipes={favorites.map(recipeToSummary)} onOpen={setOpenSourceId} />
        </>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <div className="spinner" />
        </div>
      ) : results !== null ? (
        results.length === 0 ? (
          <p className="empty-state">No recipes matched - try loosening the filters.</p>
        ) : (
          <>
            <div className="section-title" style={{ marginTop: favorites.length > 0 ? 20 : 0 }}>
              Results
            </div>
            <RecipeGrid recipes={results} onOpen={setOpenSourceId} favoriteSourceIds={new Set(favorites.map((f) => f.source_id))} />
          </>
        )
      ) : null}

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

function recipeToSummary(r: { source_id: string; title: string; image_url: string | null; servings: number | null; ready_in_minutes: number | null; calories_per_serving: number; protein_g_per_serving: number; carbs_g_per_serving: number; fat_g_per_serving: number }): RecipeSummary {
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

function RecipeGrid({
  recipes,
  onOpen,
  favoriteSourceIds,
}: {
  recipes: RecipeSummary[];
  onOpen: (sourceId: string) => void;
  favoriteSourceIds?: Set<string>;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
      {recipes.map((r) => (
        <button
          key={r.sourceId}
          onClick={() => onOpen(r.sourceId)}
          className="card"
          style={{ padding: 0, overflow: "hidden", textAlign: "left", cursor: "pointer" }}
        >
          <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "var(--color-bg-alt)" }}>
            {r.imageUrl && (
              <img src={r.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
            {favoriteSourceIds?.has(r.sourceId) && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(0,0,0,0.45)",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <IconStar className="icon" filled />
              </span>
            )}
          </div>
          <div style={{ padding: 10 }}>
            <div className="list-row-title" style={{ fontSize: 13, whiteSpace: "normal" }}>
              {r.title}
            </div>
            <div className="list-row-sub" style={{ marginTop: 4 }}>
              <Energy kcal={r.caloriesPerServing} />
              {r.readyInMinutes ? ` · ${r.readyInMinutes} min` : ""}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

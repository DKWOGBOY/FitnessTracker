import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  getRandomRecipe,
  getRecipeDetail,
  getSimilarRecipes,
  RecipeApiError,
  type RecipeDetail,
  type SimilarRecipe,
} from "../../lib/recipeApi";
import { MEALS, type Food, type FoodServing, type Meal, type Recipe } from "../../lib/types";
import { todayStr } from "../../lib/dates";
import { IconArrowLeft, IconChevronDown, IconStar } from "../icons";
import Energy from "../Energy";

interface Props {
  sourceId: string;
  cached: Recipe[];
  cacheRecipe: (detail: RecipeDetail) => Promise<Recipe>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  ensureFoodForRecipe: (recipe: Recipe) => Promise<{ food: Food; serving: FoodServing }>;
  onClose: () => void;
  onLogged: () => void;
}

export default function RecipeDetailModal({
  sourceId,
  cached,
  cacheRecipe,
  toggleFavorite,
  ensureFoodForRecipe,
  onClose,
  onLogged,
}: Props) {
  // Local so tapping a "similar recipe" card can navigate within the same
  // modal instead of needing the parent to track a new id.
  const [viewingId, setViewingId] = useState(sourceId);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [cachedRow, setCachedRow] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [similar, setSimilar] = useState<SimilarRecipe[]>([]);
  const [showNutrients, setShowNutrients] = useState(false);

  const [meal, setMeal] = useState<Meal>("breakfast");
  const [quantity, setQuantity] = useState("1");
  const [logDate, setLogDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      setSimilar([]);
      setShowNutrients(false);
      try {
        const isRandom = viewingId === "random";
        const { detail } = isRandom ? await getRandomRecipe() : await getRecipeDetail(viewingId);
        if (cancelled) return;
        setDetail(detail);
        const row = await cacheRecipe(detail);
        if (!cancelled) setCachedRow(row);

        getSimilarRecipes(detail.sourceId)
          .then(({ results }) => {
            if (!cancelled) setSimilar(results);
          })
          .catch(() => {
            // similar recipes are a nice-to-have - a failure here shouldn't
            // block viewing/logging the recipe itself.
          });
      } catch (err) {
        if (!cancelled) setError(err instanceof RecipeApiError ? err.message : "Couldn't load that recipe.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingId]);

  // The hook's own cached-list state can go stale across renders of this
  // modal (it doesn't share state with whatever list opened it) - always
  // prefer the freshest row for this recipe once the list updates.
  useEffect(() => {
    const fresh = cached.find((r) => r.source_id === detail?.sourceId);
    if (fresh) setCachedRow(fresh);
  }, [cached, detail?.sourceId]);

  async function handleAddToLog() {
    if (!cachedRow) return;
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) return;
    setSaving(true);
    try {
      const { food, serving } = await ensureFoodForRecipe(cachedRow);
      // user_id defaults to auth.uid() server-side - no need to fetch/send it.
      const { error: err } = await supabase
        .from("food_logs")
        .insert({ food_id: food.id, log_date: logDate, meal, quantity: qty, serving_id: serving.id });
      if (err) throw err;
      onLogged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that to your log.");
    } finally {
      setSaving(false);
    }
  }

  const qty = parseFloat(quantity) || 1;
  const scaled = detail
    ? {
        calories: detail.caloriesPerServing * qty,
        protein_g: detail.proteinGPerServing * qty,
        carbs_g: detail.carbsGPerServing * qty,
        fat_g: detail.fatGPerServing * qty,
        fiber_g: detail.fiberGPerServing != null ? detail.fiberGPerServing * qty : null,
        sugar_g: detail.sugarGPerServing != null ? detail.sugarGPerServing * qty : null,
        sodium_mg: detail.sodiumMgPerServing != null ? detail.sodiumMgPerServing * qty : null,
      }
    : null;
  const hasExtendedNutrients = detail && (detail.fiberGPerServing != null || detail.sugarGPerServing != null || detail.sodiumMgPerServing != null);

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>Recipe</h3>
      </div>

      <div className="screen-body">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <div className="spinner" />
          </div>
        ) : error && !detail ? (
          <p className="error-text">{error}</p>
        ) : detail && scaled ? (
          <>
            {detail.imageUrl && (
              <img
                src={detail.imageUrl}
                alt=""
                style={{ width: "100%", borderRadius: "var(--radius-lg)", marginBottom: 16, display: "block" }}
              />
            )}

            <div className="flex-between" style={{ marginBottom: 4 }}>
              <h2 style={{ fontSize: 19, margin: 0 }}>{detail.title}</h2>
              {cachedRow && (
                <button
                  className="btn btn-ghost"
                  onClick={() => toggleFavorite(cachedRow.id, !cachedRow.is_favorite)}
                  aria-label={cachedRow.is_favorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <IconStar className={cachedRow.is_favorite ? "icon icon-star" : "icon"} filled={cachedRow.is_favorite} />
                </button>
              )}
            </div>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {detail.servings ? `Serves ${detail.servings}` : null}
              {detail.servings && detail.readyInMinutes ? " · " : null}
              {detail.readyInMinutes ? `${detail.readyInMinutes} min` : null}
            </p>

            <div className="card" style={{ background: "var(--color-surface-alt)", marginBottom: hasExtendedNutrients ? 0 : 20 }}>
              <div className="flex-between">
                <strong>
                  <Energy kcal={scaled.calories} />
                </strong>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  P {Math.round(scaled.protein_g)}g · C {Math.round(scaled.carbs_g)}g · F {Math.round(scaled.fat_g)}g
                </span>
              </div>
              <p className="text-muted" style={{ fontSize: 11, marginTop: 4, marginBottom: 0 }}>
                for {qty} serving{qty === 1 ? "" : "s"}
              </p>
            </div>

            {hasExtendedNutrients && (
              <div className="card" style={{ background: "var(--color-surface-alt)", marginBottom: 20, padding: 0 }}>
                <button
                  type="button"
                  className="flex-between"
                  style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => setShowNutrients((v) => !v)}
                  aria-expanded={showNutrients}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Nutrition facts</span>
                  <span
                    style={{
                      display: "inline-flex",
                      transform: showNutrients ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <IconChevronDown className="icon" />
                  </span>
                </button>
                {showNutrients && (
                  <div style={{ padding: "0 14px 12px" }}>
                    {detail.fiberGPerServing != null && (
                      <div className="list-row">
                        <span>Fiber</span>
                        <strong>{scaled.fiber_g!.toFixed(1)}g</strong>
                      </div>
                    )}
                    {detail.sugarGPerServing != null && (
                      <div className="list-row">
                        <span>Sugar</span>
                        <strong>{scaled.sugar_g!.toFixed(1)}g</strong>
                      </div>
                    )}
                    {detail.sodiumMgPerServing != null && (
                      <div className="list-row">
                        <span>Sodium</span>
                        <strong>{Math.round(scaled.sodium_mg!)}mg</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {detail.ingredients.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 0 }}>
                  Ingredients
                </div>
                <ul style={{ margin: "0 0 20px", paddingLeft: 20, fontSize: 14 }}>
                  {detail.ingredients.map((ing, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {ing}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {detail.instructions.length > 0 && (
              <>
                <div className="section-title">Instructions</div>
                <ol style={{ margin: "0 0 20px", paddingLeft: 20, fontSize: 14 }}>
                  {detail.instructions.map((step, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </>
            )}

            <div className="section-title">Add to log</div>
            <div className="field-row" style={{ marginBottom: 10 }}>
              <div className="field">
                <label>Meal</label>
                <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
                  {MEALS.map((m) => (
                    <option key={m} value={m}>
                      {m[0].toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Servings</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Date</label>
              <input type="date" value={logDate} max={todayStr()} onChange={(e) => setLogDate(e.target.value)} />
            </div>

            {error && (
              <p className="error-text" style={{ marginBottom: 12 }}>
                {error}
              </p>
            )}

            <button
              className="btn btn-primary btn-block"
              onClick={handleAddToLog}
              disabled={saving || !cachedRow || (parseFloat(quantity) || 0) <= 0}
            >
              {saving ? "Adding..." : "Add to log"}
            </button>

            {similar.length > 0 && (
              <>
                <div className="section-title">Similar recipes</div>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {similar.map((s) => (
                    <button
                      key={s.sourceId}
                      onClick={() => setViewingId(s.sourceId)}
                      style={{
                        flexShrink: 0,
                        width: 130,
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {s.imageUrl ? (
                        <img
                          src={s.imageUrl}
                          alt=""
                          style={{ width: 130, height: 98, objectFit: "cover", borderRadius: "var(--radius-md)", display: "block" }}
                        />
                      ) : (
                        <div style={{ width: 130, height: 98, borderRadius: "var(--radius-md)", background: "var(--color-bg-alt)" }} />
                      )}
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, lineHeight: 1.3 }}>{s.title}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

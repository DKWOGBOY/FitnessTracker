import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { analyzeMealPhoto, MealPhotoError, type DetectedIngredient } from "../../lib/mealPhotoApi";
import { findExistingMatch, getFoodDetails, suggestFoods, type FoodSuggestion } from "../../lib/foodApi";
import {
  defaultServing,
  macrosForServing,
  type Food,
  type FoodInput,
  type FoodServing,
  type Meal,
} from "../../lib/types";
import type { PresetItemInput } from "../../hooks/useMealPresets";
import { IconArrowLeft, IconCamera, IconCheck, IconClose, IconPlus } from "../icons";
import Energy from "../Energy";

const ANALYZE_STEPS = ["Reading photo...", "Identifying ingredients...", "Estimating portions...", "Almost done..."];
const ANALYZE_STEP_INTERVAL_MS = 1100;

interface Props {
  meal: Meal;
  foods: Food[];
  onClose: () => void;
  onAdd: (foodId: string, meal: Meal, quantity: number, servingId: string | null) => Promise<void>;
  onCreateFood: (input: FoodInput) => Promise<Food>;
  onFoodCreated: (food: Food) => void;
  onSaveMeal?: (name: string, defaultMeal: Meal, items: PresetItemInput[], servingsCount: number) => Promise<void>;
}

interface ReviewItem {
  aiName: string;
  aiQuantity: number;
  aiUnit: string;
  food: Food | null;
  serving: FoodServing | null;
  quantity: number;
}

/** "steamed rice" -> "Steamed Rice" - the AI reliably returns lowercase
 * names, which read as a rough draft rather than a real food name. */
function toTitleCase(name: string): string {
  return name.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function fromDetected(d: DetectedIngredient): ReviewItem {
  return { aiName: toTitleCase(d.name), aiQuantity: d.quantity, aiUnit: d.unit, food: null, serving: null, quantity: 1 };
}

/**
 * Photo -> AI ingredient guess -> editable review, before anything touches
 * the log. A photo can't reveal exact weights, so this is deliberately a
 * rough draft: every detected item must be matched to a real food (with its
 * own real servings) and can have its quantity adjusted, removed, or a
 * missed item added, before "Add to log" commits anything.
 */
export default function MealPhotoScanModal({
  meal,
  foods,
  onClose,
  onAdd,
  onCreateFood,
  onFoodCreated,
  onSaveMeal,
}: Props) {
  const [step, setStep] = useState<"capture" | "analyzing" | "review">("capture");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [matchingIndex, setMatchingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingAsMeal, setSavingAsMeal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzeStepIndex, setAnalyzeStepIndex] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Revokes the previous preview URL whenever a new one is set, and on
  // unmount - browsers won't free the underlying blob otherwise.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileSelected(file: File) {
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzeStepIndex(0);
    setStep("analyzing");
    const stepTimer = setInterval(() => {
      setAnalyzeStepIndex((i) => Math.min(i + 1, ANALYZE_STEPS.length - 1));
    }, ANALYZE_STEP_INTERVAL_MS);
    try {
      const detected = await analyzeMealPhoto(file);
      if (detected.length === 0) {
        setError("Couldn't identify any food in that photo - try a clearer shot, or add items manually.");
        setItems([]);
      } else {
        setItems(detected.map(fromDetected));
      }
      setStep("review");
    } catch (err) {
      setError(err instanceof MealPhotoError ? err.message : "Photo analysis failed.");
      setStep("capture");
    } finally {
      clearInterval(stepTimer);
    }
  }

  function addBlankItem() {
    setItems((prev) => [...prev, { aiName: "", aiQuantity: 1, aiUnit: "", food: null, serving: null, quantity: 1 }]);
    setMatchingIndex(items.length);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, quantity: number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity } : it)));
  }

  async function applyMatch(index: number, food: Food) {
    const { data } = await supabase.from("food_servings").select("*").eq("food_id", food.id);
    const serving = defaultServing((data ?? []) as FoodServing[]);
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, food, serving, quantity: 1 } : it)));
    setMatchingIndex(null);
  }

  const matchedCount = items.filter((it) => it.food).length;

  async function handleConfirm() {
    setSaving(true);
    try {
      for (const item of items) {
        if (!item.food) continue;
        await onAdd(item.food.id, meal, item.quantity, item.serving?.id ?? null);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMeal() {
    if (!onSaveMeal || !mealName.trim()) return;
    setSaving(true);
    try {
      const presetItems: PresetItemInput[] = items
        .filter((it): it is ReviewItem & { food: Food } => !!it.food)
        .map((it) => ({ foodId: it.food.id, servingId: it.serving?.id ?? null, quantity: it.quantity }));
      await onSaveMeal(mealName.trim(), meal, presetItems, 1);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (matchingIndex !== null) {
    return (
      <MatchPicker
        initialQuery={items[matchingIndex].aiName}
        foods={foods}
        onBack={() => setMatchingIndex(null)}
        onPick={(food) => applyMatch(matchingIndex, food)}
        onCreateFood={onCreateFood}
        onFoodCreated={onFoodCreated}
      />
    );
  }

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>Scan meal photo</h3>
      </div>

      <div className="screen-body">
        {step === "capture" && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <p className="text-muted" style={{ marginBottom: 20 }}>
              Take or upload a photo of your meal - the AI will guess the ingredients, then you can edit servings,
              remove anything wrong, and add anything it missed before logging.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={() => cameraInputRef.current?.click()}>
                <IconCamera className="icon" /> Take photo
              </button>
              <button className="btn btn-secondary" onClick={() => galleryInputRef.current?.click()}>
                Choose from library
              </button>
            </div>
            {error && (
              <p className="error-text" style={{ marginTop: 16 }}>
                {error}
              </p>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
                e.target.value = "";
              }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {step === "analyzing" && (
          <div style={{ padding: "8px 0" }}>
            {previewUrl && (
              <div className="meal-scan-photo-wrap">
                <img src={previewUrl} alt="" className="meal-scan-photo" />
                <div className="meal-scan-line" />
              </div>
            )}
            <div className="meal-scan-steps">
              {ANALYZE_STEPS.map((label, i) => {
                const done = i < analyzeStepIndex;
                const active = i === analyzeStepIndex;
                return (
                  <div className={`meal-scan-step${done || active ? " meal-scan-step-live" : ""}`} key={label}>
                    <span className="meal-scan-step-icon">
                      {done ? <IconCheck className="icon" /> : active ? <div className="spinner" /> : null}
                    </span>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === "review" && (
          <>
            {error && (
              <p className="error-text" style={{ marginBottom: 12 }}>
                {error}
              </p>
            )}
            {items.map((item, i) => {
              const macros = item.food
                ? macrosForServing(item.food, item.serving?.grams_equivalent ?? 100, item.quantity)
                : null;
              return (
                <div className="card" style={{ marginBottom: 10 }} key={i}>
                  <div className="flex-between">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="list-row-title">{item.food ? item.food.name : item.aiName || "Unnamed item"}</div>
                      {!item.food && (
                        <div className="list-row-sub">
                          AI guess: {item.aiQuantity} {item.aiUnit}
                        </div>
                      )}
                    </div>
                    <button className="btn btn-ghost" onClick={() => removeItem(i)} aria-label="Remove">
                      <IconClose className="icon" />
                    </button>
                  </div>

                  {item.food ? (
                    <div className="flex-between" style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(i, parseFloat(e.target.value) || 0)}
                          style={{ width: 64, padding: "4px 6px" }}
                        />
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          × {item.serving?.label ?? `100 ${item.food.base_unit}`}
                        </span>
                      </div>
                      {macros && (
                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          <Energy kcal={macros.calories} />
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary btn-block"
                      style={{ marginTop: 8 }}
                      onClick={() => setMatchingIndex(i)}
                    >
                      Match to a food
                    </button>
                  )}
                </div>
              );
            })}

            <button className="btn btn-secondary btn-block" style={{ marginBottom: 20 }} onClick={addBlankItem}>
              <IconPlus className="icon" /> Add ingredient
            </button>

            {savingAsMeal ? (
              <>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Meal name</label>
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g. Chicken & rice bowl"
                    autoFocus
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setSavingAsMeal(false)} disabled={saving}>
                    Back
                  </button>
                  <button
                    className="btn btn-primary btn-block"
                    onClick={handleSaveMeal}
                    disabled={saving || !mealName.trim()}
                  >
                    {saving ? "Saving..." : "Save meal"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleConfirm}
                  disabled={saving || matchedCount === 0}
                >
                  {saving ? "Adding..." : `Add ${matchedCount} item${matchedCount === 1 ? "" : "s"} to log`}
                </button>
                {onSaveMeal && (
                  <button
                    className="btn btn-ghost btn-block"
                    style={{ marginTop: 8 }}
                    onClick={() => setSavingAsMeal(true)}
                    disabled={matchedCount === 0}
                  >
                    Save as a meal instead
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Minimal matcher for one detected ingredient - your own foods first, then
 * an online search, reusing the same lookup/dedup logic as the main food
 * search. Deliberately smaller than FoodSearchModal (no history/meals/
 * barcode) since this is a focused "pick one food" sub-step. */
function MatchPicker({
  initialQuery,
  foods,
  onBack,
  onPick,
  onCreateFood,
  onFoodCreated,
}: {
  initialQuery: string;
  foods: Food[];
  onBack: () => void;
  onPick: (food: Food) => void;
  onCreateFood: (input: FoodInput) => Promise<Food>;
  onFoodCreated: (food: Food) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const searchSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = query.trim().toLowerCase();
  const localMatches = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : [];

  function runSearch(trimmed: string) {
    if (trimmed.length < 2) {
      searchSeq.current++;
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const seq = ++searchSeq.current;
    setLoading(true);
    (async () => {
      try {
        const results = await suggestFoods(trimmed);
        if (seq !== searchSeq.current) return;
        setSuggestions(results);
        setError(null);
      } catch (err) {
        if (seq !== searchSeq.current) return;
        setSuggestions([]);
        setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        if (seq === searchSeq.current) setLoading(false);
      }
    })();
  }

  // Run once on mount for the AI's prefilled guess - typing afterward goes
  // through the debounced path in handleQueryChange instead.
  useEffect(() => {
    runSearch(initialQuery.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      searchSeq.current++;
      setSuggestions([]);
      setLoading(false);
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(trimmed), 400);
  }

  async function pickSuggestion(suggestion: FoodSuggestion) {
    setFetchingId(suggestion.id);
    setError(null);
    try {
      const candidate = await getFoodDetails(suggestion.id);
      const existing = await findExistingMatch(candidate);
      if (existing) {
        onPick(existing);
        return;
      }
      const { extraServings: _extraServings, ...foodInput } = candidate;
      const food = await onCreateFood(foodInput);
      onFoodCreated(food);
      onPick(food);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that food.");
    } finally {
      setFetchingId(null);
    }
  }

  return (
    <div className="screen-overlay" style={{ zIndex: 70 }}>
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onBack} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>Match ingredient</h3>
      </div>

      <div className="search-pill">
        <input
          type="text"
          placeholder="Search foods..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          autoFocus
        />
      </div>

      <div className="screen-body">
        {error && (
          <p className="error-text" style={{ marginBottom: 12 }}>
            {error}
          </p>
        )}

        {localMatches.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>
              My Foods
            </div>
            {localMatches.map((f) => (
              <div className="list-row" style={{ cursor: "pointer" }} key={f.id} onClick={() => onPick(f)}>
                <div className="list-row-main">
                  <div className="list-row-title">{f.name}</div>
                  <div className="list-row-sub">
                    <Energy kcal={f.calories} /> /100{f.base_unit}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="section-title" style={{ marginTop: localMatches.length > 0 ? 20 : 0 }}>
          Search Online
        </div>
        {q.length < 2 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>
            Keep typing above (at least 2 characters) to search.
          </p>
        ) : loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
            <div className="spinner" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>
            No results for "{query.trim()}".
          </p>
        ) : (
          suggestions.map((s) => (
            <div className="list-row" key={s.id}>
              <div className="list-row-main">
                <div className="list-row-title">{s.name}</div>
              </div>
              <div className="list-row-actions">
                <button
                  className="btn btn-primary btn-icon"
                  onClick={() => pickSuggestion(s)}
                  disabled={fetchingId === s.id}
                >
                  {fetchingId === s.id ? <div className="spinner" /> : <IconPlus className="icon" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  brandLabel,
  findExistingMatch,
  getFoodByBarcode,
  getFoodDetails,
  isVerifiedSuggestion,
  suggestFoods,
  type FoodSuggestion,
  type NormalizedFoodCandidate,
} from "../../lib/foodApi";
import BarcodeScanner from "./BarcodeScanner";
import MealPhotoScanModal from "./MealPhotoScanModal";
import { useFoodLogHistory, type FoodHistoryEntry } from "../../hooks/useFoodLogHistory";
import type { PresetItemInput } from "../../hooks/useMealPresets";
import {
  MEALS,
  STANDARD_SERVINGS,
  defaultServing,
  macrosForServing,
  sumMacros,
  type Food,
  type FoodInput,
  type FoodServing,
  type Macros,
  type Meal,
  type MealPresetWithItems,
} from "../../lib/types";
import {
  IconArrowLeft,
  IconBarcode,
  IconCamera,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconPlus,
  IconSearch,
  IconStar,
} from "../icons";
import Energy from "../Energy";
import ExtendedNutrientsBar from "../ExtendedNutrientsBar";
import MealBuilder from "../Foods/MealBuilder";

interface Props {
  foods: Food[];
  servingsByFood: Map<string, FoodServing[]>;
  presets?: MealPresetWithItems[];
  initialMeal?: Meal;
  mode?: "log" | "picker";
  onClose: () => void;
  onAdd?: (foodId: string, meal: Meal, quantity: number, servingId: string | null) => Promise<void>;
  onPick?: (food: Food, serving: FoodServing | null, quantity: number) => void;
  onFoodCreated: (food: Food) => void;
  onDeletePreset?: (id: string) => void;
  onCreateFood?: (input: FoodInput) => Promise<Food>;
  onSaveMeal?: (name: string, defaultMeal: Meal, items: PresetItemInput[], servingsCount: number) => Promise<void>;
}

type ScreenTab = "history" | "meals" | "foods" | "search";

const LOG_TABS: { key: ScreenTab; label: string }[] = [
  { key: "history", label: "History" },
  { key: "meals", label: "My Meals" },
  { key: "foods", label: "My Foods" },
  { key: "search", label: "Search Online" },
];

const PICKER_TABS: { key: ScreenTab; label: string }[] = [
  { key: "history", label: "History" },
  { key: "foods", label: "My Foods" },
  { key: "search", label: "Search Online" },
];

export default function FoodSearchModal({
  foods,
  servingsByFood,
  presets = [],
  initialMeal,
  mode = "log",
  onClose,
  onAdd,
  onPick,
  onFoodCreated,
  onDeletePreset,
  onCreateFood,
  onSaveMeal,
}: Props) {
  const isPicker = mode === "picker";
  const TABS = isPicker ? PICKER_TABS : LOG_TABS;
  const [meal, setMeal] = useState<Meal>(initialMeal ?? "breakfast");
  const [tab, setTab] = useState<ScreenTab>("history");
  const [query, setQuery] = useState("");
  const [addedMacros, setAddedMacros] = useState<Map<string, Macros>>(new Map());
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMealBuilder, setShowMealBuilder] = useState(false);

  const { entries: history, loading: historyLoading } = useFoodLogHistory();

  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fetchingSuggestionId, setFetchingSuggestionId] = useState<number | null>(null);
  const searchSeq = useRef(0);

  const [pendingCandidate, setPendingCandidate] = useState<NormalizedFoodCandidate | null>(null);
  const [pendingMatch, setPendingMatch] = useState<Food | null>(null);

  const [detailFood, setDetailFood] = useState<Food | null>(null);
  const [detailServingId, setDetailServingId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [mealPhotoOpen, setMealPhotoOpen] = useState(false);

  const q = query.trim().toLowerCase();

  const filteredHistory = useMemo(
    () => (q ? history.filter((e) => e.food.name.toLowerCase().includes(q)) : history),
    [history, q],
  );

  const filteredPresets = useMemo(
    () => (q ? presets.filter((p) => p.name.toLowerCase().includes(q)) : presets),
    [presets, q],
  );

  const filteredFoods = useMemo(() => {
    const base = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
    return [...base].sort((a, b) => {
      if (a.is_frequent !== b.is_frequent) return a.is_frequent ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [foods, q]);

  function servingsFor(foodId: string): FoodServing[] {
    return servingsByFood.get(foodId) ?? [];
  }

  function showToast() {
    setToastVisible(true);
    setToastKey((k) => k + 1);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 1400);
  }

  function markAdded(food: Food, serving: FoodServing | null, qty: number) {
    const m = macrosForServing(food, serving?.grams_equivalent ?? 100, qty);
    setAddedMacros((prev) => {
      const next = new Map(prev);
      const existing = next.get(food.id);
      next.set(food.id, existing ? sumMacros([existing, m]) : m);
      return next;
    });
    setJustAddedId(food.id);
    setTimeout(() => setJustAddedId((cur) => (cur === food.id ? null : cur)), 500);
    showToast();
  }

  function openDetail(food: Food, serving: FoodServing | null, defaultQty: number) {
    setDetailFood(food);
    setDetailServingId(serving?.id ?? defaultServing(servingsFor(food.id))?.id ?? null);
    setQuantity(String(defaultQty));
  }

  async function quickAdd(food: Food, serving: FoodServing | null, qty: number) {
    if (isPicker) {
      onPick?.(food, serving, qty);
    } else {
      await onAdd?.(food.id, meal, qty, serving?.id ?? null);
    }
    markAdded(food, serving, qty);
  }

  useEffect(() => {
    if (tab !== "search") return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      searchSeq.current++;
      setSuggestions([]);
      setApiLoading(false);
      setApiError(null);
      return;
    }
    const seq = ++searchSeq.current;
    setApiLoading(true);
    setApiError(null);
    const timer = setTimeout(async () => {
      try {
        const results = await suggestFoods(trimmed);
        if (seq !== searchSeq.current) return; // a newer keystroke already superseded this search
        setSuggestions(results);
        setApiError(null);
      } catch (err) {
        if (seq !== searchSeq.current) return;
        setSuggestions([]);
        setApiError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        if (seq === searchSeq.current) setApiLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, tab]);

  async function pickSuggestion(suggestion: FoodSuggestion) {
    setApiError(null);
    setFetchingSuggestionId(suggestion.id);
    try {
      const candidate = await getFoodDetails(suggestion.id);
      const match = await findExistingMatch(candidate);
      if (match) {
        setPendingCandidate(candidate);
        setPendingMatch(match);
      } else {
        await createFoodFromCandidate(candidate);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Couldn't load that food.");
    } finally {
      setFetchingSuggestionId(null);
    }
  }

  async function handleBarcodeDetected(code: string) {
    setScannerOpen(false);
    setTab("search");
    setApiError(null);
    setScanning(true);
    try {
      const candidate = await getFoodByBarcode(code);
      if (!candidate) {
        setApiError(`No product found for barcode ${code} - try searching by name instead.`);
        return;
      }
      const match = await findExistingMatch(candidate);
      if (match) {
        setPendingCandidate(candidate);
        setPendingMatch(match);
      } else {
        await createFoodFromCandidate(candidate);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Couldn't look up that barcode.");
    } finally {
      setScanning(false);
    }
  }

  async function createFoodFromCandidate(candidate: NormalizedFoodCandidate) {
    // user_id defaults to auth.uid() server-side - no need to fetch/send it.
    const { extraServings, ...foodInput } = candidate;
    const { data, error } = await supabase.from("foods").insert(foodInput).select().single();
    if (error) {
      setApiError(error.message);
      return;
    }
    const food = data as Food;
    const existingLabels = new Set(extraServings.map((s) => s.label.trim().toLowerCase()));
    const standard = STANDARD_SERVINGS[food.base_unit].filter((s) => !existingLabels.has(s.label.toLowerCase()));
    const hasDefault = extraServings.some((s) => s.is_default);
    const rows = [
      { food_id: food.id, label: `100 ${food.base_unit}`, grams_equivalent: 100, is_default: extraServings.length === 0 },
      ...extraServings.map((s, i) => ({
        food_id: food.id,
        label: s.label,
        grams_equivalent: s.grams_equivalent,
        is_default: hasDefault ? !!s.is_default : i === 0,
      })),
      ...standard.map((s) => ({ food_id: food.id, label: s.label, grams_equivalent: s.grams_equivalent, is_default: false })),
    ];
    await supabase.from("food_servings").insert(rows);
    onFoodCreated(food);
    setPendingCandidate(null);
    setPendingMatch(null);
    openDetail(food, null, 1);
  }

  function useExistingMatch() {
    if (pendingMatch) openDetail(pendingMatch, null, 1);
    setPendingCandidate(null);
    setPendingMatch(null);
  }

  async function handleConfirm() {
    if (!detailFood) return;
    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) return;
    const serving = servingsFor(detailFood.id).find((s) => s.id === detailServingId) ?? null;
    setSaving(true);
    try {
      if (isPicker) {
        onPick?.(detailFood, serving, qty);
      } else {
        await onAdd?.(detailFood.id, meal, qty, serving?.id ?? null);
      }
      markAdded(detailFood, serving, qty);
      setDetailFood(null);
    } finally {
      setSaving(false);
    }
  }

  const detailServings = detailFood ? servingsFor(detailFood.id) : [];
  const detailServing = detailServings.find((s) => s.id === detailServingId) ?? null;
  const detailMacros = detailFood
    ? macrosForServing(detailFood, detailServing?.grams_equivalent ?? 100, parseFloat(quantity) || 0)
    : null;

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        {isPicker ? (
          <h3 style={{ fontSize: 16 }}>Add food</h3>
        ) : (
          <div className="meal-select-wrap">
            <select className="meal-select" value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {m[0].toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
            <IconChevronDown className="icon" />
          </div>
        )}
      </div>

      <div className="search-pill">
        <IconSearch className="icon" />
        <input
          type="text"
          placeholder="Search foods, brands..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="screen-body">
        {tab === "history" &&
          (historyLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <div className="spinner" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="empty-state">
              {q
                ? "No matches in your history."
                : "Nothing logged yet — foods you log will show up here for quick re-adding."}
            </p>
          ) : (
            filteredHistory.map((entry) => (
              <HistoryRow
                key={entry.food.id}
                entry={entry}
                addedMacros={addedMacros.get(entry.food.id) ?? null}
                justAdded={justAddedId === entry.food.id}
                onQuickAdd={() => quickAdd(entry.food, entry.lastServing, entry.lastQuantity)}
                onOpenDetail={() => openDetail(entry.food, entry.lastServing, entry.lastQuantity)}
              />
            ))
          ))}

        {tab === "meals" && (
          <>
            <button
              className="btn btn-secondary btn-block"
              style={{ marginBottom: 12 }}
              onClick={() => setShowMealBuilder(true)}
            >
              <IconPlus className="icon" /> Create meal
            </button>
            {filteredPresets.length === 0 ? (
              <p className="empty-state">
                {q ? "No matching saved meals." : "No saved meals yet — create one above."}
              </p>
            ) : (
              filteredPresets.map((preset) => (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  addedMacros={preset.food ? addedMacros.get(preset.food.id) ?? null : null}
                  justAdded={!!preset.food && justAddedId === preset.food.id}
                  onQuickAdd={() =>
                    preset.food && quickAdd(preset.food, defaultServing(servingsFor(preset.food.id)), 1)
                  }
                  onOpenDetail={() =>
                    preset.food && openDetail(preset.food, defaultServing(servingsFor(preset.food.id)), 1)
                  }
                  onDelete={() => onDeletePreset?.(preset.id)}
                />
              ))
            )}
          </>
        )}

        {tab === "foods" &&
          (filteredFoods.length === 0 ? (
            <p className="empty-state">
              {q ? "No matches in your food database." : "No foods yet — add one from the Foods tab."}
            </p>
          ) : (
            filteredFoods.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                addedMacros={addedMacros.get(food.id) ?? null}
                justAdded={justAddedId === food.id}
                onQuickAdd={() => quickAdd(food, defaultServing(servingsFor(food.id)), 1)}
                onOpenDetail={() => openDetail(food, defaultServing(servingsFor(food.id)), 1)}
              />
            ))
          ))}

        {tab === "search" && (
          <div>
            {apiError && (
              <p className="error-text" style={{ marginBottom: 12 }}>
                {apiError}
              </p>
            )}

            {q.length < 2 ? (
              !apiError && (
                <p className="text-muted" style={{ fontSize: 13 }}>
                  Keep typing above (at least 2 characters) to search.
                </p>
              )
            ) : (
              <>
                {apiLoading && (
                  <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                    <div className="spinner" />
                  </div>
                )}
                {!apiLoading && !apiError && suggestions.length === 0 && (
                  <p className="text-muted" style={{ fontSize: 13 }}>
                    No results for "{query.trim()}".
                  </p>
                )}
                {suggestions.map((s) => (
                  <div className="list-row" key={s.id}>
                    <div className="list-row-main">
                      <div className="list-row-title">
                        {isVerifiedSuggestion(s) && (
                          <span
                            style={{ color: "var(--color-success, #2e9e5b)", verticalAlign: "middle", marginRight: 2 }}
                            title="Verified: curated macros + real household portions"
                          >
                            <IconStar className="icon" filled />
                          </span>
                        )}
                        {s.name}
                        {brandLabel(s) && (
                          <span className="badge badge-muted" style={{ fontSize: 9, verticalAlign: "middle", marginLeft: 6 }}>
                            {brandLabel(s)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="list-row-actions">
                      <button
                        className="btn btn-primary btn-icon"
                        onClick={() => pickSuggestion(s)}
                        disabled={fetchingSuggestionId === s.id}
                      >
                        {fetchingSuggestionId === s.id ? <div className="spinner" /> : <IconPlus className="icon" />}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {!isPicker && onAdd && onCreateFood && (
        <button
          className="barcode-fab camera-fab"
          onClick={() => setMealPhotoOpen(true)}
          aria-label="Scan meal photo"
        >
          <IconCamera className="icon" />
        </button>
      )}

      <button
        className="barcode-fab"
        onClick={() => setScannerOpen(true)}
        disabled={scanning}
        aria-label="Scan barcode"
      >
        {scanning ? <div className="spinner" /> : <IconBarcode className="icon" />}
      </button>

      {pendingCandidate && pendingMatch && (
        <div
          className="modal-overlay"
          style={{ zIndex: 70 }}
          onClick={() => {
            setPendingCandidate(null);
            setPendingMatch(null);
          }}
        >
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Looks similar</h3>
            </div>
            <p style={{ marginBottom: 16 }}>
              "{pendingCandidate.name}" looks similar to an existing food in your database:{" "}
              <strong>{pendingMatch.name}</strong>. Use the existing entry, or add this as a new one?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-block" onClick={useExistingMatch}>
                Use existing
              </button>
              <button className="btn btn-primary btn-block" onClick={() => createFoodFromCandidate(pendingCandidate)}>
                Add as new
              </button>
            </div>
          </div>
        </div>
      )}

      {detailFood && detailMacros && (
        <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setDetailFood(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{detailFood.name}</h3>
              <button className="btn btn-ghost" onClick={() => setDetailFood(null)}>
                <IconClose className="icon" />
              </button>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Serving</label>
                <select value={detailServingId ?? ""} onChange={(e) => setDetailServingId(e.target.value)}>
                  {detailServings.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  autoFocus
                />
              </div>
              {!isPicker && (
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
              )}
            </div>

            <p className="text-muted" style={{ fontSize: 12, marginBottom: 14 }}>
              <Energy kcal={detailFood.calories} /> /100{detailFood.base_unit} base
            </p>

            <div className="card" style={{ background: "var(--color-surface-alt)", marginBottom: 16 }}>
              <div className="flex-between">
                <strong>
                  <Energy kcal={detailMacros.calories} />
                </strong>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  P {Math.round(detailMacros.protein_g)}g · C {Math.round(detailMacros.carbs_g)}g · F{" "}
                  {Math.round(detailMacros.fat_g)}g
                </span>
              </div>
            </div>

            <ExtendedNutrientsBar food={detailFood} macros={detailMacros} />

            <button className="btn btn-primary btn-block" onClick={handleConfirm} disabled={saving || !quantity}>
              {saving ? "Adding..." : isPicker ? "Add to meal" : "Add to log"}
            </button>
          </div>
        </div>
      )}

      {toastVisible && (
        <div className="log-toast" key={toastKey}>
          {isPicker ? "Added to meal!" : "Food logged!"}
        </div>
      )}

      {showMealBuilder && onCreateFood && onSaveMeal && (
        <MealBuilder
          foods={foods}
          servingsByFood={servingsByFood}
          onClose={() => setShowMealBuilder(false)}
          onCreateFood={onCreateFood}
          onFoodCreated={onFoodCreated}
          onSave={async (name, defaultMeal, items, servingsCount) => {
            await onSaveMeal(name, defaultMeal, items, servingsCount);
            setShowMealBuilder(false);
          }}
        />
      )}

      {scannerOpen && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScannerOpen(false)} />
      )}

      {mealPhotoOpen && onAdd && onCreateFood && (
        <MealPhotoScanModal
          meal={meal}
          foods={foods}
          onClose={() => setMealPhotoOpen(false)}
          onAdd={onAdd}
          onCreateFood={onCreateFood}
          onFoodCreated={onFoodCreated}
        />
      )}
    </div>
  );
}

function QuickAddButton({
  added,
  justAdded,
  onClick,
}: {
  added: boolean;
  justAdded: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      className={`btn btn-primary btn-icon btn-add-circle${added ? " added" : ""}${justAdded ? " just-added" : ""}`}
      onClick={onClick}
      aria-label="Quick add"
    >
      {added ? <IconCheck className="icon" /> : <IconPlus className="icon" />}
      {justAdded && (
        <>
          <span className="quick-add-ripple" />
          <span className="quick-add-confetti">
            <span className="dot c1" />
            <span className="dot c2" />
            <span className="dot c3" />
            <span className="dot c4" />
          </span>
        </>
      )}
    </button>
  );
}

function MacroPillsRow({ macros }: { macros: Macros }) {
  return (
    <div className="macro-pills-row">
      <span className="macro-pill-badge" style={{ animationDelay: "0ms" }}>
        <span className="macro-pill-dot" style={{ background: "var(--color-protein)" }} />
        {macros.protein_g.toFixed(1)}g Protein
      </span>
      <span className="macro-pill-badge" style={{ animationDelay: "130ms" }}>
        <span className="macro-pill-dot" style={{ background: "var(--color-carbs)" }} />
        {macros.carbs_g.toFixed(1)}g Carbs
      </span>
      <span className="macro-pill-badge" style={{ animationDelay: "260ms" }}>
        <span className="macro-pill-dot" style={{ background: "var(--color-fat)" }} />
        {macros.fat_g.toFixed(1)}g Fat
      </span>
    </div>
  );
}

function HistoryRow({
  entry,
  addedMacros,
  justAdded,
  onQuickAdd,
  onOpenDetail,
}: {
  entry: FoodHistoryEntry;
  addedMacros: Macros | null;
  justAdded: boolean;
  onQuickAdd: () => void;
  onOpenDetail: () => void;
}) {
  const macros = macrosForServing(entry.food, entry.lastServing?.grams_equivalent ?? 100, entry.lastQuantity);
  return (
    <div className="list-row" style={{ cursor: "pointer" }} onClick={onOpenDetail}>
      <div className="list-row-main">
        <div className="list-row-title">{entry.food.name}</div>
        <div className="list-row-sub">
          <Energy kcal={macros.calories} /> · {entry.lastQuantity}× {entry.lastServing?.label ?? "100" + entry.food.base_unit}
        </div>
        {addedMacros && <MacroPillsRow macros={addedMacros} />}
      </div>
      <div className="list-row-actions">
        <QuickAddButton
          added={!!addedMacros}
          justAdded={justAdded}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
        />
      </div>
    </div>
  );
}

function FoodRow({
  food,
  addedMacros,
  justAdded,
  onQuickAdd,
  onOpenDetail,
}: {
  food: Food;
  addedMacros: Macros | null;
  justAdded: boolean;
  onQuickAdd: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <div className="list-row" style={{ cursor: "pointer" }} onClick={onOpenDetail}>
      <div className="list-row-main">
        <div className="list-row-title">
          {food.name}
          {food.is_frequent && (
            <span style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 6 }}>
              <IconStar className="icon icon-star" filled />
            </span>
          )}
        </div>
        <div className="list-row-sub">
          <Energy kcal={food.calories} /> /100{food.base_unit}
        </div>
        {addedMacros && <MacroPillsRow macros={addedMacros} />}
      </div>
      <div className="list-row-actions">
        <QuickAddButton
          added={!!addedMacros}
          justAdded={justAdded}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
        />
      </div>
    </div>
  );
}

function PresetRow({
  preset,
  addedMacros,
  justAdded,
  onQuickAdd,
  onOpenDetail,
  onDelete,
}: {
  preset: MealPresetWithItems;
  addedMacros: Macros | null;
  justAdded: boolean;
  onQuickAdd: () => void;
  onOpenDetail: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="list-row" style={{ cursor: "pointer" }} onClick={onOpenDetail}>
      <div className="list-row-main">
        <div className="list-row-title">{preset.name}</div>
        <div className="list-row-sub">
          {preset.items.length} item{preset.items.length === 1 ? "" : "s"}
          {preset.food && (
            <>
              {" · "}
              <Energy kcal={preset.food.calories} />
            </>
          )}
        </div>
        {addedMacros && <MacroPillsRow macros={addedMacros} />}
      </div>
      <div className="list-row-actions">
        <button
          className="btn btn-ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete preset"
        >
          <IconClose className="icon" />
        </button>
        <QuickAddButton
          added={!!addedMacros}
          justAdded={justAdded}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
        />
      </div>
    </div>
  );
}

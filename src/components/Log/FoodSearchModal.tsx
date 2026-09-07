import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  findExistingMatch,
  searchOpenFoodFacts,
  searchUsda,
  type NormalizedFoodCandidate,
} from "../../lib/foodApi";
import { useFoodLogHistory, type FoodHistoryEntry } from "../../hooks/useFoodLogHistory";
import { MEALS, macrosForQuantity, type Food, type Meal, type MealPresetWithItems } from "../../lib/types";
import { IconArrowLeft, IconCheck, IconChevronDown, IconClose, IconPlus, IconSearch, IconStar } from "../icons";
import Energy from "../Energy";

interface Props {
  foods: Food[];
  presets: MealPresetWithItems[];
  initialMeal: Meal;
  onClose: () => void;
  onAdd: (foodId: string, meal: Meal, quantity: number) => Promise<void>;
  onFoodCreated: (food: Food) => void;
  onDeletePreset: (id: string) => void;
}

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY as string | undefined;

type ScreenTab = "history" | "meals" | "foods" | "search";

const TABS: { key: ScreenTab; label: string }[] = [
  { key: "history", label: "History" },
  { key: "meals", label: "My Meals" },
  { key: "foods", label: "My Foods" },
  { key: "search", label: "Search Online" },
];

export default function FoodSearchModal({
  foods,
  presets,
  initialMeal,
  onClose,
  onAdd,
  onFoodCreated,
  onDeletePreset,
}: Props) {
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [tab, setTab] = useState<ScreenTab>("history");
  const [query, setQuery] = useState("");
  const [addedId, setAddedId] = useState<string | null>(null);

  const { entries: history, loading: historyLoading } = useFoodLogHistory();

  const [apiResults, setApiResults] = useState<NormalizedFoodCandidate[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  const [pendingCandidate, setPendingCandidate] = useState<NormalizedFoodCandidate | null>(null);
  const [pendingMatch, setPendingMatch] = useState<Food | null>(null);

  const [detailFood, setDetailFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

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

  function flashAdded(id: string) {
    setAddedId(id);
    setTimeout(() => setAddedId((cur) => (cur === id ? null : cur)), 900);
  }

  function openDetail(food: Food, defaultQty: number) {
    setDetailFood(food);
    setQuantity(String(defaultQty));
  }

  async function quickAdd(food: Food, qty: number) {
    await onAdd(food.id, meal, qty);
    flashAdded(food.id);
  }

  useEffect(() => {
    if (tab !== "search") return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      searchSeq.current++;
      setApiResults([]);
      setApiLoading(false);
      setApiError(null);
      return;
    }
    const seq = ++searchSeq.current;
    setApiLoading(true);
    setApiError(null);
    const timer = setTimeout(async () => {
      const [offResult, usdaResult] = await Promise.allSettled([
        searchOpenFoodFacts(trimmed),
        USDA_API_KEY ? searchUsda(trimmed, USDA_API_KEY) : Promise.resolve([]),
      ]);
      if (seq !== searchSeq.current) return; // a newer keystroke already superseded this search
      const merged = [
        ...(offResult.status === "fulfilled" ? offResult.value : []),
        ...(usdaResult.status === "fulfilled" ? usdaResult.value : []),
      ];
      setApiResults(merged);
      setApiError(offResult.status === "rejected" && usdaResult.status === "rejected" ? "Search failed." : null);
      setApiLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, tab]);

  async function pickCandidate(candidate: NormalizedFoodCandidate) {
    setApiError(null);
    const match = await findExistingMatch(candidate);
    if (match) {
      setPendingCandidate(candidate);
      setPendingMatch(match);
    } else {
      await createFoodFromCandidate(candidate);
    }
  }

  async function createFoodFromCandidate(candidate: NormalizedFoodCandidate) {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("foods")
      .insert({ ...candidate, user_id: userData.user?.id })
      .select()
      .single();
    if (error) {
      setApiError(error.message);
      return;
    }
    const food = data as Food;
    onFoodCreated(food);
    setPendingCandidate(null);
    setPendingMatch(null);
    openDetail(food, 1);
  }

  function useExistingMatch() {
    if (pendingMatch) openDetail(pendingMatch, 1);
    setPendingCandidate(null);
    setPendingMatch(null);
  }

  async function handleConfirm() {
    if (!detailFood) return;
    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) return;
    setSaving(true);
    try {
      await onAdd(detailFood.id, meal, qty);
      setDetailFood(null);
    } finally {
      setSaving(false);
    }
  }

  const detailMacros = detailFood ? macrosForQuantity(detailFood, parseFloat(quantity) || 0) : null;

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
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
                added={addedId === entry.food.id}
                onQuickAdd={() => quickAdd(entry.food, entry.lastQuantity)}
                onOpenDetail={() => openDetail(entry.food, entry.lastQuantity)}
              />
            ))
          ))}

        {tab === "meals" &&
          (filteredPresets.length === 0 ? (
            <p className="empty-state">
              {q
                ? "No matching saved meals."
                : "No saved meals yet — save a meal's foods as a preset from the Log tab to see it here."}
            </p>
          ) : (
            filteredPresets.map((preset) => (
              <PresetRow
                key={preset.id}
                preset={preset}
                added={!!preset.food && addedId === preset.food.id}
                onQuickAdd={() => preset.food && quickAdd(preset.food, 1)}
                onOpenDetail={() => preset.food && openDetail(preset.food, 1)}
                onDelete={() => onDeletePreset(preset.id)}
              />
            ))
          ))}

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
                added={addedId === food.id}
                onQuickAdd={() => quickAdd(food, 1)}
                onOpenDetail={() => openDetail(food, 1)}
              />
            ))
          ))}

        {tab === "search" && (
          <div>
            {q.length < 2 ? (
              <p className="text-muted" style={{ fontSize: 13 }}>
                Keep typing above (at least 2 characters) to search Open Food Facts and USDA.
              </p>
            ) : (
              <>
                {apiLoading && (
                  <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                    <div className="spinner" />
                  </div>
                )}
                {apiError && <p className="error-text">{apiError}</p>}
                {!apiLoading && !apiError && apiResults.length === 0 && (
                  <p className="text-muted" style={{ fontSize: 13 }}>
                    No results for "{query.trim()}".
                  </p>
                )}
                {apiResults.map((c) => (
                  <div className="list-row" key={`${c.source}-${c.source_id}`}>
                    <div className="list-row-main">
                      <div className="list-row-title">
                        {c.name}{" "}
                        <span className="badge badge-muted" style={{ fontSize: 9, verticalAlign: "middle" }}>
                          {c.source === "off" ? "Open Food Facts" : "USDA"}
                        </span>
                      </div>
                      <div className="list-row-sub">
                        <Energy kcal={c.calories} /> /100{c.serving_unit === "ml" ? "ml" : "g"} · P{" "}
                        {Math.round(c.protein_g)}g C {Math.round(c.carbs_g)}g F {Math.round(c.fat_g)}g
                      </div>
                    </div>
                    <div className="list-row-actions">
                      <button className="btn btn-primary btn-icon" onClick={() => pickCandidate(c)}>
                        <IconPlus className="icon" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

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
                <label>Quantity ({detailFood.serving_unit} × serving)</label>
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
            </div>

            <p className="text-muted" style={{ fontSize: 12, marginBottom: 14 }}>
              Serving: {detailFood.serving_size}
              {detailFood.serving_unit} • <Energy kcal={detailFood.calories} /> /100
              {detailFood.serving_unit === "ml" ? "ml" : "g"}
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

            <button className="btn btn-primary btn-block" onClick={handleConfirm} disabled={saving || !quantity}>
              {saving ? "Adding..." : "Add to log"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  entry,
  added,
  onQuickAdd,
  onOpenDetail,
}: {
  entry: FoodHistoryEntry;
  added: boolean;
  onQuickAdd: () => void;
  onOpenDetail: () => void;
}) {
  const macros = macrosForQuantity(entry.food, entry.lastQuantity);
  return (
    <div className="list-row" style={{ cursor: "pointer" }} onClick={onOpenDetail}>
      <div className="list-row-main">
        <div className="list-row-title">{entry.food.name}</div>
        <div className="list-row-sub">
          <Energy kcal={macros.calories} /> · {entry.lastQuantity}× serving
        </div>
      </div>
      <div className="list-row-actions">
        <button
          className={`btn btn-primary btn-icon btn-add-circle${added ? " added" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          aria-label="Quick add"
        >
          {added ? <IconCheck className="icon" /> : <IconPlus className="icon" />}
        </button>
      </div>
    </div>
  );
}

function FoodRow({
  food,
  added,
  onQuickAdd,
  onOpenDetail,
}: {
  food: Food;
  added: boolean;
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
          <Energy kcal={food.calories} /> /100{food.serving_unit === "ml" ? "ml" : "g"}
        </div>
      </div>
      <div className="list-row-actions">
        <button
          className={`btn btn-primary btn-icon btn-add-circle${added ? " added" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          aria-label="Quick add"
        >
          {added ? <IconCheck className="icon" /> : <IconPlus className="icon" />}
        </button>
      </div>
    </div>
  );
}

function PresetRow({
  preset,
  added,
  onQuickAdd,
  onOpenDetail,
  onDelete,
}: {
  preset: MealPresetWithItems;
  added: boolean;
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
        <button
          className={`btn btn-primary btn-icon btn-add-circle${added ? " added" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          aria-label="Quick add"
        >
          {added ? <IconCheck className="icon" /> : <IconPlus className="icon" />}
        </button>
      </div>
    </div>
  );
}

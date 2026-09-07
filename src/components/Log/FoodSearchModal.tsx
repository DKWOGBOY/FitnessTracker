import { useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  findExistingMatch,
  searchOpenFoodFacts,
  searchUsda,
  type NormalizedFoodCandidate,
} from "../../lib/foodApi";
import { MEALS, macrosForQuantity, type Food, type Meal } from "../../lib/types";

interface Props {
  foods: Food[];
  initialMeal: Meal;
  onClose: () => void;
  onAdd: (foodId: string, meal: Meal, quantity: number) => Promise<void>;
  onFoodCreated: (food: Food) => void;
}

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY as string | undefined;

export default function FoodSearchModal({ foods, initialMeal, onClose, onAdd, onFoodCreated }: Props) {
  const [query, setQuery] = useState("");
  const [apiResults, setApiResults] = useState<NormalizedFoodCandidate[] | null>(null);
  const [apiSource, setApiSource] = useState<"off" | "usda" | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [pendingCandidate, setPendingCandidate] = useState<NormalizedFoodCandidate | null>(null);
  const [pendingMatch, setPendingMatch] = useState<Food | null>(null);

  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [saving, setSaving] = useState(false);

  const personalMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
    return base.slice(0, 30);
  }, [foods, query]);

  const frequentFoods = useMemo(
    () => (query.trim() ? [] : foods.filter((f) => f.is_frequent).slice(0, 12)),
    [foods, query],
  );

  async function runApiSearch(source: "off" | "usda") {
    setApiLoading(true);
    setApiError(null);
    setApiSource(source);
    try {
      const results =
        source === "off"
          ? await searchOpenFoodFacts(query)
          : await searchUsda(query, USDA_API_KEY ?? "");
      setApiResults(results);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Search failed.");
      setApiResults([]);
    } finally {
      setApiLoading(false);
    }
  }

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
    setSelectedFood(food);
    setPendingCandidate(null);
    setPendingMatch(null);
  }

  function useExistingMatch() {
    if (pendingMatch) setSelectedFood(pendingMatch);
    setPendingCandidate(null);
    setPendingMatch(null);
  }

  async function handleConfirm() {
    if (!selectedFood) return;
    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) return;
    setSaving(true);
    try {
      await onAdd(selectedFood.id, meal, qty);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // --- Quantity step ---
  if (selectedFood) {
    const preview = macrosForQuantity(selectedFood, parseFloat(quantity) || 0);
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{selectedFood.name}</h3>
            <button className="btn btn-ghost" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Quantity ({selectedFood.serving_unit} × serving)</label>
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
            Serving: {selectedFood.serving_size}
            {selectedFood.serving_unit} • {selectedFood.calories} kcal /100
            {selectedFood.serving_unit === "ml" ? "ml" : "g"}
          </p>

          <div className="card" style={{ background: "var(--color-surface-alt)", marginBottom: 16 }}>
            <div className="flex-between">
              <strong>{Math.round(preview.calories)} kcal</strong>
              <span className="text-muted" style={{ fontSize: 12 }}>
                P {Math.round(preview.protein_g)}g · C {Math.round(preview.carbs_g)}g · F{" "}
                {Math.round(preview.fat_g)}g
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setSelectedFood(null)}>
              Back
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={handleConfirm}
              disabled={saving || !quantity}
            >
              {saving ? "Adding..." : "Add to log"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Dedup confirmation ---
  if (pendingCandidate && pendingMatch) {
    return (
      <div className="modal-overlay" onClick={onClose}>
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
            <button
              className="btn btn-primary btn-block"
              onClick={() => createFoodFromCandidate(pendingCandidate)}
            >
              Add as new
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Search step ---
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add food</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder="Search your foods..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setApiResults(null);
          }}
          autoFocus
          style={{ width: "100%", marginBottom: 14 }}
        />

        {frequentFoods.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>
              Frequent
            </div>
            {frequentFoods.map((f) => (
              <FoodRow key={f.id} food={f} onClick={() => setSelectedFood(f)} />
            ))}
          </>
        )}

        <div className="section-title" style={{ marginTop: frequentFoods.length ? 20 : 0 }}>
          Your foods
        </div>
        {personalMatches.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>
            No matches in your food database.
          </p>
        )}
        {personalMatches.map((f) => (
          <FoodRow key={f.id} food={f} onClick={() => setSelectedFood(f)} />
        ))}

        {query.trim().length >= 2 && (
          <>
            <div className="section-title">Search external databases</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => runApiSearch("off")}
                disabled={apiLoading}
              >
                Open Food Facts
              </button>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => runApiSearch("usda")}
                disabled={apiLoading}
              >
                USDA (generic foods)
              </button>
            </div>

            {apiLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                <div className="spinner" />
              </div>
            )}
            {apiError && <p className="error-text">{apiError}</p>}
            {apiResults && !apiLoading && apiResults.length === 0 && (
              <p className="text-muted" style={{ fontSize: 13 }}>
                No results from {apiSource === "off" ? "Open Food Facts" : "USDA"}.
              </p>
            )}
            {apiResults?.map((c) => (
              <div className="list-row" key={`${c.source}-${c.source_id}`}>
                <div className="list-row-main">
                  <div className="list-row-title">{c.name}</div>
                  <div className="list-row-sub">
                    {Math.round(c.calories)} kcal /100{c.serving_unit === "ml" ? "ml" : "g"} · P{" "}
                    {Math.round(c.protein_g)}g C {Math.round(c.carbs_g)}g F {Math.round(c.fat_g)}g
                  </div>
                </div>
                <div className="list-row-actions">
                  <button className="btn btn-primary btn-icon" onClick={() => pickCandidate(c)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function FoodRow({ food, onClick }: { food: Food; onClick: () => void }) {
  return (
    <div className="list-row" style={{ cursor: "pointer" }} onClick={onClick}>
      <div className="list-row-main">
        <div className="list-row-title">{food.name}</div>
        <div className="list-row-sub">
          {Math.round(food.calories)} kcal /100{food.serving_unit === "ml" ? "ml" : "g"}
        </div>
      </div>
      <div className="list-row-actions">
        <button className="btn btn-primary btn-icon" tabIndex={-1}>
          +
        </button>
      </div>
    </div>
  );
}

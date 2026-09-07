import { useMemo, useState } from "react";
import { MEALS, macrosForQuantity, type Food, type FoodInput, type Meal } from "../../lib/types";
import { IconArrowLeft, IconClose } from "../icons";
import FoodForm from "./FoodForm";

interface Props {
  foods: Food[];
  onClose: () => void;
  onCreateFood: (input: FoodInput) => Promise<Food>;
  onSave: (name: string, defaultMeal: Meal, items: { foodId: string; quantity: number }[]) => Promise<void>;
}

interface BuilderItem {
  food: Food;
  quantity: number;
}

export default function MealBuilder({ foods, onClose, onCreateFood, onSave }: Props) {
  const [name, setName] = useState("");
  const [defaultMeal, setDefaultMeal] = useState<Meal>("breakfast");
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickerResults = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const base = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
    return base.slice(0, 30);
  }, [foods, pickerQuery]);

  const totals = items.reduce(
    (acc, i) => {
      const m = macrosForQuantity(i.food, i.quantity);
      return {
        calories: acc.calories + m.calories,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  function addItem(food: Food) {
    setItems((prev) => {
      const existing = prev.find((i) => i.food.id === food.id);
      if (existing) {
        return prev.map((i) => (i.food.id === food.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { food, quantity: 1 }];
    });
  }

  function updateQuantity(foodId: string, quantity: number) {
    setItems((prev) => prev.map((i) => (i.food.id === foodId ? { ...i, quantity } : i)));
  }

  function removeItem(foodId: string) {
    setItems((prev) => prev.filter((i) => i.food.id !== foodId));
  }

  async function handleSave() {
    if (!name.trim() || items.length === 0) return;
    setSaving(true);
    try {
      await onSave(
        name.trim(),
        defaultMeal,
        items.map((i) => ({ foodId: i.food.id, quantity: i.quantity })),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>New meal</h3>
      </div>

      <div className="screen-body">
        <div className="field">
          <label>Meal title</label>
          <input
            type="text"
            placeholder="e.g. Chicken Meal Prep 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Default meal</label>
          <select value={defaultMeal} onChange={(e) => setDefaultMeal(e.target.value as Meal)}>
            {MEALS.map((m) => (
              <option key={m} value={m}>
                {m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="card" style={{ background: "var(--color-surface-alt)", marginBottom: 16 }}>
          <div className="flex-between">
            <strong>{Math.round(totals.calories)} kcal</strong>
            <span className="text-muted" style={{ fontSize: 12 }}>
              P {Math.round(totals.protein_g)}g · C {Math.round(totals.carbs_g)}g · F{" "}
              {Math.round(totals.fat_g)}g
            </span>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>
          Items
        </div>
        {items.length === 0 ? (
          <p className="empty-state">No foods added yet.</p>
        ) : (
          items.map((item) => {
            const m = macrosForQuantity(item.food, item.quantity);
            return (
              <div className="list-row" key={item.food.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{item.food.name}</div>
                  <div className="list-row-sub">
                    {Math.round(m.calories)} kcal · P {Math.round(m.protein_g)}g C {Math.round(m.carbs_g)}g F{" "}
                    {Math.round(m.fat_g)}g
                  </div>
                </div>
                <div className="list-row-actions" style={{ gap: 8 }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.food.id, parseFloat(e.target.value) || 0)}
                    style={{ width: 56, padding: "4px 6px" }}
                  />
                  <button className="btn btn-ghost" onClick={() => removeItem(item.food.id)}>
                    <IconClose className="icon" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary btn-block" onClick={() => setPickerOpen(true)}>
            + Add food
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => setShowCustomForm(true)}>
            + Custom macros
          </button>
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 20 }}
          onClick={handleSave}
          disabled={saving || !name.trim() || items.length === 0}
        >
          {saving ? "Saving..." : "Save meal"}
        </button>
      </div>

      {pickerOpen && (
        <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setPickerOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add food</h3>
              <button className="btn btn-ghost" onClick={() => setPickerOpen(false)}>
                <IconClose className="icon" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search your foods..."
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              autoFocus
              style={{ width: "100%", marginBottom: 12 }}
            />
            {pickerResults.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
                No matches.
              </p>
            ) : (
              pickerResults.map((f) => (
                <div className="list-row" style={{ cursor: "pointer" }} key={f.id} onClick={() => addItem(f)}>
                  <div className="list-row-main">
                    <div className="list-row-title">{f.name}</div>
                    <div className="list-row-sub">
                      {Math.round(f.calories)} kcal /100{f.serving_unit === "ml" ? "ml" : "g"}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <button className="btn btn-primary btn-icon" tabIndex={-1}>
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
            <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={() => setPickerOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}

      {showCustomForm && (
        <FoodForm
          food={null}
          onClose={() => setShowCustomForm(false)}
          onSave={async (input) => {
            const food = await onCreateFood(input);
            addItem(food);
          }}
        />
      )}
    </div>
  );
}

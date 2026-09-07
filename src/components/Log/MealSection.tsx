import { useState } from "react";
import { macrosForQuantity, sumMacros, type FoodLogWithFood, type Meal } from "../../lib/types";

interface Props {
  meal: Meal;
  logs: FoodLogWithFood[];
  onAddClick: () => void;
  onEditQuantity: (id: string, quantity: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSaveAsPreset: () => void;
}

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export default function MealSection({
  meal,
  logs,
  onAddClick,
  onEditQuantity,
  onDelete,
  onSaveAsPreset,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const totals = sumMacros(logs.map((l) => macrosForQuantity(l.food, l.quantity)));

  function startEdit(id: string, quantity: number) {
    setEditingId(id);
    setEditValue(String(quantity));
  }

  async function saveEdit(id: string) {
    const qty = parseFloat(editValue);
    if (!Number.isNaN(qty) && qty > 0) {
      await onEditQuantity(id, qty);
    }
    setEditingId(null);
  }

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: logs.length ? 8 : 0 }}>
        <h3 style={{ fontSize: 15 }}>{MEAL_LABELS[meal]}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {logs.length > 0 && (
            <>
              <span className="text-muted" style={{ fontSize: 12 }}>
                {Math.round(totals.calories)} kcal
              </span>
              <button className="btn btn-ghost" onClick={onSaveAsPreset} title="Save as preset">
                ⭐
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={onAddClick}>
            + Add
          </button>
        </div>
      </div>

      {logs.map((log) => {
        const m = macrosForQuantity(log.food, log.quantity);
        return (
          <div className="list-row" key={log.id}>
            <div className="list-row-main">
              <div className="list-row-title">{log.food.name}</div>
              {editingId === log.id ? (
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{ width: 70, padding: "4px 8px" }}
                  />
                  <button className="btn btn-primary" style={{ padding: "4px 10px" }} onClick={() => saveEdit(log.id)}>
                    ✓
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px" }}
                    onClick={() => setEditingId(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="list-row-sub">
                  {log.quantity}× serving · {Math.round(m.calories)} kcal · P{" "}
                  {Math.round(m.protein_g)}g C {Math.round(m.carbs_g)}g F {Math.round(m.fat_g)}g
                </div>
              )}
            </div>
            {editingId !== log.id && (
              <div className="list-row-actions">
                <button className="btn btn-ghost" onClick={() => startEdit(log.id, log.quantity)}>
                  Edit
                </button>
                <button className="btn btn-ghost" onClick={() => onDelete(log.id)}>
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

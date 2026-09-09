import { useState } from "react";
import { parseISO } from "date-fns";
import {
  defaultServing,
  macrosForServing,
  type Food,
  type FoodInput,
  type FoodLogWithFood,
  type FoodServing,
  type MealPresetWithItems,
} from "../../lib/types";
import { IconClose } from "../icons";
import Energy from "../Energy";
import MealBuilder from "../Foods/MealBuilder";
import type { PresetItemInput } from "../../hooks/useMealPresets";

interface Props {
  log: FoodLogWithFood;
  onClose: () => void;
  onSave: (changes: { quantity: number; serving_id: string | null; created_at: string }) => Promise<void>;
  onDelete: () => Promise<void>;
  foods: Food[];
  servingsByFood: Map<string, FoodServing[]>;
  presets: MealPresetWithItems[];
  onCreateFood: (input: FoodInput) => Promise<Food>;
  onFoodCreated: (food: Food) => void;
  onUpdatePreset: (id: string, name: string, items: PresetItemInput[], servingsCount: number) => Promise<void>;
  onMealEdited: () => void;
}

function toTimeInputValue(iso: string): string {
  const d = parseISO(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function EditLogModal({
  log,
  onClose,
  onSave,
  onDelete,
  foods,
  servingsByFood,
  presets,
  onCreateFood,
  onFoodCreated,
  onUpdatePreset,
  onMealEdited,
}: Props) {
  const servings = servingsByFood.get(log.food_id) ?? [];
  const [quantity, setQuantity] = useState(String(log.quantity));
  const [servingId, setServingId] = useState<string | null>(
    log.serving?.id ?? defaultServing(servings)?.id ?? null,
  );
  const [time, setTime] = useState(toTimeInputValue(log.created_at));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMealBuilder, setShowMealBuilder] = useState(false);

  const qtyNum = parseFloat(quantity) || 0;
  const selectedServing = servings.find((s) => s.id === servingId) ?? null;
  const macros = macrosForServing(log.food, selectedServing?.grams_equivalent ?? 100, qtyNum);
  const matchingPreset =
    log.food.source === "meal" ? presets.find((p) => p.food_id === log.food_id) ?? null : null;

  async function handleSave() {
    if (qtyNum <= 0) return;
    setSaving(true);
    try {
      const [hh, mm] = time.split(":").map(Number);
      const updated = parseISO(log.created_at);
      updated.setHours(hh, mm, 0, 0);
      await onSave({ quantity: qtyNum, serving_id: servingId, created_at: updated.toISOString() });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{log.food.name}</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            <IconClose className="icon" />
          </button>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Serving</label>
            <select value={servingId ?? ""} onChange={(e) => setServingId(e.target.value || null)}>
              {servings.map((s) => (
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
        </div>

        <div className="field">
          <label>Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <div className="card" style={{ background: "var(--color-surface-alt)", marginBottom: 16 }}>
          <div className="flex-between">
            <strong>
              <Energy kcal={macros.calories} />
            </strong>
            <span className="text-muted" style={{ fontSize: 12 }}>
              P {Math.round(macros.protein_g)}g · C {Math.round(macros.carbs_g)}g · F {Math.round(macros.fat_g)}g
            </span>
          </div>
          {(log.food.fiber_g != null || log.food.sugar_g != null || log.food.sodium_mg != null) && (
            <div className="flex-between" style={{ marginTop: 4 }}>
              <span />
              <span className="text-muted" style={{ fontSize: 12 }}>
                {log.food.fiber_g != null && `Fiber ${Math.round(macros.fiber_g)}g · `}
                {log.food.sugar_g != null && `Sugar ${Math.round(macros.sugar_g)}g · `}
                {log.food.sodium_mg != null && `Sodium ${Math.round(macros.sodium_mg)}mg`}
              </span>
            </div>
          )}
        </div>

        {matchingPreset && (
          <button
            className="btn btn-secondary btn-block"
            style={{ marginBottom: 12 }}
            onClick={() => setShowMealBuilder(true)}
          >
            Edit meal ingredients
          </button>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            Delete
          </button>
          <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving || qtyNum <= 0}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showMealBuilder && matchingPreset && (
        <MealBuilder
          foods={foods}
          servingsByFood={servingsByFood}
          preset={matchingPreset}
          onClose={() => setShowMealBuilder(false)}
          onCreateFood={onCreateFood}
          onFoodCreated={onFoodCreated}
          onUpdate={async (id, name, items, servingsCount) => {
            await onUpdatePreset(id, name, items, servingsCount);
            onMealEdited();
            setShowMealBuilder(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

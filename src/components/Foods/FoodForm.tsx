import { useState } from "react";
import type { Food, FoodInput, ServingUnit } from "../../lib/types";

interface Props {
  food: Food | null;
  onClose: () => void;
  onSave: (input: FoodInput) => Promise<void>;
}

export default function FoodForm({ food, onClose, onSave }: Props) {
  const [name, setName] = useState(food?.name ?? "");
  const [calories, setCalories] = useState(String(food?.calories ?? ""));
  const [protein, setProtein] = useState(String(food?.protein_g ?? ""));
  const [carbs, setCarbs] = useState(String(food?.carbs_g ?? ""));
  const [fat, setFat] = useState(String(food?.fat_g ?? ""));
  const [servingSize, setServingSize] = useState(String(food?.serving_size ?? "100"));
  const [servingUnit, setServingUnit] = useState<ServingUnit>(food?.serving_unit ?? "g");
  const [isFrequent, setIsFrequent] = useState(food?.is_frequent ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => parseFloat(s) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        calories: num(calories),
        protein_g: num(protein),
        carbs_g: num(carbs),
        fat_g: num(fat),
        serving_size: num(servingSize),
        serving_unit: servingUnit,
        source: food?.source ?? "manual",
        source_id: food?.source_id ?? null,
        is_frequent: isFrequent,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save food.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{food ? "Edit food" : "Add food"}</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Serving size</label>
              <input
                type="number"
                step="0.1"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Unit</label>
              <select value={servingUnit} onChange={(e) => setServingUnit(e.target.value as ServingUnit)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="oz">oz</option>
                <option value="piece">piece</option>
              </select>
            </div>
          </div>

          <p className="text-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>
            Macros below are per 100{servingUnit === "ml" ? "ml" : "g"} (normalized).
          </p>

          <div className="field-row">
            <div className="field">
              <label>Calories</label>
              <input type="number" step="0.1" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </div>
            <div className="field">
              <label>Protein (g)</label>
              <input type="number" step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Carbs (g)</label>
              <input type="number" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div className="field">
              <label>Fat (g)</label>
              <input type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={isFrequent}
              onChange={(e) => setIsFrequent(e.target.checked)}
            />
            Mark as frequent (quick-add on Log tab)
          </label>

          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? "Saving..." : "Save food"}
          </button>
        </form>
      </div>
    </div>
  );
}

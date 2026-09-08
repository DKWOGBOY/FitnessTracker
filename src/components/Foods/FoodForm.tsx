import { useState } from "react";
import type { BaseUnit, Food, FoodInput, FoodServing, FoodServingInput } from "../../lib/types";
import { IconClose, IconPlus } from "../icons";

interface Props {
  food: Food | null;
  existingServings?: FoodServing[];
  onClose: () => void;
  onSave: (input: FoodInput, extraServings: FoodServingInput[]) => Promise<void>;
}

interface ExtraServingRow {
  label: string;
  grams: string;
  isDefault: boolean;
}

const AUTO_LABEL = (unit: BaseUnit) => `100 ${unit}`;

export default function FoodForm({ food, existingServings = [], onClose, onSave }: Props) {
  const [name, setName] = useState(food?.name ?? "");
  const [calories, setCalories] = useState(String(food?.calories ?? ""));
  const [protein, setProtein] = useState(String(food?.protein_g ?? ""));
  const [carbs, setCarbs] = useState(String(food?.carbs_g ?? ""));
  const [fat, setFat] = useState(String(food?.fat_g ?? ""));
  const [baseUnit, setBaseUnit] = useState<BaseUnit>(food?.base_unit ?? "g");
  const [isFrequent, setIsFrequent] = useState(food?.is_frequent ?? false);
  const [extraServings, setExtraServings] = useState<ExtraServingRow[]>(() =>
    existingServings
      .filter((s) => s.label !== AUTO_LABEL(food?.base_unit ?? "g"))
      .map((s) => ({ label: s.label, grams: String(s.grams_equivalent), isDefault: s.is_default })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => parseFloat(s) || 0;

  function addServingRow() {
    setExtraServings((prev) => [...prev, { label: "", grams: "", isDefault: prev.length === 0 }]);
  }

  function updateServingRow(index: number, changes: Partial<ExtraServingRow>) {
    setExtraServings((prev) => prev.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  function removeServingRow(index: number) {
    setExtraServings((prev) => prev.filter((_, i) => i !== index));
  }

  function setDefaultRow(index: number | null) {
    setExtraServings((prev) => prev.map((row, i) => ({ ...row, isDefault: i === index })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const validRows = extraServings.filter((r) => r.label.trim() && num(r.grams) > 0);
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          name: name.trim(),
          calories: num(calories),
          protein_g: num(protein),
          carbs_g: num(carbs),
          fat_g: num(fat),
          base_unit: baseUnit,
          source: food?.source ?? "manual",
          source_id: food?.source_id ?? null,
          is_frequent: isFrequent,
          is_verified: food?.is_verified ?? false,
        },
        validRows.map((r) => ({
          label: r.label.trim(),
          grams_equivalent: num(r.grams),
          is_default: r.isDefault,
        })),
      );
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
            <IconClose className="icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="field">
            <label>Base unit</label>
            <select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value as BaseUnit)}>
              <option value="g">Grams (g)</option>
              <option value="ml">Millilitres (ml)</option>
            </select>
          </div>

          <p className="text-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>
            Macros below are per 100{baseUnit} (normalized).
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

          <div className="section-title" style={{ marginTop: 4 }}>
            Servings
          </div>

          <div className="list-row">
            <div className="list-row-main">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="radio"
                  name="default-serving"
                  checked={!extraServings.some((r) => r.isDefault)}
                  onChange={() => setDefaultRow(null)}
                />
                {AUTO_LABEL(baseUnit)} (always included)
              </label>
            </div>
          </div>

          {extraServings.map((row, i) => (
            <div className="list-row" key={i}>
              <div className="list-row-main">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="default-serving"
                    checked={row.isDefault}
                    onChange={() => setDefaultRow(i)}
                  />
                  <input
                    type="text"
                    placeholder="Label, e.g. 1 cup, cooked"
                    value={row.label}
                    onChange={(e) => updateServingRow(i, { label: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder={baseUnit}
                    value={row.grams}
                    onChange={(e) => updateServingRow(i, { grams: e.target.value })}
                    style={{ width: 70 }}
                  />
                </div>
              </div>
              <div className="list-row-actions">
                <button type="button" className="btn btn-ghost" onClick={() => removeServingRow(i)}>
                  <IconClose className="icon" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ marginTop: 8, marginBottom: 16 }}
            onClick={addServingRow}
          >
            <IconPlus className="icon" /> Add serving
          </button>

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

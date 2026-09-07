import { useState } from "react";
import type { Target } from "../../lib/types";
import { todayStr } from "../../lib/dates";

interface Props {
  currentTarget: Target | null;
  onSave: (input: Omit<Target, "id" | "user_id">) => Promise<void>;
}

export default function ManualTargetForm({ currentTarget, onSave }: Props) {
  const [calories, setCalories] = useState(String(currentTarget?.calories ?? ""));
  const [protein, setProtein] = useState(String(currentTarget?.protein_g ?? ""));
  const [carbs, setCarbs] = useState(String(currentTarget?.carbs_g ?? ""));
  const [fat, setFat] = useState(String(currentTarget?.fat_g ?? ""));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        effective_date: todayStr(),
        calories: parseFloat(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 4 }}>Current targets</h3>
      <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
        Saving creates a new target effective today — past days keep calculating against whatever
        was active at the time.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label>Calories</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required />
          </div>
          <div className="field">
            <label>Protein (g)</label>
            <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} required />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Carbs (g)</label>
            <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} required />
          </div>
          <div className="field">
            <label>Fat (g)</label>
            <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} required />
          </div>
        </div>
        <button type="submit" className="btn btn-secondary btn-block" disabled={saving}>
          {saving ? "Saving..." : "Save targets"}
        </button>
      </form>
    </div>
  );
}

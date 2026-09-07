import { useState } from "react";
import { useWeightLogsForDate } from "../../hooks/useWeightLogs";
import { formatWeight, weightUnitLabel, lbToKg, kgToLb, type UnitSystem } from "../../lib/units";
import { IconClose } from "../icons";

interface Props {
  date: string;
  unitSystem: UnitSystem;
}

export default function WeightCard({ date, unitSystem }: Props) {
  const { logs, addWeight, updateWeight, deleteWeight } = useWeightLogsForDate(date);
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    const kg = unitSystem === "imperial" ? lbToKg(num) : num;
    setSaving(true);
    try {
      if (editingId) {
        await updateWeight(editingId, kg);
        setEditingId(null);
      } else {
        await addWeight(kg);
      }
      setValue("");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(id: string, kg: number) {
    setEditingId(id);
    setValue((unitSystem === "imperial" ? kgToLb(kg) : kg).toFixed(1));
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Weight</h3>

      {logs.length > 0 && (
        <div className="stack-gap-sm" style={{ marginBottom: 12 }}>
          {logs.map((w) => (
            <div className="list-row" key={w.id}>
              <div className="list-row-main">
                <div className="list-row-title">{formatWeight(w.weight_kg, unitSystem)}</div>
                {w.notes && <div className="list-row-sub">{w.notes}</div>}
              </div>
              <div className="list-row-actions">
                <button className="btn btn-ghost" onClick={() => startEdit(w.id, w.weight_kg)}>
                  Edit
                </button>
                <button className="btn btn-ghost" onClick={() => deleteWeight(w.id)}>
                  <IconClose className="icon" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={`Weight (${weightUnitLabel(unitSystem)})`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={saving || !value}>
          {editingId ? "Save" : "Log"}
        </button>
        {editingId && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setEditingId(null);
              setValue("");
            }}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}

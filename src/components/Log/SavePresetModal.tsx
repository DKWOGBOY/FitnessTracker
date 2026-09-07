import { useState } from "react";
import type { FoodLogWithFood, Meal } from "../../lib/types";
import { IconClose } from "../icons";

interface Props {
  meal: Meal;
  logs: FoodLogWithFood[];
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function SavePresetModal({ meal, logs, onClose, onSave }: Props) {
  const [name, setName] = useState(meal[0].toUpperCase() + meal.slice(1));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Save as preset</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            <IconClose className="icon" />
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Saves these {logs.length} item{logs.length === 1 ? "" : "s"} as a one-tap quick-add:
        </p>
        <ul style={{ margin: "0 0 16px", paddingLeft: 18, fontSize: 13 }}>
          {logs.map((l) => (
            <li key={l.id}>
              {l.food.name} ({l.quantity}×)
            </li>
          ))}
        </ul>

        <div className="field">
          <label>Preset name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Save preset"}
        </button>
      </div>
    </div>
  );
}

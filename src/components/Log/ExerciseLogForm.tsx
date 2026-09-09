import { useState } from "react";
import { IconClose } from "../icons";

interface Props {
  onClose: () => void;
  onSave: (name: string, caloriesBurned: number) => Promise<void>;
}

export default function ExerciseLogForm({ onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), parseFloat(calories) || 0);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save exercise.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log exercise</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            <IconClose className="icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>What did you do?</label>
            <input
              type="text"
              placeholder="e.g. Run, walk, swim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Calories burned</label>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>

          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from "react";
import { parseISO } from "date-fns";
import { macrosForQuantity, type FoodLogWithFood } from "../../lib/types";
import { IconClose } from "../icons";
import Energy from "../Energy";

interface Props {
  log: FoodLogWithFood;
  onClose: () => void;
  onSave: (changes: { quantity: number; created_at: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}

function toTimeInputValue(iso: string): string {
  const d = parseISO(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function EditLogModal({ log, onClose, onSave, onDelete }: Props) {
  const [quantity, setQuantity] = useState(String(log.quantity));
  const [time, setTime] = useState(toTimeInputValue(log.created_at));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const qtyNum = parseFloat(quantity) || 0;
  const macros = macrosForQuantity(log.food, qtyNum);

  async function handleSave() {
    if (qtyNum <= 0) return;
    setSaving(true);
    try {
      const [hh, mm] = time.split(":").map(Number);
      const updated = parseISO(log.created_at);
      updated.setHours(hh, mm, 0, 0);
      await onSave({ quantity: qtyNum, created_at: updated.toISOString() });
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
            <label>Quantity ({log.food.serving_unit} × serving)</label>
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
            <label>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
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
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            Delete
          </button>
          <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving || qtyNum <= 0}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

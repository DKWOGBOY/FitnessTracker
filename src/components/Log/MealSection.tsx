import { useState } from "react";
import { format, parseISO } from "date-fns";
import { macrosForQuantity, sumMacros, type FoodLogWithFood, type Meal } from "../../lib/types";
import { IconPlus } from "../icons";
import Energy from "../Energy";
import SwipeableRow from "./SwipeableRow";
import EditLogModal from "./EditLogModal";

interface Props {
  meal: Meal;
  logs: FoodLogWithFood[];
  onAddClick: () => void;
  onEditLog: (id: string, changes: { quantity: number; created_at: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export default function MealSection({ meal, logs, onAddClick, onEditLog, onDelete }: Props) {
  const [editingLog, setEditingLog] = useState<FoodLogWithFood | null>(null);

  const totals = sumMacros(logs.map((l) => macrosForQuantity(l.food, l.quantity)));

  if (logs.length === 0) {
    return (
      <div className="card">
        <div className="flex-between">
          <h3>{MEAL_LABELS[meal]}</h3>
          <button className="btn btn-pill btn-pill-icon" onClick={onAddClick} aria-label="Add">
            <IconPlus className="icon" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex-between">
        <h3>{MEAL_LABELS[meal]}</h3>
        <strong>
          <Energy kcal={totals.calories} />
        </strong>
      </div>
      <div className="meal-macro-line">
        <span>
          <b>C</b> {Math.round(totals.carbs_g)}g
        </span>
        <span>
          <b>F</b> {Math.round(totals.fat_g)}g
        </span>
        <span>
          <b>P</b> {Math.round(totals.protein_g)}g
        </span>
      </div>

      {logs.map((log) => {
        const m = macrosForQuantity(log.food, log.quantity);
        return (
          <SwipeableRow key={log.id} onTap={() => setEditingLog(log)} onDelete={() => onDelete(log.id)}>
            <div className="log-row">
              <div className="flex-between" style={{ gap: 8 }}>
                <span className="log-row-title" style={{ minWidth: 0, flex: 1 }}>
                  {log.food.name}
                </span>
                <span className="log-row-kcal">
                  <Energy kcal={m.calories} withUnit={false} />
                </span>
              </div>
              <div className="list-row-sub">
                {format(parseISO(log.created_at), "h:mm a")} · {log.quantity}× serving
              </div>
            </div>
          </SwipeableRow>
        );
      })}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button className="btn btn-pill btn-pill-icon" onClick={onAddClick} aria-label="Add">
          <IconPlus className="icon" />
        </button>
      </div>

      {editingLog && (
        <EditLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSave={(changes) => onEditLog(editingLog.id, changes)}
          onDelete={() => onDelete(editingLog.id)}
        />
      )}
    </div>
  );
}

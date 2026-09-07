import { useState } from "react";
import { useFoods } from "../../hooks/useFoods";
import { useFoodLogs } from "../../hooks/useFoodLogs";
import { useTargets } from "../../hooks/useTargets";
import { useMealPresets } from "../../hooks/useMealPresets";
import { useStreak } from "../../hooks/useStreak";
import { todayStr } from "../../lib/dates";
import { MEALS, macrosForQuantity, sumMacros, type Meal, type MealPresetWithItems } from "../../lib/types";
import type { UnitSystem } from "../../lib/units";
import DateNav from "./DateNav";
import DailySummary from "./DailySummary";
import MealSection from "./MealSection";
import WeightCard from "./WeightCard";
import PresetBar from "./PresetBar";
import FoodSearchModal from "./FoodSearchModal";
import SavePresetModal from "./SavePresetModal";

export default function LogTab({ unitSystem }: { unitSystem: UnitSystem }) {
  const [date, setDate] = useState(todayStr());
  const [modalMeal, setModalMeal] = useState<Meal | null>(null);
  const [presetMeal, setPresetMeal] = useState<Meal | null>(null);

  const { foods, refresh: refreshFoods } = useFoods();
  const { logs, addLog, updateLog, deleteLog } = useFoodLogs(date);
  const { targetForDate } = useTargets();
  const { presets, savePreset, deletePreset } = useMealPresets();
  const { streak } = useStreak(logs.length);

  const consumed = sumMacros(logs.map((l) => macrosForQuantity(l.food, l.quantity)));
  const target = targetForDate(date);

  async function handleQuickAddPreset(preset: MealPresetWithItems) {
    for (const item of preset.items) {
      await addLog(item.food_id, preset.default_meal, item.quantity);
    }
  }

  return (
    <div>
      <DateNav date={date} onChange={setDate} />

      <div style={{ marginTop: 12 }}>
        <DailySummary consumed={consumed} target={target} streak={streak} />
      </div>

      <PresetBar presets={presets} onQuickAdd={handleQuickAddPreset} onDelete={deletePreset} />

      <div className="section-title" style={{ marginTop: 0 }}>
        Food log
      </div>
      {MEALS.map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          logs={logs.filter((l) => l.meal === meal)}
          onAddClick={() => setModalMeal(meal)}
          onEditQuantity={(id, qty) => updateLog(id, { quantity: qty })}
          onDelete={deleteLog}
          onSaveAsPreset={() => setPresetMeal(meal)}
        />
      ))}

      <div className="section-title">Weight</div>
      <WeightCard date={date} unitSystem={unitSystem} />

      {modalMeal && (
        <FoodSearchModal
          foods={foods}
          initialMeal={modalMeal}
          onClose={() => setModalMeal(null)}
          onAdd={async (foodId, meal, quantity) => {
            await addLog(foodId, meal, quantity);
          }}
          onFoodCreated={() => refreshFoods()}
        />
      )}

      {presetMeal && (
        <SavePresetModal
          meal={presetMeal}
          logs={logs.filter((l) => l.meal === presetMeal)}
          onClose={() => setPresetMeal(null)}
          onSave={async (name) => {
            const mealLogs = logs.filter((l) => l.meal === presetMeal);
            await savePreset(
              name,
              presetMeal,
              mealLogs.map((l) => ({ foodId: l.food_id, quantity: l.quantity })),
            );
          }}
        />
      )}
    </div>
  );
}

import { useFoods } from "../../hooks/useFoods";
import { useFoodLogs } from "../../hooks/useFoodLogs";
import { useTargets } from "../../hooks/useTargets";
import { useMealPresets } from "../../hooks/useMealPresets";
import { useStreak } from "../../hooks/useStreak";
import { MEALS, macrosForQuantity, sumMacros, type Meal } from "../../lib/types";
import type { UnitSystem } from "../../lib/units";
import DateNav from "./DateNav";
import DailySummary from "./DailySummary";
import MealSection from "./MealSection";
import WeightCard from "./WeightCard";
import WaterTracker from "./WaterTracker";
import ExerciseCard from "./ExerciseCard";
import PresetBar from "./PresetBar";
import FoodSearchModal from "./FoodSearchModal";

interface Props {
  unitSystem: UnitSystem;
  date: string;
  onDateChange: (date: string) => void;
  modalMeal: Meal | null;
  onModalMealChange: (meal: Meal | null) => void;
  waterTarget: number;
}

export default function LogTab({
  unitSystem,
  date,
  onDateChange,
  modalMeal,
  onModalMealChange,
  waterTarget,
}: Props) {
  const { foods, refresh: refreshFoods } = useFoods();
  const { logs, addLog, updateLog, deleteLog } = useFoodLogs(date);
  const { targetForDate } = useTargets();
  const { presets, deletePreset } = useMealPresets();
  const { streak } = useStreak(logs.length);

  const consumed = sumMacros(logs.map((l) => macrosForQuantity(l.food, l.quantity)));
  const target = targetForDate(date);

  async function handleQuickAddPreset(preset: (typeof presets)[number]) {
    if (!preset.food_id) return;
    await addLog(preset.food_id, preset.default_meal, 1);
  }

  return (
    <div>
      <DailySummary consumed={consumed} target={target} streak={streak} />

      <DateNav date={date} onChange={onDateChange} />

      <PresetBar presets={presets} onQuickAdd={handleQuickAddPreset} onDelete={deletePreset} />

      <WaterTracker date={date} target={waterTarget} />

      {MEALS.map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          logs={logs.filter((l) => l.meal === meal)}
          onAddClick={() => onModalMealChange(meal)}
          onEditLog={(id, changes) => updateLog(id, changes)}
          onDelete={deleteLog}
        />
      ))}

      <div className="section-title">Exercise</div>
      <ExerciseCard date={date} />

      <div className="section-title">Weight</div>
      <WeightCard date={date} unitSystem={unitSystem} />

      {modalMeal && (
        <FoodSearchModal
          foods={foods}
          presets={presets}
          initialMeal={modalMeal}
          onClose={() => onModalMealChange(null)}
          onAdd={async (foodId, meal, quantity) => {
            await addLog(foodId, meal, quantity);
          }}
          onFoodCreated={() => refreshFoods()}
          onDeletePreset={deletePreset}
        />
      )}
    </div>
  );
}

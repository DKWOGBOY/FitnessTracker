import { useFoods } from "../../hooks/useFoods";
import { useFoodLogs } from "../../hooks/useFoodLogs";
import { useTargets } from "../../hooks/useTargets";
import { useMealPresets } from "../../hooks/useMealPresets";
import { useStreak } from "../../hooks/useStreak";
import { MEALS, macrosForLog, sumMacros, type Meal } from "../../lib/types";
import type { UnitSystem } from "../../lib/units";
import DateNav from "./DateNav";
import DailySummary from "./DailySummary";
import MealSection from "./MealSection";
import WeightCard from "./WeightCard";
import WaterTracker from "./WaterTracker";
import ExerciseCard from "./ExerciseCard";
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
  const { foods, servingsByFood, addFood, refresh: refreshFoods } = useFoods();
  const { logs, addLog, updateLog, deleteLog, refresh: refreshLogs } = useFoodLogs(date);
  const { targetForDate } = useTargets();
  const { presets, savePreset, updatePreset, deletePreset } = useMealPresets();
  const { streak } = useStreak(logs.length);

  const consumed = sumMacros(logs.map((l) => macrosForLog(l)));
  const target = targetForDate(date);

  return (
    <div>
      <DailySummary consumed={consumed} target={target} streak={streak} />

      <DateNav date={date} onChange={onDateChange} />

      <WaterTracker date={date} target={waterTarget} />

      {MEALS.map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          logs={logs.filter((l) => l.meal === meal)}
          onAddClick={() => onModalMealChange(meal)}
          onEditLog={(id, changes) => updateLog(id, changes)}
          onDelete={deleteLog}
          foods={foods}
          servingsByFood={servingsByFood}
          presets={presets}
          onCreateFood={addFood}
          onFoodCreated={() => refreshFoods()}
          onUpdatePreset={updatePreset}
          onMealEdited={() => refreshLogs()}
        />
      ))}

      <div className="section-title">Exercise</div>
      <ExerciseCard date={date} />

      <div className="section-title">Weight</div>
      <WeightCard date={date} unitSystem={unitSystem} />

      {modalMeal && (
        <FoodSearchModal
          foods={foods}
          servingsByFood={servingsByFood}
          presets={presets}
          initialMeal={modalMeal}
          onClose={() => onModalMealChange(null)}
          onAdd={async (foodId, meal, quantity, servingId) => {
            await addLog(foodId, meal, quantity, servingId);
          }}
          onFoodCreated={() => refreshFoods()}
          onDeletePreset={deletePreset}
          onCreateFood={addFood}
          onSaveMeal={savePreset}
        />
      )}
    </div>
  );
}

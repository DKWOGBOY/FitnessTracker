import { useFoods } from "../../hooks/useFoods";
import { useFoodLogs } from "../../hooks/useFoodLogs";
import { useTargets } from "../../hooks/useTargets";
import { useMealPresets } from "../../hooks/useMealPresets";
import { useStreak } from "../../hooks/useStreak";
import { useWaterLog } from "../../hooks/useWaterLog";
import { useExerciseLogs } from "../../hooks/useExerciseLogs";
import { useUserSettings } from "../../hooks/useUserSettings";
import type { LogPageInitialData } from "../../hooks/useLogPageInitialData";
import { MEALS, macrosForLog, sumMacros, type Meal } from "../../lib/types";
import DateNav from "./DateNav";
import DailySummary from "./DailySummary";
import MacroGauges from "./MacroGauges";
import MealSection from "./MealSection";
import WeighInReminder from "./WeighInReminder";
import WaterTracker from "./WaterTracker";
import ExerciseCard from "./ExerciseCard";
import FoodSearchModal from "./FoodSearchModal";

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  modalMeal: Meal | null;
  onModalMealChange: (meal: Meal | null) => void;
  waterTarget: number;
  onGoToTrends: () => void;
  /** Already-fetched data from the Log page's single consolidated RPC, or
   * null if it's unavailable (migration not applied yet, or the call
   * failed) - each hook below falls back to fetching independently. */
  initialData: LogPageInitialData | null;
}

export default function LogTabContent({
  date,
  onDateChange,
  modalMeal,
  onModalMealChange,
  waterTarget,
  onGoToTrends,
  initialData,
}: Props) {
  const { foods, servingsByFood, addFood, refresh: refreshFoods } = useFoods(
    initialData ? { foods: initialData.foods, servings: initialData.servings } : undefined,
  );
  const { logs, addLog, updateLog, deleteLog, refresh: refreshLogs } = useFoodLogs(date, initialData?.logs);
  const { targetForDate } = useTargets(initialData?.targets);
  const { presets, savePreset, updatePreset, deletePreset } = useMealPresets(initialData?.presets);
  const { streak } = useStreak(
    logs.length,
    initialData
      ? { foodDates: initialData.streakFoodDates, weightDates: initialData.streakWeightDates }
      : undefined,
  );
  const { litres, setLitres } = useWaterLog(date, initialData?.waterLitres);
  const { weighInReminderDays } = useUserSettings();
  const { logs: exerciseLogs, upsertLiftEstimate } = useExerciseLogs(date, initialData?.exerciseLogs);

  const consumed = sumMacros(logs.map((l) => macrosForLog(l)));
  const target = targetForDate(date);
  const burned = exerciseLogs.reduce((sum, e) => sum + e.calories_burned, 0);

  return (
    <div className="page-transition-in">
      <DailySummary consumed={consumed} target={target} streak={streak} burned={burned} />

      <WeighInReminder onGoToTrends={onGoToTrends} remindAfterDays={weighInReminderDays} />

      <DateNav date={date} onChange={onDateChange} />

      <MacroGauges consumed={consumed} target={target} />

      <WaterTracker target={waterTarget} litres={litres} setLitres={setLitres} />

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

      <ExerciseCard date={date} logs={exerciseLogs} onUpsertLiftEstimate={upsertLiftEstimate} />

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

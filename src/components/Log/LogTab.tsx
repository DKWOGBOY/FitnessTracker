import { useLogPageInitialData } from "../../hooks/useLogPageInitialData";
import { MEALS, type Macros, type Meal } from "../../lib/types";
import type { UnitSystem } from "../../lib/units";
import DateNav from "./DateNav";
import DailySummary from "./DailySummary";
import MealSection from "./MealSection";
import WeightCard from "./WeightCard";
import WaterTracker from "./WaterTracker";
import ExerciseCard from "./ExerciseCard";
import LogTabContent from "./LogTabContent";

interface Props {
  unitSystem: UnitSystem;
  date: string;
  onDateChange: (date: string) => void;
  modalMeal: Meal | null;
  onModalMealChange: (meal: Meal | null) => void;
  waterTarget: number;
}

const EMPTY_MACROS: Macros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

export default function LogTab(props: Props) {
  const { data, loading, error } = useLogPageInitialData(props.date);

  if (loading) {
    // Show the real page shell immediately with placeholder data instead of
    // a spinner - it fills in (rings sweeping to their real values) the
    // moment the consolidated fetch resolves, rather than blanking the
    // screen while it's in flight. Exercise/Weight manage their own data
    // independently, so they render for real right away.
    return (
      <div className="page-transition-in">
        <DailySummary consumed={EMPTY_MACROS} target={null} streak={0} />

        <DateNav date={props.date} onChange={props.onDateChange} />

        <WaterTracker target={props.waterTarget} litres={0} setLitres={async () => {}} />

        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            logs={[]}
            onAddClick={() => {}}
            onEditLog={async () => {}}
            onDelete={async () => {}}
            foods={[]}
            servingsByFood={new Map()}
            presets={[]}
            onCreateFood={async () => {
              throw new Error("Still loading");
            }}
            onFoodCreated={() => {}}
            onUpdatePreset={async () => {}}
            onMealEdited={() => {}}
          />
        ))}

        <div className="section-title">Exercise</div>
        <ExerciseCard date={props.date} />

        <div className="section-title">Weight</div>
        <WeightCard date={props.date} unitSystem={props.unitSystem} />
      </div>
    );
  }

  // On RPC failure (e.g. migration not yet applied), fall back to each hook
  // fetching its own data independently rather than getting stuck.
  return <LogTabContent {...props} initialData={error ? null : data} />;
}

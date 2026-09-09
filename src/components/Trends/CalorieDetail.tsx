import { useMemo, useState } from "react";
import { useLogAggregates } from "../../hooks/useLogAggregates";
import { useExerciseAggregate } from "../../hooks/useExerciseAggregate";
import { useTargets } from "../../hooks/useTargets";
import { useEnergyUnit } from "../../context/EnergyUnitContext";
import { energyUnitLabel, formatEnergy } from "../../lib/energy";
import { shiftDate, todayStr } from "../../lib/dates";
import { MEALS, type Meal } from "../../lib/types";
import { IconArrowLeft } from "../icons";
import ProgressRing from "../Log/ProgressRing";

interface Props {
  onClose: () => void;
}

type Range = "day" | "week" | "month";

const RANGE_DAYS: Record<Range, number> = { day: 1, week: 7, month: 30 };
const RANGE_LABELS: Record<Range, string> = { day: "Day", week: "Week", month: "Month" };
const PERIOD_LABELS: Record<Range, string> = { day: "Today", week: "Last 7 days", month: "Last 30 days" };

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

const MEAL_COLORS: Record<Meal, string> = {
  breakfast: "var(--color-carbs)",
  lunch: "var(--color-primary)",
  dinner: "var(--color-protein)",
  snack: "var(--color-fat)",
};

export default function CalorieDetail({ onClose }: Props) {
  const { energyUnit } = useEnergyUnit();
  const [range, setRange] = useState<Range>("day");
  const [selected, setSelected] = useState<Meal | null>(null);

  const { fromDate, toDate } = useMemo(() => {
    const days = RANGE_DAYS[range];
    return { fromDate: shiftDate(todayStr(), -(days - 1)), toDate: todayStr() };
  }, [range]);

  const { totals, byMeal, loading } = useLogAggregates(fromDate, toDate);
  const { burned } = useExerciseAggregate(fromDate, toDate);
  const { targetForDate } = useTargets();

  const goal = (targetForDate(todayStr())?.calories ?? 0) * RANGE_DAYS[range];
  const goalPct = goal > 0 ? (totals.calories / goal) * 100 : 0;

  const rows = MEALS.map((meal) => ({ meal, calories: byMeal[meal].calories }));
  const kcalTotal = rows.reduce((sum, r) => sum + r.calories, 0);

  function toggle(meal: Meal) {
    setSelected((cur) => (cur === meal ? null : meal));
  }

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>{energyUnit === "kj" ? "Kilojoules" : "Calories"}</h3>
      </div>

      <div className="screen-body">
        <div className="range-toggle range-toggle-block" style={{ marginBottom: 24 }}>
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button key={r} className={r === range ? "active" : ""} onClick={() => setRange(r)}>
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div className="ring-wrap" style={{ width: 148, height: 148 }}>
                <ProgressRing pct={goalPct} color="var(--color-primary)" trackColor="var(--color-bg-alt)" size={148} thickness={13} />
                <div className="ring-center">
                  <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
                    {formatEnergy(totals.calories, energyUnit)}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {goal > 0 ? `of ${formatEnergy(goal, energyUnit)} goal` : "no target set"}
                  </span>
                </div>
              </div>
            </div>

            {kcalTotal <= 0 ? (
              <p className="empty-state">No food logged in this period.</p>
            ) : (
              <div className="card plate-card">
                <div className="plate-card-head">
                  <span className="plate-kicker">Eaten · {PERIOD_LABELS[range]}</span>
                  <span className="plate-kcal">
                    {formatEnergy(kcalTotal, energyUnit)} {energyUnitLabel(energyUnit)}
                  </span>
                </div>

                <div className="plate-split">
                  {rows.map((r) => {
                    const share = kcalTotal > 0 ? (r.calories / kcalTotal) * 100 : 0;
                    const dim = selected !== null && selected !== r.meal;
                    return (
                      <div
                        className="plate-split-seg"
                        key={r.meal}
                        style={{ width: `${share}%`, background: MEAL_COLORS[r.meal], opacity: dim ? 0.35 : 1 }}
                      />
                    );
                  })}
                </div>

                <div>
                  {rows.map((r) => {
                    const share = kcalTotal > 0 ? Math.round((r.calories / kcalTotal) * 100) : 0;
                    const dim = selected !== null && selected !== r.meal;
                    return (
                      <button
                        type="button"
                        className="ledger-row"
                        key={r.meal}
                        style={{ opacity: dim ? 0.4 : 1 }}
                        onClick={() => toggle(r.meal)}
                      >
                        <span className="ledger-dot" style={{ background: MEAL_COLORS[r.meal] }} />
                        <span className="ledger-name">{MEAL_LABELS[r.meal]}</span>
                        <span className="ledger-share">{share}% of kcal</span>
                        <span className="ledger-val">{formatEnergy(r.calories, energyUnit)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {burned > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="list-row">
              <span>Burned</span>
              <strong>{formatEnergy(burned, energyUnit)}</strong>
            </div>
            <div className="list-row">
              <span>Net</span>
              <strong>{formatEnergy(totals.calories - burned, energyUnit)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

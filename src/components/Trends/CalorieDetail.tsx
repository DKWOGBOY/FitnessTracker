import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { useLogAggregates } from "../../hooks/useLogAggregates";
import { useTargets } from "../../hooks/useTargets";
import { useEnergyUnit } from "../../context/EnergyUnitContext";
import { energyUnitLabel, formatEnergy } from "../../lib/energy";
import { shiftDate, todayStr } from "../../lib/dates";
import { MEALS, type Meal } from "../../lib/types";
import { IconArrowLeft } from "../icons";
import Energy from "../Energy";

interface Props {
  onClose: () => void;
}

type Range = "day" | "week" | "month";

const RANGE_DAYS: Record<Range, number> = { day: 1, week: 7, month: 30 };
const RANGE_LABELS: Record<Range, string> = { day: "Day", week: "Week", month: "Month" };

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

  const { fromDate, toDate } = useMemo(() => {
    const days = RANGE_DAYS[range];
    return { fromDate: shiftDate(todayStr(), -(days - 1)), toDate: todayStr() };
  }, [range]);

  const { totals, byMeal, loading } = useLogAggregates(fromDate, toDate);
  const { targetForDate } = useTargets();

  const goal = (targetForDate(todayStr())?.calories ?? 0) * RANGE_DAYS[range];
  const goalPct = goal > 0 ? Math.round((totals.calories / goal) * 100) : null;

  const pieData = MEALS.map((meal) => ({ meal, calories: byMeal[meal].calories }));
  const pieTotal = pieData.reduce((sum, d) => sum + d.calories, 0);

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>{energyUnit === "kj" ? "Kilojoules" : "Calories"}</h3>
      </div>

      <div className="screen-body">
        <div className="range-toggle" style={{ marginBottom: 16 }}>
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
        ) : pieTotal <= 0 ? (
          <p className="empty-state">No food logged in this period.</p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <PieChart width={220} height={220}>
                <Pie
                  data={pieData}
                  dataKey="calories"
                  nameKey="meal"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={100}
                  stroke="none"
                  isAnimationActive
                  animationDuration={450}
                  animationEasing="ease-out"
                  label={({ value }) =>
                    typeof value === "number" && value > 0 ? `${Math.round((value / pieTotal) * 100)}%` : ""
                  }
                  labelLine={false}
                >
                  {pieData.map((d) => (
                    <Cell key={d.meal} fill={MEAL_COLORS[d.meal]} />
                  ))}
                </Pie>
              </PieChart>
            </div>

            <div className="macro-legend-grid" style={{ marginTop: 8, marginBottom: 20 }}>
              {pieData.map((d) => (
                <div className="macro-legend-item" key={d.meal}>
                  <span className="macro-legend-dot" style={{ background: MEAL_COLORS[d.meal] }} />
                  <div>
                    <div className="list-row-title">{MEAL_LABELS[d.meal]}</div>
                    <div className="list-row-sub">
                      {pieTotal > 0 ? Math.round((d.calories / pieTotal) * 100) : 0}% (
                      <Energy kcal={d.calories} />)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="card">
          <div className="list-row">
            <span>Total {energyUnitLabel(energyUnit)}</span>
            <strong>{formatEnergy(totals.calories, energyUnit)}</strong>
          </div>
          <div className="list-row">
            <span>%</span>
            <strong>{goalPct === null ? "—" : `${goalPct}%`}</strong>
          </div>
          <div className="list-row">
            <span>Goal</span>
            <strong>{formatEnergy(goal, energyUnit)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

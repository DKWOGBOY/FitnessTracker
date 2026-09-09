import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { useLogAggregates } from "../../hooks/useLogAggregates";
import { useTargets } from "../../hooks/useTargets";
import { shiftDate, todayStr } from "../../lib/dates";
import { IconArrowLeft } from "../icons";

interface Props {
  onClose: () => void;
}

type Range = "day" | "week" | "month";

const RANGE_DAYS: Record<Range, number> = { day: 1, week: 7, month: 30 };
const RANGE_LABELS: Record<Range, string> = { day: "Day", week: "Week", month: "Month" };

const MACROS_CONFIG = [
  { key: "carbs_g" as const, label: "Carbs", color: "var(--color-carbs)", kcalPerGram: 4 },
  { key: "fat_g" as const, label: "Fat", color: "var(--color-fat)", kcalPerGram: 9 },
  { key: "protein_g" as const, label: "Protein", color: "var(--color-protein)", kcalPerGram: 4 },
];

const EXTENDED_NUTRIENTS_CONFIG = [
  { key: "fiber_g" as const, label: "Fiber", unit: "g" },
  { key: "sugar_g" as const, label: "Sugar", unit: "g" },
  { key: "sodium_mg" as const, label: "Sodium", unit: "mg" },
];

export default function MacroDetail({ onClose }: Props) {
  const [range, setRange] = useState<Range>("day");
  const days = RANGE_DAYS[range];

  const { fromDate, toDate } = useMemo(() => {
    return { fromDate: shiftDate(todayStr(), -(days - 1)), toDate: todayStr() };
  }, [days]);

  const { totals, loading } = useLogAggregates(fromDate, toDate);
  const { targetForDate } = useTargets();
  const target = targetForDate(todayStr());

  const pieData = MACROS_CONFIG.map((m) => ({ ...m, kcal: totals[m.key] * m.kcalPerGram }));
  const pieTotal = pieData.reduce((sum, d) => sum + d.kcal, 0);

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>Macros</h3>
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
                  dataKey="kcal"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
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
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="macro-legend-grid" style={{ marginTop: 8, marginBottom: 20 }}>
              {pieData.map((d) => (
                <div className="macro-legend-item" key={d.key}>
                  <span className="macro-legend-dot" style={{ background: d.color }} />
                  <div>
                    <div className="list-row-title">{d.label}</div>
                    <div className="list-row-sub">
                      {pieTotal > 0 ? Math.round((d.kcal / pieTotal) * 100) : 0}% ({Math.round(totals[d.key])}g)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {MACROS_CONFIG.map(({ key, label, color }) => {
          const goal = (target?.[key] ?? 0) * days;
          const goalPct = goal > 0 ? Math.round((totals[key] / goal) * 100) : null;
          return (
            <div className="card" style={{ marginBottom: 12 }} key={key}>
              <div className="list-row">
                <span style={{ color, fontWeight: 700 }}>{label}</span>
                <strong>{Math.round(totals[key])} g</strong>
              </div>
              <div className="list-row">
                <span>%</span>
                <strong>{goalPct === null ? "—" : `${goalPct}%`}</strong>
              </div>
              <div className="list-row">
                <span>Goal</span>
                <strong>{Math.round(goal)} g</strong>
              </div>
            </div>
          );
        })}

        {!loading && pieTotal > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              Extended nutrients
            </div>
            {EXTENDED_NUTRIENTS_CONFIG.map(({ key, label, unit }) => (
              <div className="list-row" key={key}>
                <span>{label}</span>
                <strong>
                  {Math.round(totals[key])} {unit}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

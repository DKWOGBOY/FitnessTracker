import { useMemo, useState } from "react";
import { useLogAggregates } from "../../hooks/useLogAggregates";
import { useTargets } from "../../hooks/useTargets";
import { shiftDate, todayStr } from "../../lib/dates";
import { IconArrowLeft } from "../icons";
import ProgressRing from "../Log/ProgressRing";

interface Props {
  onClose: () => void;
}

type Range = "day" | "week" | "month";

const RANGE_DAYS: Record<Range, number> = { day: 1, week: 7, month: 30 };
const RANGE_LABELS: Record<Range, string> = { day: "Day", week: "Week", month: "Month" };
const PERIOD_LABELS: Record<Range, string> = { day: "Today", week: "Last 7 days", month: "Last 30 days" };

const MACROS_CONFIG = [
  { key: "protein_g" as const, label: "Protein", color: "var(--color-protein)", kcalPerGram: 4 },
  { key: "carbs_g" as const, label: "Carbs", color: "var(--color-carbs)", kcalPerGram: 4 },
  { key: "fat_g" as const, label: "Fat", color: "var(--color-fat)", kcalPerGram: 9 },
];

const EXTENDED_NUTRIENTS_CONFIG = [
  { key: "fiber_g" as const, label: "Fiber", unit: "g" },
  { key: "sugar_g" as const, label: "Sugar", unit: "g" },
  { key: "sodium_mg" as const, label: "Sodium", unit: "mg" },
];

export default function MacroDetail({ onClose }: Props) {
  const [range, setRange] = useState<Range>("day");
  const [selected, setSelected] = useState<string | null>(null);
  const days = RANGE_DAYS[range];

  const { fromDate, toDate } = useMemo(() => {
    return { fromDate: shiftDate(todayStr(), -(days - 1)), toDate: todayStr() };
  }, [days]);

  const { totals, loading } = useLogAggregates(fromDate, toDate);
  const { targetForDate } = useTargets();
  const target = targetForDate(todayStr());

  const rows = MACROS_CONFIG.map((m) => {
    const g = totals[m.key];
    const goal = (target?.[m.key] ?? 0) * days;
    return { ...m, g, goal, kcal: g * m.kcalPerGram };
  });
  const kcalTotal = rows.reduce((sum, r) => sum + r.kcal, 0);

  function toggle(key: string) {
    setSelected((cur) => (cur === key ? null : key));
  }

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>Macros</h3>
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
            <div className="macro-ring-row">
              {rows.map((r) => {
                const pct = r.goal > 0 ? (r.g / r.goal) * 100 : 0;
                const dim = selected !== null && selected !== r.key;
                return (
                  <div
                    className="macro-ring"
                    key={r.key}
                    style={{ cursor: "pointer", opacity: dim ? 0.35 : 1, transition: "opacity 0.2s ease" }}
                    onClick={() => toggle(r.key)}
                  >
                    <div className="ring-wrap" style={{ width: 88, height: 88 }}>
                      <ProgressRing pct={pct} color={r.color} trackColor="var(--color-bg-alt)" size={88} thickness={9} />
                      <div className="ring-center">
                        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>of goal</span>
                  </div>
                );
              })}
            </div>

            {kcalTotal <= 0 ? (
              <p className="empty-state">No food logged in this period.</p>
            ) : (
              <div className="card plate-card">
                <div className="plate-card-head">
                  <span className="plate-kicker">On the plate · {PERIOD_LABELS[range]}</span>
                  <span className="plate-kcal">{Math.round(kcalTotal).toLocaleString()} kcal</span>
                </div>

                <div className="plate-split">
                  {rows.map((r) => {
                    const share = kcalTotal > 0 ? (r.kcal / kcalTotal) * 100 : 0;
                    const dim = selected !== null && selected !== r.key;
                    return (
                      <div
                        className="plate-split-seg"
                        key={r.key}
                        style={{ width: `${share}%`, background: r.color, opacity: dim ? 0.35 : 1 }}
                      />
                    );
                  })}
                </div>

                <div>
                  {rows.map((r) => {
                    const share = kcalTotal > 0 ? Math.round((r.kcal / kcalTotal) * 100) : 0;
                    const dim = selected !== null && selected !== r.key;
                    return (
                      <button
                        type="button"
                        className="ledger-row"
                        key={r.key}
                        style={{ opacity: dim ? 0.4 : 1 }}
                        onClick={() => toggle(r.key)}
                      >
                        <span className="ledger-dot" style={{ background: r.color }} />
                        <span className="ledger-name">{r.label}</span>
                        <span className="ledger-share">{share}% of kcal</span>
                        <span className="ledger-val">
                          {Math.round(r.g)} / {Math.round(r.goal)} g
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && kcalTotal > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
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

import type { Macros, Target } from "../../lib/types";

interface Props {
  consumed: Macros;
  target: Target | null;
  streak: number;
}

function Row({
  label,
  color,
  consumed,
  target,
  unit,
}: {
  label: string;
  color: string;
  consumed: number;
  target: number | null;
  unit: string;
}) {
  const pct = target ? Math.min(100, (consumed / target) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="flex-between" style={{ marginBottom: 4 }}>
        <span className="macro-pill">
          <span className="macro-dot" style={{ background: color }} />
          {label}
        </span>
        <span style={{ fontSize: 13 }}>
          {Math.round(consumed)}
          {unit} {target ? `/ ${Math.round(target)}${unit}` : ""}
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function DailySummary({ consumed, target, streak }: Props) {
  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <h3>Today's summary</h3>
        {streak > 0 && (
          <span className="badge">
            🔥 {streak} day{streak === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <Row
        label="Calories"
        color="var(--color-primary)"
        consumed={consumed.calories}
        target={target?.calories ?? null}
        unit=""
      />
      <Row
        label="Protein"
        color="var(--color-protein)"
        consumed={consumed.protein_g}
        target={target?.protein_g ?? null}
        unit="g"
      />
      <Row
        label="Carbs"
        color="var(--color-carbs)"
        consumed={consumed.carbs_g}
        target={target?.carbs_g ?? null}
        unit="g"
      />
      <Row
        label="Fat"
        color="var(--color-fat)"
        consumed={consumed.fat_g}
        target={target?.fat_g ?? null}
        unit="g"
      />

      {!target && (
        <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
          No targets set yet — head to Settings to run the TDEE calculator.
        </p>
      )}
    </div>
  );
}

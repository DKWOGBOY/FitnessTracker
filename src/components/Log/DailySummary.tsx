import type { Macros, Target } from "../../lib/types";
import { IconFlame } from "../icons";
import ProgressRing from "./ProgressRing";

interface Props {
  consumed: Macros;
  target: Target | null;
  streak: number;
}

function MacroRing({
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
  const pct = target ? (consumed / target) * 100 : 0;
  return (
    <div className="macro-ring">
      <div className="ring-wrap" style={{ width: 76, height: 76 }}>
        <ProgressRing pct={pct} color={color} size={76} thickness={8} />
        <div className="ring-center">
          <span className="macro-ring-value">
            {Math.round(consumed)}
            {unit}
          </span>
        </div>
      </div>
      <span className="macro-ring-label">
        <span className="macro-dot" style={{ background: color }} />
        {label}
      </span>
      <span className="text-muted" style={{ fontSize: 11 }}>
        {target ? `/ ${Math.round(target)}${unit}` : "no target"}
      </span>
    </div>
  );
}

export default function DailySummary({ consumed, target, streak }: Props) {
  const calorieTarget = target?.calories ?? null;
  const calorieConsumed = consumed.calories;
  const remaining = calorieTarget !== null ? Math.round(calorieTarget - calorieConsumed) : null;
  const pct = calorieTarget ? (calorieConsumed / calorieTarget) * 100 : 0;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <h3>Today's summary</h3>
        {streak > 0 && (
          <span className="badge" style={{ gap: 5 }}>
            <IconFlame className="icon" />
            {streak} day{streak === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="calorie-ring-block">
        <div className="ring-wrap" style={{ width: 140, height: 140 }}>
          <ProgressRing pct={pct} color="var(--color-primary)" size={140} thickness={14} />
          <div className="ring-center">
            <span className="ring-value">{Math.round(calorieConsumed)}</span>
            <span className="ring-unit">kcal</span>
          </div>
        </div>
        <div className="calorie-ring-caption">
          <span className="text-muted" style={{ fontSize: 13 }}>
            {calorieTarget !== null ? `of ${Math.round(calorieTarget)} kcal target` : "No target set"}
          </span>
          {remaining !== null && (
            <div className="calorie-hero-remaining">
              {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
            </div>
          )}
        </div>
      </div>

      <div className="macro-ring-row">
        <MacroRing
          label="Protein"
          color="var(--color-protein)"
          consumed={consumed.protein_g}
          target={target?.protein_g ?? null}
          unit="g"
        />
        <MacroRing
          label="Carbs"
          color="var(--color-carbs)"
          consumed={consumed.carbs_g}
          target={target?.carbs_g ?? null}
          unit="g"
        />
        <MacroRing
          label="Fat"
          color="var(--color-fat)"
          consumed={consumed.fat_g}
          target={target?.fat_g ?? null}
          unit="g"
        />
      </div>

      {!target && (
        <p className="text-muted" style={{ fontSize: 12, marginTop: 14, textAlign: "center" }}>
          No targets set yet — head to Settings to run the TDEE calculator.
        </p>
      )}
    </div>
  );
}

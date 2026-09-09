import type { Macros, Target } from "../../lib/types";
import ProgressRing from "./ProgressRing";

interface Props {
  consumed: Macros;
  target: Target | null;
}

const MACROS_CONFIG = [
  { key: "protein_g" as const, label: "Protein", color: "var(--color-protein)" },
  { key: "carbs_g" as const, label: "Carbs", color: "var(--color-carbs)" },
  { key: "fat_g" as const, label: "Fat", color: "var(--color-fat)" },
];

export default function MacroGauges({ consumed, target }: Props) {
  return (
    <div className="macro-ring-row" style={{ marginBottom: 22 }}>
      {MACROS_CONFIG.map(({ key, label, color }) => {
        const goal = target?.[key] ?? null;
        const g = consumed[key];
        const pct = goal ? (g / goal) * 100 : 0;
        return (
          <div className="macro-ring" key={key}>
            <div className="ring-wrap" style={{ width: 72, height: 72 }}>
              <ProgressRing pct={pct} color={color} trackColor="var(--color-bg-alt)" size={72} thickness={8} />
              <div className="ring-center">
                <span style={{ fontSize: 15, fontWeight: 700 }}>{Math.round(g)}g</span>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color }}>
              {label}
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {goal ? `of ${Math.round(goal)}g` : "no target"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

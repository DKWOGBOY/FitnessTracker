import type { Macros, Target } from "../../lib/types";
import { IconFlame } from "../icons";
import { useEnergyUnit } from "../../context/EnergyUnitContext";
import { energyUnitLabel, formatEnergy } from "../../lib/energy";
import ProgressRing from "./ProgressRing";

interface Props {
  consumed: Macros;
  target: Target | null;
  streak: number;
}

const RING_TRACK = "rgba(255, 255, 255, 0.28)";

function MacroRing({
  label,
  consumed,
  target,
  unit,
}: {
  label: string;
  consumed: number;
  target: number | null;
  unit: string;
}) {
  const pct = target ? (consumed / target) * 100 : 0;
  return (
    <div className="macro-ring">
      <div className="ring-wrap" style={{ width: 72, height: 72 }}>
        <ProgressRing pct={pct} color="#fff" trackColor={RING_TRACK} size={72} thickness={7} />
        <div className="ring-center">
          <span className="summary-hero-macro-value">
            {Math.round(consumed)}
            {unit}
          </span>
        </div>
      </div>
      <span className="summary-hero-macro-label">{label}</span>
      <span className="summary-hero-macro-target">{target !== null ? `/${Math.round(target)}${unit}` : "no target"}</span>
    </div>
  );
}

export default function DailySummary({ consumed, target, streak }: Props) {
  const { energyUnit } = useEnergyUnit();
  const unitLabel = energyUnitLabel(energyUnit);
  const calorieTarget = target?.calories ?? null;
  const calorieConsumed = consumed.calories;
  const remaining = calorieTarget !== null ? calorieTarget - calorieConsumed : null;
  const pct = calorieTarget ? (calorieConsumed / calorieTarget) * 100 : 0;

  return (
    <div className="summary-hero">
      {streak > 0 && (
        <span className="summary-hero-streak">
          <IconFlame className="icon" />
          {streak} day{streak === 1 ? "" : "s"} streak
        </span>
      )}

      <div className="ring-wrap" style={{ width: 152, height: 152 }}>
        <ProgressRing pct={pct} color="#fff" trackColor={RING_TRACK} size={152} thickness={13} />
        <div className="ring-center">
          <span className="summary-hero-value">{formatEnergy(calorieConsumed, energyUnit)}</span>
          <span className="summary-hero-unit">{unitLabel} eaten</span>
        </div>
      </div>

      <div className="summary-hero-caption">
        {calorieTarget !== null
          ? remaining !== null && remaining < 0
            ? `${formatEnergy(Math.abs(remaining), energyUnit)} ${unitLabel} over your ${formatEnergy(calorieTarget, energyUnit)} target`
            : `${formatEnergy(remaining ?? 0, energyUnit)} ${unitLabel} left of ${formatEnergy(calorieTarget, energyUnit)}`
          : "No target set — head to Settings"}
      </div>

      <div className="macro-ring-row">
        <MacroRing label="Protein" consumed={consumed.protein_g} target={target?.protein_g ?? null} unit="g" />
        <MacroRing label="Carbs" consumed={consumed.carbs_g} target={target?.carbs_g ?? null} unit="g" />
        <MacroRing label="Fat" consumed={consumed.fat_g} target={target?.fat_g ?? null} unit="g" />
      </div>
    </div>
  );
}

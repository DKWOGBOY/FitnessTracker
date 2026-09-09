import type { Macros, Target } from "../../lib/types";
import { IconFlame } from "../icons";
import { useEnergyUnit } from "../../context/EnergyUnitContext";
import { energyUnitLabel, formatEnergy } from "../../lib/energy";

interface Props {
  consumed: Macros;
  target: Target | null;
  streak: number;
  burned: number;
}

export default function DailySummary({ consumed, target, streak, burned }: Props) {
  const { energyUnit } = useEnergyUnit();
  const unitLabel = energyUnitLabel(energyUnit);
  const calorieTarget = target?.calories ?? null;
  const calorieConsumed = consumed.calories;
  const remaining = calorieTarget !== null ? calorieTarget - calorieConsumed + burned : null;
  const pct = calorieTarget ? (calorieConsumed / calorieTarget) * 100 : 0;

  const over = remaining !== null && remaining < 0;
  const bigValue = calorieTarget === null ? calorieConsumed : over ? Math.abs(remaining!) : remaining!;
  const bigUnit = calorieTarget === null ? `${unitLabel} eaten` : over ? `${unitLabel} over` : `${unitLabel} left`;

  return (
    <>
      <div className="summary-hero">
        <div className="summary-hero-top">
          <span className="summary-hero-streak" style={{ opacity: streak > 0 ? 1 : 0 }}>
            <IconFlame className="icon" />
            {streak} day{streak === 1 ? "" : "s"} streak
          </span>
        </div>

        <div className="summary-hero-bignum">
          <span className="summary-hero-value">{formatEnergy(bigValue, energyUnit)}</span>
          <span className="summary-hero-unit">{bigUnit}</span>
        </div>

        <div className="summary-hero-track">
          <div className="summary-hero-track-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </div>
      </div>

      <div className="diary-maths">
        <div>
          <b>{formatEnergy(calorieConsumed, energyUnit)}</b> eaten
        </div>
        {burned > 0 && (
          <div>
            +<b>{formatEnergy(burned, energyUnit)}</b> training
          </div>
        )}
        <div>
          {calorieTarget !== null ? (
            <>
              <b>{formatEnergy(calorieTarget, energyUnit)}</b> goal
            </>
          ) : (
            "no target set"
          )}
        </div>
      </div>
    </>
  );
}

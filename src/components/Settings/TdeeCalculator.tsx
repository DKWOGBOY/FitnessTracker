import { useState } from "react";
import {
  ACTIVITY_LABELS,
  calculateTdee,
  type ActivityLevel,
  type Goal,
  type Sex,
  type TdeeResult,
} from "../../lib/tdee";
import { lbToKg, inToCm, type UnitSystem } from "../../lib/units";
import Energy from "../Energy";

interface Props {
  unitSystem: UnitSystem;
  onApply: (result: TdeeResult) => Promise<void>;
}

export default function TdeeCalculator({ unitSystem, onApply }: Props) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [result, setResult] = useState<TdeeResult | null>(null);
  const [applying, setApplying] = useState(false);

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);
    if (Number.isNaN(w) || Number.isNaN(h) || Number.isNaN(a)) return;

    const weightKg = unitSystem === "imperial" ? lbToKg(w) : w;
    const heightCm = unitSystem === "imperial" ? inToCm(h) : h;

    setResult(calculateTdee({ weightKg, heightCm, age: a, sex, activityLevel, goal }));
  }

  async function handleApply() {
    if (!result) return;
    setApplying(true);
    try {
      await onApply(result);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>TDEE / BMR calculator</h3>

      <form onSubmit={handleCalculate}>
        <div className="field-row">
          <div className="field">
            <label>Weight ({unitSystem === "imperial" ? "lb" : "kg"})</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} required />
          </div>
          <div className="field">
            <label>Height ({unitSystem === "imperial" ? "in" : "cm"})</label>
            <input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} required />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Age</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
          </div>
          <div className="field">
            <label>Sex</label>
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Activity level</label>
          <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}>
            {Object.entries(ACTIVITY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Goal</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            <option value="cut">Cut (-500 kcal)</option>
            <option value="maintain">Maintain</option>
            <option value="bulk">Bulk (+300 kcal)</option>
          </select>
        </div>

        <button type="submit" className="btn btn-secondary btn-block">
          Calculate
        </button>
      </form>

      {result && (
        <div className="card" style={{ background: "var(--color-surface-alt)", marginTop: 14 }}>
          <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
            BMR <Energy kcal={result.bmr} /> · TDEE <Energy kcal={result.tdee} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            <Energy kcal={result.targetCalories} /> / day
          </div>
          <div className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Protein {result.proteinG}g · Carbs {result.carbsG}g · Fat {result.fatG}g
          </div>
          <button className="btn btn-primary btn-block" onClick={handleApply} disabled={applying}>
            {applying ? "Applying..." : "Apply as new target"}
          </button>
        </div>
      )}
    </div>
  );
}

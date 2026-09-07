import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useEnergyUnit } from "../../context/EnergyUnitContext";
import { useTargets } from "../../hooks/useTargets";
import { supabase } from "../../lib/supabase";
import { downloadCsv, toCsv } from "../../lib/csv";
import { todayStr } from "../../lib/dates";
import type { UnitSystem } from "../../lib/units";
import TdeeCalculator from "./TdeeCalculator";
import ManualTargetForm from "./ManualTargetForm";
import LiftLoginForm from "./LiftLoginForm";

interface Props {
  unitSystem: UnitSystem;
  onUnitSystemChange: (u: UnitSystem) => void;
  waterTarget: number;
  onWaterTargetChange: (litres: number) => void;
}

export default function SettingsTab({ unitSystem, onUnitSystemChange, waterTarget, onWaterTargetChange }: Props) {
  const { user, signOut } = useAuth();
  const { energyUnit, setEnergyUnit } = useEnergyUnit();
  const { currentTarget, addTarget } = useTargets();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const [{ data: foodLogs }, { data: weightLogs }] = await Promise.all([
        supabase
          .from("food_logs")
          .select("log_date, meal, quantity, food:foods(name,calories,protein_g,carbs_g,fat_g)")
          .order("log_date", { ascending: true }),
        supabase.from("weight_logs").select("*").order("log_date", { ascending: true }),
      ]);

      const foodRows = (foodLogs ?? []).map((r: any) => ({
        log_date: r.log_date,
        meal: r.meal,
        food_name: r.food?.name ?? "",
        quantity: r.quantity,
      }));
      downloadCsv(
        `food_logs_${todayStr()}.csv`,
        toCsv(foodRows, ["log_date", "meal", "food_name", "quantity"]),
      );

      downloadCsv(
        `weight_logs_${todayStr()}.csv`,
        toCsv((weightLogs ?? []) as Record<string, unknown>[], ["log_date", "weight_kg", "notes"]),
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="tab-page">
      <h2 style={{ marginBottom: 16 }}>Settings</h2>

      <TdeeCalculator
        unitSystem={unitSystem}
        onApply={(result) =>
          addTarget({
            effective_date: todayStr(),
            calories: result.targetCalories,
            protein_g: result.proteinG,
            carbs_g: result.carbsG,
            fat_g: result.fatG,
          })
        }
      />

      <div style={{ marginTop: 12 }}>
        <ManualTargetForm currentTarget={currentTarget} onSave={addTarget} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 12 }}>Units</h3>
        <div className="range-toggle">
          <button
            className={unitSystem === "metric" ? "active" : ""}
            onClick={() => onUnitSystemChange("metric")}
          >
            Metric (kg/cm)
          </button>
          <button
            className={unitSystem === "imperial" ? "active" : ""}
            onClick={() => onUnitSystemChange("imperial")}
          >
            Imperial (lb/in)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 12 }}>Energy unit</h3>
        <div className="range-toggle">
          <button className={energyUnit === "kcal" ? "active" : ""} onClick={() => setEnergyUnit("kcal")}>
            Calories (kcal)
          </button>
          <button className={energyUnit === "kj" ? "active" : ""} onClick={() => setEnergyUnit("kj")}>
            Kilojoules (kJ)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 12 }}>Water target</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="number"
            step="0.1"
            min="0.5"
            value={waterTarget}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v) && v > 0) onWaterTargetChange(v);
            }}
            style={{ width: 90 }}
          />
          <span className="text-muted" style={{ fontSize: 13 }}>litres per day</span>
        </div>
      </div>

      <LiftLoginForm />

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 12 }}>Data export</h3>
        <button className="btn btn-secondary btn-block" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting..." : "Download CSV (food + weight logs)"}
        </button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="flex-between">
          <span className="text-muted" style={{ fontSize: 13 }}>
            {user?.email}
          </span>
          <button className="btn btn-danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

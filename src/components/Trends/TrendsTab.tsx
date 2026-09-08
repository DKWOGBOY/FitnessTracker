import { useState } from "react";
import type { UnitSystem } from "../../lib/units";
import CalorieOverviewCard from "./CalorieOverviewCard";
import MacroOverviewCard from "./MacroOverviewCard";
import WeightOverviewCard from "./WeightOverviewCard";
import CalorieDetail from "./CalorieDetail";
import MacroDetail from "./MacroDetail";
import WeightDetail from "./WeightDetail";

type Detail = "calories" | "macros" | "weight" | null;

export default function TrendsTab({ unitSystem }: { unitSystem: UnitSystem }) {
  const [detail, setDetail] = useState<Detail>(null);

  return (
    <div className="tab-page page-transition-in">
      <h2 style={{ marginBottom: 16 }}>Progress</h2>

      <CalorieOverviewCard onOpenDetail={() => setDetail("calories")} />

      <div style={{ marginTop: 12 }}>
        <MacroOverviewCard onOpenDetail={() => setDetail("macros")} />
      </div>

      <div style={{ marginTop: 12 }}>
        <WeightOverviewCard unitSystem={unitSystem} onOpenDetail={() => setDetail("weight")} />
      </div>

      {detail === "calories" && <CalorieDetail onClose={() => setDetail(null)} />}
      {detail === "macros" && <MacroDetail onClose={() => setDetail(null)} />}
      {detail === "weight" && <WeightDetail unitSystem={unitSystem} onClose={() => setDetail(null)} />}
    </div>
  );
}

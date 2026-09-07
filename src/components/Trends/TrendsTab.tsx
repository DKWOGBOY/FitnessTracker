import { useMemo, useState } from "react";
import { useWeightLogsRange } from "../../hooks/useWeightLogs";
import { useFoodLogsRange } from "../../hooks/useFoodLogsRange";
import { useTargets } from "../../hooks/useTargets";
import { daysAgoStr } from "../../lib/dates";
import type { UnitSystem } from "../../lib/units";
import WeightChart from "./WeightChart";
import CaloriesChart from "./CaloriesChart";
import MacrosChart from "./MacrosChart";

type Range = "7" | "30" | "90" | "all";

const RANGE_LABELS: Record<Range, string> = { "7": "7D", "30": "30D", "90": "90D", all: "All" };

export default function TrendsTab({ unitSystem }: { unitSystem: UnitSystem }) {
  const [range, setRange] = useState<Range>("30");

  const fromDate = useMemo(() => {
    if (range === "all") return null;
    return daysAgoStr(parseInt(range, 10));
  }, [range]);

  const { logs: weightLogs, loading: weightLoading } = useWeightLogsRange(fromDate);
  const { days, loading: foodLoading } = useFoodLogsRange(fromDate);
  const { targets } = useTargets();

  return (
    <div className="tab-page">
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2>Trends</h2>
        <div className="range-toggle">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button key={r} className={r === range ? "active" : ""} onClick={() => setRange(r)}>
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Weight</h3>
        {weightLoading ? (
          <Loading />
        ) : weightLogs.length === 0 ? (
          <Empty text="No weight entries in this range." />
        ) : (
          <WeightChart logs={weightLogs} unitSystem={unitSystem} />
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Calories vs target</h3>
        {foodLoading ? (
          <Loading />
        ) : days.length === 0 ? (
          <Empty text="No food logs in this range." />
        ) : (
          <CaloriesChart days={days} targets={targets} />
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Macro breakdown</h3>
        {foodLoading ? (
          <Loading />
        ) : days.length === 0 ? (
          <Empty text="No food logs in this range." />
        ) : (
          <MacrosChart days={days} />
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
      <div className="spinner" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="empty-state">{text}</p>;
}

import { useMemo, useState } from "react";
import { useWeightLogsRange } from "../../hooks/useWeightLogs";
import { daysAgoStr, todayStr } from "../../lib/dates";
import type { UnitSystem } from "../../lib/units";
import { IconArrowLeft } from "../icons";
import WeightChart from "./WeightChart";
import WeightCard from "../Log/WeightCard";

interface Props {
  unitSystem: UnitSystem;
  onClose: () => void;
}

type Range = "7" | "30" | "90" | "all";

const RANGE_LABELS: Record<Range, string> = { "7": "7D", "30": "30D", "90": "90D", all: "All" };

export default function WeightDetail({ unitSystem, onClose }: Props) {
  const [range, setRange] = useState<Range>("30");

  const fromDate = useMemo(() => {
    if (range === "all") return null;
    return daysAgoStr(parseInt(range, 10));
  }, [range]);

  const { logs: weightLogs, loading, refresh } = useWeightLogsRange(fromDate);

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>Weight</h3>
      </div>

      <div className="screen-body">
        <div className="range-toggle" style={{ marginBottom: 16 }}>
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
        ) : weightLogs.length === 0 ? (
          <p className="empty-state">No weight entries in this range.</p>
        ) : (
          <WeightChart logs={weightLogs} unitSystem={unitSystem} />
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <WeightCard date={todayStr()} unitSystem={unitSystem} onChange={refresh} />
        </div>
      </div>
    </div>
  );
}

interface DayValue {
  label: string;
  pct: number | null;
}

interface Props {
  values: DayValue[];
  color: string;
}

/** A row of 7 vertical pill bars (one per day), each filled to `pct`% of
 * that day's target - `null` (no target set that day) renders an empty
 * track. Mirrors the MFP-style weekly sparkline used on overview cards. */
export default function WeeklyBarRow({ values, color }: Props) {
  return (
    <div className="weekly-bars">
      {values.map((v, i) => (
        <div className="weekly-bar" key={i}>
          <div className="weekly-bar-track">
            <div
              className="weekly-bar-fill"
              style={{ height: `${Math.max(0, Math.min(100, v.pct ?? 0))}%`, background: color }}
            />
          </div>
          <span className="weekly-bar-label">{v.label}</span>
        </div>
      ))}
    </div>
  );
}

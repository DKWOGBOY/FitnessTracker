import { formatDateLabel, shiftDate, todayStr } from "../../lib/dates";

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export default function DateNav({ date, onChange }: Props) {
  const isToday = date === todayStr();

  return (
    <div className="flex-between" style={{ marginBottom: 4 }}>
      <button className="btn btn-secondary btn-icon" onClick={() => onChange(shiftDate(date, -1))}>
        ‹
      </button>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{formatDateLabel(date)}</div>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => onChange(e.target.value)}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            fontSize: 11,
            color: "var(--color-text-muted)",
            textAlign: "center",
          }}
        />
      </div>

      <button
        className="btn btn-secondary btn-icon"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={isToday}
      >
        ›
      </button>
    </div>
  );
}

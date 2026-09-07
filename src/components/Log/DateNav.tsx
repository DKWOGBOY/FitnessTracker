import { formatDateLabel, shiftDate, todayStr } from "../../lib/dates";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "../icons";

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export default function DateNav({ date, onChange }: Props) {
  const isToday = date === todayStr();

  return (
    <div className="date-nav">
      <button className="date-nav-arrow" onClick={() => onChange(shiftDate(date, -1))} aria-label="Previous day">
        <IconChevronLeft className="icon" />
      </button>

      <label className="date-nav-label">
        <IconCalendar className="icon" />
        {formatDateLabel(date)}
        <input type="date" value={date} max={todayStr()} onChange={(e) => onChange(e.target.value)} />
      </label>

      <button
        className="date-nav-arrow"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={isToday}
        aria-label="Next day"
      >
        <IconChevronRight className="icon" />
      </button>
    </div>
  );
}

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useFoodLogsRange } from "../../hooks/useFoodLogsRange";
import { useTargets } from "../../hooks/useTargets";
import { daysBetween, mondayOfWeek, shiftDate, todayStr } from "../../lib/dates";
import WeeklyBarRow from "./WeeklyBarRow";
import { IconChevronRight } from "../icons";

interface Props {
  onOpenDetail: () => void;
}

const MACROS_CONFIG = [
  { key: "carbs_g" as const, label: "Carbs", color: "var(--color-carbs)" },
  { key: "fat_g" as const, label: "Fat", color: "var(--color-fat)" },
  { key: "protein_g" as const, label: "Protein", color: "var(--color-protein)" },
];

export default function MacroOverviewCard({ onOpenDetail }: Props) {
  const monday = useMemo(() => mondayOfWeek(todayStr()), []);
  const { days } = useFoodLogsRange(monday);
  const { targetForDate } = useTargets();

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftDate(monday, i)), [monday]);
  const daysElapsed = Math.min(7, Math.max(1, daysBetween(monday, todayStr()) + 1));

  return (
    <div className="overview-card" onClick={onOpenDetail}>
      <div className="flex-between">
        <h3>Macros</h3>
        <IconChevronRight className="icon" />
      </div>
      {MACROS_CONFIG.map(({ key, label, color }) => {
        const week = dates.map((date) => {
          const value = byDate.get(date)?.[key] ?? 0;
          const target = targetForDate(date);
          return {
            label: format(parseISO(date), "EEEEE"),
            pct: target ? (value / target[key]) * 100 : null,
            value,
          };
        });
        const avg = week.slice(0, daysElapsed).reduce((sum, d) => sum + d.value, 0) / daysElapsed;
        return (
          <div className="overview-card-row" key={key}>
            <div>
              <div className="overview-card-macro-label" style={{ color }}>
                {label}
              </div>
              <div className="overview-card-avg-label">7-day avg</div>
              <div className="overview-card-avg-value">{Math.round(avg)} g</div>
            </div>
            <WeeklyBarRow values={week.map((d) => ({ label: d.label, pct: d.pct }))} color={color} />
          </div>
        );
      })}
    </div>
  );
}

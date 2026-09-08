import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useFoodLogsRange } from "../../hooks/useFoodLogsRange";
import { useTargets } from "../../hooks/useTargets";
import { useEnergyUnit } from "../../context/EnergyUnitContext";
import { energyUnitLabel, formatEnergy } from "../../lib/energy";
import { daysBetween, mondayOfWeek, shiftDate, todayStr } from "../../lib/dates";
import WeeklyBarRow from "./WeeklyBarRow";
import { IconChevronRight } from "../icons";

interface Props {
  onOpenDetail: () => void;
}

export default function CalorieOverviewCard({ onOpenDetail }: Props) {
  const { energyUnit } = useEnergyUnit();
  const monday = useMemo(() => mondayOfWeek(todayStr()), []);
  const { days } = useFoodLogsRange(monday);
  const { targetForDate } = useTargets();

  const week = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i)).map((date) => {
      const calories = byDate.get(date)?.calories ?? 0;
      const target = targetForDate(date);
      return {
        label: format(parseISO(date), "EEEEE"),
        pct: target ? (calories / target.calories) * 100 : null,
        calories,
      };
    });
  }, [days, targetForDate, monday]);

  const daysElapsed = Math.min(7, Math.max(1, daysBetween(monday, todayStr()) + 1));
  const avg = week.slice(0, daysElapsed).reduce((sum, d) => sum + d.calories, 0) / daysElapsed;

  return (
    <div className="overview-card" onClick={onOpenDetail}>
      <div className="flex-between">
        <h3>{energyUnit === "kj" ? "Kilojoules" : "Calories"}</h3>
        <IconChevronRight className="icon" />
      </div>
      <div className="overview-card-row">
        <div>
          <div className="overview-card-avg-label">7-day avg</div>
          <div className="overview-card-avg-value">
            {formatEnergy(avg, energyUnit)} {energyUnitLabel(energyUnit)}
          </div>
        </div>
        <WeeklyBarRow values={week.map((d) => ({ label: d.label, pct: d.pct }))} color="var(--color-primary)" />
      </div>
    </div>
  );
}

import { format, parseISO } from "date-fns";
import { useWeightSummary } from "../../hooks/useWeightLogs";
import { formatWeight, type UnitSystem } from "../../lib/units";
import { daysBetween, todayStr } from "../../lib/dates";
import { IconChevronRight } from "../icons";

interface Props {
  unitSystem: UnitSystem;
  onOpenDetail: () => void;
}

const REMIND_AFTER_DAYS = 7;

export default function WeightOverviewCard({ unitSystem, onOpenDetail }: Props) {
  const { first, last, loading } = useWeightSummary();

  if (loading) return null;

  const startKg = first?.weight_kg ?? null;
  const currentKg = last?.weight_kg ?? null;
  const change = startKg !== null && currentKg !== null ? currentKg - startKg : null;
  const daysSince = last ? daysBetween(last.log_date, todayStr()) : null;
  const dueSoon = daysSince === null || daysSince >= REMIND_AFTER_DAYS;

  return (
    <div className="overview-card" onClick={onOpenDetail}>
      <div className="flex-between">
        <h3>Weight</h3>
        <IconChevronRight className="icon" />
      </div>

      {startKg === null || currentKg === null ? (
        <p className="empty-state" style={{ marginTop: 10 }}>
          No weight logged yet.
        </p>
      ) : (
        <div className="weight-summary-grid">
          <div>
            <div className="overview-card-avg-label">Start</div>
            <div className="overview-card-avg-value">{formatWeight(startKg, unitSystem)}</div>
          </div>
          <div>
            <div className="overview-card-avg-label">
              Current{last ? ` (${format(parseISO(last.log_date), "d/M")})` : ""}
            </div>
            <div className="overview-card-avg-value">{formatWeight(currentKg, unitSystem)}</div>
          </div>
          <div>
            <div className="overview-card-avg-label">Change</div>
            <div className="overview-card-avg-value">
              {change === null || change === 0
                ? `→ ${formatWeight(0, unitSystem)}`
                : `${change > 0 ? "↗" : "↘"} ${formatWeight(Math.abs(change), unitSystem)}`}
            </div>
          </div>
        </div>
      )}

      {dueSoon && (
        <p className="weight-reminder-caption">
          {daysSince === null
            ? "You haven't logged your weight yet"
            : `${daysSince} day${daysSince === 1 ? "" : "s"} since your last weigh-in`}
        </p>
      )}

      <div className="weight-log-cta">
        <span>Log my weight</span>
        <IconChevronRight className="icon" />
      </div>
    </div>
  );
}

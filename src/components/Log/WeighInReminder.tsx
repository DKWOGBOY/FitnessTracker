import { useWeightSummary } from "../../hooks/useWeightLogs";
import { daysBetween, todayStr } from "../../lib/dates";
import { IconTarget } from "../icons";

interface Props {
  onGoToTrends: () => void;
  remindAfterDays: number;
}

export default function WeighInReminder({ onGoToTrends, remindAfterDays }: Props) {
  const { last, loading } = useWeightSummary();

  if (loading) return null;

  const daysSince = last ? daysBetween(last.log_date, todayStr()) : null;
  const due = daysSince === null || daysSince >= remindAfterDays;
  if (!due) return null;

  return (
    <button className="weigh-in-reminder" onClick={onGoToTrends}>
      <IconTarget className="icon" />
      <span>
        {daysSince === null
          ? "No weigh-ins yet - log your weight"
          : `${daysSince} days since your last weigh-in - log it`}
      </span>
    </button>
  );
}

import { useWeightSummary } from "../../hooks/useWeightLogs";
import { daysBetween, todayStr } from "../../lib/dates";
import { IconTarget } from "../icons";

const REMIND_AFTER_DAYS = 7;

interface Props {
  onGoToTrends: () => void;
}

export default function WeighInReminder({ onGoToTrends }: Props) {
  const { last, loading } = useWeightSummary();

  if (loading) return null;

  const daysSince = last ? daysBetween(last.log_date, todayStr()) : null;
  const due = daysSince === null || daysSince >= REMIND_AFTER_DAYS;
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

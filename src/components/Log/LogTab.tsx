import { useEffect, useState } from "react";
import { useLogPageInitialData } from "../../hooks/useLogPageInitialData";
import type { Meal } from "../../lib/types";
import LogTabContent from "./LogTabContent";

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  modalMeal: Meal | null;
  onModalMealChange: (meal: Meal | null) => void;
  waterTarget: number;
  onGoToTrends: () => void;
}

export default function LogTab(props: Props) {
  const { data, loading, error } = useLogPageInitialData(props.date);

  // The consolidated fetch normally resolves in well under a second, so
  // wait for it silently rather than showing placeholder/zeroed numbers
  // that would just flash into the real ones a moment later. Only show a
  // spinner if something is genuinely stuck - a real stall, not the
  // ordinary load.
  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setShowSpinner(true), 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return showSpinner ? (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <div className="spinner" />
      </div>
    ) : null;
  }

  // On RPC failure (e.g. migration not yet applied), fall back to each hook
  // fetching its own data independently rather than getting stuck.
  return <LogTabContent {...props} initialData={error ? null : data} />;
}

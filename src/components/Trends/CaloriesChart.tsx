import {
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DayMacros } from "../../hooks/useFoodLogsRange";
import type { Target } from "../../lib/types";

export default function CaloriesChart({ days, targets }: { days: DayMacros[]; targets: Target[] }) {
  function targetForDate(date: string): number | null {
    const applicable = targets.filter((t) => t.effective_date <= date);
    if (applicable.length === 0) return null;
    return applicable[applicable.length - 1].calories;
  }

  const data = days.map((d) => ({
    date: d.date,
    calories: Math.round(d.calories),
    target: targetForDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
        />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
        <Tooltip labelFormatter={(d) => format(parseISO(String(d)), "EEE d MMM")} />
        <Bar dataKey="calories" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        <Line type="stepAfter" dataKey="target" stroke="var(--color-fat)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

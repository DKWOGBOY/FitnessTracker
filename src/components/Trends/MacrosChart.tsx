import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DayMacros } from "../../hooks/useFoodLogsRange";

export default function MacrosChart({ days }: { days: DayMacros[] }) {
  const data = days.map((d) => ({
    date: d.date,
    Protein: Math.round(d.protein_g),
    Carbs: Math.round(d.carbs_g),
    Fat: Math.round(d.fat_g),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
        />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} unit="g" />
        <Tooltip labelFormatter={(d) => format(parseISO(String(d)), "EEE d MMM")} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Protein" stackId="m" fill="var(--color-protein)" />
        <Bar dataKey="Carbs" stackId="m" fill="var(--color-carbs)" />
        <Bar dataKey="Fat" stackId="m" fill="var(--color-fat)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

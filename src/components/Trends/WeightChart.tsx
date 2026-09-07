import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { WeightLog } from "../../lib/types";
import { kgToLb, type UnitSystem } from "../../lib/units";

export default function WeightChart({
  logs,
  unitSystem,
}: {
  logs: WeightLog[];
  unitSystem: UnitSystem;
}) {
  const data = logs.map((l) => ({
    date: l.log_date,
    weight: unitSystem === "imperial" ? kgToLb(l.weight_kg) : l.weight_kg,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
        />
        <YAxis
          domain={["dataMin - 1", "dataMax + 1"]}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          unit={unitSystem === "imperial" ? "lb" : "kg"}
        />
        <Tooltip
          labelFormatter={(d) => format(parseISO(String(d)), "EEE d MMM")}
          formatter={(v) => [`${Number(v).toFixed(1)} ${unitSystem === "imperial" ? "lb" : "kg"}`, "Weight"]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

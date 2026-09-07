import { Cell, Pie, PieChart } from "recharts";

interface Props {
  pct: number;
  color: string;
  size: number;
  thickness: number;
  trackColor?: string;
}

export default function ProgressRing({ pct, color, size, thickness, trackColor = "var(--color-bg-alt)" }: Props) {
  const clamped = Math.max(0, Math.min(100, pct));
  const data = [
    { key: "value", value: clamped },
    { key: "rest", value: 100 - clamped },
  ];
  const outerRadius = size / 2;
  const innerRadius = outerRadius - thickness;

  return (
    <PieChart width={size} height={size}>
      <Pie
        data={data}
        dataKey="value"
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={90}
        endAngle={-270}
        stroke="none"
        isAnimationActive={false}
      >
        <Cell key="value" fill={color} />
        <Cell key="rest" fill={trackColor} />
      </Pie>
    </PieChart>
  );
}

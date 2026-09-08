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
  const outerRadius = size / 2;
  const innerRadius = outerRadius - thickness;

  return (
    <PieChart width={size} height={size}>
      {/* Static full track - never animates, so only the filled arc appears to move. */}
      <Pie
        data={[{ key: "track", value: 100 }]}
        dataKey="value"
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        stroke="none"
        isAnimationActive={false}
      >
        <Cell key="track" fill={trackColor} />
      </Pie>
      {/* Value arc, overlaid on the track - this is the only part that animates in. */}
      <Pie
        data={[
          { key: "value", value: clamped },
          { key: "rest", value: 100 - clamped },
        ]}
        dataKey="value"
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={90}
        endAngle={-270}
        stroke="none"
        isAnimationActive
        animationDuration={450}
        animationEasing="ease-out"
      >
        <Cell key="value" fill={color} />
        <Cell key="rest" fill="transparent" />
      </Pie>
    </PieChart>
  );
}

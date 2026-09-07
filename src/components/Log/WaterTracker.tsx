import { useEffect, useMemo, useRef, useState } from "react";
import { useWaterLog } from "../../hooks/useWaterLog";
import { IconWaterGlass } from "../icons";

interface Props {
  date: string;
  target: number;
}

interface Bubble {
  left: number;
  size: number;
  delay: number;
  duration: number;
}

const BUBBLE_COUNT = 8;

export default function WaterTracker({ date, target }: Props) {
  const { litres, setLitres } = useWaterLog(date);
  const [value, setValue] = useState(litres);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bubbles = useMemo<Bubble[]>(
    () =>
      Array.from({ length: BUBBLE_COUNT }, () => ({
        left: 2 + Math.random() * 92,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 3,
        duration: 2.8 + Math.random() * 1.8,
      })),
    [],
  );

  useEffect(() => {
    setValue(litres);
  }, [litres]);

  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  function handleChange(next: number) {
    setValue(next);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      setLitres(next);
    }, 300);
  }

  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;

  return (
    <div className="water-tracker">
      <span className="water-tracker-icon">
        <IconWaterGlass className="icon" />
      </span>
      <div className="water-tracker-bar-wrap">
        <div className="water-tracker-bar-fill" style={{ width: `${pct}%` }}>
          {bubbles.map((b, i) => (
            <span
              key={i}
              className="water-bubble"
              style={{
                left: `${b.left}%`,
                width: b.size,
                height: b.size,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.duration}s`,
              }}
            />
          ))}
        </div>
        <input
          type="range"
          className="water-tracker-range"
          min={0}
          max={target}
          step={0.1}
          value={value}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          aria-label="Water intake (litres)"
        />
      </div>
      <span className="water-tracker-count">
        {value.toFixed(1)}/{target.toFixed(1)}
      </span>
    </div>
  );
}

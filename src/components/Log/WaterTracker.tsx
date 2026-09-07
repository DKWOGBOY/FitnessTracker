import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
const STEP = 0.1;

export default function WaterTracker({ date, target }: Props) {
  const { litres, setLitres } = useWaterLog(date);
  const [value, setValue] = useState(litres);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

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
    const clamped = Math.max(0, Math.min(target, next));
    setValue(clamped);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      setLitres(clamped);
    }, 300);
  }

  function valueFromClientX(clientX: number): number {
    const el = barRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = pct * target;
    return Math.round(raw / STEP) * STEP;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handleChange(valueFromClientX(e.clientX));
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    handleChange(valueFromClientX(e.clientX));
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;

  return (
    <div className="water-tracker">
      <span className="water-tracker-icon">
        <IconWaterGlass className="icon" />
      </span>
      <div
        className="water-tracker-bar-wrap"
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
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
      </div>
      <span className="water-tracker-count">
        {value.toFixed(1)}/{target.toFixed(1)}
      </span>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { IconWaterGlass } from "../icons";

interface Props {
  target: number;
  litres: number;
  setLitres: (value: number) => Promise<void>;
}

interface Bubble {
  left: number;
  size: number;
  delay: number;
  duration: number;
}

const BUBBLE_COUNT = 8;
const STEP = 0.1;

export default function WaterTracker({ target, litres, setLitres }: Props) {
  const [value, setValue] = useState(litres);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const pendingRef = useRef(litres);

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
    pendingRef.current = litres;
  }, [litres]);

  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  function applyVisual(v: number) {
    const pct = target > 0 ? Math.min(100, Math.max(0, (v / target) * 100)) : 0;
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (countRef.current) countRef.current.textContent = `${v.toFixed(1)}/${target.toFixed(1)}`;
  }

  function commit(next: number) {
    setValue(next);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      setLitres(next);
    }, 300);
  }

  function valueFromClientX(clientX: number): number {
    const el = barRef.current;
    if (!el) return pendingRef.current;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = pct * target;
    return Math.round(raw / STEP) * STEP;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (fillRef.current) fillRef.current.style.transition = "none";
    const next = valueFromClientX(e.clientX);
    pendingRef.current = next;
    applyVisual(next);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const next = valueFromClientX(e.clientX);
    pendingRef.current = next;
    applyVisual(next);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (fillRef.current) fillRef.current.style.transition = "";
    commit(pendingRef.current);
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
        <div className="water-tracker-bar-fill" ref={fillRef} style={{ width: `${pct}%` }}>
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
      <span className="water-tracker-count" ref={countRef}>
        {value.toFixed(1)}/{target.toFixed(1)}
      </span>
    </div>
  );
}

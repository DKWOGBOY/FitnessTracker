import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { IconClose } from "../icons";

const REVEAL_WIDTH = 72;
const OPEN_THRESHOLD = REVEAL_WIDTH / 2;
const LOCK_THRESHOLD = 6;

type LockDirection = "none" | "horizontal" | "vertical";

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  baseOffset: number;
  lock: LockDirection;
}

interface Props {
  onTap: () => void;
  onDelete: () => void;
  children: ReactNode;
}

export default function SwipeableRow({ onTap, onDelete, children }: Props) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<DragState | null>(null);

  function handlePointerDown(e: PointerEvent) {
    if (dragState.current) return;
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseOffset: offset,
      lock: "none",
    };
  }

  function handlePointerMove(e: PointerEvent) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.lock === "vertical") return;

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    if (drag.lock === "none") {
      if (Math.abs(deltaX) < LOCK_THRESHOLD && Math.abs(deltaY) < LOCK_THRESHOLD) return;
      drag.lock = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      if (drag.lock === "horizontal") {
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        return;
      }
    }

    setOffset(Math.max(-REVEAL_WIDTH, Math.min(0, drag.baseOffset + deltaX)));
  }

  function endDrag(e: PointerEvent) {
    const drag = dragState.current;
    dragState.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (drag.lock === "vertical") return; // was a page scroll, leave the row exactly as it was

    if (drag.lock === "none") {
      // a clean tap: close if already revealed, otherwise open the editor
      if (drag.baseOffset !== 0) setOffset(0);
      else onTap();
      return;
    }

    setOffset((current) => (current < -OPEN_THRESHOLD ? -REVEAL_WIDTH : 0));
  }

  return (
    <div className="swipe-row">
      <button className="swipe-row-delete" onClick={onDelete} aria-label="Delete">
        <IconClose className="icon" />
      </button>
      <div
        className={`swipe-row-content${dragging ? "" : " snap"}`}
        style={{ transform: offset === 0 ? undefined : `translateX(${offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
    </div>
  );
}

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { IconClose } from "../icons";

const REVEAL_WIDTH = 72;
const OPEN_THRESHOLD = REVEAL_WIDTH / 2;
const TAP_THRESHOLD = 6;

interface DragState {
  startX: number;
  baseOffset: number;
  moved: boolean;
}

interface Props {
  onTap: () => void;
  onDelete: () => void;
  children: ReactNode;
}

export default function SwipeableRow({ onTap, onDelete, children }: Props) {
  const [offset, setOffset] = useState(0);
  const dragState = useRef<DragState | null>(null);

  function handlePointerDown(e: PointerEvent) {
    dragState.current = { startX: e.clientX, baseOffset: offset, moved: false };
  }

  function handlePointerMove(e: PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    const delta = e.clientX - drag.startX;
    if (Math.abs(delta) > TAP_THRESHOLD) drag.moved = true;
    setOffset(Math.max(-REVEAL_WIDTH, Math.min(0, drag.baseOffset + delta)));
  }

  function handlePointerUp() {
    const drag = dragState.current;
    dragState.current = null;
    if (!drag) return;

    if (!drag.moved) {
      if (drag.baseOffset !== 0) {
        setOffset(0);
      } else {
        onTap();
      }
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
        className="swipe-row-content"
        style={offset === 0 ? undefined : { transform: `translateX(${offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </div>
  );
}

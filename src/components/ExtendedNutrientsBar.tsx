import { useState } from "react";
import type { Food, Macros } from "../lib/types";
import { IconChevronDown } from "./icons";

interface Props {
  food: Food;
  macros: Macros;
}

/** Collapsed by default - fiber/sugar/sodium are secondary info most people
 * don't need on every glance, but should be a tap away wherever a food's
 * macros are shown. Renders nothing if the food has none of this data. */
export default function ExtendedNutrientsBar({ food, macros }: Props) {
  const [open, setOpen] = useState(false);
  const hasFiber = food.fiber_g != null;
  const hasSugar = food.sugar_g != null;
  const hasSodium = food.sodium_mg != null;
  if (!hasFiber && !hasSugar && !hasSodium) return null;

  return (
    <div className="card" style={{ background: "var(--color-surface-alt)", marginBottom: 16, padding: 0 }}>
      <button
        type="button"
        className="flex-between"
        style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>Nutrition facts</span>
        <span
          style={{
            display: "inline-flex",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        >
          <IconChevronDown className="icon" />
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 12px" }}>
          {hasFiber && (
            <div className="list-row">
              <span>Fiber</span>
              <strong>{macros.fiber_g.toFixed(1)}g</strong>
            </div>
          )}
          {hasSugar && (
            <div className="list-row">
              <span>Sugar</span>
              <strong>{macros.sugar_g.toFixed(1)}g</strong>
            </div>
          )}
          {hasSodium && (
            <div className="list-row">
              <span>Sodium</span>
              <strong>{Math.round(macros.sodium_mg)}mg</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

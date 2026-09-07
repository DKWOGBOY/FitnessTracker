export type UnitSystem = "metric" | "imperial";

const LB_PER_KG = 2.20462;
const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

export function formatWeight(kg: number, unit: UnitSystem): string {
  if (unit === "imperial") return `${kgToLb(kg).toFixed(1)} lb`;
  return `${kg.toFixed(1)} kg`;
}

export function weightUnitLabel(unit: UnitSystem): string {
  return unit === "imperial" ? "lb" : "kg";
}

const UNIT_PREF_KEY = "fitness-tracker:unit-system";

export function getStoredUnitSystem(): UnitSystem {
  try {
    const v = localStorage.getItem(UNIT_PREF_KEY);
    return v === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function setStoredUnitSystem(unit: UnitSystem) {
  try {
    localStorage.setItem(UNIT_PREF_KEY, unit);
  } catch {
    // ignore
  }
}

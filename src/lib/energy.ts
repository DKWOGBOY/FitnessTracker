export type EnergyUnit = "kcal" | "kj";

const KJ_PER_KCAL = 4.184;

export function kcalToKj(kcal: number): number {
  return kcal * KJ_PER_KCAL;
}

export function formatEnergy(kcal: number, unit: EnergyUnit): string {
  const value = unit === "kj" ? kcalToKj(kcal) : kcal;
  return String(Math.round(value));
}

export function energyUnitLabel(unit: EnergyUnit): string {
  return unit === "kj" ? "kJ" : "kcal";
}

const ENERGY_UNIT_KEY = "fitness-tracker:energy-unit";

export function getStoredEnergyUnit(): EnergyUnit {
  try {
    const v = localStorage.getItem(ENERGY_UNIT_KEY);
    return v === "kj" ? "kj" : "kcal";
  } catch {
    return "kcal";
  }
}

export function setStoredEnergyUnit(unit: EnergyUnit) {
  try {
    localStorage.setItem(ENERGY_UNIT_KEY, unit);
  } catch {
    // ignore
  }
}

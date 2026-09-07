const WATER_TARGET_KEY = "fitness-tracker:water-target-litres";
export const DEFAULT_WATER_TARGET_LITRES = 2.5;

export function getStoredWaterTarget(): number {
  try {
    const v = parseFloat(localStorage.getItem(WATER_TARGET_KEY) ?? "");
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_WATER_TARGET_LITRES;
  } catch {
    return DEFAULT_WATER_TARGET_LITRES;
  }
}

export function setStoredWaterTarget(litres: number) {
  try {
    localStorage.setItem(WATER_TARGET_KEY, String(litres));
  } catch {
    // ignore
  }
}

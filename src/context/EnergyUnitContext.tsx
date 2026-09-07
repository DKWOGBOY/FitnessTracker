import { createContext, useContext, useState, type ReactNode } from "react";
import { getStoredEnergyUnit, setStoredEnergyUnit, type EnergyUnit } from "../lib/energy";

interface EnergyUnitContextValue {
  energyUnit: EnergyUnit;
  setEnergyUnit: (unit: EnergyUnit) => void;
}

const EnergyUnitContext = createContext<EnergyUnitContextValue | undefined>(undefined);

export function EnergyUnitProvider({ children }: { children: ReactNode }) {
  const [energyUnit, setEnergyUnitState] = useState<EnergyUnit>(getStoredEnergyUnit());

  function setEnergyUnit(unit: EnergyUnit) {
    setEnergyUnitState(unit);
    setStoredEnergyUnit(unit);
  }

  return (
    <EnergyUnitContext.Provider value={{ energyUnit, setEnergyUnit }}>{children}</EnergyUnitContext.Provider>
  );
}

export function useEnergyUnit(): EnergyUnitContextValue {
  const ctx = useContext(EnergyUnitContext);
  if (!ctx) throw new Error("useEnergyUnit must be used within EnergyUnitProvider");
  return ctx;
}

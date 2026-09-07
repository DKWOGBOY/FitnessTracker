import { useEnergyUnit } from "../context/EnergyUnitContext";
import { energyUnitLabel, formatEnergy } from "../lib/energy";

interface Props {
  kcal: number;
  withUnit?: boolean;
}

export default function Energy({ kcal, withUnit = true }: Props) {
  const { energyUnit } = useEnergyUnit();
  return (
    <>
      {formatEnergy(kcal, energyUnit)}
      {withUnit ? ` ${energyUnitLabel(energyUnit)}` : ""}
    </>
  );
}

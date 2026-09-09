import { IconWaterGlass } from "../icons";

interface Props {
  target: number;
  litres: number;
  setLitres: (value: number) => Promise<void>;
}

const PIP_STEP = 0.5;

/** One pip per half-litre of the target - tapping a pip sets the level to
 * that point (tapping the already-filled last pip drops it back by one),
 * rather than a continuous drag. */
export default function WaterTracker({ target, litres, setLitres }: Props) {
  const pipCount = Math.max(1, Math.round(target / PIP_STEP));
  const filledPips = Math.round(litres / PIP_STEP);

  function handlePipClick(i: number) {
    const next = filledPips === i + 1 ? i : i + 1;
    setLitres(next * PIP_STEP);
  }

  return (
    <div className="water-tracker">
      <span className="water-tracker-icon">
        <IconWaterGlass className="icon" />
      </span>
      <div className="water-pips">
        {Array.from({ length: pipCount }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`water-pip${i < filledPips ? " filled" : ""}`}
            onClick={() => handlePipClick(i)}
            aria-label={`Set water to ${((i + 1) * PIP_STEP).toFixed(1)} litres`}
          />
        ))}
      </div>
      <span className="water-tracker-count">
        {litres.toFixed(1)}/{target.toFixed(1)}
      </span>
    </div>
  );
}

// Same circular-slider geometry convention as iHue Rating's rating-slider.tsx
// (angles follow the CSS conic-gradient convention: 0deg = 12 o'clock,
// positive = clockwise), generalized from a fixed 0–10 domain to an
// arbitrary [min, max] price range with a configurable step.
export const START_ANGLE = 210;
export const SWEEP_ANGLE = 300;

export type PriceRange = { min: number; max: number; step: number };

export function angleForValue(value: number, { min, max }: PriceRange): number {
  const clamped = Math.min(max, Math.max(min, value));
  const span = max - min;
  const t = span > 0 ? (clamped - min) / span : 0;
  return (START_ANGLE + t * SWEEP_ANGLE) % 360;
}

export function angleFromPoint(dx: number, dy: number): number {
  const rad = Math.atan2(dx, -dy);
  const deg = (rad * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
}

export function valueForAngle(angleDeg: number, { min, max, step }: PriceRange): number {
  let rel = (angleDeg - START_ANGLE + 360) % 360;
  if (rel > SWEEP_ANGLE) {
    // Pointer fell in the start/end gap; clamp to whichever endpoint is closer.
    const distFromEnd = rel - SWEEP_ANGLE;
    const distToStart = 360 - rel;
    rel = distFromEnd < distToStart ? SWEEP_ANGLE : 0;
  }
  const t = rel / SWEEP_ANGLE;
  const raw = min + t * (max - min);
  if (step <= 0) return raw;
  return Math.round((raw - min) / step) * step + min;
}

// Pure: snaps a raw candidate value to the listing's allowed increment and
// clamps it into [min, max]. Server-side safety net — the slider UI already
// snaps client-side, but the server must never trust that.
export function snapResponseValue(rawValue: number, min: number, max: number, increment: number): number {
  if (increment <= 0) return Math.min(max, Math.max(min, rawValue));
  const steps = Math.round((rawValue - min) / increment);
  const snapped = min + steps * increment;
  return Math.min(max, Math.max(min, snapped));
}

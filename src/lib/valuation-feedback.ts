// Positional feedback as a participant drags the slider (requirements §6:
// "trustworthy results" cuts both ways — a participant should also get
// enough signal to give an honest answer, not just see one after the fact).
// Purely informational, never judgmental: reports where a value sits in the
// allowed range, doesn't accuse the participant of lowballing.
const LOW_END_THRESHOLD = 0.15;
const HIGH_END_THRESHOLD = 0.85;

export function positionalHint(value: number, min: number, max: number): string | null {
  const span = max - min;
  if (span <= 0) return null;
  const position = (value - min) / span;
  if (position <= LOW_END_THRESHOLD) return "That's near the low end of the allowed range.";
  if (position >= HIGH_END_THRESHOLD) return "That's near the high end of the allowed range.";
  return null;
}

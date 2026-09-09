// Pure: snaps a raw candidate value to the listing's allowed increment and
// clamps it into [min, max]. Server-side safety net — the slider UI already
// snaps client-side, but the server must never trust that.
export function snapResponseValue(rawValue: number, min: number, max: number, increment: number): number {
  if (increment <= 0) return Math.min(max, Math.max(min, rawValue));
  const steps = Math.round((rawValue - min) / increment);
  const snapped = min + steps * increment;
  return Math.min(max, Math.max(min, snapped));
}

// Requirements §9.1: "Permit edits only with a cooldown and sensible maximum
// revision count" — a real cap, not just the revisionCount tracked on the
// row. First-time submission is never gated, only revisions.
export const MAX_RESPONSE_REVISIONS = 20;
export const RESPONSE_REVISION_COOLDOWN_SECONDS = 30;

export type RevisionCheckResult = { ok: true } | { ok: false; reason: "MAX_REVISIONS" | "COOLDOWN"; retryAfterSeconds?: number };

export function checkRevisionAllowed(existing: { revisionCount: number; updatedAt: Date } | null, now: Date = new Date()): RevisionCheckResult {
  if (!existing) return { ok: true };
  if (existing.revisionCount >= MAX_RESPONSE_REVISIONS) return { ok: false, reason: "MAX_REVISIONS" };

  const elapsedSeconds = (now.getTime() - existing.updatedAt.getTime()) / 1000;
  if (elapsedSeconds < RESPONSE_REVISION_COOLDOWN_SECONDS) {
    return { ok: false, reason: "COOLDOWN", retryAfterSeconds: Math.ceil(RESPONSE_REVISION_COOLDOWN_SECONDS - elapsedSeconds) };
  }
  return { ok: true };
}

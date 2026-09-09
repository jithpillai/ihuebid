import { describe, expect, it } from "vitest";

import { MAX_RESPONSE_REVISIONS, RESPONSE_REVISION_COOLDOWN_SECONDS, checkRevisionAllowed, snapResponseValue } from "./response-value";

describe("snapResponseValue", () => {
  it("snaps to the nearest increment", () => {
    expect(snapResponseValue(712345, 700000, 900000, 5000)).toBe(710000);
    expect(snapResponseValue(713000, 700000, 900000, 5000)).toBe(715000);
  });

  it("clamps below the minimum", () => {
    expect(snapResponseValue(500000, 700000, 900000, 5000)).toBe(700000);
  });

  it("clamps above the maximum", () => {
    expect(snapResponseValue(1200000, 700000, 900000, 5000)).toBe(900000);
  });

  it("passes an exact value through unchanged", () => {
    expect(snapResponseValue(850000, 700000, 900000, 5000)).toBe(850000);
  });

  it("falls back to clamping only when increment is zero or negative", () => {
    expect(snapResponseValue(812345, 700000, 900000, 0)).toBe(812345);
  });
});

describe("checkRevisionAllowed", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("always allows a first-time submission (no existing row)", () => {
    expect(checkRevisionAllowed(null, now)).toEqual({ ok: true });
  });

  it("allows a revision once the cooldown has elapsed", () => {
    const updatedAt = new Date(now.getTime() - (RESPONSE_REVISION_COOLDOWN_SECONDS + 1) * 1000);
    expect(checkRevisionAllowed({ revisionCount: 1, updatedAt }, now)).toEqual({ ok: true });
  });

  it("rejects a revision still inside the cooldown window", () => {
    const updatedAt = new Date(now.getTime() - 5 * 1000);
    const result = checkRevisionAllowed({ revisionCount: 1, updatedAt }, now);
    expect(result).toMatchObject({ ok: false, reason: "COOLDOWN" });
  });

  it("rejects a revision once the max revision count is reached, even outside the cooldown", () => {
    const updatedAt = new Date(now.getTime() - (RESPONSE_REVISION_COOLDOWN_SECONDS + 1) * 1000);
    const result = checkRevisionAllowed({ revisionCount: MAX_RESPONSE_REVISIONS, updatedAt }, now);
    expect(result).toEqual({ ok: false, reason: "MAX_REVISIONS" });
  });
});

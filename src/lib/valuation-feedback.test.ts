import { describe, expect, it } from "vitest";

import { positionalHint } from "./valuation-feedback";

const RANGE = { min: 700000, max: 900000 };

describe("positionalHint", () => {
  it("flags a value near the low end of the range", () => {
    expect(positionalHint(700000, RANGE.min, RANGE.max)).toContain("low end");
    expect(positionalHint(720000, RANGE.min, RANGE.max)).toContain("low end");
  });

  it("flags a value near the high end of the range", () => {
    expect(positionalHint(900000, RANGE.min, RANGE.max)).toContain("high end");
    expect(positionalHint(880000, RANGE.min, RANGE.max)).toContain("high end");
  });

  it("returns null for a value comfortably in the middle", () => {
    expect(positionalHint(800000, RANGE.min, RANGE.max)).toBeNull();
  });

  it("returns null when the range has no span", () => {
    expect(positionalHint(700000, 700000, 700000)).toBeNull();
  });
});

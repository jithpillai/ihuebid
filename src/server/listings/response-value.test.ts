import { describe, expect, it } from "vitest";

import { snapResponseValue } from "./response-value";

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

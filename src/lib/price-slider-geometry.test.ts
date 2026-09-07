import { describe, expect, it } from "vitest";

import { angleForValue, valueForAngle } from "./price-slider-geometry";

const RANGE = { min: 700000, max: 900000, step: 5000 };

describe("angleForValue", () => {
  it("maps the minimum to the start angle", () => {
    expect(angleForValue(700000, RANGE)).toBeCloseTo(210);
  });

  it("maps the maximum to the end of the sweep", () => {
    expect(angleForValue(900000, RANGE)).toBeCloseTo((210 + 300) % 360);
  });

  it("maps the midpoint to the middle of the sweep", () => {
    expect(angleForValue(800000, RANGE)).toBeCloseTo((210 + 150) % 360);
  });

  it("clamps values outside the range", () => {
    expect(angleForValue(1_000_000, RANGE)).toBeCloseTo(angleForValue(900000, RANGE));
    expect(angleForValue(0, RANGE)).toBeCloseTo(angleForValue(700000, RANGE));
  });
});

describe("valueForAngle", () => {
  it("round-trips angleForValue back to a snapped value", () => {
    const angle = angleForValue(812345, RANGE);
    expect(valueForAngle(angle, RANGE)).toBe(810000);
  });

  it("maps the start angle to the minimum", () => {
    expect(valueForAngle(210, RANGE)).toBe(700000);
  });

  it("maps the end of the sweep to the maximum", () => {
    expect(valueForAngle((210 + 300) % 360, RANGE)).toBe(900000);
  });

  it("clamps a pointer angle that falls in the dead zone to the nearer endpoint", () => {
    // The dead zone is the 60deg gap opposite the sweep (from 150deg to 210deg).
    expect(valueForAngle(160, RANGE)).toBe(900000);
    expect(valueForAngle(200, RANGE)).toBe(700000);
  });
});

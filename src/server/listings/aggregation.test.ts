import { describe, expect, it } from "vitest";

import { computeAggregate } from "./aggregation";

const RANGE = { min: 700000, max: 900000 };

describe("computeAggregate", () => {
  it("handles an empty response set", () => {
    const result = computeAggregate([], { ...RANGE });
    expect(result.count).toBe(0);
    expect(result.consensus).toBeNull();
    expect(result.band).toBeNull();
    expect(result.confidence).toBe("LOW");
    expect(result.comparison).toBeNull();
    expect(result.distribution.every((bin) => bin.count === 0)).toBe(true);
  });

  it("computes the median for an odd-count sample", () => {
    const result = computeAggregate([780000, 800000, 820000], { ...RANGE });
    expect(result.consensus).toBe(800000);
  });

  it("computes the median for an even-count sample as the midpoint", () => {
    const result = computeAggregate([780000, 800000, 820000, 840000], { ...RANGE });
    expect(result.consensus).toBe(810000);
  });

  it("is resistant to a single isolated extreme value", () => {
    const withOutlier = computeAggregate([790000, 800000, 810000, 5_000_000], { ...RANGE, max: 5_000_000 });
    const withoutOutlier = computeAggregate([790000, 800000, 810000], { ...RANGE });
    expect(withOutlier.consensus).toBeCloseTo(805000, -2);
    expect(withOutlier.consensus).not.toBeGreaterThan(withoutOutlier.consensus! * 1.05);
  });

  it("computes a 25th-75th percentile band", () => {
    const result = computeAggregate([700000, 750000, 800000, 850000, 900000], { ...RANGE });
    expect(result.band).toEqual([750000, 850000]);
  });

  describe("confidence tiers", () => {
    it("is LOW under 5 responses", () => {
      expect(computeAggregate([800000, 800000, 800000, 800000], { ...RANGE }).confidence).toBe("LOW");
    });

    it("is MEDIUM between 5 and 14 responses", () => {
      const values = Array.from({ length: 5 }, () => 800000);
      expect(computeAggregate(values, { ...RANGE }).confidence).toBe("MEDIUM");
    });

    it("is HIGH at 15 or more responses", () => {
      const values = Array.from({ length: 15 }, () => 800000);
      expect(computeAggregate(values, { ...RANGE }).confidence).toBe("HIGH");
    });
  });

  describe("comparison tiers", () => {
    const tightValues = [795000, 798000, 800000, 802000, 805000];

    it("is GREEN when the expectation is at or below consensus", () => {
      const result = computeAggregate(tightValues, { ...RANGE, expectedPrice: 780000 });
      expect(result.comparison?.tier).toBe("GREEN");
    });

    it("is GREEN within a small margin above consensus", () => {
      const result = computeAggregate(tightValues, { ...RANGE, expectedPrice: 800000 * 1.04 });
      expect(result.comparison?.tier).toBe("GREEN");
    });

    it("is YELLOW moderately above consensus", () => {
      const result = computeAggregate(tightValues, { ...RANGE, expectedPrice: 800000 * 1.10 });
      expect(result.comparison?.tier).toBe("YELLOW");
    });

    it("is RED materially above consensus", () => {
      const result = computeAggregate(tightValues, { ...RANGE, expectedPrice: 800000 * 1.30 });
      expect(result.comparison?.tier).toBe("RED");
    });

    it("is PURPLE when responses are widely dispersed, regardless of expectation", () => {
      // Spread far enough that the IQR exceeds 35% of the median — the
      // 700k-900k range above can't produce that ratio (its own span is too
      // narrow), so this uses a deliberately wide range/spread.
      const wideValues = [100000, 500000, 900000, 1_300_000, 1_700_000];
      const result = computeAggregate(wideValues, { min: 0, max: 2_000_000, expectedPrice: 900000 });
      expect(result.comparison?.tier).toBe("PURPLE");
    });

    it("is null when no expected price is supplied", () => {
      const result = computeAggregate(tightValues, { ...RANGE });
      expect(result.comparison).toBeNull();
    });
  });

  it("buckets values into fixed-width distribution bins", () => {
    const result = computeAggregate([700000, 700000, 900000], { min: 700000, max: 900000, binCount: 2 });
    expect(result.distribution).toHaveLength(2);
    expect(result.distribution[0].count).toBe(2);
    expect(result.distribution[1].count).toBe(1);
  });
});

import { describe, expect, it } from "vitest";

import { buildPriceSuggestionPrompt, normalizePriceSuggestion } from "./price-suggestion";

describe("normalizePriceSuggestion", () => {
  it("passes through a well-formed suggestion", () => {
    expect(normalizePriceSuggestion({ low: 400000, high: 500000, rationale: "Typical for this model and mileage." }))
      .toEqual({ low: 400000, high: 500000, rationale: "Typical for this model and mileage." });
  });

  it("swaps low/high if the AI returned them reversed", () => {
    expect(normalizePriceSuggestion({ low: 500000, high: 400000, rationale: "x" })).toEqual({ low: 400000, high: 500000, rationale: "x" });
  });

  it("falls back to a generic rationale when missing", () => {
    const result = normalizePriceSuggestion({ low: 400000, high: 500000 });
    expect(result.rationale).toBe("Estimate based on the vehicle facts provided.");
  });

  it("caps an excessively long rationale", () => {
    const result = normalizePriceSuggestion({ low: 400000, high: 500000, rationale: "x".repeat(1000) });
    expect(result.rationale.length).toBe(500);
  });

  it("throws on non-numeric or missing values", () => {
    expect(() => normalizePriceSuggestion({ low: "a lot", high: 500000, rationale: "x" })).toThrow();
    expect(() => normalizePriceSuggestion({})).toThrow();
    expect(() => normalizePriceSuggestion(null)).toThrow();
  });

  it("throws on non-positive values", () => {
    expect(() => normalizePriceSuggestion({ low: -100, high: 500000, rationale: "x" })).toThrow();
    expect(() => normalizePriceSuggestion({ low: 0, high: 500000, rationale: "x" })).toThrow();
  });
});

describe("buildPriceSuggestionPrompt", () => {
  it("includes every filled Used Vehicle fact except VIN", () => {
    const { prompt } = buildPriceSuggestionPrompt({
      currency: "INR",
      locationText: "Bengaluru",
      fieldValues: {
        make: "Toyota",
        model: "Fortuner",
        modelYear: "2021",
        kmDriven: "42000",
        fuelType: "Diesel",
        transmission: "Automatic",
        ownershipCount: "1",
        vin: "SOME-SENSITIVE-VIN",
      },
    });
    expect(prompt).toContain("Toyota");
    expect(prompt).toContain("Fortuner");
    expect(prompt).toContain("2021");
    expect(prompt).toContain("42000");
    expect(prompt).toContain("Number of owners: 1");
    expect(prompt).toContain("Bengaluru");
    expect(prompt).not.toContain("SOME-SENSITIVE-VIN");
  });

  it("omits fields that weren't filled in", () => {
    const { prompt } = buildPriceSuggestionPrompt({ currency: "INR", fieldValues: { make: "Honda", model: "City" } });
    expect(prompt).toContain("Honda");
    expect(prompt).not.toContain("Kilometres driven:");
  });
});

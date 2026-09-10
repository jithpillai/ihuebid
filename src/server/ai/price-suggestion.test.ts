import { describe, expect, it } from "vitest";

import { buildPriceSuggestionPrompt, hasSufficientFactsForSuggestion, normalizePriceSuggestion } from "./price-suggestion";

describe("normalizePriceSuggestion", () => {
  it("passes through a well-formed suggestion", () => {
    expect(normalizePriceSuggestion({
      low: 400000, high: 500000, rationale: "Typical for this model and mileage.",
      description: "A 2021 Honda City.", highlights: ["Frugal petrol engine", "Single owner"],
    })).toEqual({
      low: 400000, high: 500000, rationale: "Typical for this model and mileage.",
      description: "A 2021 Honda City.", highlights: ["Frugal petrol engine", "Single owner"],
    });
  });

  it("swaps low/high if the AI returned them reversed", () => {
    expect(normalizePriceSuggestion({ low: 500000, high: 400000, rationale: "x", description: "y" }))
      .toEqual({ low: 400000, high: 500000, rationale: "x", description: "y", highlights: [] });
  });

  it("cleans highlights: strips bullets, trims, drops empties, keeps 4", () => {
    const result = normalizePriceSuggestion({
      low: 400000, high: 500000, rationale: "x", description: "y",
      highlights: ["- Great mileage  ", "• Low running cost", "", "Rare variant", "Well kept", "Fifth point"],
    });
    expect(result.highlights).toEqual(["Great mileage", "Low running cost", "Rare variant", "Well kept"]);
  });

  it("falls back to a generic rationale when missing", () => {
    const result = normalizePriceSuggestion({ low: 400000, high: 500000 });
    expect(result.rationale).toBe("Estimate based on the vehicle facts provided.");
  });

  it("falls back to an empty description when missing or blank", () => {
    expect(normalizePriceSuggestion({ low: 400000, high: 500000 }).description).toBe("");
    expect(normalizePriceSuggestion({ low: 400000, high: 500000, description: "   " }).description).toBe("");
  });

  it("caps an excessively long rationale and description", () => {
    const result = normalizePriceSuggestion({ low: 400000, high: 500000, rationale: "x".repeat(1000), description: "y".repeat(5000) });
    expect(result.rationale.length).toBe(500);
    expect(result.description.length).toBe(1200);
  });

  it("throws on non-numeric or missing values", () => {
    expect(() => normalizePriceSuggestion({ low: "a lot", high: 500000, rationale: "x", description: "y" })).toThrow();
    expect(() => normalizePriceSuggestion({})).toThrow();
    expect(() => normalizePriceSuggestion(null)).toThrow();
  });

  it("throws on non-positive values", () => {
    expect(() => normalizePriceSuggestion({ low: -100, high: 500000, rationale: "x", description: "y" })).toThrow();
    expect(() => normalizePriceSuggestion({ low: 0, high: 500000, rationale: "x", description: "y" })).toThrow();
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

  it("asks for a price range, a description, and standout points", () => {
    const { prompt } = buildPriceSuggestionPrompt({ currency: "INR", fieldValues: { make: "Honda", model: "City", modelYear: "2020" } });
    expect(prompt.toLowerCase()).toContain("price range");
    expect(prompt.toLowerCase()).toContain("description");
    expect(prompt.toLowerCase()).toContain("standout points");
  });

  it("omits fields that weren't filled in", () => {
    const { prompt } = buildPriceSuggestionPrompt({ currency: "INR", fieldValues: { make: "Honda", model: "City" } });
    expect(prompt).toContain("Honda");
    expect(prompt).not.toContain("Kilometres driven:");
  });
});

describe("hasSufficientFactsForSuggestion", () => {
  it("is false with no fields at all", () => {
    expect(hasSufficientFactsForSuggestion({})).toBe(false);
  });

  it("is false with only some of the minimum fields", () => {
    expect(hasSufficientFactsForSuggestion({ make: "Honda" })).toBe(false);
    expect(hasSufficientFactsForSuggestion({ make: "Honda", model: "City" })).toBe(false);
  });

  it("is false when a minimum field is present but blank/whitespace", () => {
    expect(hasSufficientFactsForSuggestion({ make: "Honda", model: "City", modelYear: "   " })).toBe(false);
  });

  it("is true once make, model, and model year are all filled, even with nothing else", () => {
    expect(hasSufficientFactsForSuggestion({ make: "Honda", model: "City", modelYear: "2019" })).toBe(true);
  });
});

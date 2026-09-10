import { describe, expect, it } from "vitest";

import { suggestListingDescription, suggestListingTitle, validateUsedVehicleFieldValues } from "./used-vehicle";

describe("validateUsedVehicleFieldValues", () => {
  it("requires the required fields", () => {
    const errors = validateUsedVehicleFieldValues({});
    expect(errors).toContain("Make is required.");
    expect(errors).toContain("Model is required.");
    expect(errors).toContain("Model year is required.");
    expect(errors).toContain("Kilometres driven is required.");
    expect(errors).toContain("Fuel is required.");
    expect(errors).toContain("Transmission is required.");
  });

  it("accepts a fully valid set of values", () => {
    const errors = validateUsedVehicleFieldValues({
      make: "Toyota",
      model: "Fortuner",
      modelYear: "2021",
      kmDriven: "42000",
      fuelType: "Diesel",
      transmission: "Automatic",
    });
    expect(errors).toEqual([]);
  });

  it("rejects a non-numeric value for a number field", () => {
    const errors = validateUsedVehicleFieldValues({
      make: "Toyota",
      model: "Fortuner",
      modelYear: "not-a-year",
      kmDriven: "42000",
      fuelType: "Diesel",
      transmission: "Automatic",
    });
    expect(errors).toContain("Model year must be a number.");
  });

  it("rejects a value outside a select field's options", () => {
    const errors = validateUsedVehicleFieldValues({
      make: "Toyota",
      model: "Fortuner",
      modelYear: "2021",
      kmDriven: "42000",
      fuelType: "Kerosene",
      transmission: "Automatic",
    });
    expect(errors).toContain("Fuel must be one of: Petrol, Diesel, CNG, Electric, Hybrid.");
  });
});

describe("suggestListingTitle", () => {
  it("builds a title as model year + make + model + variant + fuel + transmission", () => {
    const title = suggestListingTitle({
      make: "Toyota", model: "Fortuner", variant: "VXI", modelYear: "2021",
      fuelType: "Diesel", transmission: "Automatic",
    });
    expect(title).toBe("2021 Toyota Fortuner VXI Diesel Automatic");
  });

  it("skips parts that aren't filled in", () => {
    expect(suggestListingTitle({ make: "Honda", model: "City" })).toBe("Honda City");
  });

  it("is empty when nothing is filled in", () => {
    expect(suggestListingTitle({})).toBe("");
  });
});

describe("suggestListingDescription", () => {
  it("composes a sentence from registration year, km, and owner count", () => {
    expect(suggestListingDescription({ registrationYear: "2020", kmDriven: "42000", ownershipCount: "1" }))
      .toBe("Registered in 2020, 42,000 km driven, single owner.");
  });

  it("pluralises owners and appends free-text notes as sentences", () => {
    const desc = suggestListingDescription({
      kmDriven: "80000", ownershipCount: "2",
      serviceHistory: "full service history at authorised dealer",
      knownDefects: "minor scratch on rear bumper",
    });
    expect(desc).toBe("80,000 km driven, 2 owners. Full service history at authorised dealer. Minor scratch on rear bumper.");
  });

  it("is empty when there is nothing to say", () => {
    expect(suggestListingDescription({ make: "Toyota" })).toBe("");
  });
});

import { describe, expect, it } from "vitest";

import { validateUsedVehicleFieldValues } from "./used-vehicle";

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

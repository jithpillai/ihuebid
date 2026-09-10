import { describe, expect, it } from "vitest";

import { buildPosterPrompt } from "./poster-prompt";

const baseListing = {
  title: "2020 BMW 6 Series GT",
  fieldValues: {
    make: "BMW",
    model: "6 Series GT",
    variant: "620d Luxury Line",
    modelYear: "2020",
    kmDriven: "37000",
    fuelType: "Diesel",
    transmission: "Automatic",
    ownershipCount: "1",
    serviceHistory: "Full BMW service history",
    registrationLocation: "KA 05",
    accidentDisclosure: "No accidents, clear title",
    accessories: "Panoramic roof, Full body PPF",
  },
  ownerExpectedPrice: 6000000,
  currency: "INR",
  locationText: "Bengaluru",
  description: "Ultimate executive luxury meets pure precision. Doctor-driven, showroom condition.",
};

const baseProfile = { brandName: "Gettecar", location: "Bengaluru", contactPhone: "9880012345" };

describe("buildPosterPrompt", () => {
  it("builds the banner from year/make/model/variant in uppercase", () => {
    const prompt = buildPosterPrompt({ listing: baseListing, profile: baseProfile, hasLogo: true, photoCount: 3 });
    expect(prompt).toContain("SPOTLIGHT DEAL: 2020 BMW 6 SERIES GT 620D LUXURY LINE");
  });

  it("includes odometer, single-owner and price lines from the facts", () => {
    const prompt = buildPosterPrompt({ listing: baseListing, profile: baseProfile, hasLogo: true, photoCount: 1 });
    expect(prompt).toContain("SINGLE OWNER");
    expect(prompt).toContain("37,000 KM DRIVEN");
    expect(prompt).toContain("ASKING PRICE: ₹60 lakh (NEGOTIABLE)");
    expect(prompt).toContain("KEY FEATURES: DIESEL, AUTOMATIC, PANORAMIC ROOF, FULL BODY PPF");
  });

  it("references the attached logo when hasLogo, falls back to brand text otherwise", () => {
    const withLogo = buildPosterPrompt({ listing: baseListing, profile: baseProfile, hasLogo: true, photoCount: 1 });
    expect(withLogo).toContain("brand logo. Place it small in the top-right");

    const noLogo = buildPosterPrompt({ listing: baseListing, profile: baseProfile, hasLogo: false, photoCount: 1 });
    expect(noLogo).toContain('render "Gettecar" as clean text in the top-right');
  });

  it("omits price, tagline and highlights when the data is absent", () => {
    const bare = buildPosterPrompt({
      listing: { title: "Old Car", fieldValues: { make: "Maruti" }, ownerExpectedPrice: null, currency: "INR", locationText: null, description: null },
      profile: { brandName: null, location: null, contactPhone: null },
      hasLogo: false,
      photoCount: 1,
    });
    expect(bare).not.toContain("ASKING PRICE");
    expect(bare).not.toContain("Highlights panel");
    expect(bare).toContain("Direct seller");
  });

  it("drops filler values like “Not Applicable” from the highlights", () => {
    const prompt = buildPosterPrompt({
      listing: { ...baseListing, fieldValues: { ...baseListing.fieldValues, accidentDisclosure: "Not Applicable", knownDefects: "None" } },
      profile: baseProfile,
      hasLogo: true,
      photoCount: 1,
    });
    expect(prompt).not.toContain("NOT APPLICABLE");
    expect(prompt).not.toContain("NOTE: NONE");
  });

  it("never invents facts — the RULES block is always present", () => {
    const prompt = buildPosterPrompt({ listing: baseListing, profile: baseProfile, hasLogo: true, photoCount: 2 });
    expect(prompt).toContain("Use ONLY the facts above");
  });

  it("always instructs the AI to blur the registration number for privacy", () => {
    const prompt = buildPosterPrompt({ listing: baseListing, profile: baseProfile, hasLogo: false, photoCount: 1 });
    expect(prompt).toMatch(/blur or black it out/i);
    expect(prompt).toContain("vehicle registration number");
  });
});

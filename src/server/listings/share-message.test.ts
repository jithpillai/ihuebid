import { describe, expect, it } from "vitest";

import { buildListingShareMessage, formatIndianPrice } from "./share-message";

describe("formatIndianPrice", () => {
  it("renders lakhs for amounts at or above 1,00,000", () => {
    expect(formatIndianPrice(2050000)).toBe("₹20.50 lakh");
    expect(formatIndianPrice(2000000)).toBe("₹20 lakh");
  });

  it("renders a grouped figure below a lakh", () => {
    expect(formatIndianPrice(75000)).toBe("₹75,000");
  });

  it("is empty for non-positive or non-finite input", () => {
    expect(formatIndianPrice(0)).toBe("");
    expect(formatIndianPrice(NaN)).toBe("");
  });
});

describe("buildListingShareMessage", () => {
  const base = {
    listing: {
      title: "2019 Hyundai Creta SX Petrol Manual",
      fieldValues: {
        make: "Hyundai",
        model: "Creta",
        variant: "SX",
        modelYear: "2019",
        registrationLocation: "KA",
        kmDriven: "52000",
        fuelType: "Petrol",
        transmission: "Manual",
        ownershipCount: "1",
        serviceHistory: "Full service history at authorised dealer",
      },
      ownerExpectedPrice: 950000,
      currency: "INR",
      locationText: "Kochi",
      description: "Well-kept single-owner Creta with no accident claims.",
    },
    profile: { brandName: "Gettecar", location: "Bengaluru", contactPhone: "8590001090" },
    url: "https://bid.ihue.in/gettecar/kGQr2eeJ",
  };

  it("composes an emoji + label:value message", () => {
    expect(buildListingShareMessage(base)).toBe(
      [
        "🚗 *2019 Hyundai Creta SX Petrol Manual* · Gettecar, Bengaluru",
        "_Well-kept single-owner Creta with no accident claims._",
        [
          "📋 *Vehicle details*",
          "• *Make:* Hyundai",
          "• *Model:* Creta (SX)",
          "• *Year:* 2019 · KA registration",
          "• *Odometer:* 52,000 km",
          "• *Fuel · Transmission:* Petrol · Manual",
          "• *Owners:* Single owner",
          "• *Service history:* Full service history at authorised dealer",
        ].join("\n"),
        [
          "💰 *Expected price:* ₹9.50 lakh _(negotiable, T&C apply)_",
          "📍 *Viewing:* Kochi",
          "📞 *Contact:* WhatsApp 8590001090",
        ].join("\n"),
        "👉 Photos & your estimate:\nhttps://bid.ihue.in/gettecar/kGQr2eeJ",
      ].join("\n\n"),
    );
  });

  it("skips sections whose inputs are missing", () => {
    const message = buildListingShareMessage({
      listing: {
        title: "Honda City",
        fieldValues: { make: "Honda", model: "City" },
        ownerExpectedPrice: null,
        currency: "INR",
        locationText: null,
        description: null,
      },
      profile: { brandName: null, location: null, contactPhone: null },
      url: "https://bid.ihue.in/x/y",
    });
    expect(message).toBe(
      [
        "🚗 *Honda City*",
        "📋 *Vehicle details*\n• *Make:* Honda\n• *Model:* City",
        "👉 Photos & your estimate:\nhttps://bid.ihue.in/x/y",
      ].join("\n\n"),
    );
    expect(message).not.toContain("Expected price");
    expect(message).not.toContain("Contact");
  });

  it("falls back to the brand city for viewing when the listing has no location", () => {
    const message = buildListingShareMessage({
      ...base,
      listing: { ...base.listing, locationText: null },
    });
    expect(message).toContain("📍 *Viewing:* Bengaluru");
  });
});

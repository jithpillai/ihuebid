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
      title: "BMW X1 S Drive 20D Diesel Automatic",
      fieldValues: {
        modelYear: "2017",
        registrationLocation: "KA",
        ownershipCount: "2",
        kmDriven: "67000",
        accessories: "New tyres, valid insurance, clear title",
      },
      ownerExpectedPrice: 2050000,
      currency: "INR",
      locationText: null,
    },
    profile: { brandName: "Gettecar dealership", location: "Bengaluru", contactPhone: "8590001090" },
    url: "https://bid.ihue.in/gettecar/EdKL6Geu",
  };

  it("composes the full message from listing + profile + url", () => {
    const message = buildListingShareMessage(base);
    expect(message).toBe(
      [
        "Today's spotlight used-vehicle deal @Gettecar dealership Bengaluru!",
        "BMW X1 S Drive 20D Diesel Automatic — 2017 model, KA registration, 2-owner, 67k km. New tyres, valid insurance, clear title.",
        "Expected price ₹20.50 lakh* (slightly negotiable, T&C apply).",
        "Located in Bengaluru for viewing. Interested buyers — DM, or WhatsApp 8590001090.",
        "https://bid.ihue.in/gettecar/EdKL6Geu",
      ].join("\n\n"),
    );
  });

  it("omits the price line when no expected price is set", () => {
    const message = buildListingShareMessage({
      ...base,
      listing: { ...base.listing, ownerExpectedPrice: null },
    });
    expect(message).not.toContain("Expected price");
  });

  it("omits the WhatsApp clause when there is no contact phone", () => {
    const message = buildListingShareMessage({
      ...base,
      profile: { ...base.profile, contactPhone: null },
    });
    expect(message).toContain("Interested buyers — DM.");
    expect(message).not.toContain("WhatsApp");
  });

  it("uses 'single-owner' for one owner and prefers the listing's own location", () => {
    const message = buildListingShareMessage({
      ...base,
      listing: { ...base.listing, fieldValues: { ...base.listing.fieldValues, ownershipCount: "1" }, locationText: "Whitefield, Bengaluru" },
    });
    expect(message).toContain("single-owner");
    expect(message).toContain("Located in Whitefield, Bengaluru for viewing.");
  });
});

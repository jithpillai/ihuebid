// Pure, deterministic builder for the shareable listing message. No I/O and no
// AI — the caller passes in the already-loaded listing + profile and the
// resolved public URL. Formatted for WhatsApp (`*bold*`, `_italic_`).

export type ShareMessageListing = {
  title: string;
  fieldValues: Record<string, string>;
  ownerExpectedPrice: number | null;
  currency: string;
  locationText: string | null;
  description: string | null;
};

export type ShareMessageProfile = {
  brandName: string | null;
  location: string | null;
  contactPhone: string | null;
};

function clean(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

// "₹20.50 lakh" for anything from ₹1,00,000 up, else a plain grouped figure.
export function formatIndianPrice(amount: number, currency = "INR"): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  if (currency === "INR" && amount >= 100000) {
    const lakh = amount / 100000;
    const text = Number.isInteger(lakh) ? String(lakh) : lakh.toFixed(2);
    return `₹${text} lakh`;
  }
  const grouped = amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US");
  return currency === "INR" ? `₹${grouped}` : `${grouped} ${currency}`;
}

function formatKm(raw: string): string {
  const km = Number(raw);
  if (Number.isNaN(km)) return "";
  return `${km.toLocaleString("en-IN")} km`;
}

function detailLines(fields: Record<string, string>): string[] {
  const lines: string[] = [];
  const add = (label: string, value: string) => {
    if (value) lines.push(`• *${label}:* ${value}`);
  };

  add("Make", clean(fields.make));

  const model = clean(fields.model);
  const variant = clean(fields.variant);
  add("Model", variant ? `${model} (${variant})` : model);

  const year = clean(fields.modelYear);
  const regLocation = clean(fields.registrationLocation);
  add("Year", [year, regLocation && `${regLocation} registration`].filter(Boolean).join(" · "));

  const km = clean(fields.kmDriven);
  if (km) add("Odometer", formatKm(km));

  const fuel = clean(fields.fuelType);
  const transmission = clean(fields.transmission);
  add("Fuel · Transmission", [fuel, transmission].filter(Boolean).join(" · "));

  const owners = clean(fields.ownershipCount);
  if (owners && !Number.isNaN(Number(owners))) {
    const count = Number(owners);
    add("Owners", count === 1 ? "Single owner" : String(count));
  }

  const serviceHistory = clean(fields.serviceHistory);
  if (serviceHistory) add("Service history", truncate(serviceHistory, 120));

  const accident = clean(fields.accidentDisclosure);
  if (accident) add("Accident / insurance", truncate(accident, 120));

  const defects = clean(fields.knownDefects);
  if (defects) add("Known issues", truncate(defects, 120));

  return lines;
}

export function buildListingShareMessage(args: {
  listing: ShareMessageListing;
  profile: ShareMessageProfile;
  url: string;
}): string {
  const { listing, profile, url } = args;
  const brand = clean(profile.brandName);
  const brandCity = clean(profile.location);
  const sections: string[] = [];

  // Header — title + brand · city
  const badge = [brand, brandCity].filter(Boolean).join(", ");
  sections.push(`🚗 *${clean(listing.title)}*${badge ? ` · ${badge}` : ""}`);

  // Description (the AI-written or hand-written listing summary)
  const description = clean(listing.description);
  if (description) sections.push(`_${truncate(description, 400)}_`);

  // Vehicle details — label:value list
  const details = detailLines(listing.fieldValues);
  if (details.length > 0) sections.push(["📋 *Vehicle details*", ...details].join("\n"));

  // Price · viewing · contact
  const facts: string[] = [];
  const price = listing.ownerExpectedPrice != null
    ? formatIndianPrice(listing.ownerExpectedPrice, listing.currency)
    : "";
  if (price) facts.push(`💰 *Expected price:* ${price} _(negotiable, T&C apply)_`);

  const viewing = clean(listing.locationText) || brandCity;
  if (viewing) facts.push(`📍 *Viewing:* ${viewing}`);

  const phone = clean(profile.contactPhone);
  if (phone) facts.push(`📞 *Contact:* WhatsApp ${phone}`);
  if (facts.length > 0) sections.push(facts.join("\n"));

  // Call to action + link
  sections.push(`👉 Photos & your estimate:\n${url}`);

  return sections.join("\n\n");
}

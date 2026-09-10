// Pure, deterministic builder for the shareable listing message shown (fully
// editable) on the creator's listing edit page. No I/O — the edit page passes
// in the already-loaded listing + profile and the resolved public URL.

export type ShareMessageListing = {
  title: string;
  fieldValues: Record<string, string>;
  ownerExpectedPrice: number | null;
  currency: string;
  locationText: string | null;
};

export type ShareMessageProfile = {
  brandName: string | null;
  location: string | null;
  contactPhone: string | null;
};

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
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

function vehicleClause(fields: Record<string, string>): string {
  const parts: string[] = [];

  const modelYear = clean(fields.modelYear);
  if (modelYear) parts.push(`${modelYear} model`);

  const registrationLocation = clean(fields.registrationLocation);
  if (registrationLocation) parts.push(`${registrationLocation} registration`);

  const ownershipCount = clean(fields.ownershipCount);
  if (ownershipCount && !Number.isNaN(Number(ownershipCount))) {
    const count = Number(ownershipCount);
    parts.push(count === 1 ? "single-owner" : `${count}-owner`);
  }

  const kmDriven = clean(fields.kmDriven);
  if (kmDriven && !Number.isNaN(Number(kmDriven))) {
    const km = Number(kmDriven);
    parts.push(km >= 1000 ? `${Math.round(km / 1000)}k km` : `${km} km`);
  }

  return parts.join(", ");
}

export function buildListingShareMessage(args: {
  listing: ShareMessageListing;
  profile: ShareMessageProfile;
  url: string;
}): string {
  const { listing, profile, url } = args;
  const lines: string[] = [];

  // Header
  const brand = clean(profile.brandName ?? undefined);
  const brandCity = clean(profile.location ?? undefined);
  let header = "Today's spotlight used-vehicle deal";
  if (brand && brandCity) header += ` @${brand} ${brandCity}`;
  else if (brand) header += ` @${brand}`;
  else if (brandCity) header += ` in ${brandCity}`;
  lines.push(`${header}!`);

  // Vehicle
  const clause = vehicleClause(listing.fieldValues);
  const accessories = clean(listing.fieldValues.accessories);
  let vehicle = clean(listing.title);
  if (clause) vehicle += ` — ${clause}`;
  if (vehicle) {
    vehicle += ".";
    if (accessories) vehicle += ` ${accessories.replace(/\.$/, "")}.`;
    lines.push(vehicle);
  }

  // Price
  const price = listing.ownerExpectedPrice != null
    ? formatIndianPrice(listing.ownerExpectedPrice, listing.currency)
    : "";
  if (price) lines.push(`Expected price ${price}* (slightly negotiable, T&C apply).`);

  // Contact
  const viewingLocation = clean(listing.locationText ?? undefined) || brandCity;
  let contact = "";
  if (viewingLocation) contact += `Located in ${viewingLocation} for viewing. `;
  contact += "Interested buyers — DM";
  const phone = clean(profile.contactPhone ?? undefined);
  if (phone) contact += `, or WhatsApp ${phone}`;
  contact += ".";
  lines.push(contact);

  // URL
  lines.push(url);

  return lines.join("\n\n");
}

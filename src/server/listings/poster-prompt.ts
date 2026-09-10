// Pure, deterministic builder for an image-generation prompt the creator pastes
// into an external AI tool (Gemini / "Nano Banana", ChatGPT, …) together with
// the vehicle photo and their brand logo, to get a "spotlight deal" ad poster.
// No I/O, no AI call from our side — same spirit as buildListingShareMessage.

import { formatIndianPrice } from "./share-message";

export type PosterPromptListing = {
  title: string;
  fieldValues: Record<string, string>;
  ownerExpectedPrice: number | null;
  currency: string;
  locationText: string | null;
  description: string | null;
};

export type PosterPromptProfile = {
  brandName: string | null;
  location: string | null;
  contactPhone: string | null;
};

function clean(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

// Filler values creators type into optional fields that add nothing to a poster.
const FILLER = /^(not applicable|n\.?\/?a\.?|none|nil|no|-|—|not available|unknown)$/i;
function meaningful(value: string): string {
  return FILLER.test(value.trim()) ? "" : value;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function upper(value: string): string {
  return value.toUpperCase();
}

function headline(fields: Record<string, string>, title: string): string {
  const parts = [
    clean(fields.modelYear),
    clean(fields.make),
    clean(fields.model),
    clean(fields.variant),
  ].filter(Boolean);
  const built = parts.join(" ");
  return upper(built.length >= 6 ? built : clean(title) || "USED VEHICLE");
}

function tagline(listing: PosterPromptListing): string {
  const description = clean(listing.description);
  if (description) {
    // First sentence, kept short and punchy.
    const firstSentence = description.split(/(?<=[.!?])\s/)[0];
    return truncate(firstSentence, 90);
  }
  const bits = [
    clean(listing.fieldValues.fuelType),
    clean(listing.fieldValues.transmission),
  ].filter(Boolean);
  return bits.join(" · ");
}

function highlightBullets(fields: Record<string, string>): string[] {
  const bullets: string[] = [];

  const owners = Number(clean(fields.ownershipCount));
  if (Number.isFinite(owners) && owners > 0) {
    bullets.push(owners === 1 ? "SINGLE OWNER" : `${owners} OWNERS`);
  }

  const km = Number(clean(fields.kmDriven));
  if (Number.isFinite(km) && km > 0) {
    bullets.push(`${km.toLocaleString("en-IN")} KM DRIVEN`);
  }

  const service = meaningful(clean(fields.serviceHistory));
  if (service) bullets.push(upper(`SERVICE HISTORY: ${truncate(service, 46)}`));

  const regLocation = clean(fields.registrationLocation);
  if (regLocation) bullets.push(upper(`${regLocation} REGISTRATION`));

  const accident = meaningful(clean(fields.accidentDisclosure));
  if (accident) bullets.push(upper(truncate(accident, 52)));

  const defects = meaningful(clean(fields.knownDefects));
  if (defects) bullets.push(upper(`NOTE: ${truncate(defects, 46)}`));

  return bullets.slice(0, 6);
}

function keyFeatures(fields: Record<string, string>): string[] {
  const features: string[] = [];
  const fuel = clean(fields.fuelType);
  const transmission = clean(fields.transmission);
  if (fuel) features.push(fuel);
  if (transmission) features.push(transmission);

  for (const raw of [meaningful(clean(fields.accessories)), meaningful(clean(fields.modifications))]) {
    if (!raw) continue;
    for (const part of raw.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p && meaningful(p))) {
      features.push(part);
    }
  }
  return Array.from(new Set(features.map((f) => f.replace(/\.$/, "")))).slice(0, 8);
}

export function buildPosterPrompt(args: {
  listing: PosterPromptListing;
  profile: PosterPromptProfile;
  hasLogo: boolean;
  photoCount: number;
}): string {
  const { listing, profile, hasLogo, photoCount } = args;
  const brand = clean(profile.brandName);
  const city = clean(listing.locationText) || clean(profile.location);
  const phone = clean(profile.contactPhone);
  const price = listing.ownerExpectedPrice != null
    ? formatIndianPrice(listing.ownerExpectedPrice, listing.currency)
    : "";

  const bullets = highlightBullets(listing.fieldValues);
  const features = keyFeatures(listing.fieldValues);
  const line = tagline(listing);

  const attached: string[] = [];
  attached.push(
    "- Photo 1: the vehicle. Use it as the hero image, large, in the upper two-thirds. You may cut the car out and place it on a dark cinematic gradient background; keep it sharp, colour-accurate and undistorted. Do not add number plates, people or reflections that are not already in the photo.",
  );
  if (photoCount > 1) {
    attached.push(`- Extra photos may be attached — use the best exterior shot as the hero and ignore the rest.`);
  }
  attached.push(
    hasLogo
      ? `- Last image: the ${brand || "seller"}'s brand logo. Place it small in the top-right corner. Do not recolour, crop or stretch it.`
      : `- No logo is attached${brand ? `; render "${brand}" as clean text in the top-right corner instead` : "."}`,
  );

  const footerBits = [
    brand ? `Listed by ${brand}` : "Direct seller",
    phone ? `WhatsApp ${phone}` : "",
    city,
  ].filter(Boolean);

  return [
    "Create ONE vertical social-media ad poster (portrait, 4:5 or 1080x1350) for this used vehicle, in the style of a premium “spotlight deal” car listing.",
    "",
    "ATTACHED IMAGES",
    attached.join("\n"),
    "",
    "POSTER TEXT — render this copy exactly, do not invent or add anything:",
    "",
    `Top banner (bold, uppercase, the year/make/model in a gold accent colour):`,
    `\u{1F525} SPOTLIGHT DEAL: ${headline(listing.fieldValues, listing.title)} \u{1F525}`,
    "",
    ...(line ? [`Tagline (one short line under the banner):`, line, ""] : []),
    ...(bullets.length
      ? [`Highlights panel (a dark, semi-transparent card over the lower third; short bullet points in two columns):`, bullets.map((b) => `• ${b}`).join("\n"), ""]
      : []),
    ...(features.length
      ? [`Key-features strip (a thin gold highlight band):`, `KEY FEATURES: ${features.join(", ").toUpperCase()}`, ""]
      : []),
    ...(price ? [`Price line (large, near the bottom):`, `\u{1F4B0} ASKING PRICE: ${price} (NEGOTIABLE)`, ""] : []),
    `Footer (small, one line):`,
    `\u{1F4C7} ${footerBits.join("  ·  ")}`,
    "",
    "STYLE",
    "- Dark, premium palette: near-black background with a subtle blue or brand-colour glow, high contrast.",
    "- Large bold condensed sans-serif. Gold / amber accent on the model name and the price only.",
    "- Every element legible at thumbnail size, all text within safe margins. No stock watermarks, no placeholder text, no logos other than the attached one.",
    "",
    "RULES",
    "- Use ONLY the facts above. Do not invent specifications, service records, ownership claims, prices, or words like “verified” unless they appear here.",
    "- If a line has no value, leave it out rather than guessing.",
    "- Keep the car's real colour and body shape; do not restyle or add badges.",
  ].join("\n");
}

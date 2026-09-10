// The first concrete instance of the generic listing-template framework
// (requirements §6.2). A future category (property, collectibles, ...) adds
// a sibling file here — no schema change needed, since field values live in
// the generic ListingFieldValue table.
export type TemplateFieldType = "text" | "number" | "select" | "textarea";

export type TemplateField = {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  options?: string[];
};

export const USED_VEHICLE_FIELDS: TemplateField[] = [
  { key: "make", label: "Make", type: "text", required: true },
  { key: "model", label: "Model", type: "text", required: true },
  { key: "variant", label: "Variant", type: "text", required: false },
  { key: "modelYear", label: "Model year", type: "number", required: true },
  { key: "registrationYear", label: "Registration year", type: "number", required: false },
  { key: "kmDriven", label: "Kilometres driven", type: "number", required: true },
  { key: "fuelType", label: "Fuel", type: "select", required: true, options: ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"] },
  { key: "transmission", label: "Transmission", type: "select", required: true, options: ["Manual", "Automatic"] },
  { key: "ownershipCount", label: "Number of owners", type: "number", required: false },
  { key: "serviceHistory", label: "Service history", type: "textarea", required: false },
  { key: "accidentDisclosure", label: "Accident / insurance disclosure", type: "textarea", required: false },
  { key: "registrationLocation", label: "Registration location", type: "text", required: false },
  { key: "accessories", label: "Accessories", type: "textarea", required: false },
  { key: "modifications", label: "Modifications", type: "textarea", required: false },
  { key: "knownDefects", label: "Known defects", type: "textarea", required: false },
  { key: "vin", label: "VIN / registration number", type: "text", required: false },
];

export function usedVehicleFieldByKey(key: string): TemplateField | undefined {
  return USED_VEHICLE_FIELDS.find((field) => field.key === key);
}

// --- Title / description suggestions -----------------------------------------
// Pure, deterministic. The create-listing form offers these as an "Apply"
// suggestion (never auto-filling) and only while the target field is still
// empty, so later edits to the details can't silently rewrite what the
// creator typed.

function cleanValue(raw: string | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

function asSentence(raw: string): string {
  const text = cleanValue(raw);
  if (!text) return "";
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

// Model year + Make + Model + Variant + Fuel + Transmission, skipping any
// part the creator hasn't filled in.
export function suggestListingTitle(values: Record<string, string>): string {
  return ["modelYear", "make", "model", "variant", "fuelType", "transmission"]
    .map((key) => cleanValue(values[key]))
    .filter(Boolean)
    .join(" ");
}

// A short prose description from the registration year, kilometres, owner
// count, and any free-text notes the creator has already written.
export function suggestListingDescription(values: Record<string, string>): string {
  const facts: string[] = [];

  const registrationYear = cleanValue(values.registrationYear);
  if (registrationYear) facts.push(`registered in ${registrationYear}`);

  const kmDriven = cleanValue(values.kmDriven);
  if (kmDriven && !Number.isNaN(Number(kmDriven))) {
    facts.push(`${Number(kmDriven).toLocaleString("en-IN")} km driven`);
  }

  const ownershipCount = cleanValue(values.ownershipCount);
  if (ownershipCount && !Number.isNaN(Number(ownershipCount))) {
    const count = Number(ownershipCount);
    facts.push(count === 1 ? "single owner" : `${count} owners`);
  }

  const parts: string[] = [];
  if (facts.length > 0) {
    parts.push(asSentence(facts.join(", ")));
  }
  for (const key of ["serviceHistory", "accidentDisclosure", "knownDefects"]) {
    const extra = asSentence(values[key]);
    if (extra) parts.push(extra);
  }

  return parts.join(" ");
}

export function validateUsedVehicleFieldValues(values: Record<string, string>): string[] {
  const errors: string[] = [];
  for (const field of USED_VEHICLE_FIELDS) {
    const value = values[field.key]?.trim();
    if (field.required && !value) {
      errors.push(`${field.label} is required.`);
    }
    if (value && field.type === "number" && Number.isNaN(Number(value))) {
      errors.push(`${field.label} must be a number.`);
    }
    if (value && field.type === "select" && field.options && !field.options.includes(value)) {
      errors.push(`${field.label} must be one of: ${field.options.join(", ")}.`);
    }
  }
  return errors;
}

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

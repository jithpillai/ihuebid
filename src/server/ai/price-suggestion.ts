import { USED_VEHICLE_FIELDS } from "@/server/listings/templates/used-vehicle";

export type PriceSuggestionInput = {
  currency: string;
  locationText?: string;
  fieldValues: Record<string, string>;
};

export type PriceSuggestion = {
  low: number;
  high: number;
  rationale: string;
  // A short listing description written from the same facts, in the same
  // call. Empty string if the model returned nothing usable — the form then
  // falls back to its deterministic description suggestion.
  description: string;
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    low: { type: "number" },
    high: { type: "number" },
    rationale: { type: "string" },
    description: { type: "string" },
  },
  required: ["low", "high", "rationale", "description"],
};

const MAX_RATIONALE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 1200;

// Gemini's structured-output mode can't refuse to answer — given zero facts
// it would still return a confident-looking number, indistinguishable from a
// real estimate. This is the one source of truth for "enough to ask", used
// both to gate the button client-side and to reject a request server-side
// (a client-side-only check is bypassable via devtools or a direct API call).
export const MIN_REQUIRED_SUGGESTION_FIELDS = ["make", "model", "modelYear"] as const;

export function hasSufficientFactsForSuggestion(fieldValues: Record<string, string>): boolean {
  return MIN_REQUIRED_SUGGESTION_FIELDS.every((key) => Boolean(fieldValues[key]?.trim()));
}

// Every Used Vehicle fact the creator has filled in gets passed — model,
// variant, both model and registration year, km driven, fuel, transmission,
// ownership count, service history, accident disclosure, accessories,
// modifications, known defects, registration location. The one deliberate
// exception is `vin`: it has zero bearing on price, and requirements §6.2
// treats it as sensitive/opt-in-to-publish, so it's never sent to a
// third-party API just to price the vehicle.
export function buildPriceSuggestionPrompt(input: PriceSuggestionInput): { prompt: string; responseSchema: object } {
  const facts = USED_VEHICLE_FIELDS
    .filter((field) => field.key !== "vin")
    .map((field) => ({ label: field.label, value: input.fieldValues[field.key]?.trim() }))
    .filter((fact): fact is { label: string; value: string } => Boolean(fact.value));

  const factLines = facts.map((fact) => `- ${fact.label}: ${fact.value}`).join("\n");
  const locationLine = input.locationText?.trim() ? `- Location: ${input.locationText.trim()}` : "";

  const prompt = [
    "You are a listing assistant for a used-vehicle resale marketplace in India.",
    "Given the following vehicle facts, do two things for this exact vehicle:",
    "1. Suggest a realistic resale price range in the current Indian used-vehicle market. Be conservative and realistic — this is a rough starting-point estimate for a seller, not verified market data.",
    "2. Write a clear, factual 2-4 sentence description suitable for a resale listing. Use ONLY the facts given below — do not invent features, condition, ownership history, or service records that aren't stated. Neutral tone, no marketing hype.",
    "",
    "Vehicle facts:",
    factLines,
    locationLine,
    "",
    `Respond with: a price range in ${input.currency} (numeric values only, no currency symbols or separators), a one-sentence rationale for the range, and the description.`,
  ].filter(Boolean).join("\n");

  return { prompt, responseSchema: RESPONSE_SCHEMA };
}

// requirements §16-adjacent discipline (mirrors ihueRating's
// normalizeAnalyzeOutput): never trust raw AI output — validate and clamp
// every field before anything downstream sees it.
export function normalizePriceSuggestion(raw: unknown): PriceSuggestion {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const rawLow = typeof data.low === "number" && Number.isFinite(data.low) ? data.low : null;
  const rawHigh = typeof data.high === "number" && Number.isFinite(data.high) ? data.high : null;
  if (rawLow === null || rawHigh === null || rawLow <= 0 || rawHigh <= 0) {
    throw new Error("The AI assistant returned an unusable price range.");
  }

  const low = Math.min(rawLow, rawHigh);
  const high = Math.max(rawLow, rawHigh);
  const rationale = typeof data.rationale === "string" && data.rationale.trim()
    ? data.rationale.trim().slice(0, MAX_RATIONALE_LENGTH)
    : "Estimate based on the vehicle facts provided.";
  const description = typeof data.description === "string" && data.description.trim()
    ? data.description.replace(/\s+/g, " ").trim().slice(0, MAX_DESCRIPTION_LENGTH)
    : "";

  return { low, high, rationale, description };
}

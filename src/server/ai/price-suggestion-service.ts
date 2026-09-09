import "server-only";

import { callGemini } from "@/server/ai/gemini-client";
import { buildPriceSuggestionPrompt, normalizePriceSuggestion, type PriceSuggestionInput } from "@/server/ai/price-suggestion";
import { AuthError } from "@/server/auth/auth-service";

export async function suggestPriceRange(input: PriceSuggestionInput) {
  const { prompt, responseSchema } = buildPriceSuggestionPrompt(input);
  const result = await callGemini(prompt, responseSchema);
  try {
    return normalizePriceSuggestion(result.json);
  } catch {
    throw new AuthError("AI_INVALID_RESPONSE", "The AI assistant returned an unusable estimate. Please try again.", 502);
  }
}

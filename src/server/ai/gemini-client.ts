import "server-only";

import { AuthError } from "@/server/auth/auth-service";

// Forked from ihueRating's src/server/ai/gemini-client.ts — only the
// structured-JSON-output call (callGemini/requestGemini), not the image
// generation or audio transcription variants, which this app has no use for.
export type GeminiCallResult = {
  json: unknown;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
};

type RawGeminiResult = {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
};

async function requestGemini(prompt: string, generationConfig: Record<string, unknown>, timeoutMs: number): Promise<RawGeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  if (process.env.AI_ASSIST_ENABLED !== "true" || !apiKey) {
    throw new AuthError("AI_NOT_CONFIGURED", "The AI price suggestion isn't configured yet.", 503);
  }

  const startedAt = Date.now();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const latencyMs = Date.now() - startedAt;

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    error?: { message?: string; status?: string };
  };

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    console.error("Gemini call failed", { status: response.status, providerStatus: payload.error?.status, detail: payload.error?.message });
    throw new AuthError(
      response.status === 429 ? "AI_QUOTA_EXCEEDED" : "AI_PROVIDER_ERROR",
      response.status === 429 ? "The AI assistant is temporarily busy. Try again shortly." : "The AI assistant could not process this right now.",
      status,
    );
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
  return {
    text,
    model,
    inputTokens: payload.usageMetadata?.promptTokenCount,
    outputTokens: payload.usageMetadata?.candidatesTokenCount,
    latencyMs,
  };
}

export async function callGemini(prompt: string, responseSchema: object, temperature = 0.2): Promise<GeminiCallResult> {
  const result = await requestGemini(
    prompt,
    { temperature, maxOutputTokens: 2_048, responseMimeType: "application/json", responseSchema },
    30_000,
  );

  if (!result.text) throw new AuthError("AI_EMPTY_RESPONSE", "The AI assistant returned an empty response. Please try again.", 502);

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    throw new AuthError("AI_INVALID_RESPONSE", "The AI assistant returned an invalid response. Please try again.", 502);
  }

  return { json: parsed, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens, latencyMs: result.latencyMs };
}

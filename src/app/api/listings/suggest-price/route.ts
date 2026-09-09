import { AuthError } from "@/server/auth/auth-service";
import { requireSession } from "@/server/auth/admin";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { suggestPriceRange } from "@/server/ai/price-suggestion-service";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireSession();
    await checkRateLimit("AI_PRICE_SUGGESTION", request, { windowMinutes: 15, maxAttempts: 10 });

    const body = await request.json() as { currency?: unknown; locationText?: unknown; fieldValues?: unknown };
    if (typeof body.currency !== "string" || typeof body.fieldValues !== "object" || body.fieldValues === null) {
      throw new AuthError("INVALID_INPUT", "Missing vehicle details.");
    }

    const suggestion = await suggestPriceRange({
      currency: body.currency,
      locationText: typeof body.locationText === "string" ? body.locationText : undefined,
      fieldValues: body.fieldValues as Record<string, string>,
    });
    return Response.json({ ok: true, suggestion });
  } catch (error) {
    return authErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { submitAnonymousValuation } from "@/server/listings/response-service";
import { getParticipantCookieName, getParticipantCookieOptions } from "@/server/participant/config";
import { resolveOrCreateParticipantIdentity } from "@/server/participant/identity-service";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await checkRateLimit("SUBMIT_RESPONSE", request, { windowMinutes: 15, maxAttempts: 30 });
    const { id } = await params;
    const body = await request.json() as { value?: unknown; company?: unknown };

    // Honeypot: real participants never fill this hidden field. Report
    // success without persisting anything, so a bot doesn't learn it tripped.
    if (typeof body.company === "string" && body.company.length > 0) {
      return Response.json({ ok: true, value: typeof body.value === "number" ? body.value : 0 });
    }

    if (typeof body.value !== "number") throw new AuthError("INVALID_VALUE", "Enter a valid amount.");

    const { id: participantIdentityId, newToken } = await resolveOrCreateParticipantIdentity();
    const response = await submitAnonymousValuation(id, participantIdentityId, body.value);

    const result = NextResponse.json({ ok: true, value: Number(response.value) });
    if (newToken) {
      result.cookies.set(getParticipantCookieName(), newToken, getParticipantCookieOptions());
    }
    return result;
  } catch (error) {
    return authErrorResponse(error);
  }
}

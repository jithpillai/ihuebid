import { NextResponse } from "next/server";

import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { requestBuyerInterestVerification } from "@/server/participant/buyer-interest-service";
import { getParticipantCookieName, getParticipantCookieOptions } from "@/server/participant/config";
import { resolveOrCreateParticipantIdentity } from "@/server/participant/identity-service";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await checkRateLimit("BUYER_INTEREST_REQUEST", request, { windowMinutes: 15, maxAttempts: 5 });
    const { id } = await params;
    const body = await request.json() as { name?: unknown; email?: unknown; phone?: unknown; company?: unknown };

    // Honeypot: real visitors never fill this. Report success without persisting.
    if (typeof body.company === "string" && body.company.length > 0) {
      return Response.json({ ok: true, email: typeof body.email === "string" ? body.email : "" });
    }

    const { newToken } = await resolveOrCreateParticipantIdentity();
    const result = await requestBuyerInterestVerification(id, { name: body.name, email: body.email, phone: body.phone });

    const response = NextResponse.json({ ok: true, email: result.email, developmentCode: result.developmentCode });
    if (newToken) {
      response.cookies.set(getParticipantCookieName(), newToken, getParticipantCookieOptions());
    }
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}

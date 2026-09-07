import { NextResponse } from "next/server";

import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { submitAnonymousValuation } from "@/server/listings/response-service";
import { getParticipantCookieName, getParticipantCookieOptions } from "@/server/participant/config";
import { resolveOrCreateParticipantIdentity } from "@/server/participant/identity-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const body = await request.json() as { value?: unknown };
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

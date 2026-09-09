import { NextResponse } from "next/server";

import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { verifyContactCodeAndOptIn } from "@/server/participant/notification-service";
import { getParticipantCookieName, getParticipantCookieOptions } from "@/server/participant/config";
import { resolveOrCreateParticipantIdentity } from "@/server/participant/identity-service";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await checkRateLimit("NOTIFY_OPT_IN_VERIFY", request, { windowMinutes: 15, maxAttempts: 10 });
    const { id } = await params;
    const body = await request.json() as { email?: unknown; code?: unknown };
    if (typeof body.email !== "string" || typeof body.code !== "string") {
      throw new AuthError("INVALID_CODE", "Enter the verification code.");
    }

    const { id: participantIdentityId, newToken } = await resolveOrCreateParticipantIdentity();
    const optIn = await verifyContactCodeAndOptIn(id, participantIdentityId, body.email, body.code);

    const response = NextResponse.json({ ok: true, verified: optIn.verifiedAt !== null });
    if (newToken) {
      response.cookies.set(getParticipantCookieName(), newToken, getParticipantCookieOptions());
    }
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}

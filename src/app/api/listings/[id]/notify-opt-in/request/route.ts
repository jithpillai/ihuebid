import { NextResponse } from "next/server";

import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { requestContactVerification } from "@/server/participant/notification-service";
import { getParticipantCookieName, getParticipantCookieOptions } from "@/server/participant/config";
import { resolveOrCreateParticipantIdentity } from "@/server/participant/identity-service";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await checkRateLimit("NOTIFY_OPT_IN_REQUEST", request, { windowMinutes: 15, maxAttempts: 5 });
    const { id } = await params;
    const body = await request.json() as { email?: unknown; company?: unknown };

    if (typeof body.company === "string" && body.company.length > 0) {
      return Response.json({ ok: true, email: typeof body.email === "string" ? body.email : "" });
    }

    if (typeof body.email !== "string") throw new AuthError("INVALID_EMAIL", "Enter a valid email address.");

    const { newToken } = await resolveOrCreateParticipantIdentity();
    const result = await requestContactVerification(id, body.email);

    const response = NextResponse.json({ ok: true, email: result.email, developmentCode: result.developmentCode });
    if (newToken) {
      response.cookies.set(getParticipantCookieName(), newToken, getParticipantCookieOptions());
    }
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}

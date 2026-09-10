import { NextResponse } from "next/server";

import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { verifyBuyerInterestAndRecord } from "@/server/participant/buyer-interest-service";
import { getParticipantCookieName, getParticipantCookieOptions } from "@/server/participant/config";
import { resolveOrCreateParticipantIdentity } from "@/server/participant/identity-service";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await checkRateLimit("BUYER_INTEREST_VERIFY", request, { windowMinutes: 15, maxAttempts: 10 });
    const { id } = await params;
    const body = await request.json() as {
      name?: unknown;
      email?: unknown;
      phone?: unknown;
      code?: unknown;
      value?: unknown;
    };

    const { id: participantIdentityId, newToken } = await resolveOrCreateParticipantIdentity();
    const result = await verifyBuyerInterestAndRecord(id, participantIdentityId, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      code: body.code,
      value: body.value,
    });

    const response = NextResponse.json({ ok: true, value: result.value, alreadyRecorded: result.alreadyRecorded });
    if (newToken) {
      response.cookies.set(getParticipantCookieName(), newToken, getParticipantCookieOptions());
    }
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}

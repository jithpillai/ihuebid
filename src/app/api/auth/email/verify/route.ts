import { NextResponse } from "next/server";

import { verifyEmailOtp } from "@/server/auth/auth-service";
import { getSessionCookieName, getSessionCookieOptions } from "@/server/auth/config";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await checkRateLimit("EMAIL_OTP_VERIFY", request, { windowMinutes: 15, maxAttempts: 10 });
    const body = await request.json() as { email?: unknown; code?: unknown };
    const result = await verifyEmailOtp(
      typeof body.email === "string" ? body.email : "",
      typeof body.code === "string" ? body.code : "",
    );
    const response = NextResponse.json({
      ok: true,
      user: { id: result.user.id, displayName: result.user.displayName },
    });
    response.cookies.set(getSessionCookieName(), result.token, {
      ...getSessionCookieOptions(),
      expires: result.expiresAt,
    });
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}

import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { confirmStillInterested } from "@/server/listings/interest-service";
import { checkRateLimit } from "@/server/security/rate-limit";

// Not nested under /api/listings/[id]/ — the interest token itself is the
// only key needed (it's globally unique and already identifies the listing
// and participant), so there's no listing id to route on.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await checkRateLimit("CONFIRM_INTERESTED", request, { windowMinutes: 15, maxAttempts: 10 });
    const body = await request.json() as { token?: unknown };
    if (typeof body.token !== "string") throw new AuthError("INVALID_TOKEN", "This link is invalid or has expired.", 404);
    await confirmStillInterested(body.token);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

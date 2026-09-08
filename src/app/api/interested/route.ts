import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { confirmStillInterested } from "@/server/listings/interest-service";

// Not nested under /api/listings/[id]/ — the interest token itself is the
// only key needed (it's globally unique and already identifies the listing
// and participant), so there's no listing id to route on.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as { token?: unknown; shareContact?: unknown };
    if (typeof body.token !== "string") throw new AuthError("INVALID_TOKEN", "This link is invalid or has expired.", 404);
    await confirmStillInterested(body.token, body.shareContact === true);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { setUserDisplayName } from "@/server/account/profile-service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to update your name.", 401);

    const body = await request.json() as { displayName?: unknown };
    if (typeof body.displayName !== "string") throw new AuthError("DISPLAY_NAME_REQUIRED", "Enter a name.");

    const user = await setUserDisplayName(session.userId, body.displayName);
    return Response.json({ ok: true, displayName: user.displayName });
  } catch (error) {
    return authErrorResponse(error);
  }
}

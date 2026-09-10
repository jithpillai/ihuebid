import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { removeUserBanner } from "@/server/media/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to remove your banner.", 401);
    await removeUserBanner(session);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

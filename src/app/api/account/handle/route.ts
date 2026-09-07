import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { setUserHandle } from "@/server/account/profile-service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to set a handle.", 401);

    const body = await request.json() as { handle?: unknown };
    if (typeof body.handle !== "string") throw new AuthError("HANDLE_REQUIRED", "Enter a handle.");

    const profile = await setUserHandle(session.userId, body.handle);
    return Response.json({ ok: true, handle: profile.handle });
  } catch (error) {
    return authErrorResponse(error);
  }
}

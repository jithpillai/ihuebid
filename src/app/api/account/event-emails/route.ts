import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { setEventNotificationEmails } from "@/server/account/profile-service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to update your account.", 401);

    const body = await request.json() as { emails?: unknown };
    const { emails } = await setEventNotificationEmails(session.userId, body.emails);
    return Response.json({ ok: true, emails });
  } catch (error) {
    return authErrorResponse(error);
  }
}

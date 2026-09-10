import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { inviteCollaborator, listAccountCollaborators } from "@/server/account/collaborator-service";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to manage collaborators.", 401);
    const collaborators = await listAccountCollaborators(session.userId);
    return Response.json({ ok: true, collaborators });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to add a collaborator.", 401);
    const body = await request.json() as { email?: unknown };
    const collaborator = await inviteCollaborator(session.userId, session.user.displayName, body.email);
    return Response.json({ ok: true, collaborator });
  } catch (error) {
    return authErrorResponse(error);
  }
}

import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { revokeCollaborator } from "@/server/account/collaborator-service";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to remove a collaborator.", 401);
    const { id } = await params;
    await revokeCollaborator(session.userId, id);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

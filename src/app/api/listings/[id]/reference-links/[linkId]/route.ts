import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { removeReferenceLink } from "@/server/listings/listing-service";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to remove this link.", 401);
    const { id, linkId } = await params;
    await removeReferenceLink(session, id, linkId);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

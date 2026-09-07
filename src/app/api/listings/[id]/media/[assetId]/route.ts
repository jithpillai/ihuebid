import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { removeListingMediaAsset } from "@/server/media/service";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to remove a photo.", 401);
    const { id, assetId } = await params;
    await removeListingMediaAsset(session, id, assetId);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

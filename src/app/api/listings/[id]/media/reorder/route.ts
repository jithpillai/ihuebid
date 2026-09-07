import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { reorderListingMedia } from "@/server/media/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to reorder photos.", 401);
    const { id } = await params;
    const body = await request.json() as { order?: unknown };
    if (!Array.isArray(body.order) || !body.order.every((value) => typeof value === "string")) {
      throw new AuthError("INVALID_ORDER", "The photo order is invalid.");
    }
    await reorderListingMedia(session, id, body.order);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

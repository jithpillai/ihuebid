import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { closeListing, type CloseListingInput } from "@/server/listings/closing-service";

const OUTCOMES = new Set(["SOLD", "NOT_SOLD", "REMOVED"]);
const VISIBILITIES = new Set(["SHOW_OUTCOME", "CLOSED_ONLY"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to close this listing.", 401);
    const { id } = await params;
    const body = await request.json() as Partial<CloseListingInput>;
    if (typeof body.outcome !== "string" || !OUTCOMES.has(body.outcome)) {
      throw new AuthError("INVALID_OUTCOME", "Choose a valid closure outcome.");
    }
    if (typeof body.closureVisibility !== "string" || !VISIBILITIES.has(body.closureVisibility)) {
      throw new AuthError("INVALID_VISIBILITY", "Choose a valid result visibility.");
    }

    await closeListing(session, id, {
      outcome: body.outcome as CloseListingInput["outcome"],
      finalPrice: body.finalPrice,
      note: body.note,
      closureVisibility: body.closureVisibility as CloseListingInput["closureVisibility"],
    });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

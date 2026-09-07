import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { updateListing, type UpdateListingInput } from "@/server/listings/listing-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to edit this listing.", 401);
    const { id } = await params;
    const body = await request.json() as UpdateListingInput;
    const listing = await updateListing(session, id, body);
    return Response.json({ ok: true, listing: { id: listing.id, publicId: listing.publicId } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

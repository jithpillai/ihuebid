import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { publishListing } from "@/server/listings/listing-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to publish this listing.", 401);
    const { id } = await params;
    const listing = await publishListing(session, id);
    return Response.json({ ok: true, listing: { id: listing.id, publicId: listing.publicId, status: listing.status } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

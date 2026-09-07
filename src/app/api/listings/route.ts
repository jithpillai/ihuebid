import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { createListing, type CreateListingInput } from "@/server/listings/listing-service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to create a listing.", 401);
    if (!session.user.profile?.handle) {
      throw new AuthError("HANDLE_REQUIRED", "Set your public handle before creating a listing.");
    }

    const body = await request.json() as Partial<CreateListingInput>;
    if (typeof body.title !== "string" || typeof body.currency !== "string") {
      throw new AuthError("INVALID_LISTING", "Title and currency are required.");
    }

    const listing = await createListing(session, {
      title: body.title,
      category: "USED_VEHICLE",
      description: body.description,
      locationText: body.locationText,
      currency: body.currency.toUpperCase(),
      ownerExpectedPrice: body.ownerExpectedPrice,
      ownerPriceVisibility: body.ownerPriceVisibility ?? "NOT_SUPPLIED",
      responseMin: Number(body.responseMin ?? 0),
      responseMax: Number(body.responseMax ?? 0),
      responseIncrement: Number(body.responseIncrement ?? 0),
      timeZone: body.timeZone || "Asia/Kolkata",
      disclosureText: body.disclosureText,
      fieldValues: body.fieldValues ?? {},
    });
    return Response.json({ ok: true, listing: { id: listing.id, publicId: listing.publicId } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

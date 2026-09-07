import "server-only";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { snapResponseValue } from "@/server/listings/response-value";

export async function submitAnonymousValuation(listingId: string, participantIdentityId: string, rawValue: number) {
  if (!Number.isFinite(rawValue)) throw new AuthError("INVALID_VALUE", "Enter a valid amount.");

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, status: true, responseMin: true, responseMax: true, responseIncrement: true },
  });
  if (!listing) throw new AuthError("LISTING_NOT_FOUND", "This listing could not be found.", 404);
  if (listing.status !== "LIVE") {
    throw new AuthError("LISTING_NOT_ACCEPTING_RESPONSES", "This listing isn't accepting responses right now.");
  }

  const value = snapResponseValue(
    rawValue,
    Number(listing.responseMin),
    Number(listing.responseMax),
    Number(listing.responseIncrement),
  );

  return db.response.upsert({
    where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
    create: { listingId, participantIdentityId, value, mode: "ANONYMOUS_VALUATION" },
    update: { value, revisionCount: { increment: 1 } },
  });
}

export async function getAnonymousValuation(listingId: string, participantIdentityId: string | null): Promise<number | null> {
  if (!participantIdentityId) return null;
  const response = await db.response.findUnique({
    where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
    select: { value: true },
  });
  return response ? Number(response.value) : null;
}

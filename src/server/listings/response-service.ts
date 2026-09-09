import "server-only";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { computeAggregate } from "@/server/listings/aggregation";
import { checkRevisionAllowed, snapResponseValue } from "@/server/listings/response-value";

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

  const existing = await db.response.findUnique({
    where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
    select: { revisionCount: true, updatedAt: true },
  });
  const revisionCheck = checkRevisionAllowed(existing);
  if (!revisionCheck.ok) {
    if (revisionCheck.reason === "MAX_REVISIONS") {
      throw new AuthError("MAX_REVISIONS_REACHED", "You've revised this estimate as many times as we allow.", 429);
    }
    throw new AuthError("REVISION_COOLDOWN", `Please wait a bit before revising your estimate again.`, 429);
  }

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

// The single source of truth for "which rows count toward the aggregate" —
// both the public listing page and the creator dashboard call this rather
// than querying Response directly, so the ANONYMOUS_VALUATION filter can
// never drift out of sync between the two surfaces.
export async function getListingAggregate(listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { responseMin: true, responseMax: true, ownerExpectedPrice: true },
  });
  if (!listing) throw new AuthError("LISTING_NOT_FOUND", "This listing could not be found.", 404);

  const responses = await db.response.findMany({
    where: { listingId, mode: "ANONYMOUS_VALUATION" },
    select: { value: true },
  });

  return computeAggregate(
    responses.map((response) => Number(response.value)),
    {
      min: Number(listing.responseMin),
      max: Number(listing.responseMax),
      expectedPrice: listing.ownerExpectedPrice != null ? Number(listing.ownerExpectedPrice) : undefined,
    },
  );
}

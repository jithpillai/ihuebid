import "server-only";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { computeAggregate, partitionNamedValues, type ListingAggregate } from "@/server/listings/aggregation";
import { checkRevisionAllowed, normalizeContributorName, snapResponseValue } from "@/server/listings/response-value";

export type SubmitValuationInput = {
  rawValue: number;
  name: unknown;
  stayAnonymous: boolean;
};

export async function submitAnonymousValuation(
  listingId: string,
  participantIdentityId: string,
  input: SubmitValuationInput,
) {
  const { rawValue, name, stayAnonymous } = input;
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

  const normalizedName = normalizeContributorName(name);
  // The checkbox only controls whether this estimate is attributed. The name
  // itself is still remembered for next time whenever one was supplied.
  const contributorName = stayAnonymous ? null : normalizedName;

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

  if (normalizedName) {
    await db.participantIdentity.update({
      where: { id: participantIdentityId },
      data: { displayName: normalizedName },
    });
  }

  return db.response.upsert({
    where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
    create: { listingId, participantIdentityId, value, contributorName, mode: "ANONYMOUS_VALUATION" },
    update: { value, contributorName, revisionCount: { increment: 1 } },
  });
}

export type ParticipantValuation = { value: number; contributorName: string | null };

export async function getParticipantValuation(
  listingId: string,
  participantIdentityId: string | null,
): Promise<ParticipantValuation | null> {
  if (!participantIdentityId) return null;
  const response = await db.response.findUnique({
    where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
    select: { value: true, contributorName: true },
  });
  return response ? { value: Number(response.value), contributorName: response.contributorName } : null;
}

export type { ListingAggregate } from "@/server/listings/aggregation";

// The single source of truth for "which rows count toward the aggregate" —
// both the public listing page and the creator dashboard call this rather
// than querying Response directly, so the ANONYMOUS_VALUATION filter can
// never drift out of sync between the two surfaces.
export async function getListingAggregate(listingId: string): Promise<ListingAggregate> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { responseMin: true, responseMax: true, ownerExpectedPrice: true },
  });
  if (!listing) throw new AuthError("LISTING_NOT_FOUND", "This listing could not be found.", 404);

  const responses = await db.response.findMany({
    where: { listingId, mode: "ANONYMOUS_VALUATION" },
    select: { value: true, contributorName: true },
  });

  const rows = responses.map((response) => ({
    value: Number(response.value),
    contributorName: response.contributorName,
  }));
  const { all, named } = partitionNamedValues(rows);
  const options = {
    min: Number(listing.responseMin),
    max: Number(listing.responseMax),
    expectedPrice: listing.ownerExpectedPrice != null ? Number(listing.ownerExpectedPrice) : undefined,
  };

  return {
    all: computeAggregate(all, options),
    named: computeAggregate(named, options),
    counts: { named: named.length, anonymous: all.length - named.length },
    namedEstimates: rows
      .filter((row): row is { value: number; contributorName: string } => Boolean(row.contributorName))
      .map((row) => ({ name: row.contributorName, value: row.value }))
      .sort((a, b) => a.value - b.value),
  };
}

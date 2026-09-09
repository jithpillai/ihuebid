import "server-only";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { hashSessionToken } from "@/server/auth/crypto";

export async function getOptInByInterestToken(token: string) {
  return db.notificationOptIn.findUnique({
    where: { interestTokenHash: hashSessionToken(token) },
    include: { listing: { include: { creator: { include: { profile: true } } } } },
  });
}

// Every participant who verified an email on this listing, so the creator can
// reach out. The email is disclosed to the creator at opt-in time (the opt-in
// form says so) — `stillInterestedAt` is now just a "confirmed again after the
// close" signal, not the consent gate it used to be.
export async function getListingParticipantContacts(listingId: string) {
  return db.notificationOptIn.findMany({
    where: { listingId, verifiedAt: { not: null } },
    orderBy: [
      { stillInterestedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: { id: true, email: true, createdAt: true, stillInterestedAt: true },
  });
}

// The email is already shared with the creator at opt-in time; this just
// records "yes, still interested" from the post-close magic link so the
// creator's contact list can badge the row (requirements §7.2).
export async function confirmStillInterested(token: string) {
  const optIn = await db.notificationOptIn.findUnique({ where: { interestTokenHash: hashSessionToken(token) } });
  if (!optIn) throw new AuthError("INVALID_TOKEN", "This link is invalid or has expired.", 404);

  return db.notificationOptIn.update({
    where: { id: optIn.id },
    data: { stillInterestedAt: new Date() },
  });
}

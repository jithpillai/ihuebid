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

export async function getStillInterestedParticipants(listingId: string) {
  return db.notificationOptIn.findMany({
    where: { listingId, stillInterestedAt: { not: null } },
    orderBy: { stillInterestedAt: "desc" },
  });
}

// Clicking "I'm still interested" on this listing's page is itself the
// explicit consent to share the email with this listing's creator — that's
// the whole point of the action (requirements §7.2), not a separate choice.
export async function confirmStillInterested(token: string) {
  const optIn = await db.notificationOptIn.findUnique({ where: { interestTokenHash: hashSessionToken(token) } });
  if (!optIn) throw new AuthError("INVALID_TOKEN", "This link is invalid or has expired.", 404);

  return db.notificationOptIn.update({
    where: { id: optIn.id },
    data: { stillInterestedAt: new Date() },
  });
}

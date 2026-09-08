import "server-only";

import { db } from "@/lib/db";
import type { ClosureOutcome, ClosureVisibility } from "@/generated/prisma/client";
import { AuthError } from "@/server/auth/auth-service";
import { createSessionToken, hashSessionToken } from "@/server/auth/crypto";
import { renderClosureNotificationEmail } from "@/server/email/closure-notification-template";
import { getEmailProvider } from "@/server/email/provider";
import { getListingForOwner } from "@/server/listings/listing-service";

type SessionShape = Parameters<typeof getListingForOwner>[1] & {
  user: { displayName: string; profile: { handle: string | null } | null };
};

export type CloseListingInput = {
  outcome: ClosureOutcome;
  finalPrice?: number;
  note?: string;
  closureVisibility: ClosureVisibility;
};

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function closeListing(session: SessionShape, listingId: string, input: CloseListingInput) {
  const listing = await getListingForOwner(listingId, session);
  if (listing.status !== "LIVE" && listing.status !== "PAUSED") {
    throw new AuthError("LISTING_NOT_CLOSABLE", "Only live or paused listings can be closed.");
  }

  await db.listing.update({
    where: { id: listingId },
    data: {
      status: "CLOSED",
      closeAt: new Date(),
      closureOutcome: input.outcome,
      closureFinalPrice: input.outcome === "SOLD" ? input.finalPrice ?? null : null,
      closureNote: input.note?.trim() || null,
      closureVisibility: input.closureVisibility,
    },
  });

  await notifyOptedInParticipants(session, listing.id, listing.publicId, listing.title, listing.currency, input);
}

async function notifyOptedInParticipants(
  session: SessionShape,
  listingId: string,
  listingPublicId: string,
  listingTitle: string,
  currency: string,
  input: CloseListingInput,
) {
  const handle = session.user.profile?.handle;
  if (!handle) return; // every LIVE listing's creator has a handle by construction; defensive no-op otherwise

  const optIns = await db.notificationOptIn.findMany({
    where: { listingId, verifiedAt: { not: null } },
  });
  if (optIns.length === 0) return;

  const currencyFormatter = input.finalPrice != null
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 })
    : null;

  for (const optIn of optIns) {
    try {
      const token = createSessionToken();
      await db.notificationOptIn.update({
        where: { id: optIn.id },
        data: { interestTokenHash: hashSessionToken(token) },
      });
      const interestedUrl = `${appUrl()}/${handle}/${listingPublicId}/interested?token=${token}`;
      const provider = getEmailProvider(optIn.email);
      await provider.sendTransactional({
        to: optIn.email,
        ...renderClosureNotificationEmail({
          listingTitle,
          creatorDisplayName: session.user.displayName,
          outcome: input.outcome,
          finalPriceFormatted: currencyFormatter && input.finalPrice != null ? currencyFormatter.format(input.finalPrice) : undefined,
          interestedUrl,
        }),
      });
    } catch (error) {
      // One recipient's failure must not block the others or the close itself.
      console.error("Closure notification failed", optIn.id, error instanceof Error ? error.message : "Unknown error");
    }
  }
}

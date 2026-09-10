import "server-only";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { toYouTubeEmbedUrl } from "@/server/listings/embed-validation";
import { generateListingPublicId } from "@/server/listings/public-id";
import { validateUsedVehicleFieldValues } from "@/server/listings/templates/used-vehicle";

type SessionShape = { userId: string; user: { role: string } };

export function canEditListing(
  listing: { creatorId: string },
  session: SessionShape,
): boolean {
  if (session.user.role === "ADMIN") return true;
  return listing.creatorId === session.userId;
}

export type CreateListingInput = {
  title: string;
  category: "USED_VEHICLE";
  description?: string;
  locationText?: string;
  currency: string;
  ownerExpectedPrice?: number;
  ownerPriceVisibility: "VISIBLE" | "HIDDEN_UNTIL_RESPONSE" | "NOT_SUPPLIED";
  resultVisibility: "PUBLIC" | "CREATOR_ONLY";
  responseMin: number;
  responseMax: number;
  responseIncrement: number;
  timeZone: string;
  disclosureText?: string;
  fieldValues: Record<string, string>;
};

function validateCommonFields(input: Pick<CreateListingInput, "title" | "currency" | "responseMin" | "responseMax" | "responseIncrement">) {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("Title is required.");
  if (!/^[A-Z]{3}$/.test(input.currency)) errors.push("Currency must be a 3-letter ISO code (e.g. INR).");
  if (!(input.responseMin >= 0)) errors.push("Response range minimum must be zero or more.");
  if (!(input.responseMax > input.responseMin)) errors.push("Response range maximum must be greater than the minimum.");
  if (!(input.responseIncrement > 0)) errors.push("Response increment must be greater than zero.");
  return errors;
}

async function createUniquePublicId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateListingPublicId();
    const existing = await db.listing.findUnique({ where: { publicId: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique listing id.");
}

export async function createListing(session: SessionShape, input: CreateListingInput) {
  const errors = [
    ...validateCommonFields(input),
    ...validateUsedVehicleFieldValues(input.fieldValues),
  ];
  if (errors.length > 0) throw new AuthError("INVALID_LISTING", errors.join(" "));

  const publicId = await createUniquePublicId();

  return db.listing.create({
    data: {
      publicId,
      creatorId: session.userId,
      title: input.title.trim(),
      category: input.category,
      description: input.description?.trim() || null,
      locationText: input.locationText?.trim() || null,
      currency: input.currency,
      ownerExpectedPrice: input.ownerExpectedPrice ?? null,
      ownerPriceVisibility: input.ownerPriceVisibility,
      resultVisibility: input.resultVisibility,
      responseMin: input.responseMin,
      responseMax: input.responseMax,
      responseIncrement: input.responseIncrement,
      timeZone: input.timeZone,
      disclosureText: input.disclosureText?.trim() || null,
      status: "DRAFT",
      fieldValues: {
        create: Object.entries(input.fieldValues)
          .filter(([, value]) => value.trim().length > 0)
          .map(([fieldKey, fieldValue]) => ({ fieldKey, fieldValue: fieldValue.trim() })),
      },
    },
  });
}

export async function getListingByPublicId(publicId: string) {
  return db.listing.findUnique({
    where: { publicId },
    include: {
      creator: { include: { profile: true } },
      fieldValues: true,
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      embeds: true,
      referenceLinks: true,
    },
  });
}

export async function getListingForOwner(listingId: string, session: SessionShape) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { fieldValues: true, mediaAssets: { orderBy: { sortOrder: "asc" } }, embeds: true, referenceLinks: true },
  });
  if (!listing) throw new AuthError("LISTING_NOT_FOUND", "This listing could not be found.", 404);
  if (!canEditListing(listing, session)) throw new AuthError("FORBIDDEN", "You don't have permission to edit this listing.", 403);
  return listing;
}

export async function listListingsForCreator(creatorId: string) {
  return db.listing.findMany({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
    include: { mediaAssets: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
}

// Count of valuations per listing — same ANONYMOUS_VALUATION filter that
// `getListingAggregate` uses, so a card's count and its aggregate can't disagree.
async function responseCountsByListing(listingIds: string[]): Promise<Map<string, number>> {
  if (listingIds.length === 0) return new Map();
  const rows = await db.response.groupBy({
    by: ["listingId"],
    where: { listingId: { in: listingIds }, mode: "ANONYMOUS_VALUATION" },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.listingId, row._count._all]));
}

export async function listListingsForCreatorWithStats(creatorId: string) {
  const listings = await listListingsForCreator(creatorId);
  const counts = await responseCountsByListing(listings.map((listing) => listing.id));
  return listings.map((listing) => ({ ...listing, responseCount: counts.get(listing.id) ?? 0 }));
}

export async function listPublicListingsForHandle(userId: string) {
  return db.listing.findMany({
    where: { creatorId: userId, status: { in: ["LIVE", "PAUSED", "CLOSED"] } },
    orderBy: { createdAt: "desc" },
    include: { mediaAssets: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
}

export async function listPublicListingsForHandleWithStats(userId: string) {
  const listings = await listPublicListingsForHandle(userId);
  const counts = await responseCountsByListing(listings.map((listing) => listing.id));
  return listings.map((listing) => ({ ...listing, responseCount: counts.get(listing.id) ?? 0 }));
}

// Cross-creator feed for the marketing landing page. Only LIVE listings whose
// creator has claimed a handle (otherwise there's no public URL to link to).
export async function listRecentPublicListings(limit = 6) {
  return db.listing.findMany({
    where: { status: "LIVE", creator: { profile: { is: { handle: { not: null } } } } },
    orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      creator: { include: { profile: true } },
      mediaAssets: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
}

export type UpdateListingInput = Partial<Omit<CreateListingInput, "category">>;

// Editable at any status. A published listing's responses were given against
// whatever the participants saw, so the market signal can become misleading
// after an edit — the edit UI warns about that; the service trusts the
// creator. `publicId` (and therefore the public URL) never changes here.
export async function updateListing(session: SessionShape, listingId: string, input: UpdateListingInput) {
  const listing = await getListingForOwner(listingId, session);
  if (listing.status === "CANCELLED") {
    throw new AuthError("LISTING_NOT_EDITABLE", "This listing has been cancelled.");
  }

  const merged = {
    title: input.title ?? listing.title,
    currency: input.currency ?? listing.currency,
    responseMin: input.responseMin ?? Number(listing.responseMin),
    responseMax: input.responseMax ?? Number(listing.responseMax),
    responseIncrement: input.responseIncrement ?? Number(listing.responseIncrement),
  };
  const errors = validateCommonFields(merged);
  if (input.fieldValues) errors.push(...validateUsedVehicleFieldValues(input.fieldValues));
  if (errors.length > 0) throw new AuthError("INVALID_LISTING", errors.join(" "));

  await db.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listingId },
      data: {
        title: merged.title,
        description: input.description !== undefined ? input.description?.trim() || null : undefined,
        locationText: input.locationText !== undefined ? input.locationText?.trim() || null : undefined,
        currency: merged.currency,
        ownerExpectedPrice: input.ownerExpectedPrice !== undefined ? input.ownerExpectedPrice : undefined,
        ownerPriceVisibility: input.ownerPriceVisibility,
        resultVisibility: input.resultVisibility,
        responseMin: merged.responseMin,
        responseMax: merged.responseMax,
        responseIncrement: merged.responseIncrement,
        timeZone: input.timeZone,
        disclosureText: input.disclosureText !== undefined ? input.disclosureText?.trim() || null : undefined,
      },
    });

    if (input.fieldValues) {
      for (const [fieldKey, fieldValue] of Object.entries(input.fieldValues)) {
        if (!fieldValue.trim()) {
          await tx.listingFieldValue.deleteMany({ where: { listingId, fieldKey } });
          continue;
        }
        await tx.listingFieldValue.upsert({
          where: { listingId_fieldKey: { listingId, fieldKey } },
          create: { listingId, fieldKey, fieldValue: fieldValue.trim() },
          update: { fieldValue: fieldValue.trim() },
        });
      }
    }
  });

  return getListingForOwner(listingId, session);
}

export async function publishListing(session: SessionShape, listingId: string) {
  const listing = await getListingForOwner(listingId, session);
  if (listing.status !== "DRAFT" && listing.status !== "SCHEDULED") {
    throw new AuthError("LISTING_NOT_PUBLISHABLE", "Only draft or scheduled listings can be published.");
  }
  if (listing.mediaAssets.length === 0) {
    throw new AuthError("LISTING_NEEDS_MEDIA", "Add at least one photo before publishing.");
  }
  return db.listing.update({ where: { id: listingId }, data: { status: "LIVE", publishAt: new Date() } });
}

export async function setListingEmbed(session: SessionShape, listingId: string, url: string) {
  const embedUrl = toYouTubeEmbedUrl(url);
  if (!embedUrl) throw new AuthError("INVALID_EMBED", "Enter a valid YouTube video link.");
  const listing = await getListingForOwner(listingId, session);
  await db.$transaction([
    db.externalEmbed.deleteMany({ where: { listingId: listing.id } }),
    db.externalEmbed.create({ data: { listingId: listing.id, provider: "YOUTUBE", url: embedUrl } }),
  ]);
}

export async function removeListingEmbed(session: SessionShape, listingId: string) {
  const listing = await getListingForOwner(listingId, session);
  await db.externalEmbed.deleteMany({ where: { listingId: listing.id } });
}

export async function addReferenceLink(session: SessionShape, listingId: string, label: string, url: string) {
  const listing = await getListingForOwner(listingId, session);
  return db.referenceLink.create({ data: { listingId: listing.id, label: label.trim(), url } });
}

export async function removeReferenceLink(session: SessionShape, listingId: string, linkId: string) {
  await getListingForOwner(listingId, session);
  await db.referenceLink.deleteMany({ where: { id: linkId, listingId } });
}

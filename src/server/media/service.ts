import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { canEditListing } from "@/server/listings/listing-service";
import { cloudinaryConfig } from "./cloudinary";
import { ALLOWED_IMAGE_FORMATS, MEDIA_POLICY, type SupportedMediaPurpose } from "./policy";

type SessionShape = Awaited<ReturnType<typeof import("@/server/auth/session").getCurrentSession>>;

// Listing images: the listing's creator (or an admin). Avatars are
// self-service only, scoped to the uploading user.
async function resolveMediaContext(session: NonNullable<SessionShape>, purpose: SupportedMediaPurpose, listingId?: string) {
  const { folderPrefix } = cloudinaryConfig();
  if (purpose === "USER_AVATAR") {
    return { listingId: null, publicIdPrefix: `${folderPrefix}/users/${session.userId}/avatar`, deliveryType: "authenticated" as const };
  }
  if (purpose === "USER_BANNER") {
    // Public delivery — it's a public-profile background, unlike the avatar.
    return { listingId: null, publicIdPrefix: `${folderPrefix}/users/${session.userId}/banner`, deliveryType: "upload" as const };
  }
  if (!listingId) throw new AuthError("LISTING_REQUIRED", "Select the listing this image belongs to.");
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { id: true, creatorId: true } });
  if (!listing) throw new AuthError("LISTING_NOT_FOUND", "This listing could not be found.", 404);
  if (!canEditListing(listing, session)) throw new AuthError("FORBIDDEN", "You don't have permission to edit this listing's photos.", 403);
  return { listingId: listing.id, publicIdPrefix: `${folderPrefix}/listings/${listing.id}/image`, deliveryType: "upload" as const };
}

export async function createUploadSignature(session: NonNullable<SessionShape>, purpose: SupportedMediaPurpose, listingId?: string) {
  const context = await resolveMediaContext(session, purpose, listingId);
  const { cloudinary, cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${context.publicIdPrefix}/${randomUUID()}`;
  const uploadParams = { timestamp, public_id: publicId, overwrite: false, type: context.deliveryType };
  return {
    cloudName,
    apiKey,
    timestamp,
    publicId,
    overwrite: false,
    deliveryType: context.deliveryType,
    signature: cloudinary.utils.api_sign_request(uploadParams, apiSecret),
    maxBytes: MEDIA_POLICY[purpose].maxBytes,
  };
}

type CompleteInput = { purpose: SupportedMediaPurpose; listingId?: string; publicId: string };

export async function completeMediaUpload(session: NonNullable<SessionShape>, input: CompleteInput) {
  const context = await resolveMediaContext(session, input.purpose, input.listingId);
  if (!input.publicId.startsWith(`${context.publicIdPrefix}/`)) {
    throw new AuthError("INVALID_MEDIA", "The uploaded asset does not match this account or listing.");
  }
  const { cloudinary } = cloudinaryConfig();
  const resource = await cloudinary.api.resource(input.publicId, { resource_type: "image", type: context.deliveryType }) as {
    public_id: string; format: string; bytes?: number;
  };
  const format = resource.format.toLowerCase();
  const bytes = resource.bytes ?? 0;
  if (!ALLOWED_IMAGE_FORMATS.has(format) || bytes <= 0 || bytes > MEDIA_POLICY[input.purpose].maxBytes) {
    await cloudinary.uploader.destroy(input.publicId, { resource_type: "image", type: context.deliveryType, invalidate: true }).catch(() => undefined);
    throw new AuthError("INVALID_MEDIA", "Use a JPEG, PNG, or WebP image within the allowed size.");
  }

  if (input.purpose === "USER_AVATAR" || input.purpose === "USER_BANNER") {
    const column = input.purpose === "USER_AVATAR" ? "avatarPublicId" : "bannerPublicId";
    const existing = await db.userProfile.findUnique({ where: { userId: session.userId }, select: { [column]: true } }) as Record<string, string | null> | null;
    await db.userProfile.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, [column]: resource.public_id },
      update: { [column]: resource.public_id },
    });
    const previous = existing?.[column];
    if (previous) {
      await cloudinary.uploader.destroy(previous, { resource_type: "image", type: context.deliveryType, invalidate: true }).catch(() => undefined);
    }
    return { publicId: resource.public_id };
  }

  // Listing images are a gallery, not a single slot: each successful upload
  // adds a new MediaAsset appended to the end, rather than replacing one.
  const listingId = context.listingId!;
  const last = await db.mediaAsset.findFirst({ where: { listingId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const asset = await db.mediaAsset.create({
    data: { listingId, publicId: resource.public_id, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  revalidatePath(`/dashboard/listings/${listingId}/edit`);
  return { publicId: asset.publicId, assetId: asset.id };
}

export async function removeUserAvatar(session: NonNullable<SessionShape>) {
  const context = await resolveMediaContext(session, "USER_AVATAR");
  const existing = await db.userProfile.findUnique({ where: { userId: session.userId }, select: { avatarPublicId: true } });
  if (!existing?.avatarPublicId) return;
  await db.userProfile.update({ where: { userId: session.userId }, data: { avatarPublicId: null } });
  const { cloudinary } = cloudinaryConfig();
  await cloudinary.uploader.destroy(existing.avatarPublicId, { resource_type: "image", type: context.deliveryType, invalidate: true }).catch(() => undefined);
}

export async function removeUserBanner(session: NonNullable<SessionShape>) {
  const context = await resolveMediaContext(session, "USER_BANNER");
  const existing = await db.userProfile.findUnique({ where: { userId: session.userId }, select: { bannerPublicId: true } });
  if (!existing?.bannerPublicId) return;
  await db.userProfile.update({ where: { userId: session.userId }, data: { bannerPublicId: null } });
  const { cloudinary } = cloudinaryConfig();
  await cloudinary.uploader.destroy(existing.bannerPublicId, { resource_type: "image", type: context.deliveryType, invalidate: true }).catch(() => undefined);
}

export async function removeListingMediaAsset(session: NonNullable<SessionShape>, listingId: string, assetId: string) {
  await resolveMediaContext(session, "LISTING_IMAGE", listingId);
  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.listingId !== listingId) return;
  await db.mediaAsset.delete({ where: { id: assetId } });
  const { cloudinary } = cloudinaryConfig();
  await cloudinary.uploader.destroy(asset.publicId, { resource_type: "image", type: "upload", invalidate: true }).catch(() => undefined);
  revalidatePath(`/dashboard/listings/${listingId}/edit`);
}

export async function reorderListingMedia(session: NonNullable<SessionShape>, listingId: string, orderedAssetIds: string[]) {
  await resolveMediaContext(session, "LISTING_IMAGE", listingId);
  await db.$transaction(
    orderedAssetIds.map((assetId, index) =>
      db.mediaAsset.updateMany({ where: { id: assetId, listingId }, data: { sortOrder: index } }),
    ),
  );
  revalidatePath(`/dashboard/listings/${listingId}/edit`);
}

export const MEDIA_PURPOSES = ["USER_AVATAR", "USER_BANNER", "LISTING_IMAGE"] as const;
export type SupportedMediaPurpose = typeof MEDIA_PURPOSES[number];

export const MEDIA_POLICY: Record<SupportedMediaPurpose, { maxBytes: number; label: string }> = {
  USER_AVATAR: { maxBytes: 5 * 1024 * 1024, label: "profile image" },
  USER_BANNER: { maxBytes: 8 * 1024 * 1024, label: "banner image" },
  LISTING_IMAGE: { maxBytes: 10 * 1024 * 1024, label: "listing image" },
};

export const ALLOWED_IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "webp"]);

export function isSupportedMediaPurpose(value: string): value is SupportedMediaPurpose {
  return MEDIA_PURPOSES.includes(value as SupportedMediaPurpose);
}

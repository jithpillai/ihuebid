import "server-only";

import { v2 as cloudinary } from "cloudinary";

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX?.trim().replace(/^\/+|\/+$/g, "");
  if (!cloudName || !apiKey || !apiSecret || !folderPrefix) {
    throw new Error("Cloudinary credentials and folder prefix are required.");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return { cloudinary, cloudName, apiKey, apiSecret, folderPrefix };
}

// A 1200x630 crop for OpenGraph / Twitter cards — the size link-preview
// crawlers (WhatsApp, Telegram, Slack, X) expect for a large image card.
// Public `upload` delivery only; never used for `authenticated` assets.
export function cloudinaryOgImageUrl(asset: { publicId: string }): string {
  const { cloudinary } = cloudinaryConfig();
  return cloudinary.url(asset.publicId, {
    secure: true,
    type: "upload",
    transformation: [
      { width: 1200, height: 630, crop: "fill", gravity: "auto" },
      { fetch_format: "jpg", quality: "auto" },
    ],
  });
}

export function cloudinaryImageUrl(asset: { publicId: string; version?: number; format?: string; deliveryType?: string }, transformation = "f_auto,q_auto") {
  const { cloudinary } = cloudinaryConfig();
  return cloudinary.url(asset.publicId, {
    secure: true,
    version: asset.version,
    format: asset.format,
    type: asset.deliveryType ?? "upload",
    sign_url: asset.deliveryType === "authenticated",
    transformation: transformation.split(",").map((part) => part === "f_auto" ? { fetch_format: "auto" } : { quality: "auto" }),
  });
}

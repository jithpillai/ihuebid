type SignResponse = {
  ok: boolean;
  message?: string;
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  publicId?: string;
  signature?: string;
  maxBytes?: number;
  deliveryType?: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: { message?: string };
};

type CompleteResponse = {
  ok: boolean;
  message?: string;
  publicId?: string;
  assetId?: string;
};

// Sign -> direct-to-Cloudinary upload -> server-verified complete. Shared by
// the avatar uploader (purpose USER_AVATAR) and the listing gallery uploader
// (purpose LISTING_IMAGE, listingId required).
export async function uploadImage(
  purpose: "USER_AVATAR" | "LISTING_IMAGE",
  file: File,
  listingId?: string,
): Promise<{ secureUrl: string; publicId: string; assetId?: string }> {
  const signResponse = await fetch("/api/media/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ purpose, listingId }),
  });
  const sign = await signResponse.json() as SignResponse;
  if (!signResponse.ok || !sign.ok || !sign.cloudName || !sign.publicId || !sign.signature || !sign.apiKey) {
    throw new Error(sign.message ?? "Unable to prepare the upload.");
  }
  if (sign.maxBytes && file.size > sign.maxBytes) {
    throw new Error(`Image is too large. Max size is ${(sign.maxBytes / (1024 * 1024)).toFixed(0)}MB.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sign.apiKey);
  formData.append("timestamp", String(sign.timestamp));
  formData.append("signature", sign.signature);
  formData.append("public_id", sign.publicId);
  formData.append("overwrite", "false");
  formData.append("type", sign.deliveryType ?? "upload");

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const uploadResult = await uploadResponse.json() as CloudinaryUploadResponse;
  if (!uploadResponse.ok || !uploadResult.secure_url) {
    throw new Error(uploadResult.error?.message ?? "The image upload failed.");
  }

  const completeResponse = await fetch("/api/media/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ purpose, listingId, publicId: sign.publicId }),
  });
  const completeResult = await completeResponse.json() as CompleteResponse;
  if (!completeResponse.ok || !completeResult.ok) {
    throw new Error(completeResult.message ?? "Unable to save the image.");
  }

  return { secureUrl: uploadResult.secure_url, publicId: completeResult.publicId ?? sign.publicId, assetId: completeResult.assetId };
}

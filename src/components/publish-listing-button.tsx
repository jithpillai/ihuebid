"use client";

import { useState } from "react";

export function PublishListingButton({ listingId, publicId, handle }: { listingId: string; publicId: string; handle: string }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function publish() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/publish`, { method: "POST" });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to publish this listing.");
      window.location.assign(`/${handle}/${publicId}`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish this listing.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={publish}
        disabled={loading}
        className="w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Publishing…" : "Publish listing"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

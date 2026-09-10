"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";

import { PendingOverlay } from "@/components/pending-feedback";
import { uploadImage } from "@/lib/media-upload";

export function BannerUploader({ initialImageUrl }: { initialImageUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const result = await uploadImage("USER_BANNER", file);
      setImageUrl(result.secureUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the image.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/media/remove-banner", { method: "POST" });
      if (!response.ok) throw new Error("Unable to remove the banner.");
      setImageUrl(null);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove the banner.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="relative aspect-[1920/480] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent-soft to-surface-2">
        <PendingOverlay show={loading} label="" />
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="(min-width: 768px) 640px, 100vw" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs font-semibold text-subtle-fg">
            No banner — a soft gradient is shown
          </div>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="rounded-2xl border border-border-strong bg-surface px-4 py-2 text-sm font-bold text-body transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
        >
          {imageUrl ? "Change banner" : "Add banner"}
        </button>
        {imageUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="rounded-2xl border border-border-strong bg-surface px-4 py-2 text-sm font-bold text-muted-fg transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
          >
            Remove
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-subtle-fg">A wide image works best (roughly 1920×480).</p>
    </div>
  );
}

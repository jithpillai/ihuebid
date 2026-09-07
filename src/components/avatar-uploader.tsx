"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";

import { PendingOverlay } from "@/components/pending-feedback";
import { uploadImage } from "@/lib/media-upload";

export function AvatarUploader({ initialImageUrl }: { initialImageUrl: string | null }) {
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
      const result = await uploadImage("USER_AVATAR", file);
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
      const response = await fetch("/api/media/remove-avatar", { method: "POST" });
      if (!response.ok) throw new Error("Unable to remove the photo.");
      setImageUrl(null);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove the photo.");
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
      <div className="relative size-24 overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100">
        <PendingOverlay show={loading} label="" />
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs font-semibold text-zinc-400">No photo</div>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
        >
          {imageUrl ? "Change photo" : "Add photo"}
        </button>
        {imageUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-500 transition hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

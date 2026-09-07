"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";

import { PendingOverlay } from "@/components/pending-feedback";
import { uploadImage } from "@/lib/media-upload";

type GalleryAsset = { id: string; url: string };

export function ListingGalleryUploader({ listingId, initialAssets }: { listingId: string; initialAssets: GalleryAsset[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState(initialAssets);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setError("");
    setLoading(true);
    try {
      for (const file of files) {
        const result = await uploadImage("LISTING_IMAGE", file, listingId);
        if (result.assetId) {
          setAssets((prev) => [...prev, { id: result.assetId!, url: result.secureUrl }]);
        }
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the image.");
    } finally {
      setLoading(false);
    }
  }

  async function removeAsset(assetId: string) {
    setError("");
    const previous = assets;
    setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
    const response = await fetch(`/api/listings/${listingId}/media/${assetId}`, { method: "DELETE" });
    if (!response.ok) {
      setAssets(previous);
      setError("Unable to remove the photo.");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= assets.length) return;
    const reordered = [...assets];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setAssets(reordered);
    await fetch(`/api/listings/${listingId}/media/reorder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: reordered.map((asset) => asset.id) }),
    });
  }

  return (
    <div className="relative">
      <PendingOverlay show={loading} label="Uploading…" />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {assets.map((asset, index) => (
            <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              <Image src={asset.url} alt="" fill sizes="200px" className="object-cover" />
              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-zinc-900/80 px-2 py-0.5 text-[10px] font-bold text-white">Cover</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded bg-white/90 px-1.5 py-0.5 text-xs font-bold text-zinc-900 disabled:opacity-40">
                    ←
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === assets.length - 1} className="rounded bg-white/90 px-1.5 py-0.5 text-xs font-bold text-zinc-900 disabled:opacity-40">
                    →
                  </button>
                </div>
                <button type="button" onClick={() => removeAsset(asset.id)} className="rounded bg-white/90 px-1.5 py-0.5 text-xs font-bold text-red-600">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="mt-3 rounded-2xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-500 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60"
      >
        Add photos
      </button>
    </div>
  );
}

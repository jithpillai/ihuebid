"use client";

import { FormEvent, useState } from "react";

export function ListingEmbedForm({ listingId, initialUrl }: { listingId: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saved, setSaved] = useState(initialUrl);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to save this video.");
      setSaved(url);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save this video.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    await fetch(`/api/listings/${listingId}/embed`, { method: "DELETE" });
    setUrl("");
    setSaved(null);
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://youtube.com/watch?v=..."
        className="flex-1 rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none placeholder:text-subtle-fg focus:border-accent"
      />
      <div className="flex gap-2">
        <button disabled={loading || !url} type="submit" className="rounded-2xl bg-fg px-4 py-3 text-sm font-bold text-bg disabled:cursor-not-allowed disabled:opacity-40">
          Save
        </button>
        {saved && (
          <button type="button" onClick={remove} disabled={loading} className="rounded-2xl border border-border-strong px-4 py-3 text-sm font-bold text-muted-fg">
            Remove
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600 sm:col-span-2">{error}</p>}
    </form>
  );
}

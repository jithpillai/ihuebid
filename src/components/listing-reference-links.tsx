"use client";

import { FormEvent, useState } from "react";

type ReferenceLink = { id: string; label: string; url: string };

export function ListingReferenceLinks({ listingId, initialLinks }: { listingId: string; initialLinks: ReferenceLink[] }) {
  const [links, setLinks] = useState(initialLinks);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      let effectiveLabel = label.trim();
      if (!effectiveLabel) {
        try {
          effectiveLabel = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          effectiveLabel = url;
        }
      }
      const response = await fetch(`/api/listings/${listingId}/reference-links`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: effectiveLabel, url }),
      });
      const result = await response.json() as { ok: boolean; message?: string; link?: ReferenceLink };
      if (!response.ok || !result.ok || !result.link) throw new Error(result.message ?? "Unable to add this link.");
      setLinks((prev) => [...prev, result.link!]);
      setLabel("");
      setUrl("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add this link.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(linkId: string) {
    const previous = links;
    setLinks((prev) => prev.filter((link) => link.id !== linkId));
    const response = await fetch(`/api/listings/${listingId}/reference-links/${linkId}`, { method: "DELETE" });
    if (!response.ok) setLinks(previous);
  }

  return (
    <div>
      {links.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-fg">{link.label}</p>
                <p className="truncate text-xs text-subtle-fg">{link.url}</p>
              </div>
              <button type="button" onClick={() => remove(link.id)} className="shrink-0 text-xs font-bold text-red-600">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label (optional, e.g. Instagram)"
          className="rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-fg outline-none placeholder:text-subtle-fg focus:border-accent sm:w-1/3"
        />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
          className="flex-1 rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-fg outline-none placeholder:text-subtle-fg focus:border-accent"
        />
        <button disabled={loading || !url} type="submit" className="rounded-2xl bg-fg px-4 py-2.5 text-sm font-bold text-bg disabled:cursor-not-allowed disabled:opacity-40">
          {loading ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-subtle-fg">A label is optional — leave it blank and we&rsquo;ll use the site name.</p>
    </div>
  );
}

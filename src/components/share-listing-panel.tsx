"use client";

import Link from "next/link";
import { useState } from "react";

export function ShareListingPanel({
  listingId,
  generatedMessage,
  savedMessage,
  profileIncomplete,
}: {
  listingId: string;
  generatedMessage: string;
  savedMessage: string | null;
  profileIncomplete: boolean;
}) {
  const [message, setMessage] = useState(savedMessage ?? generatedMessage);
  const [saved, setSaved] = useState<string | null>(savedMessage);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isCustom = saved !== null;
  const dirty = message.trim() !== (saved ?? generatedMessage).trim();
  const listingChanged = isCustom && saved!.trim() !== generatedMessage.trim();

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        // dismissed or unsupported — fall through to copy
      }
    }
    await copy();
  }

  function shareToWhatsApp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function save() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/share-message`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json() as { ok: boolean; message?: string; shareMessage?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to save.");
      setSaved(result.shareMessage ?? message);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  async function resetToGenerated() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/share-message`, { method: "DELETE" });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to reset.");
      setSaved(null);
      setMessage(generatedMessage);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={13}
        className="w-full resize-y rounded-2xl border border-border-strong bg-surface px-4 py-3 text-sm leading-6 text-fg outline-none focus:border-accent"
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {isCustom
          ? <span className="font-semibold text-accent-soft-fg">Using your saved version.</span>
          : <span className="text-subtle-fg">Auto-generated from the listing. Edit and save to customise.</span>}
        {listingChanged && <span className="font-semibold text-amber-600 dark:text-amber-400">Listing changed since you saved this.</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save message"}
        </button>
        {(isCustom || dirty) && (
          <button
            type="button"
            onClick={resetToGenerated}
            disabled={busy}
            className="rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-bold text-body transition hover:border-accent hover:text-fg disabled:opacity-40"
          >
            Reset to auto
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-1 flex flex-wrap gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={share}
          className="rounded-2xl bg-fg px-4 py-2.5 text-sm font-bold text-bg transition hover:opacity-90"
        >
          Share
        </button>
        <button
          type="button"
          onClick={shareToWhatsApp}
          className="rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-bold text-body transition hover:border-accent hover:text-fg"
        >
          WhatsApp
        </button>
        <button
          type="button"
          onClick={copy}
          className="rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-bold text-body transition hover:border-accent hover:text-fg"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {profileIncomplete && (
        <p className="text-xs text-subtle-fg">
          Add your brand name and contact number in{" "}
          <Link href="/account/settings" className="font-semibold text-accent-soft-fg hover:underline">
            account settings
          </Link>{" "}
          to enrich this message.
        </p>
      )}
    </div>
  );
}

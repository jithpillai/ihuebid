"use client";

import Link from "next/link";
import { useState } from "react";

export function ShareListingPanel({
  initialMessage,
  profileIncomplete,
}: {
  initialMessage: string;
  profileIncomplete: boolean;
}) {
  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);

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
        // user dismissed the sheet, or share failed — fall through to copy
      }
    }
    await copy();
  }

  function shareToWhatsApp() {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={11}
        className="w-full resize-y rounded-2xl border border-border-strong bg-surface px-4 py-3 text-sm leading-6 text-fg outline-none focus:border-accent"
      />
      <p className="text-xs text-subtle-fg">Edit anything above, then share or copy.</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg transition hover:brightness-110"
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

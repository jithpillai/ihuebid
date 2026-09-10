"use client";

import { useState } from "react";

function ShareIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v13m0-13 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Icon button that copies `text` to the clipboard — used on cards to grab the
// WhatsApp-formatted listing message.
export function CopyButton({
  text,
  className = "",
  label = "Copy message",
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={copied ? "Copied" : label}
      className={`inline-flex size-8 items-center justify-center rounded-full border border-border bg-bg/90 text-body shadow-sm backdrop-blur transition hover:border-accent hover:text-fg ${className}`}
    >
      {copied ? <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" /> : <CopyIcon />}
    </button>
  );
}

// A single share control. Prefers the native share sheet (which surfaces
// WhatsApp on mobile); otherwise opens WhatsApp web; copy-link as the last
// resort. `text` defaults to `title`.
export function ShareButton({
  url,
  title,
  text,
  variant = "icon",
  className = "",
  label = "Share",
}: {
  url: string;
  title: string;
  text?: string;
  variant?: "icon" | "button";
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const hasBody = Boolean(text?.trim());
  // A full `text` already carries its own link; otherwise build "title + link".
  const body = hasBody ? text!.trim() : `${title}\n\n${url}`;

  async function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        // Never pass both `text` and `url` — some share targets concatenate
        // them and the link then appears twice in the message.
        await navigator.share(hasBody ? { title, text: body } : { title, url });
        return;
      } catch {
        // dismissed or unsupported payload — fall through
      }
    }

    const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(body)}`;
    const win = window.open(wa, "_blank", "noopener,noreferrer");
    if (win) return;

    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nothing else we can do */
    }
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-bold text-body transition hover:border-accent hover:text-fg ${className}`}
      >
        <ShareIcon />
        {copied ? "Link copied" : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-full border border-border bg-bg/90 text-body shadow-sm backdrop-blur transition hover:border-accent hover:text-fg ${className}`}
    >
      <ShareIcon />
    </button>
  );
}

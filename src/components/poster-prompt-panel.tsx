"use client";

import { useState } from "react";

type PosterImage = { label: string; thumbUrl: string; downloadUrl: string };

const GEMINI_URL = "https://gemini.google.com/app";

export function PosterPromptPanel({
  generatedPrompt,
  images,
}: {
  generatedPrompt: string;
  images: PosterImage[];
}) {
  const [prompt, setPrompt] = useState(generatedPrompt);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function copy() {
    setError("");
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setNotice("Prompt copied. Attach the images below, then paste it into your AI tool.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("The browser could not copy the prompt. Check clipboard permission and try again.");
    }
  }

  async function copyAndOpenGemini() {
    setError("");
    const win = window.open(GEMINI_URL, "_blank", "noopener,noreferrer");
    try {
      await navigator.clipboard.writeText(prompt);
      setNotice(
        win
          ? "Prompt copied and Gemini opened in a new tab. Attach the car photo and your logo there, then paste the prompt."
          : "Prompt copied, but the browser blocked the new tab. Open gemini.google.com and paste it there.",
      );
    } catch {
      setError("The browser could not copy the prompt. Open your AI tool and paste manually.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-fg">
        Generates a ready-to-paste prompt for an AI image tool (Gemini, ChatGPT, …). Attach the photos below,
        paste the prompt, and it draws a &ldquo;spotlight deal&rdquo; poster from your listing facts. Nothing here is
        saved — tweak the text freely before copying.
      </p>

      {images.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-subtle-fg">Attach these images</p>
          <ul className="mt-2 flex flex-wrap gap-3">
            {images.map((image) => (
              <li key={image.downloadUrl} className="w-28">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.thumbUrl} alt={image.label} className="size-full object-cover" />
                </div>
                <a
                  href={image.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-center text-xs font-semibold text-accent-soft-fg hover:underline"
                >
                  {image.label} ↓
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={16}
        className="w-full resize-y rounded-2xl border border-border-strong bg-surface px-4 py-3 font-mono text-xs leading-6 text-fg outline-none focus:border-accent"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyAndOpenGemini}
          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg transition hover:brightness-110"
        >
          Copy prompt &amp; open Gemini ↗
        </button>
        <button
          type="button"
          onClick={copy}
          className="rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-bold text-body transition hover:border-accent hover:text-fg"
        >
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>

      {notice && !error && <p aria-live="polite" className="text-xs font-semibold text-accent-soft-fg">{notice}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <p className="text-xs text-subtle-fg">
        Gemini can&rsquo;t send the poster back automatically — download the result from there and post it yourself.
      </p>
    </div>
  );
}

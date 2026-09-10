"use client";

import { FormEvent, useState } from "react";

// Light client-side check only — the server re-validates and normalizes.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function EventNotificationEmailsForm({ initialEmails }: { initialEmails: string[] }) {
  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [loading, setLoading] = useState(false);

  function addDraft() {
    const email = draft.trim().toLowerCase();
    if (!looksLikeEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (emails.includes(email)) {
      setDraft("");
      return;
    }
    setEmails((prev) => [...prev, email]);
    setDraft("");
    setError("");
    setStatus("idle");
  }

  function remove(email: string) {
    setEmails((prev) => prev.filter((entry) => entry !== email));
    setStatus("idle");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("idle");
    setLoading(true);
    try {
      const response = await fetch("/api/account/event-emails", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const result = await response.json() as { ok: boolean; message?: string; emails?: string[] };
      if (!response.ok || !result.ok || !result.emails) throw new Error(result.message ?? "Unable to save.");
      setEmails(result.emails);
      setStatus("saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      {emails.length > 0 && (
        <ul className="flex flex-col gap-2">
          {emails.map((email) => (
            <li key={email} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
              <span className="truncate text-sm font-semibold text-fg">{email}</span>
              <button type="button" onClick={() => remove(email)} className="shrink-0 text-xs font-bold text-red-600">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder="sales@yourbusiness.in"
          className="flex-1 rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-fg outline-none placeholder:text-subtle-fg focus:border-accent"
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={emails.length >= 10}
          className="rounded-2xl bg-fg px-4 py-2.5 text-sm font-bold text-bg disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      {status === "saved" && !error && <p className="text-sm font-semibold text-accent-soft-fg">Saved.</p>}

      <button
        disabled={loading}
        type="submit"
        className="rounded-2xl bg-accent px-5 py-3 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save notification emails"}
      </button>
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/account/display-name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const result = await response.json() as { ok: boolean; message?: string; displayName?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to save your name.");
      setSavedName(result.displayName ?? name);
      setName(result.displayName ?? name);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your name.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder="e.g. Gettecar"
          className="w-full rounded-2xl border border-border-strong bg-surface px-4 py-3.5 text-fg outline-none placeholder:text-subtle-fg focus:border-accent"
        />
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
        {!error && savedName && (
          <p className="mt-2 text-sm text-subtle-fg">Shows as &ldquo;{savedName}&rdquo; on your profile and listings.</p>
        )}
      </div>
      <button
        disabled={loading || name.trim() === savedName.trim() || name.trim().length < 2}
        type="submit"
        className="rounded-2xl bg-accent px-5 py-3.5 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}

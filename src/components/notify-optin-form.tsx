"use client";

import { FormEvent, useState } from "react";

import { PendingOverlay } from "@/components/pending-feedback";

export function NotifyOptInForm({ listingId, initiallyOptedIn }: { listingId: string; initiallyOptedIn: boolean }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [optedIn, setOptedIn] = useState(initiallyOptedIn);
  const [error, setError] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [loading, setLoading] = useState(false);
  // Honeypot: invisible to real visitors, a scraping bot that blindly fills
  // every input trips it.
  const [company, setCompany] = useState("");

  if (optedIn) {
    return (
      <p className="rounded-2xl bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700">
        You&rsquo;ll get an email when this listing closes.
      </p>
    );
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/notify-opt-in/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const result = await response.json() as { ok: boolean; message?: string; developmentCode?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to send a code.");
      setDevelopmentCode(result.developmentCode ?? "");
      setStep("code");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send a code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/notify-opt-in/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to verify the code.");
      setOptedIn(true);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={step === "email" ? requestCode : verifyCode} className="relative rounded-2xl border border-zinc-200 bg-white p-4">
      <PendingOverlay show={loading} label="Please wait…" />
      <input
        type="text"
        name="company"
        value={company}
        onChange={(event) => setCompany(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] size-px opacity-0"
      />
      <p className="text-sm font-semibold text-zinc-700">Notify me when this closes</p>
      {step === "email" ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
            className="flex-1 rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500"
          />
          <button disabled={loading} type="submit" className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">
            Send code
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="flex-1 rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-center text-sm font-black tracking-[.3em] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-blue-500"
          />
          <button disabled={loading} type="submit" className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">
            Verify
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      {developmentCode && step === "code" && (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
          Development code: <strong className="tracking-[.2em]">{developmentCode}</strong>
        </p>
      )}
    </form>
  );
}

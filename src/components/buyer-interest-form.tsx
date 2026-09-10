"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PendingOverlay } from "@/components/pending-feedback";
import { PriceSlider } from "@/components/price-slider";
import type { ListingStatus } from "@/generated/prisma/client";

const inputClass =
  "w-full rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-fg outline-none placeholder:text-subtle-fg focus:border-accent disabled:opacity-60";

export function BuyerInterestForm({
  listingId,
  status,
  currency,
  min,
  max,
  increment,
  initialValue,
  initialName,
  brandLabel,
  initiallyReadyToBuy,
}: {
  listingId: string;
  status: ListingStatus;
  currency: string;
  min: number;
  max: number;
  increment: number;
  initialValue: number | null;
  initialName: string | null;
  brandLabel: string;
  initiallyReadyToBuy: boolean;
}) {
  const formatValue = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 });
    return (value: number) => formatter.format(value);
  }, [currency]);

  const defaultValue = useMemo(() => {
    if (initialValue !== null) return initialValue;
    const midpoint = min + (max - min) / 2;
    return min + Math.round((midpoint - min) / increment) * increment;
  }, [initialValue, min, max, increment]);

  const router = useRouter();
  const [step, setStep] = useState<"collapsed" | "form" | "code" | "done">(
    initiallyReadyToBuy ? "done" : "collapsed",
  );
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [value, setValue] = useState(defaultValue);
  const [code, setCode] = useState("");
  const [company, setCompany] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const busy = loading || isPending;

  const sharedNotice = `Your interest to buy and contact details have been shared with ${brandLabel} & team. This can't be undone.`;

  if (step === "done") {
    return (
      <p className="rounded-2xl border border-accent-soft-fg/30 bg-accent-soft px-4 py-3 text-center text-sm font-semibold text-accent-soft-fg">
        {sharedNotice}
      </p>
    );
  }

  if (status !== "LIVE") return null;

  if (step === "collapsed") {
    return (
      <button
        type="button"
        onClick={() => setStep("form")}
        className="w-full rounded-2xl border border-accent bg-accent-soft px-5 py-3 text-sm font-black text-accent-soft-fg transition hover:brightness-105"
      >
        I am interested to Buy
      </button>
    );
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/buyer-interest/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone, company }),
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

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/buyer-interest/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone, code, value }),
      });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to verify the code.");
      setStep("done");
      startTransition(() => router.refresh());
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={step === "form" ? requestCode : verify} className="relative rounded-2xl border border-accent/40 bg-surface p-4">
      <PendingOverlay show={busy} label="Please wait…" />
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
      <p className="text-sm font-black text-fg">I am interested to Buy</p>
      <p className="mt-1 text-xs text-subtle-fg">
        Your name, email, phone, and estimate are shared with {brandLabel} &amp; team so they can contact you. This
        can&rsquo;t be undone.
      </p>

      {step === "form" ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={120}
            placeholder="Your name"
            disabled={busy}
            className={inputClass}
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
            disabled={busy}
            className={inputClass}
          />
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            maxLength={24}
            placeholder="Phone number"
            disabled={busy}
            className={inputClass}
          />

          <div className="mt-2 flex flex-col items-center">
            <p className="text-xs font-semibold text-muted-fg">Your estimate</p>
            <div className="mt-3">
              <PriceSlider value={value} range={{ min, max, step: increment }} onChange={setValue} formatValue={formatValue} disabled={busy} />
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold text-subtle-fg" style={{ width: 240 }}>
              <span>{formatValue(min)}</span>
              <span>{formatValue(max)}</span>
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setStep("collapsed")}
              disabled={busy}
              className="rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-bold text-body disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-2xl bg-accent px-4 py-2.5 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Sending…" : "Verify email & submit"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            disabled={busy}
            className="flex-1 rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-center text-sm font-black tracking-[.3em] text-fg outline-none placeholder:text-subtle-fg focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Confirm"}
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      {developmentCode && step === "code" && (
        <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
          Development code: <strong className="tracking-[.2em]">{developmentCode}</strong>
        </p>
      )}
    </form>
  );
}

import Link from "next/link";

import { AggregateResult } from "@/components/aggregate-result";
import { ListingCard } from "@/components/listing-card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, icons } from "@/components/ui/empty-state";
import type { AggregateResultData } from "@/server/listings/aggregation";
import { getCurrentSession } from "@/server/auth/session";
import { listRecentPublicListings } from "@/server/listings/listing-service";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

// Static sample used only as the hero visual — never persisted, never a real listing.
const SAMPLE_AGGREGATE: AggregateResultData = {
  count: 34,
  consensus: 815000,
  band: [760000, 890000],
  confidence: "HIGH",
  comparison: { tier: "GREEN", label: "The owner's expectation lines up with the crowd." },
  distribution: [
    { rangeLow: 600000, rangeHigh: 680000, count: 2 },
    { rangeLow: 680000, rangeHigh: 760000, count: 6 },
    { rangeLow: 760000, rangeHigh: 840000, count: 13 },
    { rangeLow: 840000, rangeHigh: 920000, count: 9 },
    { rangeLow: 920000, rangeHigh: 1000000, count: 4 },
  ],
};

const STEPS = [
  {
    icon: icons.tag,
    title: "Publish a listing",
    body: "Add photos, a video, the details that matter, and a price range. Share one link — it looks right the moment it opens in WhatsApp.",
  },
  {
    icon: icons.spark,
    title: "Your audience prices it",
    body: "Anyone with the link says what they think it's worth. Anonymous by design — no account, no name, no anchoring on the asking price.",
  },
  {
    icon: icons.chart,
    title: "Get a defensible range",
    body: "Responses aggregate into a consensus, a likely band, and a confidence level — a median that shrugs off lowballs and outliers.",
  },
];

const PRINCIPLES = [
  { title: "Anonymous by default", body: "Participants never need an account. Their identity is an opaque browser token that can't be turned into platform access." },
  { title: "Outlier-resistant", body: "Consensus is the median and the band is the interquartile range, so a handful of extreme guesses can't move the number." },
  { title: "Honest about confidence", body: "Few responses means low confidence, and the page says so. The signal is only as strong as the sample behind it." },
  { title: "Share-first", body: "Clean public URLs (no internal IDs), rich link previews, and a page built to be opened from a chat thread." },
];

export default async function HomePage() {
  const session = await getCurrentSession();
  const listings = await listRecentPublicListings(6);
  const primaryHref = session ? "/dashboard/listings/new" : "/login";
  const primaryLabel = session ? "Create a listing" : "Get started";

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(60%_50%_at_15%_0%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent),radial-gradient(50%_40%_at_100%_20%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent)]"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-accent-soft-fg">
              <span className="size-1.5 rounded-full bg-accent" />
              Market-value discovery
            </p>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl lg:text-6xl">
              Turn your audience into a <span className="text-accent">market signal</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-fg sm:text-lg">
              Share an item, collect price opinions or offers anonymously, and
              understand its defensible fair-value range — the consensus, the
              likely band, and how much to trust it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={primaryHref} className={buttonClasses({ size: "lg" })}>
                {primaryLabel}
              </Link>
              <Link href="/#how-it-works" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-accent/10 blur-2xl" aria-hidden="true" />
            <div className="rounded-[1.75rem] border border-border bg-surface/80 p-3 shadow-xl shadow-black/5 backdrop-blur dark:shadow-black/40">
              <div className="mb-2 flex items-center gap-2 px-2 pt-1 text-xs font-semibold text-subtle-fg">
                <span className="size-2 rounded-full bg-subtle-fg/50" />
                Sample listing · 2021 SUV, automatic
              </div>
              <AggregateResult data={SAMPLE_AGGREGATE} currency="INR" title="Market signal" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <h2 className="text-2xl font-black tracking-tight text-fg sm:text-3xl">How it works</h2>
        <p className="mt-2 max-w-2xl text-muted-fg">Three steps from &ldquo;what&rsquo;s this worth?&rdquo; to an answer you can stand behind.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-3xl border border-border bg-surface p-6">
              <div className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-soft-fg">{step.icon}</div>
              <p className="mt-4 text-xs font-black uppercase tracking-wide text-subtle-fg">Step {index + 1}</p>
              <p className="mt-1 text-lg font-black text-fg">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-fg">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live now */}
      <section id="live" className="border-y border-border bg-surface/50">
        <div className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-fg sm:text-3xl">Live right now</h2>
              <p className="mt-2 text-muted-fg">Listings currently collecting valuations from their audience.</p>
            </div>
            <Link href={primaryHref} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              {primaryLabel}
            </Link>
          </div>

          {listings.length === 0 ? (
            <EmptyState
              className="mt-10"
              icon={icons.tag}
              title="Nothing live yet"
              body="Be the first — publish a listing and share the link to start collecting a market signal."
              action={
                <Link href={primaryHref} className={buttonClasses()}>
                  {primaryLabel}
                </Link>
              }
            />
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const cover = listing.mediaAssets[0];
                const handle = listing.creator.profile?.handle;
                return (
                  <ListingCard
                    key={listing.id}
                    href={handle ? `/${handle}/${listing.publicId}` : "#"}
                    title={listing.title}
                    coverUrl={cover ? cloudinaryImageUrl({ publicId: cover.publicId }) : null}
                    status={listing.status}
                    meta={[listing.creator.displayName, listing.locationText].filter(Boolean).join(" · ")}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <h2 className="text-2xl font-black tracking-tight text-fg sm:text-3xl">Built to be trusted</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title} className="rounded-3xl border border-border bg-surface p-6">
              <p className="text-base font-black text-fg">{principle.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-fg">{principle.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface px-6 py-14 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-80 [background:radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]"
          />
          <h2 className="text-2xl font-black tracking-tight text-fg sm:text-3xl">
            What&rsquo;s your listing worth?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-fg">
            Find out in an afternoon. Publish one, share the link, and watch the
            consensus form.
          </p>
          <div className="mt-7">
            <Link href={primaryHref} className={buttonClasses({ size: "lg" })}>
              {primaryLabel}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

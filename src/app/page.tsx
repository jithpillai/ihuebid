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
    title: "Publish in minutes",
    body: "Photos, a video, the details that matter, and a price range. AI drafts the description and suggests a range from the vehicle facts. You share one link — it looks right the moment it opens in WhatsApp.",
  },
  {
    icon: icons.spark,
    title: "The crowd prices it — anonymously",
    body: "Anyone with the link says what they'd genuinely pay. No account, no name, no anchoring on your asking price. Anyone serious taps “I'm interested to buy” and leaves a verified name, email and phone.",
  },
  {
    icon: icons.chart,
    title: "Act on the signal",
    body: "A consensus price, a likely band, and a confidence level built on a median that shrugs off lowballs — plus a running list of interested buyers and their numbers, ready for your team to call.",
  },
];

const FEATURES = [
  {
    icon: icons.chart,
    title: "A price you can defend",
    body: "Consensus is the median; the band is the interquartile range. A handful of extreme guesses can’t move the number, and low sample size shows as low confidence.",
  },
  {
    icon: icons.hand,
    title: "Real buyers, not just opinions",
    body: "“I’m interested to buy” captures a verified name, email and phone and shares it with you the moment it’s submitted — it can’t be taken back.",
  },
  {
    icon: icons.users,
    title: "Your whole team sees the leads",
    body: "Add up to two collaborators to co-run your listings, plus notification emails, so every interested buyer lands with the right people.",
  },
  {
    icon: icons.bolt,
    title: "AI does the typing",
    body: "Gemini drafts a fact-based description, a few genuine highlights, and a starting price range from the details you enter — you edit and publish.",
  },
  {
    icon: icons.send,
    title: "Built for sharing",
    body: "Clean URLs with no internal IDs, rich link previews, and an editable WhatsApp message that’s ready to paste into any chat.",
  },
  {
    icon: icons.check,
    title: "Close the loop",
    body: "Mark it sold or not, set the final price, and everyone who asked to be notified hears how it ended.",
  },
];

const PRINCIPLES = [
  { title: "Anonymous by default", body: "Participants never need an account. Their identity is an opaque browser token that can't be turned into platform access." },
  { title: "Outlier-resistant", body: "Consensus is the median and the band is the interquartile range, so a handful of extreme guesses can't move the number." },
  { title: "Honest about confidence", body: "Few responses means low confidence, and the page says so. The signal is only as strong as the sample behind it." },
  { title: "Your contacts stay yours", body: "Buyer details go only to you and the team you name — never shown publicly, never sold, never shared with other listings." },
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
              Price discovery &amp; offer collection
            </p>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl lg:text-6xl">
              Price it with the crowd. <span className="text-accent">Find your buyer.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-fg sm:text-lg">
              Publish once. Your audience says what it&rsquo;s worth &mdash; anonymously &mdash;
              and the people who actually want it raise their hand, with a verified name
              and number that goes straight to you.
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
        <p className="mt-2 max-w-2xl text-muted-fg">Three steps from &ldquo;what&rsquo;s this worth?&rdquo; to a price you can stand behind and a buyer to call.</p>
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

      {/* Why use it */}
      <section id="why" className="border-y border-border bg-surface/50">
        <div className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-2xl font-black tracking-tight text-fg sm:text-3xl">Why sellers use it</h2>
          <p className="mt-2 max-w-2xl text-muted-fg">One link does the price research and the lead capture at the same time.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-3xl border border-border bg-surface p-6">
                <div className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-soft-fg">{feature.icon}</div>
                <p className="mt-4 text-lg font-black text-fg">{feature.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-fg">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live now */}
      <section id="live" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
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
              const listingHref = handle ? `/${handle}/${listing.publicId}` : "#";
              return (
                <ListingCard
                  key={listing.id}
                  href={listingHref}
                  title={listing.title}
                  coverUrl={cover ? cloudinaryImageUrl({ publicId: cover.publicId }) : null}
                  status={listing.status}
                  shareUrl={handle ? `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${listingHref}` : undefined}
                  shareTitle={listing.title}
                  meta={[listing.creator.displayName, listing.locationText].filter(Boolean).join(" · ")}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Principles */}
      <section className="border-t border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-2xl font-black tracking-tight text-fg sm:text-3xl">Built to be trusted</h2>
          <p className="mt-2 max-w-2xl text-muted-fg">The number is only useful if it&rsquo;s honest &mdash; and your contacts only useful if they stay yours.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="rounded-3xl border border-border bg-surface p-6">
                <p className="text-base font-black text-fg">{principle.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-fg">{principle.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface px-6 py-14 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-80 [background:radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]"
          />
          <h2 className="text-2xl font-black tracking-tight text-fg sm:text-3xl">
            See what it&rsquo;s worth &mdash; and who wants it.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-fg">
            Publish one listing, share one link, and let the consensus form while the
            interested buyers stack up.
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

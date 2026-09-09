import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InterestedConfirmForm } from "@/components/interested-confirm-form";
import { getOptInByInterestToken } from "@/server/listings/interest-service";

export const metadata: Metadata = { title: "Still interested?", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function InterestedPage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) notFound();

  const optIn = await getOptInByInterestToken(token);
  if (!optIn) notFound();

  return (
    <section className="mx-auto max-w-md px-5 py-20 lg:px-8">
      <div className="rounded-3xl border border-border bg-surface p-8 text-center shadow-sm shadow-black/5 dark:shadow-black/30">
      <h1 className="text-2xl font-black tracking-tight text-fg">{optIn.listing.title}</h1>
      <p className="mt-2 text-sm text-muted-fg">This listing from {optIn.listing.creator.displayName} has closed.</p>
      {optIn.stillInterestedAt ? (
        <p className="mt-8 rounded-2xl border border-accent-soft-fg/30 bg-accent-soft px-5 py-4 text-sm font-semibold text-accent-soft-fg">
          Thanks — we&rsquo;ve let {optIn.listing.creator.displayName} know you&rsquo;re still interested.
        </p>
      ) : (
        <InterestedConfirmForm token={token} creatorDisplayName={optIn.listing.creator.displayName} />
      )}
      </div>
    </section>
  );
}

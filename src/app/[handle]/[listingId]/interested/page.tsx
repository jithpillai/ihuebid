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
    <section className="mx-auto max-w-md px-5 py-16 text-center lg:px-8">
      <h1 className="text-2xl font-black tracking-tight text-zinc-900">{optIn.listing.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">This listing from {optIn.listing.creator.displayName} has closed.</p>
      {optIn.stillInterestedAt ? (
        <p className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700">
          Thanks — we&rsquo;ve let {optIn.listing.creator.displayName} know you&rsquo;re still interested.
        </p>
      ) : (
        <InterestedConfirmForm token={token} creatorDisplayName={optIn.listing.creator.displayName} />
      )}
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/session";
import { listListingsForCreator } from "@/server/listings/listing-service";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?returnTo=/dashboard");

  const listings = await listListingsForCreator(session.userId);

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">Your listings</h1>
        <Link href="/dashboard/listings/new" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-500">
          New listing
        </Link>
      </div>

      {!session.user.profile?.handle && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Set your public handle in <Link href="/account/settings" className="font-bold underline">account settings</Link> before creating a listing.
        </p>
      )}

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-400">No listings yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link
                href={`/dashboard/listings/${listing.id}/edit`}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
              >
                <span className="font-bold text-zinc-900">{listing.title}</span>
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">{listing.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

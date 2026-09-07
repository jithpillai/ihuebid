import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateListingForm } from "@/components/create-listing-form";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "New listing", robots: { index: false, follow: false } };

export default async function NewListingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?returnTo=/dashboard/listings/new");
  if (!session.user.profile?.handle) redirect("/account/settings");

  return (
    <section className="mx-auto max-w-2xl px-5 py-16 lg:px-8">
      <Link href="/dashboard" className="text-sm font-semibold text-zinc-400 hover:text-zinc-600">
        ← Your listings
      </Link>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Used Vehicle listing</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        This is saved as a draft — you&rsquo;ll add photos and publish on the next screen.
      </p>
      <CreateListingForm />
    </section>
  );
}

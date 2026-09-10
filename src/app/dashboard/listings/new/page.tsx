import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ListingForm } from "@/components/listing-form";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "New listing", robots: { index: false, follow: false } };

export default async function NewListingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?returnTo=/dashboard/listings/new");
  if (!session.user.profile?.handle) redirect("/account/settings");

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="text-sm font-semibold text-subtle-fg hover:text-muted-fg">
        ← Your listings
      </Link>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-fg">Used Vehicle listing</h1>
      <p className="mt-2 text-sm leading-6 text-muted-fg">
        This is saved as a draft — you&rsquo;ll add photos and publish on the next screen.
      </p>
      <div className="mt-8">
        <ListingForm mode="create" />
      </div>
    </section>
  );
}

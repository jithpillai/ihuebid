import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { EmailLogin } from "@/components/email-login";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ returnTo?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const returnTo = query.returnTo?.startsWith("/") && !query.returnTo.startsWith("//") ? query.returnTo : "/";
  if (await getCurrentSession()) redirect(returnTo);
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-12 px-5 py-16 md:grid-cols-2 lg:px-8">
        <div>
          <Image src="/brand/logo.png" alt="ihue Bid" width={2172} height={724} priority className="h-20 w-auto" />
          <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-blue-600">Turn your audience into a market signal</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-.05em] text-zinc-900">
            Share an item.<br /><span className="text-blue-600">Know its worth.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-zinc-500">
            Publish a listing, collect price opinions from your audience, and get a defensible fair-value range — sign in to get started.
          </p>
        </div>
        <EmailLogin returnTo={returnTo} googleError={query.error} />
      </div>
    </section>
  );
}

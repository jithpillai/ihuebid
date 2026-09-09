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
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_15%_10%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]"
      />
      <div className="mx-auto grid min-h-[76vh] max-w-5xl items-center gap-12 px-5 py-16 md:grid-cols-2 lg:px-8">
        <div>
          <Image src="/brand/logo.png" alt="ihue Bid" width={2172} height={724} priority className="h-16 w-auto dark:brightness-0 dark:invert" />
          <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-accent-soft-fg">Turn your audience into a market signal</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-.05em] text-fg">
            Share an item.<br /><span className="text-accent-soft-fg">Know its worth.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-muted-fg">
            Publish a listing, collect price opinions from your audience, and get a defensible fair-value range — sign in to get started.
          </p>
        </div>
        <EmailLogin returnTo={returnTo} googleError={query.error} />
      </div>
    </section>
  );
}

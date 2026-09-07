import Link from "next/link";

import { getCurrentSession } from "@/server/auth/session";

export default async function HomePage() {
  const session = await getCurrentSession();
  return (
    <section className="mx-auto max-w-3xl px-5 py-24 text-center lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Market-value discovery</p>
      <h1 className="mt-4 text-5xl font-black tracking-[-.05em] text-zinc-900">
        Turn your audience into a <span className="text-blue-600">market signal</span>.
      </h1>
      <p className="mt-6 text-base leading-8 text-zinc-500">
        Share an item, collect price opinions or offers, and understand its defensible fair-value range.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        {session ? (
          <Link href="/dashboard/listings/new" className="rounded-full bg-blue-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-blue-500">
            Create a listing
          </Link>
        ) : (
          <Link href="/login" className="rounded-full bg-blue-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-blue-500">
            Get started
          </Link>
        )}
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";

import { ProfileMenu } from "@/components/profile-menu";
import { getCurrentSession } from "@/server/auth/session";

export async function SiteHeader() {
  const session = await getCurrentSession();
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image src="/brand/logo.png" alt="ihue Bid" width={2172} height={724} priority className="h-14 w-auto" />
        </Link>
        <nav className="flex items-center gap-5">
          {session ? (
            <>
              <Link
                href="/dashboard/listings/new"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-700 hover:shadow-md"
              >
                New listing
              </Link>
              <ProfileMenu displayName={session.user.displayName} />
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-500">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

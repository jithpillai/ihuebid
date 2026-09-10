import Image from "next/image";
import Link from "next/link";

import { CardNavOverlay } from "@/components/pending-link";
import { CopyButton, ShareButton } from "@/components/share-button";
import { StatusPill } from "@/components/ui/pill";

export function ListingCard({
  href,
  title,
  coverUrl,
  status,
  responseCount,
  meta,
  priceLabel,
  shareUrl,
  shareTitle,
  copyText,
}: {
  href: string;
  title: string;
  coverUrl: string | null;
  status: string;
  responseCount?: number;
  meta?: string;
  priceLabel?: string;
  shareUrl?: string;
  shareTitle?: string;
  copyText?: string;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-sm shadow-black/[0.03] transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md dark:shadow-black/20">
      {/* Whole-card click target — a sibling, not a wrapper, so the share
          button below can be a real <button> without nesting it inside <a>. */}
      <Link href={href} aria-label={title} className="absolute inset-0 z-0">
        <CardNavOverlay />
      </Link>

      <div className="pointer-events-none flex flex-1 flex-col">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid size-full place-items-center text-subtle-fg">
              <svg viewBox="0 0 24 24" fill="none" className="size-9" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="m4 16 4-4 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="9" r="1.5" fill="currentColor" />
              </svg>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <StatusPill status={status} />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="line-clamp-2 font-bold text-fg">{title}</p>
          {meta && <p className="mt-1 truncate text-xs font-semibold text-subtle-fg">{meta}</p>}
          <div className="mt-3 flex items-center gap-3 pt-1 text-xs font-semibold text-muted-fg">
            {priceLabel && <span className="tnum text-fg">{priceLabel}</span>}
            {typeof responseCount === "number" && (
              <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden="true">
                  <path d="M4 20V10m6 10V4m6 16v-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                {responseCount} {responseCount === 1 ? "response" : "responses"}
              </span>
            )}
          </div>
        </div>
      </div>

      {(shareUrl || copyText) && (
        <div className="pointer-events-auto absolute right-3 top-3 z-10 flex gap-1.5">
          {copyText && <CopyButton text={copyText} />}
          {shareUrl && <ShareButton variant="icon" url={shareUrl} title={shareTitle ?? title} />}
        </div>
      )}
    </div>
  );
}

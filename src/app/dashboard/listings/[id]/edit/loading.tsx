import { LoadingBanner, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <LoadingBanner />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-2 h-9 w-2/3" />
      <Skeleton className="mt-8 h-40 w-full rounded-3xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="mt-6 h-44 w-full rounded-3xl" />
      ))}
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-9 w-2/3" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="min-w-0">
          <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-11/12" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-6 h-40 w-full rounded-3xl" />
        </div>
        <div className="lg:sticky lg:top-24">
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="mt-4 h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="mt-6 h-40 w-full rounded-3xl" />
      ))}
    </div>
  );
}

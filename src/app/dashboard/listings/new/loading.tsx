import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-2 h-9 w-64" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <Skeleton className="mt-8 h-[32rem] w-full rounded-3xl" />
    </div>
  );
}

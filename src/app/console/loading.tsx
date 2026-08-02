import { Skeleton } from "@/components/ui/skeleton";

export default function ConsoleLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 w-full">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Metric tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-xl border p-6">
        <Skeleton className="h-5 w-36 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

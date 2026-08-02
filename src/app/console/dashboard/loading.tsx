import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Greeting */}
      <Skeleton className="h-8 w-64" />

      {/* Balance + metrics grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        {/* Balance card */}
        <div className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-28" />
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>
        </div>

        {/* Metric tiles */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

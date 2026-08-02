import { Skeleton } from "@/components/ui/skeleton";

export default function UsageLoading() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <div className="grid grid-cols-8 gap-4 p-4 border-b">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-4 p-4 border-b last:border-0">
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

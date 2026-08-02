import { Skeleton } from "@/components/ui/skeleton";

export default function ApiKeysLoading() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Base URLs card */}
      <div className="rounded-xl border p-6 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <div className="p-4 border-b">
          <Skeleton className="h-9 w-64" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border-b last:border-0 flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

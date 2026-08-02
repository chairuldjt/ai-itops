import { Skeleton } from "@/components/ui/skeleton";

export default function ModelsLoading() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Model cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

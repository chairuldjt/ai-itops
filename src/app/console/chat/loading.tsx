import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Config + Chat layout */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Config panel */}
        <div className="rounded-xl border p-4 space-y-4">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div className="rounded-xl border flex flex-col min-h-[400px]">
          <div className="flex-1 p-4 space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-16 w-3/4" />
            </div>
            <div className="flex gap-3 justify-end">
              <Skeleton className="h-10 w-1/2" />
            </div>
          </div>
          <div className="p-4 border-t">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

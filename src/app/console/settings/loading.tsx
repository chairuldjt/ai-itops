import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Profile card */}
      <div className="rounded-xl border p-6 space-y-6">
        <Skeleton className="h-5 w-16" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

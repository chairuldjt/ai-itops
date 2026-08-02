import { Skeleton } from "@/components/ui/skeleton";

export default function BalanceLoading() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Balance cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      {/* Voucher + Settings */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="rounded-xl border p-6 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

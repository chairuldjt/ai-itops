import { FileXIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
        {icon ?? <FileXIcon className="size-7" />}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

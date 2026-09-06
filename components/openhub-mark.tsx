import { cn } from "@/lib/utils";

export function OpenHubMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex h-7 w-7 items-center justify-center rounded-[9px] bg-foreground text-background shadow-sm">
        <span className="h-2.5 w-2.5 rounded-[3px] border-2 border-background" />
        <span className="absolute bottom-[5px] right-[5px] h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      {!compact ? (
        <span className="text-base font-semibold tracking-[-0.035em]">
          OpenHub
        </span>
      ) : null}
    </span>
  );
}

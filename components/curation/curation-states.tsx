import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight, LoaderCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";

export function CurationLoading({ label = "Loading your trail…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-black/[0.08] p-5 text-sm text-muted-foreground dark:border-white/[0.08]"
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-[#b45e3c] dark:text-[#e99970]" />
      {label}
    </div>
  );
}

export function CurationEmptyState({
  icon: Icon,
  eyebrow,
  title,
  body,
  action,
  actionHref,
  secondaryAction,
  secondaryHref,
  className,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  action?: string;
  actionHref?: string;
  secondaryAction?: string;
  secondaryHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.6rem] border border-dashed border-black/[0.14] bg-[#f7f7f4] p-6 dark:border-white/[0.14] dark:bg-[#111310] sm:p-8",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e9e6dc] dark:bg-[#20251f]">
        <Icon className="h-5 w-5 text-[#9b4d31] dark:text-[#e99970]" />
      </div>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{body}</p>
      {action && actionHref ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-full">
            <Link href={actionHref}>
              {action} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          {secondaryAction && secondaryHref ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href={secondaryHref}>{secondaryAction}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CurationStatus({
  tone = "neutral",
  title,
  body,
}: {
  tone?: "neutral" | "accent";
  title: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "accent"
          ? "border-[#b45e3c]/25 bg-[#b45e3c]/[0.06]"
          : "border-black/[0.08] dark:border-white/[0.08]",
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

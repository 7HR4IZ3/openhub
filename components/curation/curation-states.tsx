import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowTopRightIcon as ArrowUpRight } from "@radix-ui/react-icons";
import type { AppIcon } from "@/components/ui/icon";
import Link from "next/link";

export function CurationLoading({
  label = "Loading your trail…",
}: {
  label?: string;
}) {
  return (
    <div role="status" className="rounded-lg border p-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
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
  icon: AppIcon;
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
        "rounded-xl border border-border bg-card p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary dark:bg-secondary">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 max-w-xl text-xl font-semibold tracking-[-0.04em]">
        {title}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-5 text-muted-foreground">
        {body}
      </p>
      {action && actionHref ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="rounded-md">
            <Link href={actionHref}>
              {action} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          {secondaryAction && secondaryHref ? (
            <Button asChild variant="outline" className="rounded-md">
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
        "rounded-xl border p-4",
        tone === "accent"
          ? "border-ring bg-accent"
          : "border-border border-border",
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

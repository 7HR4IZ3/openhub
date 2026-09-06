"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowTopRightIcon as ArrowUpRight,
  GlobeIcon as Compass,
  Cross2Icon as X,
} from "@radix-ui/react-icons";
import Link from "next/link";

type Recommendation = {
  evidence: {
    repositoryId: Id<"repositories">;
    fullName: string;
    owner: string;
    language: string | null;
    topics: string[];
    stars: number;
    license: string | null;
  };
  score: number;
  explanations: string[];
};

export function RecommendationsPanel({
  convexConfigured,
}: {
  convexConfigured: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  if (!convexConfigured || !isAuthenticated) return null;
  return <ConnectedRecommendations />;
}

function ConnectedRecommendations() {
  const recommendations = useQuery(api.discovery.recommendations, {
    limit: 12,
  }) as Recommendation[] | undefined;
  const dismiss = useMutation(api.discovery.setDismissed);

  if (recommendations === undefined)
    return <CurationLoading label="Finding a few projects worth opening…" />;
  if (recommendations.length === 0)
    return (
      <CurationEmptyState
        icon={Compass}
        eyebrow="Discovery signals"
        title="Your recommendation trail is warming up."
        body="Open public repositories and add interests to your profile. OpenHub will use explainable, diverse signals—not paid placement—to choose the next projects."
        action="Explore repositories"
        actionHref="/explore"
      />
    );

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-end justify-between gap-4 border-b border-border p-5 sm:p-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
            Explainable discovery
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">
            Projects worth opening
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Metadata signals, not a quality verdict
        </span>
      </div>
      <div className="divide-y divide-black/[0.08] dark:divide-white/[0.08]">
        {recommendations.map((item) => (
          <RecommendationCard
            key={item.evidence.repositoryId}
            item={item}
            onDismiss={() =>
              void dismiss({
                repositoryId: item.evidence.repositoryId as Id<"repositories">,
                dismissed: true,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  item,
  onDismiss,
}: {
  item: Recommendation;
  onDismiss: () => void;
}) {
  const [owner, name] = item.evidence.fullName.split("/");
  return (
    <article className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-muted-foreground">
            {item.evidence.fullName}
          </p>
          <Link
            href={`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`}
            className="mt-2 inline-flex items-center gap-1 text-lg font-semibold tracking-[-0.025em] hover:underline"
          >
            Open repository <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
          onClick={onDismiss}
          aria-label={`Dismiss ${item.evidence.fullName}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-secondary px-2.5 py-1.5 dark:bg-secondary">
          Score {item.score.toFixed(1)}
        </span>
        {item.evidence.language ? (
          <span className="rounded-full border border-border px-2.5 py-1.5">
            {item.evidence.language}
          </span>
        ) : null}
        <span className="rounded-full border border-border px-2.5 py-1.5">
          {formatCount(item.evidence.stars)} stars
        </span>
        {item.evidence.license ? (
          <span className="rounded-full border border-border px-2.5 py-1.5">
            {item.evidence.license}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {item.explanations[0]}
      </p>
    </article>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

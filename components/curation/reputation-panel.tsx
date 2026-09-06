"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CurationLoading } from "@/components/curation/curation-states";
import { useAction, useQuery } from "convex/react";
import {
  BadgeIcon as Award,
  GitHubLogoIcon as Github,
  ReloadIcon as RefreshCw,
  MagicWandIcon as Sparkles,
} from "@radix-ui/react-icons";
import { useState } from "react";

type Reputation = {
  score: number;
  sourcePosts: number;
  reviewPosts: number;
  technicalComments: number;
  publicLists: number;
  communitiesBuilt: number;
  githubSnapshot: {
    publicContributionCount: number;
    observedAt: number;
  } | null;
  githubContributionStatus: "sampled" | "not_synced";
  maintainerEndorsementCount: number;
  badges: Array<{ kind: string; label: string; description: string }>;
};

export function ReputationPanel({
  userId,
  canRefresh = false,
}: {
  userId: Id<"users">;
  canRefresh?: boolean;
}) {
  const reputation = useQuery(api.reputation.byUser, { userId }) as
    | Reputation
    | null
    | undefined;
  const refresh = useAction(api.reputation.refreshGitHub);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (reputation === undefined)
    return <CurationLoading label="Calculating trust signals…" />;
  if (reputation === null) return null;

  async function refreshContributions() {
    setRefreshing(true);
    setNotice(null);
    try {
      await refresh({});
      setNotice("Public GitHub activity refreshed.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "GitHub activity could not be refreshed",
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section
      className="border-b border-border p-5 sm:p-7"
      aria-labelledby="reputation-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Trust, slowly earned
          </p>
          <h2
            id="reputation-heading"
            className="mt-2 text-xl font-semibold tracking-[-0.035em]"
          >
            Reputation and achievements
          </h2>
        </div>
        {canRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md bg-transparent"
            onClick={() => void refreshContributions()}
            disabled={refreshing}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {refreshing ? "Refreshing…" : "Refresh GitHub signal"}
          </Button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Signal label="OpenHub score" value={String(reputation.score)} />
        <Signal label="Source posts" value={String(reputation.sourcePosts)} />
        <Signal
          label="Technical replies"
          value={String(reputation.technicalComments)}
        />
        <Signal label="Public lists" value={String(reputation.publicLists)} />
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Github className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
          <div>
            <p className="text-sm font-semibold">GitHub contribution signal</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {reputation.githubSnapshot
                ? `${reputation.githubSnapshot.publicContributionCount} public events sampled from GitHub.`
                : "Not synced yet. Only public activity is sampled; private contributions are never exposed."}
            </p>
          </div>
        </div>
        {reputation.maintainerEndorsementCount > 0 ? (
          <span className="text-xs text-muted-foreground">
            {reputation.maintainerEndorsementCount} maintainer endorsements
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Maintainer endorsements pending verified authorization
          </span>
        )}
      </div>
      {reputation.badges.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {reputation.badges.map((badge) => (
            <span
              key={badge.kind}
              title={badge.description}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold dark:bg-secondary"
            >
              <Award className="h-3.5 w-3.5 text-foreground" />
              {badge.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Badges appear after verifiable source discussions, curation, and
          community work.
        </p>
      )}
      {notice ? (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          {notice}
        </p>
      ) : null}
    </section>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CurationLoading, CurationStatus } from "@/components/curation/curation-states";
import type { NormalizedRepository } from "@/lib/providers/types";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

export function RepositorySignalSummary({ repository }: { repository: NormalizedRepository }) {
  const { isAuthenticated } = useConvexAuth();
  const cached = useQuery(api.repositories.byProviderRepository, {
    provider: repository.provider,
    providerRepositoryId: repository.providerRepositoryId,
  });
  const signal = useQuery(
    api.discovery.signalsForRepository,
    cached ? { repositoryId: cached._id } : "skip",
  );
  const endorsements = useQuery(
    api.discovery.endorsementsForRepository,
    cached ? { repositoryId: cached._id as Id<"repositories"> } : "skip",
  );
  const refresh = useAction(api.discovery.refreshRepositorySignals);
  const endorse = useAction(api.discovery.endorseRepository);
  const [refreshing, setRefreshing] = useState(false);
  const [endorsing, setEndorsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshSignal() {
    if (!cached || !isAuthenticated) return;
    setError(null);
    setRefreshing(true);
    try {
      await refresh({ repositoryId: cached._id as Id<"repositories"> });
    } catch {
      setError("The public signal could not be refreshed yet.");
    } finally {
      setRefreshing(false);
    }
  }

  async function endorseOwnership() {
    if (!cached || !isAuthenticated) return;
    setError(null);
    setEndorsing(true);
    try {
      await endorse({ repositoryId: cached._id as Id<"repositories"> });
    } catch (endorsementError) {
      setError(endorsementError instanceof Error ? endorsementError.message : "Maintainer verification could not be completed.");
    } finally {
      setEndorsing(false);
    }
  }

  if (cached === undefined || (cached && signal === undefined)) {
    return <CurationLoading label="Loading discovery signals..." />;
  }

  if (!cached) {
    return <CurationStatus title="Discovery signals are opt-in" body="Follow or save this public repository to let OpenHub observe bounded metadata for recommendations. No repository data is copied into a public signal until that server-side sync occurs." />;
  }

  if (!signal) {
    return (
      <CurationStatus
        title="No fresh signal yet"
        body={isAuthenticated ? "Refresh the public metadata snapshot when you want this repository considered for organic discovery." : "A fresh public metadata snapshot is not available yet. Sign in to refresh it."}
      />
    );
  }

  return (
    <section className="rounded-2xl border border-black/[0.1] bg-[#f2f0e9] p-5 dark:border-white/[0.1] dark:bg-[#20251f]" aria-labelledby="repository-signal-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]"><Sparkles className="h-3.5 w-3.5" /> Discovery signal</p>
          <h2 id="repository-signal-heading" className="mt-2 text-lg font-semibold tracking-[-0.025em]">{signal.score.toFixed(1)} organic context score</h2>
        </div>
        {isAuthenticated ? <div className="flex flex-wrap justify-end gap-2"><button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.12] px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-[#b45e3c]/60 hover:text-foreground disabled:opacity-50 dark:border-white/[0.12] dark:hover:border-[#e99970]/60" onClick={() => void refreshSignal()} disabled={refreshing || endorsing}><RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />{refreshing ? "Refreshing..." : "Refresh"}</button><button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.12] px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-[#b45e3c]/60 hover:text-foreground disabled:opacity-50 dark:border-white/[0.12] dark:hover:border-[#e99970]/60" onClick={() => void endorseOwnership()} disabled={refreshing || endorsing}>{endorsing ? "Verifying..." : "Verify ownership"}</button></div> : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {signal.explanations.slice(0, 4).map((explanation) => <p key={explanation} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#66856c]" />{explanation}</p>)}
      </div>
      {endorsements && endorsements.length > 0 ? <div className="mt-5 border-t border-black/[0.08] pt-4 dark:border-white/[0.08]"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Verified maintainers</p><div className="mt-2 flex flex-wrap gap-2">{endorsements.map((endorsement) => <a key={endorsement._id} href={endorsement.evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#e9e6dc] px-2.5 py-1.5 text-xs font-semibold text-foreground hover:underline dark:bg-[#20251f]"><Check className="h-3.5 w-3.5 text-[#66856c]" />@{endorsement.githubLogin}</a>)}</div></div> : null}
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground">Observed {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(signal.evidence.observedAt))}. This is a transparent metadata signal, not a quality or maintainer endorsement.</p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}

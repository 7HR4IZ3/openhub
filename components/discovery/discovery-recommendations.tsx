"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading, CurationStatus } from "@/components/curation/curation-states";
import { Button } from "@/components/ui/button";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Compass, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function DiscoveryRecommendations() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const recommendations = useQuery(api.discovery.recommendations, isAuthenticated ? { limit: 6 } : "skip");
  const dismiss = useMutation(api.discovery.setDismissed);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (authLoading || (isAuthenticated && recommendations === undefined)) return <CurationLoading label="Loading your recommendations..." />;
  if (!isAuthenticated) return <CurationStatus title="Personalize the discovery map" body="Connect GitHub to receive explainable recommendations based on your interests and browsing trail." />;
  if (!recommendations || recommendations.length === 0) return <CurationEmptyState icon={Compass} eyebrow="Your map is taking shape" title="Follow a repository to start a trail." body="OpenHub will use fresh public metadata, your interests, and diversity caps to suggest what to read next." action="Browse repositories" actionHref="/explore" />;

  async function hide(repositoryId: Id<"repositories">) {
    setDismissing(repositoryId);
    setError(null);
    try { await dismiss({ repositoryId, dismissed: true }); } catch { setError("This recommendation could not be dismissed yet."); } finally { setDismissing(null); }
  }

  return (
    <section className="mt-12 max-w-5xl" aria-labelledby="recommendations-heading">
      <div className="flex items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b513d] dark:text-[#e6a07c]"><Sparkles className="h-3.5 w-3.5" /> Explainable recommendations</p><h2 id="recommendations-heading" className="mt-2 text-2xl font-semibold tracking-[-0.035em]">A few projects worth opening next</h2></div><span className="text-xs text-muted-foreground">Fresh public signals</span></div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {recommendations.map((item) => <article key={item.evidence.repositoryId} className="rounded-2xl border border-black/[0.1] p-5 dark:border-white/[0.1]"><div className="flex items-start justify-between gap-3"><Link href={`/repos/${encodeURIComponent(item.evidence.owner)}/${encodeURIComponent(item.evidence.fullName.split("/").at(-1) ?? "")}`} className="min-w-0"><p className="truncate font-mono text-xs text-muted-foreground">{item.evidence.fullName}</p><h3 className="mt-2 text-lg font-semibold">{item.evidence.fullName.split("/").at(-1)}</h3></Link><button type="button" aria-label={`Dismiss ${item.evidence.fullName}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]" disabled={dismissing === item.evidence.repositoryId} onClick={() => void hide(item.evidence.repositoryId)}><X className="h-4 w-4" /></button></div><div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-[#e9e6dc] px-2.5 py-1.5 font-semibold text-foreground dark:bg-[#20251f]">{item.score.toFixed(1)} signal</span>{item.evidence.language ? <span>{item.evidence.language}</span> : null}<span>{item.evidence.stars.toLocaleString()} stars</span>{item.evidence.license ? <span>{item.evidence.license}</span> : null}</div><p className="mt-4 text-sm leading-6 text-muted-foreground">{item.explanations[0]}</p><Link href={`/repos/${encodeURIComponent(item.evidence.owner)}/${encodeURIComponent(item.evidence.fullName.split("/").at(-1) ?? "")}`} className="mt-5 inline-flex items-center text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open workspace <span className="ml-1">↗</span></Link></article>)}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Scores describe metadata signals and reading relevance. They are not quality judgments or sponsored placement.</p>
    </section>
  );
}

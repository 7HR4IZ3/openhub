"use client";

import { api } from "@/convex/_generated/api";
import { CurationEmptyState, CurationLoading, CurationStatus } from "@/components/curation/curation-states";
import { useQuery } from "convex/react";
import { ArrowUpRight, Compass, GitFork, Star, TrendingUp } from "lucide-react";
import Link from "next/link";

export function TrendingRepositories() {
  const repositories = useQuery(api.discovery.trendingRepositories, { limit: 6 });

  if (repositories === undefined) return <CurationLoading label="Loading trending repositories..." />;
  if (repositories.length === 0) {
    return <CurationEmptyState icon={Compass} eyebrow="Trending is warming up" title="Open a repository to start the public signal trail." body="OpenHub only ranks fresh, server-observed public metadata. It does not manufacture a leaderboard from missing evidence." action="Browse repositories" actionHref="/explore" />;
  }

  return (
    <section className="mt-12 max-w-5xl" aria-labelledby="trending-repositories-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b513d] dark:text-[#e6a07c]"><TrendingUp className="h-3.5 w-3.5" /> Organic momentum</p>
          <h2 id="trending-repositories-heading" className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Public repositories worth a closer look</h2>
        </div>
        <span className="text-xs text-muted-foreground">Fresh signals only</span>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {repositories.map((item) => {
          const name = item.evidence.fullName.split("/")[1] ?? item.evidence.fullName;
          const href = `/repos/${encodeURIComponent(item.evidence.owner)}/${encodeURIComponent(name)}`;
          return (
            <article key={item.evidence.repositoryId} className="rounded-2xl border border-black/[0.1] p-5 dark:border-white/[0.1]">
              <div className="flex items-start justify-between gap-4">
                <Link href={href} className="min-w-0 hover:text-[#9b4d31] dark:hover:text-[#e99970]"><p className="truncate font-mono text-xs text-muted-foreground">{item.evidence.fullName}</p><h3 className="mt-2 truncate text-lg font-semibold">{name}</h3></Link>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.score.toFixed(1)}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {item.evidence.language ? <span>{item.evidence.language}</span> : null}
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" />{item.evidence.stars.toLocaleString()}</span>
                <span className="inline-flex items-center gap-1"><GitFork className="h-3.5 w-3.5" />{item.evidence.forks.toLocaleString()}</span>
                {item.evidence.license ? <span>{item.evidence.license}</span> : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.explanations[0]}</p>
              <Link href={href} className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open workspace <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </article>
          );
        })}
      </div>
      <CurationStatus className="mt-4" title="How this is ranked" body="Freshness, capped adoption, declared license, archive state, fork state, and diversity caps are visible signals—not a quality judgment or sponsored placement." />
    </section>
  );
}
